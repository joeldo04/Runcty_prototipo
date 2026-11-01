import type { CollectionConfig } from 'payload'
import { privateOwned, runnerOnly } from '@/access/runcty'
import { assignOwner, ownerField } from '@/hooks/runcty'
import { jsonValidator, routeSchema, timeSchema } from '@/lib/runcty-validation'
export const Trainings: CollectionConfig = {
  slug: 'trainings',
  admin: { useAsTitle: 'name', group: 'RUNCTY · Actividad privada' },
  access: { create: runnerOnly, read: privateOwned, update: () => false, delete: privateOwned },
  hooks: {
    beforeValidate: [assignOwner],
    beforeChange: [async ({ data, req }) => {
      if (data.route) {
        const route = await req.payload.findByID({
          collection: 'routes',
          id: typeof data.route === 'object' ? data.route.id : data.route,
          depth: 0, overrideAccess: false, user: req.user, req,
        })
        if (!route) throw new Error('La ruta no está disponible para tu cuenta.')
      }
      return data
    }],
  },
  fields: [
    ownerField,
    { name: 'clientKey', type: 'text', required: true, unique: true },
    { name: 'name', type: 'text', required: true },
    { name: 'route', type: 'relationship', relationTo: 'routes' },
    { name: 'routeSnapshot', type: 'json', required: true, validate: jsonValidator(routeSchema) },
    { name: 'date', type: 'date', required: true },
    { name: 'seconds', type: 'number', required: true, min: 1, max: 172800 },
    { name: 'km', type: 'number', required: true, min: 0.001, max: 200 },
    { name: 'time', type: 'select', options: timeSchema.options, required: true },
  ],
}
