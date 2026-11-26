'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import announcement from '../../../../../imagenes/anuncio_rueda_prensa.png'
import { Modal } from './components'
import { today } from './data'

const dismissedKey = 'runcty:announcement:authenticated:gacelas-prensa-2026-11-25'
// Vigencia del anuncio, igual que los banners: solo se muestra entre estas fechas (hora de Loja).
const announcementStart = '2026-11-18'
const announcementEnd = '2026-11-25'
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
      <Modal title="Invitación de Gacelas Running Team" onClose={dismiss}>
        <Image
          className="entry-announcement-image"
          src={announcement}
          alt="Invitación oficial a la rueda de prensa de Carrera Gacelas 2026. Miércoles 25 de noviembre, a las 10:00, en el Octógono de la Prefectura de Loja."
          unoptimized
          loading="eager"
          sizes="(max-width: 520px) calc(100vw - 48px), 480px"
        />
        <p className="entry-announcement-caption">Publicidad · Gacelas Running Team</p>
      </Modal>
    </div>
  )
}
