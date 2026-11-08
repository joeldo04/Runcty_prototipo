'use client'

import { useId, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Eye, EyeOff, MapPin, Monitor, ShieldCheck } from 'lucide-react'
import { BackButton, Button, IconButton, Modal, RunnerIcon } from './components'
import { isAdminUser, withEmails, type DemoUser } from './data'
import { DEMO_USERS } from './demo-seed'
import { useDemo } from './store'
import brandMark from '../../../../../imagenes/logo_runcty.png'

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
      return setError('El código no coincide. Usa el código de ejemplo que aparece arriba.')
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
        <p>Simulación completada. No se envió ningún correo ni cambió ninguna cuenta real.</p>
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
            <label className="field">Correo electrónico<input type="email" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="corredor@ejemplo.com" autoComplete="off" /></label>
          </>
        )}
        {step === 2 && (
          <>
            <p className="auth-copy">Simulamos el envío a <strong>{email.trim()}</strong>.</p>
            <p className="auth-note"><strong>Código de ejemplo: {sample}</strong>. En esta demostración no se envía ningún correo.</p>
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
  proceed: (accountId?: string, mode?: 'corredor' | 'admin', name?: string) => void
}) {
  const { state } = useDemo()
  const [create, setCreate] = useState(createInitially),
    [visible, setVisible] = useState(false),
    [error, setError] = useState(''),
    [view, setView] = useState<'form' | 'recover' | 'roles'>('form')
  const passwordId = useId()
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
    view === 'roles' && account ? <RoleChoice account={account} back={() => setView('form')} choose={(mode) => proceed(account.id, mode)} /> : (
    <>
      <h2>{create ? 'Crea tu cuenta' : 'Bienvenido'}</h2>
      <form
        className="auth-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const email = String(data.get('email') ?? '').trim()
          if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            setError('Revisa el correo: debe tener el formato nombre@dominio.com.')
            return
          }
          setError('')
          signIn(String(data.get('name') ?? '').trim())
        }}
      >
        {create && <label className="field">Nombre<input name="name" placeholder="Tu nombre" autoComplete="off" /></label>}
        {!create && (
          <div className="field">
            <span>Cuenta de ejemplo</span>
            <div className="account-options" role="group" aria-label="Cuenta de ejemplo">
              {accounts.map((value) => (
                <button key={value.id} type="button" aria-pressed={value.id === account?.id} className={value.id === account?.id ? 'selected' : ''} onClick={() => setAccountId(value.id)}>
                  <strong>{value.name.replace(' · ejemplo', '')}</strong>
                  <small>{accountRoles(value)}</small>
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="field">Correo electrónico<input name="email" type="email" inputMode="email" placeholder="corredor@ejemplo.com" autoComplete="off" aria-invalid={!!error} /></label>
        <div className="field">
          <label htmlFor={passwordId}>Contraseña</label>
          <div className="auth-password">
            <input id={passwordId} type={visible ? 'text' : 'password'} placeholder="Opcional en esta demostración" autoComplete="off" />
            <IconButton label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(!visible)}>
              {visible ? <EyeOff /> : <Eye />}
            </IconButton>
          </div>
        </div>
        {error && <p role="alert" className="form-error">{error}</p>}
        <p className="auth-note"><strong>Acceso de demostración.</strong> Puedes dejar los campos vacíos.</p>
        <Button type="submit" variant="orange" className="w-full">{create ? 'Crear cuenta · demo' : 'Iniciar sesión · demo'}<ArrowRight /></Button>
      </form>
      <div className="auth-links">
        {!create && <button type="button" onClick={() => setView('recover')}>Recuperar contraseña</button>}
        <button type="button" onClick={switchMode}>{create ? '¿Ya tienes una cuenta? Inicia sesión' : 'Crear cuenta'}</button>
      </div>
    </>
  )
  if (!mobile)
    return (
      <section className="auth-card auth-modal" aria-label="Acceso de demostración">
        {form}
        <p className="auth-legal">No se verifican credenciales ni se crean cuentas reales. Entrenamiento, GPS, enlaces y SOS son simulados.</p>
        <Link href="/demo/administracion" className="auth-admin"><Monitor className="size-4" /> Ver administración de demostración <ArrowRight className="size-4" /></Link>
      </section>
    )
  return (
    <section className="auth-screen navy-zone" aria-label="Acceso de demostración">
      <div className="auth-top">
        {back && <BackButton onClick={back}>Volver</BackButton>}
        <BrandHeader />
      </div>
      <div className="auth-body">
        <div className="auth-intro"><AuthIntro /></div>
        <div className="auth-card">{form}</div>
      </div>
      <p className="auth-foot">Prototipo · no se verifican credenciales ni se crean cuentas reales</p>
    </section>
  )
}

export function AccountPreview({ create, close, proceed }: {
  create: boolean; close: () => void; proceed: (accountId?: string, mode?: 'corredor' | 'admin', name?: string) => void
}) {
  const { user, isDemo, logout } = useDemo()
  return <Modal title={user ? 'Tu cuenta RUNCTY' : create ? 'Crear cuenta RUNCTY' : 'Acceso a RUNCTY'} onClose={close}>
    {user ? <div className="space-y-5"><h3 className="text-2xl font-bold">Hola, {user.name}.</h3><p className="text-sm leading-6 text-muted">{isDemo ? 'Estás en una demostración local. La actividad solo dura en esta pestaña.' : 'Tienes una sesión activa. Tus permisos se gestionan en el servidor.'}</p><Button className="w-full" onClick={close}>Continuar explorando <ArrowRight /></Button><Button variant="secondary" className="w-full" onClick={() => void logout()}>Cambiar de cuenta</Button><Button variant="ghost" className="w-full" onClick={async () => { if (await logout()) close() }}>Cerrar sesión</Button></div> : <DemoAccess createInitially={create} proceed={proceed} />}
  </Modal>
}

export function MobileWelcome({ login, register }: { login: () => void; register: () => void }) {
  const { state } = useDemo()
  return (
    <section className="auth-screen navy-zone">
      {state.heroImage && <Image src={state.heroImage.url} alt="" fill sizes="393px" className="-z-10 object-cover opacity-25" priority />}
      <div className="auth-top"><BrandHeader /></div>
      <div className="auth-body">
        <div className="auth-intro">
          <span className="eyebrow"><MapPin /> LOJA, ECUADOR</span>
          <AuthIntro />
        </div>
        <div className="auth-card">
          <p>Elige rutas y horarios con información de seguridad. Registra tu entrenamiento y comparte solo lo que tú decidas.</p>
          <Button variant="orange" className="w-full" onClick={register}>Comenzar <ArrowRight /></Button>
          <Button variant="secondary" className="w-full" onClick={login}>Ya tengo una cuenta</Button>
        </div>
      </div>
      <p className="auth-foot">Prototipo Android · acceso de demostración</p>
    </section>
  )
}
