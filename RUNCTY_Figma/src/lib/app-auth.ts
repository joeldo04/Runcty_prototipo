import 'server-only'
import { cookies } from 'next/headers'
import { getPayloadClient } from '@/lib/payload'

export function createAppAuth(collection: 'users') {
  const cookieName = 'app-session'
  const cookieOptions = () => {
    const secure = process.env.NODE_ENV === 'production' || process.env.FIGMA_PUBLIC_URL?.startsWith('https:') === true
    return { httpOnly: true, secure, sameSite: secure ? 'none' as const : 'lax' as const, path: '/' }
  }
  return {
    async currentUser() {
      const token = (await cookies()).get(cookieName)?.value
      if (!token) return null
      const payload = await getPayloadClient()
      const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
      return user?.collection === collection && user.active !== false ? user : null
    },
    async login(email: string, password: string) {
      const payload = await getPayloadClient()
      const result = await payload.login({ collection, data: { email, password } })
      if (!result.token) throw new Error('No se pudo iniciar sesión.')
      ;(await cookies()).set(cookieName, result.token, { ...cookieOptions(), maxAge: Math.max(0, (result.exp ?? 0) - Math.floor(Date.now() / 1000)) })
      return result.user
    },
    async logout() {
      ;(await cookies()).set(cookieName, '', { ...cookieOptions(), maxAge: 0 })
    },
  }
}

export const appAuth = createAppAuth('users')
