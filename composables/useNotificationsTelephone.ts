// Notifications sur le téléphone (Web Push) : activer, désactiver, tester.
// Elles arrivent même quand l'application est fermée. Sur iPhone, il faut
// d'abord ajouter l'application à l'écran d'accueil (iOS 16.4 ou plus).
import axios from 'axios'

const cleEnOctets = (base64: string) => {
  const rembourrage = '='.repeat((4 - (base64.length % 4)) % 4)
  const brut = atob((base64 + rembourrage).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...brut].map((c) => c.charCodeAt(0)))
}

export function useNotificationsTelephone() {
  const estIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  const estInstallee = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true

  // 'ok' | 'iphone-a-installer' | 'non-supporte'
  const compatibilite = () => {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return estIphone() && !estInstallee() ? 'iphone-a-installer' : 'non-supporte'
    if (!('PushManager' in window)) return estIphone() && !estInstallee() ? 'iphone-a-installer' : 'non-supporte'
    return 'ok'
  }

  const enregistrement = async () => {
    const existant = await navigator.serviceWorker.getRegistration('/')
    return existant || navigator.serviceWorker.register('/sw.js', { scope: '/' })
  }

  // 'actif' | 'inactif' | 'refuse' | 'non-supporte' | 'iphone-a-installer'
  const etat = async () => {
    const c = compatibilite()
    if (c !== 'ok') return c
    if (Notification.permission === 'denied') return 'refuse'
    const reg = await navigator.serviceWorker.getRegistration('/')
    const abo = reg ? await reg.pushManager.getSubscription() : null
    return abo && Notification.permission === 'granted' ? 'actif' : 'inactif'
  }

  // À appeler depuis un clic (le navigateur l'exige pour demander la permission).
  const activer = async () => {
    if (compatibilite() !== 'ok') throw new Error(compatibilite())
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return permission === 'denied' ? 'refuse' : 'inactif'
    const reg = await enregistrement()
    await navigator.serviceWorker.ready
    const { data } = await axios.get('/api/push/cle')
    let abo = await reg.pushManager.getSubscription()
    if (!abo) {
      // Le service push du téléphone (Google, Apple...) répond parfois
      // lentement : au-delà de 30 s, on rend la main avec un message clair.
      abo = await Promise.race([
        reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleEnOctets(data.publicKey) }),
        new Promise<never>((_, rejeter) => setTimeout(() => rejeter(new Error('lent')), 30000)),
      ])
    }
    await axios.post('/api/push/abonnement', { abonnement: abo.toJSON(), appareil: navigator.userAgent.slice(0, 180) })
    return 'actif'
  }

  const desactiver = async () => {
    const reg = await navigator.serviceWorker.getRegistration('/')
    const abo = reg ? await reg.pushManager.getSubscription() : null
    if (abo) {
      await axios.post('/api/push/desabonnement', { endpoint: abo.endpoint }).catch(() => {})
      await abo.unsubscribe()
    }
    return 'inactif'
  }

  const essai = async () => (await axios.post('/api/push/essai')).data

  return { etat, activer, desactiver, essai, estIphone, estInstallee }
}
