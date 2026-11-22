'use client'

import { useId, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Eye, EyeOff, MailCheck, MapPin, Monitor, Route, ShieldCheck, Users } from 'lucide-react'
import { BackButton, Button, IconButton, Modal, RunnerIcon } from './components'
import { isAdminUser, withEmails, type DemoUser } from './data'
import { DEMO_USERS } from './demo-seed'
import { useDemo } from './store'
import { SHOW_FUTURE } from './features'
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

function RoleChoice({ account, choose, back }: {
  account: DemoUser; choose: (mode: 'corredor' | 'admin') => void; back: () => void
}) {
  return (
    <>
      <h2>Hola, {account.name.split(' ')[0]}</h2>
      <p className="auth-copy">Tu cuenta tiene dos roles. ¿Cómo quieres entrar?</p>
      <div className="role-options">
        <button type="button" onClick={() => choose('corredor')}>
          <span><RunnerIcon /></span>
          <div><strong>Corredor</strong><small>Rutas, entrenamientos y seguridad.</small></div>
          <ArrowRight />
        </button>
        <button type="button" onClick={() => choose('admin')}>
          <span><ShieldCheck /></span>
          <div><strong>Administrador del club</strong><small>Rutas, reportes, espacios y publicidad.</small></div>
          <ArrowRight />
        </button>
      </div>
      <p className="auth-note">Podrás cambiar de modo cuando quieras sin cerrar sesión.</p>
      <div className="auth-links"><button type="button" onClick={back}>Usar otra cuenta</button></div>
    </>
  )
}

export function DemoAccess({ createInitially = false, mobile = false, back, proceed }: {
  createInitially?: boolean; mobile?: boolean; back?: () => void
  proceed: (accountId?: string, mode?: 'corredor' | 'admin', name?: string, email?: string) => void
}) {
  const { state } = useDemo()
  const [create, setCreate] = useState(createInitially),
    [visible, setVisible] = useState(false),
    [error, setError] = useState(''),
    [view, setView] = useState<'form' | 'recover' | 'roles' | 'verify'>('form'),
    [created, setCreated] = useState<{ name: string; email: string } | null>(null)
  const passwordId = useId()
  const cities = Array.from(new Set(['Loja', ...state.cities.filter((city) => city.enabled).map((city) => city.name)]))
  // Registro como en la app real: todos los campos son obligatorios.
  const register = (data: FormData) => {
    const text = (key: string) => String(data.get(key) ?? '').trim()
    const email = text('email'), birth = text('nacimiento')
    if (!text('nombres') || !text('apellidos')) return 'Escribe tus nombres y apellidos.'
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Revisa el correo: debe tener el formato nombre@dominio.com.'
    if (String(data.get('password') ?? '').length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (!birth) return 'Indica tu fecha de nacimiento.'
    if (birth > latestBirth()) return `Debes tener al menos ${MIN_AGE} años para crear una cuenta.`
    if (!text('ciudad')) return 'Elige tu ciudad.'
    if (!data.get('terminos')) return 'Acepta los términos de uso para continuar.'
    setCreated({ name: `${text('nombres')} ${text('apellidos')}`, email })
    setView('verify')
    return ''
  }
  const accounts = (state.users.length ? state.users : DEMO_USERS).filter(
    (account) => account.active && (!mobile || account.role === 'corredor'),
  )
  const [accountId, setAccountId] = useState(accounts[0]?.id)
  const account = accounts.find((value) => value.id === accountId) ?? accounts[0]
  const switchMode = () => {
    setCreate(!create)
    setError('')
  }
  const signIn = (name?: string) => {
    if (create || !account) return proceed(undefined, undefined, name)
    if (mobile) return proceed(account.id)
    if (account.role !== 'corredor') return proceed(account.id, 'admin')
    if (isAdminUser(account)) return setView('roles')
    proceed(account.id)
  }
  const form = view === 'recover' ? <RecoverPassword back={() => setView('form')} /> :
    view === 'roles' && account ? <RoleChoice account={account} back={() => setView('form')} choose={(mode) => proceed(account.id, mode)} /> :
    view === 'verify' && created ? (
      <div className="auth-done auth-verify" role="status">
        <span><MailCheck /></span>
        <h2>Revisa tu correo</h2>
        <p>Enviamos un enlace de verificación a <strong>{created.email}</strong>. Ábrelo para activar tu cuenta.</p>
        <Button variant="orange" className="w-full" onClick={() => proceed(undefined, undefined, created.name, created.email)}>
          Abrir enlace de verificación <ArrowRight />
        </Button>
        <div className="auth-links"><button type="button" onClick={() => setView('form')}>Corregir mis datos</button></div>
      </div>
    ) : (
    <>
      <h2>{create ? 'Crea tu cuenta' : 'Bienvenido'}</h2>
      <form
        className="auth-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          if (create) {
            setError(register(data))
            return
          }
          const email = String(data.get('email') ?? '').trim()
          if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            setError('Revisa el correo: debe tener el formato nombre@dominio.com.')
            return
          }
          setError('')
          signIn()
        }}
      >
        {create && (
          <div className="auth-row">
            <label className="field">Nombres<input name="nombres" placeholder="Tus nombres" autoComplete="given-name" maxLength={60} /></label>
            <label className="field">Apellidos<input name="apellidos" placeholder="Tus apellidos" autoComplete="family-name" maxLength={60} /></label>
          </div>
        )}
        {!create && (
          <div className="field">
            <span>Elige tu cuenta</span>
            <div className="account-options" role="group" aria-label="Elige tu cuenta">
              {accounts.map((value) => (
                <button key={value.id} type="button" aria-pressed={value.id === account?.id} className={value.id === account?.id ? 'selected' : ''} onClick={() => setAccountId(value.id)}>
                  <strong>{value.name.replace(' · ejemplo', '')}</strong>
                  <small>{accountRoles(value)}</small>
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="field">Correo electrónico<input name="email" type="email" inputMode="email" placeholder="nombre@correo.com" autoComplete="off" aria-invalid={!!error} /></label>
        <div className="field">
          <label htmlFor={passwordId}>Contraseña</label>
          <div className="auth-password">
            <input id={passwordId} name="password" type={visible ? 'text' : 'password'} placeholder={create ? 'Mínimo 8 caracteres' : 'Tu contraseña'} autoComplete={create ? 'new-password' : 'off'} />
            <IconButton label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(!visible)}>
              {visible ? <EyeOff /> : <Eye />}
            </IconButton>
          </div>
        </div>
        {create && (
          <div className="auth-row">
            <label className="field">Fecha de nacimiento<input name="nacimiento" type="date" max={latestBirth()} /></label>
            <label className="field">Ciudad
              <select name="ciudad" defaultValue="Loja">
                {cities.map((city) => <option key={city}>{city}</option>)}
              </select>
            </label>
          </div>
        )}
        {create && (
          <label className="checkbox auth-terms">
            <input name="terminos" type="checkbox" />
            Acepto los términos de uso y la política de privacidad de RUNCTY.
          </label>
        )}
        {error && <p role="alert" className="form-error">{error}</p>}
        {!create && <p className="auth-note">Puedes dejar los campos vacíos.</p>}
        <Button type="submit" variant="orange" className="w-full">{create ? 'Crear cuenta' : 'Iniciar sesión'}<ArrowRight /></Button>
      </form>
      <div className="auth-links">
        {SHOW_FUTURE && !create && <button type="button" onClick={() => setView('recover')}>Recuperar contraseña</button>}
        <button type="button" onClick={switchMode}>{create ? '¿Ya tienes una cuenta? Inicia sesión' : 'Crear cuenta'}</button>
      </div>
    </>
  )
  if (!mobile)
    return (
      <section className="auth-card auth-modal" aria-label="Acceso a RUNCTY">
        {form}
        <Link href="/demo/administracion" className="auth-admin"><Monitor className="size-4" /> Ver administración de demostración <ArrowRight className="size-4" /></Link>
      </section>
    )
  return (
    <section className="auth-screen navy-zone" aria-label="Acceso a RUNCTY">
      <div className="auth-top">
        {back && <BackButton onClick={back}>Volver</BackButton>}
        <BrandHeader />
      </div>
      <div className="auth-body">
        <div className="auth-intro"><AuthIntro /></div>
        <div className="auth-card">{form}</div>
      </div>
    </section>
  )
}

export function AccountPreview({ create, close, proceed }: {
  create: boolean; close: () => void; proceed: (accountId?: string, mode?: 'corredor' | 'admin', name?: string, email?: string) => void
}) {
  const { user, isDemo, logout } = useDemo()
  return <Modal title={user ? 'Tu cuenta RUNCTY' : create ? 'Crear cuenta RUNCTY' : 'Acceso a RUNCTY'} onClose={close}>
    {user ? <div className="space-y-5"><h3 className="text-2xl font-bold">Hola, {user.name}.</h3><p className="text-sm leading-6 text-muted">{isDemo ? 'Estás en una demostración local. La actividad solo dura en esta pestaña.' : 'Tienes una sesión activa. Tus permisos se gestionan en el servidor.'}</p><Button className="w-full" onClick={close}>Continuar explorando <ArrowRight /></Button><Button variant="secondary" className="w-full" onClick={() => void logout()}>Cambiar de cuenta</Button><Button variant="ghost" className="w-full" onClick={async () => { if (await logout()) close() }}>Cerrar sesión</Button></div> : <DemoAccess createInitially={create} proceed={proceed} />}
  </Modal>
}

export function MobileWelcome({ login, register }: { login: () => void; register: () => void }) {
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
        </div>
      </div>
    </section>
  )
}
