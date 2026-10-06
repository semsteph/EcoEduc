import { ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// ---------------------------------------------------------------------
// Petit état d'écran conservé dans l'adresse de la page.
//
// Un onglet ou une période choisis dans un écran n'existaient qu'en
// mémoire : un rechargement les remettait à leur valeur par défaut.
// useUrlState le lit dans la query de l'URL au chargement et l'y réécrit
// à chaque changement (router.replace : pas d'entrée d'historique en trop,
// les autres paramètres de la query sont conservés).
//
//   const semestre = useUrlState('semestre', null, { type: 'number' })
//   const onglet = useUrlState('onglet', 'frais')
//
// Réservé aux petits états internes d'un écran (onglet, filtre, période) :
// une interface complète a sa propre route de page (pages/*/dashbord/...).
// La valeur par défaut n'est pas écrite dans l'URL (adresse propre).
// N'utilisez JAMAIS la clé « vue » : une adresse contenant « ?vue » est prise
// par Vite pour une requête de fichier .vue et le rechargement échoue.
// ---------------------------------------------------------------------

type UrlStateType = 'string' | 'number' | 'boolean'

interface UrlStateOptions<T> {
  type?: UrlStateType
  // Valeurs acceptées (une valeur inconnue dans l'URL retombe sur le défaut).
  allowed?: readonly T[]
}

function parse(raw: unknown, type: UrlStateType): unknown {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === undefined || value === null || value === '') return undefined
  if (type === 'number') {
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
  }
  if (type === 'boolean') return value === '1' || value === 'true'
  return String(value)
}

function serialise(value: unknown, type: UrlStateType): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (type === 'boolean') return value ? '1' : undefined
  return String(value)
}

// Plusieurs états peuvent changer dans le même tick (section + enfant
// choisi) : les modifications sont regroupées en un seul router.replace,
// sinon la seconde partirait d'une query pas encore mise à jour et
// effacerait la première.
let pending: Record<string, string | undefined> | null = null

let pendingPath = ''

function scheduleQueryUpdate(router: ReturnType<typeof useRouter>, key: string, value: string | undefined) {
  if (!pending) {
    pending = {}
    pendingPath = router.currentRoute.value.path
    Promise.resolve().then(() => {
      const changes = pending || {}
      pending = null
      // L'utilisateur a changé d'écran entre-temps (router.push vers une autre
      // route) : on n'écrit pas, sinon ce replace annulerait la navigation.
      if (router.currentRoute.value.path !== pendingPath) return
      const query = { ...router.currentRoute.value.query }
      Object.entries(changes).forEach(([k, v]) => {
        if (v === undefined) delete query[k]
        else query[k] = v
      })
      router.replace({ query })
    })
  }
  pending[key] = value
}

export function useUrlState<T>(
  key: string,
  defaultValue: T,
  options: UrlStateOptions<T> = {},
): Ref<T> {
  const route = useRoute()
  const router = useRouter()
  const type: UrlStateType = options.type
    || (typeof defaultValue === 'number' ? 'number' : typeof defaultValue === 'boolean' ? 'boolean' : 'string')

  const read = (): T => {
    const parsed = parse(route.query[key], type) as T | undefined
    if (parsed === undefined) return defaultValue
    if (options.allowed && !options.allowed.includes(parsed)) return defaultValue
    return parsed
  }

  const state = ref(read()) as Ref<T>

  // État → URL.
  watch(state, (value) => {
    const next = value === defaultValue ? undefined : serialise(value, type)
    const current = serialise(parse(router.currentRoute.value.query[key], type), type)
    if (next === current) return
    scheduleQueryUpdate(router, key, next)
  })

  // URL → état (bouton précédent / suivant, lien direct).
  watch(() => route.query[key], () => {
    const value = read()
    if (value !== state.value) state.value = value
  })

  return state
}
