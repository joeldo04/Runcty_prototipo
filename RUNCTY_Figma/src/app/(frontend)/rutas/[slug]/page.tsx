import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicRoute, getPublicRuncty } from '@/lib/runcty-queries'
import App from '../../_components/runcty/App'

export const dynamic = 'force-static'
export const dynamicParams = true

export async function generateStaticParams() {
  const { catalog } = await getPublicRuncty()
  return catalog.filter(route => route.slug).map(route => ({ slug: route.slug! }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const route = await getPublicRoute((await params).slug)
  return {
    title: route ? `${route.name} · RUNCTY` : 'Ruta no disponible · RUNCTY',
    description: route?.desc,
  }
}

export default async function RoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const route = await getPublicRoute((await params).slug)
  if (!route) notFound()
  return <App initialPage="routes" initialRoute={route} />
}
