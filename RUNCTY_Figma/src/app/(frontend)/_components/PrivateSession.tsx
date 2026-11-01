'use client'

import { useEffect, type ReactNode } from 'react'
import type { RunctySession } from '@/lib/runcty-queries'
import { useDemo } from './runcty/store'

export default function PrivateSession({ session, children }: { session: RunctySession; children: ReactNode }) {
  const { hydrateSession } = useDemo()
  useEffect(() => hydrateSession(session.data, session.user), [session, hydrateSession])
  return children
}
