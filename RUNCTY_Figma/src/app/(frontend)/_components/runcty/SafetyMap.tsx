'use client'

import dynamic from 'next/dynamic'
import type { Props } from './SafetyMapCanvas'

const MapCanvas = dynamic(() => import('./SafetyMapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-64 w-full animate-pulse place-items-center rounded-xl bg-shell text-xs text-dim">
      Cargando el mapa de Loja…
    </div>
  ),
})
export default function SafetyMap(props: Props) {
  return <MapCanvas {...props} />
}
