import type { CollectionConfig, Access, Where } from 'payload'
import { isRunner, isStaff, owned, runnerOnly, staffField, staffOnly } from '@/access/runcty'
import {
  assignOwner,
  ownerField,
  publicHooks,
  recordReview,
  requireRejectionReason,
} from '@/hooks/runcty'
import { coordinateSchema, incidentSchema, jsonValidator } from '@/lib/runcty-validation'
const readIncidents: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  const or: Where[] = [{ status: { equals: 'Aprobado' }, createdAt: { greater_than: new Date(Date.now() - 30 * 86400000).toISOString() } }]
  if (isRunner(req.user)) or.push({ owner: { equals: req.user!.id } })
  return { or }
}
export const Incidents: CollectionConfig = {
  slug: 'incidents',
  admin: { useAsTitle: 'type', group: 'RUNCTY · Rutas y comunidad' },
  access: {
    create: runnerOnly,
    read: readIncidents,
    update: staffOnly,
    delete: staffOnly,
  },
  hooks: {
    ...publicHooks,
    beforeValidate: [assignOwner],
    beforeChange: [
      ({ data, req, operation }) => {
        if (!isStaff(req.user) && operation === 'create') {
          data.status = 'Pendiente'
          data.reason = null
        }
        if (
          data.date &&
          data.time &&
          new Date(`${data.date}T${data.time}-05:00`).getTime() > Date.now() + 60000
        )
          throw new Error('La fecha del incidente no puede ser futura.')
        return data
      },
      requireRejectionReason,
    ],
    afterChange: [recordReview, ...publicHooks.afterChange],
  },
  fields: [
    ownerField,
    { name: 'clientKey', type: 'text', required: true, unique: true },
    { name: 'type', type: 'select', required: true, options: incidentSchema.shape.type.options },
    { name: 'location', type: 'text', required: true, maxLength: 120 },
    { name: 'coordinate', type: 'json', required: true, validate: jsonValidator(coordinateSchema) },
    { name: 'date', type: 'text', required: true },
    { name: 'time', type: 'text', required: true },
    { name: 'description', type: 'textarea', maxLength: 800 },
    {
      name: 'status',
      type: 'select',
      options: ['Pendiente', 'Aprobado', 'Rechazado'],
      defaultValue: 'Pendiente',
      access: { create: staffField, update: staffField },
    },
    {
      name: 'reason',
      type: 'textarea',
      maxLength: 500,
      access: { create: staffField, update: staffField },
    },
  ],
}
