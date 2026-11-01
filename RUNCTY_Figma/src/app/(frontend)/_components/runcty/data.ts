export type Coordinate = [number, number]
export type Role = 'visitante' | 'corredor' | 'club' | 'sistema'
export type ReviewStatus = 'Pendiente' | 'Aprobado' | 'Rechazado'
export type TimeSlot = '05:30' | '08:00' | '14:00' | '19:00'
export const TIMES: TimeSlot[] = ['05:30', '08:00', '14:00', '19:00']
export const LOJA: Coordinate = [-3.9885, -79.2025]
export const JIPIRO: Coordinate = [-3.9736, -79.2027]
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
export const uid = () => crypto.randomUUID()

export interface Street {
  id: string
  dbId?: string
  name: string
  points: Coordinate[]
  scores: Record<TimeSlot, number | null>
  factors: string[]
}

// Marca temporal «No recomendado» del club. Solo existe en la demo.
export interface ClubAlert {
  reason: string
  date: string
}
export const EXAMPLE_POINTS: Coordinate[] = [JIPIRO, [-3.9813, -79.2017], [-3.9889, -79.2034]]
export interface RouteData {
  id: string
  slug?: string
  name: string
  area: string
  km: number
  min: number
  difficulty: string
  desc: string
  image?: { url: string; alt: string; width: number; height: number }
  segmentIds: string[]
  geometry: Coordinate[]
  official?: boolean
  verified?: boolean
  owner?: string
  owned?: boolean
  status?: ReviewStatus
  reason?: string
  recommended?: string
  date?: string
  private?: boolean
  baseline?: number
  validated?: string
  alert?: ClubAlert
}

export const geometryFor = (ids: string[], streets: Street[] = []): Coordinate[] =>
  ids.flatMap((id) => streets.find((s) => s.id === id)?.points ?? [])

export interface Incident {
  id: string
  type: string
  location: string
  coordinate: Coordinate
  date: string
  time: string
  description: string
  status: ReviewStatus
  reason?: string
  owner: string
  owned?: boolean
  createdAt: number
}
export interface Sponsor {
  id: string
  name: string
  message: string
  contact: string
  active: boolean
  visual: string
  image?: { url: string; alt: string; width: number; height: number }
}
export interface Banner {
  id: string
  sponsorId: string
  title: string
  start: string
  end: string
  placement: 'explore' | 'catalog' | 'club'
  status: 'Borrador' | 'Publicado' | 'Pausado' | 'Retirado'
}
export interface Training {
  id: string
  route: RouteData
  date: string
  seconds: number
  km: number
  time: TimeSlot
  pendingSync?: boolean
}
// Campos de valoracion_ruta que responde el corredor.
export interface RouteRating {
  iluminacion: boolean
  presencia_personas: boolean
  transito_peligroso: boolean
  sensacion_seguridad: boolean
  puntuacion: number
  comentario: string
}
export type SurveyAnswers = Partial<RouteRating>
// Cuenta de la demo. `admin` simula el segundo rol; el rol real sigue en Payload.
export interface DemoUser {
  id: string
  name: string
  role: string
  active: boolean
  admin?: boolean
}
export const isAdminUser = (user: DemoUser) => user.admin ?? user.role !== 'corredor'
export interface Space {
  id: string
  name: string
  type: string
  location: string
  hours: string
  description: string
  coordinate: Coordinate
  alert?: ClubAlert
}
export interface RiskZone {
  id: string
  name: string
  reason: string
  confidential: boolean
  expires: string
  streetId: string
  source: string
  date: string
}
export const incidentTypes = [
  'Acoso callejero',
  'Robo o asalto',
  'Tránsito vehicular peligroso',
  'Falta de iluminación',
  'Perros',
  'Vía en mal estado',
  'Sendero o espacio cerrado',
  'Otro',
]
export const safety = (score: number | null | undefined) =>
  score == null
    ? { label: 'Sin datos', color: 'var(--safety-none)', key: 'none' }
    : score >= 70
      ? { label: 'Condiciones favorables', color: 'var(--safety-high)', key: 'high' }
      : score >= 40
        ? { label: 'Atención', color: 'var(--safety-medium)', key: 'medium' }
        : { label: 'Precaución', color: 'var(--safety-low)', key: 'low' }
export const colorHex = (score: number | null | undefined) =>
  score == null ? '#64748b' : score >= 70 ? '#16d98a' : score >= 40 ? '#facc15' : '#ff4757'
export const distance = (a: Coordinate, b: Coordinate) => {
  const rad = Math.PI / 180,
    lat = (b[0] - a[0]) * rad,
    lng = (b[1] - a[1]) * rad
  const h =
    Math.sin(lat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(lng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}
export const length = (points: Coordinate[]) =>
  points.slice(1).reduce((sum, p, i) => sum + distance(points[i], p), 0)
export const publicIncidents = (items: Incident[]) =>
  items.filter(
    (i) =>
      i.status === 'Aprobado' &&
      Date.now() - i.createdAt < 30 * 86400000 &&
      i.createdAt <= Date.now(),
  )
// Escenario de demostración. La evaluación definitiva pertenece a la API.
export function segmentScore(
  segment: Street,
  time: TimeSlot,
  date: string,
  incidents: Incident[] = [],
  risks: RiskZone[] = [],
): number | null {
  const base = segment.scores[time]
  if (base === null) return null
  const weekend = [0, 6].includes(new Date(date + 'T12:00:00').getDay()) ? 2 : 0
  const active = publicIncidents(incidents).filter((i) =>
    segment.points.some((p) => distance(p, i.coordinate) < 0.15),
  )
  const penalty = risks.filter((r) => r.streetId === segment.id && r.expires >= date).length * 7
  return Math.max(
    0,
    Math.min(100, base + weekend - Math.min(15, active.length * 5) - Math.min(21, penalty)),
  )
}
export function routeScore(
  route: Pick<RouteData, 'segmentIds'>,
  time: TimeSlot,
  date: string,
  incidents: Incident[] = [],
  risks: RiskZone[] = [],
  streets: Street[] = [],
) {
  let total = 0,
    weighted = 0,
    unknown = 0
  route.segmentIds.forEach((id) => {
    const s = streets.find((s) => s.id === id)
    if (!s) return
    const km = length(s.points),
      score = segmentScore(s, time, date, incidents, risks)
    if (score === null) {
      unknown += km
      return
    }
    total += km
    weighted += km * score
  })
  return {
    score: total ? Math.round(weighted / total) : null,
    coverage: total + unknown ? Math.round((total / (total + unknown)) * 100) : 0,
  }
}
export function nearestNode(point: Coordinate, streets: Street[] = []): Coordinate {
  const nodes = streets.flatMap((s) => s.points)
  return nodes.reduce(
    (best, p) => (distance(point, p) < distance(point, best) ? p : best),
    nodes[0] ?? point,
  )
}
// Dijkstra en la red local: distancia ponderada por índice, sin API externa.
export function calculatePath(
  waypoints: Coordinate[],
  time: TimeSlot,
  date: string,
  incidents: Incident[] = [],
  risks: RiskZone[] = [],
  streets: Street[] = [],
) {
  if (!streets.length || waypoints.length < 2) return { geometry: [], segmentIds: [], km: 0 }
  const key = (p: Coordinate) => p.join(','),
    nodes = new Map<string, Coordinate>(),
    graph = new Map<string, { to: string; cost: number; segmentId: string }[]>()
  streets.forEach((s) =>
    s.points.forEach((p, i) => {
      const k = key(p)
      nodes.set(k, p)
      if (!graph.has(k)) graph.set(k, [])
      if (!i) return
      const from = key(s.points[i - 1]),
        km = distance(s.points[i - 1], p),
        score = segmentScore(s, time, date, incidents, risks)
      const cost = km * (1 + (100 - (score ?? 25)) / 100)
      graph.get(from)!.push({ to: k, cost, segmentId: s.id })
      graph.get(k)!.push({ to: from, cost, segmentId: s.id })
    }),
  )
  let geometry: Coordinate[] = [],
    segmentIds: string[] = []
  for (let i = 1; i < waypoints.length; i++) {
    const start = key(nearestNode(waypoints[i - 1], streets)),
      end = key(nearestNode(waypoints[i], streets))
    const dist = new Map<string, number>([[start, 0]]),
      prev = new Map<string, { from: string; id: string }>(),
      done = new Set<string>()
    while (true) {
      const next = [...dist].filter(([k]) => !done.has(k)).sort((a, b) => a[1] - b[1])[0]
      if (!next) break
      const [at, cost] = next
      if (at === end) break
      done.add(at)
      for (const edge of graph.get(at) ?? []) {
        if (cost + edge.cost < (dist.get(edge.to) ?? Infinity)) {
          dist.set(edge.to, cost + edge.cost)
          prev.set(edge.to, { from: at, id: edge.segmentId })
        }
      }
    }
    const part: Coordinate[] = []
    let at = end
    const visited = new Set<string>()
    while (at !== start && prev.has(at) && !visited.has(at)) {
      visited.add(at)
      part.unshift(nodes.get(at)!)
      const p = prev.get(at)!
      segmentIds.push(p.id)
      at = p.from
    }
    if (at !== start) return { geometry: [], segmentIds: [], km: 0 }
    part.unshift(nodes.get(start)!)
    geometry.push(...(geometry.length ? part.slice(1) : part))
  }
  return { geometry, segmentIds: [...new Set(segmentIds)], km: length(geometry) }
}
export const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
export const formatDuration = (seconds: number) =>
  seconds < 3600
    ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    : formatTime(seconds)
export function pointAlong(points: Coordinate[], progress: number): Coordinate {
  if (points.length < 2) return points[0] ?? JIPIRO
  const target = length(points) * Math.max(0, Math.min(1, progress))
  let sum = 0
  for (let i = 1; i < points.length; i++) {
    const d = distance(points[i - 1], points[i])
    if (sum + d >= target) {
      const f = d ? (target - sum) / d : 0
      return [
        points[i - 1][0] + (points[i][0] - points[i - 1][0]) * f,
        points[i - 1][1] + (points[i][1] - points[i - 1][1]) * f,
      ]
    }
    sum += d
  }
  return points[points.length - 1]!
}
// Tramo de un trazado entre dos proporciones. Conserva los vértices para que el
// recorrido GPS (rosa) quede exactamente sobre la ruta y no recorte las esquinas.
export function sliceAlong(points: Coordinate[], from: number, to: number): Coordinate[] {
  const start = Math.max(0, from),
    end = Math.min(1, to)
  if (points.length < 2 || end <= start) return []
  const total = length(points)
  let sum = 0
  const vertices = points.filter((p, i) => {
    if (i) sum += distance(points[i - 1], p)
    const at = total ? sum / total : 0
    return at > start && at < end
  })
  return [pointAlong(points, start), ...vertices, pointAlong(points, end)]
}
export const formatPace = (seconds: number, km: number) => {
  if (!seconds || !km) return '—:—'
  const total = Math.round(seconds / km)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
export const averageSpeed = (seconds: number, km: number) => (seconds ? km / (seconds / 3600) : 0)
// Hora simulada: parte del horario consultado y suma la duración del entrenamiento.
export const clockAfter = (time: string, seconds: number) => {
  const [hours, minutes] = time.split(':').map(Number)
  const total = (hours * 60 + minutes + Math.round(seconds / 60)) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Comparar etiquetas existentes sin cambiar los datos guardados ni el esquema.
export const difficultyKey = (value: string) => {
  const key = value.trim().toLocaleLowerCase('es')
  return ({ intermedia: 'intermedio', avanzada: 'avanzado' } as Record<string, string>)[key] ?? key
}

// Lee franjas de texto como «08:00–10:00 · 14:00–17:00». Sin franjas no hay aviso.
export const scheduleStatus = (hours: string | undefined, time: string) => {
  const windows = [...(hours ?? '').matchAll(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/g)].map(
    ([, start, end]) => ({ start, end }),
  )
  if (!windows.length) return null
  return {
    inside: windows.some(({ start, end }) => time >= start && time <= end),
    from: windows.find(({ start }) => start > time)?.start ?? windows[0].start,
  }
}
export const nearPath = (path: Coordinate[], point: Coordinate, km: number) =>
  path.slice(1).some((end, index) => {
    const steps = Math.max(1, Math.ceil(distance(path[index], end) / 0.03))
    return Array.from({ length: steps + 1 }, (_, step) =>
      pointAlong([path[index], end], step / steps),
    ).some((value) => distance(value, point) <= km)
  })
export const reportsNear = (route: Pick<RouteData, 'geometry'>, incidents: Incident[]) =>
  publicIncidents(incidents).filter((i) => nearPath(route.geometry, i.coordinate, 0.1))
export const reportAge = (createdAt: number) => {
  const days = Math.floor((Date.now() - createdAt) / 86400000)
  return days < 1 ? 'hoy' : days === 1 ? 'hace 1 día' : `hace ${days} días`
}
// GPS simulado: un punto cada 4 s y una fracción descartada por imprecisa.
export const gpsQuality = (seconds: number) => {
  const discarded = Math.floor(seconds / 47)
  return { used: Math.floor(seconds / 4) - discarded, discarded }
}
export interface DemoEmail {
  id: string
  date: string
  to: string
  subject: string
  body: string
}
export const withEmails = <T extends { emails: DemoEmail[] }>(
  state: T,
  emails: Omit<DemoEmail, 'id' | 'date'>[],
): T => ({
  ...state,
  emails: [
    ...emails.map((email) => ({ ...email, id: uid(), date: new Date().toISOString() })),
    ...state.emails,
  ],
})
