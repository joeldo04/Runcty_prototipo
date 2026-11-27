'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { Check, Cloud, LoaderCircle, RefreshCw } from 'lucide-react'
import { AccountPreview } from './Onboarding'
import {
  today,
  assignedAccessRole,
  pointAlong,
  uid,
  withEmails,
  type DemoEmail,
  type RouteData,
  type Role,
  type TimeSlot,
  type Incident,
  type Sponsor,
  type Banner,
  type Training,
  type Space,
  type Coordinate,
  type DemoUser,
  type RiskZone,
  type RouteRating,
  type Street,
  type SurveyAnswers,
  freeTrainingRoute,
} from './data'
import { SHOW_FUTURE } from './features'
import type { PublicRuncty } from '@/lib/runcty-queries'
import { DEMO_CITY, DEMO_ROADS, DEMO_ROUTES, DEMO_SPACES, DEMO_SPONSORS, DEMO_BANNERS, DEMO_USERS, DEMO_ACCESS_PASSWORD, DEMO_LOGINS, demoReport } from './demo-seed'
import type { User } from '@/payload-types'
import { loadRunctySession, saveRunctyChanges, signOutRuncty } from '@/app/(frontend)/actions'

export type RouteFeedback = RouteRating & {
  id_valoracion: string
  id_usuario: string
  id_ruta: string
  fecha_valoracion: string
}

export interface DemoState {
  time: TimeSlot
  date: string
  role: Role
  savedIds: string[]
  customRoutes: RouteData[]
  catalog: RouteData[]
  roads: Street[]
  incidents: Incident[]
  sponsors: Sponsor[]
  banners: Banner[]
  trainings: Training[]
  routeFeedback: RouteFeedback[]
  emails: DemoEmail[]
  reportsSeen: string[]
  newAccount: boolean
  profile: { name: string; level: string; public: boolean; email: string }
  spaces: Space[]
  contacts: { id: string; name: string; email: string; phone: string }[]
  sharing: { token: string; expires: number; revoked: boolean } | null
  sos: { id: string; date: string; status: string }[]
  moderation: { id: string; date: string; item: string; decision: string; reason: string }[]
  users: DemoUser[]
  risks: RiskZone[]
  comments: { id: string; text: string; status: string; reason?: string; routeId?: string }[]
  cities: { id: string; name: string; networkReady: boolean; enabled: boolean; streetCount?: number }[]
  clubDescription: string
  clubName: string
  heroImage: { url: string; alt: string; width: number; height: number } | null
  mapView: { center: Coordinate; zoom: number }
  draft: { points: Coordinate[]; mode: 'manual' | 'calculate' | 'recommend'; name: string }
  routeOverrides: Record<string, Partial<RouteData>>
  session: {
    phase: 'ready' | 'permission' | 'countdown' | 'running' | 'paused' | 'survey' | 'summary'
    route: RouteData
    seconds: number
    km: number
    count: number
    time: TimeSlot
    date: string
    finishedId?: string
    survey?: SurveyAnswers
  }
}
export const EMPTY_ROUTE: RouteData = {
  id: '',
  name: 'Elige una ruta',
  area: 'Loja',
  km: 0,
  min: 0,
  difficulty: 'Principiante',
  desc: '',
  segmentIds: [],
  geometry: [],
}
export type AppUser = { id: User['id']; name: string; role: User['role'] }
const currentSlot = (): TimeSlot => {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Guayaquil', hour: '2-digit', hourCycle: 'h23' }).format(new Date()),
  )
  return hour >= 4 && hour < 7 ? '05:30' : hour >= 7 && hour < 11 ? '08:00' : hour >= 11 && hour < 17 ? '14:00' : '19:00'
}
function initialState(data: PublicRuncty | DemoState): DemoState {
  const date = today()
  const time = currentSlot()
  return {
    ...data,
    time,
    date,
    role: 'visitante',
    savedIds: [],
    customRoutes: [],
    trainings: [],
    routeFeedback: [],
    emails: [],
    reportsSeen: [],
    newAccount: false,
    profile: { name: '', level: 'Intermedio', public: false, email: '' },
    contacts: [],
    sharing: null,
    sos: [],
    moderation: [],
    users: [],
    mapView: { center: [-3.9857, -79.2027], zoom: 14 },
    draft: { points: [], mode: 'recommend', name: 'Mi recorrido por Loja' },
    routeOverrides: {},
    session: {
      phase: 'ready',
      // Sin ruta elegida se entrena en modo libre; la ruta se puede elegir antes de iniciar.
      route: SHOW_FUTURE ? (data.catalog[0] ?? EMPTY_ROUTE) : freeTrainingRoute(data.catalog[0]),
      seconds: 0,
      km: 0,
      count: 3,
      time,
      date,
    },
  }
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const effectiveRoutes = (s: DemoState) =>
  [...s.catalog, ...s.customRoutes].map((r) => ({ ...r, ...s.routeOverrides[r.id] }))
function changes(before: DemoState, after: DemoState, user: AppUser | null): unknown[] {
  const ops: unknown[] = []
  const diff = (
    oldItems: { id: string }[],
    items: { id: string }[],
    kind: string,
    remove?: string,
  ) => {
    for (const value of items)
      if (
        !equal(
          oldItems.find((i) => i.id === value.id),
          value,
        )
      )
        ops.push({ kind, value })
    if (remove)
      for (const value of oldItems)
        if (!items.some((i) => i.id === value.id)) ops.push({ kind: remove, id: value.id })
  }
  diff(effectiveRoutes(before), effectiveRoutes(after), 'route.save', 'route.delete')
  diff(before.incidents, after.incidents, 'incident.save')
  diff(before.sponsors, after.sponsors, 'sponsor.save')
  diff(before.banners, after.banners, 'banner.save')
  diff(before.spaces, after.spaces, 'space.save', 'space.delete')
  diff(before.risks, after.risks, 'risk.save')
  diff(before.trainings, after.trainings, 'training.save', 'training.delete')
  diff(before.sos, after.sos, 'sos.save')
  for (const comment of after.comments) {
    const existing = before.comments.find((value) => value.id === comment.id)
    if (!existing)
      ops.push({
        kind: 'comment.create',
        value: { id: comment.id, text: comment.text, routeId: comment.routeId },
      })
    else if (!equal(existing, comment)) ops.push({ kind: 'comment.review', value: comment })
  }
  diff(before.users, after.users, 'user.status')
  diff(before.cities, after.cities, 'city.save')
  for (const [key, kind] of [
    ['savedIds', 'saved.set'],
    ['profile', 'profile.set'],
    ['contacts', 'contacts.set'],
    ['sharing', 'sharing.set'],
    ['clubDescription', 'club.set'],
  ] as const)
    if (!equal(before[key], after[key])) ops.push({ kind, value: after[key] })
  if (user && (before.time !== after.time || before.date !== after.date))
    ops.push({ kind: 'preferences.set', value: { time: after.time, date: after.date } })
  if (
    after.sharing &&
    !after.sharing.revoked &&
    after.session.phase === 'running' &&
    after.session.seconds !== before.session.seconds &&
    after.session.seconds % 10 === 0
  )
    ops.push({
      kind: 'sharing.position',
      value: pointAlong(
        after.session.route.geometry,
        after.session.route.km ? after.session.km / after.session.route.km : 0,
      ),
    })
  return ops
}
type Store = {
  state: DemoState
  user: AppUser | null
  isDemo: boolean
  loading: boolean
  pending: number
  syncError: string
  update: (fn: (s: DemoState) => DemoState) => boolean
  notify: (message: string) => void
  openAccount: () => void
  openRegistration: () => void
  openDemoAccess: () => void
  demonstrationAccess: boolean
  checkPreviewAccess: (email: string, password: string) => DemoUser | null
  startDemo: (role?: 'corredor' | 'club' | 'sistema', accountId?: string, name?: string, email?: string, password?: string, access?: 'normal' | 'demo') => void
  logout: () => Promise<boolean>
  hydrateSession: (data: Partial<DemoState>, user: AppUser | null) => void
}
const Context = createContext<Store>(null!)
export function DemoProvider({
  children,
  initialData,
}: {
  children: ReactNode
  initialData: PublicRuncty
}) {
  const router = useRouter()
  const [state, setState] = useState(() => initialState(initialData)),
    [user, setUser] = useState<AppUser | null>(null),
    [loading, setLoading] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [accountMode, setAccountMode] = useState<'login' | 'register' | 'demo' | null>(null)
  const [demonstrationAccess, setDemonstrationAccess] = useState(false)
  // Las contraseñas de la maqueta no se envían ni se guardan en el navegador.
  const previewPasswords = useRef(new Map<string, string>())
  const demoRef = useRef(false)
  const [message, setMessage] = useState(''),
    [pending, setPending] = useState(0),
    [error, setError] = useState('')
  const ref = useRef(state),
    userRef = useRef(user),
    queue = useRef(Promise.resolve()),
    version = useRef(0),
    failed = useRef<unknown[]>([]),
    pendingRef = useRef(0),
    publicRef = useRef(initialData)
  const accept = useCallback((data: Partial<DemoState>, identity: AppUser | null) => {
    const old = identity?.id === userRef.current?.id ? ref.current : initialState(publicRef.current)
    userRef.current = identity
    setUser(identity)
    const next = {
      ...old,
      ...data,
      role: identity ? identity.role : ('visitante' as Role),
      routeOverrides: demoRef.current ? old.routeOverrides : {},
    }
    if (!next.session.route.id)
      next.session = { ...next.session, route: next.catalog[0] ?? EMPTY_ROUTE }
    ref.current = next
    setState(next)
    setLoading(false)
  }, [])
  const reload = useCallback(async () => {
    if (demoRef.current || pendingRef.current || failed.current.length) return
    const current = version.current
    try {
      const result = await loadRunctySession()
      if (
        demoRef.current ||
        current !== version.current ||
        pendingRef.current ||
        failed.current.length
      )
        return
      if (result.ok) accept(result.data, result.user)
      else setError(result.error)
    } catch {
      setError('No se pudo comprobar tu sesión. Reintenta cuando tengas conexión.')
    } finally {
      setLoading(false)
    }
  }, [accept])
  const hydrateSession = useCallback(
    (data: Partial<DemoState>, identity: AppUser | null) => {
      if (!demoRef.current && !pendingRef.current && !failed.current.length) accept(data, identity)
    },
    [accept],
  )
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [message])
  useEffect(() => {
    publicRef.current = initialData
    // A background refresh must not replace the explicit local demo's showcase data.
    if (demoRef.current || pendingRef.current || failed.current.length) return
    if (userRef.current && !demoRef.current) {
      void reload()
      return
    }
    const next = { ...ref.current, ...initialData }
    ref.current = next
    setState(next)
  }, [initialData, reload])
  const persist = useCallback(
    (ops: unknown[], retry = false) => {
      if (!ops.length) return
      const current = ++version.current
      pendingRef.current++
      setPending(pendingRef.current)
      queue.current = queue.current.then(async () => {
        let success = false
        try {
          if (failed.current.length && !retry) {
            failed.current.push(...ops)
            return
          }
          const result = await saveRunctyChanges(ops)
          if (result.ok) {
            success = true
            if (current === version.current && !failed.current.length)
              accept(result.data, result.user)
            if (!failed.current.length) setError('')
          } else {
            failed.current.push(...ops.slice('completed' in result ? result.completed : 0))
            setError(result.error)
            setMessage(result.error)
          }
        } catch {
          failed.current.push(...ops)
          setError('Sin conexión. Tus cambios todavía no están sincronizados.')
          setMessage(
            'No se guardó en el servidor. Puedes reintentar sin perder los cambios de esta sesión.',
          )
        } finally {
          pendingRef.current--
          setPending(pendingRef.current)
          if (success && !pendingRef.current && !failed.current.length) router.refresh()
        }
      })
    },
    [accept, router],
  )
  const update = useCallback(
    (fn: (s: DemoState) => DemoState) => {
      const before = ref.current,
        next = fn(before),
        identity = userRef.current
      if (next === before) return true
      if (next.role !== before.role) {
        setMessage('Los permisos de tu cuenta se administran en el servidor.')
        return false
      }
      // The demo is an in-memory sandbox: it never calls authenticated mutations.
      const ops = demoRef.current ? [] : changes(before, next, identity)
      if (ops.length && failed.current.length) {
        setMessage(
          'Reintenta primero la sincronización pendiente para evitar sobrescribir cambios.',
        )
        return false
      }
      if (ops.length && !identity) {
        setMessage('Inicia sesión para continuar.')
        return false
      }
      ref.current = next
      setState(next)
      for (let i = 0; i < ops.length; i += 50) persist(ops.slice(i, i + 50))
      return true
    },
    [persist],
  )
  // En la demo nada se sincroniza: confirma la acción sin prometer un guardado en servidor.
  const notify = useCallback(
    (text: string) =>
      setMessage(
        demoRef.current && /sincroniz/i.test(text) ? 'Cambio guardado.' : text,
      ),
    [],
  )
  const logout = async () => {
    if (demoRef.current) {
      demoRef.current = false
      setIsDemo(false)
      userRef.current = null
      setUser(null)
      // Los roles asignados sobreviven al cierre para probarlos con otra cuenta.
      const clean = { ...initialState(ref.current), users: ref.current.users }
      setDemonstrationAccess(false)
      ref.current = clean
      setState(clean)
      version.current++
      setMessage('Sesión cerrada.')
      return true
    }
    if (pendingRef.current) {
      setMessage('Espera a que termine la sincronización.')
      return false
    }
    if (
      failed.current.length &&
      !window.confirm(
        'Hay cambios sin sincronizar. ¿Cerrar sesión y descartar esos cambios de esta sesión?',
      )
    )
      return false
    try {
      await signOutRuncty()
    } catch {
      setMessage('No se pudo cerrar la sesión. Vuelve a intentarlo.')
      return false
    }
    failed.current = []
    setError('')
    userRef.current = null
    setUser(null)
    const clean = initialState(publicRef.current)
    ref.current = clean
    setState(clean)
    version.current++
    router.refresh()
    return true
  }
  const startDemo = useCallback((role: 'corredor' | 'club' | 'sistema' = 'corredor', accountId?: string, chosenName?: string, chosenEmail?: string, password?: string, access?: 'normal' | 'demo') => {
    if ((userRef.current && !demoRef.current) || pendingRef.current || failed.current.length) return
    const wasDemo = demoRef.current
    const current = ref.current
    const known = current.users.length ? current.users : DEMO_USERS
    // Solo crear cuenta trae nombre, aunque esté vacío: siempre nace como corredor.
    const created = chosenName !== undefined
    const email = chosenEmail?.trim().toLowerCase()
    if (created && (!email || !password || password.length < 8 || known.some(value => value.email?.toLowerCase() === email))) {
      setMessage('No se pudo crear la cuenta. Revisa el correo y la contraseña.')
      return
    }
    const newName = chosenName?.trim() || 'Corredor nuevo'
    const fresh: DemoUser | null = created
      ? { id: 'cuenta-' + uid(), name: newName, email, role: 'corredor', active: true, admin: false }
      : null
    const users = fresh ? [...known, fresh] : known
    const account = fresh ?? known.find(value => value.id === (accountId ?? userRef.current?.id))
    if (!account || !account.active) return
    demoRef.current = true
    setIsDemo(true)
    version.current++
    if (fresh && password) previewPasswords.current.set(fresh.id, password)
    if (access) setDemonstrationAccess(access === 'demo')
    const sameAccount = wasDemo && userRef.current?.id === account.id
    const name = chosenName || (sameAccount ? current.profile.name : account.name)
    accept(
      {
        // Only fill missing catalog values for local demonstration; never overwrite CMS records.
        roads: current.roads.length ? current.roads : DEMO_ROADS,
        catalog: current.catalog.length ? current.catalog : DEMO_ROUTES,
        spaces: current.users.length || current.spaces.length ? current.spaces : DEMO_SPACES,
        sponsors: current.sponsors.length ? current.sponsors : DEMO_SPONSORS,
        banners: current.banners.length ? current.banners : DEMO_BANNERS,
        users,
        cities: current.cities.some((city) => city.id === DEMO_CITY.id)
          ? current.cities
          : [...current.cities.map((city) => ({ ...city, networkReady: city.networkReady || city.id === 'loja' })), DEMO_CITY],
        incidents: current.incidents.some((incident) => incident.id === 'demo-report-perros')
          ? current.incidents
          : [...current.incidents, demoReport()],
        newAccount: created || (sameAccount && current.newAccount),
        emails: !created ? current.emails : withEmails(current, [{
          to: chosenEmail || 'corredor@ejemplo.com',
          subject: 'Verifica tu cuenta de RUNCTY',
          body: `Hola${name ? `, ${name}` : ''}.\n\nConfirma tu correo con el enlace de verificación para activar tu cuenta de corredor. El enlace vence en 24 horas.`,
        }]).emails,
        session: {
          ...current.session,
          route: current.session.route.id
            ? current.session.route
            : current.catalog[0] ?? DEMO_ROUTES[0],
        },
        profile: sameAccount ? current.profile : {
          name,
          level: 'Intermedio',
          public: false,
          email: chosenEmail || account.email || 'corredor@example.invalid',
        },
      },
      { id: account.id, name, role: created ? 'corredor' : assignedAccessRole(account, role) },
    )
    setAccountMode(null)
  }, [accept])
  const checkPreviewAccess = (email: string, password: string) => {
    const known = ref.current.users.length ? ref.current.users : DEMO_USERS
    const login = email.trim().toLowerCase()
    // Usuario corto de presentación (admin, adminClub, corredor): la contraseña es el mismo usuario.
    const short = DEMO_LOGINS.find(value => value.username.toLowerCase() === login)
    if (short) {
      const shortAccount = known.find(value => value.id === short.id)
      return shortAccount?.active && password === short.username ? shortAccount : null
    }
    const account = known.find(value => value.email?.toLowerCase() === login)
    if (!account?.active) return null
    const expected = previewPasswords.current.get(account.id) ??
      (DEMO_USERS.some(value => value.id === account.id) ? DEMO_ACCESS_PASSWORD : undefined)
    return expected && password === expected ? account : null
  }
  return (
    <Context.Provider
      value={{
        state,
        user,
        isDemo,
        loading,
        pending,
        syncError: error,
        update,
        notify,
        openAccount: () => setAccountMode('login'),
        openRegistration: () => setAccountMode('register'),
        openDemoAccess: () => setAccountMode('demo'),
        demonstrationAccess,
        checkPreviewAccess,
        startDemo,
        logout,
        hydrateSession,
      }}
    >
      {children}
      {accountMode && (
        <AccountPreview
          create={accountMode === 'register'}
          demonstration={accountMode === 'demo'}
          close={() => setAccountMode(null)}
          proceed={(accountId, mode, name, email, password, access) => {
            if (userRef.current && !demoRef.current) { setAccountMode(null); return }
            startDemo(mode === 'admin' ? 'club' : 'corredor', accountId, name, email, password, access)
            if (mode === 'admin') router.push('/demo/administracion')
            else if (!window.location.pathname.startsWith('/movil')) router.push('/explorar')
          }}
        />
      )}
      {(pending > 0 || error) && (
        <div
          className="fixed bottom-5 left-1/2 z-[10000] flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-xs text-muted shadow-panel"
          role="status"
        >
          {pending > 0 ? (
            <LoaderCircle className="size-4 shrink-0 animate-spin" />
          ) : (
            <Cloud className="size-4 shrink-0" />
          )}
          <span>{pending > 0 ? 'Sincronizando con RUNCTY…' : error}</span>
          {!!error && !pending && (
            <button
              type="button"
              className="flex shrink-0 items-center gap-1 font-bold text-lilac"
              onClick={() => {
                const ops = failed.current.splice(0, 50)
                if (ops.length) persist(ops, true)
                else void reload()
              }}
            >
              <RefreshCw className="size-3" />
              Reintentar
            </button>
          )}
          {!!error && !pending && !!failed.current.length && (
            <button
              type="button"
              className="shrink-0 text-dim underline"
              onClick={() => {
                if (
                  window.confirm(
                    '¿Descartar los cambios pendientes de esta sesión y recuperar lo guardado en el servidor?',
                  )
                ) {
                  failed.current = []
                  version.current++
                  setError('')
                  void reload()
                }
              }}
            >
              Descartar pendientes
            </button>
          )}
        </div>
      )}
      {message && (
        <div
          className="pointer-events-none fixed bottom-24 right-5 z-[11000] flex max-w-[calc(100vw-2.5rem)] items-start gap-3 rounded-xl border border-line bg-panel px-5 py-4 text-sm text-copy shadow-panel sm:bottom-5 sm:max-w-sm"
          role="status"
        >
          <Check className="mt-0.5 size-4 shrink-0 text-lilac" />
          {message}
        </div>
      )}
    </Context.Provider>
  )
}
export const useDemo = () => useContext(Context)
export function useRoutes() {
  const { state } = useDemo()
  return effectiveRoutes(state)
}
