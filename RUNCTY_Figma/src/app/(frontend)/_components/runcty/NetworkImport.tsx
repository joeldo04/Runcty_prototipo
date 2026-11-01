'use client'

import { useState } from 'react'
import { Check, FileUp } from 'lucide-react'
import { Button, Modal } from './components'
import { LOJA, type Coordinate } from './data'
import { DEMO_ROADS } from './demo-seed'
import { useDemo } from './store'

type City = { id: string; name: string }
type Limits = { south: number; west: number; north: number; east: number }
type Result = { streets: number; lit: number; types: string[] }

const LIMITS: Record<string, Limits> = {
  loja: { south: -4.08, west: -79.3, north: -3.9, east: -79.12 },
  catamayo: { south: -4.02, west: -79.4, north: -3.94, east: -79.31 },
}
const centerOf = ({ south, west, north, east }: Limits): Coordinate => [
  (south + north) / 2,
  (west + east) / 2,
]
const roadTypes = ['residential', 'tertiary', 'footway']

// GeoJSON de ejemplo: la red demo trasladada al punto indicado.
const sampleNetwork = (center: Coordinate) =>
  JSON.stringify({
    type: 'FeatureCollection',
    features: DEMO_ROADS.map((road, index) => ({
      type: 'Feature',
      properties: { highway: roadTypes[index % roadTypes.length], lit: index % 3 ? 'yes' : undefined },
      geometry: {
        type: 'LineString',
        coordinates: road.points.map(([lat, lng]) => [
          lng + center[1] - LOJA[1],
          lat + center[0] - LOJA[0],
        ]),
      },
    })),
  })

type Feature = { geometry?: { type?: string; coordinates?: unknown }; properties?: Record<string, unknown> }
function readNetwork(text: string, limits?: Limits): Result {
  let data: { features?: Feature[] }
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un GeoJSON válido.')
  }
  const lines = (data.features ?? []).filter((feature) => feature.geometry?.type === 'LineString')
  if (!lines.length) throw new Error('El archivo no contiene calles (LineString).')
  const inside = (position: unknown) => {
    if (!limits) return true
    const [lng, lat] = position as number[]
    return lat >= limits.south && lat <= limits.north && lng >= limits.west && lng <= limits.east
  }
  if (!lines.every((line) => (line.geometry?.coordinates as unknown[]).every(inside)))
    throw new Error('El archivo no corresponde a los límites de la ciudad.')
  return {
    streets: lines.length,
    lit: lines.filter((line) => line.properties?.lit === 'yes').length,
    types: [...new Set(lines.map((line) => String(line.properties?.highway ?? 'sin tipo')))],
  }
}

export function NetworkImport({ city, close }: { city: City; close: () => void }) {
  const { update, notify } = useDemo()
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const limits = LIMITS[city.id]
  const load = (text: string) => {
    try {
      const summary = readNetwork(text, limits)
      setResult(summary)
      setError('')
      update((s) => ({
        ...s,
        cities: s.cities.map((value) =>
          value.id === city.id ? { ...value, networkReady: true } : value,
        ),
      }))
      notify(`Red de ${city.name} cargada en esta demostración.`)
    } catch (problem) {
      setResult(null)
      setError((problem as Error).message)
    }
  }
  const outside = centerOf(city.id === 'loja' ? LIMITS.catamayo : LIMITS.loja)
  return (
    <Modal title={`Cargar red de calles · ${city.name}`} onClose={close}>
      <p className="muted">
        Sube un GeoJSON de datos abiertos, como OpenStreetMap. La demo lo valida en este navegador y
        no cambia las calles del mapa.
      </p>
      <label className="field">
        Archivo GeoJSON
        <input
          type="file"
          accept=".geojson,.json"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (file) load(await file.text())
          }}
        />
      </label>
      <div className="modal-actions">
        <Button
          variant="secondary"
          onClick={() => load(sampleNetwork(limits ? centerOf(limits) : LOJA))}
        >
          <FileUp />
          Usar ejemplo
        </Button>
        <Button variant="ghost" onClick={() => load(sampleNetwork(outside))}>
          Probar archivo incorrecto
        </Button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="network-result" role="status">
          <Check />
          <div>
            <strong>{result.streets} tramos validados</strong>
            <p>
              {result.lit} con información de iluminación · Tipos de vía: {result.types.join(', ')}
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}
