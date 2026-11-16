import type { Metadata } from 'next'
import Link from 'next/link'
import { ContactView } from '../../_components/runcty/security'
export const metadata: Metadata = { title: 'Seguimiento compartido | RUNCTY', robots: { index: false, follow: false } }
export default function DemoSharePage() {
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-10"><p className="mb-6 rounded-xl border border-line bg-panel p-4 text-sm leading-6 text-muted">Seguimiento compartido. Acceso sin cuenta: solo se muestra el recorrido que el corredor autorizó.</p><ContactView demo /><Link href="/movil/entrenar" className="mt-7 inline-flex min-h-11 items-center font-semibold text-info">Volver a la app</Link></main>
}
