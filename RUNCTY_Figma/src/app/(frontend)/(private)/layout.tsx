import type { Metadata } from 'next'
import { appAuth } from '@/lib/app-auth'
import { getRunctySession } from '@/lib/runcty-queries'
import PrivateSession from '../_components/PrivateSession'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const session = await getRunctySession(await appAuth.currentUser())
  return <PrivateSession session={session}>{children}</PrivateSession>
}
