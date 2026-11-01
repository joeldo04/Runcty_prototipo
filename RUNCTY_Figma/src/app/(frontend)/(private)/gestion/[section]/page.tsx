import { notFound } from 'next/navigation'
import App from '../../../_components/runcty/App'
import { clubPages, systemPages } from '../../../_components/runcty/navigation'
import { appAuth } from '@/lib/app-auth'
import { isStaff, isSystem } from '@/access/runcty'

export default async function ManagementPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (![...clubPages, ...systemPages].includes(section)) notFound()
  const user = await appAuth.currentUser()
  if (!isStaff(user) || (systemPages.includes(section) && !isSystem(user))) notFound()
  return <App initialPage={section} />
}
