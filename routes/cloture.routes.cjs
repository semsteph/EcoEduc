// =====================================================================
//  Clôture d'année scolaire (paramètres, simulation, exécution)
//  Monté dans server.cjs avec : app.use('/api', require('./routes/cloture.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const { getDefaultClotureParams, parseBoolean, fetchClotureParams } = require('../server-lib/clotureParams.cjs');

const ordreClasses = ['6eme', '5eme', '4eme', '3eme', '2nd', '1ere', 'Tle'];

const classesFinDeCycle = ['3eme', 'Tle'];

function simplifyText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNiveau(niveau) {
  const n = simplifyText(niveau).toLowerCase();

  const map = {
    '6eme': '6eme',
    '6e': '6eme',
    '5eme': '5eme',
    '5e': '5eme',
    '4eme': '4eme',
    '4e': '4eme',
    '3eme': '3eme',
    '3e': '3eme',
    '2nd': '2nd',
    '2nde': '2nd',
    'seconde': '2nd',
    '1ere': '1ere',
    '1er': '1ere',
    'premiere': '1ere',
    'tle': 'Tle',
    'terminale': 'Tle'
  };

  return map[n] || null;
}

function parseClasseNom(nom) {
  if (!nom) return null;

  const raw = String(nom).trim().replace(/\s+/g, ' ');
  const cleaned = simplifyText(raw);

  const match = cleaned.match(
    /^(6eme|6e|5eme|5e|4eme|4e|3eme|3e|2nd|2nde|seconde|1ere|1er|premiere|tle|terminale)(?:\s+([A-Za-z]+))?(?:\s+([0-9]+))?$/i
  );

  if (!match) return null;

  const niveau = normalizeNiveau(match[1]);
  if (!niveau) return null;

  return {
    niveau,
    prefix: (match[2] || '').toUpperCase(),
    suffix: parseInt(match[3] || '0', 10),
    raw
  };
}

function trierClasses(classes) {
  return [...classes].sort((a, b) => {
    const pa = parseClasseNom(a.nom);
    const pb = parseClasseNom(b.nom);

    if (!pa && !pb) return 0;
    if (!pa) return 1;
    if (!pb) return -1;

    const ia = ordreClasses.indexOf(pa.niveau);
    const ib = ordreClasses.indexOf(pb.niveau);

    if (ia !== ib) return ia - ib;

    if (pa.prefix !== pb.prefix) {
      return pa.prefix.localeCompare(pb.prefix);
    }

    return pa.suffix - pb.suffix;
  });
}

function determinerDestinationPrevue(classeNom) {
  const parsed = parseClasseNom(classeNom);
  const niveauActuel = parsed ? parsed.niveau : null;

  if (!niveauActuel) return 'Non déterminé';

  if (classesFinDeCycle.includes(niveauActuel)) {
    return niveauActuel === '3eme' ? 'Fin de cycle 1' : 'Fin de cycle 2';
  }

  const index = ordreClasses.indexOf(niveauActuel);

  if (index >= 0 && index < ordreClasses.length - 1) {
    return ordreClasses[index + 1];
  }

  return 'Non déterminé';
}

function sanitizeClotureParams(payload = {}) {
  const defaults = getDefaultClotureParams();

  const effectifMaxParClasse = Math.max(
    1,
    Number(payload.effectifMaxParClasse ?? defaults.effectifMaxParClasse) ||
      defaults.effectifMaxParClasse
  );

  const effectifMinNouvelleClasse = Math.max(
    1,
    Number(payload.effectifMinNouvelleClasse ?? defaults.effectifMinNouvelleClasse) ||
      defaults.effectifMinNouvelleClasse
  );

  return {
    effectifMaxParClasse,
    effectifMinNouvelleClasse,
    activerCreationAutoClasse: parseBoolean(
      payload.activerCreationAutoClasse,
      defaults.activerCreationAutoClasse
    ),
    activerRepartitionIntelligente: parseBoolean(
      payload.activerRepartitionIntelligente,
      defaults.activerRepartitionIntelligente
    ),
    noteInterne: String(payload.noteInterne || '').trim()
  };
}

function ajouterAffectation(affectationsParClasse, classeId, eleveIds) {
  if (!affectationsParClasse[classeId]) {
    affectationsParClasse[classeId] = [];
  }

  affectationsParClasse[classeId].push(...eleveIds);
}

async function affecterElevesAClasse(connection, classeId, eleveIds) {
  if (!eleveIds || eleveIds.length === 0) return;

  const idsUniques = [...new Set(eleveIds)];
  const placeholders = idsUniques.map(() => '?').join(', ');

  const sql = `UPDATE eleve SET classe_id = ? WHERE id IN (${placeholders})`;
  await connection.execute(sql, [classeId, ...idsUniques]);
}

function tailleGroupesEquitables(total, k) {
  if (k <= 0) return [];
  const base = Math.floor(total / k);
  const reste = total % k;
  return Array.from({ length: k }, (_, i) => base + (i < reste ? 1 : 0));
}

function repartirEnEquilibrantEffectifFinal(eleves, classes, effectifsExistants, effectifMax) {
  const compteurs = new Map(classes.map(c => [c.id, effectifsExistants[c.id] || 0]));
  const affectations = new Map(classes.map(c => [c.id, []]));
  const nonPlaces = [];

  for (const eleve of eleves) {
    let meilleure = null;
    let meilleurEffectif = Infinity;

    for (const classe of classes) {
      const effectifActuel = compteurs.get(classe.id);
      if (effectifActuel < effectifMax && effectifActuel < meilleurEffectif) {
        meilleure = classe;
        meilleurEffectif = effectifActuel;
      }
    }

    if (!meilleure) {
      nonPlaces.push(eleve);
      continue;
    }

    compteurs.set(meilleure.id, compteurs.get(meilleure.id) + 1);
    affectations.get(meilleure.id).push(eleve);
  }

  const parClasse = {};
  for (const [classeId, liste] of affectations) {
    parClasse[classeId] = liste;
  }
  return [parClasse, nonPlaces];
}

function getNextClassName(nextNiveau, prefix, classesTriees) {
  const toutesLesClassesMemeNiveau = classesTriees.filter(c => {
    const parsed = parseClasseNom(c.nom);
    if (!parsed) return false;
    return parsed.niveau === nextNiveau && parsed.prefix === (prefix || '');
  });

  const maxSuffix = toutesLesClassesMemeNiveau.reduce((max, c) => {
    const parsed = parseClasseNom(c.nom);
    return Math.max(max, parsed ? parsed.suffix : 0);
  }, 0);

  const nouveauSuffix = maxSuffix + 1;

  return prefix
    ? `${nextNiveau} ${prefix} ${nouveauSuffix}`
    : `${nextNiveau} ${nouveauSuffix}`;
}

async function recupererResumeElevesPourCloture(connection, etablissementId, anneeScolaireId) {
  const [rows] = await connection.execute(
    `
    SELECT
      e.id AS eleveId,
      e.nom AS eleveNom,
      e.prenom AS elevePrenom,
      c.id AS classeId,
      c.nom AS classeNom,

      COUNT(DISTINCT NULLIF(TRIM(b.decision), '')) AS nombreDecisionsDistinctes,
      MIN(NULLIF(TRIM(b.decision), '')) AS decisionCandidate,
      MAX(CASE WHEN b.moyAn IS NOT NULL THEN b.moyAn END) AS moyAnFinale

    FROM eleve e
    JOIN classes c
      ON e.classe_id = c.id
    LEFT JOIN bulletin b
      ON b.eleve_id = e.id
     AND b.etablissement_id = ?
     AND b.Annee_scolaire_id = ?
    WHERE e.etablissement_id = ?
      AND e.Annee_scolaire_id = ?
    GROUP BY e.id, e.nom, e.prenom, c.id, c.nom
    ORDER BY c.nom ASC, e.nom ASC, e.prenom ASC
    `,
    [etablissementId, anneeScolaireId, etablissementId, anneeScolaireId]
  );

  return rows.map((row) => {
    let decisionFinale = null;

    if (Number(row.nombreDecisionsDistinctes) === 1) {
      decisionFinale = row.decisionCandidate || null;
    } else if (Number(row.nombreDecisionsDistinctes) > 1) {
      decisionFinale = '__INCOHERENTE__';
    }

    return {
      eleveId: row.eleveId,
      eleveNom: row.eleveNom,
      elevePrenom: row.elevePrenom,
      classeId: row.classeId,
      classeNom: row.classeNom,
      moyAn: row.moyAnFinale,
      decision: decisionFinale
    };
  });
}

function construireRapportParClasse(resumesEleves) {
  const map = new Map();

  for (const eleve of resumesEleves) {
    const classeId = eleve.classeId;
    const classeNom = eleve.classeNom;

    if (!map.has(classeId)) {
      map.set(classeId, {
        classeId,
        classeNom,
        totalEleves: 0,
        nombreQuiPassent: 0,
        nombreQuiEchouent: 0,
        destinationPrevue: determinerDestinationPrevue(classeNom)
      });
    }

    const item = map.get(classeId);
    item.totalEleves += 1;

    if (eleve.decision === 'Admis') {
      item.nombreQuiPassent += 1;
    } else {
      item.nombreQuiEchouent += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.classeNom.localeCompare(b.classeNom));
}

function construirePlanPromotion(classesTriees, resumesEleves, params) {
  const elevesParNiveau = {};
  const anomaliesPromotion = [];
  const detailsGroupes = [];
  const affectationsParClasse = {};
  const creationsDeClasses = [];

  const effectifMax = Math.max(1, Number(params.effectifMaxParClasse) || 50);
  const effectifMin = Math.max(1, Number(params.effectifMinNouvelleClasse) || 10);
  const creationAuto = !!params.activerCreationAutoClasse;
  const repartitionIntelligente = !!params.activerRepartitionIntelligente;

  // Élèves qui restent dans leur classe actuelle après cette clôture (redoublants,
  // décision différente de "Admis") : ils occupent déjà des places dans les classes
  // qui vont aussi recevoir les élèves nouvellement promus.
  const effectifsRestants = {};
  for (const eleve of resumesEleves) {
    if (eleve.decision === 'Admis') continue;
    if (!eleve.classeId) continue;
    effectifsRestants[eleve.classeId] = (effectifsRestants[eleve.classeId] || 0) + 1;
  }

  for (const eleve of resumesEleves) {
    const { decision, classeNom, eleveId, eleveNom, elevePrenom } = eleve;

    if (decision === '__INCOHERENTE__') {
      anomaliesPromotion.push({
        eleveId,
        nom: eleveNom,
        prenom: elevePrenom,
        classeNom,
        probleme: "Décisions de passage incohérentes pour cet élève dans les bulletins"
      });
      continue;
    }

    if (!decision) {
      anomaliesPromotion.push({
        eleveId,
        nom: eleveNom,
        prenom: elevePrenom,
        classeNom,
        probleme: "Décision de passage manquante"
      });
      continue;
    }

    if (decision !== 'Admis') continue;

    const parsedClasse = parseClasseNom(classeNom);
    if (!parsedClasse) {
      anomaliesPromotion.push({
        eleveId,
        nom: eleveNom,
        prenom: elevePrenom,
        classeNom,
        probleme: "Nom de classe non reconnu pour la promotion"
      });
      continue;
    }

    const { niveau, prefix } = parsedClasse;
    const index = ordreClasses.indexOf(niveau);

    if (index === -1) {
      anomaliesPromotion.push({
        eleveId,
        nom: eleveNom,
        prenom: elevePrenom,
        classeNom,
        probleme: "Niveau de classe introuvable dans l’ordre de promotion"
      });
      continue;
    }

    if (classesFinDeCycle.includes(niveau)) continue;
    if (index >= ordreClasses.length - 1) continue;

    const nextNiveau = ordreClasses[index + 1];
    const cle = `${nextNiveau}||${prefix}`;

    if (!elevesParNiveau[cle]) {
      elevesParNiveau[cle] = [];
    }

    if (!elevesParNiveau[cle].some(e => e.eleveId === eleveId)) {
      elevesParNiveau[cle].push({
        eleveId,
        nom: eleveNom,
        prenom: elevePrenom,
        classeActuelle: classeNom
      });
    }
  }

  const enregistrerAffectation = (classe, groupe, type) => {
    if (!groupe.length) return;
    ajouterAffectation(affectationsParClasse, classe.id, groupe.map(e => e.eleveId));
    const effectifExistant = effectifsRestants[classe.id] || 0;
    detailsGroupes.push({
      groupeDestination: classe.nom,
      nombreEleves: groupe.length,
      type,
      eleves: groupe,
      effectifExistant,
      effectifFinal: effectifExistant + groupe.length
    });
  };

  for (const key in elevesParNiveau) {
    const [nextNiveau, prefix] = key.split('||');
    const eleves = elevesParNiveau[key];
    const count = eleves.length;

    const classesSuperieures = classesTriees.filter(c => {
      const parsed = parseClasseNom(c.nom);
      if (!parsed) return false;
      return parsed.niveau === nextNiveau && parsed.prefix === (prefix || '');
    });

    if (!classesSuperieures.length) {
      anomaliesPromotion.push({
        groupe: `${nextNiveau}${prefix ? ' ' + prefix : ''}`,
        probleme: "Aucune classe de destination trouvée pour ce groupe d’élèves admis",
        eleves: eleves.map(e => ({
          eleveId: e.eleveId,
          nom: e.nom,
          prenom: e.prenom,
          classeActuelle: e.classeActuelle
        }))
      });
      continue;
    }

    // Mode simple : tout part dans la première classe trouvée, mais on refuse si ça
    // dépasse l’effectif max plutôt que de laisser passer un dépassement silencieux —
    // en mode simple il n’y a pas de mécanisme de repli comme en mode intelligent.
    if (!repartitionIntelligente) {
      const cible = classesSuperieures[0];
      const effectifExistant = effectifsRestants[cible.id] || 0;

      if (effectifExistant + count > effectifMax) {
        anomaliesPromotion.push({
          groupe: `${nextNiveau}${prefix ? ' ' + prefix : ''}`,
          probleme: `Répartition intelligente désactivée : tous les élèves iraient dans "${cible.nom}", ce qui dépasserait l’effectif maximum (${effectifExistant + count}/${effectifMax}).`,
          eleves: eleves.map(e => ({
            eleveId: e.eleveId,
            nom: e.nom,
            prenom: e.prenom,
            classeActuelle: e.classeActuelle
          }))
        });
        continue;
      }

      enregistrerAffectation(cible, eleves, 'groupe_unique');
      continue;
    }

    // Mode intelligent : on priorise les classes déjà actives (avec des redoublants,
    // donc déjà ouvertes de toute façon) avant d’envisager d’activer une classe vide
    // ou d’en créer une nouvelle — chaque classe supplémentaire a un coût réel
    // (enseignant, salle) qu’il faut éviter si ce n’est pas nécessaire.
    const classesActives = classesSuperieures.filter(c => (effectifsRestants[c.id] || 0) > 0);
    const classesVides = classesSuperieures.filter(c => !((effectifsRestants[c.id] || 0) > 0));

    const placesActives = classesActives.reduce(
      (somme, c) => somme + Math.max(0, effectifMax - (effectifsRestants[c.id] || 0)),
      0
    );

    let classesUtilisees;
    const creationsAFaire = []; // { nom, taille }

    if (placesActives >= count) {
      classesUtilisees = classesActives;
    } else {
      const manque = count - placesActives;
      const nbVidesNecessaires = Math.max(0, Math.ceil(manque / effectifMax));

      if (classesVides.length >= nbVidesNecessaires) {
        classesUtilisees = classesActives.concat(classesVides.slice(0, nbVidesNecessaires));
      } else {
        const manqueRestant = manque - classesVides.length * effectifMax;

        if (!creationAuto) {
          anomaliesPromotion.push({
            groupe: `${nextNiveau}${prefix ? ' ' + prefix : ''}`,
            probleme: "Les classes existantes (actives et vides) ne suffisent pas et la création automatique est désactivée",
            eleves: eleves.map(e => ({
              eleveId: e.eleveId,
              nom: e.nom,
              prenom: e.prenom,
              classeActuelle: e.classeActuelle
            }))
          });
          continue;
        }

        classesUtilisees = classesActives.concat(classesVides);

        let nbNouvelles = Math.max(1, Math.ceil(manqueRestant / effectifMax));
        let taillesNouvelles = tailleGroupesEquitables(manqueRestant, nbNouvelles);

        while (nbNouvelles > 1 && !taillesNouvelles.every(t => t >= effectifMin)) {
          nbNouvelles -= 1;
          taillesNouvelles = tailleGroupesEquitables(manqueRestant, nbNouvelles);
        }

        for (let i = 0; i < nbNouvelles; i++) {
          const nouveauNom = getNextClassName(nextNiveau, prefix, classesTriees);
          creationsAFaire.push({ nom: nouveauNom, taille: taillesNouvelles[i] });
          classesTriees.push({ id: `temp-${nextNiveau}-${prefix}-${i}`, nom: nouveauNom });
        }
        classesTriees.splice(0, classesTriees.length, ...trierClasses(classesTriees));
      }
    }

    const [affectationsExistantes, nonPlaces] = repartirEnEquilibrantEffectifFinal(
      eleves,
      classesUtilisees,
      effectifsRestants,
      effectifMax
    );

    const typeAffectation = classesUtilisees.length > 1 ? 'repartition_multi_classes' : 'affectation_existante';
    for (const classe of classesUtilisees) {
      enregistrerAffectation(classe, affectationsExistantes[classe.id] || [], typeAffectation);
    }

    // Le surplus qui n’a pas pu tenir dans les classes existantes va dans les
    // nouvelles classes créées, dans l’ordre calculé plus haut.
    let curseur = 0;
    for (const creation of creationsAFaire) {
      const groupe = nonPlaces.slice(curseur, curseur + creation.taille);
      curseur += creation.taille;

      creationsDeClasses.push({
        nom: creation.nom,
        eleveIds: groupe.map(e => e.eleveId),
        eleves: groupe
      });

      detailsGroupes.push({
        groupeDestination: creation.nom,
        nombreEleves: groupe.length,
        type: 'creation_nouvelle_classe',
        eleves: groupe,
        effectifExistant: 0,
        effectifFinal: groupe.length
      });
    }
  }

  // Alerte (non bloquante) : une classe peut, malgré tout, dépasser l’effectif maximum
  // paramétré — cas résiduels (mode simple déjà bloqué plus haut, ou dernier recours
  // de création avec effectifMin impossible à respecter). Ceci prévient l’administrateur
  // avant validation, sans changer la répartition déjà calculée.
  const alertesCapacite = [];

  for (const classeIdStr in affectationsParClasse) {
    const classeId = Number(classeIdStr);
    const classeInfo = classesTriees.find(c => Number(c.id) === classeId);
    const effectifExistant = effectifsRestants[classeId] || 0;
    const effectifNouveaux = affectationsParClasse[classeIdStr].length;
    const effectifFinal = effectifExistant + effectifNouveaux;

    if (effectifFinal > effectifMax) {
      alertesCapacite.push({
        classeId,
        classeNom: classeInfo ? classeInfo.nom : `Classe #${classeId}`,
        effectifExistant,
        effectifNouveaux,
        effectifFinal,
        effectifMax,
        probleme: `Effectif final ${effectifFinal}/${effectifMax} (${effectifNouveaux} nouvel(le)s admis + ${effectifExistant} redoublant(s) déjà présent(s)).`
      });
    }
  }

  for (const creation of creationsDeClasses) {
    if (creation.eleveIds.length > effectifMax) {
      alertesCapacite.push({
        classeId: null,
        classeNom: creation.nom,
        effectifExistant: 0,
        effectifNouveaux: creation.eleveIds.length,
        effectifFinal: creation.eleveIds.length,
        effectifMax,
        probleme: `Nouvelle classe "${creation.nom}" à créer avec ${creation.eleveIds.length} élève(s), au-dessus du maximum paramétré (${effectifMax}).`
      });
    }
  }

  return {
    anomaliesPromotion,
    affectationsParClasse,
    creationsDeClasses,
    detailsGroupes,
    alertesCapacite
  };
}

async function analyserClotureAnnee(connection, etablissementId, anneeScolaireId) {
  const params = await fetchClotureParams(connection, etablissementId);

  const [annees] = await connection.execute(
    `SELECT id, statut FROM annee_scolaire WHERE id = ? AND etablissement_id = ?`,
    [anneeScolaireId, etablissementId]
  );

  if (annees.length === 0) {
    return {
      ok: false,
      status: 404,
      message: "Année scolaire introuvable."
    };
  }

  if (annees[0].statut === 'cloturee') {
    return {
      ok: false,
      status: 400,
      message: "Cette année scolaire est déjà clôturée."
    };
  }

  const [periodes] = await connection.execute(
    `SELECT id, nom
     FROM semestre
     WHERE etablissement_id = ?
     ORDER BY id ASC`,
    [etablissementId]
  );

  if (periodes.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Impossible de clôturer : aucune période n’est définie pour cet établissement."
    };
  }

  const [classesCheck] = await connection.execute(
    `SELECT id
     FROM classes
     WHERE etablissement_id = ?
     LIMIT 1`,
    [etablissementId]
  );

  if (classesCheck.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Impossible de clôturer : aucune classe n’est définie pour cet établissement."
    };
  }

  const [elevesCheck] = await connection.execute(
    `SELECT id
     FROM eleve
     WHERE etablissement_id = ?
     LIMIT 1`,
    [etablissementId]
  );

  if (elevesCheck.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Impossible de clôturer : aucun élève n’est enregistré pour cet établissement."
    };
  }

  const [bulletinsCheck] = await connection.execute(
    `SELECT bulletin_id
     FROM bulletin
     WHERE etablissement_id = ?
       AND Annee_scolaire_id = ?
     LIMIT 1`,
    [etablissementId, anneeScolaireId]
  );

  if (bulletinsCheck.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Impossible de clôturer : aucun bulletin n’a encore été généré pour cette année scolaire."
    };
  }

  const [eleves] = await connection.execute(
    `SELECT
        e.id AS eleveId,
        e.nom,
        e.prenom,
        c.nom AS classeNom
     FROM eleve e
     JOIN classes c ON e.classe_id = c.id
     WHERE e.etablissement_id = ?
       AND e.Annee_scolaire_id = ?
     ORDER BY c.nom ASC, e.nom ASC, e.prenom ASC`,
    [etablissementId, anneeScolaireId]
  );

  const rapportMoyennesManquantes = [];

  for (const eleve of eleves) {
    const problemes = [];

    for (const periode of periodes) {
      const [moyennePeriode] = await connection.execute(
        `SELECT 1
         FROM bulletin
         WHERE eleve_id = ?
           AND etablissement_id = ?
           AND Annee_scolaire_id = ?
           AND semestre_id = ?
           AND moySem IS NOT NULL
         LIMIT 1`,
        [eleve.eleveId, etablissementId, anneeScolaireId, periode.id]
      );

      if (moyennePeriode.length === 0) {
        problemes.push(`Moyenne ${periode.nom} manquante`);
      }
    }

    const [moyenneAnnuelle] = await connection.execute(
      `SELECT 1
       FROM bulletin
       WHERE eleve_id = ?
         AND etablissement_id = ?
         AND Annee_scolaire_id = ?
         AND moyAn IS NOT NULL
       LIMIT 1`,
      [eleve.eleveId, etablissementId, anneeScolaireId]
    );

    if (moyenneAnnuelle.length === 0) {
      problemes.push('Moyenne annuelle manquante');
    }

    if (problemes.length > 0) {
      rapportMoyennesManquantes.push({
        eleveId: eleve.eleveId,
        nom: eleve.nom,
        prenom: eleve.prenom,
        classeNom: eleve.classeNom,
        probleme: problemes.join(' | ')
      });
    }
  }

  const resumesEleves = await recupererResumeElevesPourCloture(
    connection,
    etablissementId,
    anneeScolaireId
  );

  const rapportParClasse = construireRapportParClasse(resumesEleves);

  if (rapportMoyennesManquantes.length > 0) {
    return {
      ok: false,
      status: 400,
      message:
        "Clôture impossible : certains élèves n’ont pas encore toutes les moyennes requises. Corrigez d’abord ces anomalies avant toute validation finale.",
      rapportInterface: {
        rapportParClasse,
        rapportMoyennesManquantes,
        anomaliesPromotion: [],
        detailsGroupes: [],
        totalClasses: rapportParClasse.length,
        totalElevesConcernes: rapportMoyennesManquantes.length,
        parametresUtilises: params
      }
    };
  }

  const [classes] = await connection.execute(
    `SELECT id, nom
     FROM classes
     WHERE etablissement_id = ?`,
    [etablissementId]
  );

  const classesTriees = trierClasses(classes);
  const plan = construirePlanPromotion(classesTriees, resumesEleves, params);

  if (plan.anomaliesPromotion.length > 0) {
    return {
      ok: false,
      status: 400,
      message:
        "Clôture impossible : certaines promotions ne peuvent pas être préparées correctement. Vérifiez les décisions, les noms de classes et les classes de destination.",
      rapportInterface: {
        rapportParClasse,
        rapportMoyennesManquantes: [],
        anomaliesPromotion: plan.anomaliesPromotion,
        alertesCapacite: plan.alertesCapacite,
        detailsGroupes: plan.detailsGroupes,
        totalClasses: rapportParClasse.length,
        totalAnomaliesPromotion: plan.anomaliesPromotion.length,
        parametresUtilises: params
      }
    };
  }

  return {
    ok: true,
    status: 200,
    message:
      "Rapport de clôture généré avec succès. Aucun changement n’a encore été appliqué. Veuillez valider pour lancer définitivement les changements.",
    rapportInterface: {
      rapportParClasse,
      rapportMoyennesManquantes: [],
      anomaliesPromotion: [],
      alertesCapacite: plan.alertesCapacite,
      detailsGroupes: plan.detailsGroupes,
      totalClasses: rapportParClasse.length,
      totalAffectationsExistantes: Object.keys(plan.affectationsParClasse).length,
      totalCreationsDeClasses: plan.creationsDeClasses.length,
      totalAlertesCapacite: plan.alertesCapacite.length,
      parametresUtilises: params
    },
    planExecution: {
      affectationsParClasse: plan.affectationsParClasse,
      creationsDeClasses: plan.creationsDeClasses
    }
  };
}

async function executerPlanCloture(connection, etablissementId, planExecution) {
  const { affectationsParClasse, creationsDeClasses } = planExecution;

  for (const classeId in affectationsParClasse) {
    await affecterElevesAClasse(
      connection,
      Number(classeId),
      affectationsParClasse[classeId]
    );
  }

  for (const creation of creationsDeClasses) {
    const [result] = await connection.execute(
      `INSERT INTO classes (nom, etablissement_id)
       VALUES (?, ?)`,
      [creation.nom, etablissementId]
    );

    const nouvelleClasseId = result.insertId;

    await affecterElevesAClasse(
      connection,
      nouvelleClasseId,
      creation.eleveIds
    );
  }
}

router.get('/cloture-parametres/:etablissementId', authenticateJWT, async (req, res) => {
  const etablissementId = Number(req.params.etablissementId);

  if (!etablissementId) {
    return res.status(400).json({
      message: "L’identifiant de l’établissement est requis."
    });
  }

  if (Number(req.user.etablissementId) !== etablissementId) {
    return res.status(403).json({ message: 'Accès non autorisé.' });
  }

  let connection;

  try {
    connection = await db.getConnection();
    const parametres = await fetchClotureParams(connection, etablissementId);

    return res.status(200).json({ parametres });
  } catch (error) {
    console.error("Erreur lecture paramètres clôture :", error);
    return res.status(500).json({
      message: "Une erreur est survenue lors de la lecture des paramètres."
    });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/cloture-parametres', authenticateJWT, async (req, res) => {
  const { etablissementId } = req.body;

  if (!etablissementId) {
    return res.status(400).json({
      message: "L’identifiant de l’établissement est requis."
    });
  }

  if (Number(req.user.etablissementId) !== Number(etablissementId)) {
    return res.status(403).json({ message: 'Accès non autorisé.' });
  }

  const params = sanitizeClotureParams(req.body);

  if (params.effectifMinNouvelleClasse > params.effectifMaxParClasse) {
    return res.status(400).json({
      message: "L’effectif minimal d’une nouvelle classe ne peut pas dépasser l’effectif maximal."
    });
  }

  let connection;

  try {
    connection = await db.getConnection();

    const [exists] = await connection.execute(
      `SELECT id FROM cloture_parametres WHERE etablissement_id = ? LIMIT 1`,
      [etablissementId]
    );

    if (exists.length) {
      await connection.execute(
        `
        UPDATE cloture_parametres
        SET
          effectif_max_par_classe = ?,
          effectif_min_nouvelle_classe = ?,
          activer_creation_auto_classe = ?,
          activer_repartition_intelligente = ?,
          note_interne = ?,
          updated_at = NOW()
        WHERE etablissement_id = ?
        `,
        [
          params.effectifMaxParClasse,
          params.effectifMinNouvelleClasse,
          params.activerCreationAutoClasse ? 1 : 0,
          params.activerRepartitionIntelligente ? 1 : 0,
          params.noteInterne,
          etablissementId
        ]
      );
    } else {
      await connection.execute(
        `
        INSERT INTO cloture_parametres
        (
          etablissement_id,
          effectif_max_par_classe,
          effectif_min_nouvelle_classe,
          activer_creation_auto_classe,
          activer_repartition_intelligente,
          note_interne,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          etablissementId,
          params.effectifMaxParClasse,
          params.effectifMinNouvelleClasse,
          params.activerCreationAutoClasse ? 1 : 0,
          params.activerRepartitionIntelligente ? 1 : 0,
          params.noteInterne
        ]
      );
    }

    const parametres = await fetchClotureParams(connection, etablissementId);

    return res.status(200).json({
      message: "Paramètres de clôture enregistrés avec succès.",
      parametres
    });
  } catch (error) {
    console.error("Erreur enregistrement paramètres clôture :", error);
    return res.status(500).json({
      message: "Une erreur est survenue lors de l’enregistrement des paramètres."
    });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/cloture-annee-scolaire', authenticateJWT, async (req, res) => {
  const {
    etablissementId,
    anneeScolaireId,
    confirmation = false
  } = req.body;

  if (!etablissementId || !anneeScolaireId) {
    return res.status(400).json({
      message: "Les IDs de l’établissement et de l’année scolaire sont requis."
    });
  }

  if (Number(req.user.etablissementId) !== Number(etablissementId)) {
    return res.status(403).json({ message: 'Accès non autorisé.' });
  }

  let connection;

  try {
    connection = await db.getConnection();

    if (!confirmation) {
      const analyse = await analyserClotureAnnee(
        connection,
        etablissementId,
        anneeScolaireId
      );

      return res.status(analyse.status).json({
        confirmationRequise: analyse.ok,
        clotureExecutee: false,
        message: analyse.message,
        ...(analyse.rapportInterface ? { rapport: analyse.rapportInterface } : {})
      });
    }

    await connection.beginTransaction();

    const analyse = await analyserClotureAnnee(
      connection,
      etablissementId,
      anneeScolaireId
    );

    if (!analyse.ok) {
      await connection.rollback();
      return res.status(analyse.status).json({
        confirmationRequise: false,
        clotureExecutee: false,
        message: analyse.message,
        ...(analyse.rapportInterface ? { rapport: analyse.rapportInterface } : {})
      });
    }

    await executerPlanCloture(
      connection,
      etablissementId,
      analyse.planExecution
    );

    await connection.execute(
      `UPDATE annee_scolaire
       SET statut = 'cloturee'
       WHERE id = ?`,
      [anneeScolaireId]
    );

    await connection.commit();

    return res.status(200).json({
      confirmationRequise: false,
      clotureExecutee: true,
      message:
        "Année scolaire clôturée avec succès. Tous les changements ont été validés et appliqués définitivement.",
      rapport: analyse.rapportInterface
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Erreur rollback :", rollbackError);
      }
    }

    console.error("Erreur de clôture :", error);
    return res.status(500).json({
      confirmationRequise: false,
      clotureExecutee: false,
      message: "Une erreur est survenue lors de la clôture de l’année scolaire."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
