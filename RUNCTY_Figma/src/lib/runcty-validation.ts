import { z } from 'zod'
import type { FieldHook } from 'payload'

export const coordinateSchema = z.tuple([
  z.number().min(-4.15).max(-3.8),
  z.number().min(-79.35).max(-79.05),
])
export const geometrySchema = z.array(coordinateSchema).min(2).max(5000)
// Payload CLI currently turns nested JSON arrays into numeric-key objects.
// Restore only exact coordinate pairs before the existing geometry validation.
export const restoreCoordinateTuples: FieldHook = ({ value }) =>
  Array.isArray(value)
    ? value.map((point) =>
        point &&
        !Array.isArray(point) &&
        typeof point === 'object' &&
        Object.keys(point).length === 2 &&
        Object.hasOwn(point, '0') &&
        Object.hasOwn(point, '1')
          ? [point[0], point[1]]
          : point,
      )
    : value
export const timeSchema = z.enum(['05:30', '08:00', '14:00', '19:00'])
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => Number.isFinite(Date.parse(v)), 'Fecha inválida')
const text = (max = 120) => z.string().trim().min(1).max(max)
export const routeSchema = z.object({
  id: text(),
  name: text(80),
  area: text(),
  km: z.number().positive().max(200),
  min: z.number().int().min(1).max(3000),
  difficulty: z.enum(['Principiante', 'Intermedia', 'Avanzada']),
  desc: z.string().max(1200),
  segmentIds: z.array(text()).max(200),
  geometry: geometrySchema,
  official: z.boolean().optional(),
  verified: z.boolean().optional(),
  owner: z.string().optional(),
  status: z.enum(['Pendiente', 'Aprobado', 'Rechazado']).optional(),
  reason: z.string().max(500).optional(),
  recommended: z.string().max(160).optional(),
  date: dateSchema.optional(),
  private: z.boolean().optional(),
  baseline: z.number().min(0).max(100).optional(),
  validated: dateSchema.optional(),
})
export const contactSchema = z.object({
  id: text(),
  name: text(80),
  email: z.email(),
  phone: z.string().max(40),
})
export const incidentSchema = z.object({
  id: text(),
  type: z.enum([
    'Acoso callejero',
    'Robo o asalto',
    'Tránsito vehicular peligroso',
    'Falta de iluminación',
    'Perros',
    'Vía en mal estado',
    'Sendero o espacio cerrado',
    'Otro',
  ]),
  location: text(),
  coordinate: coordinateSchema,
  date: dateSchema,
  time: z.string().regex(/^\d{2}:\d{2}$/),
  description: z.string().max(800),
  status: z.enum(['Pendiente', 'Aprobado', 'Rechazado']),
  reason: z.string().max(500).optional(),
  owner: z.string(),
  createdAt: z.number(),
})
export const sponsorSchema = z.object({
  id: text(),
  name: text(60),
  message: text(160),
  contact: z.email(),
  active: z.boolean(),
  visual: z.enum(['mountain', 'sunrise', 'shoe']),
})
export const bannerSchema = z
  .object({
    id: text(),
    sponsorId: text(),
    title: text(100),
    start: dateSchema,
    end: dateSchema,
    placement: z.enum(['explore', 'catalog', 'club']),
    status: z.enum(['Borrador', 'Publicado', 'Pausado', 'Retirado']),
  })
  .refine((b) => b.end >= b.start, { message: 'La vigencia final debe ser posterior al inicio.' })
export const spaceSchema = z.object({
  id: text(),
  name: text(),
  type: text(60),
  location: text(),
  hours: z.string().regex(/^\d{2}:\d{2}–\d{2}:\d{2}$/),
  description: z.string().max(1200),
  coordinate: coordinateSchema,
})
export const riskSchema = z.object({
  id: text(),
  name: text(),
  reason: text(800),
  confidential: z.boolean(),
  expires: dateSchema,
  streetId: text(),
  source: text(),
  date: dateSchema,
})
export const trainingSchema = z.object({
  id: text(),
  route: routeSchema,
  date: z.iso.datetime(),
  seconds: z.number().int().min(1).max(172800),
  km: z.number().positive().max(200),
  time: timeSchema,
})
export const sharingSchema = z.object({
  token: z.uuid(),
  expires: z.number().min(0),
  revoked: z.boolean(),
})
export const sosSchema = z.object({
  id: text(),
  date: z.iso.datetime(),
  status: z.enum(['Sin conexión · correo no enviado', 'Alerta simulada generada']),
})
export const profileSchema = z.object({
  name: text(80),
  level: z.enum(['Principiante', 'Intermedio', 'Avanzado']),
  public: z.boolean(),
  email: z.email(),
})
export const roadSchema = z.object({
  id: text(),
  name: text(),
  points: geometrySchema,
  scores: z.object({
    '05:30': z.number().min(0).max(100).nullable(),
    '08:00': z.number().min(0).max(100).nullable(),
    '14:00': z.number().min(0).max(100).nullable(),
    '19:00': z.number().min(0).max(100).nullable(),
  }),
  factors: z.array(text()).max(10),
})
export const jsonValidator = (schema: z.ZodType) => (value: unknown) => {
  const result = schema.safeParse(value)
  if (result.success) return true
  const issue = result.error.issues[0]
  return `Datos inválidos${issue?.path.length ? ` en ${issue.path.join('.')}` : ''}: ${issue?.message ?? 'revisa este campo'}.`
}
