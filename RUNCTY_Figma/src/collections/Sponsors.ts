import type { CollectionConfig } from 'payload'
import { isStaff, staffOnly } from '@/access/runcty'
import { publicHooks } from '@/hooks/runcty'
export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  admin: { useAsTitle: 'name', group: 'RUNCTY · Aliados' },
  access: { read: () => true, create: staffOnly, update: staffOnly, delete: staffOnly },
  hooks: publicHooks,
  fields: [
    { name: 'clientKey', type: 'text', required: true, unique: true },
    { name: 'name', type: 'text', required: true, maxLength: 60 },
    { name: 'message', type: 'textarea', required: true, maxLength: 160 },
    {
      name: 'contact',
      type: 'email',
      required: true,
      access: { read: ({ req }) => isStaff(req.user) },
    },
    { name: 'active', type: 'checkbox', defaultValue: true },
    {
      name: 'visual',
      type: 'select',
      options: ['mountain', 'sunrise', 'shoe'],
      defaultValue: 'mountain',
    },
    { name: 'image', type: 'upload', relationTo: 'media' },
  ],
}
