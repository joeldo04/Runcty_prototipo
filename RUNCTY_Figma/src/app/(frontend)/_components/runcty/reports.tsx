import { useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Flag,
  MapPin,
  Plus,
  Shield,
} from 'lucide-react'
import SafetyMap from './SafetyMap'
import { BackButton, Button, DemoTag, EmptyState, Modal, PageTitle, Status } from './components'
import { incidentTypes, publicIncidents, today, uid, type Coordinate, type Incident } from './data'
import { useDemo } from './store'

export function Reports({
  mobile = false,
  initialForm = false,
}: {
  mobile?: boolean
  initialForm?: boolean
}) {
  const { state } = useDemo(),
    [tab, setTab] = useState('mine'),
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
      <div className="tabs">
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          Mis reportes <span>{mine.length}</span>
        </button>
        <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>
          Reportes en el mapa <span>{publicIncidents(state.incidents).length}</span>
        </button>
      </div>
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
                    <h3>{i.type}</h3>
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
        <Modal title={detail.type} onClose={() => setDetail(null)}>
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
  const { state, user, update, notify, pending, syncError } = useDemo()
  const [step, setStep] = useState(0),
    [type, setType] = useState(''),
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
  const next = () => {
    if (step === 0 && !type) {
      setError('Selecciona el tipo de incidente.')
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
      coordinate: coordinate[0],
      location: location.trim(),
      date,
      time,
      description,
      status: 'Pendiente',
      owner: user?.name ?? 'Corredor',
      owned: true,
      createdAt: Date.now(),
    }
    update((s) => ({ ...s, incidents: [incident, ...s.incidents] }))
    setSent(true)
    notify('Reporte enviado. Estado: Pendiente de revisión.')
  }
  if (sent)
    return (
      <div className={`report-success ${mobile ? 'mobile-padded' : ''}`}>
        <div className="success-mark">
          <Check />
        </div>
        <span className="eyebrow">GRACIAS POR TU APORTE</span>
        <h1>{pending ? 'Sincronizando tu reporte.' : syncError ? 'Tu reporte está pendiente de guardado.' : 'Recibimos tu reporte.'}</h1>
        <p>
          {pending || syncError ? 'Comprueba el estado de sincronización antes de salir.' : <>Se guardó en Mis reportes con estado <strong>Pendiente</strong>.</>}
        </p>
        <div className="info-strip">
          <Shield />
          No se publica en el mapa hasta que el Club Gacelas lo apruebe desde la web.
        </div>
        <Button onClick={close}>
          Ver mis reportes <ArrowRight />
        </Button>
        <DemoTag />
      </div>
    )
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
            <p>Elige la opción que mejor describe tu observación.</p>
            <div className="incident-types">
              {incidentTypes.map((item, i) => (
                <button
                  key={item}
                  className={type === item ? 'selected' : ''}
                  aria-pressed={type === item}
                  onClick={() => {
                    setType(item)
                    setError('')
                  }}
                >
                  <span>0{i + 1}</span>
                  {item}
                  {type === item ? <Check /> : <ChevronRight />}
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
                  setLocation('Sector El Valle · ubicación de demostración')
                }}
              >
                <MapPin />
                Usar ubicación de demostración
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
              Este prototipo no envía avisos reales. Para una emergencia, utiliza los canales
              oficiales.
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2>Revisa tu aporte.</h2>
            <dl className="review-definition">
              <div>
                <dt>Tipo</dt>
                <dd>{type}</dd>
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
