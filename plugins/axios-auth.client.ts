import axios from 'axios'
import { useRouter } from 'vue-router'

// Quand le token JWT est manquant/expiré/invalide, le backend (authenticateJWT
// et ses variantes locales dans dashboard/scolarite/assistant.routes.cjs)
// répond systématiquement avec l'un des messages ci-dessous. On s'appuie sur
// ces messages précis (et pas juste le code 401/403) pour ne rediriger que
// sur un vrai problème de session, jamais sur un 401/403 métier (mauvais mot
// de passe au login, "n'appartient pas à votre établissement", etc.).
const SESSION_INVALID_MESSAGES = new Set([
  'Token manquant',
  'Token manquant.',
  'Format token invalide (Bearer requis)',
  'Token expiré',
  'Token invalide',
  'Token invalide ou expiré.',
])

// Clés localStorage posées lors des différents logins (voir pages/*/connexion.vue).
const AUTH_STORAGE_KEYS = [
  'token',
  'user_type',
  'etablissement_id',
  'etablissement_nom',
  'administration_id',
  'administration_nom',
  'poste',
  'modules_autorises',
]

function loginPathFor(currentPath: string): string | null {
  if (currentPath.startsWith('/parents')) return '/parents/connexion'
  if (currentPath.startsWith('/professeurs')) return '/professeurs/connexion'
  if (currentPath.startsWith('/administration')) return '/administration/connexion'
  return null
}

export default defineNuxtPlugin(() => {
  const router = useRouter()

  // Jeton joint d'office à chaque appel de l'API : les routes qui étaient
  // ouvertes sans connexion exigent désormais un jeton, et certains écrans
  // ne l'envoyaient pas.
  axios.interceptors.request.use((config) => {
    const headers: any = config.headers || {}
    const already = typeof headers.get === 'function' ? headers.get('Authorization') : headers.Authorization
    const token = localStorage.getItem('token')
    if (!already && token && /\/api\//.test(String(config.url || ''))) {
      if (typeof headers.set === 'function') headers.set('Authorization', `Bearer ${token}`)
      else headers.Authorization = `Bearer ${token}`
      config.headers = headers
    }
    return config
  })

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status
      const message = error?.response?.data?.message

      if ((status === 401 || status === 403) && SESSION_INVALID_MESSAGES.has(message)) {
        AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))

        const currentPath = router.currentRoute.value.path
        const loginPath = loginPathFor(currentPath)

        if (loginPath && currentPath !== loginPath) {
          router.push(loginPath)
        }
      }

      return Promise.reject(error)
    }
  )
})
