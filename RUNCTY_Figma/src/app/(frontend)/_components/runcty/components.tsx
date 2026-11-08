import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type SVGProps,
} from 'react'
import Image from 'next/image'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Footprints,
  Heart,
  MapPin,
  Moon,
  Mountain,
  Shield,
  Sun,
  Sunrise,
  X,
} from 'lucide-react'
import {
  TIMES,
  today,
  routeScore,
  safety,
  type RouteData,
  type TimeSlot,
  type Banner,
  type Sponsor,
  scheduleStatus,
  type ClubAlert,
} from './data'
import { useDemo } from './store'

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'orange' | 'danger'
  children: ReactNode
}) {
  const variants = {
    primary:
      'border border-electric/40 bg-electric text-white shadow-neon hover:bg-blue-500',
    secondary: 'border border-line bg-panel text-copy hover:border-lilac/40 hover:bg-raised',
    ghost: 'border border-transparent bg-transparent text-muted hover:bg-raised hover:text-copy',
    orange: 'border border-sport/30 bg-sport text-ink shadow-sm hover:bg-orange-400',
    danger: 'border border-risk/30 bg-risk/15 text-risk hover:bg-risk/25',
  }
  return (
    <button
      type="button"
      className={`button button-${variant} inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lilac disabled:cursor-not-allowed disabled:opacity-45 [&>svg]:size-4 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
export function IconButton({
  label,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-button inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-copy focus-visible:outline-2 focus-visible:outline-lilac disabled:opacity-45 [&>svg]:size-5 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
export function FilterChip({
  selected,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean; children: ReactNode }) {
  return (
    <Button
      variant="secondary"
      aria-pressed={selected}
      className={`min-h-8 rounded-full px-3 py-1.5 text-[11px] ${selected ? 'border-electric/40 bg-electric/10 text-info' : 'text-dim'}`}
      {...props}
    >
      {children}
    </Button>
  )
}
// Silueta propia del corredor: lucide no incluye una y evita sumar otra dependencia.
export function RunnerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="15.6" cy="4.2" r="2.3" fill="currentColor" stroke="none" />
      <path d="m13.6 8.8-3 5.2" />
      <path d="M13.6 8.8 9.4 8.2l-2.6 2.9M13.6 8.8l2.5 3.2 3.5.2" />
      <path d="m10.6 14 3.9 2.2-1 5M10.6 14l-1.8 3.5-4.4 1.1" />
    </svg>
  )
}
export function Logo() {
  return (
    <span className="wordmark inline-flex items-center gap-2.5 text-2xl font-black italic tracking-tighter text-copy">
      <svg viewBox="0 0 32 32" className="size-8 text-neon" fill="none" aria-hidden="true">
        <path
          d="m5 23 8-14h7l-4 7h7l-8 9"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <path d="m24 6 4 3-3 5" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      RUNCTY<span className="-ml-2 text-neon">.</span>
    </span>
  )
}
export function DemoTag() {
  const { isDemo, user } = useDemo()
  return (
    <span className="demo-tag">
      <span /> {isDemo ? `${user?.name ?? 'Carlos'} · demo local` : 'Prototipo interactivo'}
    </span>
  )
}
export function PageTitle({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </header>
  )
}
export function Score({ value, large = false }: { value: number | null; coverage?: number; large?: boolean }) {
  const condition = safety(value)
  return <span className={`route-condition ${condition.key} ${large ? 'condition-large' : ''}`}>
    <Shield aria-hidden="true" /><span>{condition.label}</span>
  </span>
}
export function SafetyNote() {
  return (
    <p className="safety-note">
      <Shield />
      Condiciones de demostración. Comprueba el entorno antes de salir; no garantizan seguridad.
    </p>
  )
}
export function Notice({
  title,
  children,
  tone = 'caution',
}: {
  title: string
  children: ReactNode
  tone?: 'caution' | 'danger' | 'info'
}) {
  return (
    <div className={`club-notice ${tone === 'caution' ? '' : tone}`} role="status">
      <AlertTriangle />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  )
}
export function ClubAlerts({ item, hours }: { item: { alert?: ClubAlert }; hours?: string }) {
  const { state } = useDemo()
  const schedule = scheduleStatus(hours, state.time)
  return (
    <>
      {item.alert && (
        <Notice tone="danger" title="No recomendado por el club">
          {item.alert.reason}
        </Notice>
      )}
      {schedule && !schedule.inside && (
        <Notice tone="info" title="Fuera del horario recomendado">
          El club la recomienda desde las {schedule.from}.
        </Notice>
      )}
    </>
  )
}
export function SpaceSchedule({ hours }: { hours: string }) {
  const { state } = useDemo()
  const schedule = scheduleStatus(hours, state.time)
  if (!schedule) return null
  return (
    <span className={`route-flag ${schedule.inside ? 'info' : ''}`}>
      {schedule.inside ? 'Dentro del horario recomendado' : 'Fuera del horario recomendado'}
    </span>
  )
}
export function Status({ value }: { value: string }) {
  const kind = ['Aprobado', 'Publicado', 'Activo'].includes(value)
    ? 'approved'
    : ['Rechazado', 'Retirado', 'Inactivo'].includes(value)
      ? 'rejected'
      : 'pending'
  return (
    <span className={`status ${kind}`}>
      <i />
      {value}
    </span>
  )
}
export function TimeControl({
  date = true,
  compact = false,
}: {
  date?: boolean
  compact?: boolean
}) {
  const { state, update } = useDemo()
  const descriptions: Record<TimeSlot, string> = {
    '05:30': 'Madrugada',
    '08:00': 'Mañana',
    '14:00': 'Tarde',
    '19:00': 'Noche',
  }
  return (
    <div className={`scenario-control ${compact ? 'scenario-compact' : ''}`} data-tour="time">
      {date && (
        <label className="date-control">
          <CalendarDays />
          <input
            aria-label="Fecha de consulta"
            type="date"
            value={state.date}
            onChange={(e) => {
              if (e.target.value) update((s) => ({ ...s, date: e.target.value }))
            }}
          />
        </label>
      )}
      <div className="time-slots" role="group" aria-label="Horario de seguridad">
        {TIMES.map((time) => {
          const Icon = time === '05:30' ? Sunrise : time === '19:00' ? Moon : Sun
          return (
            <button
              key={time}
              type="button"
              title={descriptions[time]}
              aria-pressed={state.time === time}
              className={state.time === time ? 'selected' : ''}
              onClick={() => update((s) => ({ ...s, time }))}
            >
              <Icon />
              <span>{time}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    const insidePhone = !!ref.current?.closest('.phone-frame')
    if (!insidePhone) document.body.style.overflow = 'hidden'
    const focusables = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
        ) ?? [],
      )
    focusables()[0]?.focus()
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key === 'Tab') {
        const list = focusables(),
          first = list[0],
          last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', handle)
    return () => {
      document.removeEventListener('keydown', handle)
      document.body.style.overflow = overflow
      old?.focus()
    }
  }, [])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        className={`modal ${wide ? 'modal-wide' : ''}`}
      >
        <IconButton label="Cerrar ventana" onClick={onClose}>
          <X />
        </IconButton>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}
export function Confirm({
  title,
  message,
  confirm,
  onClose,
  label = 'Confirmar',
}: {
  title: string
  message: string
  confirm: () => void | boolean | Promise<void | boolean>
  onClose: () => void
  label?: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  return (
    <Modal title={title} onClose={onClose}>
      <p>{message}</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <Button variant="secondary" disabled={confirming} onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          disabled={confirming}
          onClick={async () => {
            setConfirming(true)
            setError('')
            try {
              if ((await confirm()) !== false) onClose()
            } catch {
              setError('No se pudo completar la acción. Inténtalo de nuevo.')
            } finally {
              setConfirming(false)
            }
          }}
        >
          {confirming ? 'Un momento…' : label}
        </Button>
      </div>
    </Modal>
  )
}
export function BackButton({
  onClick,
  children = 'Volver',
}: {
  onClick: () => void
  children?: ReactNode
}) {
  return (
    <button className="back-button" onClick={onClick}>
      <ArrowLeft />
      {children}
    </button>
  )
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="empty-state">
      <Footprints />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
  )
}
export function RoutePreview({ route }: { route: RouteData }) {
  const patternId = useId().replaceAll(':', '')
  const p = route.geometry
  if (!p.length)
    return (
      <div className="route-preview">
        <Mountain />
      </div>
    )
  const lats = p.map((v) => v[0]),
    lngs = p.map((v) => v[1]),
    minLat = Math.min(...lats),
    maxLat = Math.max(...lats),
    minLng = Math.min(...lngs),
    maxLng = Math.max(...lngs)
  const points = p
    .map(
      (c) =>
        `${15 + ((c[1] - minLng) / (maxLng - minLng || 1)) * 130},${90 - ((c[0] - minLat) / (maxLat - minLat || 1)) * 75}`,
    )
    .join(' ')
  return (
    <div className="route-preview" aria-hidden="true">
      {route.image && (
        <Image
          src={route.image.url}
          alt={route.image.alt}
          fill
          sizes="(max-width: 600px) 288px, 96px"
          className="object-cover"
        />
      )}
      <svg viewBox="0 0 160 110" className={route.image ? 'photo-route-overlay' : undefined}>
        <defs>
          <pattern id={`preview-${patternId}`} width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M22 0H0V22" fill="none" stroke="currentColor" strokeWidth=".4" />
          </pattern>
        </defs>
        <rect width="160" height="110" fill={`url(#preview-${patternId})`} />
        <polyline
          points={points}
          fill="none"
          stroke="var(--purple-light)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={points.split(' ')[0].split(',')[0]}
          cy={points.split(' ')[0].split(',')[1]}
          r="4"
          fill="var(--color-copy)"
        />
      </svg>
      <span>{route.image ? 'IMAGEN EDITORIAL' : 'LOJA · EC'}</span>
    </div>
  )
}
export function RouteCard({
  route,
  onOpen,
  editorial = false,
  showSchedule = false,
}: {
  route: RouteData
  onOpen: (r: RouteData) => void
  editorial?: boolean
  showSchedule?: boolean
}) {
  const { state } = useDemo(),
    result = routeScore(route, state.time, state.date, state.incidents, state.risks, state.roads),
    schedule = scheduleStatus(route.recommended, state.time)
  return (
    <button
      className={`route-card ${editorial ? 'editorial-route' : ''}`}
      onClick={() => onOpen(route)}
    >
      <RoutePreview route={route} />
      <div className="route-card-content">
        <div className="route-card-top">
          <span className="route-area">
            <MapPin />
            {route.area}
          </span>
          {(route.official || route.verified) && (
            <span className="verified">
              <Check />
              {route.official ? 'Oficial · demo' : 'Revisión · demo'}
            </span>
          )}
        </div>
        <h3>{route.name}</h3>
        <div className="route-metrics">
          <strong>
            {route.km.toFixed(1)}
            <small> km</small>
          </strong>
          <span>
            <Clock3 />
            {route.min} min
          </span>
          <span>{route.difficulty}</span>
        </div>
        {editorial && (
          <p className="route-recommended">
            Recomendado · {route.recommended || 'Horario no publicado'}
          </p>
        )}
        {showSchedule && schedule && !schedule.inside && (
          <span className="route-flag">Fuera de horario · desde las {schedule.from}</span>
        )}
        {route.alert && <span className="route-flag danger">No recomendado</span>}
        <Score value={result.score} coverage={result.coverage} />
      </div>
      <ChevronRight className="route-arrow" />
    </button>
  )
}
function SponsorArt({ sponsor }: { sponsor: Sponsor }) {
  if (sponsor.image)
    return (
      <div className="sponsor-art sponsor-art-image">
        <Image
          unoptimized={sponsor.image.url.startsWith('/_next/static/') }
          src={sponsor.image.url}
          alt={sponsor.image.alt || sponsor.name}
          width={sponsor.image.width}
          height={sponsor.image.height}
          className="h-full w-full object-contain"
        />
      </div>
    )
  const Icon =
    sponsor.visual === 'mountain' ? Mountain : sponsor.visual === 'sunrise' ? Sunrise : Footprints
  return (
    <div className={`sponsor-art art-${sponsor.visual}`}>
      <Icon />
      <span>{sponsor.name.charAt(0)}</span>
    </div>
  )
}
export function activeBanners(banners: Banner[], sponsors: Sponsor[], placement: string) {
  const current = today()
  return banners.filter(
    (b) =>
      b.placement === placement &&
      b.status === 'Publicado' &&
      b.start <= current &&
      b.end >= current &&
      sponsors.some((s) => s.id === b.sponsorId && s.active),
  )
}
export function AdCarousel({
  placement = 'explore',
}: {
  placement?: 'explore' | 'catalog' | 'club'
}) {
  const { state } = useDemo(),
    [index, setIndex] = useState(0),
    [detail, setDetail] = useState(false),
    touch = useRef(0)
  const ads = activeBanners(state.banners, state.sponsors, placement)
  if (!ads.length) return null
  const ad = ads[index % ads.length],
    sponsor = state.sponsors.find((s) => s.id === ad.sponsorId)!
  const next = (direction: number) => setIndex((i) => (i + direction + ads.length) % ads.length)
  return (
    <section className="allies-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ALIADOS DE RUNCTY</span>
        </div>
        <div className="carousel-arrows">
          <IconButton label="Anuncio anterior" onClick={() => next(-1)}>
            <ChevronLeft />
          </IconButton>
          <IconButton label="Anuncio siguiente" onClick={() => next(1)}>
            <ChevronRight />
          </IconButton>
        </div>
      </div>
      <article
        className={`sponsor-banner campaign-${sponsor.visual}`}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          const delta = touch.current - e.changedTouches[0].clientX
          if (Math.abs(delta) > 40) next(delta > 0 ? 1 : -1)
        }}
      >
        <SponsorArt sponsor={sponsor} />
        <div>
          <span className="ad-label">PUBLICIDAD · DEMOSTRACIÓN VISUAL</span>
          <h3>{sponsor.name}</h3>
          <p>{ad.title}</p>
          <button onClick={() => setDetail(true)}>
            Conocer más <ArrowRight />
          </button>
        </div>
        <span className="ad-pagination">
          {(index % ads.length) + 1} / {ads.length}
        </span>
      </article>
      {detail && (
        <Modal title={sponsor.name} onClose={() => setDetail(false)}>
          <SponsorArt sponsor={sponsor} />
          {sponsor.image && (
            <a className="text-action" href={sponsor.image.url} target="_blank" rel="noreferrer">
              Ver imagen completa <ArrowRight />
            </a>
          )}
          <p>{sponsor.message}</p>
          <div className="info-strip">
            <Shield />
            Campaña conceptual de demostración. No confirma un patrocinio ni modifica las condiciones de
            las rutas.
          </div>
          <p className="muted">{sponsor.contact}</p>
          <Button onClick={() => setDetail(false)}>Entendido</Button>
        </Modal>
      )}
    </section>
  )
}
export function SaveButton({ route }: { route: RouteData }) {
  const { state, update, notify, isDemo } = useDemo(),
    saved = state.savedIds.includes(route.id)
  return (
    <Button
      variant={saved ? 'secondary' : 'primary'}
      onClick={() => {
        const accepted = update((s) => ({
          ...s,
          savedIds: saved ? s.savedIds.filter((id) => id !== route.id) : [...s.savedIds, route.id],
        }))
        if (!accepted) return
        notify(
          saved
            ? 'Ruta retirada de guardadas'
            : isDemo
              ? 'Ruta guardada en la demo de esta pestaña.'
              : 'Sincronizando tu ruta guardada con tu cuenta.',
        )
      }}
    >
      {saved ? <Check /> : <Heart />}
      {saved ? 'Guardada' : 'Guardar ruta'}
    </Button>
  )
}
