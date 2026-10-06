// Lecture du contenu (payload) d'un jeton JWT côté navigateur.
// atob() seul cassait les accents (« FÃ©licien ») et échouait sur les jetons
// contenant « - » ou « _ » (base64url) : on convertit en base64 standard
// puis on décode l'UTF-8.
export function decodeJwtPayload(token: string | null | undefined): any {
  if (!token || typeof token !== 'string') return null
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}
