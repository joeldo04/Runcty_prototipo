import { useState, type ComponentType } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  Calendar,
  Car,
  Check,
  ChevronRight,
  Clock3,
  CloudRain,
  Dog,
  Ellipsis,
  Flag,
  LightbulbOff,
  MapPin,
  MessageSquareWarning,
  Plus,
  Shield,
  ShieldAlert,
  TrafficCone,
  TriangleAlert,
} from 'lucide-react'
import SafetyMap from './SafetyMap'
import { BackButton, Button, DemoTag, EmptyState, Modal, PageTitle, Status } from './components'
import {
  MAX_INCIDENT_TYPES,
  demoOnlyIncidentTypes,
  incidentLabel,
  incidentTypes,
  publicIncidents,
  today,
  uid,
  type Coordinate,
  type Incident,
} from './data'
import { useDemo } from './store'
import { SHOW_FUTURE } from './features'

// Persona empujando una carretilla, para "Trabajos en la vía" (no existe en lucide).
function WheelbarrowWorker(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="5.6" cy="4" r="1.8" />
      <path d="M6.3 6.4 8.7 11.6" />
      <path d="M8.7 11.6 6.6 15.6 5.7 20.4" />
      <path d="m8.7 11.6 2 4.1.3 4.7" />
      <path d="M7.1 8.3 11.9 11.2h2.2" />
      <path d="M13.6 12.4h8.2l-2.1 4.5h-4.8z" />
      <path d="M18.1 16.9v1.1" />
      <circle cx="18.1" cy="19.7" r="1.6" />
    </svg>
  )
}
const incidentIcons: Record<string, ComponentType<{ className?: string }>> = {
  'Acoso callejero': MessageSquareWarning,
  'Robo o asalto': ShieldAlert,
  'Tránsito vehicular peligroso': Car,
  'Falta de iluminación': LightbulbOff,
  Perros: Dog,
  'Vía en mal estado': TriangleAlert,
  'Sendero o espacio cerrado': Ban,
  'Trabajos en la vía': WheelbarrowWorker,
  'Inundación o lodo': CloudRain,
  'Obstáculos o escombros': TrafficCone,
  Otro: Ellipsis,
}
export const IncidentTypeIcon = ({ type, className }: { type: string; className?: string }) => {
  const Icon = incidentIcons[type] ?? AlertTriangle
  return <Icon className={className} />
}

export function Reports({
  mobile = false,
  initialForm = false,
}: {
  mobile?: boolean
  initialForm?: boolean
}) {
  const { state } = useDemo(),
    // Sin "Mis reportes" en esta versión: la pantalla muestra el mapa de reportes aprobados.
    [tab, setTab] = useState(SHOW_FUTURE ? 'mine' : 'map'),
    [creating, setCreating] = useState(initialForm),
    [detail, setDetail] = useState<Incident | null>(null)
  const mine = [...state.incidents]
    .filter((i) => i.owned)
    .sort((a, b) => b.createdAt - a.createdAt)
  if (creating) return <IncidentWizard mobile={mobile} close={() => setCreating(false)} />
  return (
    <div className={`reports-screen ${mobile ? 'mobile-padded' : ''}`}>
      <PageTitle
        eyebrow="COMUNIDAD INFORMADA"
        title="Reportes de incidentes"
        subtitle="Ayuda a que la comunidad corra mejor informada."
      >
        <Button data-tour="report" onClick={() => setCreating(true)}>
          <Plus />
          Reportar incidente
        </Button>
      </PageTitle>
      {SHOW_FUTURE && (
        <div className="tabs">
          <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
            Mis reportes <span>{mine.length}</span>
          </button>
          <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>
            Reportes en el mapa <span>{publicIncidents(state.incidents).length}</span>
          </button>
        </div>
      )}
      {tab === 'mine' ? (
        <>
          <div className="reports-summary">
            <Shield />
            <p>
              Tu aporte importa. <strong>El club revisa cada reporte antes de publicarlo.</strong>
            </p>
            <DemoTag />
          </div>
          <div className="incident-list">
            {mine.map((i) => (
              <button className="incident-item" key={i.id} onClick={() => setDetail(i)}>
                <span className="incident-type-icon">
                  <Flag />
                </span>
                <div className="incident-item-main">
                  <div>
                    <h3>{incidentLabel(i)}</h3>
                    <Status value={i.status} />
                  </div>
                  <p>
                    <MapPin />
                    {i.location}
                  </p>
                  <small>
                    {new Date(i.date + 'T12:00:00').toLocaleDateString('es', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {i.time} · Aporte de la comunidad
                  </small>
                  {i.reason && <span className="rejection-reason">Motivo: {i.reason}</span>}
                </div>
                <ChevronRight />
              </button>
            ))}
            {!mine.length && (
              <EmptyState
                title="Todavía no tienes reportes"
                description="Puedes contribuir con información para revisión del club."
              >
                <Button onClick={() => setCreating(true)}>Reportar incidente</Button>
              </EmptyState>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="report-map">
            <SafetyMap showReports />
          </div>
          <div className="info-strip">
            <Shield />
            Solo se muestran reportes aprobados y vigentes de los últimos 30 días. Su revisión no
            garantiza las condiciones actuales del lugar.
          </div>
        </>
      )}
      {detail && (
        <Modal title={incidentLabel(detail)} onClose={() => setDetail(null)}>
          <Status value={detail.status} />
          <p>
            {detail.location} · {detail.date} · {detail.time}
          </p>
          <div className="modal-map">
            <SafetyMap points={[detail.coordinate]} focus={detail.coordinate} showReports={false} />
          </div>
          <p>{detail.description || 'Sin descripción adicional.'}</p>
          {detail.reason && <div className="info-strip">Motivo de rechazo: {detail.reason}</div>}
          <DemoTag />
        </Modal>
      )}
    </div>
  )
}

export function IncidentWizard({ mobile = false, close }: { mobile?: boolean; close: () => void }) {
  const { state, user, update, notify, pending, syncError, isDemo } = useDemo()
  // Esta versión usa los 8 tipos de la base de datos y uno por reporte. Los tipos nuevos y elegir
  // dos quedan ocultos con SHOW_FUTURE.
  const types =
    SHOW_FUTURE && isDemo ? incidentTypes : incidentTypes.filter((item) => !demoOnlyIncidentTypes.includes(item))
  const maxTypes = SHOW_FUTURE ? MAX_INCIDENT_TYPES : 1
  const [step, setStep] = useState(0),
    [selectedTypes, setSelectedTypes] = useState<string[]>([]),
    [coordinate, setCoordinate] = useState<Coordinate[]>([]),
    [location, setLocation] = useState(''),
    [date, setDate] = useState(today()),
    [time, setTime] = useState(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date())),
    [description, setDescription] = useState(''),
    [error, setError] = useState(''),
    [sent, setSent] = useState(false)
  const names = ['Tipo', 'Ubicación', 'Detalles', 'Revisar']
  const [type = '', secondaryType] = selectedTypes
  const typeLabel = selectedTypes.join(' · ')
  // Con SHOW_FUTURE se pueden marcar hasta dos tipos; tocar uno marcado lo quita.
  // En esta versión es un solo tipo: elegir otro reemplaza al anterior.
  const toggleType = (item: string) => {
    setError('')
    if (maxTypes === 1) {
      setSelectedTypes([item])
      return
    }
    if (selectedTypes.includes(item)) {
      setSelectedTypes(selectedTypes.filter((value) => value !== item))
      return
    }
    if (selectedTypes.length >= maxTypes) {
      setError(`Puedes elegir hasta ${maxTypes} tipos. Quita uno para cambiarlo.`)
      return
    }
    setSelectedTypes([...selectedTypes, item])
  }
  const next = () => {
    if (step === 0 && !type) {
      setError(maxTypes === 1 ? 'Selecciona el tipo de incidente.' : 'Selecciona al menos un tipo de incidente.')
      return
    }
    if (step === 1 && (!coordinate.length || !location.trim())) {
      setError('Selecciona un punto y escribe una ubicación aproximada.')
      return
    }
    if (step === 2 && (!date || !time)) {
      setError('Indica la fecha y hora del incidente.')
      return
    }
    if (step === 2 && new Date(`${date}T${time}-05:00`).getTime() > Date.now() + 60000) {
      setError('La fecha y hora no pueden estar en el futuro.')
      return
    }
    setError('')
    setStep((s) => s + 1)
  }
  const send = () => {
    const incident: Incident = {
      id: uid(),
      type,
      ...(secondaryType && isDemo ? { secondaryType } : {}),
      coordinate: coordinate[0],
      location: location.trim(),
      date,
      time,
      // La API guarda un solo tipo: fuera de la demo el segundo se conserva en la descripción.
      description:
        secondaryType && !isDemo
          ? `También: ${secondaryType}.${description ? ' ' + description : ''}`
          : description,
      status: 'Pendiente',
      owner: user?.name ?? 'Corredor',
      owned: true,
      createdAt: Date.now(),
    }
    update((s) => ({ ...s, incidents: [incident, ...s.incidents] }))
    setSent(true)
    notify('Reporte enviado. Estado: Pendiente de revisión.')
  }
  const another = () => {
    setSent(false)
    setStep(0)
    setSelectedTypes([])
    setCoordinate([])
    setLocation('')
    setDescription('')
    setError('')
  }
  if (sent) {
    const reportedOn = new Date(`${date}T12:00:00`).toLocaleDateString('es', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return (
      <div className={`report-success report-sent ${mobile ? 'mobile-padded' : ''}`}>
        <div className="success-mark">
          <Check />
        </div>
        <span className="eyebrow">GRACIAS POR TU APORTE</span>
        <h1>
          {pending
            ? 'Enviando tu reporte…'
            : syncError
              ? 'Tu reporte está pendiente de guardado.'
              : '¡Reporte enviado!'}
        </h1>
        <p className="report-sent-subtitle">
          {pending || syncError
            ? 'Comprueba el estado de sincronización antes de salir.'
            : 'El club lo revisará antes de publicarlo. Gracias por ayudar a que otros corredores elijan rutas más seguras.'}
        </p>
        <article className="report-sent-card" aria-label="Detalle del reporte">
          <div className="report-sent-head">
            <span className="report-sent-type-icon">
              <IncidentTypeIcon type={type} />
            </span>
            <div>
              <small>{secondaryType ? 'Tipos de incidente' : 'Tipo de incidente'}</small>
              <strong>{typeLabel}</strong>
            </div>
            <span className="report-sent-chip">Pendiente</span>
          </div>
          <dl className="report-sent-details">
            <div>
              <dt>
                <MapPin /> Ubicación
              </dt>
              <dd>{location}</dd>
            </div>
            <div>
              <dt>
                <Calendar /> Fecha
              </dt>
              <dd>{reportedOn}</dd>
            </div>
            <div>
              <dt>
                <Clock3 /> Hora
              </dt>
              <dd>{time}</dd>
            </div>
          </dl>
          {coordinate[0] && (
            <div className="report-sent-map">
              <SafetyMap preview points={coordinate} focus={coordinate[0]} showReports={false} />
            </div>
          )}
        </article>
        <section className="report-timeline" aria-labelledby="report-timeline-title">
          <h2 id="report-timeline-title">Seguimiento del reporte</h2>
          <ol>
            <li className="done">
              <span aria-hidden="true">
                <Check />
              </span>
              <div>
                <strong>Reporte recibido</strong>
                <small>Hoy · {time}</small>
              </div>
            </li>
            <li className="current">
              <span aria-hidden="true" />
              <div>
                <strong>Pendiente de revisión</strong>
                <small>El Club Gacelas lo revisa desde la web</small>
              </div>
            </li>
            <li>
              <span aria-hidden="true" />
              <div>
                <strong>Publicación en el mapa</strong>
                <small>Solo si el club lo aprueba</small>
              </div>
            </li>
          </ol>
        </section>
        <div className="report-sent-actions">
          <Button className="full" onClick={close}>
            {SHOW_FUTURE ? 'Ver mis reportes' : 'Volver a reportes'} <ArrowRight />
          </Button>
          <Button variant="secondary" className="full" onClick={another}>
            <Plus />
            Reportar otro incidente
          </Button>
        </div>
        <DemoTag />
      </div>
    )
  }
  return (
    <div className={`report-wizard ${mobile ? 'mobile-padded' : ''}`}>
      <BackButton onClick={close}>Reportes</BackButton>
      <PageTitle
        eyebrow={`PASO ${step + 1} DE 4`}
        title="Reportar incidente"
        subtitle="La información será revisada antes de ser pública."
      />
      <div className="wizard-progress" aria-label="Progreso del reporte" role="list">
        {names.map((name, i) => (
          <span
            key={name}
            role="listitem"
            aria-current={step === i ? 'step' : undefined}
            className={step === i ? 'current' : step > i ? 'completed' : ''}
          >
            <b>{step > i ? <Check /> : i + 1}</b>
            {name}
          </span>
        ))}
      </div>
      <div className="wizard-content">
        {step === 0 && (
          <>
            <h2>¿Qué ocurrió?</h2>
            {maxTypes > 1 ? (
              <p>
                Elige hasta {maxTypes} opciones si en el mismo lugar pasó más de una cosa.
                <strong className="incident-types-count" aria-live="polite">
                  {' '}
                  {selectedTypes.length} de {maxTypes} elegidos
                </strong>
              </p>
            ) : (
              <p>Elige la opción que mejor describe tu observación.</p>
            )}
            <div className="incident-types">
              {types.map((item) => (
                <button
                  key={item}
                  className={selectedTypes.includes(item) ? 'selected' : ''}
                  aria-pressed={selectedTypes.includes(item)}
                  onClick={() => toggleType(item)}
                >
                  <span className="incident-type-icon" aria-hidden="true">
                    <IncidentTypeIcon type={item} />
                  </span>
                  {item}
                  {selectedTypes.includes(item) ? <Check /> : <ChevronRight />}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h2>Ubica el incidente.</h2>
            <p>Pulsa un punto en el mapa. Evita incluir direcciones personales.</p>
            <div className="pick-location-map">
              <SafetyMap
                locationPick
                points={coordinate}
                onPoints={setCoordinate}
                showReports={false}
              />
            </div>
            <div className="location-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  setCoordinate([[-3.9833, -79.202]])
                  setLocation('Sector El Valle')
                }}
              >
                <MapPin />
                Usar ubicación sugerida
              </Button>
              <span>
                {coordinate.length
                  ? `${coordinate[0][0].toFixed(5)}, ${coordinate[0][1].toFixed(5)}`
                  : 'Ningún punto seleccionado'}
              </span>
            </div>
            <label className="field">
              Ubicación aproximada
              <input
                value={location}
                maxLength={100}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Parque, vía o sector cercano"
              />
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Un poco más de contexto.</h2>
            <div className="form-grid">
              <label className="field">
                Fecha
                <input
                  type="date"
                  value={date}
                  max={today()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="field">
                Hora
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
            </div>
            <label className="field">
              Descripción (opcional)
              <textarea
                rows={5}
                maxLength={800}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe lo ocurrido sin datos personales ni información sensible."
              />
              <small>{description.length}/800 caracteres</small>
            </label>
            <div className="info-strip">
              <Shield />
              Para una emergencia, utiliza los canales oficiales.
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2>Revisa tu aporte.</h2>
            <dl className="review-definition">
              <div>
                <dt>{secondaryType ? 'Tipos' : 'Tipo'}</dt>
                <dd>{typeLabel}</dd>
              </div>
              <div>
                <dt>Ubicación</dt>
                <dd>{location}</dd>
              </div>
              <div>
                <dt>Fecha y hora</dt>
                <dd>
                  {date} · {time}
                </dd>
              </div>
              <div>
                <dt>Descripción</dt>
                <dd>{description || 'Sin descripción adicional'}</dd>
              </div>
              <div>
                <dt>Autor</dt>
                <dd>{user?.name ?? 'Corredor'} · Perfil privado</dd>
              </div>
              <div>
                <dt>Estado inicial</dt>
                <dd>
                  <Status value="Pendiente" />
                </dd>
              </div>
            </dl>
            <div className="info-strip">
              <AlertTriangle />
              Tu observación quedará pendiente de revisión. No compartas datos personales ni la identidad de otras personas.
            </div>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            <AlertTriangle />
            {error}
          </p>
        )}
        <div className="wizard-actions">
          <Button
            variant="secondary"
            onClick={() => (step === 0 ? close() : setStep((s) => s - 1))}
          >
            <ArrowLeft />
            {step === 0 ? 'Cancelar' : 'Atrás'}
          </Button>
          <Button onClick={step === 3 ? send : next}>
            {step === 3 ? 'Enviar reporte' : 'Continuar'}
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
