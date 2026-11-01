import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  RelationshipField,
} from 'payload'
import { revalidateTag } from 'next/cache'
import { isRunner, isStaff } from '@/access/runcty'

export const ownerField: RelationshipField = {
  name: 'owner',
  type: 'relationship',
  relationTo: 'users',
  index: true,
  maxDepth: 0,
  access: {
    create: ({ req }) => isStaff(req.user),
    update: () => false,
    read: ({ req, doc }) =>
      isStaff(req.user) || (isRunner(req.user) && doc?.owner === req.user!.id),
  },
  admin: { position: 'sidebar' },
}
export const assignOwner: CollectionBeforeValidateHook = ({ data, req, operation }) => {
  if (data && operation === 'create' && isRunner(req.user))
    data.owner = req.user!.id
  return data
}
export const invalidateRuncty = (slugs: (string | undefined)[] = []) => {
  try {
    revalidateTag('runcty-public', { expire: 0 })
    for (const slug of new Set(slugs.filter(Boolean))) {
      revalidateTag(`runcty-route:${slug}`, { expire: 0 })
    }
  } catch (error) {
    if (process.env.NEXT_RUNTIME) throw error
    console.warn(
      'RUNCTY: la escritura se realizó sin la caché de Next. Publica de nuevo para actualizar las páginas públicas.',
    )
  }
}
export const recordReview: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  collection,
}) => {
  if (
    isStaff(req.user) &&
    previousDoc &&
    doc.status !== previousDoc.status &&
    ['Aprobado', 'Rechazado'].includes(doc.status)
  ) {
    await req.payload.create({
      collection: 'moderation-log',
      overrideAccess: true,
      req,
      data: {
        item: doc.name ?? doc.type ?? 'Comentario',
        decision: doc.status,
        reason: doc.reason ?? 'Revisión del club',
        moderator: req.user?.collection === 'users' ? req.user.name : 'Administración del club',
        source: `${collection.slug}:${doc.id}`,
      },
    })
  }
  return doc
}
export const requireRejectionReason: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (
    (data.status ?? originalDoc?.status) === 'Rechazado' &&
    !(data.reason ?? originalDoc?.reason)?.trim()
  )
    throw new Error('Indica el motivo del rechazo.')
  return data
}
const afterPublicChange: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  invalidateRuncty([doc.slug, previousDoc?.slug])
  return doc
}
const afterPublicDelete: CollectionAfterDeleteHook = ({ doc }) => {
  invalidateRuncty([doc.slug])
  return doc
}
export const publicHooks = {
  afterChange: [afterPublicChange],
  afterDelete: [afterPublicDelete],
}
