// =====================================================================
//  Programmes de matière (SA → séquence → activité...) : dépôt, lecture,
//  modification, et progression de la classe pour le cahier de texte.
//
//  - L'administration dépose ou modifie le programme d'un niveau : il vaut
//    pour toutes les classes de ce niveau.
//  - Un enseignant voit le programme de ses classes. S'il n'en existe pas
//    encore pour le niveau, celui qu'il dépose devient le programme du
//    niveau (proposé à ses collègues). S'il modifie le programme du niveau
//    déposé par quelqu'un d'autre, il obtient sa propre version, utilisée
//    pour ses classes de ce niveau seulement.
//  Les programmes ne dépendent pas de l'année scolaire.
// =====================================================================
const express = require('express');
const multer = require('multer');

const db = require('../server-lib/db.cjs');
const { authenticateJWT, requireAdminStaff } = require('../server-lib/auth.cjs');
const texte = require('../server-lib/programme-texte.cjs');
const P = require('../server-lib/programmes-matiere.cjs');

const router = express.Router();
const fichier = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const estStaff = (req) => req.user && (req.user.type === 'etablissement' || req.user.type === 'administration');
const estEnseignant = (req) => req.user && req.user.role === 'enseignant';

// La classe et la matière appartiennent à l'école du compte ; un enseignant
// doit enseigner cette matière dans cette classe.
async function accesClasse(req, res) {
  const classe = await P.classeInfo(db, Number(req.params.classeId));
  const matiereId = Number(req.params.matiereId);
  const [[matiere]] = await db.query('SELECT id, nom, etablissement_id AS etab FROM matieres WHERE id = ?', [matiereId]);
  const etab = Number(req.user.etablissementId);
  if (!classe || !matiere || Number(classe.etab) !== etab || Number(matiere.etab) !== etab) {
    res.status(404).json({ message: 'Classe ou matière introuvable.' });
    return null;
  }
  if (!classe.promotionId) {
    res.status(400).json({ message: "Cette classe n'est rattachée à aucun niveau : renseignez son niveau dans la gestion des classes." });
    return null;
  }
  if (estEnseignant(req)) {
    const ids = await P.enseignantsDe(db, classe, matiereId);
    if (!ids.includes(Number(req.user.id))) {
      res.status(403).json({ message: "Vous n'enseignez pas cette matière dans cette classe." });
      return null;
    }
  } else if (!estStaff(req)) {
    res.status(403).json({ message: 'Accès non autorisé.' });
    return null;
  }
  return { classe, matiere };
}

async function nomEnseignant(id) {
  if (!id) return null;
  const [[e]] = await db.query('SELECT nom, prenom FROM enseignants WHERE id = ?', [id]);
  return e ? `${e.prenom || ''} ${e.nom || ''}`.trim() : null;
}

// ---------------------------------------------------------------------
// Programme d'une classe pour une matière, avec la progression
// ---------------------------------------------------------------------
router.get('/programme-matiere/classe/:classeId/:matiereId', authenticateJWT, async (req, res) => {
  try {
    const acces = await accesClasse(req, res);
    if (!acces) return;
    const { classe, matiere } = acces;
    const enseignantId = estEnseignant(req) ? Number(req.user.id) : null;
    const programme = await P.programmeDeClasse(db, classe, matiere.id, enseignantId);
    const prog = await P.progression(db, classe, matiere.id);
    if (!programme) {
      return res.json({ classe: { id: classe.id, nom: classe.nom, niveau: classe.promotion }, matiere: { id: matiere.id, nom: matiere.nom }, programme: null, arbre: [], progression: prog.parElement, suggestion: null });
    }
    const arbre = await P.arbre(db, programme.id);
    res.json({
      classe: { id: classe.id, nom: classe.nom, niveau: classe.promotion },
      matiere: { id: matiere.id, nom: matiere.nom },
      programme: {
        id: programme.id,
        portee: programme.portee,
        auteur: programme.auteur,
        auteurNom: programme.auteur === 'enseignant' ? await nomEnseignant(programme.auteur_enseignant_id) : null,
        estLeMien: !!enseignantId && Number(programme.auteur_enseignant_id) === enseignantId,
        modifieLe: programme.updated_at,
      },
      arbre,
      progression: prog.parElement,
      suggestion: P.suggestion(arbre, prog),
    });
  } catch (e) {
    console.error('GET programme-matiere/classe :', e);
    res.status(500).json({ message: 'Erreur lors du chargement du programme.' });
  }
});

// ---------------------------------------------------------------------
// Lecture d'un programme (texte collé, Word ou PDF) → arbre à vérifier.
// Rien n'est enregistré ici.
// ---------------------------------------------------------------------
router.post('/programme-matiere/analyser', authenticateJWT, fichier.single('fichier'), async (req, res) => {
  try {
    if (!estStaff(req) && !estEnseignant(req)) return res.status(403).json({ message: 'Accès non autorisé.' });
    let source = String(req.body?.texte || '');
    if (req.file) {
      const nom = String(req.file.originalname || '').toLowerCase();
      if (nom.endsWith('.docx')) source = await texte.texteDocx(req.file.buffer);
      else if (nom.endsWith('.pdf')) source = await texte.textePdf(req.file.buffer);
      else if (nom.endsWith('.txt')) source = req.file.buffer.toString('utf8');
      else return res.status(400).json({ message: 'Format non pris en charge : déposez un fichier Word (.docx), PDF ou texte, ou collez le programme.' });
      if (!source.trim()) {
        return res.status(422).json({ message: "Ce fichier ne contient pas de texte lisible (document scanné ou photo). Collez le texte du programme, ou déposez la version Word ou PDF d'origine." });
      }
    }
    if (!source.trim()) return res.status(400).json({ message: 'Collez le programme ou déposez un fichier.' });
    const arbre = texte.analyserTexte(source);
    if (!arbre.length) {
      return res.status(422).json({ message: "Aucun titre reconnu. Écrivez par exemple « SA 1 : Géométrie dans l'espace », puis « Activité 1 : … » sur les lignes suivantes." });
    }
    res.json({ arbre, nombre: texte.compter(arbre) });
  } catch (e) {
    console.error('POST programme-matiere/analyser :', e);
    res.status(500).json({ message: 'Le fichier n’a pas pu être lu.' });
  }
});

// Valide un arbre reçu (profondeur et taille raisonnables).
function arbreValide(arbre) {
  let n = 0;
  const ok = (liste, profondeur) => Array.isArray(liste) && profondeur <= 6 && liste.every((e) => {
    n += 1;
    return e && typeof e === 'object' && String(e.titre || '').trim() && (e.enfants === undefined || ok(e.enfants, profondeur + 1));
  });
  return ok(arbre, 1) && n > 0 && n <= 2000;
}

async function creerProgramme(conn, { etab, matiereId, promotionId, enseignantId, auteur, auteurEnseignantId }) {
  const [r] = await conn.query(
    'INSERT INTO programme_matiere (etablissement_id, matiere_id, promotion_id, enseignant_id, auteur, auteur_enseignant_id) VALUES (?, ?, ?, ?, ?, ?)',
    [etab, matiereId, promotionId, enseignantId, auteur, auteurEnseignantId]
  );
  return r.insertId;
}

// Remplace les identifiants d'un arbre selon une correspondance ancien → nouveau.
function renumeroter(arbre, map) {
  return (arbre || []).map((e) => ({ ...e, id: e.id && map.has(Number(e.id)) ? map.get(Number(e.id)) : e.id, enfants: renumeroter(e.enfants, map) }));
}

// ---------------------------------------------------------------------
// Enregistrement depuis l'espace d'une classe (enseignant ou administration)
// ---------------------------------------------------------------------
router.put('/programme-matiere/classe/:classeId/:matiereId', authenticateJWT, async (req, res) => {
  let conn;
  try {
    const acces = await accesClasse(req, res);
    if (!acces) return;
    const { classe, matiere } = acces;
    const arbre = req.body?.arbre;
    if (!arbreValide(arbre)) return res.status(400).json({ message: 'Programme vide ou invalide.' });

    conn = await db.getConnection();
    await conn.beginTransaction();
    const niveau = await P.programmeNiveau(conn, classe.etab, matiere.id, classe.promotionId);
    let programmeId;
    let arbreFinal = arbre;

    if (estStaff(req)) {
      programmeId = niveau ? niveau.id : await creerProgramme(conn, { etab: classe.etab, matiereId: matiere.id, promotionId: classe.promotionId, enseignantId: null, auteur: 'administration', auteurEnseignantId: null });
      if (niveau) await conn.query("UPDATE programme_matiere SET auteur = 'administration', auteur_enseignant_id = NULL WHERE id = ?", [niveau.id]);
    } else {
      const moi = Number(req.user.id);
      const mienne = await P.programmeEnseignant(conn, classe.etab, matiere.id, classe.promotionId, moi);
      if (mienne) {
        programmeId = mienne.id;
      } else if (!niveau) {
        // Premier dépôt pour ce niveau : il devient le programme du niveau.
        programmeId = await creerProgramme(conn, { etab: classe.etab, matiereId: matiere.id, promotionId: classe.promotionId, enseignantId: null, auteur: 'enseignant', auteurEnseignantId: moi });
      } else if (niveau.auteur === 'enseignant' && Number(niveau.auteur_enseignant_id) === moi) {
        programmeId = niveau.id; // il modifie le programme qu'il a lui-même déposé
      } else {
        // Version propre à l'enseignant, copiée du programme du niveau : les
        // séances déjà rattachées dans ses classes suivent la copie.
        programmeId = await creerProgramme(conn, { etab: classe.etab, matiereId: matiere.id, promotionId: classe.promotionId, enseignantId: moi, auteur: 'enseignant', auteurEnseignantId: moi });
        const map = await P.copierElements(conn, niveau.id, programmeId);
        arbreFinal = renumeroter(arbre, map);
        const [classes] = await conn.query(
          `SELECT DISTINCT e.Classes_id AS id FROM enseigner e JOIN classes c ON c.id = e.Classes_id
            WHERE e.Enseignants_id = ? AND e.matiere_id = ? AND c.Promotion_id = ?`,
          [moi, matiere.id, classe.promotionId]
        );
        for (const [ancien, nouveau] of map) {
          if (classes.length) {
            await conn.query('UPDATE tests SET programme_element_id = ? WHERE programme_element_id = ? AND `matière_id` = ? AND classe_id IN (?)', [nouveau, ancien, matiere.id, classes.map((c) => c.id)]);
          }
        }
      }
    }

    await P.enregistrerArbre(conn, programmeId, arbreFinal);
    await conn.query('UPDATE programme_matiere SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [programmeId]);
    await conn.commit();
    res.json({ ok: true, programmeId, arbre: await P.arbre(db, programmeId) });
  } catch (e) {
    if (conn) await conn.rollback().catch(() => {});
    console.error('PUT programme-matiere/classe :', e);
    res.status(500).json({ message: "Le programme n'a pas pu être enregistré." });
  } finally {
    if (conn) conn.release();
  }
});

// ---------------------------------------------------------------------
// Administration : programmes par niveau
// ---------------------------------------------------------------------
router.get('/programme-matiere/niveaux', authenticateJWT, requireAdminStaff, async (req, res) => {
  try {
    const etab = Number(req.user.etablissementId);
    const [rows] = await db.query(
      `SELECT pm.id, pm.matiere_id AS matiereId, m.nom AS matiere, pm.promotion_id AS promotionId, pr.nom AS niveau,
              pm.enseignant_id AS enseignantId, pm.auteur, pm.updated_at AS modifieLe,
              (SELECT COUNT(*) FROM programme_element pe WHERE pe.programme_id = pm.id AND pe.retire = 0) AS elements
         FROM programme_matiere pm
         JOIN matieres m ON m.id = pm.matiere_id
         JOIN promotion pr ON pr.id = pm.promotion_id
        WHERE pm.etablissement_id = ?
        ORDER BY pr.id, m.nom, pm.enseignant_id IS NOT NULL`,
      [etab]
    );
    // Niveaux et matières réellement enseignés cette année (répartition),
    // pour montrer où un programme manque encore.
    const [paires] = await db.query(
      `SELECT DISTINCT c.Promotion_id AS promotionId, pr.nom AS niveau, e.matiere_id AS matiereId, m.nom AS matiere
         FROM enseigner e
         JOIN classes c ON c.id = e.Classes_id
         JOIN promotion pr ON pr.id = c.Promotion_id
         JOIN matieres m ON m.id = e.matiere_id
         JOIN annee_scolaire a ON a.id = e.Annee_scolaire_id AND a.statut = 'ouverte'
        WHERE e.etablissement_id = ?
        ORDER BY pr.id, m.nom`,
      [etab]
    );
    res.json({ programmes: rows, paires });
  } catch (e) {
    console.error('GET programme-matiere/niveaux :', e);
    res.status(500).json({ message: 'Erreur lors du chargement des programmes.' });
  }
});

router.get('/programme-matiere/niveau/:promotionId/:matiereId', authenticateJWT, requireAdminStaff, async (req, res) => {
  try {
    const etab = Number(req.user.etablissementId);
    const p = await P.programmeNiveau(db, etab, Number(req.params.matiereId), Number(req.params.promotionId));
    res.json({ programme: p ? { id: p.id, auteur: p.auteur, auteurNom: await nomEnseignant(p.auteur_enseignant_id), modifieLe: p.updated_at } : null, arbre: p ? await P.arbre(db, p.id) : [] });
  } catch (e) {
    console.error('GET programme-matiere/niveau :', e);
    res.status(500).json({ message: 'Erreur lors du chargement du programme.' });
  }
});

router.put('/programme-matiere/niveau/:promotionId/:matiereId', authenticateJWT, requireAdminStaff, async (req, res) => {
  let conn;
  try {
    const etab = Number(req.user.etablissementId);
    const promotionId = Number(req.params.promotionId);
    const matiereId = Number(req.params.matiereId);
    const [[m]] = await db.query('SELECT id FROM matieres WHERE id = ? AND etablissement_id = ?', [matiereId, etab]);
    const [[pr]] = await db.query('SELECT id FROM promotion WHERE id = ?', [promotionId]);
    if (!m || !pr) return res.status(404).json({ message: 'Niveau ou matière introuvable.' });
    if (!arbreValide(req.body?.arbre)) return res.status(400).json({ message: 'Programme vide ou invalide.' });
    conn = await db.getConnection();
    await conn.beginTransaction();
    const niveau = await P.programmeNiveau(conn, etab, matiereId, promotionId);
    const programmeId = niveau ? niveau.id : await creerProgramme(conn, { etab, matiereId, promotionId, enseignantId: null, auteur: 'administration', auteurEnseignantId: null });
    await P.enregistrerArbre(conn, programmeId, req.body.arbre);
    await conn.query("UPDATE programme_matiere SET auteur = 'administration', auteur_enseignant_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [programmeId]);
    await conn.commit();
    res.json({ ok: true, programmeId, arbre: await P.arbre(db, programmeId) });
  } catch (e) {
    if (conn) await conn.rollback().catch(() => {});
    console.error('PUT programme-matiere/niveau :', e);
    res.status(500).json({ message: "Le programme n'a pas pu être enregistré." });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
