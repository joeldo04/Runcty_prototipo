import type { Metadata } from 'next'
import { connection } from 'next/server'
import { getLiveShare } from '@/lib/runcty-queries'
import { ContactView } from '../../_components/runcty/security'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Enlace temporal · RUNCTY',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  await connection()
  const { token } = await params
  const share = await getLiveShare(token)
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12">
      <ContactView token={token} initialShare={share} />
      <Link href="/explorar" className="mt-6 inline-flex font-semibold text-violet-700">Volver a RUNCTY</Link>
    </main>
  )
}
