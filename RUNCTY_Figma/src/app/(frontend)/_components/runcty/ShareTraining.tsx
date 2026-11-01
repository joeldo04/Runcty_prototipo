'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, LoaderCircle, Share2 } from 'lucide-react'
import { Button, Modal } from './components'
import { renderShareCard, type ShareCardData } from './shareCard'
import { useDemo } from './store'

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export default function ShareTraining({
  card,
  close,
}: {
  card: ShareCardData
  close: () => void
}) {
  const { notify } = useDemo()
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null),
    [failed, setFailed] = useState(false),
    [sharing, setSharing] = useState(false)
  useEffect(() => {
    let active = true,
      url = ''
    renderShareCard(card)
      .then((blob) => {
        if (!active) return
        url = URL.createObjectURL(blob)
        setImage({ blob, url })
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [card])
  const fileName = `runcty-${slug(card.routeName)}-${card.date}.png`
  const file = useMemo(
    () => (image ? new File([image.blob], fileName, { type: 'image/png' }) : null),
    [image, fileName],
  )
  const nativeShare = !!file && !!navigator.canShare?.({ files: [file] })
  const download = () => {
    if (!image) return
    const link = document.createElement('a')
    link.href = image.url
    link.download = fileName
    link.click()
    notify('Imagen descargada como PNG.')
  }
  const share = async () => {
    if (!file) return
    setSharing(true)
    try {
      await navigator.share({
        files: [file],
        title: 'Mi entrenamiento en RUNCTY',
        text: `${card.routeName} · ${card.km.toFixed(2)} km`,
      })
    } catch (error) {
      if ((error as Error).name !== 'AbortError')
        notify('No se pudo compartir. Descarga la imagen y compártela desde tu galería.')
    } finally {
      setSharing(false)
    }
  }
  return (
    <Modal title="Comparte tu entrenamiento" onClose={close}>
      <div className="share-preview">
        {image ? (
          <img src={image.url} alt={`Tarjeta de ${card.routeName} con el recorrido y las estadísticas`} />
        ) : failed ? (
          <p role="alert">No se pudo generar la imagen. Inténtalo de nuevo.</p>
        ) : (
          <span role="status">
            <LoaderCircle /> Preparando tu imagen…
          </span>
        )}
      </div>
      <div className="share-actions-row">
        {nativeShare && (
          <Button variant="orange" className="full" disabled={sharing} onClick={share}>
            <Share2 /> {sharing ? 'Abriendo…' : 'Compartir imagen'}
          </Button>
        )}
        <Button
          className="full"
          variant={nativeShare ? 'secondary' : 'orange'}
          disabled={!image}
          onClick={download}
        >
          <Download /> Descargar PNG
        </Button>
      </div>
      {!!image && !nativeShare && (
        <small>Este navegador no comparte imágenes directamente. Descárgala y compártela donde quieras.</small>
      )}
    </Modal>
  )
}
