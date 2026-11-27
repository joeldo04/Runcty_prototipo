'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import announcement from '../../../../../imagenes/anuncio_carrera.png'
import { Modal } from './components'
import { today } from './data'

// Carrera Gacelas 5K: domingo 20 de diciembre de 2026, 07h30, Plaza de San Sebastián.
const dismissedKey = 'runcty:announcement:authenticated:carrera-gacelas-5k-2026-12-20'
// Vigencia del anuncio, igual que los banners: solo se muestra entre estas fechas (hora de Loja)
// y deja de salir solo después del día de la carrera.
const announcementStart = '2026-11-26'
const announcementEnd = '2026-12-20'
const announcementActive = () => {
  const current = today()
  return current >= announcementStart && current <= announcementEnd
}

export default function EntryAnnouncement({ enabled, accountId }: { enabled: boolean; accountId: string | null }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!accountId) {
      setOpen(false)
      try {
        window.sessionStorage.removeItem(dismissedKey)
      } catch {
        // El acceso sigue funcionando si el navegador bloquea el almacenamiento.
      }
      return
    }
    if (!enabled || !announcementActive()) {
      setOpen(false)
      return
    }
    try {
      if (window.sessionStorage.getItem(dismissedKey) === accountId) return
    } catch {
      // El anuncio también se puede cerrar si el navegador bloquea el almacenamiento.
    }
    setOpen(true)
  }, [enabled, accountId])

  const dismiss = () => {
    setOpen(false)
    try {
      if (accountId) window.sessionStorage.setItem(dismissedKey, accountId)
    } catch {
      // Cerrar siempre funciona, aunque no se pueda recordar durante la visita.
    }
  }

  if (!accountId || !enabled || !open) return null

  return (
    <div className="entry-announcement">
      <Modal title="Carrera Gacelas 5K" onClose={dismiss}>
        <Image
          className="entry-announcement-image"
          src={announcement}
          alt="Carrera Gacelas 5K 2026. Domingo 20 de diciembre de 2026 a las 07h30 en la Plaza de San Sebastián. Categorías Gacelas 5K, Gacelitos, Gacelas Doradas 1K y Gacelas Inclusivas 1K. Inscripción de 8 dólares; lo recaudado se dona al Centro El Ángel de la Prefectura de Loja."
          unoptimized
          loading="eager"
          sizes="(max-width: 520px) calc(100vw - 48px), 480px"
        />
        <p className="entry-announcement-caption">Publicidad · Gacelas Running Team</p>
      </Modal>
    </div>
  )
}
