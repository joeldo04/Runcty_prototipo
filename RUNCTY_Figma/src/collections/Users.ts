import type { CollectionConfig } from 'payload'
import { isRunner, isSystem, ownUser, systemField, systemOnly } from '@/access/runcty'
import { contactSchema, jsonValidator, timeSchema } from '@/lib/runcty-validation'
import { z } from 'zod'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'name', group: 'RUNCTY · Cuentas' },
  access: {
    create: () => true,
    read: ownUser,
    update: ownUser,
    delete: systemOnly,
    admin: () => false,
  },
  hooks: {
    beforeValidate: [
      ({ data, req, operation }) => {
        if (data && operation === 'create' && !isSystem(req.user)) {
          data.role = 'corredor'
          data.active = true
          data.savedRoutes = []
        }
        return data
      },
    ],
    beforeLogin: [
      ({ user }) => {
        if (user.active === false) throw new Error('Esta cuenta está desactivada.')
      },
    ],
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        if (
          operation === 'update' &&
          isRunner(req.user) &&
          Array.isArray(data.savedRoutes) &&
          !isSystem(req.user)
        ) {
          const ids = [...new Set(data.savedRoutes.map(value =>
            typeof value === 'object' && value ? value.id : value,
          ))]
          if (ids.length) {
            const visible = await req.payload.find({
              collection: 'routes',
              where: { id: { in: ids } },
              depth: 0,
              limit: 200,
              overrideAccess: false,
              user: req.user,
              req,
            })
            if (visible.docs.length !== ids.length)
              throw new Error('Solo puedes guardar rutas públicas o propias.')
          }
        }
        if (!isSystem(req.user) && originalDoc) {
          data.role = originalDoc.role
          data.active = originalDoc.active
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, defaultValue: 'Corredor', maxLength: 80 },
    {
      name: 'role',
      type: 'select',
      options: ['corredor', 'club', 'sistema'],
      required: true,
      defaultValue: 'corredor',
      saveToJWT: true,
      access: { create: systemField, update: systemField },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      saveToJWT: true,
      access: { create: systemField, update: systemField },
    },
    {
      name: 'level',
      type: 'select',
      options: ['Principiante', 'Intermedio', 'Avanzado'],
      defaultValue: 'Intermedio',
    },
    { name: 'publicProfile', type: 'checkbox', defaultValue: false },
    {
      name: 'savedRoutes',
      type: 'relationship',
      relationTo: 'routes',
      hasMany: true,
    },
    {
      name: 'contacts',
      type: 'json',
      validate: jsonValidator(z.array(contactSchema).max(5)),
      defaultValue: [],
    },
    { name: 'preferredTime', type: 'select', options: timeSchema.options, defaultValue: '08:00' },
    { name: 'preferredDate', type: 'text' },
  ],
}
