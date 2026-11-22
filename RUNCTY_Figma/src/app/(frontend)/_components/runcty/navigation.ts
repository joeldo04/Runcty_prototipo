import { SHOW_FUTURE } from './features'

export const paths: Record<string, string> = {
  explore: '/explorar',
  map: '/mapa',
  routes: '/rutas',
  spaces: '/espacios',
  club: '/club',
  planner: '/planificar',
  recommend: '/planificar',
  myroutes: '/mis-rutas',
  history: '/entrenamientos',
  reports: '/reportes',
  report: '/reportes',
  security: '/seguridad',
  profile: '/perfil',
  train: '/movil',
}

// Módulos de gestión que no se entregan en esta versión.
const futurePages = ['proposals', 'stats', 'clubinfo', 'parameters']
const delivered = (page: string) => SHOW_FUTURE || !futurePages.includes(page)

export const clubPages = [
  'clubhome', 'moderate', 'proposals', 'official', 'adminspaces', 'risks',
  'comments', 'sponsors', 'banners', 'stats', 'moderationlog', 'clubinfo',
].filter(delivered)
export const systemPages = ['users', 'cities', 'parameters'].filter(delivered)
for (const page of [...clubPages, ...systemPages]) paths[page] = `/gestion/${page}`
export const privatePages = ['myroutes', 'history', 'reports', 'report', 'security', 'profile']
