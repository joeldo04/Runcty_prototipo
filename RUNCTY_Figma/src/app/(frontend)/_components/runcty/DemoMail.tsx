'use client'

import { useState } from 'react'
import { ArrowLeft, ChevronRight, Mail } from 'lucide-react'
import { Button, EmptyState, Modal } from './components'
import { useDemo } from './store'

// Bandeja de la demo: enseña lo que recibiría cada persona; ningún mensaje sale de esta pestaña.
export function DemoMailbox({ close }: { close: () => void }) {
  const { state } = useDemo()
  const [openId, setOpenId] = useState<string | null>(null)
  const email = state.emails.find((value) => value.id === openId)
  return (
    <Modal title="Correos simulados" wide onClose={close}>
      {email ? (
        <article className="mail-view">
          <button type="button" className="back-button" onClick={() => setOpenId(null)}>
            <ArrowLeft />
            Volver a la bandeja
          </button>
          <header>
            <strong>RUNCTY</strong>
            <span>Corre con información</span>
          </header>
          <h3>{email.subject}</h3>
          <small>Para: {email.to}</small>
          <p>{email.body}</p>
          <footer>Plantilla de demostración. Este correo no se envió a nadie.</footer>
        </article>
      ) : (
        <>
          <p className="muted">Lo que recibirían tú y tus contactos. No se envía ningún correo real.</p>
          {state.emails.length ? (
            <div className="mail-list">
              {state.emails.map((value) => (
                <button type="button" key={value.id} onClick={() => setOpenId(value.id)}>
                  <Mail />
                  <div>
                    <strong>{value.subject}</strong>
                    <small>
                      Para {value.to} ·{' '}
                      {new Date(value.date).toLocaleTimeString('es', { timeStyle: 'short' })}
                    </small>
                  </div>
                  <ChevronRight />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aún no hay correos"
              description="Añade un contacto, comparte tu recorrido o activa el SOS para verlos aquí."
            />
          )}
          <Button className="full" variant="secondary" onClick={close}>
            Cerrar
          </Button>
        </>
      )}
    </Modal>
  )
}
