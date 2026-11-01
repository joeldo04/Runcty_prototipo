'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  CircleUserRound,
  Computer,
  Flag,
  Footprints,
  Heart,
  History as HistoryIcon,
  Home,
  Map,
  MapPin,
  Menu,
  MessageSquare,
  Monitor,
  Navigation,
  Plus,
  QrCode,
  Route,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { BackButton, Button, EmptyState, IconButton, Logo, Modal, PageTitle, RunnerIcon } from './components'
import { isAdminUser, type Role, type RouteData } from './data'
import { useDemo, useRoutes } from './store'
import SafetyMap from './SafetyMap'
import { MainScreen, RouteDetail } from './screens'
import { DemoAccess, MobileWelcome } from './Onboarding'
import { PublicHome } from './PublicHome'
import { ClubAdmin, SystemAdmin } from './Admin'
import NewsCenter from './NewsCenter'
import Training from './Training'
import { Tour, useTour, type TourStep } from './Tour'
import type { RunctySession } from '@/lib/runcty-queries'
import { paths, clubPages, systemPages, privatePages } from './navigation'

type Experience = 'selector' | 'web' | 'mobile'
const publicNavigation = [
  { id: 'explore', label: 'Explorar', icon: Home },
  { id: 'map', label: 'Mapa de seguridad', icon: Map },
  { id: 'routes', label: 'Rutas', icon: Route },
  { id: 'spaces', label: 'Espacios recomendados', icon: MapPin },
  { id: 'club', label: 'Club Gacelas', icon: Users },
]
const runnerNavigation = [
  { id: 'explore', label: 'Explorar', icon: Home },
  { id: 'map', label: 'Mapa de seguridad', icon: Map },
  { id: 'routes', label: 'Rutas', icon: Route },
  { id: 'planner', label: 'Planificar ruta', icon: Navigation },
  { id: 'myroutes', label: 'Mis rutas', icon: Heart },
  { id: 'history', label: 'Mis entrenamientos', icon: Activity },
  { id: 'reports', label: 'Reportes de incidentes', icon: Flag },
  { id: 'security', label: 'Seguridad', icon: Shield },
  { id: 'profile', label: 'Mi perfil', icon: CircleUserRound },
  { id: 'club', label: 'Club Gacelas', icon: Users },
]
const clubNavigation = [
  { id: 'clubhome', label: 'Resumen del club', icon: Home },
  { id: 'moderate', label: 'Reportes pendientes', icon: ShieldAlert },
  { id: 'proposals', label: 'Rutas propuestas', icon: Route },
  { id: 'official', label: 'Rutas oficiales y horarios', icon: HistoryIcon },
  { id: 'adminspaces', label: 'Espacios recomendados', icon: MapPin },
  { id: 'risks', label: 'Zonas de riesgo', icon: Shield },
  { id: 'comments', label: 'Comentarios', icon: MessageSquare },
  { id: 'sponsors', label: 'Patrocinadores', icon: Sparkles },
  { id: 'banners', label: 'Banners', icon: Monitor },
  { id: 'stats', label: 'Estadísticas', icon: Activity },
  { id: 'moderationlog', label: 'Historial de moderación', icon: HistoryIcon },
  { id: 'clubinfo', label: 'Información del club', icon: Users },
]
const mapSteps: TourStep[] = [
  { id: 'map', target: 'map', title: 'Mapa de condiciones', text: 'Los tramos se colorean según sus condiciones. Toca uno para ver por qué.' },
  { id: 'legend', target: 'map-legend', title: 'Leyenda', text: 'Verde favorable, amarillo atención, rojo precaución. Es referencial, no garantiza tu seguridad.' },
  { id: 'time', target: 'time', title: 'Hora de consulta', text: 'Las condiciones cambian según la hora. Prueba otro horario.' },
]
const systemNavigation = [
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'cities', label: 'Ciudades y red vial', icon: Map },
  { id: 'parameters', label: 'Parámetros de seguridad', icon: Settings2 },
]

function Selector({ enter }: { enter: (e: Experience) => void }) {
  return <PublicHome enter={enter} />
}

function RunModal({ close, mobile }: { close: () => void; mobile: () => void }) {
  const [download, setDownload] = useState(false)
  return (
    <Modal
      title={download ? 'Tu próxima ruta, en Android.' : 'Lleva tu entrenamiento al móvil'}
      onClose={close}
    >
      {download ? (
        <>
          <div className="download-art">
            <QrCode />
            <span>QR VISUAL DE DEMOSTRACIÓN</span>
          </div>
          <p>
            La aplicación Android todavía no está publicada. No existe una descarga de APK ni un
            enlace de Google Play.
          </p>
          <Button className="full" disabled>
            APK próximamente
          </Button>
          <Button className="full" variant="ghost" onClick={() => setDownload(false)}>
            Volver
          </Button>
        </>
      ) : (
        <>
          <span className="handoff-icon">
            <Smartphone />
          </span>
          <p>
            Continúa en la vista móvil para simular tu recorrido. La grabación GPS real y la
            aplicación Android aún no están disponibles.
          </p>
          <div className="handoff-note">
            <Route />
            Conservaremos tu ruta seleccionada en el simulador.
          </div>
          <Button className="full" onClick={mobile}>
            Ver aplicación móvil <ArrowRight />
          </Button>
          <Button className="full" variant="secondary" onClick={() => setDownload(true)}>
            Descargar app Android
          </Button>
          <Button className="full" variant="ghost" onClick={close}>
            Cancelar
          </Button>
          <small>La grabación del prototipo es simulada. El ordenador no graba GPS.</small>
        </>
      )}
    </Modal>
  )
}

function WebApp({
  exit,
  toMobile,
  initialRoute,
  initialPage = 'explore',
}: {
  exit: () => void
  toMobile: (route?: RouteData, start?: boolean) => void
  initialRoute?: RouteData
  initialPage?: string
}) {
  const { state, user, isDemo, loading, update, openAccount } = useDemo(),
    all = useRoutes()
  const router = useRouter()
  const page = initialPage
  const role: Role =
    clubPages.includes(page) && user?.role !== 'corredor' && user
      ? 'club'
      : systemPages.includes(page) && user?.role === 'sistema'
        ? 'sistema'
        : user
          ? 'corredor'
          : 'visitante'
  const [selected, setSelected] = useState<RouteData | null>(initialRoute ?? null),
    [handoff, setHandoff] = useState<RouteData | null>(null),
    [notification, setNotification] = useState(false),
    [menu, setMenu] = useState(false)
  useEffect(() => {
    setSelected(initialRoute ?? null)
    setMenu(false)
  }, [initialRoute, initialPage])
  const tour = useTour(state.newAccount && page === 'explore')
  const closeTour = () => {
    tour.close()
    setMenu(false)
    update((s) => ({ ...s, newAccount: false }))
  }
  const openMenu = () => setMenu(true)
  const webSteps: TourStep[] = [
    ...mapSteps,
    { id: 'recommend', target: 'recommend', title: 'Recomendaciones', text: 'Dinos distancia y hora, y te sugerimos las mejores rutas.' },
    { id: 'report', target: 'nav-reports', title: 'Reportar', text: 'Avisa a la comunidad de un incidente. El club lo revisa antes de publicarlo.', prepare: openMenu },
    { id: 'security', target: 'nav-security', title: 'Seguridad', text: 'Tus contactos de confianza y el enlace temporal para compartir tu recorrido.', prepare: openMenu },
    { id: 'profile', target: 'nav-profile', title: 'Perfil', text: 'Tu nivel, tu privacidad y tus entrenamientos.', prepare: openMenu },
    { id: 'mobile', target: 'mobile-view', title: 'Entrenar en el móvil', text: 'Grabar tu recorrido y el botón SOS están en la vista móvil.', prepare: () => setMenu(false) },
  ]
  const nav =
    role === 'club'
      ? clubNavigation
      : role === 'sistema'
        ? systemNavigation
        : role === 'visitante'
          ? publicNavigation
          : runnerNavigation
  const resolved = selected ? (all.find((r) => r.id === selected.id) ?? selected) : null
  const go = (target: string) => {
    if (!user && privatePages.includes(target)) {
      openAccount()
      return
    }
    if (target === 'recommend') update((s) => ({ ...s, draft: { ...s.draft, mode: 'recommend' } }))
    setSelected(null)
    setMenu(false)
    router.push(paths[target] ?? '/explorar')
  }
  const open = (route: RouteData) => {
    if (!route) return
    if (route.slug && !route.private && route.status === 'Aprobado') {
      router.push(`/rutas/${encodeURIComponent(route.slug)}`)
      return
    }
    setSelected(route)
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }
  const activeNav = nav.find((n) => n.id === page)
  const adminPage = clubPages.includes(page) || systemPages.includes(page)
  const protectedRunner =
    (!user && privatePages.includes(page)) ||
    (adminPage &&
      (!user ||
        user.role === 'corredor' ||
        (systemPages.includes(page) && user.role !== 'sistema')))
  return (
    <div className={`web-app ${role === 'club' || role === 'sistema' ? 'admin-app' : ''}`}>
      <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Logo />
          <span>RUNNING, INFORMADO.</span>
        </div>
        <button className="experience-switch" onClick={exit}>
          <ArrowLeft />
          Inicio RUNCTY <ChevronRight />
        </button>
        <span className="nav-section-label">
          {role === 'club'
            ? 'GESTIÓN DEL CLUB'
            : role === 'sistema'
              ? 'ADMINISTRACIÓN'
              : 'DESCUBRE TU CIUDAD'}
        </span>
        <nav>
          {nav.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              data-tour={`nav-${id}`}
              href={paths[id] ?? '/explorar'}
              aria-current={!selected && page === id ? 'page' : undefined}
              className={!selected && page === id ? 'active' : ''}
              onClick={() => {
                setMenu(false)
                setSelected(null)
              }}
            >
              <Icon />
              <span>{label}</span>
              {id === 'moderate' && state.incidents.some((i) => i.status === 'Pendiente') && (
                <b>{state.incidents.filter((i) => i.status === 'Pendiente').length}</b>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {role === 'visitante' ? (
            <div className="guest-invite">
              <span>Tu próximo paso.</span>
              <p>Guarda tus rutas y continúa desde cualquier dispositivo.</p>
              <Button onClick={openAccount}>
                Entrar como Carlos <ArrowRight />
              </Button>
            </div>
          ) : (
            <div className="sidebar-safety">
              <Shield />
              <strong>Corre con información.</strong>
              <p>Las condiciones son referenciales, no una garantía.</p>
            </div>
          )}
          <button className="sidebar-account" onClick={openAccount}>
            <span className="avatar">
              {role === 'visitante'
                ? 'V'
                : role === 'club'
                  ? 'G'
                  : role === 'sistema'
                    ? 'A'
                    : user?.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>
                {role === 'visitante'
                  ? 'Visitante'
                  : role === 'club'
                    ? 'Club Gacelas'
                    : role === 'sistema'
                      ? 'Admin. del sistema'
                      : (user?.name ?? 'Corredor')}
              </strong>
              <span>
                {isDemo
                  ? 'Demo local · esta pestaña'
                  : user
                    ? 'Demo en esta pestaña'
                    : 'Exploración pública'}
              </span>
            </div>
            <ChevronRight />
          </button>
        </div>
      </aside>
      {menu && (
        <button
          aria-label="Cerrar menú lateral"
          className="mobile-menu-scrim"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="web-main">
        <header className="topbar">
          <IconButton label="Abrir menú" className="md:hidden" onClick={() => setMenu(!menu)}>
            <Menu />
          </IconButton>
          <div className="topbar-breadcrumb">
            <span>RUNCTY</span>
            <ChevronRight />
            {selected ? 'Detalle de ruta' : (activeNav?.label ?? 'Planificar ruta')}
          </div>
          <div className="topbar-actions">
            <button className="catalog-search-shortcut" onClick={() => go('routes')}>
              <Search />
              <span>Busca tu próxima ruta</span>
            </button>
            <button
              className="mobile-preview-shortcut"
              data-tour="mobile-view"
              aria-label="Vista móvil"
              onClick={() => toMobile(resolved ?? undefined)}
            >
              <Smartphone />
              <span>Vista móvil</span>
            </button>
            <IconButton label="Notificaciones" onClick={() => setNotification(true)}>
              <Bell />
            </IconButton>
            {isDemo && user?.role === 'corredor' && state.users.some((u) => u.id === user.id && isAdminUser(u)) && (
              <Link className="role-switch" href="/demo/administracion" aria-label="Cambiar a modo administrador">
                <Shield /><span>Modo administrador</span>
              </Link>
            )}
            {user && user.role !== 'corredor' && (
              <nav
                aria-label="Espacios de tu cuenta"
                className="flex items-center gap-3 text-xs font-semibold text-violet-700"
              >
                {isDemo ? (
                  <Link href="/demo/administracion">Panel</Link>
                ) : (
                  <>
                    <Link href="/explorar">Correr</Link>
                    <Link href="/gestion/clubhome">Club</Link>
                    {user.role === 'sistema' && <Link href="/gestion/users">Sistema</Link>}
                  </>
                )}
              </nav>
            )}
            <Button variant="secondary" onClick={openAccount}>
              {isDemo ? `${user?.name} · demo` : (user?.name ?? 'Ver demo')}
            </Button>
          </div>
        </header>
        <main className="web-content">
          {protectedRunner ? (
            <div className="account-disabled">
              <ShieldAlert />
              <h1>
                {loading
                  ? 'Cargando tu cuenta…'
                  : adminPage
                    ? 'Gestión reservada.'
                    : 'Tu espacio personal.'}
              </h1>
              <p>
                {adminPage
                  ? 'Esta sección requiere un rol de gestión asignado desde Payload. No se conceden permisos desde la interfaz.'
                  : 'Inicia sesión para consultar tus datos privados y continuar desde cualquier dispositivo.'}
              </p>
              <Button disabled={loading} onClick={openAccount}>
                Entrar como Carlos
              </Button>
            </div>
          ) : resolved ? (
            <RouteDetail
              route={resolved}
              back={() => (initialRoute ? router.push('/rutas') : setSelected(null))}
              run={setHandoff}
            />
          ) : role === 'club' ? (
            <ClubAdmin page={page} go={go} />
          ) : role === 'sistema' ? (
            <SystemAdmin page={page} />
          ) : (
            <MainScreen page={page} open={open} go={go} run={setHandoff} />
          )}
        </main>
        <footer className="web-footer">
          <span>RUNCTY · LOJA, ECUADOR</span>
          <p>
            {isDemo
              ? 'Demo local · no guarda en el servidor'
              : 'Información referencial · Entrenamiento y SOS simulados'}
          </p>
          <button onClick={exit}>
            Cambiar experiencia <ArrowRight />
          </button>
        </footer>
      </div>
      {handoff && (
        <RunModal
          close={() => setHandoff(null)}
          mobile={() => {
            toMobile(handoff, true)
            setHandoff(null)
          }}
        />
      )}
      {notification && <NewsCenter close={() => setNotification(false)} go={go} />}
      {tour.open && <Tour label="Tutorial de RUNCTY" steps={webSteps} onClose={closeTour} />}
    </div>
  )
}

// Alto del dispositivo (852 de pantalla + bisel) y espacio de la barra de presentación.
const PHONE_HEIGHT = 866
const PHONE_CHROME = 84
const mobileTabs = ['explore', 'myroutes', 'reports', 'profile']
const mobileTitles: Record<string, string> = {
  club: 'CLUB GACELAS',
  history: 'MIS ENTRENAMIENTOS',
  map: 'MAPA DE SEGURIDAD',
  planner: 'PLANIFICAR RUTA',
  recommend: 'RECOMENDAR RUTAS',
  report: 'REPORTAR INCIDENTE',
  routes: 'RUTAS',
  security: 'SEGURIDAD',
  spaces: 'ESPACIOS',
}

function MobileApp({
  exit,
  toWeb,
  startPage = 'explore',
  initialRoute,
}: {
  exit: () => void
  toWeb: () => void
  startPage?: string
  initialRoute?: RouteData
}) {
  const { state, user, isDemo, update, notify, openAccount, startDemo } = useDemo(),
    all = useRoutes()
  const [entry, setEntry] = useState<'welcome' | 'login' | 'register'>('welcome')
  const [page, setPage] = useState(startPage),
    [selected, setSelected] = useState<RouteData | null>(
      startPage === 'explore' ? (initialRoute ?? null) : null,
    ),
    [trail, setTrail] = useState<string[]>([]),
    [notification, setNotification] = useState(false)
  const account = state.users.find((value) => value.id === user?.id)
  // Las cuentas solo de administración no tienen experiencia de corredor.
  const adminOnly = isDemo && !!account && account.role !== 'corredor'
  useEffect(() => {
    if (isDemo && user && user.role !== 'corredor' && !adminOnly) startDemo('corredor')
  }, [adminOnly, isDemo, user?.role, startDemo])
  const active = state.session.phase === 'running' || state.session.phase === 'paused'
  const recording = page === 'train' && (active || state.session.phase === 'survey')
  const resolved = selected ? (all.find((r) => r.id === selected.id) ?? selected) : null
  const scrollTop = () => document.querySelector('.mobile-scroll')?.scrollTo({ top: 0 })
  const stage = useRef<HTMLDivElement>(null)
  const tour = useTour(state.newAccount && page === 'explore' && !selected)
  const beforeTour = useRef({ page, trail, selected, session: state.session, mode: state.draft.mode })
  useEffect(() => {
    if (tour.open) beforeTour.current = { page, trail, selected, session: state.session, mode: state.draft.mode }
  }, [tour.open])
  // Enseña la pantalla real de cada paso sin guardar nada: al cerrar, todo vuelve como estaba.
  const tourPage = (target: string, phase?: 'ready' | 'paused') => {
    setPage(target)
    setSelected(null)
    scrollTop()
    if (!isDemo) return
    update((s) => {
      const session = beforeTour.current.session
      const route = session.route.id ? session.route : s.catalog[0]
      return {
        ...s,
        draft: { ...s.draft, mode: target === 'recommend' ? 'recommend' : beforeTour.current.mode },
        session: phase && route ? { phase, route, seconds: 0, km: 0, count: 3, time: s.time, date: s.date } : session,
      }
    })
  }
  const closeTour = () => {
    const { page, trail, selected, session, mode } = beforeTour.current
    tour.close()
    setPage(page)
    setTrail(trail)
    setSelected(selected)
    if (isDemo) update((s) => ({ ...s, newAccount: false, session, draft: { ...s.draft, mode } }))
  }
  const tourSteps: TourStep[] = [
    ...mapSteps.map((step) => ({ ...step, prepare: () => tourPage('explore') })),
    { id: 'recommend', target: 'recommend', title: 'Recomendaciones', text: 'Dinos distancia y hora, y te sugerimos las mejores rutas.', prepare: () => tourPage('recommend') },
    { id: 'start', target: 'start-training', title: 'Iniciar entrenamiento', text: 'Graba tu recorrido paso a paso. En este prototipo el GPS se simula.', prepare: () => tourPage('train', 'ready') },
    { id: 'share', target: 'share-live', title: 'Compartir en vivo', text: 'Prepara un enlace temporal para tus contactos de confianza. En esta demo es simulado.', prepare: () => tourPage('train', 'paused') },
    { id: 'sos', target: 'sos', title: 'Botón SOS', text: 'Mantén presionado 3 segundos para alertar a tus contactos. En esta demo no se envía nada.', prepare: () => tourPage('train', 'paused') },
    { id: 'report', target: 'report', title: 'Reportar', text: 'Avisa a la comunidad de un incidente. El club lo revisa antes de publicarlo.', prepare: () => tourPage('reports') },
    { id: 'profile', target: 'nav-profile', title: 'Perfil', text: 'Tu nivel, tu privacidad y tus contactos de confianza.', prepare: () => tourPage('profile') },
  ]
  // Escala el dispositivo completo: la pantalla interna conserva su tamaño lógico y no se deforma.
  useEffect(() => {
    const fit = () => {
      const zoom = (window.innerHeight - PHONE_CHROME) / PHONE_HEIGHT
      stage.current?.style.setProperty('--phone-zoom', String(Math.min(1, Math.max(0.6, zoom))))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  const go = (target: string) => {
    if (
      !user &&
      ['train', 'myroutes', 'profile', 'security', 'history', 'report'].includes(target)
    ) {
      openAccount()
      return
    }
    if (target === 'recommend') update((s) => ({ ...s, draft: { ...s.draft, mode: 'recommend' } }))
    setTrail((pages) => (mobileTabs.includes(target) || target === 'train' ? [] : [...pages, page]))
    setPage(target)
    setSelected(null)
    scrollTop()
  }
  // Vuelve a la pantalla de origen; antes cualquier flecha terminaba siempre en Explorar.
  const goBack = () => {
    if (selected) setSelected(null)
    else {
      setPage(trail.at(-1) ?? 'explore')
      setTrail((pages) => pages.slice(0, -1))
    }
    scrollTop()
  }
  const run = (route: RouteData) => {
    if (!user) {
      openAccount()
      return
    }
    if (!route?.geometry.length || route.km <= 0) {
      notify('Elige o crea una ruta antes de entrenar.')
      return
    }
    update((s) => ({
      ...s,
      session: { phase: 'ready', route, seconds: 0, km: 0, count: 3, time: s.time, date: s.date },
    }))
    setSelected(null)
    setTrail([])
    setPage('train')
    scrollTop()
  }
  const leave = (fn: () => void) => {
    if (state.session.phase === 'running') {
      update((s) => ({ ...s, session: { ...s.session, phase: 'paused' } }))
      notify('Entrenamiento pausado al cambiar de experiencia.')
    }
    fn()
  }
  const nav = [
    { id: 'explore', label: 'Explorar', icon: Home },
    { id: 'myroutes', label: 'Mis rutas', icon: Route },
    { id: 'train', label: 'Entrenar', icon: RunnerIcon },
    { id: 'reports', label: 'Reportes', icon: ShieldAlert },
    { id: 'profile', label: 'Perfil', icon: CircleUserRound },
  ]
  return (
    <div className="mobile-stage" ref={stage}>
      <nav aria-label="Presentación del prototipo" className="mobile-presentation-nav">
        <button onClick={() => leave(exit)}><ArrowLeft className="size-4" /> Inicio</button>
        <span>ANDROID · 393 × 852</span>
        <button onClick={() => leave(toWeb)}>Vista web <Monitor className="size-4" /></button>
      </nav>
      <div className="phone-container">
        <div className={`phone-frame ${recording ? 'phone-recording' : ''} ${user ? '' : 'phone-auth'}`}>
          <div className="android-status">
            <span>9:41</span>
            <div className="camera-dot" />
            <span>
              5G <i className="status-signal" />
              <i className="status-battery" />
            </span>
          </div>
          <div className="mobile-scroll">
            {!!user && !adminOnly && !recording && page !== 'train' && (
              <header className="mobile-app-header">
                {!resolved && mobileTabs.includes(page) ? (
                  <Logo />
                ) : (
                  <IconButton label="Volver" onClick={goBack}>
                    <ArrowLeft />
                  </IconButton>
                )}
                <span>
                  {resolved
                    ? 'DETALLE DE RUTA'
                    : (mobileTitles[page] ?? (isDemo ? 'DEMO LOCAL' : ''))}
                </span>
                <div>
                  <IconButton label="Novedades" onClick={() => setNotification(true)}>
                    <Bell />
                  </IconButton>
                </div>
              </header>
            )}
            {!user ? (
              entry === 'welcome' ? <MobileWelcome login={() => setEntry('login')} register={() => setEntry('register')} /> :
                <DemoAccess mobile createInitially={entry === 'register'} back={() => setEntry('welcome')} proceed={(accountId, _mode, name) => startDemo('corredor', accountId, name)} />
            ) : adminOnly ? (
              <div className="mobile-padded">
                <EmptyState
                  title="Esta cuenta es de administración"
                  description="La app móvil es para corredores. Gestiona el club desde el panel web."
                >
                  <Button onClick={toWeb}>Ir a la web</Button>
                </EmptyState>
              </div>
            ) : page === 'train' ? (
              <Training
                back={() => go('explore')}
                history={() => go('history')}
                report={() => go('report')}
              />
            ) : resolved ? (
              <RouteDetail route={resolved} mobile back={goBack} run={run} />
            ) : (
              <MainScreen
                page={page}
                mobile
                open={(r) => {
                  setSelected(r)
                  scrollTop()
                }}
                go={go}
                run={run}
                tutorial={tour.start}
              />
            )}
          </div>
          {!!user && !adminOnly && !recording && (
            <nav className="mobile-nav">
              {nav.map(({ id, label, icon: I }) => (
                <button
                  key={id}
                  data-tour={`nav-${id}`}
                  aria-current={page === id ? 'page' : undefined}
                  className={
                    page === id ||
                    (id === 'explore' &&
                      ['map', 'planner', 'routes', 'spaces', 'club', 'recommend'].includes(page)) ||
                    (id === 'profile' && ['history', 'security'].includes(page)) ||
                    (id === 'reports' && page === 'report')
                      ? 'active'
                      : ''
                  }
                  onClick={() => go(id)}
                >
                  <I />
                  {label}
                  {id === 'train' && active && <i />}
                </button>
              ))}
            </nav>
          )}
          <div className="android-gesture" />
          {notification && <NewsCenter close={() => setNotification(false)} go={go} />}
        </div>
      </div>
      {tour.open && (
        <Tour label="Tutorial de RUNCTY" steps={tourSteps} bounds=".phone-frame" onClose={closeTour} />
      )}
    </div>
  )
}

function Product({
  initialExperience,
  initialRoute,
  initialPage,
}: {
  initialExperience: Experience
  initialRoute?: RouteData
  initialPage: string
}) {
  const { state, user, update, openAccount } = useDemo()
  const router = useRouter()
  const enter = (experience: Experience) =>
    router.push(experience === 'selector' ? '/' : experience === 'web' ? '/explorar' : '/movil')
  const toMobile = (route?: RouteData, start = false) => {
    if (start && !user) {
      openAccount()
      return
    }
    if (route)
      update((s) => ({
        ...s,
        session: { phase: 'ready', route, seconds: 0, km: 0, count: 3, time: s.time, date: s.date },
      }))
    router.push(start ? '/movil/entrenar' : '/movil')
  }
  if (initialExperience === 'selector') return <Selector enter={enter} />
  if (initialExperience === 'mobile')
    return (
      <MobileApp
        key={initialPage}
        initialRoute={initialRoute}
        startPage={initialPage}
        exit={() => enter('selector')}
        toWeb={() => enter('web')}
      />
    )
  return (
    <WebApp
      initialPage={initialPage}
      initialRoute={initialRoute}
      exit={() => enter('selector')}
      toMobile={toMobile}
    />
  )
}
export default function App({
  initialExperience = 'web',
  initialPage = 'explore',
  initialRoute,
  initialSession,
}: {
  initialExperience?: Experience
  initialPage?: string
  initialRoute?: RouteData
  initialSession?: RunctySession
}) {
  const { hydrateSession } = useDemo()
  useEffect(() => {
    if (initialSession) hydrateSession(initialSession.data, initialSession.user)
  }, [initialSession, hydrateSession])
  return (
    <Product
      initialExperience={initialExperience}
      initialPage={initialPage}
      initialRoute={initialRoute}
    />
  )
}
