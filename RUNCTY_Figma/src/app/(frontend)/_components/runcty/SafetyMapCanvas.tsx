'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Expand, Layers3, LocateFixed, Minus, Plus, X, LoaderCircle, MapPin } from 'lucide-react'
import {
  LOJA,
  JIPIRO,
  segmentScore,
  colorHex,
  safety,
  publicIncidents,
  pointAlong,
  type Coordinate,
  type RouteData,
  type Street,
} from './data'
import { useDemo } from './store'

export interface Props {
  route?: RouteData | null
  points?: Coordinate[]
  onPoints?: (points: Coordinate[]) => void
  drawing?: boolean
  locationPick?: boolean
  showReports?: boolean
  showSpaces?: boolean
  animateKey?: number
  tracking?: Coordinate
  track?: Coordinate[]
  follow?: boolean
  focus?: Coordinate | null
  guide?: boolean
  onRoute?: (id: string) => void
  fitRoute?: boolean
  className?: string
  onExpand?: () => void
  preview?: boolean
  context?: boolean
}

const labelElement = (text: string) => {
  const element = document.createElement('span')
  element.textContent = text
  return element
}
const pointIcon = (text: string, kind = '') =>
  L.divIcon({
    className: 'route-point ' + kind,
    html: labelElement(text),
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const mapColor = (name: string) =>
  getComputedStyle(document.body).getPropertyValue(`--color-${name}`).trim()

export default function SafetyMap(props: Props) {
  const { state, update } = useDemo()
  const { time, date } = state
  const host = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null)
  const segments = useRef<L.LayerGroup>(null),
    offlineRoads = useRef<L.LayerGroup>(null),
    markers = useRef<L.LayerGroup>(null),
    routeLayer = useRef<L.LayerGroup>(null)
  const propsRef = useRef(props)
  propsRef.current = props
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = state.roads.find((street) => street.id === selectedId) ?? null
  const [tileState, setTileState] = useState<'osm' | 'local'>('osm')
  const [recalculating, setRecalculating] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showContext, setShowContext] = useState(props.context ?? true)
  const lastAnimation = useRef<number | undefined>(undefined)
  const streetLines = useRef<Map<string, L.Polyline>>(new Map())
  const night = time === '19:00' || time === '05:30'
  // Route views can be recreated on a shared-state update without changing their geometry.
  const fitKey =
    props.fitRoute && props.route?.geometry.length
      ? JSON.stringify([props.route.id, props.route.geometry, props.animateKey])
      : ''

  useEffect(() => {
    if (!host.current) return
    const m = L.map(host.current, {
      center: state.mapView.center,
      zoom: state.mapView.zoom,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: !props.preview,
      dragging: !props.preview,
      keyboard: !props.preview,
      preferCanvas: false,
      minZoom: 11,
      maxZoom: 18,
      tapTolerance: 18,
      // Prevent deferred zoom transitions from accessing a pane after route/modal unmount.
      zoomAnimation: false,
      fadeAnimation: !prefersReducedMotion(),
      markerZoomAnimation: false,
    })
    map.current = m
    // Real pannable map background. Overlays and local geometry still work if tiles fail.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      crossOrigin: true,
    }).on('tileerror', () => setTileState('local')).on('tileload', () => setTileState('osm')).addTo(m)
    segments.current = L.layerGroup().addTo(m)
    markers.current = L.layerGroup().addTo(m)
    routeLayer.current = L.layerGroup().addTo(m)
    // Respaldo georreferenciado: conserva zoom y arrastre sin depender de las teselas.
    const offline = L.layerGroup().addTo(m)
    offlineRoads.current = L.layerGroup().addTo(offline)
    L.polygon(
      [
        [-3.972, -79.204],
        [-3.971, -79.1995],
        [-3.976, -79.199],
        [-3.9765, -79.203],
      ],
      {
        color: mapColor('safe'),
        weight: 1,
        fillColor: mapColor('safe'),
        fillOpacity: 0.08,
        interactive: false,
      },
    ).addTo(offline)
    const label = (point: Coordinate, text: string) =>
      L.marker(point, {
        icon: L.divIcon({
          className: 'local-map-label',
          html: labelElement(text),
          iconSize: [120, 20],
        }),
        interactive: false,
      }).addTo(offline)
    label(JIPIRO, 'Parque Jipiro')
    label([-3.9923, -79.2034], 'LOJA')
    label([-3.984, -79.207], 'El Valle')
    label([-3.965, -79.204], 'La Banda')
    m.on('click', (e: L.LeafletMouseEvent) => {
      const p = propsRef.current
      if (p.onPoints && (p.drawing || p.locationPick)) {
        const next: Coordinate = [+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]
        p.onPoints(p.locationPick ? [next] : [...(p.points ?? []), next])
      }
    })
    m.on('moveend', () => {
      if (propsRef.current.preview) return
      const c = m.getCenter()
      const zoom = m.getZoom()
      update((s) =>
        s.mapView.zoom === zoom &&
        Math.abs(s.mapView.center[0] - c.lat) < 0.000001 &&
        Math.abs(s.mapView.center[1] - c.lng) < 0.000001
          ? s
          : { ...s, mapView: { center: [c.lat, c.lng], zoom } },
      )
    })
    const resize = new ResizeObserver(() => m.invalidateSize({ animate: false }))
    resize.observe(host.current)
    return () => {
      resize.disconnect()
      streetLines.current.clear()
      m.stop()
      m.remove()
      map.current = null
      segments.current = null
      markers.current = null
      routeLayer.current = null
      offlineRoads.current = null
    }
  }, [])

  useEffect(() => {
    const group = offlineRoads.current
    if (!group) return
    group.clearLayers()
    state.roads.forEach((street, index) => {
      L.polyline(street.points, {
        color: mapColor('line'),
        weight: 10,
        opacity: 0.55,
        interactive: false,
      }).addTo(group)
      L.polyline(street.points, {
        color: mapColor('muted'),
        weight: 1,
        opacity: 0.3,
        interactive: false,
      }).addTo(group)
      if (index % 7 === 0)
        L.marker(street.points[0], {
          icon: L.divIcon({
            className: 'local-map-label local-street-name',
            html: labelElement(street.name.split(' · ')[0]),
            iconSize: [150, 18],
            iconAnchor: [-10, -8],
          }),
          interactive: false,
        }).addTo(group)
    })
  }, [state.roads])

  useEffect(() => {
    setRecalculating(true)
    const t = setTimeout(() => setRecalculating(false), 420)
    return () => clearTimeout(t)
  }, [time, date])

  useEffect(() => {
    const group = segments.current
    if (!group) return
    group.eachLayer((layer) => {
      if (!(layer instanceof L.Polyline)) group.removeLayer(layer)
    })
    for (const [id, line] of streetLines.current) {
      if (!state.roads.some((street) => street.id === id)) {
        group.removeLayer(line)
        streetLines.current.delete(id)
      }
    }
    state.roads.forEach((s) => {
      const value = segmentScore(s, time, date, state.incidents, state.risks),
        color = colorHex(value)
      let line = streetLines.current.get(s.id)
      if (!line) {
        line = L.polyline(s.points, {
          color,
          weight: 5,
          opacity: 0.9,
          className: 'safety-street',
          lineCap: 'round',
        }).addTo(group)
        line.on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          if (!propsRef.current.drawing && !propsRef.current.locationPick) setSelectedId(s.id)
          else map.current?.fire('click', { latlng: e.latlng })
        })
        streetLines.current.set(s.id, line)
        line.bindTooltip('', { sticky: true, className: 'street-tooltip' })
      }
      line.setLatLngs(s.points)
      line.setStyle({
        color,
        weight: selected?.id === s.id ? 8 : 5,
        opacity: showContext ? 0.9 : 0.25,
      })
      const tooltip = document.createElement('span')
      tooltip.textContent = `${s.name} · ${safety(value).label}`
      line.setTooltipContent(tooltip)
    })
  }, [
    time,
    date,
    state.incidents,
    state.risks,
    state.roads,
    state.mapView.zoom,
    selected?.id,
    showContext,
  ])

  useEffect(() => {
    const m = map.current,
      group = markers.current
    if (!m || !group) return
    group.clearLayers()
    const routeGeometry = props.route?.geometry ?? []
    const closedRoute =
      routeGeometry.length > 1 &&
      routeGeometry[0][0] === routeGeometry.at(-1)![0] &&
      routeGeometry[0][1] === routeGeometry.at(-1)![1]
    const points =
      props.points ??
      (closedRoute
        ? routeGeometry.slice(0, 1)
        : routeGeometry.filter((_, i) => i === 0 || i === routeGeometry.length - 1))
    points.forEach((p, i) => {
      const marker = L.marker(p, {
        icon: pointIcon(
          closedRoute && !props.points
            ? 'A/B'
            : i === 0
              ? 'A'
              : i === points.length - 1
                ? 'B'
                : String(i + 1),
          i === 0 ? 'start' : '',
        ),
        draggable: !!props.onPoints,
      }).addTo(group)
      marker.on('dragend', () => {
        const latlng = marker.getLatLng()
        propsRef.current.onPoints?.(
          points.map((pt, j) => (i === j ? [+latlng.lat.toFixed(6), +latlng.lng.toFixed(6)] : pt)),
        )
      })
    })
    if (props.showReports !== false)
      publicIncidents(state.incidents).forEach((incident) => {
        const marker = L.marker(incident.coordinate, {
          icon: L.divIcon({
            className: 'incident-marker',
            html: labelElement('!'),
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).addTo(group)
        const content = document.createElement('div')
        const title = document.createElement('strong')
        title.textContent = incident.type
        const detail = document.createElement('p')
        detail.textContent = `${incident.location} · ${incident.date}`
        const note = document.createElement('small')
        note.textContent =
          'Aporte revisado por el club. No garantiza las condiciones actuales del lugar.'
        content.append(title, detail, note)
        marker.bindPopup(content)
      })
    if (props.showSpaces)
      state.spaces.forEach((s) => {
        const tooltip = document.createElement('span')
        tooltip.textContent = s.name
        L.marker(s.coordinate, {
          icon: L.divIcon({
            className: 'space-map-marker',
            html: labelElement('P'),
            iconSize: [25, 25],
          }),
        })
          .addTo(group)
          .bindTooltip(tooltip)
      })
    if (props.onRoute && !props.drawing)
      state.catalog
        .filter((route) => route.geometry.length && !route.private)
        .forEach((route, index) => {
          const label = document.createElement('span')
          label.textContent = String(index + 1)
          L.marker(pointAlong(route.geometry, Math.min(0.72, 0.16 + index * 0.12)), {
            icon: L.divIcon({
              className: 'catalog-map-marker',
              html: label,
              iconSize: [28, 28],
              iconAnchor: [14, 32],
            }),
            title: `${route.name} · Ver ruta`,
          })
            .addTo(group)
            .bindTooltip(`${route.name} · Ver ruta`, {
              className: 'street-tooltip',
              direction: 'top',
            })
            .on('click', () => propsRef.current.onRoute?.(route.id))
        })
    if (!props.tracking && !points.length && !props.drawing)
      L.marker(LOJA, {
        icon: L.divIcon({
          className: 'runner-marker',
          html: labelElement(''),
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
        title: 'Punto de referencia en Loja · no es tu ubicación GPS',
      })
        .addTo(group)
        .bindTooltip('Punto de referencia · GPS no conectado', { className: 'street-tooltip' })
    if (props.tracking)
      L.marker(props.tracking, {
        icon: L.divIcon({
          className: 'runner-marker',
          html: labelElement(''),
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
        zIndexOffset: 1000,
      }).addTo(group)
  }, [
    props.points,
    props.route?.geometry,
    props.showReports,
    props.showSpaces,
    state.incidents,
    state.spaces,
    state.catalog,
    props.tracking,
    props.drawing,
    props.onRoute,
    props.locationPick,
  ])

  useEffect(() => {
    const group = routeLayer.current,
      m = map.current
    if (!group || !m) return
    const timers: ReturnType<typeof setTimeout>[] = []
    let animation: Animation | undefined
    group.clearLayers()
    const geometry = props.route?.geometry ?? props.points ?? []
    if (geometry.length > 1) {
      L.polyline(geometry, {
        color: mapColor('neon'),
        weight: 11,
        opacity: 0.35,
        lineCap: 'round',
        interactive: false,
      }).addTo(group)
      const selected = L.polyline(geometry, {
        color: mapColor('neon'),
        weight: props.guide ? 3 : 5,
        opacity: 1,
        lineCap: 'round',
        dashArray: props.guide ? '8 7' : undefined,
        className: 'selected-route',
        interactive: false,
      }).addTo(group)
      const path = selected.getElement() as SVGPathElement | null
      const animate =
        props.animateKey !== undefined &&
        lastAnimation.current !== props.animateKey &&
        !prefersReducedMotion()
      if (path && animate) {
        const length = path.getTotalLength()
        animation = path.animate(
          [
            { strokeDasharray: `${length}`, strokeDashoffset: length },
            { strokeDasharray: `${length}`, strokeDashoffset: 0 },
          ],
          { duration: 1300, easing: 'ease-out' },
        )
      }
      lastAnimation.current = props.animateKey
      if (!props.guide && props.route?.segmentIds.length)
        props.route.segmentIds.forEach((id) => {
          const s = state.roads.find((s) => s.id === id)
          if (s) {
            const line = L.polyline(s.points, {
              color: colorHex(segmentScore(s, time, date, state.incidents, state.risks)),
              weight: 5,
              opacity: animate ? 0 : 1,
              className: 'safety-street',
              interactive: false,
            }).addTo(group)
            if (animate)
              timers.push(
                setTimeout(() => {
                  if (map.current && group.hasLayer(line)) line.setStyle({ opacity: 1 })
                }, 1250),
              )
          }
        })
    }
    if (props.track && props.track.length > 1)
      L.polyline(props.track, {
        color: '#F72585',
        weight: 5,
        className: 'recorded-route',
        lineCap: 'round',
        interactive: false,
      }).addTo(group)
    return () => {
      timers.forEach(clearTimeout)
      animation?.cancel()
    }
  }, [
    props.route?.geometry,
    props.points,
    props.animateKey,
    time,
    date,
    state.incidents,
    state.risks,
    state.roads,
    props.track,
    props.guide,
    props.route?.segmentIds,
  ])

  useEffect(() => {
    const geometry = propsRef.current.route?.geometry
    if (fitKey && geometry?.length)
      map.current?.fitBounds(L.latLngBounds(geometry), {
        padding: propsRef.current.preview ? [16, 20] : [50, 65],
        maxZoom: 16,
        animate: false,
      })
  }, [fitKey])
  useEffect(() => {
    if (props.tracking && props.follow)
      map.current?.panTo(props.tracking, { animate: !prefersReducedMotion(), duration: 0.35 })
  }, [props.tracking, props.follow])
  useEffect(() => {
    if (props.focus && !props.fitRoute)
      map.current?.setView(props.focus, 16, { animate: false })
  }, [props.focus, props.fitRoute])
  useEffect(() => {
    const timer = setTimeout(() => map.current?.invalidateSize(), 50)
    return () => clearTimeout(timer)
  }, [fullscreen])
  const value = selected ? segmentScore(selected, time, date, state.incidents, state.risks) : null
  return (
    <div
      className={`live-cartography ${night ? 'map-night' : 'map-day'} ${tileState === 'local' ? 'map-local' : ''} ${props.preview ? 'map-preview' : ''} ${fullscreen ? 'map-fullscreen' : ''} ${props.className ?? ''}`}
    >
      <div
        ref={host}
        className="leaflet-host"
        data-testid="interactive-map"
        aria-label="Mapa interactivo de Loja"
      />
      <div className="map-location">
        <MapPin size={12} />
        <strong>Loja</strong>
        <span>DEMO</span>
      </div>
      <div className="map-actions">
        <button
          aria-label="Acercar mapa"
          onClick={() => map.current?.zoomIn(undefined, { animate: !prefersReducedMotion() })}
        >
          <Plus />
        </button>
        <button
          aria-label="Alejar mapa"
          onClick={() => map.current?.zoomOut(undefined, { animate: !prefersReducedMotion() })}
        >
          <Minus />
        </button>
        <button
          aria-label="Centrar mapa en Loja"
          onClick={() =>
            map.current?.flyTo(props.tracking ?? LOJA, 15, {
              animate: !prefersReducedMotion(),
              duration: 0.35,
            })
          }
        >
          <LocateFixed />
        </button>
        <button
          aria-label="Capas de seguridad"
          aria-pressed={showContext}
          onClick={() => setShowContext(!showContext)}
        >
          <Layers3 />
        </button>
        <button
          aria-label={fullscreen ? 'Cerrar mapa ampliado' : 'Ampliar mapa'}
          onClick={() => (props.onExpand ? props.onExpand() : setFullscreen(!fullscreen))}
        >
          {fullscreen ? <X /> : <Expand />}
        </button>
      </div>
      <div className="cartography-status">
        <span className={tileState === 'local' ? 'offline-dot' : 'online-dot'} />
        {tileState === 'local'
          ? state.roads.length
            ? 'Red esquemática local · demo'
            : 'Sin teselas ni red local publicada'
          : 'Mapa interactivo · OpenStreetMap'}
        <span>{state.roads.length ? 'Condiciones demo' : 'Sin información de condiciones'}</span>
      </div>
      {recalculating && (
        <div className="map-recalculating" role="status">
          <LoaderCircle /> Actualizando condiciones · {time}
        </div>
      )}
      <div className="safety-legend" data-tour="map-legend">
        <span>
          <i className="high" />
          Favorables
        </span>
        <span>
          <i className="medium" />
          Atención
        </span>
        <span>
          <i className="low" />
          Precaución
        </span>
        <span>
          <i className="none" />
          Sin datos
        </span>
      </div>
      {props.drawing && (
        <div className="drawing-hint">Pulsa para añadir puntos · arrastra A/B para editar</div>
      )}
      {selected && (
        <aside className="street-detail" aria-label="Detalle del tramo">
          <button
            className="close-detail"
            aria-label="Cerrar detalle del tramo"
            onClick={() => setSelectedId(null)}
          >
            <X />
          </button>
          <span className="eyebrow">TRAMO · INFORMACIÓN REFERENCIAL</span>
          <h3>{selected.name}</h3>
          <div className="street-value">
            <span className={`level-badge ${safety(value).key}`}>{safety(value).label}</span>
          </div>
          <ul>
            {selected.factors.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p>
            {date} · {time}
            <br />
            Información de demostración. Comprueba el entorno antes de salir.
          </p>
        </aside>
      )}
    </div>
  )
}
