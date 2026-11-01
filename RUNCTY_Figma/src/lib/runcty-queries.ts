import 'server-only'
import { unstable_cache } from 'next/cache'
import { z } from 'zod'
import { getPayloadClient, findBySlug } from '@/lib/payload'
import type { Config, Route, Sponsor, User } from '@/payload-types'
import type { DemoState } from '@/app/(frontend)/_components/runcty/store'
import type { Coordinate, RouteData, Street } from '@/app/(frontend)/_components/runcty/data'
import { isStaff, isSystem } from '@/access/runcty'
import { DEMO_ROADS, DEMO_ROUTES, DEMO_SPACES, DEMO_SPONSORS, DEMO_BANNERS } from '@/app/(frontend)/_components/runcty/demo-seed'
import { contactSchema, roadSchema, routeSchema } from '@/lib/runcty-validation'

type Slug = keyof Config['collections']
export const keyOf = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : value && typeof value === 'object' && 'id' in value
      ? String(value.id)
      : ''

export function routeView(doc: Route, roads: Street[], user?: User): RouteData {
  const image = typeof doc.image === 'object' ? doc.image : null
  return {
    id: doc.clientKey,
    slug: doc.slug,
    name: doc.name,
    area: doc.area,
    km: doc.km,
    min: doc.min,
    difficulty: doc.difficulty,
    desc: doc.desc ?? '',
    image: image?.url
      ? {
          url: image.url,
          alt: image.alt,
          width: image.width ?? 1200,
          height: image.height ?? 800,
        }
      : undefined,
    geometry: doc.geometry as Coordinate[],
    segmentIds: (doc.segmentIds ?? [])
      .map((segment) =>
        typeof segment === 'object'
          ? segment.key
          : (roads.find((road) => road.dbId === segment)?.id ?? ''),
      )
      .filter(Boolean),
    official: doc.official ?? false,
    verified: doc.verified ?? false,
    private: doc.private ?? true,
    status: doc.status ?? undefined,
    reason: doc.reason ?? undefined,
    recommended: doc.recommended ?? undefined,
    baseline: doc.baseline ?? undefined,
    validated: doc.validated ?? undefined,
    date: doc.date ?? undefined,
    owned: !!user && keyOf(doc.owner) === user.id,
    owner:
      user && keyOf(doc.owner) === user.id
        ? user.name
        : doc.official
          ? undefined
          : 'Comunidad RUNCTY',
  }
}
function sponsorView(doc: Sponsor) {
  const image = typeof doc.image === 'object' ? doc.image : null
  return {
    id: doc.clientKey,
    name: doc.name,
    message: doc.message,
    contact: doc.contact ?? '',
    active: doc.active ?? false,
    visual: doc.visual ?? 'mountain',
    image: image?.url
      ? {
          url: image.url,
          alt: image.alt,
          width: image.width ?? 1200,
          height: image.height ?? 800,
        }
      : undefined,
  }
}
async function documents<T extends Slug>(
  collection: T,
  user?: User | null,
  depth = 0,
  context = {},
) {
  const payload = await getPayloadClient()
  return (
    await payload.find({
      collection,
      depth,
      limit: 1000,
      pagination: false,
      overrideAccess: false,
      user: user ?? undefined,
      context,
    })
  ).docs
}
const bannerView = (doc: Config['collections']['banners']) => ({
  id: doc.clientKey,
  sponsorId: typeof doc.sponsor === 'object' ? doc.sponsor.clientKey : doc.sponsor,
  title: doc.title,
  start: doc.start,
  end: doc.end,
  placement: doc.placement,
  status: doc.status,
})
function incidentView(doc: Config['collections']['incidents'], user?: User) {
  return {
    id: doc.clientKey,
    type: doc.type,
    location: doc.location,
    coordinate: doc.coordinate as Coordinate,
    date: doc.date,
    time: doc.time,
    description: doc.description ?? '',
    status: doc.status ?? ('Pendiente' as const),
    reason: doc.reason ?? undefined,
    owned: !!user && keyOf(doc.owner) === user.id,
    owner: user && keyOf(doc.owner) === user.id ? user.name : 'Comunidad RUNCTY',
    createdAt: Date.parse(doc.createdAt),
  }
}
function riskView(
  doc: Config['collections']['risk-zones'],
  roads: Street[],
  index: number,
  staff = false,
) {
  return {
    id: staff ? doc.clientKey : `risk-${index}`,
    name: doc.name ?? '',
    reason: doc.reason ?? '',
    source: doc.source ?? '',
    confidential: doc.confidential ?? true,
    expires: doc.expires,
    date: doc.date,
    streetId: roads.find((road) => road.dbId === keyOf(doc.street))?.id ?? '',
  }
}

// No cookies or user identity enter this cache; all reads run as an anonymous visitor.
const getPublicRunctyFromPayload = unstable_cache(
  async () => {
    const payload = await getPayloadClient()
    const [roadDocs, routes, sponsors, banners, spaces, incidents, risks, cities, club, comments] =
      await Promise.all([
        documents('road-segments'),
        documents('routes', null, 1),
        documents('sponsors', null, 1),
        documents('banners', null, 1),
        documents('spaces'),
        documents('incidents'),
        documents('risk-zones', null, 0, { scoring: true }),
        documents('cities'),
        payload.findGlobal({ slug: 'runcty-club', overrideAccess: false, depth: 1 }),
        documents('community-comments', null, 1),
      ])
    const roads: Street[] = roadDocs.map((doc) => ({
      ...roadSchema.parse({ ...doc, id: doc.key }),
      dbId: doc.id,
    }))
    return {
      roads,
      catalog: routes.map((doc) => routeView(doc, roads)),
      sponsors: sponsors.map(sponsorView),
      banners: banners.map(bannerView),
      spaces: spaces.map((doc) => ({
        id: doc.clientKey,
        name: doc.name,
        type: doc.type,
        location: doc.location,
        hours: doc.hours,
        description: doc.description ?? '',
        coordinate: doc.coordinate as Coordinate,
      })),
      incidents: incidents.map((doc) => incidentView(doc)),
      // Confidential descriptions and sources remain field-access protected.
      risks: risks.map((doc, index) => riskView(doc, roads, index)),
      cities: cities.map((doc) => ({
        id: doc.key,
        name: doc.name,
        networkReady: doc.networkReady ?? false,
        enabled: doc.enabled ?? false,
      })),
      comments: comments.map((doc) => ({
        id: doc.clientKey,
        text: doc.text,
        status: doc.status ?? 'Pendiente',
        routeId: typeof doc.route === 'object' && doc.route ? doc.route.clientKey : undefined,
      })),
      clubDescription: club.description ?? '',
      clubName: club.name ?? 'Gacelas Running Team',
      heroImage:
        typeof club.heroImage === 'object' && club.heroImage?.url
          ? {
              url: club.heroImage.url,
              alt: club.heroImage.alt,
              width: club.heroImage.width ?? 1600,
              height: club.heroImage.height ?? 1000,
            }
          : null,
    }
  },
  ['runcty-public-v4'],
  { tags: ['runcty-public'], revalidate: 60 },
)
// The preview is the real RUNCTY React frontend using intentionally fictitious
// local data. It does NOT provide authenticated writes or a Payload database.
const localRunctyData = {
  roads: DEMO_ROADS,
  catalog: DEMO_ROUTES,
  sponsors: DEMO_SPONSORS,
  banners: DEMO_BANNERS,
  spaces: DEMO_SPACES,
  incidents: [],
  risks: [],
  cities: [{ id: 'loja', name: 'Loja', networkReady: false, enabled: true }],
  comments: [],
  clubDescription: 'Club Deportivo Gacelas Running Team · Loja, Ecuador. Información demostrativa.',
  clubName: 'Gacelas Running Team',
  heroImage: null,
}

export async function getPublicRuncty() {
  if (process.env.RUNCTY_LOCAL_PREVIEW === '1') return localRunctyData
  return getPublicRunctyFromPayload()
}

export type PublicRuncty = Awaited<ReturnType<typeof getPublicRuncty>>

export const getPublicRoute = (slug: string) =>
  unstable_cache(
    async () => {
      const doc = await findBySlug('routes', slug, { depth: 1 })
      if (!doc) return null
      const data = await getPublicRuncty()
      return routeView(doc, data.roads)
    },
    ['runcty-route', slug],
    { tags: ['runcty-public', `runcty-route:${slug}`] },
  )()

export type RunctySession = {
  user: { id: User['id']; name: string; role: User['role'] } | null
  data: Partial<DemoState>
}
// Request-time only: never wrap this function, cookies, or its results in a shared cache.
export async function getRunctySession(user: User | null): Promise<RunctySession> {
  if (!user) return { user: null, data: {} }
  const publicData = await getPublicRuncty(),
    payload = await getPayloadClient()
  const [
    routes,
    incidents,
    trainings,
    shares,
    sos,
    sponsors,
    banners,
    risks,
    comments,
    moderation,
    users,
  ] = await Promise.all([
    documents('routes', user, 1),
    documents('incidents', user),
    documents('trainings', user),
    documents('live-shares', user),
    documents('sos-alerts', user),
    isStaff(user) ? documents('sponsors', user, 1) : [],
    isStaff(user) ? documents('banners', user, 1) : [],
    isStaff(user) ? documents('risk-zones', user) : [],
    documents('community-comments', user, 1),
    isStaff(user) ? documents('moderation-log', user) : [],
    isSystem(user)
      ? payload
          .find({
            collection: 'users',
            overrideAccess: false,
            user,
            depth: 0,
            limit: 1000,
            pagination: false,
            select: { name: true, role: true, active: true },
          })
          .then((result) => result.docs)
      : [],
  ])
  const savedIds = (user.savedRoutes ?? [])
    .map((value) => routes.find((route) => route.id === keyOf(value))?.clientKey)
    .filter((value): value is string => !!value)
  const latest = shares.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]
  return {
    user: { id: user.id, name: user.name, role: user.role },
    data: {
      ...publicData,
      role: user.role,
      savedIds,
      catalog: routes
        .filter((route) => !route.private && route.status === 'Aprobado')
        .map((route) => routeView(route, publicData.roads, user)),
      customRoutes: routes
        .filter((route) => route.private || route.status !== 'Aprobado')
        .map((route) => routeView(route, publicData.roads, user)),
      incidents: incidents.map((doc) => incidentView(doc, user)),
      trainings: trainings.map((doc) => ({
        id: doc.clientKey,
        route: routeSchema.parse(doc.routeSnapshot),
        date: doc.date,
        seconds: doc.seconds,
        km: doc.km,
        time: doc.time,
      })),
      contacts: z
        .array(contactSchema)
        .catch([])
        .parse(user.contacts ?? []),
      profile: {
        name: user.name,
        level: user.level ?? 'Intermedio',
        public: user.publicProfile ?? false,
        email: user.email,
      },
      sharing: latest
        ? {
            token: latest.token,
            expires: Date.parse(latest.expires),
            revoked: latest.revoked ?? false,
          }
        : null,
      sos: sos.map((doc) => ({ id: doc.clientKey, date: doc.date, status: doc.status })),
      comments: comments.map((doc) => ({
        id: doc.clientKey,
        text: doc.text,
        status: doc.status ?? 'Pendiente',
        reason: doc.reason ?? undefined,
        routeId: typeof doc.route === 'object' && doc.route ? doc.route.clientKey : undefined,
      })),
      ...(isStaff(user)
        ? {
            sponsors: sponsors.map(sponsorView),
            banners: banners.map(bannerView),
            risks: risks.map((doc, index) => riskView(doc, publicData.roads, index, true)),
            moderation: moderation.map((doc) => ({
              id: doc.id,
              date: doc.createdAt,
              item: doc.item,
              decision: doc.decision,
              reason: doc.reason ?? '',
            })),
          }
        : {}),
      users: users.map((doc) => ({
        id: doc.id,
        name: doc.name,
        role:
          doc.role === 'club'
            ? 'Admin. del club'
            : doc.role === 'sistema'
              ? 'Admin. del sistema'
              : 'Corredor',
        active: doc.active ?? true,
      })),
      time: user.preferredTime ?? '08:00',
      ...(user.preferredDate ? { date: user.preferredDate } : {}),
    },
  }
}

export async function getLiveShare(token: string) {
  if (!z.uuid().safeParse(token).success) return null
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'live-shares',
    overrideAccess: false,
    depth: 0,
    context: { shareToken: token },
    where: { token: { equals: token } },
    limit: 1,
    select: { expires: true, position: true, alert: true, updatedAt: true },
  })
  const share = docs[0]
  return share
    ? {
        expires: share.expires,
        position: share.position as Coordinate,
        alert: share.alert ?? false,
        updatedAt: share.updatedAt,
      }
    : null
}
