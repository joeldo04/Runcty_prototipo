'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { Button } from './components'
import { type RouteRating, type SurveyAnswers } from './data'
import { StarRating } from './RouteQuestionnaire'

// Mismas preguntas y campos booleanos de valoracion_ruta (RF/HU-099).
export const surveyQuestions: {
  key: 'iluminacion' | 'presencia_personas' | 'transito_peligroso' | 'sensacion_seguridad'
  short: string
  text: string
  yes: string
  no: string
}[] = [
  {
    key: 'iluminacion',
    short: 'Iluminación',
    text: '¿La ruta tenía suficiente iluminación?',
    yes: 'Suficiente',
    no: 'Insuficiente',
  },
  {
    key: 'presencia_personas',
    short: 'Personas',
    text: '¿Había otras personas en el recorrido?',
    yes: 'Con personas',
    no: 'Sin personas',
  },
  {
    key: 'transito_peligroso',
    short: 'Tránsito',
    text: '¿Encontraste tránsito peligroso?',
    yes: 'Peligroso',
    no: 'Sin peligro',
  },
  {
    key: 'sensacion_seguridad',
    short: 'Seguridad',
    text: '¿Te sentiste seguro durante el recorrido?',
    yes: 'Seguro',
    no: 'Inseguro',
  },
]
const CONTINUE_DELAY = 1800
// La API no registra valoraciones: viven en el estado de la demo y nunca crean un reporte.
export const feltUnsafe = (answers?: SurveyAnswers) => answers?.sensacion_seguridad === false
export const isRouteRating = (answers?: SurveyAnswers): answers is RouteRating =>
  !!answers?.puntuacion && surveyQuestions.every(({ key }) => answers[key] !== undefined)

export default function TrainingSurvey({
  finish,
}: {
  finish: (answers?: SurveyAnswers) => void
}) {
  const [step, setStep] = useState(0),
    [answers, setAnswers] = useState<SurveyAnswers>({}),
    [commenting, setCommenting] = useState(false),
    [comment, setComment] = useState('')
  const heading = useRef<HTMLHeadingElement>(null),
    advancing = useRef<ReturnType<typeof setTimeout> | null>(null)
  const question = surveyQuestions[step],
    total = surveyQuestions.length + 1
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [step])
  const cancelAdvance = () => {
    if (advancing.current) clearTimeout(advancing.current)
    advancing.current = null
  }
  useEffect(() => cancelAdvance, [])
  const choose = (value: boolean) => {
    if (advancing.current) return
    setAnswers({ ...answers, [question.key]: value })
    // Pausa breve para que se vea la opción marcada antes de avanzar.
    advancing.current = setTimeout(() => {
      advancing.current = null
      setStep(step + 1)
    }, 260)
  }
  const rate = (stars: number) => {
    cancelAdvance()
    const next = { ...answers, puntuacion: stars, comentario: '' }
    setAnswers(next)
    if (!commenting) advancing.current = setTimeout(() => finish(next), CONTINUE_DELAY)
  }
  return (
    <div className="survey-layer">
      <section
        className="survey-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Encuesta del entrenamiento"
      >
        <span className="survey-grabber" aria-hidden="true" />
        <div className="survey-head">
          <span className="survey-finished">
            <Check /> Entrenamiento guardado
          </span>
          <span className="survey-count">
            {step + 1} de {total}
          </span>
        </div>
        <div className="survey-progress" aria-hidden="true">
          <span style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
        {question ? (
          <div className="survey-question" key={question.key}>
            <h2 ref={heading} tabIndex={-1} id="survey-question">
              {question.text}
            </h2>
            <div className="survey-options" role="group" aria-labelledby="survey-question">
              {[true, false].map((value) => {
                const selected = answers[question.key] === value
                return (
                  <button
                    key={String(value)}
                    type="button"
                    aria-pressed={selected}
                    className={selected ? 'selected' : ''}
                    onClick={() => choose(value)}
                  >
                    <span className="answer-mark" aria-hidden="true">
                      {selected && <Check />}
                    </span>
                    {value ? 'Sí' : 'No'}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="survey-question" key="rating">
            <h2 ref={heading} tabIndex={-1}>
              ¿Cómo calificarías esta ruta?
            </h2>
            <p className="survey-note">Es tu opinión personal. No cambia el índice de seguridad.</p>
            <StarRating value={answers.puntuacion ?? 0} onChange={rate} />
            {commenting ? (
              <label className="field survey-comment">
                Comentario opcional
                <textarea
                  rows={2}
                  maxLength={300}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Habla del recorrido sin incluir datos personales."
                />
                <small>{comment.length}/300 · Los comentarios pasan por revisión.</small>
              </label>
            ) : (
              !!answers.puntuacion && (
                <button
                  type="button"
                  className="text-action"
                  onClick={() => {
                    cancelAdvance()
                    setCommenting(true)
                  }}
                >
                  Añadir un comentario
                </button>
              )
            )}
            {commenting && (
              <Button
                variant="orange"
                className="full"
                disabled={!answers.puntuacion}
                onClick={() => finish({ ...answers, comentario: comment.trim() })}
              >
                Ver resumen
              </Button>
            )}
          </div>
        )}
        <div className="survey-footer">
          {step > 0 && (
            <button
              type="button"
              className="text-action"
              onClick={() => {
                cancelAdvance()
                setCommenting(false)
                setStep(step - 1)
              }}
            >
              <ArrowLeft /> Anterior
            </button>
          )}
          <button
            type="button"
            className="survey-skip"
            onClick={() => {
              cancelAdvance()
              finish()
            }}
          >
            Omitir encuesta
          </button>
        </div>
      </section>
    </div>
  )
}
