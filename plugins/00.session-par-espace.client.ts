// Une session par espace (administration, enseignants, parents).
//
// Les trois connexions rangeaient leur jeton dans la même clé « token » du
// navigateur : se connecter comme enseignant dans un onglet remplaçait la
// session de l'administration ouverte dans un autre, qui appelait alors
// l'API avec le jeton de l'enseignant (refusé) — l'administrateur ne voyait
// plus, par exemple, les demandes de modification de notes.
//
// Ici, ces clés sont rangées par espace, d'après l'adresse de la page :
// « token » lu sur /administration/... est celui de l'administration, sur
// /professeurs/... celui de l'enseignant. Les écrans continuent d'appeler
// localStorage.getItem('token') sans changement.
const CLES_DE_SESSION = new Set([
  'token',
  'user_type',
  'etablissement_id',
  'etablissement_nom',
  'administration_id',
  'administration_nom',
  'poste',
  'modules_autorises',
])

type Espace = 'administration' | 'professeurs' | 'parents'

function espaceCourant(): Espace | null {
  const p = window.location.pathname
  if (p.startsWith('/administration')) return 'administration'
  if (p.startsWith('/professeurs')) return 'professeurs'
  if (p.startsWith('/parents')) return 'parents'
  return null
}

// Espace d'un ancien jeton (rangé avant ce changement), d'après son contenu.
function espaceDuJeton(jeton: string): Espace | null {
  try {
    const t = JSON.parse(atob(jeton.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (t.role === 'parent') return 'parents'
    if (t.type === 'etablissement' || t.type === 'administration') return 'administration'
    if (t.etablissement !== undefined && t.id !== undefined) return 'professeurs'
  } catch (e) { /* jeton illisible */ }
  return null
}

export default defineNuxtPlugin(() => {
  const proto = Storage.prototype
  const getItem = proto.getItem
  const setItem = proto.setItem
  const removeItem = proto.removeItem

  const cle = (stockage: Storage, nom: string): string => {
    if (stockage !== window.localStorage || !CLES_DE_SESSION.has(nom)) return nom
    const espace = espaceCourant()
    return espace ? `${espace}:${nom}` : nom
  }

  proto.getItem = function (nom: string) {
    const scopee = cle(this, nom)
    const valeur = getItem.call(this, scopee)
    if (valeur !== null || scopee === nom) return valeur
    // Ancienne session (clé commune) : reprise seulement si elle appartient
    // bien à cet espace.
    const ancienne = getItem.call(this, nom)
    if (ancienne === null) return null
    const jeton = getItem.call(this, 'token')
    if (jeton && espaceDuJeton(jeton) === espaceCourant()) {
      setItem.call(this, scopee, ancienne)
      return ancienne
    }
    return null
  }
  proto.setItem = function (nom: string, valeur: string) {
    return setItem.call(this, cle(this, nom), valeur)
  }
  proto.removeItem = function (nom: string) {
    return removeItem.call(this, cle(this, nom))
  }
})
