import { useMemo, useState } from 'react'
import Image from 'next/image'
import clubPoster from '../../../../../imagenes/publicidad_runcty1.png'
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Flag,
  GraduationCap,
  Heart,
  LockKeyhole,
  Mail,
  MapPin,
  MessageSquare,
  Mountain,
  Navigation,
  Plus,
  Route as RouteIcon,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import SafetyMap from './SafetyMap'
import Planner from './Planner'
import RouteQuestionnaire, { RouteFeedbackCard } from './RouteQuestionnaire'
import {
  AdCarousel,
  BackButton,
  Button,
  ClubAlerts,
  Confirm,
  DemoTag,
  EmptyState,
  FilterChip,
  Modal,
  PageTitle,
  RouteCard,
  SafetyNote,
  SaveButton,
  Score,
  SpaceSchedule,
  Status,
  TimeControl,
} from './components'
import {
  colorHex,
  formatPace,
  formatTime,
  gpsQuality,
  nearPath,
  publicIncidents,
  routeScore,
  difficultyKey,
  safety,
  segmentScore,
  sliceAlong,
  today,
  uid,
  type Coordinate,
  type RouteData,
  type Training,
} from './data'
import { useDemo, useRoutes } from './store'
import { Reports } from './reports'
import { Security } from './security'
import { DemoMailbox } from './DemoMail'

type ScreenProps = {
  open: (r: RouteData) => void
  go: (page: string) => void
  run: (r: RouteData) => void
  mobile?: boolean
}

export function Explore({
  open,
  go,
  run,
  mobile = false,
  full = false,
}: ScreenProps & { full?: boolean }) {
  const { state, user } = useDemo(),
    all = useRoutes()
  const [query, setQuery] = useState(''),
    [difficulty, setDifficulty] = useState('Todos'),
    [km, setKm] = useState('Todos'),
    [source, setSource] = useState('Todas'),
    [filters, setFilters] = useState(false)
  const [showReports, setShowReports] = useState(true),
    [showSpaces, setShowSpaces] = useState(false),
    [expanded, setExpanded] = useState(false),
    [focus, setFocus] = useState<Coordinate | null>(null),
    [spaceDetail, setSpaceDetail] = useState<string | null>(null)
  const list = all
    .filter(
      (r) =>
        (!r.private || r.status === 'Aprobado') &&
        !r.alert &&
        (r.name + ' ' + r.area).toLowerCase().includes(query.toLowerCase()) &&
        (difficulty === 'Todos' || difficultyKey(r.difficulty) === difficultyKey(difficulty)) &&
        (km === 'Todos' || (km === '5' ? r.km <= 5 : r.km > 5)) &&
        (source === 'Todas' || (source === 'Oficiales' ? r.official : r.verified && !r.official)),
    )
    .sort(
      (a, b) =>
        (routeScore(b, state.time, state.date, state.incidents, state.risks, state.roads).score ??
          -1) -
        (routeScore(a, state.time, state.date, state.incidents, state.risks, state.roads).score ??
          -1),
    )
    .slice(0, mobile ? 5 : 3)
  const night = state.time === '19:00' || state.time === '05:30'
  const selectedSpace = state.spaces.find((s) => s.id === spaceDetail)
  return (
    <div className={`explore-screen ${mobile ? 'explore-mobile' : ''}`}>
      {mobile ? (
        <div className="mobile-intro">
          <p>{user ? `Hola, ${user.name}.` : 'Tu ciudad. Tu ritmo.'}</p>
          <h1>
            ¿Por dónde
            <br />
            correrás hoy<span>?</span>
          </h1>
          <span className="locality">
            <MapPin />
            Loja, Ecuador
          </span>
        </div>
      ) : full ? (
        <PageTitle
          eyebrow="LOJA, ECUADOR · TU CIUDAD, A TU RITMO"
          title="Elige con más información."
          subtitle="Consulta las condiciones de cada tramo para el horario que elijas."
        >
          <Button variant="secondary" onClick={() => go('recommend')}>
            <Sparkles />
            Recomendar rutas
          </Button>
          <Button onClick={() => go('planner')}>
            <Plus />
            Crear ruta
          </Button>
        </PageTitle>
      ) : (
        <section className="explore-hero relative isolate mb-6 overflow-hidden rounded-2xl border border-line/70 bg-shell">
          {state.heroImage && (
            <Image
              src={state.heroImage.url}
              alt={state.heroImage.alt}
              fill
              sizes="(min-width: 1024px) 75vw, 100vw"
              preload
              className="-z-20 object-cover object-[center_40%] opacity-65"
            />
          )}
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-shell via-shell/90 to-shell/15" />
          <div className="relative p-6 lg:px-8 lg:py-7">
            <PageTitle
              eyebrow={
                user
                  ? `HOLA, ${user.name.toUpperCase()}. TU SIGUIENTE META TE ESPERA.`
                  : 'LOJA, ECUADOR / CORRE CON INFORMACIÓN.'
              }
              title={
                <>
                  Tu ciudad.
                  <br />
                  <span className="text-lilac">Tu próxima meta.</span>
                </>
              }
              subtitle="Descubre recorridos y elige tu mejor horario para correr."
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => go('planner')}>
                <Plus /> Diseña tu recorrido
              </Button>
              <Button variant="secondary" data-tour="recommend" onClick={() => go('recommend')}>
                <Sparkles /> Inspírame
              </Button>
              <span className="ml-auto hidden items-center gap-2 text-[11px] font-medium tracking-wide text-muted xl:flex">
                <RouteIcon className="size-4 text-lilac" /> {all.length} RUTAS POR DESCUBRIR
                <span className="mx-2 h-3 w-px bg-line" />
                <MapPin className="size-4 text-lilac" /> LOJA
              </span>
            </div>
          </div>
        </section>
      )}
      <div className="explore-toolbar">
        <div className="search-box">
          <Search />
          <input
            aria-label="Buscar rutas o lugares"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const place = state.spaces.find((s) =>
                  s.name.toLowerCase().includes(query.toLowerCase()),
                )
                setFocus(place?.coordinate ?? list[0]?.geometry[0] ?? null)
              }
            }}
            placeholder={
              mobile ? 'Busca un lugar o una ruta' : 'Buscar rutas, parques o lugares en Loja…'
            }
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
              ×
            </button>
          )}
        </div>
        <button
          className={`filter-toggle ${filters ? 'selected' : ''}`}
          onClick={() => setFilters(!filters)}
          aria-label="Filtros de rutas"
        >
          <SlidersHorizontal />
          {!mobile && 'Filtros'}
          <span>
            {[difficulty !== 'Todos', km !== 'Todos', source !== 'Todas'].filter(Boolean).length ||
              ''}
          </span>
        </button>
        {!mobile && <TimeControl />}
      </div>
      {mobile && <TimeControl compact />}
      {!full && (
        <div
          className={`mb-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] ${mobile ? 'mx-5' : ''}`}
          aria-label="Filtros rápidos"
        >
          <FilterChip
            selected={km === 'Todos' && source === 'Todas'}
            onClick={() => {
              setKm('Todos')
              setSource('Todas')
            }}
          >
            Todas las rutas
          </FilterChip>
          <FilterChip
            selected={km === '5'}
            onClick={() => {
              setKm(km === '5' ? 'Todos' : '5')
              setSource('Todas')
            }}
          >
            Hasta 5 km
          </FilterChip>
          <FilterChip
            selected={source === 'Oficiales'}
            onClick={() => {
              setSource(source === 'Oficiales' ? 'Todas' : 'Oficiales')
              setKm('Todos')
            }}
          >
            <Shield className="size-3!" /> Del club
          </FilterChip>
        </div>
      )}
      {filters && (
        <div className="expanded-filters">
          <label className="field">
            Distancia
            <select value={km} onChange={(e) => setKm(e.target.value)}>
              <option value="Todos">Todas las distancias</option>
              <option value="5">Hasta 5 km</option>
              <option value="10">Más de 5 km</option>
            </select>
          </label>
          <label className="field">
            Dificultad
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="Todos">Todos los niveles</option>
              <option>Principiante</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
          </label>
          <label className="field">
            Origen
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="Todas">Todas las rutas</option>
              <option value="Oficiales">Oficiales</option>
              <option value="Comunidad">Comunidad</option>
            </select>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={showReports}
              onChange={(e) => setShowReports(e.target.checked)}
            />
            Reportes aprobados
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={showSpaces}
              onChange={(e) => setShowSpaces(e.target.checked)}
            />
            Espacios recomendados
          </label>
        </div>
      )}
      <div className={`explore-grid ${full ? 'full-explore' : ''}`}>
        <section className={expanded ? 'mobile-map-expanded' : 'explore-map-column'}>
          {expanded && (
            <div className="expanded-map-header">
              <BackButton onClick={() => setExpanded(false)} />
              <TimeControl date={false} />
            </div>
          )}
          <div className="explore-map" data-tour="map">
            <SafetyMap
              focus={focus}
              showReports={showReports}
              showSpaces={showSpaces}
              onRoute={(id) => {
                const route = all.find((r) => r.id === id)
                if (route) open(route)
              }}
              onExpand={mobile ? () => setExpanded(!expanded) : undefined}
            />
            {mobile && (
              <Button className="floating-create" onClick={() => go('planner')}>
                <Plus />
                Crear ruta
              </Button>
            )}
          </div>
          {!expanded && (
            <div className={`scenario-caption ${night ? 'night-caption' : ''}`}>
              <span>
                {night ? 'ESCENARIO NOCTURNO' : 'ESCENARIO DIURNO'} · {state.time}
              </span>
              <p>
                {night
                  ? 'La iluminación y los puntos de apoyo influyen más en este horario.'
                  : 'Consulta cada tramo y compara tus alternativas antes de salir.'}
              </p>
              <Shield />
            </div>
          )}
        </section>
        {!expanded && (
          <section className="recommended-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">SELECCIONADAS PARA TI</span>
                <h2>Rutas recomendadas</h2>
              </div>
              <button className="text-action" onClick={() => go('routes')}>
                Ver todas <ArrowRight />
              </button>
            </div>
            <div className={mobile ? 'editorial-carousel' : 'recommended-list'}>
              {list.length ? (
                list.map((r) => <RouteCard key={r.id} route={r} onOpen={open} editorial={mobile} />)
              ) : (
                <EmptyState
                  title="Sin coincidencias"
                  description="Prueba otro nombre o cambia los filtros."
                />
              )}
            </div>
            {!mobile && (
              <div className="planning-prompt">
                <Navigation />
                <div>
                  <strong>¿Prefieres tu propio camino?</strong>
                  <p>Traza una ruta sobre el mapa.</p>
                </div>
                <button aria-label="Ir al creador de rutas" onClick={() => go('planner')}>
                  <ArrowRight />
                </button>
              </div>
            )}
          </section>
        )}
      </div>
      <SafetyNote />
      {!full && !expanded && (
        <>
          <section className="places-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">RECOMENDADOS POR GACELAS</span>
                <h2>Espacios para moverte</h2>
              </div>
              <button className="text-action" onClick={() => go('spaces')}>
                Explorar <ArrowRight />
              </button>
            </div>
            {state.spaces.length ? (
              <div className="places-row">
                {state.spaces.slice(0, mobile ? 3 : 4).map((space, i) => (
                  <button
                    className="place-item"
                    key={space.id}
                    onClick={() => {
                      setSpaceDetail(space.id)
                      setFocus(space.coordinate)
                    }}
                  >
                    <span className="place-order">0{i + 1}</span>
                    <div>
                      <strong>{space.name}</strong>
                      <p>
                        {space.type} · {space.hours}
                      </p>
                      <SpaceSchedule hours={space.hours} />
                    </div>
                    <ChevronRight />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Pronto, más lugares para correr"
                description="Los espacios publicados por el club aparecerán aquí."
              />
            )}
          </section>
          <AdCarousel />
          <button className="club-link-strip" onClick={() => go('club')}>
            <span className="club-letter">G</span>
            <div>
              <strong>Corremos mejor, juntos.</strong>
              <p>Conoce al Club Deportivo Gacelas Running Team.</p>
            </div>
            <ArrowRight />
          </button>
        </>
      )}
      {selectedSpace && (
        <Modal title={selectedSpace.name} onClose={() => setSpaceDetail(null)}>
          <ClubAlerts item={selectedSpace} hours={selectedSpace.hours} />
          <p>{selectedSpace.description}</p>
          <div className="modal-map">
            <SafetyMap focus={selectedSpace.coordinate} showSpaces />
          </div>
          <p>
            {selectedSpace.location} · {selectedSpace.hours}
          </p>
          <DemoTag />
        </Modal>
      )}
    </div>
  )
}

export function Routes({
  open,
  go,
  run,
  mobile = false,
  saved = false,
}: ScreenProps & { saved?: boolean }) {
  const { state, update, notify } = useDemo(),
    all = useRoutes()
  const [query, setQuery] = useState(''),
    [tab, setTab] = useState(saved ? 'saved' : 'catalog'),
    [difficulty, setDifficulty] = useState('Todos'),
    [max, setMax] = useState('42'),
    [deleting, setDeleting] = useState<RouteData | null>(null),
    [rename, setRename] = useState<RouteData | null>(null),
    [name, setName] = useState('')
  const list = all.filter(
    (r) =>
      (r.name + ' ' + r.area).toLowerCase().includes(query.toLowerCase()) &&
      (tab === 'saved'
        ? state.savedIds.includes(r.id)
        : tab === 'own'
          ? r.owned
          : !r.private || r.status === 'Aprobado') &&
      (difficulty === 'Todos' || difficultyKey(r.difficulty) === difficultyKey(difficulty)) &&
      r.km <= +max,
  )
  const propose = (r: RouteData) => {
    update((s) => ({
      ...s,
      catalog: s.catalog.map((x) =>
        x.id === r.id ? { ...x, status: 'Pendiente', private: true } : x,
      ),
      customRoutes: s.customRoutes.map((x) => (x.id === r.id ? { ...x, status: 'Pendiente' } : x)),
    }))
    notify('Propuesta enviada. Solo el club puede revisarla desde el panel web.')
  }
  return (
    <div className={`routes-screen ${mobile ? 'mobile-padded' : ''}`}>
      <PageTitle
        eyebrow={saved ? 'TU COLECCIÓN' : 'DESCUBRE LOJA'}
        title={saved ? 'Mis rutas' : 'Un nuevo camino te espera.'}
        subtitle={mobile ? undefined : 'Explora, guarda y compara recorridos según el horario.'}
      >
        <Button onClick={() => go('planner')}>
          <Plus />
          Crear ruta
        </Button>
      </PageTitle>
      <div className="tabs">
        <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>
          Catálogo
        </button>
        <button className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>
          Guardadas <span>{state.savedIds.length}</span>
        </button>
        <button className={tab === 'own' ? 'active' : ''} onClick={() => setTab('own')}>
          Mis recorridos
        </button>
      </div>
      <div className="route-filters catalog-filters">
        <div className="search-box">
          <Search />
          <input
            value={query}
            aria-label="Buscar en catálogo"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca tu próxima ruta…"
          />
        </div>
        <select
          aria-label="Filtrar dificultad"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="Todos">Todos los niveles</option>
          <option>Principiante</option>
          <option value="Intermedio">Intermedio</option>
          <option value="Avanzado">Avanzado</option>
        </select>
        <select aria-label="Distancia máxima" value={max} onChange={(e) => setMax(e.target.value)}>
          <option value="42">Todas las distancias</option>
          <option value="5">Hasta 5 km</option>
          <option value="10">Hasta 10 km</option>
        </select>
      </div>
      <TimeControl />
      <div className="route-count catalog-count" role="status">
        <strong>{list.length === 1 ? '1 ruta disponible' : `${list.length} rutas disponibles`}</strong>
        <span>Horario consultado: <time>{state.time}</time></span>
      </div>
      {list.length ? (
        <div className="route-grid">
          {list.map((r) => (
            <div key={r.id}>
              <RouteCard route={r} onOpen={open} editorial />
              {r.owned && (
                <div className="own-route-actions">
                  <Status value={r.status ?? 'Privada'} />
                  <button
                    onClick={() => {
                      setRename(r)
                      setName(r.name)
                    }}
                  >
                    Renombrar
                  </button>
                  <button
                    disabled={r.status === 'Pendiente' || r.status === 'Aprobado'}
                    onClick={() => propose(r)}
                  >
                    Proponer
                  </button>
                  <button aria-label={`Eliminar ${r.name}`} onClick={() => setDeleting(r)}>
                    <Trash2 />
                  </button>
                  {r.reason && <small>Motivo: {r.reason}</small>}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Tu próxima ruta empieza aquí"
          description="No hay recorridos con estos filtros. Guarda una ruta o crea la tuya."
        >
          <Button onClick={() => go('planner')}>Crear ruta</Button>
        </EmptyState>
      )}
      <AdCarousel placement="catalog" />
      {deleting && (
        <Confirm
          title="¿Eliminar esta ruta?"
          message="Se eliminará de tu cuenta y del catálogo si está publicada. Los entrenamientos conservarán su copia histórica del recorrido."
          onClose={() => setDeleting(null)}
          label="Eliminar ruta"
          confirm={() => {
            update((s) => ({
              ...s,
              catalog: s.catalog.filter((r) => r.id !== deleting.id),
              customRoutes: s.customRoutes.filter((r) => r.id !== deleting.id),
              savedIds: s.savedIds.filter((id) => id !== deleting.id),
            }))
            notify('Ruta eliminada')
          }}
        />
      )}
      {rename && (
        <Modal title="Renombrar ruta" onClose={() => setRename(null)}>
          <label className="field">
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </label>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              update((s) => ({
                ...s,
                catalog: s.catalog.map((r) =>
                  r.id === rename.id ? { ...r, name: name.trim() } : r,
                ),
                customRoutes: s.customRoutes.map((r) =>
                  r.id === rename.id ? { ...r, name: name.trim() } : r,
                ),
              }))
              setRename(null)
              notify('Nombre actualizado')
            }}
          >
            Guardar cambios
          </Button>
        </Modal>
      )}
    </div>
  )
}

export function RouteDetail({
  route,
  back,
  run,
  mobile = false,
}: {
  route: RouteData
  back: () => void
  run: (r: RouteData) => void
  mobile?: boolean
}) {
  const { state, user, update, notify, openAccount, isDemo } = useDemo(),
    result = routeScore(route, state.time, state.date, state.incidents, state.risks, state.roads)
  const [comment, setComment] = useState('')
  const [questionnaire, setQuestionnaire] = useState(false)
  const comments = state.comments.filter((value) => value.routeId === route.id)
  const level = safety(result.score),
    nearby = publicIncidents(state.incidents).filter((i) =>
      route.geometry.some((p) => Math.abs(p[0] - i.coordinate[0]) < 0.004),
    )
  return (
    <div className={`route-detail-screen ${mobile ? 'detail-mobile' : ''}`}>
      {!mobile && <BackButton onClick={back}>Volver a rutas</BackButton>}
      <div className="detail-heading">
        <div>
          <span className="eyebrow">
            <MapPin />
            {route.area.includes('Loja') ? route.area : `${route.area} · Loja`}
          </span>
          <h1>{route.name}</h1>
          <div className="detail-badges">
            {route.official && (
              <span className="verified">
                <Check />
                Oficial Gacelas · demostración
              </span>
            )}
            {route.verified && !route.official && (
              <span className="verified">
                <Check />
                Revisión del club · demostración
              </span>
            )}
            <DemoTag />
          </div>
        </div>
        {!mobile && (
          <div className="detail-cta">
            <SaveButton route={route} />
            <Button variant="orange" onClick={() => run(route)}>
              <Activity />
              Correr esta ruta
            </Button>
          </div>
        )}
      </div>
      <div className="detail-map-layout">
        <div className="detail-map">
          <SafetyMap route={route} fitRoute showReports />
        </div>
        <aside className="route-insights">
          <span className="eyebrow">CONDICIONES PARA ESTE HORARIO</span>
          <div className="route-index-heading">
            <Score value={result.score} coverage={result.coverage} large />
            <p className="condition-explanation">Revisa los tramos y el horario antes de salir.</p>
          </div>
          <div className="detail-numbers">
            <span>
              <strong>{route.km.toFixed(1)}</strong>kilómetros
            </span>
            <span>
              <strong>{route.min}</strong>minutos aprox.
            </span>
            <span>
              <Mountain />
              <b>{route.difficulty}</b>dificultad
            </span>
          </div>
          <TimeControl compact />
          <ClubAlerts item={route} hours={route.recommended} />
          <SafetyNote />
          {mobile && (
            <div className="mobile-detail-actions">
              <SaveButton route={route} />
              <Button variant="orange" onClick={() => run(route)}>
                <Activity />
                Correr esta ruta
              </Button>
            </div>
          )}
        </aside>
      </div>
      {!route.private && route.status === 'Aprobado' && <RouteFeedbackCard route={route} open={() => setQuestionnaire(true)} />}
      {questionnaire && <RouteQuestionnaire route={route} close={() => setQuestionnaire(false)} />}
      <div className="detail-information">
        <section>
          <span className="eyebrow">EL RECORRIDO</span>
          <h2>Más que kilómetros.</h2>
          <p>{route.desc}</p>
          <div className="route-qualities">
            <span>
              <Users />
              Actividad por horario
            </span>
            <span>
              <Shield />
              Puntos de apoyo
            </span>
            <span>
              <MapPin />
              Trazado georreferenciado
            </span>
          </div>
          <h3>Condiciones por tramo</h3>
          <div className="segment-breakdown">
            {route.segmentIds.map((id) => {
              const s = state.roads.find((s) => s.id === id)
              if (!s) return null
              const n = segmentScore(s, state.time, state.date, state.incidents, state.risks)
              return (
                <div key={id}>
                  <span className={`segment-color ${safety(n).key}`} />
                  <div>
                    <strong>{s.name}</strong>
                    <p>{s.factors[0]}</p>
                  </div>
                  <span className={`text-${safety(n).key}`}>
                    {n ?? '—'}
                    <small>{safety(n).label}</small>
                  </span>
                </div>
              )
            })}
          </div>
        </section>
        <aside>
          <div className="recommended-hours">
            <Clock3 />
            <div>
              <h3>Horarios recomendados</h3>
              <p>{route.recommended ?? '08:00–10:00 · 14:00–17:00'}</p>
              <small>
                Horarios de demostración; comprueba las condiciones reales antes de salir.
              </small>
            </div>
          </div>
          <h3>Reportes aprobados cercanos</h3>
          {nearby.length ? (
            nearby.map((i) => (
              <div className="nearby-report" key={i.id}>
                <Flag />
                <div>
                  <strong>{i.type}</strong>
                  <p>
                    {i.location} · {i.date}
                  </p>
                  <small>Aporte revisado por el club</small>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No hay reportes aprobados vigentes próximos al trazado.</p>
          )}
          <div className="info-strip">La ausencia de reportes no implica ausencia de riesgo.</div>
          <small className="updated-date">
            Consulta: {state.date} · {state.time}
          </small>
        </aside>
      </div>
      {!route.private && route.status === 'Aprobado' && (
        <section className="admin-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">VOCES DEL RECORRIDO</span>
              <h2>La comunidad comparte.</h2>
            </div>
          </div>
          {comments
            .filter((value) => value.status === 'Aprobado')
            .map((value) => (
              <article className="comment-review" key={value.id}>
                <MessageSquare />
                <p>{value.text}</p>
              </article>
            ))}
          {!comments.some((value) => value.status === 'Aprobado') && (
            <p className="muted">Todavía no hay comentarios aprobados para este recorrido.</p>
          )}
          {comments.some((value) => value.status === 'Pendiente') && (
            <p className="info-strip">Tu comentario está pendiente de revisión del club.</p>
          )}
          {user && isDemo ? <Button variant="secondary" onClick={() => setQuestionnaire(true)}>Compartir mi experiencia</Button> : user ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                const text = comment.trim()
                if (!text || text.length > 800) {
                  notify('Escribe un comentario de entre 1 y 800 caracteres.')
                  return
                }
                if (
                  update((value) => ({
                    ...value,
                    comments: [
                      ...value.comments,
                      { id: uid(), text, status: 'Pendiente', routeId: route.id },
                    ],
                  }))
                ) {
                  setComment('')
                  notify('Sincronizando tu comentario para revisión del club.')
                }
              }}
            >
              <label className="field">
                Comparte tu experiencia
                <textarea
                  required
                  maxLength={800}
                  rows={3}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Habla del recorrido, sin incluir datos personales."
                />
              </label>
              <Button type="submit" disabled={!comment.trim()}>
                Enviar a revisión <ArrowRight />
              </Button>
            </form>
          ) : (
            <Button variant="secondary" onClick={openAccount}>
              Inicia sesión para comentar
            </Button>
          )}
        </section>
      )}
    </div>
  )
}

export function History({
  run,
  mobile = false,
  back,
}: {
  run: (r: RouteData) => void
  mobile?: boolean
  back?: () => void
}) {
  const { state, update, notify, isDemo } = useDemo(),
    [selected, setSelected] = useState<Training | null>(null),
    [deleting, setDeleting] = useState<Training | null>(null)
  const total = state.trainings.reduce((n, t) => n + t.km, 0),
    seconds = state.trainings.reduce((n, t) => n + t.seconds, 0)
  return (
    <div className={mobile ? 'mobile-padded' : ''}>
      {back && <BackButton onClick={back} />}
      <PageTitle
        eyebrow="TU CUENTA · ACTIVIDAD PERSONAL"
        title="Cada kilómetro cuenta."
        subtitle={isDemo ? 'Entrenamientos simulados de esta pestaña. Se eliminan al recargar.' : 'Tu historial privado de entrenamientos simulados, guardado en tu cuenta.'}
      >
        <Button
          variant="orange"
          disabled={!state.catalog.length}
          onClick={() => {
            if (state.catalog[0]) run(state.catalog[0])
          }}
        >
          <Activity />
          Iniciar entrenamiento
        </Button>
      </PageTitle>
      {state.trainings.some((t) => t.pendingSync) && (
        <div className="sync-pending" role="status">
          <span>Tienes entrenamientos pendientes de sincronizar.</span>
          <button
            type="button"
            onClick={() => {
              update((s) => ({
                ...s,
                trainings: s.trainings.map((t) => ({ ...t, pendingSync: false })),
              }))
              notify('Conexión recuperada. Tus entrenamientos se subieron sin duplicarse.')
            }}
          >
            Simular conexión
          </button>
        </div>
      )}
      <div className="activity-totals">
        <span>
          <strong>
            {total.toFixed(1)}
            <small> km</small>
          </strong>
          Distancia acumulada
        </span>
        <span>
          <strong>{state.trainings.length}</strong>Entrenamientos
        </span>
        <span>
          <strong>
            {Math.floor(seconds / 3600)}
            <small> h</small> {Math.floor((seconds % 3600) / 60)}
            <small> min</small>
          </strong>
          Tiempo en movimiento
        </span>
      </div>
      <div className="training-list">
        {[...state.trainings]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((t) => (
            <article key={t.id}>
              <button onClick={() => setSelected(t)}>
                <div className="training-date">
                  <strong>{new Date(t.date).getDate()}</strong>
                  <span>{new Date(t.date).toLocaleDateString('es', { month: 'short' })}</span>
                </div>
                <div className="training-info">
                  <h3>{t.route.name}</h3>
                  <p>
                    {new Date(t.date).toLocaleDateString('es', { weekday: 'long' })} · GPS de
                    demostración
                  </p>
                  {t.pendingSync && <span className="route-flag">Pendiente de sincronizar</span>}
                </div>
                <span>
                  <strong>{t.km.toFixed(2)}</strong>km
                </span>
                <span>
                  <strong>{formatTime(t.seconds)}</strong>tiempo
                </span>
                <ChevronRight />
              </button>
              <button
                className="delete-training"
                aria-label={`Eliminar entrenamiento ${t.route.name}`}
                onClick={() => setDeleting(t)}
              >
                <Trash2 />
              </button>
            </article>
          ))}
      </div>
      {!state.trainings.length && (
        <EmptyState
          title="Tu primera salida te espera"
          description="Inicia un entrenamiento en la experiencia móvil."
        />
      )}
      {selected && (
        <Modal title="Detalle del entrenamiento" wide onClose={() => setSelected(null)}>
          <h3>{selected.route.name}</h3>
          <div className="modal-map">
            <SafetyMap route={selected.route} fitRoute track={selected.route.km > 0 && selected.seconds > 0 ? sliceAlong(selected.route.geometry, 0, selected.km / selected.route.km) : []} />
          </div>
          <div className="activity-totals">
            <span>
              <strong>{selected.km.toFixed(2)}</strong>km
            </span>
            <span>
              <strong>{formatTime(selected.seconds)}</strong>tiempo
            </span>
            <span>
              <strong>{formatPace(selected.seconds, selected.km)}</strong>ritmo /km
            </span>
          </div>
          <p className="gps-quality">
            GPS simulado: {gpsQuality(selected.seconds).used} puntos usados y{' '}
            {gpsQuality(selected.seconds).discarded} descartados por imprecisos.
          </p>
          <DemoTag />
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="¿Eliminar entrenamiento?"
          message="El entrenamiento se quitará de tu historial en web y móvil."
          label="Eliminar"
          onClose={() => setDeleting(null)}
          confirm={() => {
            update((s) => ({ ...s, trainings: s.trainings.filter((t) => t.id !== deleting.id) }))
            notify('Entrenamiento eliminado')
          }}
        />
      )}
    </div>
  )
}

export function Profile({
  go,
  mobile = false,
  tutorial,
}: {
  go: (s: string) => void
  mobile?: boolean
  tutorial?: () => void
}) {
  const { state, user, update, notify, logout, isDemo } = useDemo()
  const [dialog, setDialog] = useState<'privacy' | 'personal' | 'logout' | 'mail' | null>(null),
    [email, setEmail] = useState(state.profile.email),
    [name, setName] = useState(state.profile.name),
    [level, setLevel] = useState(state.profile.level)
  const total = state.trainings.reduce((sum, t) => sum + t.km, 0)
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - 6 + i)
    const amount = state.trainings
      .filter((training) => training.date.slice(0, 10) === date.toISOString().slice(0, 10))
      .reduce((sum, training) => sum + training.km, 0)
    return { date, amount }
  })
  const weekTotal = week.reduce((sum, day) => sum + day.amount, 0)
  return (
    <div className={`profile-screen ${mobile ? 'mobile-padded' : ''}`}>
      <div className="profile-heading">
        <span className="profile-avatar">{user?.name.charAt(0).toUpperCase()}</span>
        <div>
          <span className="eyebrow">TU ESPACIO EN RUNCTY</span>
          <h1>{user?.name ?? 'Tu perfil'}</h1>
          <p>Corredor {state.profile.level.toLowerCase()}</p>
          <span className="privacy-label">
            <LockKeyhole />
            {state.profile.public ? 'Perfil público' : 'Perfil privado'}
          </span>
        </div>
        <button className="edit-profile" onClick={() => setDialog('personal')}>
          Editar perfil <ChevronRight />
        </button>
      </div>
      <div className="profile-numbers">
        <span>
          <i>
            <Navigation />
          </i>
          <strong>
            {total.toFixed(1)}
            <small> km</small>
          </strong>
          <b>Distancia acumulada</b>
        </span>
        <span>
          <i>
            <Activity />
          </i>
          <strong>{state.trainings.length.toString().padStart(2, '0')}</strong>
          <b>Entrenamientos</b>
        </span>
        <span>
          <i>
            <RouteIcon />
          </i>
          <strong>{state.savedIds.length.toString().padStart(2, '0')}</strong>
          <b>Rutas guardadas</b>
        </span>
      </div>
      <section className="weekly-activity" aria-labelledby="weekly-activity-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">UN PASO A LA VEZ</span>
            <h2 id="weekly-activity-title">Tu actividad semanal</h2>
          </div>
          <span className="weekly-total">
            <strong>{weekTotal.toFixed(1)} km</strong>
            Últimos 7 días
          </span>
        </div>
        {weekTotal === 0 && (
          <div className="weekly-empty">
            <p>Tu primer entrenamiento empieza aquí. Registra tu primera salida para ver tu progreso.</p>
            <button type="button" onClick={() => go('train')}>
              Comenzar a correr <ArrowRight size={14} />
            </button>
          </div>
        )}
        <div className="weekly-chart" aria-label="Distancia de los últimos siete días">
          {week.map(({ date, amount }) => (
            <div key={date.toISOString()}>
              <span
                className={amount ? 'has-activity' : ''}
                style={
                  {
                    '--bar-height': `${Math.min(100, Math.max(4, amount * 9))}%`,
                  } as React.CSSProperties
                }
              >
                <b>{amount ? `${amount.toFixed(1)} km` : ''}</b>
              </span>
              <small>{date.toLocaleDateString('es', { weekday: 'narrow' })}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="profile-navigation">
        {[
          {
            icon: Activity,
            label: 'Mis entrenamientos',
            desc: `${state.trainings.length} salidas registradas`,
            action: () => go('history'),
          },
          {
            icon: Heart,
            label: 'Mis rutas guardadas',
            desc: `${state.savedIds.length} caminos por recorrer`,
            action: () => go('myroutes'),
          },
          {
            icon: Flag,
            label: 'Mis reportes',
            desc: 'Consulta el estado de tus aportes',
            action: () => go('reports'),
          },
          {
            icon: Users,
            label: 'Contactos de confianza',
            desc: `${state.contacts.length} contactos registrados`,
            action: () => go('security'),
          },
          {
            icon: Navigation,
            label: 'Compartir ubicación',
            desc:
              state.sharing && !state.sharing.revoked
                ? 'Enlace temporal activo'
                : 'Tú decides cuándo compartir',
            action: () => go('security'),
          },
          {
            icon: LockKeyhole,
            label: 'Configuración de privacidad',
            desc: 'Controla lo que compartes',
            action: () => setDialog('privacy'),
          },
          {
            icon: Users,
            label: 'Datos personales',
            desc: 'Tu información y nivel deportivo',
            action: () => setDialog('personal'),
          },
          ...(isDemo
            ? [
                {
                  icon: Mail,
                  label: 'Correos simulados',
                  desc: `${state.emails.length} mensajes de ejemplo`,
                  action: () => setDialog('mail'),
                },
              ]
            : []),
          ...(tutorial
            ? [
                {
                  icon: GraduationCap,
                  label: 'Ver tutorial',
                  desc: 'Repasa las funciones principales',
                  action: tutorial,
                },
              ]
            : []),
        ].map(({ icon: I, label, desc, action }) => (
          <button key={label} onClick={action}>
            <span>
              <I />
            </span>
            <div>
              <strong>{label}</strong>
              <p>{desc}</p>
            </div>
            <ChevronRight />
          </button>
        ))}
      </div>
      <button className="logout-button" onClick={() => setDialog('logout')}>
        Cerrar sesión <ArrowRight />
      </button>
      {dialog === 'personal' && (
        <Modal title="Tus datos personales" onClose={() => setDialog(null)}>
          <label className="field">
            Nombre
            <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            Correo electrónico
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            Nivel
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option>Principiante</option>
              <option>Intermedio</option>
              <option>Avanzado</option>
            </select>
          </label>
          <Button
            disabled={!name.trim() || !email.includes('@')}
            onClick={() => {
              update((s) => ({ ...s, profile: { ...s.profile, name: name.trim(), email, level } }))
              setDialog(null)
              notify('Perfil actualizado en las dos experiencias')
            }}
          >
            Guardar cambios
          </Button>
        </Modal>
      )}
      {dialog === 'privacy' && (
        <Modal title="Privacidad del perfil" onClose={() => setDialog(null)}>
          <p>
            Esta preferencia se guarda en tu cuenta. Los perfiles públicos todavía no están
            disponibles: tu correo, contactos, entrenamientos y ubicaciones siguen siendo privados.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={state.profile.public}
              onChange={(e) =>
                update((s) => ({ ...s, profile: { ...s.profile, public: e.target.checked } }))
              }
            />
            Permitir cifras agregadas cuando esté disponible el perfil público
          </label>
          <Button
            onClick={() => {
              setDialog(null)
              notify('Consulta el indicador de sincronización para confirmar el guardado.')
            }}
          >
            Confirmar privacidad
          </Button>
        </Modal>
      )}
      {dialog === 'mail' && <DemoMailbox close={() => setDialog(null)} />}
      {dialog === 'logout' && (
        <Confirm
          title="¿Cerrar sesión?"
          message="Tus datos sincronizados seguirán en tu cuenta. Se retirarán de esta sesión y volverás a la exploración pública."
          label="Cerrar sesión"
          onClose={() => setDialog(null)}
          confirm={() => {
            void logout().then((closed) => {
              if (closed) go('explore')
            })
          }}
        />
      )}
    </div>
  )
}

export function PublicClub({ open, go, run, mobile = false }: ScreenProps) {
  const { state } = useDemo(),
    [detail, setDetail] = useState<string | null>(null)
  return (
    <div className={mobile ? 'mobile-padded' : ''}>
      <PageTitle
        eyebrow="LOJA, ECUADOR"
        title={<span className="gacelas-brand">{state.clubName}</span>}
        subtitle="Una comunidad que se mueve con propósito."
      />
      <div className="club-editorial">
        <div>
          <span>CLUB DEPORTIVO</span>
          <h2>
            Corremos mejor.
            <br />
            Corremos juntos.
          </h2>
          <p>
            {state.clubDescription ||
              'La presentación del club estará disponible cuando sea publicada por su equipo.'}
          </p>
          <Button variant="secondary" onClick={() => setDetail('Información del club')}>
            Conoce al club <ArrowRight />
          </Button>
        </div>
        <span className="club-editorial-type">
          GACELAS{' '}
          <br />
          <b>RUNNING</b>{' '}
          <br />
          TEAM
        </span>
      </div>
      <figure className="my-6 flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-panel p-5">
        <Image src={clubPoster} alt="Pieza gráfica Social Run Loja del material aportado por el proyecto" width={180} height={180} unoptimized className="rounded-xl object-contain" />
        <figcaption className="max-w-sm text-sm leading-6 text-muted"><strong className="mb-2 block text-copy">Gacelas Running Team · referencia del proyecto</strong>Material visual proporcionado por el equipo. Esta pieza no anuncia un evento vigente ni implica un patrocinio confirmado.</figcaption>
      </figure>
      <div className="section-heading">
        <h2>{state.catalog.some((route) => route.official) ? 'Rutas oficiales' : 'Rutas de ejemplo · demostración'}</h2>
      </div>
      <div className="route-grid">
        {(state.catalog.some((route) => route.official)
          ? state.catalog.filter((route) => route.official)
          : state.catalog.slice(0, 3)
        ).map((route) => (
          <RouteCard key={route.id} route={route} onOpen={open} />
        ))}
      </div>
      <Spaces mobile={mobile} />
      <AdCarousel placement="club" />
      <div className="future-features">
        <span>PRÓXIMAMENTE</span>
        <h3>Noticias y salidas grupales</h3>
        <p>Módulos futuros. No se incluyen eventos ni horarios reales en esta demostración.</p>
      </div>
      {detail && (
        <Modal title={detail} onClose={() => setDetail(null)}>
          <p>Club Deportivo Gacelas Running Team · Loja, Ecuador.</p>
          <p>
            Información y horarios sujetos a confirmación con el club. No se publica un contacto
            real sin autorización.
          </p>
          <DemoTag />
        </Modal>
      )}
    </div>
  )
}
export function Spaces({ mobile = false }: { mobile?: boolean }) {
  const { state } = useDemo(),
    routes = useRoutes(),
    [selectedId, setSelectedId] = useState<string | null>(null)
  const space = state.spaces.find((value) => value.id === selectedId) ?? state.spaces[0]
  if (!space)
    return (
      <EmptyState
        title="Aún no hay espacios publicados"
        description="Los lugares y horarios aparecerán aquí cuando el club los publique."
      />
    )
  const passing = routes.filter(
    (route) =>
      (!route.private || route.status === 'Aprobado') &&
      nearPath(route.geometry, space.coordinate, 0.15),
  )
  return (
    <section className="spaces-screen">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ESPACIOS RECOMENDADOS</span>
          <h2>Loja se mueve.</h2>
        </div>
      </div>
      <div className="spaces-layout">
        <div className="space-list">
          {state.spaces.map((s) => (
            <button
              key={s.id}
              className={space.id === s.id ? 'selected' : ''}
              onClick={() => setSelectedId(s.id)}
            >
              <MapPin />
              <div>
                <strong>{s.name}</strong>
                <p>
                  {s.type} · {s.hours}
                </p>
                <SpaceSchedule hours={s.hours} />
              </div>
              <ChevronRight />
            </button>
          ))}
        </div>
        <div>
          <ClubAlerts item={space} hours={space.hours} />
          <div className="space-map">
            <SafetyMap focus={space.coordinate} showSpaces />
          </div>
          <p className="muted">{space.description}</p>
          <div className="space-routes">
            <h3>Rutas que pasan por aquí</h3>
            <ul>
              {passing.map((route) => (
                <li key={route.id}>{route.name}</li>
              ))}
              {!passing.length && <li>Ninguna ruta publicada pasa por este espacio.</li>}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export function MainScreen({
  page,
  open,
  go,
  run,
  mobile = false,
  tutorial,
}: ScreenProps & { page: string; tutorial?: () => void }) {
  const { update } = useDemo()
  if (page === 'explore' || page === 'map')
    return <Explore {...{ open, go, run, mobile }} full={page === 'map'} />
  if (page === 'routes' || page === 'myroutes')
    return <Routes key={page} {...{ open, go, run, mobile }} saved={page === 'myroutes'} />
  if (page === 'planner' || page === 'recommend')
    return <Planner key={page} mobile={mobile} open={open} run={run} />
  if (page === 'reports' || page === 'report')
    return <Reports mobile={mobile} initialForm={page === 'report'} />
  if (page === 'history') return <History mobile={mobile} run={run} />
  if (page === 'profile') return <Profile mobile={mobile} go={go} tutorial={tutorial} />
  if (page === 'security') return <Security mobile={mobile} />
  if (page === 'spaces')
    return (
      <div className={mobile ? 'mobile-padded' : ''}>
        <PageTitle title="Espacios recomendados" />
        <Spaces mobile={mobile} />
      </div>
    )
  if (page === 'club') return <PublicClub {...{ open, go, run, mobile }} />
  return null
}
