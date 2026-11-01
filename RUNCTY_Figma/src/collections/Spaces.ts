import type { CollectionConfig } from 'payload'
import { staffOnly } from '@/access/runcty'
import { publicHooks } from '@/hooks/runcty'
import { coordinateSchema, jsonValidator } from '@/lib/runcty-validation'
export const Spaces: CollectionConfig = {
  slug: 'spaces',
  admin: { useAsTitle: 'name', group: 'RUNCTY · Ciudad' },
  access: { read: () => true, create: staffOnly, update: staffOnly, delete: staffOnly },
  hooks: publicHooks,
  fields: [
    { name: 'clientKey', type: 'text', required: true, unique: true },
    { name: 'name', type: 'text', required: true },
    { name: 'type', type: 'text', required: true },
    { name: 'location', type: 'text', required: true },
    { name: 'hours', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'coordinate', type: 'json', required: true, validate: jsonValidator(coordinateSchema) },
  ],
}
