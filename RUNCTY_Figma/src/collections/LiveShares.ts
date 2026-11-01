import type { Access, CollectionConfig, Where } from 'payload'
import { isRunner, privateOwned, runnerOnly } from '@/access/runcty'
import { assignOwner, ownerField } from '@/hooks/runcty'
import { coordinateSchema, jsonValidator } from '@/lib/runcty-validation'
const readShares: Access = ({ req }): boolean | Where => {
  if (typeof req.context.shareToken === 'string') {
    const and: Where[] = [
      { token: { equals: req.context.shareToken } },
      { revoked: { equals: false } },
      { expires: { greater_than: new Date().toISOString() } },
    ]
    return { and }
  }
  return isRunner(req.user) ? { owner: { equals: req.user!.id } } : false
}
export const LiveShares: CollectionConfig = {
  slug: 'live-shares',
  admin: { useAsTitle: 'token', group: 'RUNCTY · Actividad privada' },
  access: {
    read: readShares,
    create: runnerOnly, update: privateOwned, delete: privateOwned,
  },
  hooks: {
    beforeValidate: [assignOwner],
    beforeChange: [
      ({ data, originalDoc }) => {
        if (originalDoc?.revoked && data.revoked === false)
          throw new Error('Un enlace revocado no se puede reactivar.')
        if (originalDoc && data.token && data.token !== originalDoc.token)
          throw new Error('No se puede cambiar el identificador de un enlace.')
        if (originalDoc && data.expires && Date.parse(data.expires) !== Date.parse(originalDoc.expires))
          throw new Error('Crea un enlace nuevo para cambiar su vigencia.')
        if (data.expires && new Date(data.expires).getTime() > Date.now() + 4 * 3600000 + 60000)
          throw new Error('La vigencia máxima es de cuatro horas.')
        return data
      },
    ],
  },
  fields: [
    { ...ownerField, access: { ...ownerField.access, read: ({ req }) => isRunner(req.user) } },
    { name: 'token', type: 'text', required: true, unique: true },
    { name: 'expires', type: 'date', required: true },
    { name: 'revoked', type: 'checkbox', defaultValue: false },
    { name: 'position', type: 'json', required: true, validate: jsonValidator(coordinateSchema) },
    { name: 'alert', type: 'checkbox', defaultValue: false },
  ],
}
