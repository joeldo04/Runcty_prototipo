'use client'

import { useEffect } from 'react'

// Solo en producción: en desarrollo el service worker guardaría versiones viejas.
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
