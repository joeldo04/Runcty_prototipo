import type { Metadata } from 'next'
import DemoAdmin from '../../_components/runcty/DemoAdmin'
export const metadata: Metadata = { title: 'Administración | RUNCTY', robots: { index: false, follow: false } }
export default function DemoAdministrationPage() { return <DemoAdmin /> }
