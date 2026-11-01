import type { CollectionConfig, Where } from 'payload'
import { isRunner, isStaff, runnerOnly, staffField, staffOnly } from '@/access/runcty'
import {
  assignOwner,
  ownerField,
  publicHooks,
  recordReview,
  requireRejectionReason,
} from '@/hooks/runcty'
export const CommunityComments: CollectionConfig = {
  slug: 'community-comments',
  admin: { useAsTitle: 'text', group: 'RUNCTY · Rutas y comunidad' },
  access: {
    read: ({ req }) => {
      if (isStaff(req.user)) return true
      const or: Where[] = [{ status: { equals: 'Aprobado' } }]
      if (isRunner(req.user)) or.push({ owner: { equals: req.user!.id } })
      return { or }
    },
    create: runnerOnly,
    update: staffOnly,
    delete: staffOnly,
  },
  hooks: {
    ...publicHooks,
    beforeValidate: [assignOwner],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const value = data.route ?? originalDoc?.route
        if (!value) throw new Error('Elige una ruta pública para tu comentario.')
        if (value) {
          const route = await req.payload.findByID({
            collection: 'routes',
            id: typeof value === 'object' ? value.id : value,
            depth: 0, overrideAccess: false, user: req.user, req,
          })
          if (!route || route.private || route.status !== 'Aprobado')
            throw new Error('Solo se pueden comentar rutas públicas disponibles.')
        }
        return data
      },
      requireRejectionReason,
    ],
    afterChange: [recordReview, ...publicHooks.afterChange],
  },
  fields: [
    ownerField,
    { name: 'clientKey', type: 'text', required: true, unique: true },
    { name: 'text', type: 'textarea', required: true, maxLength: 800 },
    { name: 'route', type: 'relationship', relationTo: 'routes' },
    {
      name: 'status',
      type: 'select',
      options: ['Pendiente', 'Aprobado', 'Rechazado'],
      defaultValue: 'Pendiente',
      access: { create: staffField, update: staffField },
    },
    {
      name: 'reason',
      type: 'text',
      maxLength: 500,
      access: { create: staffField, update: staffField },
    },
  ],
}
