// Lecture d'une note dite à voix haute (dictée des notes) :
// « quatorze », « 14 », « douze et demi », « neuf virgule cinq », « dix-sept »,
// « absent », « suivant », « retour », « stop »…
// Renvoie { type: 'note', valeur } | { type: 'commande', commande } | { type: 'inconnu' }.

const NOMBRES: Record<string, number> = {
  zero: 0, "zéro": 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  "dix-sept": 17, "dix sept": 17, "dix-huit": 18, "dix huit": 18, "dix-neuf": 19, "dix neuf": 19, vingt: 20,
};

const COMMANDES: [RegExp, string][] = [
  [/^(absent|absente|abs)$/, "absent"],
  [/^(suivant|suivante|passe|passer|rien)$/, "suivant"],
  [/^(retour|precedent|précédent|en arriere|en arrière|corrige|corriger)$/, "retour"],
  [/^(stop|arrete|arrête|arreter|arrêter|fin|termine|terminé)$/, "stop"],
];

function nettoyer(texte: string): string {
  return String(texte || "")
    .toLowerCase()
    .replace(/[!?;]/g, " ")
    .replace(/\.(?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nombre(mot: string): number | null {
  const m = mot.trim();
  if (/^\d+([.,]\d+)?$/.test(m)) return Number(m.replace(",", "."));
  if (m in NOMBRES) return NOMBRES[m];
  return null;
}

export function lireNoteParlee(texte: string): { type: "note"; valeur: number } | { type: "commande"; commande: string } | { type: "inconnu" } {
  const t = nettoyer(texte);
  if (!t) return { type: "inconnu" };
  for (const [re, commande] of COMMANDES) if (re.test(t)) return { type: "commande", commande };

  // « 12,5 » / « 12.5 » / « 12 virgule 5 » / « douze et demi » / « douze et quart »
  let m = t.match(/^(.+?)\s+(et demi|et demie|virgule cinq|virgule 5|point cinq|point 5|et quart|virgule vingt-cinq|virgule 25|et trois quarts|virgule soixante-quinze|virgule 75)$/);
  let base: number | null;
  let fraction = 0;
  if (m) {
    base = nombre(m[1]);
    fraction = /quart|25/.test(m[2]) ? (/trois|75/.test(m[2]) ? 0.75 : 0.25) : 0.5;
  } else {
    m = t.match(/^(.+?)\s+(?:virgule|point)\s+(.+)$/);
    if (m) {
      base = nombre(m[1]);
      const dec = nombre(m[2]);
      if (base !== null && dec !== null && dec < 100) fraction = dec / (dec >= 10 ? 100 : 10);
    } else {
      base = nombre(t.replace(/\s*sur\s*(vingt|20)$/, ""));
    }
  }
  if (base === null) return { type: "inconnu" };
  const valeur = Math.round((base + fraction) * 100) / 100;
  return valeur >= 0 && valeur <= 20 ? { type: "note", valeur } : { type: "inconnu" };
}
