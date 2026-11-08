import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Flag,
  Gauge,
  LocateFixed,
  Lock,
  Navigation,
  Pause,
  Play,
  Radio,
  Save,
  Share2,
  Shield,
  Square,
  Timer,
  Users,
  WifiOff,
} from 'lucide-react'
import SafetyMap from './SafetyMap'
import {
  BackButton,
  Button,
  ClubAlerts,
  Confirm,
  DemoTag,
  EmptyState,
  IconButton,
  Modal,
  SafetyNote,
  Score,
} from './components'
import {
  averageSpeed,
  clockAfter,
  colorHex,
  formatDuration,
  formatPace,
  formatTime,
  gpsQuality,
  length,
  pointAlong,
  reportAge,
  reportsNear,
  routeScore,
  safety,
  segmentScore,
  sliceAlong,
  uid,
  type RouteData,
  type SurveyAnswers,
} from './data'
import { useDemo } from './store'
import RouteQuestionnaire, {
  FeedbackStars,
  RouteFeedbackCard,
  starLabels,
  withRouteFeedback,
} from './RouteQuestionnaire'
import ShareTraining from './ShareTraining'
import TrainingSurvey, { feltUnsafe, isRouteRating, surveyQuestions } from './TrainingSurvey'
import type { ShareCardData } from './shareCard'
import { Security, SosButton, shareValid } from './security'

const conditionLabels: Record<string, string> = {
  high: 'Favorables',
  medium: 'Atención',
  low: 'Precaución',
  none: 'Sin datos',
}

export default function Training({
  back,
  history,
  report,
}: {
  back: () => void
  history?: () => void
  report?: () => void
}) {
  const { state, user, update, notify, isDemo } = useDemo(),
    session = state.session
  const [finish, setFinish] = useState(false),
    [follow, setFollow] = useState(true),
    [security, setSecurity] = useState(false),
    [privacy, setPrivacy] = useState(false),
    [trim, setTrim] = useState(true),
    [savedId, setSavedId] = useState<string | null>(null),
    [questionnaire, setQuestionnaire] = useState(false),
    [share, setShare] = useState<ShareCardData | null>(null),
    [warning, setWarning] = useState(false),
    [locked, setLocked] = useState(false),
    [offline, setOffline] = useState(false)
  const route = session.route
  useEffect(() => {
    if (session.phase === 'permission') {
      const t = setTimeout(
        () => update((s) => ({ ...s, session: { ...s.session, phase: 'countdown', count: 3 } })),
        1000,
      )
      return () => clearTimeout(t)
    }
    if (session.phase === 'countdown') {
      const t = setTimeout(
        () =>
          update((s) => ({
            ...s,
            session: {
              ...s.session,
              count: s.session.count - 1,
              phase: s.session.count <= 1 ? 'running' : 'countdown',
            },
          })),
        1000,
      )
      return () => clearTimeout(t)
    }
    if (session.phase === 'running') {
      const t = setInterval(
        () =>
          update((s) => {
            const km = s.session.km + (1 / 60 + 0.0006 * Math.sin(s.session.seconds / 12)),
              arrived = s.session.route.km > 0 && km >= s.session.route.km
            return {
              ...s,
              session: {
                ...s.session,
                seconds: s.session.seconds + 6,
                km: arrived ? s.session.route.km : km,
                phase: arrived ? 'paused' : s.session.phase,
              },
            }
          }),
        1000,
      )
      return () => clearInterval(t)
    }
  }, [session.phase, session.count])
  const progress = route.km > 0 ? Math.min(1, session.km / route.km) : 0
  const completed = progress >= 1
  useEffect(() => {
    if (completed && session.phase === 'paused')
      notify('Llegaste al final de la ruta. Finaliza para ver tu resumen.')
  }, [completed, session.phase, notify])
  const position = useMemo(() => pointAlong(route.geometry, progress), [route.geometry, progress])
  const track = useMemo(
    () => (session.seconds ? sliceAlong(route.geometry, 0, progress) : []),
    [route.geometry, progress, session.seconds],
  )
  const sharedTrack = useMemo(() => (trim ? sliceAlong(track, 0.1, 0.9) : track), [track, trim])
  const score = routeScore(
    route,
    session.time,
    session.date,
    state.incidents,
    state.risks,
    state.roads,
  )
  const paceString = formatPace(session.seconds, session.km)
  const breakdown = useMemo(() => {
    const totals = { high: 0, medium: 0, low: 0, none: 0 }
    let total = 0
    route.segmentIds.forEach((id) => {
      const street = state.roads.find((s) => s.id === id)
      if (!street) return
      const km = length(street.points),
        key = safety(segmentScore(street, session.time, session.date, state.incidents, state.risks))
          .key as keyof typeof totals
      totals[key] += km
      total += km
    })
    return Object.entries(totals).map(([key, value]) => ({
      key,
      percent: total ? Math.round((value / total) * 100) : 0,
    }))
  }, [route, state.incidents, session.time, session.date, state.risks, state.roads])
  const nearbyReports = reportsNear(route, state.incidents).filter(
    (incident) => !state.reportsSeen.includes(incident.id),
  )
  const acknowledge = () => {
    update((s) => ({ ...s, reportsSeen: [...s.reportsSeen, ...nearbyReports.map(({ id }) => id)] }))
    setWarning(false)
  }
  const start = () => {
    setSavedId(null)
    setOffline(false)
    update((s) => ({
      ...s,
      session: {
        ...s.session,
        phase: 'permission',
        seconds: 0,
        km: 0,
        count: 3,
        time: s.time,
        date: s.date,
        finishedId: undefined,
        survey: undefined,
      },
    }))
  }
  const finishTraining = () => {
    if (session.seconds < 1 || session.km < 0.001) {
      notify('Simula unos segundos de recorrido antes de terminar.')
      return
    }
    const id = uid()
    update((s) => ({
      ...s,
      session: { ...s.session, phase: 'survey', finishedId: id, survey: undefined },
      trainings: [
        {
          id,
          route: s.session.route,
          date: new Date().toISOString(),
          seconds: s.session.seconds,
          km: +s.session.km.toFixed(3),
          time: s.session.time,
          ...(isDemo && offline ? { pendingSync: true } : {}),
        },
        ...s.trainings,
      ],
      sharing: s.sharing ? { ...s.sharing, revoked: true } : null,
    }))
    setFinish(false)
    if (!isDemo) notify('Sincronizando tu entrenamiento y la revocación del enlace compartido.')
  }
  const closeSurvey = (answers?: SurveyAnswers) => {
    update((s) => {
      const next = { ...s, session: { ...s.session, phase: 'summary' as const, survey: answers } }
      if (!user || !isRouteRating(answers) || route.private || route.status !== 'Aprobado') return next
      return withRouteFeedback(
        next,
        {
          ...answers,
          id_usuario: user.id,
          id_ruta: route.id,
          fecha_valoracion: new Date().toISOString(),
        },
        // La API crea comentarios nuevos con un identificador propio; la demo conserva uno por ruta.
        isDemo ? undefined : uid(),
      )
    })
    if (answers?.puntuacion)
      notify(
        isDemo
          ? 'Valoración guardada en esta demostración.'
          : 'Valoración conservada en esta sesión. Tu comentario pasa a revisión.',
      )
  }
  const save = (propose = false) => {
    if (savedId && !propose) {
      notify('Ya guardaste este recorrido.')
      return
    }
    const id = savedId ?? uid()
    const privateRoute: RouteData = {
      ...route,
      id,
      name: `Mi entrenamiento · ${new Date().toLocaleDateString('es', { day: 'numeric', month: 'short' })}`,
      geometry: propose ? sharedTrack : track,
      km: +session.km.toFixed(2),
      min: Math.ceil(session.seconds / 60),
      private: true,
      owned: true,
      status: propose ? 'Pendiente' : undefined,
      official: false,
      verified: false,
      date: session.date,
    }
    if (privateRoute.geometry.length < 2) {
      notify('Graba unos segundos más antes de guardar o recorta menos puntos.')
      return
    }
    update((s) => ({
      ...s,
      customRoutes: s.customRoutes.some((r) => r.id === id)
        ? s.customRoutes.map((r) => (r.id === id ? privateRoute : r))
        : [...s.customRoutes, privateRoute],
      savedIds: s.savedIds.includes(id) ? s.savedIds : [...s.savedIds, id],
    }))
    setSavedId(id)
    setPrivacy(false)
    notify(
      isDemo
        ? propose
          ? 'Propuesta de demostración guardada en esta pestaña. No se envía al club.'
          : 'Recorrido guardado como ruta privada en esta demo local.'
        : propose
          ? 'Sincronizando tu propuesta con revisión de privacidad para el club.'
          : 'Sincronizando el recorrido como ruta privada en tu cuenta.',
    )
  }
  if (!route.id || route.geometry.length < 2 || route.km <= 0)
    return (
      <EmptyState
        title="Elige tu próximo recorrido"
        description="Selecciona una ruta publicada o crea una ruta privada en el planificador para iniciar la simulación. No se registra GPS real."
      >
        <Button onClick={back}>
          Explorar rutas <ArrowRight />
        </Button>
      </EmptyState>
    )
  if (session.phase === 'survey' || session.phase === 'summary') {
    const surveying = session.phase === 'survey'
    const answered = surveyQuestions.filter(({ key }) => session.survey?.[key] !== undefined)
    const stars = session.survey?.puntuacion
    const percent = Math.round(progress * 100)
    const openShare = () =>
      setShare({
        routeName: route.name,
        date: session.date,
        km: session.km,
        seconds: session.seconds,
        geometry: route.geometry,
        track,
        roads: state.roads.map((road) => road.points),
        condition: safety(score.score).label,
        conditionColor: colorHex(score.score),
      })
    return (
      <div className="training-summary">
        <div className="summary-content" inert={surveying}>
          <div className="summary-topbar">
            <BackButton onClick={back}>Explorar</BackButton>
            <IconButton label="Compartir entrenamiento" onClick={openShare}>
              <Share2 />
            </IconButton>
          </div>
          <div className="summary-map">
            <SafetyMap
              route={route}
              track={track}
              tracking={position}
              fitRoute
              guide
              context={false}
              showReports={false}
            />
          </div>
          <section className="summary-main">
            <header className="summary-heading">
              <span className="eyebrow">
                <Check /> CADA SALIDA ES UN AVANCE.
              </span>
              <h1>{route.name}</h1>
              <p>
                {new Date(`${session.date}T12:00:00`).toLocaleDateString('es', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                · GPS de demostración
              </p>
            </header>
            <div className="summary-hero">
              <span className="summary-hero-label">Distancia total</span>
              <strong className="summary-hero-value">
                {session.km.toFixed(2)}
                <small> km</small>
              </strong>
              <div className="summary-route-progress" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
              </div>
              <small className="summary-route-note">
                {percent} % de la ruta · {route.km.toFixed(1)} km planificados
              </small>
              <dl className="summary-stats">
                <div>
                  <dt>
                    <Timer /> Tiempo
                  </dt>
                  <dd>{formatDuration(session.seconds)}</dd>
                </div>
                <div>
                  <dt>
                    <Activity /> Ritmo
                  </dt>
                  <dd>
                    {paceString}
                    <small> /km</small>
                  </dd>
                </div>
                <div>
                  <dt>
                    <Gauge /> Velocidad
                  </dt>
                  <dd>
                    {averageSpeed(session.seconds, session.km).toFixed(1)}
                    <small> km/h</small>
                  </dd>
                </div>
              </dl>
            </div>
            <dl className="summary-details">
              <div>
                <dt>
                  <Clock3 /> Inicio
                </dt>
                <dd>{session.time}</dd>
              </div>
              <div>
                <dt>
                  <Flag /> Fin
                </dt>
                <dd>{clockAfter(session.time, session.seconds)}</dd>
              </div>
              <div>
                <dt>
                  <Navigation /> Dificultad
                </dt>
                <dd>{route.difficulty}</dd>
              </div>
            </dl>
            <p className="summary-clock-note">
              Hora simulada: parte del horario consultado y suma el tiempo del entrenamiento.
            </p>
            <p className="gps-quality">
              GPS simulado: {gpsQuality(session.seconds).used} puntos usados y{' '}
              {gpsQuality(session.seconds).discarded} descartados por margen mayor a 30 m o más de
              30 km/h.
            </p>
            {state.trainings.some(({ id, pendingSync }) => id === session.finishedId && pendingSync) && (
              <span className="route-flag">Pendiente de sincronizar</span>
            )}
            <Button variant="orange" className="full summary-share" onClick={openShare}>
              <Share2 />
              Compartir entrenamiento
            </Button>
            <section className="summary-safety" aria-label="Resumen de seguridad del recorrido">
              <div className="summary-safety-heading">
                <h2>
                  <Shield /> Seguridad del recorrido
                </h2>
                <Score value={score.score} />
              </div>
              <div className="safety-spectrum" aria-hidden="true">
                {breakdown
                  .filter(({ percent }) => percent > 0)
                  .map(({ key, percent }) => (
                    <span
                      key={key}
                      className={key}
                      style={{ '--segment-share': percent } as React.CSSProperties}
                    />
                  ))}
              </div>
              <ul className="summary-safety-legend">
                {breakdown
                  .filter(({ percent }) => percent > 0)
                  .map(({ key, percent }) => (
                    <li key={key}>
                      <i className={key} />
                      {conditionLabels[key]} <strong>{percent} %</strong>
                    </li>
                  ))}
              </ul>
              <p>
                Condiciones de la ruta para las {session.time}. Comprueba el entorno en tu próxima
                salida.
              </p>
              {answered.length > 0 && (
                <dl className="summary-perception">
                  {answered.map(({ key, short, yes, no }) => (
                    <div key={key}>
                      <dt>{short}</dt>
                      <dd>{session.survey?.[key] ? yes : no}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {feltUnsafe(session.survey) && report && (
                <div className="summary-report">
                  <p>Tu respuesta no crea ningún reporte. Si ocurrió algo concreto, puedes contarlo.</p>
                  <button className="text-action" onClick={report}>
                    Reportar un incidente <ArrowRight />
                  </button>
                </div>
              )}
            </section>
            {stars ? (
              <section className="summary-rating" aria-label="Tu valoración de la ruta">
                <div>
                  <h2>Tu valoración</h2>
                  <FeedbackStars value={stars} />
                  <strong>{starLabels[stars - 1]}</strong>
                </div>
                <p>
                  Tu opinión personal, aparte del índice de seguridad.
                  {session.survey?.comentario ? ' Tu comentario queda pendiente de revisión.' : ''}{' '}
                  {isDemo ? 'Guardada solo en esta demostración.' : 'Conservada solo en esta sesión.'}
                </p>
              </section>
            ) : (
              !route.private &&
              route.status === 'Aprobado' && (
                <RouteFeedbackCard route={route} open={() => setQuestionnaire(true)} />
              )
            )}
            <Button
              className="full"
              variant={savedId ? 'secondary' : 'primary'}
              onClick={() => save()}
            >
              {savedId ? <Check /> : <Save />}
              {savedId ? 'Guardada como ruta privada' : 'Guardar como ruta privada'}
            </Button>
            <Button variant="secondary" className="full" onClick={() => setPrivacy(true)}>
              <Users />
              Proponer a la comunidad
            </Button>
            {history && (
              <Button variant="secondary" className="full" onClick={history}>
                Ver historial <ArrowRight />
              </Button>
            )}
            <SafetyNote />
            <button
              className="text-action"
              onClick={() =>
                update((s) => ({
                  ...s,
                  session: { ...s.session, phase: 'ready', seconds: 0, km: 0, survey: undefined },
                }))
              }
            >
              Preparar otro entrenamiento <ArrowRight />
            </button>
          </section>
        </div>
        {surveying && <TrainingSurvey finish={closeSurvey} />}
        {questionnaire && <RouteQuestionnaire route={route} close={() => setQuestionnaire(false)} />}
        {share && <ShareTraining card={share} close={() => setShare(null)} />}
        {privacy && (
          <Modal title="Protege el inicio y final de tu ruta" onClose={() => setPrivacy(false)}>
            <p>
              Revisa tu trazado antes de proponerlo. Puedes excluir el primer y último 10 % para no
              revelar ubicaciones personales.
            </p>
            <div className="modal-map">
              <SafetyMap
                route={{ ...route, geometry: sharedTrack }}
                fitRoute
              />
            </div>
            <label className="checkbox">
              <input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} />
              Excluir tramos inicial y final
            </label>
            <Button onClick={() => save(true)}>Proponer para revisión web</Button>
          </Modal>
        )}
      </div>
    )
  }
  if (session.phase === 'permission' || session.phase === 'countdown')
    return (
      <div className="training-countdown">
        <button
          className="back-button"
          onClick={() => update((s) => ({ ...s, session: { ...s.session, phase: 'ready' } }))}
        >
          <ArrowLeft />
          Cancelar
        </button>
        <span className="eyebrow">TU MOMENTO · TU PRÓXIMO PASO</span>
        {session.phase === 'permission' ? (
          <>
            <LocateFixed />
            <h2>Comprobando ubicación.</h2>
            <p>Esperando señal GPS de demostración…</p>
          </>
        ) : (
          <>
            <strong key={session.count}>{session.count}</strong>
            <h2>Vamos a por ello.</h2>
            <p>GPS de demostración · No es seguimiento real</p>
          </>
        )}
      </div>
    )
  const active = session.phase === 'running' || session.phase === 'paused'
  return (
    <div className={`training-screen ${active ? 'recording' : ''}`}>
      <header className="training-top">
        <button
          aria-label="Salir del entrenamiento"
          onClick={() => (active ? setFinish(true) : back())}
        >
          <ArrowLeft />
        </button>
        <span>{active ? 'ENTRENAMIENTO' : 'PREPARA TU SALIDA'}</span>
        <span className="gps-tag">
          <Radio />
          GPS Demo
        </span>
      </header>
      {!active ? (
        <>
          <div className="training-prepare-map">
            <SafetyMap route={route} fitRoute guide />
          </div>
          <section className="training-preparation">
            <span className="eyebrow">TU RUTA ESTÁ LISTA</span>
            <h1>{route.name}</h1>
            <div className="preparation-metrics">
              <span>
                <strong>{route.km.toFixed(1)}</strong>km planificados
              </span>
              <span>
                <strong>{route.min}</strong>min aprox.
              </span>
              <Score value={score.score} />
            </div>
            <div className="gps-permission">
              <LocateFixed />
              <div>
                <strong>Ubicación de demostración</strong>
                <p>
                  La señal y el movimiento se simulan sobre el trazado.
                </p>
              </div>
            </div>
            <ClubAlerts item={route} hours={route.recommended} />
            <Button
              variant="orange"
              className="full"
              data-tour="start-training"
              onClick={() => (nearbyReports.length ? setWarning(true) : start())}
            >
              <Play />
              Iniciar entrenamiento
            </Button>
            <Button variant="ghost" className="full" onClick={() => setSecurity(true)}>
              <Shield />
              Herramientas de seguridad
            </Button>
          </section>
        </>
      ) : (
        <>
          <section className="recording-metrics">
            <span className="recording-state">
              <i className={session.phase === 'running' ? '' : 'is-paused'} />
              {completed
                ? 'RUTA COMPLETADA'
                : session.phase === 'running'
                  ? 'EN MOVIMIENTO'
                  : 'EN PAUSA'}
              <small>SIMULACIÓN ×6</small>
            </span>
            <strong className="distance-numeral">
              {session.km.toFixed(2)}
              <small>km</small>
            </strong>
            <div className="recording-secondary">
              <span>
                <strong>{formatTime(session.seconds)}</strong>Tiempo simulado
              </span>
              <span>
                <strong>
                  {paceString}
                  <small> /km</small>
                </strong>
                Ritmo promedio
              </span>
            </div>
          </section>
          <div className="recording-map">
            <SafetyMap
              route={route}
              track={track}
              tracking={position}
              follow={follow}
              guide
              showReports={false}
            />
            <button
              className={`follow-runner ${follow ? 'active' : ''}`}
              onClick={() => setFollow(!follow)}
            >
              <LocateFixed />
              {follow ? 'Siguiendo' : 'Seguir corredor'}
            </button>
          </div>
          <div className="training-trace-legend">
            <span>
              <i />
              Ruta prevista
            </span>
            <span>
              <i />
              Recorrido GPS simulado · rosa
            </span>
          </div>
          {isDemo && (
            <div className="training-demo-tools" role="group" aria-label="Simulaciones de la demo">
              <button type="button" onClick={() => setLocked(true)}>
                <Lock />
                Bloquear pantalla
              </button>
              <button type="button" aria-pressed={offline} onClick={() => setOffline(!offline)}>
                <WifiOff />
                {offline ? 'Sin señal · guardando' : 'Simular sin señal'}
              </button>
            </div>
          )}
          <div className="training-sharing">
            <button data-tour="share-live" onClick={() => setSecurity(true)}>
              <Users />
              {shareValid(state.sharing) ? 'Compartiendo' : 'Compartir ubicación'}
              <ChevronRight />
            </button>
            <SosButton />
          </div>
          <div className="recording-controls">
            {!completed && (
            <button
              className="pause-training"
              onClick={() =>
                update((s) => ({
                  ...s,
                  session: {
                    ...s.session,
                    phase: s.session.phase === 'paused' ? 'running' : 'paused',
                  },
                }))
              }
            >
              {session.phase === 'paused' ? <Play /> : <Pause />}
              <span>{session.phase === 'paused' ? 'Continuar' : 'Pausar'}</span>
            </button>
            )}
            <button
              className={`finish-training ${completed ? 'is-done' : ''}`}
              onClick={() => setFinish(true)}
            >
              {completed ? <Check /> : <Square />}
              {completed ? 'Terminar y ver resumen' : 'Finalizar'}
            </button>
          </div>
        </>
      )}
      {warning && (
        <Modal title="Reportes cerca de tu ruta" onClose={() => setWarning(false)}>
          <p>Hay reportes aprobados a menos de 100 m del trazado. Revísalos antes de salir.</p>
          <ul className="report-warning-list">
            {nearbyReports.map((incident) => (
              <li key={incident.id}>
                {incident.type}
                <small>{reportAge(incident.createdAt)}</small>
              </li>
            ))}
          </ul>
          <div className="modal-map">
            <SafetyMap route={route} fitRoute showReports />
          </div>
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => {
                acknowledge()
                back()
              }}
            >
              Cambiar de ruta
            </Button>
            <Button
              variant="orange"
              onClick={() => {
                acknowledge()
                start()
              }}
            >
              Iniciar de todos modos
            </Button>
          </div>
        </Modal>
      )}
      {locked && (
        <div className="lock-preview" role="dialog" aria-modal="true" aria-label="Pantalla bloqueada simulada">
          <time>9:41</time>
          <span>Pantalla bloqueada · simulación</span>
          <div className="lock-notification">
            <Radio />
            <div>
              <strong>RUNCTY está grabando</strong>
              <p>
                {formatTime(session.seconds)} · {session.km.toFixed(2)} km
              </p>
            </div>
          </div>
          <small>La grabación sigue aquí. La notificación permanece mientras dure el entrenamiento.</small>
          <button type="button" autoFocus onClick={() => setLocked(false)}>
            Desbloquear
          </button>
        </div>
      )}
      {finish && (
        <Confirm
          title="¿Finalizar entrenamiento?"
          message={
            isDemo
              ? 'Guardaremos esta salida simulada en el historial de esta pestaña. No se envía al servidor ni se graba GPS real.'
              : 'Guardaremos esta salida simulada en tu historial privado y revocaremos tus enlaces de ubicación. No se graba GPS real.'
          }
          label="Finalizar entrenamiento"
          onClose={() => setFinish(false)}
          confirm={finishTraining}
        />
      )}
      {security && (
        <Modal title="Seguridad del corredor" onClose={() => setSecurity(false)} wide>
          <Security mobile />
        </Modal>
      )}
    </div>
  )
}
