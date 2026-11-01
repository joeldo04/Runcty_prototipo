import type { CollectionConfig } from 'payload'
import { systemOnly } from '@/access/runcty'
import { publicHooks } from '@/hooks/runcty'
export const Cities: CollectionConfig = {
  slug: 'cities',
  admin: { useAsTitle: 'name', group: 'RUNCTY · Ciudad' },
  access: { read: () => true, create: systemOnly, update: systemOnly, delete: systemOnly },
  hooks: {
    ...publicHooks,
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data.enabled && !(data.networkReady ?? originalDoc?.networkReady))
          throw new Error('Carga y valida la red antes de habilitar la ciudad.')
        return data
      },
    ],
  },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'name', type: 'text', required: true },
    { name: 'networkReady', type: 'checkbox', defaultValue: false },
    { name: 'enabled', type: 'checkbox', defaultValue: false },
  ],
}
