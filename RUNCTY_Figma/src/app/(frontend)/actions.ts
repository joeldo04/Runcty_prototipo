'use server'

import { z } from 'zod'
import { appAuth } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'
import { getRunctySession, getPublicRuncty, keyOf } from '@/lib/runcty-queries'
import { isStaff, isSystem } from '@/access/runcty'
import {
  routeSchema,
  contactSchema,
  incidentSchema,
  sponsorSchema,
  bannerSchema,
  spaceSchema,
  riskSchema,
  trainingSchema,
  sharingSchema,
  sosSchema,
  profileSchema,
  dateSchema,
  timeSchema,
  coordinateSchema,
} from '@/lib/runcty-validation'
import type { User } from '@/payload-types'

const id = z.string().min(1).max(120)
const operation = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('route.save'), value: routeSchema }),
  z.object({ kind: z.literal('route.delete'), id }),
  z.object({ kind: z.literal('saved.set'), value: z.array(id).max(200) }),
  z.object({ kind: z.literal('incident.save'), value: incidentSchema }),
  z.object({ kind: z.literal('sponsor.save'), value: sponsorSchema }),
  z.object({ kind: z.literal('banner.save'), value: bannerSchema }),
  z.object({ kind: z.literal('space.save'), value: spaceSchema }),
  z.object({ kind: z.literal('space.delete'), id }),
  z.object({ kind: z.literal('risk.save'), value: riskSchema }),
  z.object({ kind: z.literal('training.save'), value: trainingSchema }),
  z.object({ kind: z.literal('training.delete'), id }),
  z.object({ kind: z.literal('profile.set'), value: profileSchema }),
  z.object({ kind: z.literal('contacts.set'), value: z.array(contactSchema).max(5) }),
  z.object({ kind: z.literal('sharing.set'), value: sharingSchema.nullable() }),
  z.object({ kind: z.literal('sharing.position'), value: coordinateSchema }),
  z.object({ kind: z.literal('sos.save'), value: sosSchema }),
  z.object({
    kind: z.literal('comment.create'),
    value: z.object({ id, text: z.string().trim().min(1).max(800), routeId: id }),
  }),
  z.object({
    kind: z.literal('comment.review'),
    value: z.object({
      id,
      status: z.enum(['Pendiente', 'Aprobado', 'Rechazado']),
      reason: z.string().max(500).optional(),
    }),
  }),
  z.object({ kind: z.literal('user.status'), value: z.object({ id, active: z.boolean() }) }),
  z.object({ kind: z.literal('club.set'), value: z.string().trim().min(1).max(2000) }),
  z.object({
    kind: z.literal('city.save'),
    value: z.object({
      id,
      name: z.string().min(1).max(100),
      networkReady: z.boolean(),
      enabled: z.boolean(),
    }),
  }),
  z.object({
    kind: z.literal('preferences.set'),
    value: z.object({ time: timeSchema, date: dateSchema }),
  }),
])
export type RunctyOperation = z.infer<typeof operation>
const authFields = { email: z.email().max(180), password: z.string().min(8).max(128) }
const authInput = z
  .discriminatedUnion('create', [
    z.object({ ...authFields, create: z.literal(false) }),
    z.object({
      ...authFields,
      create: z.literal(true),
      name: z.string().trim().min(2).max(80),
      level: z.enum(['Principiante', 'Intermedio', 'Avanzado']),
      confirmPassword: z.string().min(8).max(128),
      acceptedPrivacy: z.literal(true),
    }),
  ])
  .refine((data) => !data.create || data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })
const fail = (error: unknown) => ({
  ok: false as const,
  error:
    error instanceof z.ZodError
      ? (error.issues[0]?.message ?? 'Revisa los datos.')
      : 'No se pudo guardar. Revisa los datos, tu conexión y los permisos de tu cuenta.',
})
export async function authenticateRuncty(input: unknown) {
  try {
    const data = authInput.parse(input),
      payload = await getPayloadClient()
    if (data.create)
      await payload.create({
        collection: 'users',
        overrideAccess: false,
        data: {
          name: data.name,
          level: data.level,
          email: data.email,
          password: data.password,
          role: 'corredor',
          active: true,
        },
      })
    await appAuth.login(data.email, data.password)
    return { ok: true as const, ...(await getRunctySession(await appAuth.currentUser())) }
  } catch {
    return {
      ok: false as const,
      error:
        'No se pudo iniciar sesión. Comprueba tu correo y contraseña; si estás creando una cuenta, usa un correo nuevo y al menos ocho caracteres.',
    }
  }
}
export async function signOutRuncty() {
  await appAuth.logout()
  return { ok: true as const }
}
export async function loadRunctySession() {
  try {
    return { ok: true as const, ...(await getRunctySession(await appAuth.currentUser())) }
  } catch (error) {
    return fail(error)
  }
}
export async function saveRunctyChanges(input: unknown) {
  let completed = 0
  try {
    const operations = z.array(operation).min(1).max(50).parse(input)
    const user = await appAuth.currentUser()
    if (!user) return { ok: false as const, error: 'Inicia sesión para sincronizar tus datos.' }
    const payload = await getPayloadClient(),
      publicData = await getPublicRuncty()
    const options = { overrideAccess: false as const, user, depth: 0 }
    const requireStaff = () => {
      if (!isStaff(user)) throw new Error('Acceso reservado al club.')
    }
    const requireSystem = () => {
      if (!isSystem(user)) throw new Error('Acceso reservado al sistema.')
    }
    const find = async <
      T extends
        | 'routes'
        | 'incidents'
        | 'sponsors'
        | 'banners'
        | 'spaces'
        | 'risk-zones'
        | 'trainings'
        | 'sos-alerts'
        | 'community-comments',
    >(
      collection: T,
      key: string,
    ) =>
      (
        await payload.find({
          collection,
          ...options,
          where: { clientKey: { equals: key } },
          limit: 1,
        })
      ).docs[0]
    const roadId = (key: string) => {
      const road = publicData.roads.find((r) => r.id === key)
      if (!road?.dbId) throw new Error('Tramo desconocido.')
      return road.dbId
    }
    for (const op of operations) {
      switch (op.kind) {
        case 'route.save': {
          const r = op.value,
            existing = await find('routes', r.id)
          const data = {
            clientKey: r.id,
            name: r.name,
            area: r.area,
            km: r.km,
            min: r.min,
            difficulty: r.difficulty,
            desc: r.desc,
            geometry: r.geometry,
            segmentIds: r.segmentIds.map(roadId),
            date: r.date,
            ...(isStaff(user)
              ? {
                  status: r.status,
                  private: r.private,
                  official: r.official,
                  verified: r.verified,
                  reason: r.reason ?? null,
                  recommended: r.recommended,
                  baseline: r.baseline,
                  validated: r.validated,
                }
              : {}),
          }
          const context = { proposing: r.status === 'Pendiente' }
          if (existing)
            await payload.update({
              collection: 'routes',
              id: existing.id,
              ...options,
              context,
              data,
            })
          else
            await payload.create({
              collection: 'routes',
              ...options,
              context,
              data: { ...data, slug: r.id },
            })
          break
        }
        case 'route.delete': {
          const doc = await find('routes', op.id)
          if (doc) await payload.delete({ collection: 'routes', id: doc.id, ...options })
          break
        }
        case 'saved.set': {
          const ids: string[] = []
          for (const key of [...new Set(op.value)]) {
            const route = await find('routes', key)
            if (!route) throw new Error('Ruta no disponible.')
            ids.push(route.id)
          }
          await payload.update({
            collection: 'users',
            id: user.id,
            ...options,
            data: { savedRoutes: ids },
          })
          break
        }
        case 'incident.save': {
          const i = op.value,
            existing = await find('incidents', i.id)
          if (existing) {
            requireStaff()
            await payload.update({
              collection: 'incidents',
              id: existing.id,
              ...options,
              data: { status: i.status, reason: i.reason ?? null },
            })
          } else
            await payload.create({
              collection: 'incidents',
              ...options,
              data: {
                clientKey: i.id,
                type: i.type,
                location: i.location,
                coordinate: i.coordinate,
                date: i.date,
                time: i.time,
                description: i.description,
              },
            })
          break
        }
        case 'sponsor.save': {
          requireStaff()
          const s = op.value,
            existing = await find('sponsors', s.id)
          const data = {
            clientKey: s.id,
            name: s.name,
            message: s.message,
            contact: s.contact,
            active: s.active,
            visual: s.visual,
          }
          if (existing)
            await payload.update({ collection: 'sponsors', id: existing.id, ...options, data })
          else await payload.create({ collection: 'sponsors', ...options, data })
          break
        }
        case 'banner.save': {
          requireStaff()
          const b = op.value,
            existing = await find('banners', b.id),
            sponsor = await find('sponsors', b.sponsorId)
          if (!sponsor) throw new Error('Patrocinador no disponible.')
          const data = {
            clientKey: b.id,
            sponsor: sponsor.id,
            title: b.title,
            start: b.start,
            end: b.end,
            placement: b.placement,
            status: b.status,
          }
          if (existing)
            await payload.update({ collection: 'banners', id: existing.id, ...options, data })
          else await payload.create({ collection: 'banners', ...options, data })
          break
        }
        case 'space.save': {
          requireStaff()
          const { id, ...s } = op.value,
            existing = await find('spaces', id),
            data = { ...s, clientKey: id }
          if (existing)
            await payload.update({ collection: 'spaces', id: existing.id, ...options, data })
          else await payload.create({ collection: 'spaces', ...options, data })
          break
        }
        case 'space.delete': {
          requireStaff()
          const doc = await find('spaces', op.id)
          if (doc) await payload.delete({ collection: 'spaces', id: doc.id, ...options })
          break
        }
        case 'risk.save': {
          requireStaff()
          const { id, streetId, ...r } = op.value,
            existing = await find('risk-zones', id),
            data = { ...r, clientKey: id, street: roadId(streetId) }
          if (existing)
            await payload.update({ collection: 'risk-zones', id: existing.id, ...options, data })
          else await payload.create({ collection: 'risk-zones', ...options, data })
          break
        }
        case 'training.save': {
          const t = op.value,
            existing = await find('trainings', t.id)
          if (!existing) {
            const route = await find('routes', t.route.id)
            if (!route) throw new Error('La ruta no está disponible para tu cuenta.')
            await payload.create({
              collection: 'trainings',
              ...options,
              data: {
                clientKey: t.id,
                name: t.route.name,
                route: route.id,
                routeSnapshot: t.route,
                date: t.date,
                seconds: t.seconds,
                km: t.km,
                time: t.time,
              },
            })
          }
          const revoked = await payload.update({
            collection: 'live-shares',
            ...options,
            where: { and: [{ owner: { equals: user.id } }, { revoked: { equals: false } }] },
            data: { revoked: true },
          })
          if (revoked.errors.length) throw new Error('No se pudieron revocar todos los enlaces.')
          break
        }
        case 'training.delete': {
          const doc = await find('trainings', op.id)
          if (doc) await payload.delete({ collection: 'trainings', id: doc.id, ...options })
          break
        }
        case 'profile.set':
          await payload.update({
            collection: 'users',
            id: user.id,
            ...options,
            data: {
              name: op.value.name,
              level: op.value.level,
              publicProfile: op.value.public,
              email: op.value.email,
            },
          })
          break
        case 'contacts.set':
          await payload.update({
            collection: 'users',
            id: user.id,
            ...options,
            data: { contacts: op.value },
          })
          break
        case 'preferences.set':
          await payload.update({
            collection: 'users',
            id: user.id,
            ...options,
            data: { preferredTime: op.value.time, preferredDate: op.value.date },
          })
          break
        case 'sharing.set': {
          const share = op.value
          if (!share) {
            const result = await payload.update({
              collection: 'live-shares',
              ...options,
              where: { owner: { equals: user.id } },
              data: { revoked: true },
            })
            if (result.errors.length) throw new Error('No se pudieron revocar todos los enlaces.')
            break
          }
          const existing = (
            await payload.find({
              collection: 'live-shares',
              ...options,
              where: { and: [{ owner: { equals: user.id } }, { token: { equals: share.token } }] },
              limit: 1,
            })
          ).docs[0]
          if (existing)
            await payload.update({
              collection: 'live-shares',
              id: existing.id,
              ...options,
              data: { revoked: share.revoked },
            })
          else {
            if (
              share.revoked ||
              share.expires <= Date.now() ||
              share.expires > Date.now() + 4 * 3600000
            )
              return {
                ok: false as const,
                error: 'Crea un enlace nuevo con una vigencia de hasta cuatro horas.',
                completed,
              }
            await payload.create({
              collection: 'live-shares',
              ...options,
              data: {
                token: share.token,
                expires: new Date(share.expires).toISOString(),
                revoked: false,
                position: [-3.9736, -79.2027],
              },
            })
          }
          break
        }
        case 'sharing.position': {
          const result = await payload.update({
            collection: 'live-shares',
            ...options,
            where: {
              and: [
                { owner: { equals: user.id } },
                { revoked: { equals: false } },
                { expires: { greater_than: new Date().toISOString() } },
              ],
            },
            data: { position: op.value },
          })
          if (result.errors.length) throw new Error('No se pudo sincronizar la posición simulada.')
          break
        }
        case 'sos.save': {
          const s = op.value
          if (!(await find('sos-alerts', s.id)))
            await payload.create({
              collection: 'sos-alerts',
              ...options,
              data: { clientKey: s.id, date: s.date, status: s.status },
            })
          const result = await payload.update({
            collection: 'live-shares',
            ...options,
            where: {
              and: [
                { owner: { equals: user.id } },
                { revoked: { equals: false } },
                { expires: { greater_than: new Date().toISOString() } },
              ],
            },
            data: { alert: true },
          })
          if (result.errors.length)
            throw new Error('La alerta simulada se guardó, pero no se pudo actualizar el enlace.')
          break
        }
        case 'comment.create': {
          const comment = op.value
          if (await find('community-comments', comment.id)) break
          const route = await find('routes', comment.routeId)
          if (!route || route.private || route.status !== 'Aprobado')
            throw new Error('Solo puedes comentar rutas públicas disponibles.')
          await payload.create({
            collection: 'community-comments',
            ...options,
            data: { clientKey: comment.id, text: comment.text, route: route.id },
          })
          break
        }
        case 'comment.review': {
          requireStaff()
          const doc = await find('community-comments', op.value.id)
          if (!doc) throw new Error('Comentario no disponible.')
          await payload.update({
            collection: 'community-comments',
            id: doc.id,
            ...options,
            data: { status: op.value.status, reason: op.value.reason ?? null },
          })
          break
        }
        case 'user.status': {
          requireSystem()
          if (op.value.id === user.id && !op.value.active)
            throw new Error('No puedes desactivar tu propia cuenta.')
          await payload.update({
            collection: 'users',
            id: op.value.id,
            ...options,
            data: { active: op.value.active },
          })
          break
        }
        case 'club.set':
          requireStaff()
          await payload.updateGlobal({
            slug: 'runcty-club',
            ...options,
            data: { description: op.value },
          })
          break
        case 'city.save': {
          requireSystem()
          const c = op.value,
            existing = (
              await payload.find({
                collection: 'cities',
                ...options,
                where: { key: { equals: c.id } },
                limit: 1,
              })
            ).docs[0]
          const data = { key: c.id, name: c.name, networkReady: c.networkReady, enabled: c.enabled }
          if (existing)
            await payload.update({ collection: 'cities', id: existing.id, ...options, data })
          else await payload.create({ collection: 'cities', ...options, data })
          break
        }
      }
      completed++
    }
    const refreshed = await payload.findByID({ collection: 'users', id: user.id, ...options })
    return {
      ok: true as const,
      ...(await getRunctySession({ ...refreshed, collection: 'users' } as User)),
    }
  } catch (error) {
    return { ...fail(error), completed }
  }
}
export async function readRunctyShare(input: unknown) {
  try {
    const token = z.uuid().parse(input),
      payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'live-shares',
      overrideAccess: false,
      context: { shareToken: token },
      depth: 0,
      limit: 1,
      where: { token: { equals: token } },
    })
    const share = docs[0]
    return share
      ? {
          ok: true as const,
          share: {
            token: share.token,
            expires: Date.parse(share.expires),
            position: coordinateSchema.parse(share.position),
            alert: share.alert ?? false,
            updatedAt: share.updatedAt,
          },
        }
      : { ok: false as const, share: null }
  } catch {
    return { ok: false as const, share: null }
  }
}
