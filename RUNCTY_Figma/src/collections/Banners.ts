import type { CollectionConfig } from 'payload'
import { isStaff, staffOnly } from '@/access/runcty'
import { publicHooks } from '@/hooks/runcty'
export const Banners: CollectionConfig = {
  slug: 'banners',
  admin: { useAsTitle: 'title', group: 'RUNCTY · Aliados' },
  access: {
    read: ({ req }) => isStaff(req.user) || { status: { equals: 'Publicado' } },
    create: staffOnly,
    update: staffOnly,
    delete: staffOnly,
  },
  hooks: {
    ...publicHooks,
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const start = data.start ?? originalDoc?.start,
          end = data.end ?? originalDoc?.end
        if (end < start) throw new Error('La fecha final debe ser posterior al inicio.')
        const sponsorId = data.sponsor ?? originalDoc?.sponsor
        const sponsor = await req.payload.findByID({
          collection: 'sponsors',
          id: typeof sponsorId === 'object' ? sponsorId.id : sponsorId,
          overrideAccess: false,
          user: req.user,
          req,
        })
        if (!sponsor) throw new Error('Selecciona un patrocinador válido.')
        return data
      },
    ],
  },
  fields: [
    { name: 'clientKey', type: 'text', required: true, unique: true },
    { name: 'sponsor', type: 'relationship', relationTo: 'sponsors', required: true },
    { name: 'title', type: 'text', required: true, maxLength: 100 },
    { name: 'start', type: 'text', required: true },
    { name: 'end', type: 'text', required: true },
    { name: 'placement', type: 'select', options: ['explore', 'catalog', 'club'], required: true },
    {
      name: 'status',
      type: 'select',
      options: ['Borrador', 'Publicado', 'Pausado', 'Retirado'],
      required: true,
      defaultValue: 'Borrador',
    },
  ],
}
