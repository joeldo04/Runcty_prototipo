import type { CollectionConfig, Access, Where } from 'payload'
import { isRunner, isStaff, owned, staffField } from '@/access/runcty'
import {
  assignOwner,
  ownerField,
  publicHooks,
  recordReview,
  requireRejectionReason,
} from '@/hooks/runcty'
import { geometrySchema, jsonValidator, restoreCoordinateTuples } from '@/lib/runcty-validation'

const readRoutes: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  const or: Where[] = [{ private: { equals: false }, status: { equals: 'Aprobado' } }]
  if (isRunner(req.user)) or.push({ owner: { equals: req.user!.id } })
  return { or }
}
export const Routes: CollectionConfig = {
  slug: 'routes',
  admin: {
    useAsTitle: 'name',
    group: 'RUNCTY · Rutas y comunidad',
    defaultColumns: ['name', 'status', 'official', 'km'],
  },
  access: {
    read: readRoutes,
    create: ({ req }) => isStaff(req.user) || isRunner(req.user),
    update: owned,
    delete: owned,
  },
  hooks: {
    ...publicHooks,
    beforeValidate: [assignOwner],
    beforeChange: [
      ({ data, req }) => {
        // Public writes still require collection access; trusted CLI seeds have no app user.
        if (isRunner(req.user) && !isStaff(req.user)) {
          data.private = true
          data.official = false
          data.verified = false
          data.status = req.context.proposing ? 'Pendiente' : null
          data.reason = null
        } else if (data.status) {
          data.private = data.status !== 'Aprobado'
          data.verified = data.status === 'Aprobado'
        }
        return data
      },
      requireRejectionReason,
    ],
    afterChange: [recordReview, ...publicHooks.afterChange],
  },
  fields: [
    { name: 'clientKey', type: 'text', required: true, unique: true, index: true },
    { name: 'name', type: 'text', required: true, maxLength: 80 },
    { name: 'slug', type: 'slug', useAsSlug: 'name' },
    { name: 'area', type: 'text', required: true, maxLength: 120 },
    { name: 'km', type: 'number', required: true, min: 0.001, max: 200 },
    { name: 'min', type: 'number', required: true, min: 1, max: 3000 },
    {
      name: 'difficulty',
      type: 'select',
      options: ['Principiante', 'Intermedia', 'Avanzada'],
      required: true,
    },
    { name: 'desc', type: 'textarea', maxLength: 1200 },
    {
      name: 'image',
      label: 'Fotografía editorial',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Imagen de ambiente; no sustituye el mapa ni valida la ruta.' },
    },
    {
      name: 'geometry',
      type: 'json',
      required: true,
      hooks: { beforeValidate: [restoreCoordinateTuples] },
      validate: jsonValidator(geometrySchema),
    },
    { name: 'segmentIds', type: 'relationship', relationTo: 'road-segments', hasMany: true },
    ownerField,
    {
      name: 'private',
      type: 'checkbox',
      defaultValue: true,
      access: { create: staffField, update: staffField },
    },
    {
      name: 'status',
      type: 'select',
      options: ['Pendiente', 'Aprobado', 'Rechazado'],
      access: { create: staffField, update: staffField },
      admin: { position: 'sidebar' },
    },
    {
      name: 'reason',
      type: 'textarea',
      access: { create: staffField, update: staffField },
      maxLength: 500,
    },
    {
      name: 'official',
      type: 'checkbox',
      defaultValue: false,
      access: { create: staffField, update: staffField },
    },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      access: { create: staffField, update: staffField },
    },
    {
      name: 'recommended',
      type: 'text',
      maxLength: 160,
      access: { create: staffField, update: staffField },
    },
    {
      name: 'baseline',
      type: 'number',
      min: 0,
      max: 100,
      access: { create: staffField, update: staffField },
    },
    { name: 'validated', type: 'text', access: { create: staffField, update: staffField } },
    { name: 'date', type: 'text' },
  ],
}
