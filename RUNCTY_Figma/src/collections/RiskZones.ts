import type { CollectionConfig } from 'payload'
import { isStaff, staffOnly } from '@/access/runcty'
import { publicHooks } from '@/hooks/runcty'
export const RiskZones: CollectionConfig = {
  slug: 'risk-zones',
  admin: { useAsTitle: 'name', group: 'RUNCTY · Rutas y comunidad' },
  access: {
    read: ({ req }) =>
      isStaff(req.user) || req.context.scoring === true || { confidential: { equals: false } },
    create: staffOnly,
    update: staffOnly,
    delete: staffOnly,
  },
  hooks: publicHooks,
  fields: [
    { name: 'clientKey', type: 'text', required: true, unique: true },
    {
      name: 'name',
      type: 'text',
      required: true,
      access: { read: ({ req, doc }) => isStaff(req.user) || doc?.confidential === false },
    },
    {
      name: 'reason',
      type: 'textarea',
      required: true,
      access: { read: ({ req, doc }) => isStaff(req.user) || doc?.confidential === false },
    },
    {
      name: 'source',
      type: 'text',
      required: true,
      access: { read: ({ req, doc }) => isStaff(req.user) || doc?.confidential === false },
    },
    { name: 'confidential', type: 'checkbox', defaultValue: true },
    { name: 'expires', type: 'text', required: true },
    { name: 'date', type: 'text', required: true },
    { name: 'street', type: 'relationship', relationTo: 'road-segments', required: true },
  ],
}
