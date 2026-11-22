import { redirect } from 'next/navigation'
import App from '../../_components/runcty/App'
import { SHOW_FUTURE } from '../../_components/runcty/features'

export default function SavedRoutesPage() {
  // Mis rutas no se entrega en esta versión: se muestra el catálogo.
  if (!SHOW_FUTURE) redirect('/rutas')
  return <App initialPage="myroutes" />
}
