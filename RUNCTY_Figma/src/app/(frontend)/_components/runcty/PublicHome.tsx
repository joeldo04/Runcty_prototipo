'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowRight,
  Check,
  Monitor,
  Pause,
  Play,
  Route,
  Share2,
  Shield,
  ShieldCheck,
  Smartphone,
  Star,
} from 'lucide-react'
import { Button, DemoTag, RunnerIcon } from './components'
import { averageSpeed, formatDuration, formatPace, JIPIRO, LOJA, type Coordinate } from './data'
import { DEMO_ROADS, DEMO_ROUTES } from './demo-seed'
import { BrandMark } from './Onboarding'
import { useDemo } from './store'

const WIDTH = 420,
  HEIGHT = 520
const BOUNDS = { north: -3.9705, south: -3.9985, west: -79.215, east: -79.1925 }
const project = ([lat, lng]: Coordinate) =>
  [
    ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * WIDTH,
    ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * HEIGHT,
  ] as const
const line = (points: Coordinate[]) =>
  points.map((point, i) => `${i ? 'L' : 'M'}${project(point).join(' ')}`).join(' ')

// Ilustración propia: pinta las calles reales del prototipo, sin teselas de mapa.
function LojaStreets({ progress, labels = false }: { progress?: number; labels?: boolean }) {
  const { state } = useDemo()
  const roads = state.roads.length ? state.roads : DEMO_ROADS
  const route = state.catalog[1] ?? state.catalog[0] ?? DEMO_ROUTES[1]
  const [pinX, pinY] = project(LOJA),
    [parkX, parkY] = project(JIPIRO)
  return (
    <svg className="loja-streets" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Calles de Loja pintadas con una ruta de RUNCTY" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="loja-blocks" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(-9)">
          <path d="M34 0H0V34" fill="none" stroke="#3478f6" strokeOpacity=".16" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill="url(#loja-blocks)" />
      {roads.map((road) => (
        <path key={road.id} d={line(road.points)} className="street-paint" />
      ))}
      <path d={line(route.geometry)} className="street-route-glow" />
      <path
        d={line(route.geometry)}
        pathLength={1}
        className={progress === undefined ? 'street-route street-route-loop' : 'street-route'}
        style={progress === undefined ? undefined : { strokeDashoffset: 1 - progress }}
      />
      {labels && (
        <>
          <circle cx={parkX} cy={parkY} r="4" fill="#fff" />
          <text x={parkX + 10} y={parkY + 4}>Parque Jipiro</text>
          <circle cx={pinX} cy={pinY} r="16" className="street-pin-ring" />
          <circle cx={pinX} cy={pinY} r="6" fill="#ff6437" />
          <text x={pinX + 14} y={pinY + 4} className="street-city">Loja</text>
        </>
      )}
    </svg>
  )
}

const scenes = [
  { title: 'Elige tu ruta', text: 'Compara distancia, horario y condiciones de cada recorrido en Loja.' },
  { title: 'Corre', text: 'Sigue tus métricas y el trazado en vivo. Tu seguridad, siempre a mano.' },
  { title: 'Cuéntanos cómo fue', text: 'Una encuesta breve y una valoración con estrellas ayudan a otros corredores.' },
  { title: 'Revisa tu resumen', text: 'Distancia, tiempo, ritmo y velocidad, con el mapa de lo que corriste.' },
  { title: 'Comparte tu logro', text: 'Genera una imagen con tu recorrido, lista para tus redes.' },
]
const SCENE_SECONDS = 5

function AppSimulation() {
  const { state } = useDemo()
  const route = state.catalog[1] ?? state.catalog[0] ?? DEMO_ROUTES[1]
  const section = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState(0),
    [elapsed, setElapsed] = useState(0),
    [playing, setPlaying] = useState(false),
    [visible, setVisible] = useState(false)
  useEffect(() => {
    setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 })
    if (section.current) observer.observe(section.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!playing || !visible) return
    const timer = setInterval(() => setElapsed((value) => value + 0.1), 100)
    return () => clearInterval(timer)
  }, [playing, visible])
  useEffect(() => {
    if (elapsed < SCENE_SECONDS) return
    setScene((value) => (value + 1) % scenes.length)
    setElapsed(0)
  }, [elapsed])
  const open = (index: number) => {
    setScene(index)
    setElapsed(0)
  }
  const part = Math.min(1, elapsed / SCENE_SECONDS)
  const seconds = Math.round(route.km * 360)
  const runSeconds = Math.round(seconds * part),
    runKm = route.km * part
  return (
    <div className="sim" ref={section}>
      <ol className="sim-steps">
        {scenes.map(({ title, text }, index) => (
          <li key={title} className={index === scene ? 'active' : ''}>
            <button type="button" aria-current={index === scene ? 'step' : undefined} onClick={() => open(index)}>
              <strong>{title}</strong>
              <span>{text}</span>
              <i aria-hidden="true"><b style={{ width: index === scene ? `${part * 100}%` : index < scene ? '100%' : 0 }} /></i>
            </button>
          </li>
        ))}
        <li className="sim-control">
          <button type="button" onClick={() => setPlaying(!playing)}>
            {playing ? <Pause /> : <Play />} {playing ? 'Pausar simulación' : 'Reproducir simulación'}
          </button>
        </li>
      </ol>
      <div className="sim-phone" role="img" aria-label={`Simulación de la app: ${scenes[scene].title}`}>
        <div className="sim-screen" key={scene}>
          <span className="sim-camera" />
          {scene === 0 && (
            <div className="sim-pad">
              <h4>Encuentra tu ruta</h4>
              <div className="sim-map"><LojaStreets progress={0.35} /></div>
              {[route, state.catalog[0] ?? DEMO_ROUTES[0]].map((item, index) => (
                <div className={`sim-card ${index === 0 && part > 0.45 ? 'picked' : ''}`} key={item.id}>
                  <div><strong>{item.name}</strong><small>{item.km.toFixed(1)} km · {item.min} min</small></div>
                  <Shield />
                </div>
              ))}
            </div>
          )}
          {scene === 1 && (
            <div className="sim-run">
              <div className="sim-map sim-map-tall"><LojaStreets progress={part} /></div>
              <div className="sim-live">
                <strong>{runKm.toFixed(2)}<small> km</small></strong>
                <div><span>{formatDuration(runSeconds)}<small>Tiempo</small></span><span>{formatPace(seconds, route.km)}<small>Ritmo /km</small></span></div>
              </div>
              <div className="sim-buttons"><span>Pausar</span><span>Finalizar</span></div>
            </div>
          )}
          {scene === 2 && (
            <div className="sim-survey">
              <div className="sim-map sim-map-tall"><LojaStreets progress={1} /></div>
              <div className="sim-sheet">
                <h4>¿Cómo calificarías esta ruta?</h4>
                <div className="sim-stars">
                  {[1, 2, 3, 4, 5].map((star) => <Star key={star} fill={part * 5.5 > star ? 'currentColor' : 'none'} className={part * 5.5 > star ? 'on' : ''} />)}
                </div>
                <small>{part > 0.85 ? 'Excelente' : 'Elige de 1 a 5 estrellas'}</small>
              </div>
            </div>
          )}
          {scene === 3 && (
            <div className="sim-pad">
              <div className="sim-map"><LojaStreets progress={1} /></div>
              <h4>{route.name}</h4>
              <div className="sim-summary">
                <strong>{route.km.toFixed(2)}<small> km</small></strong>
                <div>
                  <span>{formatDuration(seconds)}<small>Tiempo</small></span>
                  <span>{formatPace(seconds, route.km)}<small>Ritmo</small></span>
                  <span>{averageSpeed(seconds, route.km).toFixed(1)}<small>km/h</small></span>
                </div>
              </div>
            </div>
          )}
          {scene === 4 && (
            <div className="sim-share">
              <div className="sim-post">
                <small>MI ENTRENAMIENTO</small>
                <h4>{route.name}</h4>
                <div className="sim-map"><LojaStreets progress={1} /></div>
                <strong>{route.km.toFixed(2)}<em> km</em></strong>
                <footer><BrandMark size={26} /> RUNCTY</footer>
              </div>
              <div className={`sim-share-button ${part > 0.5 ? 'done' : ''}`}>{part > 0.5 ? <Check /> : <Share2 />}{part > 0.5 ? 'Imagen lista' : 'Compartir entrenamiento'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function PublicHome({ enter }: { enter: (experience: 'web' | 'mobile') => void }) {
  const { state, user, openAccount, openRegistration } = useDemo()
  const router = useRouter()
  const routes = (state.catalog.length ? state.catalog : DEMO_ROUTES).length
  const streets = (state.roads.length ? state.roads : DEMO_ROADS).length
  return (
    <div className="home">
      <header className="home-nav">
        <div>
          <Link href="/" className="home-brand"><BrandMark size={38} /><strong>RUNCTY</strong></Link>
          <nav aria-label="Secciones de la página">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#video">Video</a>
            <a href="#prototipo">Prototipo</a>
            <a href="#club">Club</a>
          </nav>
          <div className="home-access">
            <button type="button" onClick={openAccount}>{user ? 'Mi cuenta' : 'Iniciar sesión'}</button>
            <Button variant="orange" onClick={openRegistration}>Crear cuenta</Button>
          </div>
        </div>
      </header>

      <section className="home-hero navy-zone">
        <div className="home-wrap home-hero-grid">
          <div>
            <span className="home-pill"><i /> Desde Loja, Ecuador</span>
            <h1>Tu ciudad.<br />Tu ritmo.<br /><span>Tu próxima ruta.</span></h1>
            <p>Cada ruta cuenta. Consulta recorridos y horarios, entiende las condiciones de cada calle y lleva el registro de tus entrenamientos.</p>
            <div className="home-actions">
              <Button variant="orange" onClick={() => router.push('/rutas')}><Route /> Ver rutas</Button>
              <button type="button" className="home-outline" onClick={() => enter('mobile')}><Smartphone /> Ver en móvil</button>
            </div>
            <div className="home-tag"><DemoTag /></div>
          </div>
          <figure className="home-art">
            <LojaStreets labels />
            <figcaption>
              <div><strong>Loja, Ecuador</strong><small>3°59′ S · 79°12′ O</small></div>
              <span>{routes} rutas · {streets} calles pintadas</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="home-statement">
        <p>En <strong>RUNCTY</strong> cada calle de Loja se convierte en información para decidir <span>por dónde, cuándo y cómo correr.</span></p>
      </section>

      <section className="home-section home-soft" id="como-funciona">
        <div className="home-wrap">
          <header className="home-heading">
            <span>Así funciona</span>
            <h2>De la primera calle a la meta.</h2>
            <p>Mira cómo se usa RUNCTY. La simulación avanza sola, o toca cada paso.</p>
          </header>
          <AppSimulation />
        </div>
      </section>

      <section className="home-section" id="video">
        <div className="home-wrap home-video-grid">
          <header className="home-heading">
            <span>En movimiento</span>
            <h2>Cada salida es un avance.</h2>
            <p>Detrás de cada meta hay un primer kilómetro. RUNCTY acompaña a quienes corren en Loja, desde que eligen su ruta hasta que cruzan la llegada.</p>
          </header>
          <video className="home-video" src="/videos/runcty-demo.mp4" aria-label="Corredor cruzando la meta en una carrera" controls autoPlay muted loop playsInline preload="metadata" />
        </div>
      </section>

      <section className="home-section home-soft">
        <div className="home-wrap home-cards">
          {[
            { icon: Route, title: 'Elige con información', text: 'Explora recomendaciones por horario, distancia y dificultad.' },
            { icon: Activity, title: 'Registra tu recorrido', text: 'Inicia, pausa y termina tu entrenamiento. Revisa después tu actividad.' },
            { icon: Shield, title: 'Corre en comunidad', text: 'Reporta incidentes y comparte un enlace temporal con alguien de confianza.' },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title}><span><Icon /></span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="home-section" id="prototipo">
        <div className="home-wrap">
          <header className="home-heading">
            <span>El prototipo</span>
            <h2>Una app. Tres formas de verla.</h2>
            <p>Corres desde el teléfono, consultas desde la web y gestionas desde el panel. Una misma cuenta puede ser corredor y administrador.</p>
          </header>
          <div className="home-modes">
            <article className="featured navy-zone">
              <span><Smartphone /></span>
              <h3>Ver en móvil</h3>
              <p>La experiencia del corredor: entrenar, valorar la ruta y compartir el resultado.</p>
              <Button variant="orange" onClick={() => enter('mobile')}>Abrir vista móvil <ArrowRight /></Button>
            </article>
            <article>
              <span><Monitor /></span>
              <h3>Ver en web</h3>
              <p>Rutas, condiciones por horario, club y espacios recomendados de Loja.</p>
              <Button variant="secondary" onClick={() => enter('web')}>Explorar web <ArrowRight /></Button>
            </article>
            <article>
              <span><ShieldCheck /></span>
              <h3>Administración</h3>
              <p>Revisión de rutas y reportes, publicidad, y roles de usuarios.</p>
              <Button variant="secondary" onClick={openAccount}>Entrar con dos roles <ArrowRight /></Button>
            </article>
          </div>
        </div>
      </section>

      <section className="home-club navy-zone" id="club">
        <div className="home-wrap">
          <div>
            <span className="gacelas-brand">Gacelas Running Team</span>
            <h2>Una comunidad como punto de partida.</h2>
            <p>El club de Loja es nuestro cliente de referencia. RUNCTY tiene identidad propia y está pensado para todos los corredores.</p>
          </div>
          <Link href="/demo/administracion" className="home-outline"><Monitor /> Ver panel web · demo <ArrowRight /></Link>
        </div>
      </section>

      <footer className="home-footer navy-zone">
        <div className="home-wrap">
          <div className="home-brand"><BrandMark size={38} /><strong>RUNCTY</strong></div>
          <span>Cada ruta cuenta. <RunnerIcon /></span>
          <small>Información demostrativa. No garantiza seguridad.</small>
        </div>
      </footer>
    </div>
  )
}
