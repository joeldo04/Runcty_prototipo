import brandMark from '../../../../../imagenes/logo_runcty.png'
import { averageSpeed, formatDuration, formatPace, type Coordinate } from './data'

export interface ShareCardData {
  routeName: string
  date: string
  km: number
  seconds: number
  geometry: Coordinate[]
  track: Coordinate[]
  roads: Coordinate[][]
  condition: string
  conditionColor: string
}

const WIDTH = 1080,
  HEIGHT = 1350,
  MARGIN = 64
const MAP = { x: MARGIN, y: 216, width: WIDTH - MARGIN * 2, height: 580, radius: 36 }
const NAVY = '#0f1b33',
  MUTED = '#5b6980',
  LINE = '#e3e8f0',
  ORANGE = '#ff6437',
  ROUTE = '#f72585'
const TILE_TIMEOUT = 3500

const worldX = (lng: number) => ((lng + 180) / 360) * 256
const worldY = (lat: number) => {
  const sin = Math.sin((lat * Math.PI) / 180)
  return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * 256
}
// Proyecta el recorrido dentro del panel: cada punto usa sus coordenadas reales.
function projection(points: Coordinate[]) {
  const xs = points.map((p) => worldX(p[1])),
    ys = points.map((p) => worldY(p[0]))
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys)
  const padding = 96
  const scale = Math.min(
    (MAP.width - padding * 2) / (maxX - minX || 1e-6),
    (MAP.height - padding * 2) / (maxY - minY || 1e-6),
    256 * 2 ** 16,
  )
  const left = (minX + maxX) / 2 - MAP.width / 2 / scale,
    top = (minY + maxY) / 2 - MAP.height / 2 / scale
  return {
    scale,
    left,
    top,
    point: ([lat, lng]: Coordinate): [number, number] => [
      MAP.x + (worldX(lng) - left) * scale,
      MAP.y + (worldY(lat) - top) * scale,
    ],
  }
}
const loadImage = (src: string, crossOrigin?: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    if (crossOrigin) image.crossOrigin = crossOrigin
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}
function strokeLine(ctx: CanvasRenderingContext2D, points: [number, number][]) {
  ctx.beginPath()
  points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
}
// Teselas del mismo proveedor que el mapa. Si no llegan, se usa la red local del prototipo.
async function drawTiles(
  ctx: CanvasRenderingContext2D,
  view: ReturnType<typeof projection>,
): Promise<boolean> {
  const zoom = Math.max(11, Math.min(17, Math.floor(Math.log2(view.scale))))
  const tileScale = view.scale / 2 ** zoom,
    tile = 256 * tileScale
  const firstX = Math.floor((view.left * 2 ** zoom) / 256),
    firstY = Math.floor((view.top * 2 ** zoom) / 256)
  const columns = Math.ceil(MAP.width / tile) + 1,
    rows = Math.ceil(MAP.height / tile) + 1
  const requests: Promise<void>[] = []
  let loaded = 0
  for (let column = 0; column < columns; column++)
    for (let row = 0; row < rows; row++) {
      const x = firstX + column,
        y = firstY + row
      requests.push(
        loadImage(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`, 'anonymous')
          .then((image) => {
            ctx.drawImage(
              image,
              MAP.x + ((x * 256) / 2 ** zoom - view.left) * view.scale,
              MAP.y + ((y * 256) / 2 ** zoom - view.top) * view.scale,
              tile + 1,
              tile + 1,
            )
            loaded++
          })
          .catch(() => {}),
      )
    }
  await Promise.race([
    Promise.all(requests),
    new Promise((resolve) => setTimeout(resolve, TILE_TIMEOUT)),
  ])
  return loaded >= (columns * rows) / 2
}
function drawLocalNetwork(ctx: CanvasRenderingContext2D, data: ShareCardData, view: ReturnType<typeof projection>) {
  ctx.strokeStyle = '#d5dde8'
  ctx.lineWidth = 14
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  data.roads.forEach((road) => strokeLine(ctx, road.map(view.point)))
}
function drawMap(ctx: CanvasRenderingContext2D, data: ShareCardData, view: ReturnType<typeof projection>) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#a9b4c6'
  ctx.lineWidth = 7
  ctx.setLineDash([3, 18])
  strokeLine(ctx, data.geometry.map(view.point))
  ctx.setLineDash([])
  const track = data.track.map(view.point)
  if (track.length > 1) {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 18
    strokeLine(ctx, track)
    ctx.strokeStyle = ROUTE
    ctx.lineWidth = 10
    strokeLine(ctx, track)
  }
  const dot = ([x, y]: [number, number], fill: string) => {
    ctx.beginPath()
    ctx.arc(x, y, 15, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineWidth = 7
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
  }
  if (track.length) {
    dot(track[0], NAVY)
    dot(track[track.length - 1], ORANGE)
  }
}
function fitText(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, size: number, width: number) {
  let current = size
  ctx.font = font(current)
  while (current > 40 && ctx.measureText(text).width > width) {
    current -= 2
    ctx.font = font(current)
  }
  if (ctx.measureText(text).width <= width) return text
  let short = text
  while (short.length > 1 && ctx.measureText(`${short}…`).width > width) short = short.slice(0, -1)
  return `${short}…`
}

// Dibuja la tarjeta en un canvas propio: no es una captura de la pantalla ni del teléfono.
export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas no disponible')
  const styles = getComputedStyle(document.documentElement)
  const sans = styles.getPropertyValue('--font-runcty-sans').trim() || 'system-ui, sans-serif',
    display = styles.getPropertyValue('--font-runcty-display').trim() || sans
  await Promise.all([
    document.fonts.load(`600 40px ${sans}`),
    document.fonts.load(`800 40px ${sans}`),
    document.fonts.load(`800 40px ${display}`),
  ]).catch(() => [])
  const logo = await loadImage(brandMark.src)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.textBaseline = 'alphabetic'

  ctx.font = `800 25px ${sans}`
  ctx.fillStyle = ORANGE
  ctx.letterSpacing = '4px'
  ctx.fillText('MI ENTRENAMIENTO', MARGIN, 92)
  ctx.letterSpacing = '0px'
  ctx.textAlign = 'right'
  ctx.font = `600 27px ${sans}`
  ctx.fillStyle = MUTED
  ctx.fillText(
    new Date(`${data.date}T12:00:00`).toLocaleDateString('es', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    WIDTH - MARGIN,
    92,
  )
  ctx.textAlign = 'left'
  const titleFont = (size: number) => `800 ${size}px ${display}`
  const title = fitText(ctx, data.routeName.toUpperCase(), titleFont, 84, WIDTH - MARGIN * 2)
  ctx.fillStyle = NAVY
  ctx.fillText(title, MARGIN, 182)

  const view = projection(data.geometry.length > 1 ? data.geometry : data.track)
  ctx.save()
  roundedPath(ctx, MAP.x, MAP.y, MAP.width, MAP.height, MAP.radius)
  ctx.clip()
  ctx.fillStyle = '#eef2f7'
  ctx.fillRect(MAP.x, MAP.y, MAP.width, MAP.height)
  ctx.filter = 'grayscale(0.8) contrast(0.9) brightness(1.08)'
  const tiles = await drawTiles(ctx, view)
  ctx.filter = 'none'
  if (tiles) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.34)'
    ctx.fillRect(MAP.x, MAP.y, MAP.width, MAP.height)
  } else {
    ctx.fillStyle = '#eef2f7'
    ctx.fillRect(MAP.x, MAP.y, MAP.width, MAP.height)
    drawLocalNetwork(ctx, data, view)
  }
  drawMap(ctx, data, view)
  ctx.restore()
  if (tiles) {
    ctx.font = `600 17px ${sans}`
    ctx.fillStyle = 'rgba(79, 93, 117, 0.9)'
    ctx.textAlign = 'right'
    ctx.fillText('© OpenStreetMap', MAP.x + MAP.width - 24, MAP.y + MAP.height - 20)
    ctx.textAlign = 'left'
  }

  const statsTop = 846
  ctx.font = `600 27px ${sans}`
  ctx.fillStyle = MUTED
  ctx.fillText('Distancia', MARGIN, statsTop)
  const distance = data.km.toFixed(2)
  ctx.font = `800 164px ${display}`
  ctx.fillStyle = NAVY
  ctx.fillText(distance, MARGIN - 4, statsTop + 146)
  const distanceWidth = ctx.measureText(distance).width
  ctx.font = `800 62px ${display}`
  ctx.fillStyle = ORANGE
  ctx.fillText('km', MARGIN + distanceWidth + 14, statsTop + 146)

  const condition = data.condition
  ctx.font = `600 25px ${sans}`
  const pillWidth = ctx.measureText(condition).width + 66
  const pillX = WIDTH - MARGIN - pillWidth,
    pillY = statsTop + 88
  roundedPath(ctx, pillX, pillY, pillWidth, 56, 28)
  ctx.fillStyle = '#f4f6fa'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(pillX + 30, pillY + 28, 9, 0, Math.PI * 2)
  ctx.fillStyle = data.conditionColor
  ctx.fill()
  ctx.fillStyle = NAVY
  ctx.fillText(condition, pillX + 50, pillY + 37)

  const columns: [string, string][] = [
    ['Tiempo', formatDuration(data.seconds)],
    ['Ritmo promedio', `${formatPace(data.seconds, data.km)} /km`],
    ['Velocidad', `${averageSpeed(data.seconds, data.km).toFixed(1)} km/h`],
  ]
  const columnWidth = (WIDTH - MARGIN * 2) / columns.length
  columns.forEach(([label, value], index) => {
    const x = MARGIN + columnWidth * index
    ctx.font = `600 26px ${sans}`
    ctx.fillStyle = MUTED
    ctx.fillText(label, x, 1062)
    ctx.font = `800 58px ${display}`
    ctx.fillStyle = NAVY
    ctx.fillText(value, x, 1126)
  })

  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(MARGIN, 1170)
  ctx.lineTo(WIDTH - MARGIN, 1170)
  ctx.stroke()

  const logoSize = 104,
    logoX = MARGIN,
    logoY = 1200
  ctx.save()
  ctx.beginPath()
  ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#000000'
  ctx.fillRect(logoX, logoY, logoSize, logoSize)
  // El PNG original es cuadrado con margen negro: el círculo solo recorta ese margen.
  const inset = logoSize * 0.2
  ctx.drawImage(logo, logoX - inset, logoY - inset, logoSize + inset * 2, logoSize + inset * 2)
  ctx.restore()
  ctx.font = `800 54px ${display}`
  ctx.fillStyle = NAVY
  ctx.fillText('RUNCTY', logoX + logoSize + 26, logoY + 50)
  ctx.font = `600 25px ${sans}`
  ctx.fillStyle = MUTED
  ctx.fillText('Corre con confianza', logoX + logoSize + 26, logoY + 88)
  ctx.textAlign = 'right'
  ctx.font = `600 22px ${sans}`
  ctx.fillText('Entrenamiento simulado', WIDTH - MARGIN, logoY + 62)

  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Sin imagen'))), 'image/png')
    } catch (error) {
      reject(error)
    }
  })
}
