require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
// Railway (et la plupart des hébergeurs) imposent leur propre port via
// process.env.PORT ; en local (LAMPP) on retombe sur 8080 comme avant.
const port = process.env.PORT || 8080;

const db = require('./server-lib/db.cjs');
const { accessGuard, registerRouter } = require('./server-lib/access-guard.cjs');

// Middleware CORS — CORS_ORIGIN peut contenir plusieurs origines séparées
// par des virgules (ex: l'URL Netlify de prod + localhost pour le dev).
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());
// Rendre le dossier des photos public
app.use('/uploads/photos', express.static(path.join(__dirname, 'uploads/photos')));
// Rendre le dossier des preuves de paiement public (captures Mobile Money, reçus...)
app.use('/uploads/preuves_paiement', express.static(path.join(__dirname, 'uploads/preuves_paiement')));

// ✅ secret unique, pris depuis .env
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET manquant dans .env");
  process.exit(1);
}

// Ajout de la connexion à la base de données dans `req` pour l'utiliser dans les API
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Garde d'accès central : rôle du compte et appartenance à l'établissement
// de chaque élément cité (voir server-lib/access-guard.cjs).
app.use('/api', accessGuard);

// Limite d'essais sur la connexion et la réinitialisation de mot de passe.
const { authRateLimit } = require('./server-lib/rate-limit.cjs');
app.post([
  '/api/loginEtablissement', '/api/loginAdministration', '/api/loginEns', '/api/parent/login',
  '/api/send-reset-code', '/api/verify-reset-code', '/api/send', '/api/parent-verify-reset-code',
  '/api/parents/check-email', '/api/parents/verify-code', '/api/parents/set-password',
], authRateLimit);

// Monte un router et l'enregistre auprès du garde (lecture des paramètres
// d'URL).
const mount = (prefix, router) => {
  registerRouter(prefix, router);
  app.use(prefix, router);
};

// =====================================================================
//  Montage des routers — un fichier par domaine métier (voir dossier /routes).
//  Les chemins d'API exposés aux vues Vue/Nuxt ne changent pas : seule
//  l'organisation du code côté serveur est réorganisée.
// =====================================================================
mount('/api/scolarite', require('./routes/scolarite.routes.cjs'));
mount('/api/dashboard', require('./routes/dashboard.routes.cjs'));
mount('/api/parent/assistant', require('./routes/assistant.routes.cjs'));

mount('/api', require('./routes/etablissement.routes.cjs'));
mount('/api', require('./routes/cloture.routes.cjs'));
mount('/api', require('./routes/orientation.routes.cjs'));
mount('/api', require('./routes/alertes.routes.cjs'));
mount('/api', require('./routes/notifications.routes.cjs'));
mount('/api', require('./routes/eleves.routes.cjs'));
mount('/api', require('./routes/classes.routes.cjs'));
mount('/api', require('./routes/cartes-scolaires.routes.cjs'));
mount('/api', require('./routes/conduite.routes.cjs'));
mount('/api', require('./routes/permissions.routes.cjs'));
mount('/api', require('./routes/parents.routes.cjs'));
mount('/api', require('./routes/inscription.routes.cjs'));
mount('/api', require('./routes/enseignants.routes.cjs'));
mount('/api', require('./routes/matieres.routes.cjs'));
mount('/api', require('./routes/auth.routes.cjs'));
mount('/api', require('./routes/export.routes.cjs'));
mount('/api', require('./routes/presence.routes.cjs'));
// IMPORTANT : monté AVANT notes.routes.cjs. La route générique
// GET /notes/:classeId/:subjectId/:semesterId/:anneeScolaireId de
// notes.routes.cjs a la même forme à 4 segments dynamiques que
// GET /notes/modification-requests/count/:etablissementId/:anneeScolaireId ;
// si elle était montée en premier, Express l'interceptait avant même
// d'atteindre cette route (testé en local : la route générique renvoyait
// "Aucune donnée trouvée..." au lieu du compteur).
mount('/api', require('./routes/note-modification-requests.routes.cjs'));
mount('/api', require('./routes/notes.routes.cjs'));
mount('/api', require('./routes/parent-dashboard.routes.cjs'));
mount('/api', require('./routes/programme.routes.cjs'));
mount('/api', require('./routes/programme-matiere.routes.cjs'));
mount('/api', require('./routes/devoirs.routes.cjs'));
mount('/api', require('./routes/bulletin.routes.cjs'));
mount('/api', require('./routes/administration.routes.cjs'));
mount('/api', require('./routes/educmaster.routes.cjs'));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
