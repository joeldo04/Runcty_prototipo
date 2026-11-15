'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type TourStep = {
  id: string
  // Valor de `data-tour` o selector CSS. Con una lista, el foco abarca todos los elementos.
  target: string | string[]
  title: string
  text: string
  // Deja lista la pantalla antes de buscar el elemento. Se repite al volver a este paso.
  prepare?: () => void
}

type Box = { left: number; top: number; width: number; height: number }

const MARGIN = 12
const GAP = 12
const PADDING = 6
const SEARCH_DELAY = 60
const SEARCH_TRIES = 40

// Se abre solo para quien entra con una cuenta nueva; después, con «Ver tutorial».
export function useTour(eligible: boolean) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (eligible) setOpen(true)
  }, [eligible])
  const start = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  return { open, start, close }
}

const visible = (target: string) =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      /^[\w-]+$/.test(target) ? `[data-tour="${target}"]` : target,
    ),
  ).find((element) => element.getClientRects().length > 0)

const locate = (target: TourStep['target']) =>
  [target].flat().flatMap((value) => visible(value) ?? [])

const toBox = ({ left, top, width, height }: DOMRect | Box): Box => ({ left, top, width, height })
const sameBox = (a: Box | null, b: Box) =>
  !!a &&
  Math.abs(a.left - b.left) < 0.5 &&
  Math.abs(a.top - b.top) < 0.5 &&
  Math.abs(a.width - b.width) < 0.5 &&
  Math.abs(a.height - b.height) < 0.5

const around = (elements: HTMLElement[]): Box => {
  const rects = elements.map((element) => element.getBoundingClientRect())
  const left = Math.min(...rects.map((rect) => rect.left)) - PADDING
  const top = Math.min(...rects.map((rect) => rect.top)) - PADDING
  return {
    left,
    top,
    width: Math.max(...rects.map((rect) => rect.right)) + PADDING - left,
    height: Math.max(...rects.map((rect) => rect.bottom)) + PADDING - top,
  }
}

const viewport = (): Box => ({
  left: 0,
  top: 0,
  width: window.innerWidth,
  height: window.innerHeight,
})

// Debajo si cabe, si no arriba; en pantallas muy justas, el lado con más espacio.
function placeBubble(box: Box, area: Box, width: number, height: number) {
  const areaBottom = area.top + area.height - MARGIN
  const below = box.top + box.height + GAP
  const above = box.top - GAP - height
  const roomBelow = areaBottom - below - height
  const roomAbove = above - area.top - MARGIN
  const top =
    roomBelow >= 0 ? below : roomAbove >= 0 ? above : roomBelow > roomAbove ? areaBottom - height : area.top + MARGIN
  const left = box.left + box.width / 2 - width / 2
  return {
    left: Math.min(Math.max(left, area.left + MARGIN), area.left + area.width - MARGIN - width),
    top: Math.min(Math.max(top, area.top + MARGIN), areaBottom - height),
  }
}

export function Tour({
  steps,
  label,
  bounds,
  onClose,
}: {
  steps: TourStep[]
  label: string
  // Selector del contenedor que limita el tutorial; en móvil, el marco del teléfono.
  bounds?: string
  onClose: () => void
}) {
  const titleId = useId()
  const textId = useId()
  const [index, setIndex] = useState(0)
  const [elements, setElements] = useState<HTMLElement[]>([])
  const [box, setBox] = useState<Box | null>(null)
  const [area, setArea] = useState<Box | null>(null)
  const [radius, setRadius] = useState('0')
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const direction = useRef(1)
  const stepsRef = useRef(steps)
  stepsRef.current = steps
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const step = steps[index]
  const last = index === steps.length - 1

  const move = useCallback((delta: number) => {
    direction.current = delta
    setIndex((current) => current + delta)
  }, [])
  const advance = useCallback(() => {
    if (index >= stepsRef.current.length - 1) closeRef.current()
    else move(1)
  }, [index, move])

  // Lo que queda detrás no recibe foco ni lo anuncian los lectores de pantalla.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const others = Array.from(document.body.children).filter(
      (element) => element !== root.current && !element.hasAttribute('inert'),
    )
    others.forEach((element) => element.setAttribute('inert', ''))
    return () => {
      others.forEach((element) => element.removeAttribute('inert'))
      previous?.focus?.({ preventScroll: true })
    }
  }, [])

  // Un elemento que no está en esta pantalla se salta en el sentido de la navegación.
  useEffect(() => {
    if (index < 0) {
      direction.current = 1
      setIndex(0)
      return
    }
    const current = stepsRef.current[index]
    if (!current) {
      closeRef.current()
      return
    }
    setElements([])
    setBox(null)
    setPlace(null)
    current.prepare?.()
    let tries = 0
    let timer: ReturnType<typeof setTimeout>
    const search = () => {
      const found = locate(current.target)
      if (found.length) {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        found[0].scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' })
        setElements(found)
      } else if (++tries < SEARCH_TRIES) timer = setTimeout(search, SEARCH_DELAY)
      else setIndex((value) => value + direction.current)
    }
    timer = setTimeout(search, SEARCH_DELAY)
    return () => clearTimeout(timer)
  }, [index])

  // Sigue al elemento durante el desplazamiento, los cambios de tamaño y las cargas tardías.
  useEffect(() => {
    if (!elements.length) return
    let frame = 0
    const track = () => {
      if (!elements.every((element) => element.isConnected)) {
        const current = stepsRef.current[index]
        if (current) setElements(locate(current.target))
        return
      }
      const container = bounds ? document.querySelector<HTMLElement>(bounds) : null
      const nextArea = container ? toBox(container.getBoundingClientRect()) : viewport()
      const nextBox = around(elements)
      setArea((value) => (sameBox(value, nextArea) ? value : nextArea))
      setBox((value) => (sameBox(value, nextBox) ? value : nextBox))
      if (container) setRadius(getComputedStyle(container).borderRadius)
      frame = requestAnimationFrame(track)
    }
    track()
    return () => cancelAnimationFrame(frame)
  }, [bounds, elements, index])

  useLayoutEffect(() => {
    if (!box || !area || !bubble.current) return
    const { offsetWidth, offsetHeight } = bubble.current
    const next = placeBubble(box, area, offsetWidth, offsetHeight)
    setPlace((value) =>
      value && Math.abs(value.left - next.left) < 0.5 && Math.abs(value.top - next.top) < 0.5
        ? value
        : next,
    )
  }, [area, box, index])

  const ready = !!place
  useEffect(() => {
    if (ready) primary.current?.focus({ preventScroll: true })
  }, [index, ready])

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
      else if (event.key === 'ArrowRight') advance()
      else if (event.key === 'ArrowLeft' && index > 0) move(-1)
      else if (event.key === 'Tab') {
        const list = Array.from(
          bubble.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [],
        )
        const position = list.indexOf(document.activeElement as HTMLElement)
        event.preventDefault()
        list[(position + (event.shiftKey ? -1 : 1) + list.length) % list.length]?.focus()
      }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [advance, index, move])

  if (!step) return null
  const frame = area ?? { left: 0, top: 0, width: 0, height: 0 }
  return createPortal(
    <div className="tour-root" ref={root}>
      <div
        className="tour-area"
        style={area ? { ...area, borderRadius: radius } : { inset: 0 }}
      >
        {box ? (
          <div
            className="tour-spotlight"
            style={{
              left: box.left - frame.left,
              top: box.top - frame.top,
              width: box.width,
              height: box.height,
            }}
          />
        ) : (
          <div className="tour-dim" />
        )}
      </div>
      <div
        ref={bubble}
        className="tour-bubble"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-describedby={`${titleId} ${textId}`}
        style={{
          left: place?.left ?? 0,
          top: place?.top ?? 0,
          width: area ? Math.min(340, area.width - MARGIN * 2) : 340,
          visibility: place ? 'visible' : 'hidden',
        }}
      >
        <div className="tour-progress">
          <span aria-hidden="true">
            {steps.map(({ id }, position) => (
              <i key={id} className={position === index ? 'current' : position < index ? 'done' : ''} />
            ))}
          </span>
          <small aria-label={`Paso ${index + 1} de ${steps.length}`}>
            {index + 1}/{steps.length}
          </small>
        </div>
        <div aria-live="polite">
          <h2 id={titleId}>{step.title}</h2>
          <p id={textId}>{step.text}</p>
        </div>
        <div className="tour-actions">
          <button type="button" className="tour-skip" onClick={() => closeRef.current()}>
            Saltar
          </button>
          {index > 0 && (
            <button type="button" className="tour-back" onClick={() => move(-1)}>
              Atrás
            </button>
          )}
          <button type="button" className="tour-next" ref={primary} onClick={advance}>
            {last ? 'Listo' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
