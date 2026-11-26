'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import gacelasLogo from '../../../../../imagenes/gacelas_logo.webp'
import { useRouter } from 'next/navigation'
import { Activity, ChevronDown, ChevronRight, CircleUserRound, Clock3, GraduationCap, Home, LogOut, Map, MapPin, Megaphone, MessageSquare, Route, Shield, ShieldAlert, Smartphone, Handshake, Users } from 'lucide-react'
import { ClubAdmin, SystemAdmin } from './Admin'
import { Button, Logo, RunnerIcon } from './components'
import { isAdminUser } from './data'
import { useDemo } from './store'
import { Tour } from './Tour'
import { DEMO_ROUTES } from './demo-seed'
import { DemoAccess } from './Onboarding'
import { SHOW_FUTURE } from './features'

const allGroups = [
  { name: 'Operaciones', items: [
    { id: 'clubhome', label: 'Resumen', icon: Home }, { id: 'official', label: 'Rutas y horarios', icon: Route },
    { id: 'proposals', label: 'Propuestas comunitarias', icon: MapPin }, { id: 'moderate', label: 'Incidentes', icon: ShieldAlert },
    { id: 'adminspaces', label: 'Espacios recomendados', icon: Map }, { id: 'risks', label: 'Zonas de riesgo', icon: Shield },
  ]},
  { name: 'Comunidad y publicidad', items: [
    { id: 'stats', label: 'Estadísticas', icon: Activity }, { id: 'comments', label: 'Comentarios', icon: MessageSquare },
    { id: 'sponsors', label: 'Patrocinadores', icon: Handshake }, { id: 'banners', label: 'Publicidad', icon: Megaphone },
    { id: 'moderationlog', label: 'Historial de revisiones', icon: Clock3 }, { id: 'clubinfo', label: 'Información del club', icon: Users },
  ]},
  { name: 'Sistema', items: [
    { id: 'users', label: 'Usuarios y roles', icon: Users }, { id: 'cities', label: 'Ciudades y red vial', icon: Map }, { id: 'parameters', label: 'Condiciones de seguridad', icon: Shield },
  ]},
]
// Propuestas, estadísticas, información del club y parámetros no se entregan en esta versión.
const futureModules = ['proposals', 'stats', 'clubinfo', 'parameters']
const groups = allGroups.map(group => ({
  ...group,
  items: group.items.filter(item => SHOW_FUTURE || !futureModules.includes(item.id)),
}))
const systemPages = new Set(['users', 'cities', 'parameters'])
const clubSteps = [
  { id: 'pending', target: ['admin-proposals', 'admin-moderate'], title: 'Pendientes de moderación', text: 'Reportes y rutas de la comunidad esperan tu revisión. Solo lo aprobado se publica.' },
  { id: 'official', target: 'admin-official', title: 'Rutas oficiales y horarios', text: 'Da el distintivo Oficial Gacelas y define a qué hora conviene correr cada ruta.' },
  { id: 'spaces', target: 'admin-adminspaces', title: 'Espacios recomendados', text: 'Registra parques, estadios y senderos con sus horarios recomendados.' },
  { id: 'risks', target: 'admin-risks', title: 'Zonas de riesgo', text: 'Registra cada zona con su fuente y vigencia. Influye en el índice mientras esté vigente.' },
  { id: 'sponsors', target: ['admin-sponsors', 'admin-banners'], title: 'Patrocinadores y banners', text: 'Gestiona a los patrocinadores y publica sus banners con fechas de vigencia.' },
]
const systemSteps = [
  { id: 'users', target: 'admin-users', title: 'Usuarios y roles', text: 'Busca cuentas, desactívalas o reactívalas y da o quita el rol de administrador.' },
  { id: 'cities', target: 'admin-cities', title: 'Ciudades y red vial', text: 'Habilita una ciudad cuando tenga su red de calles cargada.' },
  { id: 'parameters', target: 'admin-parameters', title: 'Pesos del índice', text: 'Consulta la fórmula y las franjas de precaución.' },
]
export default function DemoAdmin() {
  const { state, user, isDemo, loading, startDemo, logout, update, openAccount, openDemoAccess } = useDemo()
  const router = useRouter()
  const account = state.users.find(value => value.id === user?.id)
  const blocked = isDemo && !!user && (!account || !account.active || !isAdminUser(account))
  const [page, setPage] = useState('clubhome')
  const [menu, setMenu] = useState(false)
  const seeded = useRef(false)
  const panel = isDemo && !!account && account.active && isAdminUser(account)
  // El sistema ve también los módulos del club; el club nunca ve los del sistema.
  const isSystem = account?.role === 'sistema'
  const visibleGroups = isSystem
    ? [...groups.filter(group => group.name === 'Sistema'), ...groups.filter(group => group.name !== 'Sistema')]
    : groups.filter(group => group.name !== 'Sistema')
  const [tour, setTour] = useState(false)
  const tourScope = systemPages.has(page) ? systemSteps : clubSteps
  // Bajo 64rem el menú va plegado: se abre para poder señalar sus módulos.
  const tourSteps = tourScope.map(step => ({ ...step, prepare: () => setMenu(true) }))
  // Al cambiar a una cuenta del club, los módulos de sistema dejan de estar disponibles.
  useEffect(() => {
    if (!isSystem && systemPages.has(page)) setPage('clubhome')
  }, [isSystem, page])
  useEffect(() => {
    if (isSystem) setPage('users')
  }, [isSystem])
  useEffect(() => {
    if (seeded.current || !panel) return
    seeded.current = true
    update(current => {
      const sample = current.catalog[0] ?? DEMO_ROUTES[0]
      return { ...current,
        customRoutes: current.customRoutes.some(r => r.id === 'demo-admin-proposal') ? current.customRoutes : [...current.customRoutes, {
          ...sample, id: 'demo-admin-proposal', slug: undefined, name: 'Circuito comunitario Jipiro',
          desc: 'Circuito propuesto por la comunidad alrededor de Jipiro.',
          official: false, verified: false, owned: false, private: true, owner: 'Andrea Jaramillo', status: 'Pendiente', date: current.date,
        }],
        incidents: current.incidents.some(i => i.id === 'demo-admin-incident') ? current.incidents : [...current.incidents, {
          id: 'demo-admin-incident', type: 'Falta de iluminación', location: 'Sendero Jipiro', coordinate: sample.geometry[1] ?? [-3.9736, -79.2027],
          date: current.date, time: '19:00', description: 'Tramo sin luz entre el puente y el ingreso norte del parque.',
          status: 'Pendiente', owner: 'Luis Ordóñez', owned: false, createdAt: Date.now(),
        }],
      }
    })
  }, [panel, update])
  const go = (target: string) => {
    if (!panel || !visibleGroups.some(group => group.items.some(item => item.id === target))) return
    setPage(target)
    setMenu(false)
    window.scrollTo({ top: 0 })
  }
  const pageLabel = groups.flatMap(g => g.items).find(i => i.id === page)?.label
  // Grupos del menú plegables; el grupo de la sección actual siempre queda abierto.
  const [closed, setClosed] = useState<string[]>([])
  const toggleGroup = (name: string) =>
    setClosed(current => current.includes(name) ? current.filter(value => value !== name) : [...current, name])
  const roleLabel = isSystem ? 'Administrador del sistema' : 'Administrador del club'
  const pendingReports = state.incidents.filter(i => i.status === 'Pendiente').length
  const signOut = async () => { if (await logout()) router.push('/') }
  if (panel)
    return <div className="admin-shell min-h-screen bg-ink text-copy">
      <div className="admin-shell-grid mx-auto grid max-w-[1600px] lg:grid-cols-[268px_minmax(0,1fr)]">
        <aside className={`demo-admin-menu admin-sidebar ${menu ? 'menu-open' : ''} px-4 py-6`}>
          <button type="button" className="demo-admin-toggle lg:hidden" aria-expanded={menu} onClick={() => setMenu(!menu)}><span>Módulos de gestión<strong>{pageLabel}</strong></span><ChevronDown /></button>
          <Link href="/" className="admin-sidebar-brand" aria-label="RUNCTY, inicio"><Logo /></Link>
          <div className="demo-admin-profile club-card">{isSystem ? <Shield className="system-panel-mark" aria-hidden="true" /> : <Image src={gacelasLogo} alt="Logo de Gacelas Running Team" width={44} height={44} />}<div><strong>{isSystem ? 'RUNCTY' : 'Gacelas Running Team'}</strong><span>{isSystem ? 'Administración del sistema' : 'Gestión del club'}</span></div></div>
          <nav aria-label="Módulos administrativos" className="admin-sidebar-nav">
            {visibleGroups.map(group => {
              const current = group.items.some(item => item.id === page)
              const open = current || !closed.includes(group.name)
              return <div key={group.name} className="admin-nav-group">
                <button type="button" className="admin-nav-group-toggle" aria-expanded={open} disabled={current} onClick={() => toggleGroup(group.name)}>
                  <span>{group.name}</span><ChevronDown aria-hidden="true" />
                </button>
                {open && <div className="admin-nav-items">{group.items.map(({ id, label, icon: Icon }) => <button key={id} type="button" data-tour={`admin-${id}`} onClick={() => go(id)} aria-current={page === id ? 'page' : undefined} className={`admin-nav-item ${page === id ? 'is-active' : ''}`}>
                  <Icon aria-hidden="true" /><span>{label}</span>
                  {id === 'proposals' && state.customRoutes.some(r => r.status === 'Pendiente') && <b>{state.customRoutes.filter(r => r.status === 'Pendiente').length}</b>}
                  {id === 'moderate' && pendingReports > 0 && <b>{pendingReports}</b>}
                </button>)}</div>}
              </div>
            })}
          </nav>
          <div className="admin-sidebar-foot">
            <Link href="/"><Home aria-hidden="true" />Inicio RUNCTY</Link>
            {!isSystem && <Link href="/movil"><Smartphone aria-hidden="true" />Aplicación móvil</Link>}
          </div>
        </aside>
        <div className="admin-main min-w-0">
          <header className="admin-topbar">
            <Link href="/" className="admin-topbar-logo lg:hidden" aria-label="RUNCTY, inicio"><Logo /></Link>
            <div className="admin-topbar-title">
              <span>{isSystem ? 'RUNCTY' : 'Club Deportivo Gacelas Running Team'}</span>
              <strong>{isSystem ? 'Administración del sistema' : 'Gestión del club'}</strong>
            </div>
            <div className="admin-topbar-actions">
              <span className="prototype-pill">Prototipo interactivo</span>
              {!isSystem && <button type="button" className="role-switch" onClick={() => { startDemo('corredor'); router.push('/explorar') }}><RunnerIcon /><span>Aplicación del corredor</span></button>}
              {SHOW_FUTURE && <button type="button" className="role-switch" onClick={() => setTour(true)}><GraduationCap /><span>Ver tutorial</span></button>}
              <button type="button" className="admin-user-chip" onClick={openAccount} aria-label="Tu cuenta y cambiar de cuenta">
                <span className="admin-user-avatar" aria-hidden="true">{account?.name.charAt(0).toUpperCase()}</span>
                <span className="admin-user-text"><strong>{account?.name.replace(' · ejemplo', '')}</strong><small>{roleLabel}</small></span>
              </button>
              <button type="button" className="admin-signout" onClick={signOut}><LogOut aria-hidden="true" />Salir</button>
            </div>
          </header>
          <main className="admin-main-content min-w-0 px-5 py-7 sm:px-7 lg:px-9">{systemPages.has(page) && isSystem ? <SystemAdmin page={page} /> : <ClubAdmin page={page} go={go} />}</main>
        </div>
      </div>
      {tour && <Tour label="Tutorial del panel" steps={tourSteps} onClose={() => { setTour(false); setMenu(false) }} />}
    </div>
  return <div className="min-h-screen bg-ink text-copy">
        <header className="admin-shell-header mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 lg:px-8"><Link href="/" aria-label="RUNCTY, inicio"><Logo /></Link><nav className="flex flex-wrap items-center gap-5 text-sm"><span className="prototype-pill">Prototipo interactivo</span>{panel && !isSystem && <button type="button" className="role-switch" onClick={() => { startDemo('corredor'); router.push('/explorar') }}><RunnerIcon /><span>Aplicación del corredor</span></button>}{SHOW_FUTURE && panel && <button type="button" className="inline-flex min-h-11 items-center gap-2" onClick={() => setTour(true)}><GraduationCap className="size-4" />Ver tutorial</button>}<Link className="inline-flex min-h-11 items-center gap-2" href="/"><Home className="size-4" />Inicio</Link>{panel && !isSystem && <Link className="inline-flex min-h-11 items-center gap-2" href="/movil"><Smartphone className="size-4" />Aplicación móvil</Link>}{account && <button type="button" className="admin-account" onClick={openAccount} aria-label="Tu cuenta y cambiar de cuenta"><CircleUserRound className="size-4" /><span>{account.name.replace(' · ejemplo', '')}</span></button>}{account && <button type="button" className="exit-button" onClick={async () => { if (await logout()) router.push('/') }}><LogOut />Salir</button>}</nav></header>
    {blocked ? <main className="mx-auto max-w-xl px-5 py-16"><h1 className="text-3xl font-bold">Tu cuenta no tiene rol de administrador.</h1><p className="my-5 text-sm leading-7 text-muted">Los permisos administrativos los asigna un usuario autorizado. Tu cuenta conserva el acceso de corredor.</p><Button onClick={() => { startDemo('corredor'); router.push('/explorar') }}>Ir a modo corredor</Button></main> : user && !isDemo ? <main className="mx-auto max-w-xl px-5 py-16"><h1 className="text-3xl font-bold">Prueba la gestión de RUNCTY.</h1><p className="my-5 text-sm leading-7 text-muted">Tienes una cuenta iniciada. Puedes cerrar esa sesión voluntariamente para abrir la demostración con datos ficticios.</p><Button onClick={openDemoAccess}>Ver acceso demostrativo</Button></main> : !panel ? <main className="admin-access-gate"><h1>Acceso demostrativo</h1><p>Elige una cuenta de muestra para revisar sus permisos. Este acceso no forma parte del registro normal.</p>{loading ? <p role="status">Cargando cuentas…</p> : <DemoAccess demonstration proceed={(accountId, mode, name, email, password, access) => {
      startDemo(mode === 'admin' ? 'club' : 'corredor', accountId, name, email, password, access)
      if (mode !== 'admin') router.push('/explorar')
    }} />}</main> :
    null}
  </div>
}
