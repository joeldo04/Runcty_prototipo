'use client'

import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import Image from 'next/image'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { authenticateRuncty } from '@/app/(frontend)/actions'
import { Button, IconButton, Logo } from './components'
import type { AppUser, DemoState } from './store'

function AccountField({
  label,
  icon: Icon,
  suffix,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  icon: LucideIcon
  suffix?: ReactNode
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-dim" />
        <input
          id={id}
          {...input}
          className="min-h-12 w-full rounded-xl border border-line bg-ink/60 py-3 pr-12 pl-11 text-sm text-copy outline-none transition-colors duration-200 placeholder:text-dim focus:border-neon disabled:opacity-50"
        />
        {suffix}
      </div>
    </div>
  )
}

export default function AccountDialog({
  user,
  isDemo,
  startDemo,
  image,
  close,
  logout,
  signedIn,
}: {
  user: AppUser | null
  isDemo: boolean
  startDemo: () => void
  image: DemoState['heroImage']
  close: () => void
  logout: () => Promise<boolean>
  signedIn: (user: AppUser | null, data: Partial<DemoState>) => void
}) {
  const [create, setCreate] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [visible, setVisible] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useId()
  const description = useId()
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element?.showModal()
    return () => {
      element?.close()
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])
  const switchMode = () => {
    setCreate(!create)
    setError('')
    setNotice('')
    setVisible(false)
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby={heading}
      aria-describedby={description}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) close()
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-3xl border border-line bg-shell text-copy shadow-panel backdrop:bg-ink/85 backdrop:backdrop-blur-md"
    >
      <IconButton
        label="Cerrar cuenta"
        disabled={busy}
        onClick={close}
        className="absolute top-3 right-3 z-20 bg-shell/70 backdrop-blur-md"
      >
        <X />
      </IconButton>
      <div className="grid lg:grid-cols-2">
        <div className="relative isolate flex min-h-40 flex-col justify-between overflow-hidden bg-panel p-7 lg:min-h-full lg:p-10">
          {image && (
            <Image
              src={image.url}
              alt={image.alt}
              fill
              sizes="(min-width: 1024px) 500px, 100vw"
              loading="eager"
              className="-z-20 object-cover object-center opacity-65"
            />
          )}
          <div className="absolute inset-0 -z-10 bg-linear-to-b from-ink/40 via-ink/10 to-ink/95" />
          <Logo />
          <div className="mt-7 lg:mt-32">
            <span className="mb-4 hidden items-center gap-2 text-[11px] font-semibold tracking-[.2em] text-lilac lg:flex">
              <span className="h-px w-6 bg-neon" /> CORRE CON INFORMACIÓN.
            </span>
            <p className="max-w-sm font-display text-3xl leading-none font-semibold uppercase italic sm:text-4xl lg:text-6xl">
              Tu próximo kilómetro
              <br />
              <span className="text-lilac">comienza aquí.</span>
            </p>
            <p className="mt-5 hidden max-w-xs text-xs leading-6 text-muted lg:block">
              La ruta es tuya. La ciudad también.
              <br />
              Encuentra una nueva forma de recorrer Loja.
            </p>
            <div className="mt-9 hidden items-center gap-2 border-t border-copy/10 pt-5 text-[11px] text-muted lg:flex">
              <ShieldCheck className="size-4 text-lilac" /> Una cuenta. Web y móvil. Tu propio
              ritmo.
            </div>
          </div>
        </div>
        <div className="px-6 py-8 sm:px-10 lg:py-11">
          <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[.2em] text-lilac">
            RUNCTY / {user ? 'MI CUENTA' : create ? 'EMPIEZA TU RECORRIDO' : 'BIENVENIDO DE NUEVO'}
          </span>
          <h2 id={heading} className="mb-3 text-2xl font-bold tracking-tight">
            {user
              ? `Hola, ${user.name}.`
              : create
                ? 'Cada meta empieza contigo.'
                : 'Vuelve a tu ritmo.'}
          </h2>
          <p id={description} className="mb-7 max-w-sm text-xs leading-6 text-muted">
            {user
              ? isDemo
                ? 'Prueba rutas y entrenamientos con Carlos. Los cambios solo duran en esta pestaña.'
                : 'Tus rutas, contactos y entrenamientos siguen en tu cuenta al cambiar de experiencia.'
              : create
                ? 'Crea tu cuenta de corredor. Tu próxima ruta está un paso más cerca.'
                : 'Accede a tus rutas, entrenamientos y herramientas de seguridad.'}
          </p>
          {user ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4">
                <span className="flex size-12 items-center justify-center rounded-xl border border-neon/30 bg-primary/15 text-lg font-bold text-lilac">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <strong className="block text-sm">{user.name}</strong>
                  <span className="mt-1 block text-xs text-dim">
                    {isDemo
                      ? 'Demostración local · solo esta pestaña'
                      : user.role === 'club'
                        ? 'Gestión del Club Gacelas'
                        : user.role === 'sistema'
                          ? 'Administración del sistema'
                          : 'Cuenta de corredor'}
                  </span>
                </div>
                <Check className="ml-auto size-4 text-lilac" />
              </div>
              <p className="flex items-start gap-3 text-xs leading-6 text-muted">
                <LockKeyhole className="mt-1 size-4 text-lilac" />
                {isDemo
                  ? 'Estás probando RUNCTY como Carlos. No es una cuenta autenticada: no se guardan datos en el servidor ni se sincronizan entre dispositivos. Recargar cierra la demo.'
                  : 'Tu actividad privada solo está disponible para tu cuenta. Los permisos de gestión se asignan desde la administración.'}
              </p>
              <Button className="w-full" onClick={close}>
                Continuar explorando <ArrowRight />
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await logout()
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {busy ? <LoaderCircle className="animate-spin" /> : <LogOut />}
                {isDemo ? 'Salir de la demostración' : 'Cerrar sesión'}
              </Button>
            </div>
          ) : (
            <>
              <form
                key={create ? 'create' : 'login'}
                onSubmit={async (event) => {
                  event.preventDefault()
                  setError('')
                  setNotice('')
                  const fields = new FormData(event.currentTarget)
                  if (create && fields.get('password') !== fields.get('confirmPassword')) {
                    setError('Las contraseñas no coinciden. Revisa ambos campos.')
                    return
                  }
                  setBusy(true)
                  try {
                    const result = await authenticateRuncty({
                      email: fields.get('email'),
                      password: fields.get('password'),
                      ...(create
                        ? {
                            name: fields.get('name'),
                            level: fields.get('level'),
                            confirmPassword: fields.get('confirmPassword'),
                            acceptedPrivacy: fields.get('acceptedPrivacy') === 'on',
                          }
                        : {}),
                      create,
                    })
                    if (result.ok) signedIn(result.user, result.data)
                    else setError(result.error)
                  } catch {
                    setError('No se pudo conectar con RUNCTY. Inténtalo de nuevo.')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                <fieldset disabled={busy} className="space-y-4">
                  {create && (
                    <AccountField
                      label="Nombre completo"
                      icon={UserRound}
                      name="name"
                      placeholder="Tu nombre"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                    />
                  )}
                  <AccountField
                    label="Correo electrónico"
                    icon={Mail}
                    name="email"
                    type="email"
                    placeholder="tu@correo.com"
                    required
                    maxLength={180}
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <AccountField
                    label="Contraseña"
                    icon={LockKeyhole}
                    name="password"
                    type={visible ? 'text' : 'password'}
                    placeholder={
                      create ? 'Crea una contraseña de 8 caracteres o más' : 'Tu contraseña'
                    }
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete={create ? 'new-password' : 'current-password'}
                    suffix={
                      <IconButton
                        label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        aria-pressed={visible}
                        onClick={() => setVisible(!visible)}
                        className="absolute top-1/2 right-1 -translate-y-1/2"
                      >
                        {visible ? <EyeOff /> : <Eye />}
                      </IconButton>
                    }
                  />
                  {create ? (
                    <>
                      <AccountField
                        label="Confirmar contraseña"
                        icon={ShieldCheck}
                        name="confirmPassword"
                        type={visible ? 'text' : 'password'}
                        placeholder="Repite tu contraseña"
                        required
                        minLength={8}
                        maxLength={128}
                        autoComplete="new-password"
                      />
                      <label className="field">
                        Nivel de running
                        <select name="level" defaultValue="Intermedio" required>
                          <option>Principiante</option>
                          <option>Intermedio</option>
                          <option>Avanzado</option>
                        </select>
                      </label>
                      <label className="flex items-start gap-3 text-[11px] leading-5 text-muted">
                        <input
                          name="acceptedPrivacy"
                          type="checkbox"
                          required
                          className="mt-1 size-4 shrink-0 accent-primary"
                        />
                        <span>
                          Acepto las condiciones del prototipo y el aviso de privacidad que aparecen
                          a continuación.
                        </span>
                      </label>
                    </>
                  ) : (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        className="min-h-0 px-0 py-0 text-[11px] text-lilac"
                        onClick={() =>
                          setNotice(
                            'La recuperación por correo todavía no está configurada. Esta vista no envía mensajes ni cambia tu contraseña.',
                          )
                        }
                      >
                        ¿Olvidaste tu contraseña?
                      </Button>
                    </div>
                  )}
                  {error && (
                    <p role="alert" className="form-error">
                      {error}
                    </p>
                  )}
                  {notice && (
                    <p
                      role="status"
                      className="rounded-xl border border-info/20 bg-info/5 p-3 text-xs leading-6 text-muted"
                    >
                      {notice}
                    </p>
                  )}
                  <Button type="submit" disabled={busy} className="w-full">
                    {busy ? (
                      <>
                        <LoaderCircle className="animate-spin" />{' '}
                        {create ? 'Creando tu cuenta…' : 'Conectando…'}
                      </>
                    ) : (
                      <>
                        {create ? 'Crear cuenta de corredor' : 'Iniciar sesión'} <ArrowRight />
                      </>
                    )}
                  </Button>
                </fieldset>
              </form>
              <div className="my-5 flex items-center gap-3 text-[11px] text-dim">
                <span className="h-px flex-1 bg-line" /> O CONTINÚA CON{' '}
                <span className="h-px flex-1 bg-line" />
              </div>
              <Button
                variant="secondary"
                className="w-full"
                disabled
                title="Google OAuth no está configurado"
              >
                <span aria-hidden="true" className="font-bold text-muted">
                  G
                </span>{' '}
                Continuar con Google
              </Button>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-dim">
                <KeyRound className="size-3" /> Google pendiente de configuración.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-1 text-xs text-muted">
                <span>{create ? '¿Ya tienes una cuenta?' : '¿Es tu primer kilómetro aquí?'}</span>
                <Button
                  variant="ghost"
                  className="min-h-0 px-1 py-1 text-xs text-lilac"
                  disabled={busy}
                  onClick={switchMode}
                >
                  {create ? 'Inicia sesión' : 'Crea tu cuenta'}
                </Button>
              </div>
              {!create && (
                <div className="mt-5 rounded-xl border border-neon/20 bg-primary/5 p-4">
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={busy}
                    onClick={startDemo}
                  >
                    <UserRound /> Explorar como Carlos
                    <ArrowRight />
                  </Button>
                  <p className="mt-2 text-center text-[11px] leading-5 text-dim">
                    Demo local, sin crear cuenta. No se guarda en el servidor.
                  </p>
                </div>
              )}
              <details className="mt-6 border-t border-line/70 pt-4 text-[11px] leading-5 text-dim">
                <summary className="w-fit cursor-pointer text-muted">
                  Condiciones y privacidad del prototipo
                </summary>
                <p className="mt-3">
                  Utiliza datos de prueba. Tus rutas privadas, entrenamientos y contactos pertenecen
                  a tu cuenta. Un enlace compartido permite consultar su ubicación simulada hasta
                  que expire o lo revoques. Las condiciones son orientativas: no garantizan seguridad.
                  El entrenamiento, la ubicación y el SOS son simulados; no usan GPS real ni
                  contactan a emergencias.
                </p>
              </details>
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}
