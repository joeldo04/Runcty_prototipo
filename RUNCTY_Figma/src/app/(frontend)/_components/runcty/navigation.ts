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

export const clubPages = [
  'clubhome', 'moderate', 'proposals', 'official', 'adminspaces', 'risks',
  'comments', 'sponsors', 'banners', 'stats', 'moderationlog', 'clubinfo',
]
export const systemPages = ['users', 'cities', 'parameters']
for (const page of [...clubPages, ...systemPages]) paths[page] = `/gestion/${page}`
export const privatePages = ['myroutes', 'history', 'reports', 'report', 'security', 'profile']
