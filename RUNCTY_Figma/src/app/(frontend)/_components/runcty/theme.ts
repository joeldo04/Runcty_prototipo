'use client'

import { useCallback, useSyncExternalStore } from 'react'

// Apariencia de la app móvil del corredor. Es una preferencia del dispositivo: no se envía a la
// API ni cambia la paleta; el modo oscuro es una capa de estilos aparte (runcty-oscuro.css).
export type Theme = 'claro' | 'oscuro'

const STORAGE_KEY = 'runcty:tema'
const CHANGE_EVENT = 'runcty:tema-cambiado'
// Respaldo en memoria por si el navegador bloquea el almacenamiento: el interruptor sigue funcionando.
let memoryTheme: Theme = 'claro'

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'oscuro' || stored === 'claro') return stored
  } catch {
    // Sin acceso al almacenamiento se usa el valor en memoria.
  }
  return memoryTheme
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  // Mantiene sincronizadas otras pestañas abiertas del mismo navegador.
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'claro' as Theme)
  const setTheme = useCallback((next: Theme) => {
    memoryTheme = next
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Se conserva solo durante esta visita.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])
  return [theme, setTheme] as const
}
