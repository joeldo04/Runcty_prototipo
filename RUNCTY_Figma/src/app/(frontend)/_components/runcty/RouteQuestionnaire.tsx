'use client'

import { useId, useState } from 'react'
import { Check, MessageSquare, Shield, Star } from 'lucide-react'
import { Button, Modal } from './components'
import { uid, type RouteData } from './data'
import { useDemo, type DemoState, type RouteFeedback } from './store'

type Question = 'iluminacion' | 'presencia_personas' | 'transito_peligroso' | 'sensacion_seguridad'
const questions: { key: Question; text: string; help: string }[] = [
  { key: 'iluminacion', text: '¿La ruta tenía suficiente iluminación?', help: 'Piensa en el horario en que acabas de correr.' },
  { key: 'presencia_personas', text: '¿Había otras personas en el recorrido?', help: 'Corredores, peatones o personas cerca del camino.' },
  { key: 'transito_peligroso', text: '¿Encontraste tránsito peligroso?', help: 'Por ejemplo, vehículos rápidos o cruces difíciles.' },
  { key: 'sensacion_seguridad', text: '¿Te sentiste seguro durante el recorrido?', help: 'Cuéntanos cómo lo percibiste en esta salida.' },
]
export const starLabels = ['Muy mala experiencia', 'Mala experiencia', 'Regular', 'Buena', 'Excelente']
// Una valoración por corredor y ruta. La puntuación es subjetiva: nunca altera el índice de seguridad.
export function withRouteFeedback(
  current: DemoState,
  feedback: Omit<RouteFeedback, 'id_valoracion'>,
  commentId = `feedback-${feedback.id_usuario}-${feedback.id_ruta}`,
): DemoState {
  const mine = (item: RouteFeedback) =>
    item.id_usuario === feedback.id_usuario && item.id_ruta === feedback.id_ruta
  const previous = (current.routeFeedback ?? []).find(mine)
  return {
    ...current,
    routeFeedback: [
      ...(current.routeFeedback ?? []).filter((item) => !mine(item)),
      { ...feedback, id_valoracion: previous?.id_valoracion ?? uid() },
    ],
    comments: [
      ...current.comments.filter((item) => item.id !== commentId),
      ...(feedback.comentario
        ? [{ id: commentId, routeId: feedback.id_ruta, text: feedback.comentario, status: 'Pendiente' }]
        : []),
    ],
  }
}

export function StarRating({ value, onChange }: { value: number; onChange: (stars: number) => void }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="star-rating">
      <div role="group" aria-label="Calificación de la ruta" onMouseLeave={() => setHover(0)}>
        {starLabels.map((label, index) => {
          const star = index + 1
          return (
            <button
              key={label}
              type="button"
              aria-pressed={value === star}
              aria-label={`${star} de 5 estrellas: ${label}`}
              className={star <= shown ? 'filled' : ''}
              onMouseEnter={() => setHover(star)}
              onClick={() => onChange(star)}
            >
              <Star aria-hidden="true" fill={star <= shown ? 'currentColor' : 'none'} />
            </button>
          )
        })}
      </div>
      <span role="status">{shown ? starLabels[shown - 1] : 'Elige de 1 a 5 estrellas'}</span>
    </div>
  )
}

export function FeedbackStars({ value }: { value: number }) {
  return <span className="feedback-stars" role="img" aria-label={`${value} de 5 estrellas · experiencia de demostración`}>
    {Array.from({ length: 5 }, (_, i) => <Star key={i} aria-hidden="true" fill={i < value ? 'currentColor' : 'none'} className={i < value ? 'filled' : ''} />)}
  </span>
}

export function RouteFeedbackCard({ route, open }: { route: RouteData; open: () => void }) {
  const { state, user } = useDemo()
  const previous = (state.routeFeedback ?? []).find(item => item.id_ruta === route.id && item.id_usuario === user?.id)
  const completed = state.trainings.some(training => training.route.id === route.id)
  return <section className="route-feedback-card" aria-label="Cuestionario de experiencia">
    <span className="feedback-icon"><MessageSquare /></span>
    <div><span className="eyebrow">TU EXPERIENCIA CUENTA</span><h2>{previous ? 'Así viviste esta ruta.' : '¿Cómo estuvo tu recorrido?'}</h2>
      <p>{previous ? 'Puedes actualizar tus respuestas cuando vuelvas a recorrerla.' : completed ? 'Cuatro preguntas rápidas para ayudar a otros corredores.' : 'Al terminar un entrenamiento en esta ruta podrás compartir tu experiencia.'}</p>
      {previous && <FeedbackStars value={previous.puntuacion} />}
    </div>
    <Button variant={completed ? 'orange' : 'secondary'} onClick={open}>{previous ? 'Actualizar cuestionario' : completed ? 'Responder cuestionario' : 'Ver cuestionario'}</Button>
  </section>
}

export default function RouteQuestionnaire({ route, close }: { route: RouteData; close: () => void }) {
  const { state, user, isDemo, update } = useDemo()
  const formId = useId()
  const previous = (state.routeFeedback ?? []).find(item => item.id_ruta === route.id && item.id_usuario === user?.id)
  const [answers, setAnswers] = useState<Record<Question, boolean | null>>(() => ({
    iluminacion: previous?.iluminacion ?? null,
    presencia_personas: previous?.presencia_personas ?? null,
    transito_peligroso: previous?.transito_peligroso ?? null,
    sensacion_seguridad: previous?.sensacion_seguridad ?? null,
  }))
  const [comment, setComment] = useState(previous?.comentario ?? '')
  const [stars, setStars] = useState(previous?.puntuacion ?? 0)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const answered = questions.every(question => answers[question.key] !== null) && stars > 0
  const completed = state.trainings.some(training => training.route.id === route.id)
  const eligible = !!user && isDemo && completed
  return <Modal title={saved ? 'Gracias por compartir tu experiencia' : 'Cuéntanos cómo fue tu ruta'} onClose={close}>
    {saved ? <div className="feedback-confirmation" role="status"><span className="feedback-confirmed-icon"><Check /></span><h3>Tu experiencia quedó registrada en esta demo.</h3><FeedbackStars value={stars} /><p>{comment.trim() ? 'Tu comentario está pendiente de revisión. ' : ''}Puedes actualizar tus respuestas desde el detalle de la ruta. Este resultado no certifica su seguridad.</p><Button className="full" onClick={close}>Continuar</Button></div> : <form className="route-questionnaire" onSubmit={event => {
      event.preventDefault()
      if (!eligible || !answered || !user) return
      const feedback = {
        id_usuario: user.id, id_ruta: route.id,
        iluminacion: answers.iluminacion!, presencia_personas: answers.presencia_personas!,
        transito_peligroso: answers.transito_peligroso!, sensacion_seguridad: answers.sensacion_seguridad!,
        puntuacion: stars, comentario: comment.trim(), fecha_valoracion: new Date().toISOString(),
      }
      if (update(current => withRouteFeedback(current, feedback))) setSaved(true)
      else setError('No se pudieron guardar tus respuestas en la demostración.')
    }}>
      <p className="feedback-route-name">{route.name}</p><p className="feedback-intro">Responde según lo que observaste en este recorrido.</p>
      {!eligible && <p className="info-strip">Puedes conocer el cuestionario aquí. Para enviarlo, completa antes un entrenamiento con el acceso de demostración.</p>}
      {questions.map(question => <fieldset className="feedback-question" key={question.key}>
        <legend>{question.text}</legend><p id={`${formId}-${question.key}-help`}>{question.help}</p>
        <div className="feedback-options">{[true, false].map(value => <label key={String(value)} className={`feedback-choice ${answers[question.key] === value ? 'selected' : ''}`}>
          <input className="sr-only" type="radio" required name={`${formId}-${question.key}`} value={String(value)} checked={answers[question.key] === value} aria-describedby={`${formId}-${question.key}-help`} onChange={() => setAnswers(current => ({ ...current, [question.key]: value }))} />
          <span className="answer-mark" aria-hidden="true">{answers[question.key] === value && <Check />}</span>{value ? 'Sí' : 'No'}
        </label>)}</div>
      </fieldset>)}
      <div className="feedback-result"><strong>¿Cómo calificarías esta ruta?</strong><StarRating value={stars} onChange={setStars} /><p>Es tu opinión personal. No cambia el índice de seguridad de la ruta.</p></div>
      <label className="field">¿Quieres añadir algo? <span className="muted">Opcional</span><textarea rows={3} maxLength={300} value={comment} onChange={event => setComment(event.target.value)} placeholder="Habla del recorrido sin incluir datos personales." /><small>Hasta 300 caracteres. Los comentarios pasan por revisión.</small></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      {!answered && <p className="feedback-helper">Responde las cuatro preguntas y elige tus estrellas para continuar.</p>}
      <div className="feedback-actions"><Button variant="ghost" onClick={close}>Ahora no</Button><Button type="submit" variant="orange" disabled={!answered || !eligible}>Guardar respuestas</Button></div>
      <p className="feedback-privacy"><Shield />Tus respuestas se conservan solo en esta pestaña de demostración.</p>
    </form>}
  </Modal>
}
