import type { GlobalConfig } from 'payload'
import { staffOnly } from '@/access/runcty'
import { invalidateRuncty } from '@/hooks/runcty'
export const Club: GlobalConfig = {
  slug: 'runcty-club',
  label: 'Club Gacelas',
  access: { read: () => true, update: staffOnly },
  hooks: {
    afterChange: [
      ({ doc }) => {
        invalidateRuncty()
        return doc
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', defaultValue: 'Gacelas Running Team' },
    { name: 'description', type: 'textarea', maxLength: 2000 },
    {
      name: 'heroImage',
      label: 'Fotografía editorial de RUNCTY',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Imagen compartida por el selector y el acceso a la cuenta. No modifica datos deportivos.',
      },
    },
  ],
}
