// =====================================================================
//  Alertes des parents
//
//  - enregistrer() : une alerte par événement (absence du jour, réponse à
//    une permission, bulletin disponible, punition, devoir...), sans
//    doublon grâce à une clé (ex. « abs:12:2026-10-05 »).
//  - Chaque NOUVELLE alerte est diffusée : notification sur les téléphones
//    du parent (Web Push, même application fermée) et, pour les urgentes,
//    SMS si l'école l'a activé et que le parent ne l'a pas coupé.
//  - La diffusion se fait juste après la requête : si la transaction qui a
//    créé l'alerte est annulée, l'alerte n'existe plus et rien ne part.
//
//  SMS : fournisseur choisi par la variable SMS_FOURNISSEUR
//    - « twilio » (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM),
//    - « http » : agrégateur local (SMS_HTTP_URL, SMS_HTTP_TOKEN,
//      SMS_EXPEDITEUR) recevant { to, from, message } en JSON,
//    - rien : simulation (le SMS est seulement inscrit au journal).
// =====================================================================
const webpush = require('web-push');
const db = require('./db.cjs');

// ---------------------------------------------------------------------
// Clés VAPID : générées une seule fois, gardées en base (jamais envoyées
// au navigateur, sauf la clé publique).
// ---------------------------------------------------------------------
let vapid = null;
async function clesVapid() {
  if (vapid) return vapid;
  const [rows] = await db.query("SELECT cle, valeur FROM app_config WHERE cle IN ('vapid_public', 'vapid_prive')");
  const cfg = Object.fromEntries(rows.map((r) => [r.cle, r.valeur]));
  if (!cfg.vapid_public || !cfg.vapid_prive) {
    const k = webpush.generateVAPIDKeys();
    await db.query('INSERT IGNORE INTO app_config (cle, valeur) VALUES (?, ?), (?, ?)', ['vapid_public', k.publicKey, 'vapid_prive', k.privateKey]);
    const [relu] = await db.query("SELECT cle, valeur FROM app_config WHERE cle IN ('vapid_public', 'vapid_prive')");
    Object.assign(cfg, Object.fromEntries(relu.map((r) => [r.cle, r.valeur])));
  }
  vapid = { publicKey: cfg.vapid_public, privateKey: cfg.vapid_prive };
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contact@echoeducation.bj', vapid.publicKey, vapid.privateKey);
  return vapid;
}

async function envoyerPush(utilisateurType, utilisateurId, contenu) {
  await clesVapid();
  const [abos] = await db.query('SELECT id, endpoint, p256dh, auth FROM push_abonnement WHERE utilisateur_type = ? AND utilisateur_id = ?', [utilisateurType, utilisateurId]);
  let envoyes = 0;
  for (const a of abos) {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(contenu), { TTL: 24 * 3600 });
      envoyes += 1;
    } catch (e) {
      // Abonnement expiré ou retiré par le téléphone : on l'oublie.
      if (e.statusCode === 404 || e.statusCode === 410) await db.query('DELETE FROM push_abonnement WHERE id = ?', [a.id]);
      else console.warn('Push non envoyée :', e.statusCode || e.message);
    }
  }
  return envoyes;
}

// ---------------------------------------------------------------------
// SMS
// ---------------------------------------------------------------------
// Sans accents : un SMS accentué tombe à 70 caractères (2 ou 3 SMS payés).
const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/[«»]/g, '"').replace(/[–—]/g, '-');

// Numéro béninois au format international (+229 01 XX XX XX XX).
function numeroInternational(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('229') && d.length === 13) return `+${d}`;
  if (d.length === 10 && d.startsWith('01')) return `+229${d}`;
  if (d.length === 8) return `+22901${d}`; // ancien format à 8 chiffres
  if (d.length >= 11 && d.length <= 15) return `+${d}`;
  return null;
}

function fournisseurSms() {
  const f = String(process.env.SMS_FOURNISSEUR || '').toLowerCase();
  if (f === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) return 'twilio';
  if (f === 'http' && process.env.SMS_HTTP_URL) return 'http';
  return 'simulation';
}

async function transmettreSms(numero, texte) {
  const f = fournisseurSms();
  if (f === 'twilio') {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const corps = new URLSearchParams({ To: numero, From: process.env.TWILIO_FROM, Body: texte });
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corps,
    });
    const t = await r.text();
    return { ok: r.ok, fournisseur: f, reponse: t.slice(0, 480) };
  }
  if (f === 'http') {
    const r = await fetch(process.env.SMS_HTTP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(process.env.SMS_HTTP_TOKEN ? { Authorization: `Bearer ${process.env.SMS_HTTP_TOKEN}` } : {}) },
      body: JSON.stringify({ to: numero, from: process.env.SMS_EXPEDITEUR || 'ECHOEDUC', message: texte }),
    });
    const t = await r.text();
    return { ok: r.ok, fournisseur: f, reponse: t.slice(0, 480) };
  }
  return { ok: true, fournisseur: 'simulation', reponse: null, simule: true };
}

async function parametresSms(etablissementId) {
  const [[p]] = await db.query('SELECT * FROM alertes_parametres WHERE etablissement_id = ?', [etablissementId]);
  return p || { etablissement_id: etablissementId, sms_actif: 0, sms_absences: 1, sms_permissions: 1, sms_bulletins: 1, quota_mensuel: 1000 };
}

const TYPE_SMS = { absence: 'sms_absences', permission: 'sms_permissions', bulletin: 'sms_bulletins' };

// SMS d'une alerte urgente, si l'école l'a activé pour ce type, que le
// parent ne l'a pas coupé et que le quota du mois n'est pas atteint.
async function envoyerSmsAlerte(alerte, { forcer = false } = {}) {
  const p = await parametresSms(alerte.etablissement_id);
  if (!forcer && (!p.sms_actif || !TYPE_SMS[alerte.type] || !p[TYPE_SMS[alerte.type]])) return null;
  // SMS d'essai vers un numéro saisi par l'administration : pas de parent.
  const [[trouve]] = alerte.numeroForce ? [[null]] : await db.query('SELECT id, contact, alertes_sms, etablissement_id FROM parents WHERE id = ?', [alerte.parent_id]);
  const parent = alerte.numeroForce ? { id: null, contact: alerte.numeroForce, alertes_sms: 1 } : trouve;
  if (!parent || (!forcer && !parent.alertes_sms)) return null;
  const numero = numeroInternational(parent.contact);
  const texte = sansAccents(alerte.texteSms || `${alerte.titre}. ${alerte.texte}`).slice(0, 300);
  if (!numero) {
    await db.query('INSERT INTO sms_envoi (etablissement_id, parent_id, telephone, texte, type, statut, fournisseur, reponse) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [alerte.etablissement_id, parent.id, String(parent.contact || '—'), texte, alerte.type, 'echec', null, 'Numéro absent ou invalide']);
    return { statut: 'echec' };
  }
  const [[{ n }]] = await db.query(
    "SELECT COUNT(*) AS n FROM sms_envoi WHERE etablissement_id = ? AND statut IN ('envoye', 'simule') AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')",
    [alerte.etablissement_id]
  );
  if (!forcer && Number(n) >= Number(p.quota_mensuel)) {
    await db.query('INSERT INTO sms_envoi (etablissement_id, parent_id, telephone, texte, type, statut, reponse) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [alerte.etablissement_id, parent.id, numero, texte, alerte.type, 'quota', 'Quota mensuel atteint']);
    return { statut: 'quota' };
  }
  let r;
  try {
    r = await transmettreSms(numero, texte);
  } catch (e) {
    r = { ok: false, fournisseur: fournisseurSms(), reponse: String(e.message).slice(0, 480) };
  }
  const statut = r.simule ? 'simule' : (r.ok ? 'envoye' : 'echec');
  await db.query('INSERT INTO sms_envoi (etablissement_id, parent_id, telephone, texte, type, statut, fournisseur, reponse) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [alerte.etablissement_id, parent.id, numero, texte, alerte.type, statut, r.fournisseur, r.reponse]);
  return { statut, reponse: r.reponse, numero };
}

// ---------------------------------------------------------------------
// Alertes
// ---------------------------------------------------------------------
const aDiffuser = new Set();
let minuterie = null;

// Enregistre une alerte (dans la transaction de l'appelant si `conn` en
// est une). Renvoie true si elle est nouvelle. Si elle existe déjà (même
// clé), son texte est mis à jour sans nouvelle diffusion.
async function enregistrer(conn, a) {
  if (!a.parentId) return false;
  const [r] = await conn.query(
    `INSERT INTO alerte_parent (parent_id, eleve_id, etablissement_id, type, cle, titre, texte, lien, details, urgent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE titre = VALUES(titre), texte = VALUES(texte), lien = VALUES(lien), details = VALUES(details)`,
    [a.parentId, a.eleveId || null, a.etablissementId, a.type, a.cle, String(a.titre).slice(0, 160), String(a.texte).slice(0, 500), a.lien || null,
      a.details ? JSON.stringify(a.details) : null, a.urgent ? 1 : 0]
  );
  const nouvelle = r.affectedRows === 1;
  if (nouvelle) {
    aDiffuser.add(`${a.parentId}|${a.cle}|${a.texteSms ? Buffer.from(a.texteSms).toString('base64') : ''}`);
    if (!minuterie) minuterie = setTimeout(diffuser, 1500);
  }
  return nouvelle;
}

async function diffuser() {
  minuterie = null;
  const lot = [...aDiffuser];
  aDiffuser.clear();
  for (const item of lot) {
    const [parentId, cle, sms64] = item.split('|');
    try {
      const [[a]] = await db.query('SELECT * FROM alerte_parent WHERE parent_id = ? AND cle = ?', [parentId, cle]);
      if (!a) continue; // transaction annulée
      await envoyerPush('parent', a.parent_id, { titre: a.titre, texte: a.texte, lien: a.lien || '/parents/dashbord/notifications', tag: a.cle });
      if (a.urgent) await envoyerSmsAlerte({ ...a, texteSms: sms64 ? Buffer.from(sms64, 'base64').toString() : null });
    } catch (e) {
      console.error('Diffusion d’alerte :', e.message);
    }
  }
}

// Notification push seule (notes, emploi du temps : déjà dans la messagerie).
function pousserPlusTard(parentId, contenu) {
  setTimeout(() => { envoyerPush('parent', parentId, contenu).catch((e) => console.warn('Push :', e.message)); }, 1500);
}

module.exports = {
  clesVapid, envoyerPush, enregistrer, pousserPlusTard, envoyerSmsAlerte, parametresSms, fournisseurSms, numeroInternational, sansAccents,
};
