import type { CollectionConfig } from 'payload'
import { privateOwned, runnerOnly } from '@/access/runcty'
import { assignOwner, ownerField } from '@/hooks/runcty'
export const SosAlerts: CollectionConfig = {
  slug: 'sos-alerts',
  admin: { useAsTitle: 'status', group: 'RUNCTY · Actividad privada' },
  access: { read: privateOwned, create: runnerOnly, update: () => false, delete: privateOwned },
  hooks: { beforeValidate: [assignOwner] },
  fields: [
    ownerField,
    { name: 'clientKey', type: 'text', required: true, unique: true },
    { name: 'date', type: 'date', required: true },
    {
      name: 'status',
      type: 'select',
      options: ['Sin conexión · correo no enviado', 'Alerta simulada generada'],
      required: true,
    },
  ],
}
