import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronRight,
  CloudSun,
  Eraser,
  Flag,
  MapPin,
  Moon,
  Navigation,
  Play,
  Plus,
  Route,
  Save,
  Compass,
  Sun,
  Sunrise,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import SafetyMap from './SafetyMap'
import {
  calculatePath,
  EXAMPLE_POINTS,
  length,
  nearestNode,
  routeScore,
  difficultyKey,
  safety,
  scheduleStatus,
  uid,
  type Coordinate,
  type Incident,
  type RiskZone,
  type RouteData,
  type Street,
  type TimeSlot,
} from './data'
import { useDemo, useRoutes } from './store'
import { SHOW_FUTURE } from './features'
import {
  Button,
  EmptyState,
  OfficialBadge,
  PageTitle,
  RouteCard,
  RoutePreview,
  SafetyNote,
  Score,
  TimeControl,
} from './components'

type PlannerMode = 'manual' | 'calculate' | 'recommend'
const plannerModes = {
  manual: { icon: Plus, label: 'Trazar manualmente' },
  calculate: { icon: Navigation, label: 'Entre dos puntos' },
  recommend: { icon: Compass, label: 'Recomendar rutas' },
}
const plannerOrder: PlannerMode[] = ['manual', 'calculate', 'recommend']
// Esta versión entrega dos modos: primero la recomendación y, como extra, entre dos puntos.
const deliveredOrder: PlannerMode[] = ['recommend', 'calculate']
// Planificador móvil: nombres cortos de los modos, accesos rápidos de distancia, niveles y horarios.
const mobileModeLabels: Record<PlannerMode, string> = {
  manual: 'Trazar',
  calculate: 'Entre dos puntos',
  recommend: 'Recomendaciones',
}
const QUICK_DISTANCES = [3, 5, 10, 21]
const LEVEL_OPTIONS = [
  { value: 'Todos', label: 'Todos', bars: 0 },
  { value: 'Principiante', label: 'Principiante', bars: 1 },
  { value: 'Intermedio', label: 'Intermedio', bars: 2 },
  { value: 'Avanzado', label: 'Avanzado', bars: 3 },
]
const DAY_PARTS: { time: TimeSlot; label: string; icon: LucideIcon }[] = [
  { time: '05:30', label: 'Amanecer', icon: Sunrise },
  { time: '08:00', label: 'Mañana', icon: Sun },
  { time: '14:00', label: 'Tarde', icon: CloudSun },
  { time: '19:00', label: 'Noche', icon: Moon },
]

// Trazado punto a punto: une los puntos por la red vial y, si no hay red, los ajusta al nodo
// más cercano. Lo usan el modo manual del planificador y la gestión de rutas del club.
export function traceRoute(
  points: Coordinate[],
  time: TimeSlot,
  date: string,
  incidents: Incident[],
  risks: RiskZone[],
  roads: Street[],
) {
  const computed = calculatePath(points, time, date, incidents, risks, roads)
  const geometry =
    computed.geometry.length > 1 ? computed.geometry : points.map((point) => nearestNode(point, roads))
  return { geometry, segmentIds: computed.segmentIds, km: length(geometry) }
}

export default function Planner({
  mobile = false,
  open,
  run,
}: {
  mobile?: boolean
  open: (r: RouteData) => void
  run: (r: RouteData) => void
}) {
  const tabId = useId()
  const { state, user, update, notify, isDemo } = useDemo(),
    allRoutes = useRoutes()
  // Trazar a mano no se entrega en esta versión: ese modo se muestra como recomendación.
  const draft =
      !SHOW_FUTURE && state.draft.mode === 'manual'
        ? { ...state.draft, mode: 'recommend' as const }
        : state.draft,
    [animateKey, setAnimateKey] = useState(0),
    [calculated, setCalculated] = useState(false)
  const [desired, setDesired] = useState(5),
    [level, setLevel] = useState('Todos'),
    [recommend, setRecommend] = useState(false),
    [savedId, setSavedId] = useState<string | null>(null)
  const [origin, setOrigin] = useState('jipiro'),
    [destination, setDestination] = useState('centro')
  // Cada búsqueda en móvil desplaza la vista hasta los resultados y les pasa el foco.
  const [searchKey, setSearchKey] = useState(0)
  const resultsRef = useRef<HTMLElement>(null),
    resultsHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (!mobile || !searchKey) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    resultsRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    resultsHeading.current?.focus({ preventScroll: true })
  }, [searchKey, mobile])
  const distanceValid = desired >= 1 && desired <= 42
  const dayPart = DAY_PARTS.find(({ time }) => time === state.time)
  const computed = useMemo(
    () => calculatePath(draft.points, state.time, state.date, state.incidents, state.risks, state.roads),
    [draft.points, state.time, state.date, state.incidents, state.risks, state.roads],
  )
  const manual = useMemo(
    () => traceRoute(draft.points, state.time, state.date, state.incidents, state.risks, state.roads),
    [draft.points, state.time, state.date, state.incidents, state.risks, state.roads],
  )
  // "Entre dos puntos" compara la ruta segura con la más corta por la misma red vial.
  const shortest = useMemo(
    () =>
      draft.mode === 'calculate'
        ? calculatePath(draft.points, state.time, state.date, state.incidents, state.risks, state.roads, 'shortest')
        : null,
    [draft.mode, draft.points, state.time, state.date, state.incidents, state.risks, state.roads],
  )
  const geometry = draft.mode === 'manual' ? manual.geometry : computed.geometry
  const km = length(geometry)
  const preview: RouteData = useMemo(
    () => ({
      id: 'draft',
      name: draft.name,
      area: 'Loja · Recorrido personal',
      km: +km.toFixed(2),
      min: Math.max(1, Math.round(km * 7)),
      difficulty: km > 8 ? 'Alta' : km > 4 ? 'Media' : 'Baja',
      desc: 'Ruta privada planificada en RUNCTY. Las condiciones son referenciales; revisa el trazado antes de salir.',
      segmentIds: computed.segmentIds,
      geometry,
      owner: user?.name,
      owned: !!user,
      private: true,
      recommended: 'Consultar escenario horario',
    }),
    [draft.name, geometry, computed.segmentIds, km, user],
  )
  const result = routeScore(preview, state.time, state.date, state.incidents, state.risks, state.roads)
  const shortestKm = shortest ? length(shortest.geometry) : 0
  const shortestRoute: RouteData | null =
    shortest && shortest.geometry.length > 1
      ? {
          ...preview,
          id: 'draft-shortest',
          name: 'Ruta más corta',
          km: +shortestKm.toFixed(2),
          min: Math.max(1, Math.round(shortestKm * 7)),
          segmentIds: shortest.segmentIds,
          geometry: shortest.geometry,
        }
      : null
  const shortestResult = shortestRoute
    ? routeScore(shortestRoute, state.time, state.date, state.incidents, state.risks, state.roads)
    : null
  // Si miden lo mismo se consideran la misma ruta (la red puede tener tramos equivalentes).
  const sameRoute =
    !!shortest &&
    (shortest.segmentIds.join('|') === computed.segmentIds.join('|') || Math.abs(km - shortestKm) < 0.01)
  const available = allRoutes.filter((r) => (!r.private || r.status === 'Aprobado') && !r.alert)
  const inSchedule = (r: RouteData) => (scheduleStatus(r.recommended, state.time)?.inside === false ? 0 : 1)
  const matches = available
    .filter(
      (r) =>
        Math.abs(r.km - desired) <= desired * 0.15 && (level === 'Todos' || difficultyKey(r.difficulty) === difficultyKey(level)),
    )
    .sort(
      (a, b) =>
        inSchedule(b) - inSchedule(a) ||
        (routeScore(b, state.time, state.date, state.incidents, state.risks, state.roads).score ?? -1) -
        (routeScore(a, state.time, state.date, state.incidents, state.risks, state.roads).score ?? -1),
    )
    .slice(0, 5)
  const setPoints = (points: Coordinate[]) => {
    update((s) => ({ ...s, draft: { ...s.draft, points } }))
    setSavedId(null)
    if (draft.mode === 'manual') {
      setCalculated(points.length > 1)
      setAnimateKey((k) => k + 1)
    }
  }
  const example = () => {
    update((s) => ({
      ...s,
      draft: { ...s.draft, points: EXAMPLE_POINTS, name: 'Jipiro → Orillas del Zamora' },
    }))
    setCalculated(true)
    setAnimateKey((k) => k + 1)
    setSavedId(null)
  }
  const calculate = () => {
    // Lugares de partida y llegada sobre la red vial de Loja.
    const places: Record<string, Coordinate> = {
      jipiro: EXAMPLE_POINTS[0],
      valle: EXAMPLE_POINTS[1],
      centro: EXAMPLE_POINTS[2],
      sur: [-3.9966, -79.2042],
    }
    const a = places[origin] ?? EXAMPLE_POINTS[0]
    const b = places[destination] ?? EXAMPLE_POINTS[2]
    if (origin === destination) {
      notify('Elige un origen y destino diferentes.')
      return
    }
    update((s) => ({ ...s, draft: { ...s.draft, points: [a, b], name: 'Mi ruta por Loja' } }))
    setCalculated(true)
    setAnimateKey((k) => k + 1)
    setSavedId(null)
  }
  const save = () => {
    if (savedId) {
      notify('Esta ruta ya está en Mis rutas.')
      return
    }
    if (geometry.length < 2 || km < 0.03) {
      notify('Añade al menos dos puntos diferentes.')
      return
    }
    const id = uid(),
      newRoute = { ...preview, id, date: state.date }
    const accepted = update((s) => ({
      ...s,
      customRoutes: [...s.customRoutes, newRoute],
      savedIds: [...s.savedIds, id],
    }))
    if (!accepted) return
    setSavedId(id)
    notify(isDemo ? 'Ruta guardada en esta pestaña de demostración.' : 'Sincronizando tu ruta privada. Consulta el estado de guardado en pantalla.')
  }
  const mode = (next: 'manual' | 'calculate' | 'recommend') => {
    update((s) => ({ ...s, draft: { ...s.draft, mode: next } }))
    setRecommend(false)
    setCalculated(false)
  }
  const ready = geometry.length > 1 && (calculated || draft.mode === 'manual')
  return (
    <div className={`planner-screen ${mobile ? 'planner-mobile' : ''}`}>
      <PageTitle
        eyebrow="TU PRÓXIMO KILÓMETRO"
        title={SHOW_FUTURE ? 'Crea tu ruta' : 'Planificar ruta'}
        subtitle={
          mobile
            ? undefined
            : SHOW_FUTURE
              ? 'Tres formas de encontrar un recorrido. Un mismo mapa para decidir mejor.'
              : 'Dos formas de encontrar un recorrido. Un mismo mapa para decidir mejor.'
        }
      />
      <div className="mode-tabs planner-modes" role="tablist" aria-label="Modo del planificador" onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
        const current = tabs.findIndex(tab => tab === document.activeElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
        tabs[next]?.click(); tabs[next]?.focus()
      }}>
        {(SHOW_FUTURE ? plannerOrder : deliveredOrder).map((id) => {
          const { icon: Icon, label } = plannerModes[id]
          return (
            <button
              key={id}
              role="tab"
              id={`${tabId}-${id}`}
              data-tour={id === 'recommend' ? 'recommend' : undefined}
              aria-controls={`${tabId}-content`}
              tabIndex={draft.mode === id ? 0 : -1}
              aria-selected={draft.mode === id}
              className={`${draft.mode === id ? 'active' : ''} mode-${id}`}
              onClick={() => mode(id)}
            >
              <Icon />
              {mobile ? mobileModeLabels[id] : label}
            </button>
          )
        })}
      </div>
      <div className="planner-layout" role="tabpanel" id={`${tabId}-content`} aria-labelledby={`${tabId}-${draft.mode}`}>
        <section className="planner-map-area">
          <SafetyMap
            drawing={draft.mode !== 'recommend'}
            points={draft.points}
            onPoints={(points) => setPoints(draft.mode === 'calculate' ? points.slice(-2) : points)}
            route={ready ? preview : null}
            compare={ready && draft.mode === 'calculate' && !sameRoute ? shortestRoute?.geometry : null}
            animateKey={animateKey}
            fitRoute={ready}
            showReports
          />
          <div className="map-bottom-tools">
            {SHOW_FUTURE && (
              <Button variant="secondary" onClick={example}>
                <Route />
                Usar ruta sugerida
              </Button>
            )}
            <span>
              {mobile && state.roads.length
                ? 'Colores según la seguridad de cada tramo'
                : state.roads.length
                  ? `${state.roads.length} tramos disponibles · Loja`
                  : 'Sin red vial publicada · trazado manual sin puntuación'}
            </span>
          </div>
          <SafetyNote />
        </section>
        <aside className={`planner-panel ${mobile ? `planner-panel-${draft.mode}` : ''}`}>
          {mobile ? (
            <div className="planner-mode-intro">
              <span className="planner-mode-icon" aria-hidden="true">
                {draft.mode === 'calculate' ? <Navigation /> : draft.mode === 'manual' ? <Plus /> : <Compass />}
              </span>
              <div>
                <h2>
                  {draft.mode === 'calculate'
                    ? 'Ve de un punto a otro'
                    : draft.mode === 'manual'
                      ? 'Dibuja tu recorrido'
                      : 'Encuentra tu próxima ruta'}
                </h2>
                <p>
                  {draft.mode === 'calculate'
                    ? 'Compara la ruta más segura con la más corta.'
                    : draft.mode === 'manual'
                      ? 'Toca el mapa para marcar cada punto.'
                      : 'Dinos cuánto quieres correr y te sugerimos rutas.'}
                </p>
              </div>
              <span className="planner-location">
                <MapPin aria-hidden="true" />
                Loja, Ecuador
              </span>
            </div>
          ) : (
          <div className="planner-panel-heading">
            <span className="step-number">
              {SHOW_FUTURE
                ? draft.mode === 'manual' ? '01' : draft.mode === 'calculate' ? '02' : '03'
                : draft.mode === 'recommend' ? '01' : '02'}
            </span>
            <div>
              <h2>
                {draft.mode === 'manual'
                  ? 'Tu recorrido, punto a punto'
                  : draft.mode === 'calculate'
                    ? 'Elige origen y destino'
                    : 'Encuentra tu coincidencia'}
              </h2>
              <p>
                {draft.mode === 'manual'
                  ? state.roads.length ? 'Los puntos se ajustan a la red local.' : 'Trazado manual sin red validada. No se comprueba que el recorrido sea transitable.'
                  : draft.mode === 'calculate'
                    ? 'Ten en cuenta la distancia y las condiciones del horario.'
                    : 'Distancia ±15 % · hasta cinco rutas.'}
              </p>
            </div>
          </div>
          )}
          {!mobile && (
            <label className="field">
              Ciudad
              <select disabled aria-label="Ciudad del planificador">
                <option>Loja, Ecuador</option>
              </select>
            </label>
          )}
          {draft.mode === 'calculate' && (
            <div className="origin-destination">
              <label className="field">
                <span>
                  <i className="origin-dot" />
                  Origen
                </span>
                <select
                  aria-label="Punto de origen"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                >
                  <option value="jipiro">Parque Jipiro</option>
                  <option value="valle">El Valle</option>
                  <option value="centro">Orillas del Zamora</option>
                  <option value="sur">Sur · Vía occidental</option>
                </select>
              </label>
              <label className="field">
                <span>
                  <Flag />
                  Destino
                </span>
                <select
                  aria-label="Punto de destino"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="centro">Orillas del Zamora</option>
                  <option value="valle">El Valle</option>
                  <option value="jipiro">Parque Jipiro</option>
                  <option value="sur">Sur · Vía occidental</option>
                </select>
              </label>
            </div>
          )}
          {draft.mode === 'manual' && (
            <label className="field">
              Nombre de la ruta
              <input
                value={draft.name}
                onChange={(e) =>
                  update((s) => ({ ...s, draft: { ...s.draft, name: e.target.value } }))
                }
                maxLength={60}
                placeholder="Mi recorrido por Loja"
              />
            </label>
          )}
          {draft.mode === 'recommend' && mobile && (
            <>
              <fieldset className="planner-choice">
                <legend>
                  Distancia
                  <strong>{distanceValid ? `${desired.toLocaleString('es')} km` : '—'}</strong>
                </legend>
                <div className="distance-chips">
                  {QUICK_DISTANCES.map((km) => (
                    <button
                      key={km}
                      type="button"
                      aria-pressed={desired === km}
                      className={desired === km ? 'selected' : ''}
                      onClick={() => {
                        setDesired(km)
                        setRecommend(false)
                      }}
                    >
                      {km}
                      <small>km</small>
                    </button>
                  ))}
                </div>
                <label className={`distance-custom ${QUICK_DISTANCES.includes(desired) ? '' : 'is-custom'}`}>
                  <span>Otra distancia</span>
                  <input
                    aria-label="Otra distancia en kilómetros"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={42}
                    step=".1"
                    value={desired}
                    aria-invalid={!distanceValid}
                    onChange={(e) => {
                      setDesired(+e.target.value)
                      setRecommend(false)
                    }}
                  />
                  <em>km</em>
                </label>
                {!distanceValid && (
                  <small className="field-error" role="alert">
                    Elige una distancia entre 1 y 42 km.
                  </small>
                )}
              </fieldset>
              <fieldset className="planner-choice">
                <legend>Nivel</legend>
                <div className="level-options">
                  {LEVEL_OPTIONS.map(({ value, label, bars }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={level === value}
                      className={level === value ? 'selected' : ''}
                      onClick={() => setLevel(value)}
                    >
                      <span className={`level-bars bars-${bars}`} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {draft.mode === 'recommend' && !mobile && (
            <div className="form-grid">
              <label className="field">
                Distancia deseada (km)
                <input
                  aria-label="Distancia deseada"
                  type="number"
                  min={1}
                  max={42}
                  step=".1"
                  value={desired}
                  onChange={(e) => {
                    setDesired(+e.target.value)
                    setRecommend(false)
                  }}
                />
                <small>Entre 1 y 42 km</small>
              </label>
              <label className="field">
                Nivel
                <select value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option value="Todos">Todos los niveles</option>
                  <option>Principiante</option>
                  <option>Intermedio</option>
                  <option>Avanzado</option>
                </select>
              </label>
            </div>
          )}
          {mobile ? (
            <fieldset className="planner-choice">
              <legend>
                Horario
                <strong>{dayPart?.label}</strong>
              </legend>
              <div className="day-parts">
                {DAY_PARTS.map(({ time, label, icon: Icon }) => (
                  <button
                    key={time}
                    type="button"
                    aria-pressed={state.time === time}
                    className={state.time === time ? 'selected' : ''}
                    onClick={() => update((s) => ({ ...s, time }))}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                    <small>{time}</small>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <div className="field scenario-field">
              <span>Fecha y hora de consulta</span>
              <TimeControl compact />
            </div>
          )}
          {draft.mode === 'manual' && (
            <div className="point-list">
              {draft.points.length === 0 ? (
                <p>Comienza pulsando sobre el mapa o usa la ruta sugerida.</p>
              ) : (
                draft.points.map((p, i) => (
                  <div key={i}>
                    <span className={i === 0 ? 'point-start' : ''}>
                      {i === 0 ? 'A' : i === draft.points.length - 1 ? 'B' : i + 1}
                    </span>
                    <p>
                      {i === 0
                        ? 'Inicio'
                        : i === draft.points.length - 1
                          ? 'Destino'
                          : 'Punto intermedio'}
                      <small>
                        {p[0].toFixed(4)}, {p[1].toFixed(4)}
                      </small>
                    </p>
                    <button
                      aria-label={`Eliminar punto ${i + 1}`}
                      onClick={() => setPoints(draft.points.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
          {draft.mode === 'calculate' && (
            <Button className="full" onClick={calculate}>
              <Navigation />
              Calcular ruta
            </Button>
          )}
          {draft.mode === 'recommend' && (
            <Button
              className={`full ${mobile ? 'planner-cta' : ''}`}
              disabled={desired < 1 || desired > 42}
              onClick={() => {
                setRecommend(true)
                setSearchKey((key) => key + 1)
              }}
            >
              <Compass />
              {mobile ? 'Encontrar rutas para mí' : 'Buscar recomendaciones'}
            </Button>
          )}
          {draft.mode !== 'recommend' && (
            <>
              <div className="route-edit-tools">
                <Button
                  variant="ghost"
                  disabled={!draft.points.length}
                  onClick={() => setPoints(draft.points.slice(0, -1))}
                >
                  <Undo2 />
                  Deshacer
                </Button>
                <Button
                  variant="ghost"
                  disabled={!draft.points.length}
                  onClick={() => {
                    setPoints([])
                    setCalculated(false)
                  }}
                >
                  <Eraser />
                  Limpiar
                </Button>
              </div>
              {ready ? (
                <div className="route-result" aria-live="polite">
                  <div className="result-label">
                    <Check />
                    {computed.segmentIds.length
                      ? mobile ? 'Tu ruta' : 'Ruta sobre la red vial'
                      : 'Trazado manual sin validar'}
                    <span>{mobile && dayPart ? `${dayPart.label} · ${state.time}` : state.time}</span>
                  </div>
                  {draft.mode === 'calculate' && shortestRoute && shortestResult ? (
                    <div className="route-compare">
                      <div className="route-compare-item is-safe">
                        <span className="route-compare-label">
                          <i aria-hidden="true" />
                          Ruta segura
                        </span>
                        <strong>
                          {km.toFixed(2)}
                          <small> km</small>
                        </strong>
                        <p>
                          {preview.min} min · Índice {result.score === null ? 'sin datos' : `${Math.round(result.score)}/100`}
                        </p>
                        <Score value={result.score} coverage={result.coverage} />
                      </div>
                      <div className="route-compare-item is-shortest">
                        <span className="route-compare-label">
                          <i aria-hidden="true" />
                          Ruta más corta
                        </span>
                        <strong>
                          {shortestKm.toFixed(2)}
                          <small> km</small>
                        </strong>
                        <p>
                          {shortestRoute.min} min · Índice{' '}
                          {shortestResult.score === null ? 'sin datos' : `${Math.round(shortestResult.score)}/100`}
                        </p>
                        <Score value={shortestResult.score} coverage={shortestResult.coverage} />
                      </div>
                      <p className="route-compare-note">
                        {sameRoute
                          ? 'En este trayecto la ruta más corta coincide con la ruta segura.'
                          : `La ruta segura recorre ${Math.max(0, km - shortestKm).toFixed(2)} km más porque prioriza los tramos con mejor índice de seguridad a las ${state.time}.`}
                      </p>
                    </div>
                  ) : (
                  <div className="route-result-main">
                    <div>
                      <strong>
                        {km.toFixed(2)}
                        <small> km</small>
                      </strong>
                      <p>
                        {preview.min} min · {computed.segmentIds.length} tramos ·{' '}
                        {preview.difficulty}
                      </p>
                    </div>
                    <Score value={result.score} coverage={result.coverage} />
                  </div>
                  )}
                  {SHOW_FUTURE && (
                    <Button
                      className="full"
                      onClick={save}
                      variant={savedId ? 'secondary' : 'primary'}
                    >
                      {savedId ? <Check /> : <Save />}
                      {savedId ? 'Guardada en Mis rutas' : 'Guardar ruta'}
                    </Button>
                  )}
                  <div className="result-actions">
                    <button
                      onClick={() =>
                        open(
                          savedId ? (allRoutes.find((r) => r.id === savedId) ?? preview) : preview,
                        )
                      }
                    >
                      Ver detalles
                    </button>
                    {SHOW_FUTURE && (
                      <button onClick={() => run(preview)}>
                        <Play />
                        Correr esta ruta
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="planner-empty">
                  <Navigation />
                  <p>
                    {draft.mode === 'manual'
                      ? 'Añade al menos dos puntos para calcular.'
                      : mobile
                        ? 'Elige origen y destino, o toca dos puntos en el mapa.'
                        : 'Selecciona dos puntos o calcula con los lugares disponibles.'}
                  </p>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
      {draft.mode === 'recommend' && recommend && (
        <section className="recommendation-results" ref={resultsRef}>
          {mobile ? (
            <div className="planner-results-head">
              <h2 ref={resultsHeading} tabIndex={-1}>
                {matches.length === 0
                  ? 'Sin resultados'
                  : matches.length === 1
                    ? '1 ruta para ti'
                    : `${matches.length} rutas para ti`}
              </h2>
              <p>
                {desired.toLocaleString('es')} km · {level === 'Todos' ? 'Todos los niveles' : level} ·{' '}
                {dayPart?.label} {state.time}
              </p>
            </div>
          ) : (
          <div className="section-heading">
            <div>
              <span className="eyebrow">PARA LAS {state.time}</span>
              <h2>{matches.length === 1 ? '1 ruta para ti' : `${matches.length} rutas para ti`}</h2>
            </div>
            <span>Según tus preferencias y el horario</span>
          </div>
          )}
          {matches.length && mobile ? (
            <ol className="planner-results-list">
              {matches.map((r, index) => {
                const condition = routeScore(r, state.time, state.date, state.incidents, state.risks, state.roads)
                const schedule = scheduleStatus(r.recommended, state.time)
                return (
                  <li key={r.id}>
                    <button type="button" className="planner-result" onClick={() => open(r)}>
                      <span className="planner-result-thumb">
                        <RoutePreview route={r} />
                      </span>
                      <span className="planner-result-body">
                        {index === 0 && <span className="planner-result-best">Mejor opción</span>}
                        <strong>{r.name}</strong>
                        <span className="planner-result-meta">
                          {r.km.toLocaleString('es', { maximumFractionDigits: 1 })} km · {r.min} min · {r.difficulty}
                        </span>
                        <span className="planner-result-tags">
                          <Score value={condition.score} coverage={condition.coverage} />
                          {r.official && <OfficialBadge />}
                          {schedule && (
                            <span className={`planner-result-schedule ${schedule.inside ? 'is-inside' : ''}`}>
                              {schedule.inside ? 'En su horario' : `Mejor desde las ${schedule.from}`}
                            </span>
                          )}
                        </span>
                      </span>
                      <ChevronRight className="planner-result-arrow" aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ol>
          ) : matches.length ? (
            <div className="route-grid">
              {matches.map((r) => (
                <RouteCard key={r.id} route={r} onOpen={open} editorial showSchedule />
              ))}
            </div>
          ) : (
            <EmptyState
              title={mobile ? 'Aún no hay rutas así' : 'Sin coincidencias para esta distancia'}
              description={
                mobile
                  ? 'Prueba otra distancia, otro nivel u otro horario.'
                  : 'Prueba una distancia diferente o cambia de nivel.'
              }
            />
          )}
          <div className="recommended-spaces">
            <h3>{mobile ? 'Espacios abiertos a esta hora' : 'Espacios que coinciden con el horario'}</h3>
            {state.spaces
              .filter((s) => !s.alert && scheduleStatus(s.hours, state.time)?.inside)
              .map((s) => (
                <span key={s.id}>
                  {s.name} <small>{s.hours}</small>
                </span>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
