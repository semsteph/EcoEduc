import { inject, onBeforeUnmount, onMounted, provide, reactive } from 'vue'

// ---------------------------------------------------------------------
// Navigation commune des tableaux de bord : fil d'Ariane + flèches retour.
//
// - Le cadre de chaque espace (pages/*/dashbord.vue) appelle
//   providePageNav() et affiche <PageNav> en haut et en bas de l'écran.
// - Le fil d'Ariane est construit à partir de l'adresse (buildCrumbs) :
//   chaque niveau de l'adresse est un écran, cliquable.
// - La flèche remonte d'un niveau. Si l'écran affiché a une étape interne
//   ouverte (détail sans adresse propre, formulaire...), il l'enregistre
//   avec usePageBack() : la flèche ferme d'abord cette étape.
// ---------------------------------------------------------------------

export interface Crumb {
  label: string
  to: string | { path: string; query?: Record<string, any> }
}

type BackHandler = () => boolean

interface PageNavState {
  handlers: BackHandler[]
  labels: Record<string, string>
}

const KEY = Symbol('pageNav')

export function providePageNav() {
  const state = reactive<PageNavState>({ handlers: [], labels: {} })
  provide(KEY, state)
  return state
}

// Étape interne d'un écran. Le gestionnaire renvoie true s'il a traité le
// retour (étape fermée), false sinon (la flèche remonte alors d'un niveau).
export function usePageBack(handler: BackHandler) {
  const state = inject<PageNavState | null>(KEY, null)
  onMounted(() => state?.handlers.push(handler))
  onBeforeUnmount(() => {
    if (!state) return
    const index = state.handlers.lastIndexOf(handler)
    if (index >= 0) state.handlers.splice(index, 1)
  })
}

// Libellé d'un niveau de l'adresse connu seulement de l'écran (nom d'une
// classe, d'un élève...) : remplace le libellé générique du fil d'Ariane.
export function useCrumbLabel() {
  const state = inject<PageNavState | null>(KEY, null)
  return (path: string, label: string) => {
    if (state && label) state.labels[path.replace(/\/+$/, '')] = label
  }
}

export function usePageNavState() {
  return inject<PageNavState | null>(KEY, null)
}

// Fil d'Ariane à partir de l'adresse courante.
//   base      : racine de l'espace (« /parents/dashbord »)
//   rootLabel : libellé de la racine (« Tableau de bord »)
//   labelFor  : libellé d'un niveau (null = niveau sans écran propre, ignoré)
export function buildCrumbs(
  path: string,
  base: string,
  rootLabel: string,
  labelFor: (segment: string, previous: string[]) => string | null,
  options: { query?: Record<string, any>; labels?: Record<string, string> } = {},
): Crumb[] {
  const to = (p: string) => (options.query && Object.keys(options.query).length ? { path: p, query: options.query } : p)
  const crumbs: Crumb[] = [{ label: rootLabel, to: to(base) }]
  const rest = path.replace(/\/+$/, '').slice(base.length).split('/').filter(Boolean)
  let current = base
  rest.forEach((segment, index) => {
    current += `/${segment}`
    const label = options.labels?.[current] || labelFor(decodeURIComponent(segment), rest.slice(0, index))
    if (label) crumbs.push({ label, to: to(current) })
  })
  return crumbs
}

// « ben-2 » → « Ben (2) »
export function slugToName(slug: string) {
  const match = slug.match(/^(.*?)(?:-(\d+))?$/)
  const name = (match?.[1] || slug).split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
  return match?.[2] ? `${name} (${match[2]})` : name
}
