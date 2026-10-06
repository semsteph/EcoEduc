// =====================================================================
// Molécule (type « molecule ») : formule développée ou semi-développée.
//
// En test réel, les molécules dessinées à main levée étaient méconnaissables
// (ronds sans lettres, méthane en liste verticale sans liaisons) et un titre
// de schéma donnait la réponse. Ici le modèle décrit seulement la chaîne
// principale et les ramifications ; le serveur compte les hydrogènes
// (valence), numérote les carbones et calcule toutes les positions.
// =====================================================================

const VALENCE = { C: 4, N: 3, O: 2, S: 2, P: 3, Cl: 1, Br: 1, I: 1, F: 1, H: 1 };
const GROUPS = {
  CH3: { atoms: 'CH₃', bonds: 1 },
  C2H5: { atoms: 'CH₂–CH₃', bonds: 1 },
  OH: { atoms: 'OH', bonds: 1 },
  NH2: { atoms: 'NH₂', bonds: 1 },
  Cl: { atoms: 'Cl', bonds: 1 },
  Br: { atoms: 'Br', bonds: 1 },
  F: { atoms: 'F', bonds: 1 },
  I: { atoms: 'I', bonds: 1 },
  O: { atoms: 'O', bonds: 2 }, // =O (cétone, aldéhyde, acide)
  COOH: { atoms: 'COOH', bonds: 1 },
};
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄' };

function text(value, max = 60) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function groupKey(value) {
  const raw = text(value, 10).replace(/[₀-₉]/g, (d) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(d))).replace(/^=/, '').replace(/[-–]/g, '');
  const aliases = { CH2CH3: 'C2H5', methyl: 'CH3', ethyl: 'C2H5', hydroxyle: 'OH', amine: 'NH2' };
  const key = aliases[raw.toLowerCase()] || raw;
  return GROUPS[key] ? key : null;
}

function sanitiseMolecule(value) {
  if (!value || typeof value !== 'object') return null;
  const chain = (Array.isArray(value.chain) ? value.chain : [])
    .slice(0, 10)
    .map((atom) => text(atom, 2))
    .map((atom) => atom.charAt(0).toUpperCase() + atom.slice(1).toLowerCase())
    .filter((atom) => VALENCE[atom]);
  if (!chain.length) return null;

  // Liaisons entre atomes consécutifs de la chaîne : 1, 2 ou 3.
  const bonds = chain.slice(1).map((_, i) => {
    const b = Number(Array.isArray(value.bonds) ? value.bonds[i] : 1);
    return [1, 2, 3].includes(b) ? b : 1;
  });

  const substituents = (Array.isArray(value.substituents) ? value.substituents : [])
    .slice(0, 8)
    .map((s) => {
      const at = Number(s?.at);
      const key = groupKey(s?.group);
      if (!Number.isInteger(at) || at < 1 || at > chain.length || !key) return null;
      return { at, group: key, label: GROUPS[key].atoms, bondOrder: GROUPS[key].bonds, side: s.side === 'down' ? 'down' : 'up' };
    })
    .filter(Boolean);

  // Deux ramifications sur le même atome : l'une en haut, l'autre en bas.
  const sidesTaken = {};
  substituents.forEach((s) => {
    const used = sidesTaken[s.at] || [];
    if (used.includes(s.side)) s.side = s.side === 'up' ? 'down' : 'up';
    sidesTaken[s.at] = [...used, s.side];
  });

  // Hydrogènes restants de chaque atome de la chaîne (valence).
  const atoms = chain.map((element, i) => {
    const chainBonds = (bonds[i - 1] || 0) + (bonds[i] || 0);
    const subBonds = substituents.filter((s) => s.at === i + 1).reduce((sum, s) => sum + s.bondOrder, 0);
    const hydrogens = VALENCE[element] - chainBonds - subBonds;
    return { element, hydrogens: Math.max(0, hydrogens), invalid: hydrogens < 0 };
  });
  // Valence dépassée : molécule impossible, on refuse plutôt que d'afficher faux.
  if (atoms.some((atom) => atom.invalid)) return null;

  const mode = value.mode === 'developed' ? 'developed' : 'condensed';
  return {
    type: 'molecule',
    title: text(value.title, 80),
    name: text(value.name, 60),
    mode,
    numbering: value.numbering === true,
    atoms: atoms.map(({ element, hydrogens }) => ({
      element,
      hydrogens,
      label: element === 'H' ? 'H' : `${element}${hydrogens ? `H${hydrogens > 1 ? SUB[hydrogens] || hydrogens : ''}` : ''}`,
    })),
    bonds,
    substituents,
    ...(value.highlight && Number.isInteger(Number(value.highlight)) ? { highlight: Number(value.highlight) } : {}),
  };
}

module.exports = { sanitiseMolecule };
