// =====================================================================
//  Alertes : centre de notifications des parents, notifications sur le
//  téléphone (Web Push) et réglages des SMS de l'école.
//  Monté dans server.cjs avec : app.use('/api', require('./routes/alertes.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, requireAdminStaff } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const alertes = require('../server-lib/alertes.cjs');
const messagesParents = require('../server-lib/messages-parents.cjs');

const parentDuJeton = (req, res) => {
  if (req.user?.role !== 'parent' || !req.user.id) { res.status(403).json({ message: 'Réservé aux parents.' }); return null; }
  return Number(req.user.id);
};
// Qui s'abonne aux notifications push : parent ou enseignant.
const abonne = (req) => {
  const u = req.user || {};
  if (u.role === 'parent') return { type: 'parent', id: Number(u.id) };
  if (u.type === undefined && u.id && u.etablissementId) return { type: 'enseignant', id: Number(u.id) };
  return null;
};
const lireJson = (d) => (typeof d === 'string' ? JSON.parse(d) : d || null);

// ---------------------------------------------------------------------
// Centre de notifications du parent : alertes (absences, permissions,
// punitions, bulletins, devoirs) + messages (notes, emploi du temps).
// Non lues : toujours affichées ; lues : les 60 derniers jours.
// ---------------------------------------------------------------------
router.get('/parent/notifications', authenticateJWT, async (req, res) => {
  const parentId = parentDuJeton(req, res);
  if (!parentId) return;
  try {
    const [a] = await db.query(
      `SELECT ap.*, e.prenom FROM alerte_parent ap LEFT JOIN eleve e ON e.id = ap.eleve_id
       WHERE ap.parent_id = ? AND (ap.lu = 0 OR ap.created_at >= NOW() - INTERVAL 60 DAY)
       ORDER BY ap.created_at DESC LIMIT 300`,
      [parentId]
    );
    // Absences : motif déjà donné ?
    const absences = a.filter((x) => x.type === 'absence');
    const motifs = {};
    if (absences.length) {
      const [m] = await db.query(
        `SELECT eleve_id, date, MAX(NULLIF(TRIM(motif), '')) AS motif FROM presence
         WHERE statut = 'Absent' AND eleve_id IN (?) GROUP BY eleve_id, date`,
        [[...new Set(absences.map((x) => x.eleve_id))]]
      );
      m.forEach((r) => { motifs[`${r.eleve_id}:${String(r.date instanceof Date ? r.date.toISOString() : r.date).slice(0, 10)}`] = r.motif; });
    }
    const items = a.map((x) => {
      const details = lireJson(x.details) || {};
      return {
        id: `a${x.id}`, type: x.type, titre: x.titre, texte: x.texte, lien: x.lien, lu: Boolean(x.lu), date: x.created_at,
        eleveId: x.eleve_id, enfant: x.prenom || null, urgent: Boolean(x.urgent), details,
        motif: x.type === 'absence' ? (motifs[`${x.eleve_id}:${details.date}`] || null) : undefined,
      };
    });
    const messages = await messagesParents.messagesDuParent(db, parentId, { limite: 150 });
    messages.forEach((m) => items.push({
      id: `m${m.id}`, type: m.type === 'note' ? 'note' : 'programme', titre: m.type === 'note' ? `Nouvelle note · ${m.titre}` : m.titre,
      texte: (m.lignes || []).join(' · '), lignes: m.lignes, lien: '/parents/dashbord/messages', lu: m.lu, date: m.date, eleveId: m.eleveId, enfant: m.enfant,
    }));
    items.sort((x, y) => new Date(y.date) - new Date(x.date));
    res.json({ items, nonLues: items.filter((i) => !i.lu).length });
  } catch (error) {
    console.error('Erreur notifications parent :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.get('/parent/notifications/non-lues', authenticateJWT, async (req, res) => {
  const parentId = parentDuJeton(req, res);
  if (!parentId) return;
  try {
    const [[a]] = await db.query('SELECT COUNT(*) AS n FROM alerte_parent WHERE parent_id = ? AND lu = 0', [parentId]);
    const [[m]] = await db.query('SELECT COUNT(*) AS n FROM message_parent WHERE parent_id = ? AND lu = 0', [parentId]);
    res.json({ nonLues: Number(a.n) + Number(m.n), alertes: Number(a.n), messages: Number(m.n) });
  } catch (error) {
    console.error('Erreur compteur notifications :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Marque lues : les notifications indiquées, ou toutes.
router.put('/parent/notifications/lues', authenticateJWT, async (req, res) => {
  const parentId = parentDuJeton(req, res);
  if (!parentId) return;
  try {
    const { ids, tout } = req.body || {};
    if (tout) {
      await db.query('UPDATE alerte_parent SET lu = 1, updated_at = updated_at WHERE parent_id = ? AND lu = 0', [parentId]);
      await db.query('UPDATE message_parent SET lu = 1, updated_at = updated_at WHERE parent_id = ? AND lu = 0', [parentId]);
    } else if (Array.isArray(ids) && ids.length) {
      const a = ids.filter((i) => /^a\d+$/.test(i)).map((i) => Number(i.slice(1)));
      const m = ids.filter((i) => /^m\d+$/.test(i)).map((i) => Number(i.slice(1)));
      if (a.length) await db.query('UPDATE alerte_parent SET lu = 1, updated_at = updated_at WHERE parent_id = ? AND id IN (?)', [parentId, a]);
      if (m.length) await db.query('UPDATE message_parent SET lu = 1, updated_at = updated_at WHERE parent_id = ? AND id IN (?)', [parentId, m]);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Erreur marquage notifications :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Motif d'une journée d'absence (tous les cours manqués ce jour-là).
router.post('/parent/absences/motif', authenticateJWT, async (req, res) => {
  const parentId = parentDuJeton(req, res);
  if (!parentId) return;
  const { eleveId, date, motif } = req.body || {};
  const texte = String(motif || '').trim();
  if (!texte) return res.status(400).json({ message: 'Indiquez la raison de l’absence.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return res.status(400).json({ message: 'Date invalide.' });
  try {
    const [[e]] = await db.query('SELECT id FROM eleve WHERE id = ? AND Parents_id = ?', [eleveId, parentId]);
    if (!e) return res.status(403).json({ message: "Cet élève n'est pas rattaché à votre compte." });
    const [r] = await db.query("UPDATE presence SET motif = ? WHERE eleve_id = ? AND date = ? AND statut = 'Absent'", [texte.slice(0, 255), eleveId, date]);
    res.json({ message: r.affectedRows ? 'Motif envoyé à l’établissement.' : 'Aucune absence ce jour-là.' });
  } catch (error) {
    console.error('Erreur motif absence :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Préférences : SMS (le parent peut les couper).
router.get('/parent/alertes/preferences', authenticateJWT, async (req, res) => {
  const parentId = parentDuJeton(req, res);
  if (!parentId) return;
  try {
    const [[p]] = await db.query('SELECT contact, alertes_sms, etablissement_id FROM parents WHERE id = ?', [parentId]);
    const params = await alertes.parametresSms(p.etablissement_id);
    res.json({ sms: Boolean(p.alertes_sms), telephone: p.contact || null, numeroValide: Boolean(alertes.numeroInternational(p.contact)), smsActifEcole: Boolean(params.sms_actif) });
  } catch (error) {
    console.error('Erreur préférences alertes :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
router.put('/parent/alertes/preferences', authenticateJWT, async (req, res) => {
  const parentId = parentDuJeton(req, res);
  if (!parentId) return;
  try {
    await db.query('UPDATE parents SET alertes_sms = ? WHERE id = ?', [req.body?.sms ? 1 : 0, parentId]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Erreur préférences alertes :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ---------------------------------------------------------------------
// Notifications sur le téléphone (Web Push)
// ---------------------------------------------------------------------
router.get('/push/cle', authenticateJWT, async (req, res) => {
  try {
    const { publicKey } = await alertes.clesVapid();
    res.json({ publicKey });
  } catch (error) {
    console.error('Erreur clé push :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
router.post('/push/abonnement', authenticateJWT, async (req, res) => {
  const qui = abonne(req);
  if (!qui) return res.status(403).json({ message: 'Réservé aux parents et aux enseignants.' });
  const s = req.body?.abonnement || {};
  const endpoint = String(s.endpoint || '');
  if (!/^https:\/\//.test(endpoint) || !s.keys?.p256dh || !s.keys?.auth) return res.status(400).json({ message: 'Abonnement invalide.' });
  try {
    await db.query(
      `INSERT INTO push_abonnement (utilisateur_type, utilisateur_id, endpoint, p256dh, auth, appareil) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE utilisateur_type = VALUES(utilisateur_type), utilisateur_id = VALUES(utilisateur_id), p256dh = VALUES(p256dh), auth = VALUES(auth), appareil = VALUES(appareil)`,
      [qui.type, qui.id, endpoint.slice(0, 600), String(s.keys.p256dh).slice(0, 200), String(s.keys.auth).slice(0, 100), String(req.body?.appareil || '').slice(0, 200)]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Erreur abonnement push :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
router.post('/push/desabonnement', authenticateJWT, async (req, res) => {
  const qui = abonne(req);
  if (!qui) return res.status(403).json({ message: 'Réservé aux parents et aux enseignants.' });
  try {
    await db.query('DELETE FROM push_abonnement WHERE endpoint = ? AND utilisateur_type = ? AND utilisateur_id = ?', [String(req.body?.endpoint || ''), qui.type, qui.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Erreur désabonnement push :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
// Notification d'essai sur ses propres téléphones.
router.post('/push/essai', authenticateJWT, async (req, res) => {
  const qui = abonne(req);
  if (!qui) return res.status(403).json({ message: 'Réservé aux parents et aux enseignants.' });
  try {
    const n = await alertes.envoyerPush(qui.type, qui.id, { titre: 'EchoEducation', texte: 'Les notifications sont activées sur ce téléphone.', lien: qui.type === 'parent' ? '/parents/dashbord/notifications' : '/professeurs/dashbord/notifications', tag: 'essai' });
    res.json({ envoyes: n });
  } catch (error) {
    console.error('Erreur push essai :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ---------------------------------------------------------------------
// Administration : réglages et journal des SMS
// ---------------------------------------------------------------------
router.get('/alertes/parametres', authenticateJWT, requireAdminStaff, async (req, res) => {
  try {
    const etab = Number(req.user.etablissementId);
    const p = await alertes.parametresSms(etab);
    const [[mois]] = await db.query(
      "SELECT COUNT(*) AS n FROM sms_envoi WHERE etablissement_id = ? AND statut IN ('envoye', 'simule') AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')",
      [etab]
    );
    const [[parents]] = await db.query('SELECT COUNT(*) AS total, SUM(alertes_sms = 0) AS stop FROM parents WHERE etablissement_id = ?', [etab]);
    const [[push]] = await db.query("SELECT COUNT(DISTINCT pa.utilisateur_id) AS n FROM push_abonnement pa JOIN parents p ON p.id = pa.utilisateur_id WHERE pa.utilisateur_type = 'parent' AND p.etablissement_id = ?", [etab]);
    res.json({
      parametres: { smsActif: Boolean(p.sms_actif), absences: Boolean(p.sms_absences), permissions: Boolean(p.sms_permissions), bulletins: Boolean(p.sms_bulletins), quotaMensuel: Number(p.quota_mensuel) },
      fournisseur: alertes.fournisseurSms(),
      smsCeMois: Number(mois.n),
      parents: Number(parents.total), parentsStop: Number(parents.stop || 0), parentsPush: Number(push.n),
    });
  } catch (error) {
    console.error('Erreur paramètres alertes :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
router.put('/alertes/parametres', authenticateJWT, requireAdminStaff, async (req, res) => {
  try {
    const b = req.body || {};
    const quota = Math.max(0, Math.min(100000, Number(b.quotaMensuel) || 0));
    await db.query(
      `INSERT INTO alertes_parametres (etablissement_id, sms_actif, sms_absences, sms_permissions, sms_bulletins, quota_mensuel) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE sms_actif = VALUES(sms_actif), sms_absences = VALUES(sms_absences), sms_permissions = VALUES(sms_permissions), sms_bulletins = VALUES(sms_bulletins), quota_mensuel = VALUES(quota_mensuel)`,
      [req.user.etablissementId, b.smsActif ? 1 : 0, b.absences ? 1 : 0, b.permissions ? 1 : 0, b.bulletins ? 1 : 0, quota]
    );
    res.json({ message: 'Réglages des alertes enregistrés.' });
  } catch (error) {
    console.error('Erreur enregistrement alertes :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
router.get('/alertes/sms', authenticateJWT, requireAdminStaff, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.telephone, s.texte, s.type, s.statut, s.fournisseur, s.reponse, s.created_at, p.nom, p.prenom
       FROM sms_envoi s LEFT JOIN parents p ON p.id = s.parent_id
       WHERE s.etablissement_id = ? ORDER BY s.id DESC LIMIT 100`,
      [req.user.etablissementId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur journal SMS :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
router.post('/alertes/sms-essai', authenticateJWT, requireAdminStaff, async (req, res) => {
  const etab = Number(req.user.etablissementId);
  const numero = alertes.numeroInternational(req.body?.telephone);
  if (!numero) return res.status(400).json({ message: 'Numéro invalide (ex. 01 97 12 34 56).' });
  try {
    // SMS d'essai vers le numéro saisi (inscrit au journal ; simulé tant
    // qu'aucun fournisseur n'est configuré).
    const texte = 'EchoEducation : ceci est un SMS d essai. Les alertes SMS de votre etablissement fonctionnent.';
    const fournisseur = alertes.fournisseurSms();
    const r = await alertes.envoyerSmsAlerte({ etablissement_id: etab, parent_id: null, type: 'essai', titre: 'Essai', texte, texteSms: texte, numeroForce: numero }, { forcer: true });
    const statut = r ? r.statut : 'echec';
    const reponse = r ? r.reponse : null;
    res.json({ statut, fournisseur, numero, reponse });
  } catch (error) {
    console.error('Erreur SMS d’essai :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
