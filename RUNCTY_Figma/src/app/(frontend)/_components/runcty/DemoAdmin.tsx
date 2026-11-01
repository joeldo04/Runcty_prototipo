'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, ChevronDown, ChevronRight, Clock3, GraduationCap, Home, Map, MapPin, Megaphone, MessageSquare, Route, Shield, ShieldAlert, Smartphone, Sparkles, Users } from 'lucide-react'
import { ClubAdmin, SystemAdmin } from './Admin'
import { Button, Logo, RunnerIcon } from './components'
import { isAdminUser } from './data'
import { useDemo } from './store'
import { Tour } from './Tour'
import { DEMO_ROUTES, DEMO_USERS } from './demo-seed'

const groups = [
  { name: 'Operaciones', items: [
    { id: 'clubhome', label: 'Resumen', icon: Home }, { id: 'official', label: 'Rutas y horarios', icon: Route },
    { id: 'proposals', label: 'Propuestas comunitarias', icon: MapPin }, { id: 'moderate', label: 'Incidentes', icon: ShieldAlert },
    { id: 'adminspaces', label: 'Espacios recomendados', icon: Map }, { id: 'risks', label: 'Zonas de riesgo', icon: Shield },
  ]},
  { name: 'Comunidad y publicidad', items: [
    { id: 'stats', label: 'Estadísticas', icon: Activity }, { id: 'comments', label: 'Comentarios', icon: MessageSquare },
    { id: 'sponsors', label: 'Patrocinadores', icon: Sparkles }, { id: 'banners', label: 'Publicidad', icon: Megaphone },
    { id: 'moderationlog', label: 'Historial de revisiones', icon: Clock3 }, { id: 'clubinfo', label: 'Información del club', icon: Users },
  ]},
  { name: 'Sistema', items: [
    { id: 'users', label: 'Usuarios y roles', icon: Users }, { id: 'cities', label: 'Ciudades y red vial', icon: Map }, { id: 'parameters', label: 'Condiciones de seguridad', icon: Shield },
  ]},
]
const systemPages = new Set(['users', 'cities', 'parameters'])
const clubSteps = [
  { id: 'pending', target: ['admin-proposals', 'admin-moderate'], title: 'Pendientes de moderación', text: 'Reportes y rutas de la comunidad esperan tu revisión. Solo lo aprobado se publica.' },
  { id: 'official', target: 'admin-official', title: 'Rutas oficiales y horarios', text: 'Da el distintivo Oficial Gacelas y define a qué hora conviene correr cada ruta.' },
  { id: 'spaces', target: 'admin-adminspaces', title: 'Espacios recomendados', text: 'Registra parques, estadios y senderos con sus horarios recomendados.' },
  { id: 'risks', target: 'admin-risks', title: 'Zonas de riesgo', text: 'Registra cada zona con su fuente y vigencia. Influye en el índice mientras esté vigente.' },
  { id: 'sponsors', target: ['admin-sponsors', 'admin-banners'], title: 'Patrocinadores y banners', text: 'Gestiona a los aliados del club y publica sus banners con fechas de vigencia.' },
]
const systemSteps = [
  { id: 'users', target: 'admin-users', title: 'Usuarios y roles', text: 'Busca cuentas, desactívalas o reactívalas y da o quita el rol de administrador.' },
  { id: 'cities', target: 'admin-cities', title: 'Ciudades y red vial', text: 'Habilita una ciudad cuando tenga su red de calles cargada.' },
  { id: 'parameters', target: 'admin-parameters', title: 'Pesos del índice', text: 'Consulta la fórmula y las franjas de precaución. En esta demo no se editan.' },
]
export default function DemoAdmin() {
  const { state, user, isDemo, loading, startDemo, logout, update } = useDemo()
  const router = useRouter()
  const account = state.users.find(value => value.id === user?.id)
  const blocked = isDemo && !!account && !isAdminUser(account)
  const [page, setPage] = useState('clubhome')
  const [menu, setMenu] = useState(false)
  const started = useRef(false), seeded = useRef(false)
  const panel = isDemo && !blocked
  // El sistema ve también los módulos del club; el club nunca ve los del sistema.
  const isSystem = account?.role === 'sistema'
  const visibleGroups = isSystem ? groups : groups.filter(group => group.name !== 'Sistema')
  const [tour, setTour] = useState(false)
  const tourScope = systemPages.has(page) ? systemSteps : clubSteps
  // Bajo 64rem el menú va plegado: se abre para poder señalar sus módulos.
  const tourSteps = tourScope.map(step => ({ ...step, prepare: () => setMenu(true) }))
  useEffect(() => {
    if (started.current || loading || (user && !isDemo) || blocked) return
    started.current = true
    const admins = (state.users.length ? state.users : DEMO_USERS).filter(value => value.active && isAdminUser(value))
    startDemo('club', user ? undefined : admins[0]?.id)
  }, [blocked, isDemo, loading, startDemo, state.users, user])
  useEffect(() => {
    if (seeded.current || !isDemo || user?.role === 'corredor') return
    seeded.current = true
    update(current => {
      const sample = current.catalog[0] ?? DEMO_ROUTES[0]
      return { ...current,
        customRoutes: current.customRoutes.some(r => r.id === 'demo-admin-proposal') ? current.customRoutes : [...current.customRoutes, {
          ...sample, id: 'demo-admin-proposal', slug: undefined, name: 'Circuito comunitario Jipiro',
          desc: 'Propuesta de ejemplo para practicar revisión. Trazado y condiciones demostrativos.',
          official: false, verified: false, owned: false, private: true, owner: 'Corredora de demostración', status: 'Pendiente', date: current.date,
        }],
        incidents: current.incidents.some(i => i.id === 'demo-admin-incident') ? current.incidents : [...current.incidents, {
          id: 'demo-admin-incident', type: 'Falta de iluminación', location: 'Sendero Jipiro · ejemplo', coordinate: sample.geometry[1] ?? [-3.9736, -79.2027],
          date: current.date, time: '19:00', description: 'Reporte ficticio de poca iluminación para demostrar la revisión administrativa.',
          status: 'Pendiente', owner: 'Corredor de demostración', owned: false, createdAt: Date.now(),
        }],
      }
    })
  }, [isDemo, update, user])
  const go = (target: string) => {
    if (!isDemo) return
    setPage(target)
    setMenu(false)
    window.scrollTo({ top: 0 })
  }
  const pageLabel = groups.flatMap(g => g.items).find(i => i.id === page)?.label
  return <div className="min-h-screen bg-ink text-copy">
    <div className="border-b border-sport/30 bg-sport/10 px-5 py-3 text-center text-sm leading-6" role="status"><strong>Administración · demostración local</strong> / Sin cambios en servidor</div>
    <header className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 lg:px-8"><Link href="/" aria-label="RUNCTY, inicio"><Logo /></Link><nav className="flex flex-wrap items-center gap-5 text-sm">{account?.role === 'corredor' && !blocked && <button type="button" className="role-switch" onClick={() => { startDemo('corredor'); router.push('/explorar') }}><RunnerIcon /><span>Modo corredor</span></button>}{panel && <button type="button" className="inline-flex min-h-11 items-center gap-2" onClick={() => setTour(true)}><GraduationCap className="size-4" />Ver tutorial</button>}<Link className="inline-flex min-h-11 items-center gap-2" href="/"><Home className="size-4" />Inicio</Link>{account?.role === 'corredor' && <Link className="inline-flex min-h-11 items-center gap-2" href="/movil"><Smartphone className="size-4" />Aplicación móvil</Link>}</nav></header>
    {blocked ? <main className="mx-auto max-w-xl px-5 py-16"><h1 className="text-3xl font-bold">Tu cuenta no tiene rol de administrador.</h1><p className="my-5 text-sm leading-7 text-muted">Un administrador puede asignártelo desde Usuarios y roles. Mientras tanto sigues teniendo tu acceso de corredor.</p><Button onClick={() => { startDemo('corredor'); router.push('/explorar') }}>Ir a modo corredor</Button></main> : user && !isDemo ? <main className="mx-auto max-w-xl px-5 py-16"><h1 className="text-3xl font-bold">Prueba la gestión de RUNCTY.</h1><p className="my-5 text-sm leading-7 text-muted">Tienes una cuenta iniciada. Puedes cerrar esa sesión voluntariamente para abrir la demostración con datos ficticios.</p><Button onClick={async () => { if (await logout()) startDemo('club') }}>Cerrar sesión y abrir demostración</Button></main> : !isDemo ? <main className="p-10" aria-busy="true">Preparando demostración…</main> :
    <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className={`demo-admin-menu ${menu ? 'menu-open' : ''} border-b border-line px-4 py-6 lg:border-r lg:border-b-0`}>
        <button type="button" className="demo-admin-toggle lg:hidden" aria-expanded={menu} onClick={() => setMenu(!menu)}><span>Módulos de gestión<strong>{pageLabel}</strong></span><ChevronDown /></button>
        <div className="demo-admin-profile mb-6 rounded-xl border border-electric/25 bg-electric/10 p-4"><span className="text-xs text-muted">PERFIL SIMULADO</span><strong className="mt-2 block text-sm">{isSystem ? 'Administración del sistema' : 'Gestión del club'}</strong><p className="mt-2 text-xs leading-5 text-muted">Los permisos reales se aplican en el servidor.</p></div>
        <nav aria-label="Módulos administrativos" className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1">{visibleGroups.map(group => <div key={group.name}><h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted">{group.name}</h2><div className="space-y-1">{group.items.map(({ id, label, icon: Icon }) => <button key={id} data-tour={`admin-${id}`} onClick={() => go(id)} aria-current={page === id ? 'page' : undefined} className={'flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm ' + (page === id ? 'border-electric/30 bg-electric/15 text-copy' : 'border-transparent text-muted hover:bg-raised')}><Icon className="size-4 shrink-0 text-sport" /><span className="min-w-0 flex-1">{label}</span>{id === 'proposals' && state.customRoutes.some(r => r.status === 'Pendiente') && <span className="rounded-full bg-sport px-2 text-xs text-ink">{state.customRoutes.filter(r => r.status === 'Pendiente').length}</span>}{id === 'moderate' && state.incidents.some(i => i.status === 'Pendiente') && <span className="rounded-full bg-sport px-2 text-xs text-ink">{state.incidents.filter(i => i.status === 'Pendiente').length}</span>}</button>)}</div></div>)}</nav>
        <p className="demo-admin-note mt-7 border-t border-line px-3 pt-5 text-xs leading-6 text-muted">Las rutas comunitarias se aprueban o rechazan únicamente desde esta experiencia web.</p>
      </aside>
      <main className="min-w-0 px-5 py-7 sm:px-7 lg:px-9"><p className="mb-7 flex items-center gap-2 border-b border-line pb-5 text-sm text-muted">RUNCTY <ChevronRight className="size-3" />Gestión <ChevronRight className="size-3" /><span className="text-copy">{pageLabel}</span></p>{systemPages.has(page) ? <SystemAdmin page={page} /> : <ClubAdmin page={page} go={go} />}</main>
    </div>}
    {tour && <Tour label="Tutorial del panel" steps={tourSteps} onClose={() => { setTour(false); setMenu(false) }} />}
  </div>
}
