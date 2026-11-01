'use client'

import type { ReactNode } from 'react'
import { ArrowRight, Bell, LockKeyhole, Navigation, Shield, Users, type LucideIcon } from 'lucide-react'
import { Button, Modal, activeBanners } from './components'
import { useDemo } from './store'

const tips: { icon: LucideIcon; title: string; text: string; action: string; page: string }[] = [
  {
    icon: Shield,
    title: 'Revisa el horario antes de salir',
    text: 'Las condiciones de cada tramo cambian con la hora.',
    action: 'Ver mapa',
    page: 'map',
  },
  {
    icon: Navigation,
    title: 'Comparte tu recorrido',
    text: 'Activa un enlace temporal solo con personas de confianza.',
    action: 'Ir a seguridad',
    page: 'security',
  },
]

function NewsItem({
  icon: Icon,
  label,
  title,
  text,
  action,
  onAction,
}: {
  icon: LucideIcon
  label: ReactNode
  title: string
  text: string
  action?: string
  onAction?: () => void
}) {
  return (
    <article className="news-item">
      <span className="news-icon">
        <Icon />
      </span>
      <div>
        <span className="news-label">{label}</span>
        <h3>{title}</h3>
        <p>{text}</p>
        {action && (
          <button type="button" className="text-action" onClick={onAction}>
            {action} <ArrowRight />
          </button>
        )}
      </div>
    </article>
  )
}

export default function NewsCenter({
  close,
  go,
}: {
  close: () => void
  go: (page: string) => void
}) {
  const { state, user, openAccount } = useDemo()
  const open = (page: string) => {
    close()
    go(page)
  }
  const personal = [
    ...state.moderation.map((item) => ({
      id: item.id,
      title: item.item,
      text: `${item.decision} · ${new Date(item.date).toLocaleDateString('es')}`,
      page: 'reports',
    })),
    ...state.incidents
      .filter((incident) => incident.owned)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((incident) => ({
        id: incident.id,
        title: `Reporte: ${incident.type}`,
        text: `Estado: ${incident.status}`,
        page: 'reports',
      })),
    ...state.customRoutes
      .filter((route) => route.owned && route.status)
      .map((route) => ({
        id: route.id,
        title: `Ruta: ${route.name}`,
        text: `Estado: ${route.status}`,
        page: 'myroutes',
      })),
  ].slice(0, 4)
  const clubNotice = activeBanners(state.banners, state.sponsors, 'explore').find(
    (banner) =>
      state.sponsors.find((sponsor) => sponsor.id === banner.sponsorId)?.name === state.clubName,
  )
  const forYou = (
    <section className="news-group" aria-label="Notificaciones personales">
      <h3 className="news-heading">
        <LockKeyhole /> Para ti <small>Solo tú lo ves</small>
      </h3>
      {personal.length ? (
        personal.map((item) => (
          <NewsItem
            key={item.id}
            icon={Bell}
            label="Notificación personal"
            title={item.title}
            text={item.text}
            action="Ver detalle"
            onAction={() => open(item.page)}
          />
        ))
      ) : user ? (
        <p className="news-empty">
          <strong>Sin notificaciones nuevas.</strong> Las revisiones de tus reportes y rutas
          aparecerán aquí.
        </p>
      ) : (
        <div className="news-empty">
          <p>Inicia sesión para ver el estado de tus reportes y rutas.</p>
          <Button
            variant="secondary"
            onClick={() => {
              close()
              openAccount()
            }}
          >
            Iniciar sesión
          </Button>
        </div>
      )}
    </section>
  )
  return (
    <Modal title="Tu centro de novedades" onClose={close}>
      <div className="news-center">
        {personal.length > 0 && forYou}
        <section className="news-featured navy-zone" aria-label="Aviso del club">
          <div className="news-featured-head">
            <span className="club-letter">G</span>
            <div>
              <span className="gacelas-brand">{state.clubName}</span>
              <small>Aviso del club · público</small>
            </div>
            <span className="news-sample">Ejemplo</span>
          </div>
          <p>
            {clubNotice?.title ??
              (state.clubDescription || 'Los avisos del club aparecerán aquí cuando se publiquen.')}
          </p>
          <button type="button" className="text-action" onClick={() => open('club')}>
            Conocer al club <ArrowRight />
          </button>
        </section>
        <section className="news-group" aria-label="Salidas grupales">
          <NewsItem
            icon={Users}
            label={
              <>
                Salida grupal <span className="news-sample">Ejemplo</span>
              </>
            }
            title="Aún no hay salidas publicadas"
            text="Cuando el club publique una, verás aquí su fecha, hora y lugar."
            action="Ver rutas del club"
            onAction={() => open('club')}
          />
        </section>
        <section className="news-group" aria-label="Consejos para corredores">
          {tips.map(({ page, action, ...tip }) => (
            <NewsItem
              key={page}
              {...tip}
              label="Consejo"
              action={action}
              onAction={() => open(page)}
            />
          ))}
        </section>
        {!personal.length && forYou}
      </div>
    </Modal>
  )
}
