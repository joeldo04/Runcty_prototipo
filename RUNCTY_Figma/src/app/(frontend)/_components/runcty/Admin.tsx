import { useState } from 'react'
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Edit3,
  Flag,
  MapPin,
  Megaphone,
  MessageSquare,
  Mountain,
  Pause,
  Play,
  Plus,
  Route,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import SafetyMap from './SafetyMap'
import {
  activeBanners,
  AdCarousel,
  Button,
  Confirm,
  DemoTag,
  EmptyState,
  Modal,
  PageTitle,
  RoutePreview,
  Score,
  Status,
} from './components'
import {
  routeScore,
  today,
  uid,
  isAdminUser,
  type Banner,
  type ClubAlert,
  type DemoUser,
  type Incident,
  type ReviewStatus,
  type RiskZone,
  type RouteData,
  type Space,
  type Sponsor,
} from './data'
import { useDemo, useRoutes, type DemoState } from './store'
import { NetworkImport } from './NetworkImport'

// La marca y su retiro quedan en el historial de moderación.
const logAlert = (state: DemoState, item: string, before?: ClubAlert, after?: ClubAlert) =>
  !before === !after && before?.reason === after?.reason
    ? state.moderation
    : [
        {
          id: uid(),
          date: new Date().toISOString(),
          item,
          decision: after ? 'No recomendado' : 'Restricción retirada',
          reason: after?.reason ?? before?.reason ?? '',
        },
        ...state.moderation,
      ]
function AlertFields({
  value,
  onChange,
}: {
  value?: ClubAlert
  onChange: (alert?: ClubAlert) => void
}) {
  return (
    <div className="alert-fields">
      <label className="checkbox">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked ? { reason: '', date: today() } : undefined)}
        />
        Marcar temporalmente como no recomendado
      </label>
      {value && (
        <label className="field">
          Motivo visible para los corredores
          <input
            required
            maxLength={120}
            value={value.reason}
            onChange={(e) => onChange({ ...value, reason: e.target.value })}
          />
        </label>
      )}
    </div>
  )
}

export function ClubAdmin({ page, go }: { page: string; go: (page: string) => void }) {
  const { state } = useDemo(),
    all = useRoutes()
  if (page === 'moderate' || page === 'proposals')
    return <Moderation kind={page === 'moderate' ? 'incidents' : 'routes'} key={page} />
  if (page === 'sponsors' || page === 'banners')
    return <SponsorAdmin initialTab={page === 'banners' ? 'banners' : 'sponsors'} key={page} />
  if (page === 'official' || page === 'schedules') return <OfficialRoutes />
  if (page === 'adminspaces') return <SpacesAdmin />
  if (page === 'risks') return <RiskAdmin />
  if (page === 'comments') return <CommentsAdmin />
  if (page === 'moderationlog') return <ModerationLog />
  if (page === 'stats') return <Statistics />
  if (page === 'clubinfo') return <ClubInfo />
  const pending = state.incidents.filter((i) => i.status === 'Pendiente'),
    proposed = state.customRoutes.filter((r) => r.status === 'Pendiente')
  return (
    <div>
      <PageTitle
        eyebrow={<span className="gacelas-brand">CLUB DEPORTIVO GACELAS RUNNING TEAM</span>}
        title="Cuidamos cada recorrido."
        subtitle="Información, revisiones y decisiones para una comunidad mejor informada."
      >
        <DemoTag />
      </PageTitle>
      <div className="admin-kpis">
        {[
          {
            label: 'Reportes por revisar',
            value: pending.length,
            icon: ShieldAlert,
            target: 'moderate',
          },
          { label: 'Rutas propuestas', value: proposed.length, icon: Route, target: 'proposals' },
          {
            label: 'Rutas oficiales',
            value: all.filter((r) => r.official).length,
            icon: Check,
            target: 'official',
          },
          {
            label: 'Espacios recomendados',
            value: state.spaces.length,
            icon: MapPin,
            target: 'adminspaces',
          },
          {
            label: 'Aliados activos',
            value: state.sponsors.filter((s) => s.active).length,
            icon: Sparkles,
            target: 'sponsors',
          },
        ].map(({ label, value, icon: I, target }) => (
          <button key={label} onClick={() => go(target)}>
            <I />
            <strong>{value.toString().padStart(2, '0')}</strong>
            <span>
              {label}
              <ChevronRight />
            </span>
          </button>
        ))}
      </div>
      <div className="admin-overview-grid">
        <section className="admin-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PRIORIDAD DE REVISIÓN</span>
              <h2>La comunidad ha aportado.</h2>
            </div>
            <button className="text-action" onClick={() => go('moderate')}>
              Ver bandeja <ArrowRight />
            </button>
          </div>
          {pending.map((i) => (
            <button className="admin-inbox-item" key={i.id} onClick={() => go('moderate')}>
              <span>
                <Flag />
              </span>
              <div>
                <strong>{i.type}</strong>
                <p>{i.location} · {i.owner}</p>
              </div>
              <Status value={i.status} />
              <ChevronRight />
            </button>
          ))}
          {!pending.length && (
            <EmptyState title="Bandeja al día" description="Los nuevos reportes aparecerán aquí." />
          )}
        </section>
        <aside className="club-overview">
          <span className="eyebrow">ADMINISTRACIÓN DEL CLUB</span>
          <h2>
            Información que
            <br />
            acompaña.
          </h2>
          <p>
            Los índices son referenciales. Las decisiones del club actualizan las vistas del
            corredor.
          </p>
          <Button variant="secondary" onClick={() => go('moderationlog')}>
            Historial de moderación <ArrowRight />
          </Button>
        </aside>
      </div>
      <section className="admin-section">
        <div className="section-heading">
          <h2>Accesos de gestión</h2>
        </div>
        <div className="admin-shortcuts">
          {[
            { title: 'Horarios y rutas oficiales', icon: Clock3, page: 'official' },
            { title: 'Espacios y zonas de riesgo', icon: MapPin, page: 'risks' },
            { title: 'Patrocinadores y publicidad', icon: Megaphone, page: 'sponsors' },
          ].map(({ title, icon: I, page }) => (
            <button key={title} onClick={() => go(page)}>
              <I />
              {title}
              <ArrowRight />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function Moderation({ kind }: { kind: 'incidents' | 'routes' }) {
  const { state, update, notify, isDemo } = useDemo(),
    [tab, setTab] = useState<ReviewStatus>('Pendiente'),
    [query, setQuery] = useState(''),
    [review, setReview] = useState<string | null>(null),
    [reject, setReject] = useState(false),
    [reason, setReason] = useState('Duplicado')
  const allRoutes = useRoutes()
  const items = kind === 'incidents' ? state.incidents : allRoutes.filter((r) => r.status)
  const list = items.filter(
    (item) =>
      item.status === tab &&
      ('type' in item ? item.type : item.name).toLowerCase().includes(query.toLowerCase()),
  )
  const item = items.find((i) => i.id === review)
  const decision = (status: ReviewStatus) => {
    if (!item) return
    if (!update((s) => ({
      ...s,
      moderation: isDemo ? [{ id: uid(), date: new Date().toISOString(), item: 'type' in item ? item.type : item.name, decision: status, reason: status === 'Rechazado' ? reason : '' }, ...s.moderation] : s.moderation,
      incidents:
        kind === 'incidents'
          ? s.incidents.map((i) =>
              i.id === item.id
                ? { ...i, status, reason: status === 'Rechazado' ? reason : undefined }
                : i,
            )
          : s.incidents,
      customRoutes:
        kind === 'routes'
          ? s.customRoutes.map((r) =>
              r.id === item.id
                ? {
                    ...r,
                    status,
                    private: status !== 'Aprobado',
                    verified: status === 'Aprobado',
                    reason: status === 'Rechazado' ? reason : undefined,
                  }
                : r,
            )
          : s.customRoutes,
      catalog: kind === 'routes' ? s.catalog.map((r) => r.id === item.id
        ? { ...r, status, private: status !== 'Aprobado', verified: status === 'Aprobado', reason: status === 'Rechazado' ? reason : undefined }
        : r) : s.catalog,
    }))) return
    setReview(null)
    setReject(false)
    notify(
      isDemo ? `Decisión de demostración: ${status.toLowerCase()}. Solo se conserva en esta pestaña.` :
      status === 'Aprobado'
        ? kind === 'incidents'
          ? 'Sincronizando la aprobación. El reporte aparecerá en el mapa público si está vigente.'
          : 'Sincronizando la aprobación y publicación de la ruta.'
        : 'Sincronizando el rechazo. Su autor podrá consultar el motivo.',
    )
  }
  return (
    <div>
      <PageTitle
        eyebrow="MODERACIÓN EXCLUSIVA DE LA WEB DEL CLUB"
        title={
          kind === 'incidents'
            ? 'Revisa los aportes de la comunidad.'
            : 'Los próximos caminos del club.'
        }
        subtitle={
          kind === 'incidents'
            ? 'Solo los reportes aprobados y vigentes se muestran en el mapa.'
            : 'Las rutas rechazadas se mantienen privadas para su autor.'
        }
      >
        <DemoTag />
      </PageTitle>
      <div className="tabs">
        {(['Pendiente', 'Aprobado', 'Rechazado'] as ReviewStatus[]).map((status) => (
          <button
            key={status}
            className={tab === status ? 'active' : ''}
            onClick={() => setTab(status)}
          >
            {status === 'Pendiente'
              ? 'Pendientes'
              : status === 'Aprobado'
                ? 'Aprobadas'
                : 'Rechazadas'}
            <span>{items.filter((i) => i.status === status).length}</span>
          </button>
        ))}
      </div>
      <div className="search-box admin-search">
        <Search />
        <input
          aria-label="Buscar en moderación"
          placeholder="Buscar elemento…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{kind === 'incidents' ? 'Tipo de reporte' : 'Ruta propuesta'}</th>
              <th>Autor</th>
              <th>{kind === 'incidents' ? 'Ubicación' : 'Distancia / nivel'}</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{'type' in item ? item.type : item.name}</strong>
                  <small>{item.date}</small>
                </td>
                <td>{item.owner ?? 'Comunidad RUNCTY'}</td>
                <td>
                  {'type' in item ? item.location : `${item.km.toFixed(1)} km · ${item.difficulty}`}
                </td>
                <td>
                  <Status value={item.status ?? 'Pendiente'} />
                </td>
                <td>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setReview(item.id)
                      setReject(false)
                    }}
                  >
                    Revisar <ChevronRight />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <EmptyState
            title="No hay elementos en esta bandeja"
            description="Los aportes de la comunidad aparecen aquí después de sincronizarse."
          />
        )}
      </div>
      {item && (
        <Modal title={'type' in item ? item.type : item.name} onClose={() => setReview(null)} wide>
          <div className="moderation-detail-head">
            <span>{item.owner ?? 'Comunidad RUNCTY'} · {item.date}</span>
            <Status value={item.status ?? 'Pendiente'} />
          </div>
          <div className="modal-map">
            <SafetyMap
              route={'geometry' in item ? item : null}
              points={'coordinate' in item ? [item.coordinate] : undefined}
              focus={'coordinate' in item ? item.coordinate : undefined}
              fitRoute
              showReports={false}
            />
          </div>
          <p>{'description' in item ? item.description : item.desc}</p>
          <div className="info-strip">
            <Shield />
            Esta revisión editorial no certifica las condiciones actuales de seguridad.
          </div>
          {item.reason && <p>Motivo: {item.reason}</p>}
          {item.status === 'Pendiente' && (
            <>
              {reject && (
                <label className="field">
                  Motivo obligatorio de rechazo
                  <select value={reason} onChange={(e) => setReason(e.target.value)}>
                    {[
                      'Duplicado',
                      'Falso',
                      'Fuera de la ciudad',
                      'Ofensivo',
                      'Datos insuficientes',
                      'Otro',
                    ].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className="modal-actions">
                <Button
                  variant="secondary"
                  onClick={() => (reject ? decision('Rechazado') : setReject(true))}
                >
                  <X />
                  {reject ? 'Confirmar rechazo' : 'Rechazar'}
                </Button>
                <Button onClick={() => decision('Aprobado')}>
                  <Check />
                  Aprobar{kind === 'routes' ? ' y publicar' : ''}
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}

function SponsorAdmin({ initialTab }: { initialTab: string }) {
  const { state, update, notify } = useDemo(),
    [tab, setTab] = useState(initialTab),
    [edit, setEdit] = useState<Sponsor | null>(null),
    [banner, setBanner] = useState<Banner | null>(null),
    [deactivate, setDeactivate] = useState<string | null>(null),
    [preview, setPreview] = useState<Banner | null>(null)
  const newSponsor = () =>
    setEdit({ id: uid(), name: '', message: '', contact: '', active: true, visual: 'mountain' })
  const newBanner = () => {
    if (!state.sponsors.length) {
      notify('Crea primero un patrocinador.')
      newSponsor()
      return
    }
    setBanner({
      id: uid(),
      sponsorId: state.sponsors[0].id,
      title: '',
      start: today(),
      end: '2030-12-31',
      placement: 'explore',
      status: 'Borrador',
    })
  }
  const setStatus = (id: string, status: Banner['status']) => {
    const b = state.banners.find((x) => x.id === id)
    if (status === 'Publicado' && b && b.end < b.start) {
      notify('Corrige las fechas de vigencia.')
      return
    }
    if (!update((s) => ({ ...s, banners: s.banners.map((b) => (b.id === id ? { ...b, status } : b)) }))) return
    notify(
      status === 'Publicado'
        ? 'Sincronizando la publicación. El banner se mostrará si la vigencia y el patrocinador están activos.'
        : status === 'Pausado'
          ? 'Sincronizando la pausa del banner.'
          : 'Sincronizando la retirada del banner.',
    )
  }
  return (
    <div>
      <PageTitle
        eyebrow="ALIADOS QUE IMPULSAN RUNCTY"
        title="Patrocinios con propósito."
        subtitle="Aliados del club, publicidad discreta y publicación bajo tu control."
      >
        <Button variant="secondary" onClick={newBanner}>
          <Plus />
          Crear banner
        </Button>
        <Button onClick={newSponsor}>
          <Plus />
          Nuevo patrocinador
        </Button>
      </PageTitle>
      <div className="tabs">
        <button className={tab === 'sponsors' ? 'active' : ''} onClick={() => setTab('sponsors')}>
          Patrocinadores <span>{state.sponsors.length}</span>
        </button>
        <button className={tab === 'banners' ? 'active' : ''} onClick={() => setTab('banners')}>
          Banners <span>{state.banners.length}</span>
        </button>
      </div>
      {tab === 'sponsors' ? (
        <div className="sponsor-grid">
          {state.sponsors.map((s) => (
            <article className="sponsor-admin-card" key={s.id}>
              <div className={`sponsor-monogram art-${s.visual}`}>{s.name.charAt(0)}</div>
              <Status value={s.active ? 'Activo' : 'Inactivo'} />
              <h3>{s.name}</h3>
              <p>{s.message}</p>
              <small>{s.contact}</small>
              <div>
                <Button variant="secondary" onClick={() => setEdit(s)}>
                  <Edit3 />
                  Editar
                </Button>
                <button
                  className="text-action"
                  onClick={() =>
                    s.active
                      ? setDeactivate(s.id)
                      : update((x) => ({
                          ...x,
                          sponsors: x.sponsors.map((sp) =>
                            sp.id === s.id ? { ...sp, active: true } : sp,
                          ),
                        }))
                  }
                >
                  {s.active ? 'Desactivar' : 'Reactivar'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Banner / patrocinador</th>
                <th>Vigencia</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {state.banners.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.title}</strong>
                    <small>{state.sponsors.find((s) => s.id === b.sponsorId)?.name}</small>
                  </td>
                  <td>
                    {b.start}
                    <small>hasta {b.end}</small>
                  </td>
                  <td>
                    {b.placement === 'explore'
                      ? 'Explorar'
                      : b.placement === 'catalog'
                        ? 'Catálogo'
                        : 'Club'}
                  </td>
                  <td>
                    <Status value={b.status} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <button onClick={() => setPreview(b)}>Vista previa</button>
                      <button onClick={() => setBanner(b)}>Editar</button>
                      {b.status !== 'Retirado' && (
                        <>
                          <button
                            onClick={() =>
                              setStatus(b.id, b.status === 'Publicado' ? 'Pausado' : 'Publicado')
                            }
                          >
                            {b.status === 'Publicado' ? 'Pausar' : 'Publicar'}
                          </button>
                          <button onClick={() => setStatus(b.id, 'Retirado')}>Retirar</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="info-strip">
        <Megaphone />
        Solo aparecen banners publicados, vigentes y de patrocinadores activos. Nunca se muestra
        publicidad durante entrenamientos o SOS.
      </div>
      {edit && (
        <Modal
          title={
            state.sponsors.some((s) => s.id === edit.id)
              ? 'Editar patrocinador'
              : 'Crear patrocinador'
          }
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!update((s) => ({
                ...s,
                sponsors: s.sponsors.some((sp) => sp.id === edit.id)
                  ? s.sponsors.map((sp) => (sp.id === edit.id ? edit : sp))
                  : [...s.sponsors, edit],
              }))) return
              setEdit(null)
              notify('Sincronizando el patrocinador con Payload.')
            }}
          >
            <label className="field">
              Nombre del patrocinador
              <input
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                maxLength={45}
              />
            </label>
            <label className="field">
              Mensaje
              <input
                required
                value={edit.message}
                onChange={(e) => setEdit({ ...edit, message: e.target.value })}
                maxLength={100}
              />
            </label>
            <label className="field">
              Contacto
              <input
                type="email"
                required
                value={edit.contact}
                onChange={(e) => setEdit({ ...edit, contact: e.target.value })}
              />
            </label>
            <label className="field">
              Identidad visual de demostración
              <select
                value={edit.visual}
                onChange={(e) => setEdit({ ...edit, visual: e.target.value })}
              >
                <option value="mountain">Montaña · Andina</option>
                <option value="sunrise">Amanecer · Energía</option>
                <option value="shoe">Running · Movimiento</option>
              </select>
            </label>
            <Button type="submit">Guardar patrocinador</Button>
          </form>
        </Modal>
      )}
      {banner && (
        <Modal
          title={state.banners.some((b) => b.id === banner.id) ? 'Editar banner' : 'Crear banner'}
          onClose={() => setBanner(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (banner.end < banner.start) {
                notify('La fecha final debe ser posterior a la inicial.')
                return
              }
              if (!update((s) => ({
                ...s,
                banners: s.banners.some((b) => b.id === banner.id)
                  ? s.banners.map((b) => (b.id === banner.id ? banner : b))
                  : [...s.banners, banner],
              }))) return
              setBanner(null)
              setTab('banners')
              notify('Sincronizando el banner. Confirma el guardado antes de publicarlo.')
            }}
          >
            <label className="field">
              Patrocinador
              <select
                value={banner.sponsorId}
                onChange={(e) => setBanner({ ...banner, sponsorId: e.target.value })}
              >
                {state.sponsors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Mensaje del banner
              <input
                required
                value={banner.title}
                maxLength={90}
                onChange={(e) => setBanner({ ...banner, title: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label className="field">
                Inicio
                <input
                  type="date"
                  required
                  value={banner.start}
                  onChange={(e) => setBanner({ ...banner, start: e.target.value })}
                />
              </label>
              <label className="field">
                Finalización
                <input
                  type="date"
                  required
                  value={banner.end}
                  min={banner.start}
                  onChange={(e) => setBanner({ ...banner, end: e.target.value })}
                />
              </label>
            </div>
            <label className="field">
              Ubicación de publicación
              <select
                value={banner.placement}
                onChange={(e) =>
                  setBanner({ ...banner, placement: e.target.value as Banner['placement'] })
                }
              >
                <option value="explore">Explorar · web y móvil</option>
                <option value="catalog">Catálogo de rutas</option>
                <option value="club">Página pública del club</option>
              </select>
            </label>
            <p className="muted">
              Ciudad: Loja · Ilustración vinculada a la identidad del patrocinador.
            </p>
            <Button type="submit">Guardar banner</Button>
          </form>
        </Modal>
      )}
      {deactivate && (
        <Confirm
          title="¿Desactivar patrocinador?"
          message="Sus banners dejarán de aparecer automáticamente en todas las experiencias."
          label="Desactivar"
          onClose={() => setDeactivate(null)}
          confirm={() => {
            if (!update((s) => ({
              ...s,
              sponsors: s.sponsors.map((sp) =>
                sp.id === deactivate ? { ...sp, active: false } : sp,
              ),
            }))) return false
            notify('Sincronizando la desactivación del patrocinador.')
          }}
        />
      )}
      {preview && (
        <Modal title="Vista previa del banner" onClose={() => setPreview(null)}>
          <article className="banner-preview">
            <Mountain />
            <span className="ad-label">PUBLICIDAD</span>
            <h3>{state.sponsors.find((s) => s.id === preview.sponsorId)?.name}</h3>
            <p>{preview.title}</p>
          </article>
          <Status value={preview.status} />
          <p>
            {preview.start} — {preview.end} · Loja
          </p>
        </Modal>
      )}
    </div>
  )
}

function OfficialRoutes() {
  const { state, update, notify, isDemo } = useDemo(),
    all = useRoutes(),
    [edit, setEdit] = useState<RouteData | null>(null)
  const save = () => {
    if (!edit) return
    if (edit.alert && !edit.alert.reason.trim()) {
      notify('Escribe el motivo de la marca.')
      return
    }
    const previous = all.find((r) => r.id === edit.id)?.alert
    if (!update((s) => ({
      ...s,
      moderation: logAlert(s, edit.name, previous, edit.alert),
      routeOverrides: {
        ...s.routeOverrides,
        [edit.id]: {
          ...s.routeOverrides[edit.id],
          official: edit.official,
          recommended: edit.recommended,
          baseline: edit.baseline,
          validated: edit.validated,
          ...(isDemo ? { alert: edit.alert } : {}),
        },
      },
    }))) return
    setEdit(null)
    notify('Sincronizando los criterios y horarios de la ruta.')
  }
  return (
    <div>
      <PageTitle
        eyebrow="CRITERIOS Y VALIDACIÓN DEL CLUB"
        title="Rutas oficiales y horarios."
        subtitle="Distintivos, línea base y revisión anual."
      />
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ruta</th>
              <th>Distintivo</th>
              <th>Horarios recomendados</th>
              <th>Validación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {all
              .filter((r) => !r.private || r.status === 'Aprobado')
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <small>{r.km} km</small>
                  </td>
                  <td>
                    {r.official ? (
                      <span className="verified">
                        <Check />
                        Oficial Gacelas
                      </span>
                    ) : (
                      <span className="muted">Sin distintivo</span>
                    )}
                    {r.alert && <span className="route-flag danger">No recomendado</span>}
                  </td>
                  <td>{r.recommended}</td>
                  <td>{r.validated ?? 'Pendiente de validación anual'}</td>
                  <td>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setEdit({
                          ...r,
                          baseline: r.baseline ?? 75,
                          validated: r.validated ?? today(),
                        })
                      }
                    >
                      Gestionar
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal title={edit.name} onClose={() => setEdit(null)}>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={!!edit.official}
              onChange={(e) => setEdit({ ...edit, official: e.target.checked })}
            />
            Oficial Gacelas
          </label>
          <label className="field">
            Horarios recomendados
            <input
              value={edit.recommended ?? ''}
              onChange={(e) => setEdit({ ...edit, recommended: e.target.value })}
            />
          </label>
          <label className="field">
            Línea base de referencia (0–100)
            <input
              type="number"
              min={0}
              max={100}
              value={edit.baseline ?? 75}
              onChange={(e) => setEdit({ ...edit, baseline: +e.target.value })}
            />
          </label>
          <label className="field">
            Fecha de validación
            <input
              type="date"
              value={edit.validated ?? today()}
              onChange={(e) => setEdit({ ...edit, validated: e.target.value })}
            />
          </label>
          {isDemo && <AlertFields value={edit.alert} onChange={(alert) => setEdit({ ...edit, alert })} />}
          <p className="muted">
            La línea base se registra como referencia del club. El índice horario continúa
            calculándose por tramos.
          </p>
          <Button onClick={save}>Guardar cambios</Button>
        </Modal>
      )}
    </div>
  )
}
function SpacesAdmin() {
  const { state, update, notify, isDemo } = useDemo(),
    [edit, setEdit] = useState<Space | null>(null),
    [remove, setRemove] = useState<string | null>(null)
  return (
    <div>
      <PageTitle eyebrow="RECOMENDACIONES DEL CLUB" title="Espacios para la comunidad.">
        <Button
          onClick={() =>
            setEdit({
              id: uid(),
              name: '',
              type: 'Parque',
              location: 'Loja',
              hours: '08:00–17:00',
              description: '',
              coordinate: [-3.9736, -79.2027],
            })
          }
        >
          <Plus />
          Nuevo espacio
        </Button>
      </PageTitle>
      <div className="space-admin-list">
        {state.spaces.map((s) => (
          <article key={s.id}>
            <MapPin />
            <div>
              <h3>{s.name}</h3>
              <p>
                {s.type} · {s.location} · {s.hours}
              </p>
              {s.alert && <span className="route-flag danger">No recomendado</span>}
            </div>
            <Button variant="secondary" onClick={() => setEdit(s)}>
              Editar
            </Button>
            <button aria-label={`Eliminar ${s.name}`} onClick={() => setRemove(s.id)}>
              <Trash2 />
            </button>
          </article>
        ))}
      </div>
      {edit && (
        <Modal title="Gestionar espacio" onClose={() => setEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!update((s) => ({
                ...s,
                moderation: logAlert(s, edit.name, s.spaces.find((sp) => sp.id === edit.id)?.alert, edit.alert),
                spaces: s.spaces.some((sp) => sp.id === edit.id)
                  ? s.spaces.map((sp) => (sp.id === edit.id ? edit : sp))
                  : [...s.spaces, edit],
              }))) return
              setEdit(null)
              notify('Sincronizando el espacio con la vista pública.')
            }}
          >
            <label className="field">
              Nombre
              <input
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label className="field">
              Tipo
              <select
                value={edit.type}
                onChange={(e) => setEdit({ ...edit, type: e.target.value })}
              >
                <option>Parque</option>
                <option>Sendero</option>
                <option>Estadio</option>
                <option>Ciclovía</option>
                <option>Pista atlética</option>
              </select>
            </label>
            <label className="field">
              Ubicación
              <input
                required
                value={edit.location}
                onChange={(e) => setEdit({ ...edit, location: e.target.value })}
              />
            </label>
            <label className="field">
              Horarios
              <input
                required
                value={edit.hours}
                onChange={(e) => setEdit({ ...edit, hours: e.target.value })}
              />
            </label>
            <label className="field">
              Descripción
              <textarea
                value={edit.description}
                onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              />
            </label>
            {isDemo && <AlertFields value={edit.alert} onChange={(alert) => setEdit({ ...edit, alert })} />}
            <Button type="submit">Guardar espacio</Button>
          </form>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="¿Eliminar espacio?"
          message="Dejará de aparecer entre las recomendaciones del club."
          label="Eliminar"
          onClose={() => setRemove(null)}
          confirm={() =>
            update((s) => ({ ...s, spaces: s.spaces.filter((sp) => sp.id !== remove) }))
          }
        />
      )}
    </div>
  )
}
function RiskAdmin() {
  const { state, update, notify } = useDemo(),
    [edit, setEdit] = useState<RiskZone | null>(null)
  return (
    <div>
      <PageTitle
        eyebrow="CRITERIOS REFERENCIALES DEL CLUB"
        title="Zonas de riesgo."
        subtitle="Las zonas confidenciales influyen en el índice sin publicar sus detalles."
      >
        <Button
          disabled={!state.roads.length}
          onClick={() =>
            setEdit({
              id: uid(),
              name: '',
              reason: '',
              confidential: true,
              expires: '2030-12-31',
              streetId: state.roads[0]?.id ?? '',
              source: '',
              date: today(),
            })
          }
        >
          <Plus />
          Registrar zona
        </Button>
      </PageTitle>
      {!state.roads.length && <p className="info-strip">Registra primero una red vial validada en Payload para relacionar las zonas de riesgo con sus tramos.</p>}
      <div className="info-strip">
        <Shield />
        Cada zona vigente reduce siete puntos el índice de su tramo en esta simulación. No se
        atribuyen condiciones reales a una calle.
      </div>
      {!state.risks.length ? (
        <EmptyState
          title="No hay zonas registradas"
          description="Añade un escenario ficticio para observar su influencia en el índice."
        />
      ) : (
        state.risks.map((r) => (
          <div className="risk-item" key={r.id}>
            <ShieldAlert />
            <div>
              <h3>{r.name}</h3>
              <p>
                {state.roads.find((s) => s.id === r.streetId)?.name} ·{' '}
                {r.confidential ? 'Confidencial' : 'Pública'} · hasta {r.expires}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setEdit(r)}>
              Editar
            </Button>
          </div>
        ))
      )}
      {edit && (
        <Modal title="Registrar escenario de riesgo" onClose={() => setEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!update((s) => ({
                ...s,
                risks: s.risks.some((r) => r.id === edit.id)
                  ? s.risks.map((r) => (r.id === edit.id ? edit : r))
                  : [...s.risks, edit],
              }))) return
              setEdit(null)
              notify('Sincronizando la zona y los índices del tramo.')
            }}
          >
            <label className="field">
              Nombre del escenario
              <input
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label className="field">
              Tramo
              <select
                value={edit.streetId}
                onChange={(e) => setEdit({ ...edit, streetId: e.target.value })}
              >
                {state.roads.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Fuente
              <input
                required
                value={edit.source}
                onChange={(e) => setEdit({ ...edit, source: e.target.value })}
              />
            </label>
            <label className="field">
              Motivo
              <textarea
                required
                value={edit.reason}
                onChange={(e) => setEdit({ ...edit, reason: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label className="field">
                Fecha del dato
                <input
                  type="date"
                  value={edit.date}
                  onChange={(e) => setEdit({ ...edit, date: e.target.value })}
                />
              </label>
              <label className="field">
                Vigencia
                <input
                  type="date"
                  value={edit.expires}
                  onChange={(e) => setEdit({ ...edit, expires: e.target.value })}
                />
              </label>
            </div>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={edit.confidential}
                onChange={(e) => setEdit({ ...edit, confidential: e.target.checked })}
              />
              Ocultar detalles al público
            </label>
            <Button type="submit">Guardar zona</Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
function CommentsAdmin() {
  const { state, update, notify } = useDemo(),
    [status, setStatus] = useState('Pendiente'),
    [reject, setReject] = useState<string | null>(null),
    [reason, setReason] = useState('Ofensivo')
  const decide = (id: string, result: string, reason = '') => {
    if (!update((s) => ({
      ...s,
      comments: s.comments.map((c) => (c.id === id ? { ...c, status: result, reason } : c)),
    }))) return false
    notify('Sincronizando la revisión del comentario.')
    return true
  }
  return (
    <div>
      <PageTitle title="Valoraciones y comentarios." />
      <div className="tabs">
        {['Pendiente', 'Aprobado', 'Rechazado'].map((s) => (
          <button className={s === status ? 'active' : ''} onClick={() => setStatus(s)} key={s}>
            {s}
          </button>
        ))}
      </div>
      {state.comments
        .filter((c) => c.status === status)
        .map((c) => (
          <div className="comment-review" key={c.id}>
            <MessageSquare />
            <div>
              <p>{c.text}</p>
              <Status value={c.status} />
            </div>
            {c.status === 'Pendiente' && (
              <>
                <Button variant="secondary" onClick={() => setReject(c.id)}>
                  Rechazar
                </Button>
                <Button onClick={() => decide(c.id, 'Aprobado')}>Aprobar</Button>
              </>
            )}
          </div>
        ))}
      {reject && (
        <Modal title="Motivo de rechazo" onClose={() => setReject(null)}>
          <label className="field">
            Motivo
            <input value={reason} required onChange={(e) => setReason(e.target.value)} />
          </label>
          <Button
            disabled={!reason.trim()}
            onClick={() => {
              if (decide(reject, 'Rechazado', reason)) setReject(null)
            }}
          >
            Confirmar rechazo
          </Button>
        </Modal>
      )}
    </div>
  )
}
function ModerationLog() {
  const { state, isDemo } = useDemo()
  return (
    <>
      <PageTitle eyebrow={isDemo ? 'TRAZABILIDAD DE ESTA DEMOSTRACIÓN' : 'TRAZABILIDAD DEL SERVIDOR'} title="Historial de moderación." />
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Moderador</th>
              <th>Elemento</th>
              <th>Decisión</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {state.moderation.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.date).toLocaleString('es')}</td>
                <td>Club Gacelas</td>
                <td>{m.item}</td>
                <td>
                  <Status value={m.decision} />
                </td>
                <td>{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!state.moderation.length && (
          <EmptyState
            title="Todavía no hay decisiones"
            description="Las acciones de revisión se registrarán aquí."
          />
        )}
      </div>
    </>
  )
}
function Statistics() {
  const { state } = useDemo()
  const routes = useRoutes()
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * 86400000)
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
    return {
      label: date.toLocaleDateString('es', { weekday: 'narrow', timeZone: 'America/Guayaquil' }),
      count: state.incidents.filter(incident => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(incident.createdAt)) === key).length,
    }
  })
  const maximum = Math.max(1, ...days.map(day => day.count))
  return (
    <>
      <PageTitle
        eyebrow="SIN DATOS PERSONALES NI UBICACIONES PRIVADAS"
        title="Una visión de conjunto."
      />
      <div className="admin-kpis">
        {[
          { label: 'Rutas públicas disponibles', value: routes.filter(route => !route.private && route.status === 'Aprobado').length, icon: Route },
          {
            label: 'Reportes aprobados',
            value: state.incidents.filter((i) => i.status === 'Aprobado').length,
            icon: Flag,
          },
          {
            label: 'Banners publicados',
            value: state.banners.filter((b) => b.status === 'Publicado').length,
            icon: Megaphone,
          },
        ].map(({ label, value, icon: I }) => (
          <div key={label}>
            <I />
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="admin-section">
        <h2>Aportes recibidos · últimos siete días</h2>
        <div className="stats-bars">
          {days.map((day, i) => (
            <div key={i}>
              <span title={`${day.count} aportes`} style={{ '--bar-height': `${Math.max(2, day.count / maximum * 100)}%` } as React.CSSProperties} />
              <small>{day.label} · {day.count}</small>
            </div>
          ))}
        </div>
        <DemoTag />
      </section>
    </>
  )
}
function ClubInfo() {
  const { state, update, notify } = useDemo()
  const [text, setText] = useState(state.clubDescription)
  return (
    <>
      <PageTitle title="Información del club." />
      <section className="admin-section">
        <label className="field">
          Presentación
          <textarea rows={6} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <Button
          disabled={!text.trim() || text === state.clubDescription}
          onClick={() => {
            if (update(s => ({ ...s, clubDescription: text.trim() })))
              notify('Sincronizando la presentación del club con Payload.')
          }}
        >
          Guardar presentación
        </Button>
      </section>
    </>
  )
}

export function SystemAdmin({ page }: { page: string }) {
  const { state, user, isDemo, update, notify } = useDemo(),
    [query, setQuery] = useState(''),
    [role, setRole] = useState('Todos'),
    [sensitive, setSensitive] = useState<string | null>(null),
    [roleChange, setRoleChange] = useState<DemoUser | null>(null),
    [importing, setImporting] = useState<string | null>(null)
  if (page === 'cities')
    return (
      <>
        <PageTitle eyebrow="COBERTURA DEL SISTEMA" title="Ciudades y red de calles." />
        {state.cities.map(city => <div className="city-network-card" key={city.id}>
          <MapPin />
          <div>
            <h2>{city.name}</h2>
            <p>{city.networkReady ? 'Red registrada y validada por el sistema' : 'Pendiente de carga y validación de la red'}</p>
            <small>{city.id === 'loja' ? `${state.roads.length} tramos publicados` : 'La vista cartográfica de esta versión está centrada en Loja.'}</small>
          </div>
          <Status value={city.enabled ? 'Activo' : 'Inactivo'} />
          <Button disabled={!city.networkReady} variant="secondary" onClick={() => {
            if (update(s => ({ ...s, cities: s.cities.map(value => value.id === city.id ? { ...value, enabled: !value.enabled } : value) })))
              notify('Sincronizando la disponibilidad de la ciudad.')
          }}>{city.enabled ? 'Deshabilitar' : 'Habilitar'}</Button>
          {isDemo && <Button variant="secondary" onClick={() => setImporting(city.id)}>Cargar red</Button>}
        </div>)}
        {!state.cities.length && <EmptyState title="Aún no hay ciudades configuradas" description="Registra las ciudades y su red vial validada en Payload. No se simulan importaciones ni se inventa cobertura." />}
        <div className="info-strip">
          {isDemo ? 'La cartografía base procede de OpenStreetMap / CARTO. La carga de redes es una simulación: valida el archivo sin guardarlo.' : 'La cartografía base procede de OpenStreetMap / CARTO. Las redes y los índices se administran en Payload; no hay un importador automático conectado.'}
        </div>
        {state.cities.filter((city) => city.id === importing).map((city) => <NetworkImport key={city.id} city={city} close={() => setImporting(null)} />)}
      </>
    )
  if (page === 'parameters')
    return (
      <>
        <PageTitle
          eyebrow="FÓRMULA DOCUMENTADA · DEMOSTRACIÓN V2"
          title="Información, no certezas."
        />
        <div className="parameters-grid">
          <section className="admin-section">
            <h2>Índice por tramo y franja</h2>
            <p className="muted">
              Escenarios base reproducibles, ajuste de fin de semana (+2), reportes aprobados
              cercanos (−5, máximo −15), zonas vigentes (−7, máximo −21). Rango 0–100.
            </p>
            {[
              ['Iluminación', 'Variable según tramo'],
              ['Tipo de vía', 'Integrado en escenario base'],
              ['Horario', '05:30 · 08:00 · 14:00 · 19:00'],
              ['Promedio de ruta', 'Ponderado por longitud'],
              ['Datos insuficientes', 'Sin puntuación; cobertura visible'],
            ].map(([a, b]) => (
              <div className="parameter-row" key={a}>
                <strong>{a}</strong>
                <span>{b}</span>
              </div>
            ))}
          </section>
          <aside className="admin-section">
            <Shield />
            <h2>Franjas de precaución del club</h2>
            <div className="risk-time">05:00–07:00</div>
            <div className="risk-time">18:00–20:00</div>
            <p className="muted">
              No todas las calles tienen el mismo índice de noche. Cada tramo tiene su escenario.
            </p>
            <DemoTag />
          </aside>
        </div>
      </>
    )
  const list = state.users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) &&
      (role === 'Todos' || (role === 'Administrador' ? isAdminUser(u) : u.role === 'corredor')),
  )
  const admins = state.users.filter((u) => u.active && isAdminUser(u)).length
  const lastAdmin = (u: DemoUser) => isAdminUser(u) && admins <= 1
  return (
    <>
      <PageTitle
        eyebrow="ACCESO RESTRINGIDO · SISTEMA"
        title="Gestión de usuarios."
        subtitle={isDemo ? 'Una cuenta puede ser corredor y administrador. Da o quita el rol de administrador; esta demo no cambia cuentas reales.' : 'Cuentas de la aplicación. Las acciones sensibles requieren confirmación; los roles se asignan desde Payload.'}
      />
      <div className="route-filters">
        <div className="search-box">
          <Search />
          <input
            aria-label="Buscar usuarios"
            placeholder="Buscar nombre o rol…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select value={role} aria-label="Rol de usuario" onChange={(e) => setRole(e.target.value)}>
          <option>Todos</option>
          <option>Corredor</option>
          <option>Administrador</option>
        </select>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cuenta</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                  <small>Cuenta RUNCTY</small>
                </td>
                <td>
                  <div className="role-chips">
                    {u.role === 'corredor' && <span>Corredor</span>}
                    {isAdminUser(u) && (
                      <span className="admin">
                        {u.role === 'sistema' ? 'Administrador del sistema' : 'Administrador del club'}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <Status value={u.active ? 'Activo' : 'Inactivo'} />
                </td>
                <td>
                  <div className="table-actions-wrap">
                    {isDemo && u.role === 'corredor' && (
                      <Button
                        variant="secondary"
                        disabled={lastAdmin(u)}
                        title={lastAdmin(u) ? 'Debe quedar al menos un administrador' : undefined}
                        onClick={() => setRoleChange(u)}
                      >
                        {isAdminUser(u) ? 'Quitar admin' : 'Hacer admin'}
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      disabled={u.id === user?.id || (u.active && lastAdmin(u))}
                      title={u.id === user?.id ? 'No puedes desactivar tu propia cuenta' : u.active && lastAdmin(u) ? 'Debe quedar al menos un administrador' : undefined}
                      onClick={() => setSensitive(u.id)}
                    >
                      {u.active ? 'Desactivar' : 'Reactivar'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {roleChange && (
        <Confirm
          title={isAdminUser(roleChange) ? '¿Quitar el rol de administrador?' : '¿Dar el rol de administrador?'}
          message={
            isAdminUser(roleChange)
              ? `${roleChange.name} seguirá siendo corredor, pero ya no podrá entrar al panel del club.${roleChange.id === user?.id ? ' Es tu propia cuenta: saldrás del panel ahora.' : ''}`
              : `${roleChange.name} podrá elegir entre corredor y administrador del club al iniciar sesión.`
          }
          label={isAdminUser(roleChange) ? 'Quitar rol' : 'Dar rol'}
          onClose={() => setRoleChange(null)}
          confirm={() => {
            const giving = !isAdminUser(roleChange)
            update((s) => ({
              ...s,
              users: s.users.map((u) => (u.id === roleChange.id ? { ...u, admin: giving } : u)),
            }))
            notify(`${roleChange.name} ${giving ? 'ahora también es administrador' : 'ya no es administrador'}.`)
          }}
        />
      )}
      {sensitive && (
        <Confirm
          title="¿Cambiar el estado de la cuenta?"
          message="La actualización se guardará en Payload. Una cuenta desactivada no podrá iniciar sesión ni acceder a sus datos privados."
          label="Confirmar cambio"
          onClose={() => setSensitive(null)}
          confirm={() => {
            if (!update((s) => ({
              ...s,
              users: s.users.map((u) => (u.id === sensitive ? { ...u, active: !u.active } : u)),
            }))) return false
            notify('Sincronizando el estado de la cuenta.')
          }}
        />
      )}
    </>
  )
}
