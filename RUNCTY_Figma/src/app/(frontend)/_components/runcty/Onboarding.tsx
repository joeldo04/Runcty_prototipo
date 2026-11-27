'use client'

import { useId, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Check, Eye, EyeOff, MailCheck, Monitor, Route, Users } from 'lucide-react'
import { BackButton, Button, IconButton, Modal, RunnerIcon } from './components'
import { isAdminUser, withEmails, type DemoUser } from './data'
import { DEMO_LOGINS, DEMO_USERS } from './demo-seed'
import { useDemo } from './store'
import { SHOW_FUTURE, SHOW_PASSWORD_RECOVERY } from './features'
import brandMark from '../../../../../imagenes/logo_runcty.png'
import welcomePhoto from '../../../../../imagenes/corredores_login.webp'
import gacelasWhite from '../../../../../imagenes/gacelas_emblema_blanco.png'

const MIN_AGE = 15
// Fecha más reciente permitida para tener al menos 15 años hoy.
const latestBirth = () => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - MIN_AGE)
  return date.toISOString().slice(0, 10)
}

// El PNG original es cuadrado con margen negro: el círculo solo recorta ese margen.
export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <Image src={brandMark} alt="" fill sizes={`${size}px`} unoptimized priority />
    </span>
  )
}

function BrandHeader() {
  return (
    <div className="auth-brand">
      <BrandMark />
      <strong>RUNCTY</strong>
    </div>
  )
}

function AuthIntro() {
  return (
    <>
      <h1>
        Cada ruta,
        <br />
        <span>más confianza.</span>
      </h1>
      <p>Tu próxima carrera empieza con una mejor decisión.</p>
    </>
  )
}

const accountRoles = (account: DemoUser) =>
  account.role === 'sistema'
    ? 'Administrador del sistema'
    : account.role === 'club'
      ? 'Administrador del club'
      : isAdminUser(account)
        ? 'Corredor y administrador del club'
        : 'Solo corredor'

// Simulación completa: no envía correos ni guarda contraseñas.
function RecoverPassword({ back }: { back: () => void }) {
  const { update } = useDemo()
  const [step, setStep] = useState(1),
    [email, setEmail] = useState(''),
    [code, setCode] = useState(''),
    [password, setPassword] = useState(''),
    [repeat, setRepeat] = useState(''),
    [error, setError] = useState(''),
    [sample] = useState(() => String(Math.floor(100000 + Math.random() * 900000)))
  const next = () => {
    if (step === 1 && !/^\S+@\S+\.\S+$/.test(email.trim()))
      return setError('Escribe tu correo con el formato nombre@dominio.com.')
    if (step === 2 && code.trim() !== sample)
      return setError('El código no coincide. Usa el código que aparece arriba.')
    if (step === 3 && password.length < 8)
      return setError('La contraseña debe tener al menos 8 caracteres.')
    if (step === 3 && password !== repeat) return setError('Las contraseñas no coinciden.')
    if (step === 1)
      update((s) => withEmails(s, [{
        to: email.trim(),
        subject: 'Recupera tu contraseña de RUNCTY',
        body: `Usa el código ${sample} para crear una contraseña nueva. Vence en 30 minutos y solo funciona una vez.\n\nSi no lo pediste, ignora este mensaje.`,
      }]))
    setError('')
    setStep(step + 1)
  }
  if (step === 4)
    return (
      <div className="auth-done" role="status">
        <span><Check /></span>
        <h2>Contraseña actualizada</h2>
        <p>Ya puedes iniciar sesión con tu nueva contraseña.</p>
        <Button variant="orange" className="w-full" onClick={back}>Volver a iniciar sesión <ArrowRight /></Button>
      </div>
    )
  return (
    <>
      <h2>Recuperar contraseña</h2>
      <div className="auth-steps" aria-label={`Paso ${step} de 3`}>
        {[1, 2, 3].map((value) => <i key={value} className={value <= step ? 'active' : ''} />)}
      </div>
      <form
        className="auth-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          next()
        }}
      >
        {step === 1 && (
          <>
            <p className="auth-copy">Escribe tu correo y te enviaremos un código.</p>
            <label className="field">Correo electrónico<input type="email" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" autoComplete="off" /></label>
          </>
        )}
        {step === 2 && (
          <>
            <p className="auth-copy">Enviamos un código a <strong>{email.trim()}</strong>.</p>
            <p className="auth-note"><strong>Tu código: {sample}</strong>.</p>
            <label className="field">Código de 6 dígitos<input inputMode="numeric" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" autoComplete="one-time-code" /></label>
          </>
        )}
        {step === 3 && (
          <>
            <label className="field">Nueva contraseña<input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" /></label>
            <label className="field">Repite la contraseña<input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" /></label>
          </>
        )}
        {error && <p role="alert" className="form-error">{error}</p>}
        <Button type="submit" variant="orange" className="w-full">{step === 1 ? 'Enviar código' : step === 2 ? 'Validar código' : 'Guardar contraseña'}<ArrowRight /></Button>
      </form>
      <div className="auth-links"><button type="button" onClick={back}>Volver a iniciar sesión</button></div>
    </>
  )
}

type AccessProceed = (accountId?: string, mode?: 'corredor' | 'admin', name?: string, email?: string, password?: string, access?: 'normal' | 'demo') => void

export function DemoAccess({ createInitially = false, demonstration = false, mobile = false, back, proceed }: {
  createInitially?: boolean; demonstration?: boolean; mobile?: boolean; back?: () => void; proceed: AccessProceed
}) {
  const { state, checkPreviewAccess } = useDemo()
  const [create, setCreate] = useState(createInitially)
  const [demoView, setDemoView] = useState(demonstration)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<'form' | 'recover' | 'verify'>('form')
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null)
  const passwordId = useId()
  const known = state.users.length ? state.users : DEMO_USERS
  const accounts = known.filter(account => account.active && DEMO_USERS.some(sample => sample.id === account.id))
  const [accountId, setAccountId] = useState(accounts[0]?.id)
  const account = accounts.find(value => value.id === accountId) ?? accounts[0]
  const cities = Array.from(new Set(state.cities.filter(city => city.enabled).map(city => city.name)))
  const register = (data: FormData) => {
    const text = (key: string) => String(data.get(key) ?? '').trim()
    const email = text('email').toLowerCase(), birth = text('nacimiento'), password = String(data.get('password') ?? '')
    if (!text('nombres') || !text('apellidos')) return 'Escribe tus nombres y apellidos.'
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Revisa el correo: debe tener el formato nombre@dominio.com.'
    if (known.some(value => value.email?.toLowerCase() === email)) return 'Ya existe una cuenta con ese correo. Inicia sesión.'
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (!birth) return 'Indica tu fecha de nacimiento.'
    if (birth > latestBirth()) return 'Debes tener al menos ' + MIN_AGE + ' años para crear una cuenta.'
    if (!cities.includes(text('ciudad'))) return 'Elige una ciudad habilitada.'
    if (!data.get('terminos')) return 'Acepta los términos de uso para continuar.'
    setCreated({ name: text('nombres') + ' ' + text('apellidos'), email, password })
    setView('verify')
    return ''
  }
  const switchMode = () => { setCreate(!create); setError(''); setView('form'); setSubmitting(false) }
  const form = demoView ? (
    <div className="auth-demo-access">
      <span className="auth-prototype-label"><Monitor aria-hidden="true" /> Acceso demostrativo independiente</span>
      <h2>Cuentas de muestra</h2>
      <p className="auth-copy">Solo para recorrer el prototipo durante la presentación. Cada cuenta tiene sus permisos previamente asignados.</p>
      <div className="account-options" role="group" aria-label="Cuentas de demostración">
        {accounts.map(value => <button key={value.id} type="button" aria-pressed={value.id === account?.id} className={value.id === account?.id ? 'selected' : ''} onClick={() => setAccountId(value.id)}>
          <div><strong>{value.name}</strong><small>{value.email}</small></div>
          <span className="auth-assigned-role">{accountRoles(value)}</span>
        </button>)}
      </div>
      {!accounts.length && <p className="auth-note">No hay cuentas de muestra activas.</p>}
      <Button className="w-full" disabled={!account} onClick={() => {
        if (account) proceed(account.id, account.role === 'sistema' || account.role === 'club' ? 'admin' : 'corredor', undefined, undefined, undefined, 'demo')
      }}>Entrar en demostración <ArrowRight /></Button>
      <div className="auth-demo-logins">
        <p>También puedes entrar desde el inicio de sesión normal (usuario y contraseña iguales):</p>
        <ul>
          {DEMO_LOGINS.map(login => <li key={login.username}><code>{login.username}</code><span>{login.label}</span></li>)}
        </ul>
      </div>
      <div className="auth-links"><button type="button" onClick={() => { setDemoView(false); setCreate(false); setError('') }}>Volver al inicio de sesión</button></div>
    </div>
  ) : view === 'recover' ? <RecoverPassword back={() => setView('form')} /> : view === 'verify' && created ? (
    <div className="auth-done auth-verify" role="status">
      <span><MailCheck /></span>
      <h2>Revisa tu correo</h2>
      <p>Enviamos un enlace de verificación a <strong>{created.email}</strong>. Ábrelo para activar tu cuenta.</p>
      <p className="auth-note">En este prototipo puedes simular la verificación. No se envía un correo real.</p>
      <Button className="w-full" onClick={() => proceed(undefined, 'corredor', created.name, created.email, created.password, 'normal')}>Simular verificación de correo <ArrowRight /></Button>
      <div className="auth-links"><button type="button" onClick={() => setView('form')}>Corregir mis datos</button></div>
    </div>
  ) : (
    <>
      <h2>{create ? 'Crea tu cuenta' : 'Bienvenido'}</h2>
      <p className="auth-copy">{create ? 'Tu cuenta se creará como corredor.' : 'Ingresa con tu correo y contraseña. Tus accesos dependen de los permisos de tu cuenta.'}</p>
      <form className="auth-form" noValidate aria-busy={submitting} onSubmit={event => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        if (create) { setError(register(data)); return }
        const email = String(data.get('email') ?? '').trim(), password = String(data.get('password') ?? '')
        if (!email) { setError('Escribe tu correo o usuario.'); return }
        if (email.includes('@') && !/^\S+@\S+\.\S+$/.test(email)) { setError('Escribe un correo válido.'); return }
        if (!password) { setError('Escribe tu contraseña.'); return }
        const matched = checkPreviewAccess(email, password)
        if (!matched) { setError('El usuario o la contraseña no son correctos, o la cuenta no está activa.'); return }
        setError('')
        setSubmitting(true)
        proceed(matched.id, matched.role === 'sistema' ? 'admin' : 'corredor', undefined, undefined, undefined, 'normal')
      }}>
        {create && <div className="auth-row">
          <label className="field">Nombres<input name="nombres" required placeholder="Tus nombres" autoComplete="given-name" maxLength={60} /></label>
          <label className="field">Apellidos<input name="apellidos" required placeholder="Tus apellidos" autoComplete="family-name" maxLength={60} /></label>
        </div>}
        {create
          ? <label className="field">Correo electrónico<input name="email" required type="email" inputMode="email" placeholder="nombre@correo.com" autoComplete="username" /></label>
          : <label className="field">Correo o usuario<input name="email" required type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="nombre@correo.com o usuario" autoComplete="username" /></label>}
        <div className="field">
          <label htmlFor={passwordId}>Contraseña</label>
          <div className="auth-password">
            <input id={passwordId} name="password" required type={visible ? 'text' : 'password'} placeholder={create ? 'Mínimo 8 caracteres' : 'Tu contraseña'} autoComplete={create ? 'new-password' : 'current-password'} />
            <IconButton label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</IconButton>
          </div>
        </div>
        {create && <div className="auth-row">
          <label className="field">Fecha de nacimiento<input name="nacimiento" required type="date" max={latestBirth()} /></label>
          <label className="field">Ciudad<select name="ciudad" required defaultValue={cities[0] ?? ''}><option value="" disabled>Selecciona una ciudad</option>{cities.map(city => <option key={city}>{city}</option>)}</select></label>
        </div>}
        {create && !cities.length && <p role="alert" className="form-error">No hay ciudades habilitadas para registrarse.</p>}
        {create && <label className="checkbox auth-terms"><input name="terminos" type="checkbox" required />Acepto los términos de uso y la política de privacidad de RUNCTY.</label>}
        {error && <p role="alert" className="form-error">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting || (create && !cities.length)}>{submitting ? 'Ingresando…' : create ? 'Crear cuenta' : 'Iniciar sesión'}<ArrowRight /></Button>
      </form>
      <div className="auth-links">
        {SHOW_PASSWORD_RECOVERY && !create && <button type="button" onClick={() => setView('recover')}>¿Olvidaste tu contraseña?</button>}
        <button type="button" onClick={switchMode}>{create ? '¿Ya tienes una cuenta? Inicia sesión' : 'Crear cuenta'}</button>
      </div>
      <div className="auth-demo-entry"><span>Prototipo interactivo · usa datos de prueba.</span><button type="button" onClick={() => { setDemoView(true); setError('') }}><Monitor aria-hidden="true" /> Acceso demostrativo</button></div>
    </>
  )
  if (!mobile) return <section className="auth-card auth-modal" aria-label="Acceso a RUNCTY">{form}</section>
  return <section className="auth-screen navy-zone" aria-label="Acceso a RUNCTY">
    <div className="auth-top">{back && <BackButton onClick={back}>Volver</BackButton>}<BrandHeader /></div>
    <div className="auth-body"><div className="auth-intro"><AuthIntro /></div><div className="auth-card">{form}</div></div>
  </section>
}

export function AccountPreview({ create, demonstration = false, close, proceed }: {
  create: boolean; demonstration?: boolean; close: () => void; proceed: AccessProceed
}) {
  const { user, isDemo, logout, demonstrationAccess } = useDemo()
  const [switchingDemo, setSwitchingDemo] = useState(demonstration)
  const showDemo = demonstration || switchingDemo
  return <Modal title={showDemo ? 'Acceso demostrativo' : user ? 'Tu cuenta RUNCTY' : create ? 'Crear cuenta RUNCTY' : 'Acceso a RUNCTY'} onClose={close}>
    {user && !isDemo && showDemo ? <div className="space-y-5"><p>Cierra tu sesión para abrir las cuentas de muestra del prototipo.</p><Button onClick={async () => { await logout() }}>Cerrar sesión y ver demostración</Button></div> : user && !showDemo ?
      <div className="space-y-5">
        <h3 className="text-2xl font-bold">Hola, {user.name}.</h3>
        <p className="text-sm leading-6 text-muted">{isDemo ? 'Prototipo interactivo. Los datos de esta presentación solo duran en esta pestaña.' : 'Tu sesión está activa. Tus accesos corresponden a los permisos asignados a tu cuenta.'}</p>
        <Button className="w-full" onClick={close}>Continuar explorando <ArrowRight /></Button>
        <Button variant="secondary" className="w-full" onClick={async () => { if (demonstrationAccess) setSwitchingDemo(true); else await logout() }}>Cambiar de cuenta</Button>
        <Button variant="ghost" className="w-full" onClick={async () => { if (await logout()) close() }}>Cerrar sesión</Button>
      </div> : <DemoAccess createInitially={create} demonstration={showDemo} proceed={proceed} />}
  </Modal>
}

export function MobileWelcome({ login, register, demo }: { login: () => void; register: () => void; demo: () => void }) {
  return (
    <section className="welcome-screen">
      <div className="welcome-photo">
        <Image
          src={welcomePhoto}
          alt="Corredores del club frente a la catedral de Loja"
          fill
          sizes="(max-width: 520px) 100vw, 393px"
          className="object-cover object-top"
          priority
        />
      </div>
      <header className="welcome-top">
        <BrandMark size={40} />
        <strong>RUNCTY</strong>
        <span className="welcome-partner">
          <Image src={gacelasWhite} alt="Club Gacelas Running Team" height={30} />
        </span>
      </header>
      <div className="welcome-body">
        <h1>
          Cada ruta,
          <br />
          <span>más confianza.</span>
        </h1>
        <p>Tu próxima carrera empieza con una mejor decisión.</p>
        <ul className="welcome-features">
          <li>
            <span>
              <Route />
            </span>
            Rutas informadas
          </li>
          <li>
            <span>
              <RunnerIcon />
            </span>
            Registra tu entrenamiento
          </li>
          <li>
            <span>
              <Users />
            </span>
            Comparte con tu club
          </li>
        </ul>
        <div className="welcome-actions">
          <Button variant="orange" className="w-full" onClick={register}>
            Comenzar <ArrowRight />
          </Button>
          <Button variant="secondary" className="w-full" onClick={login}>
            Ya tengo una cuenta
          </Button>
          <button type="button" className="welcome-demo-link" onClick={demo}>Acceso demostrativo</button>
        </div>
      </div>
    </section>
  )
}
