require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 8080;

const db = require('./server-lib/db.cjs');

// Middleware CORS
const corsOptions = {
  origin: 'http://localhost:3000',
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

// =====================================================================
//  Montage des routers — un fichier par domaine métier (voir dossier /routes).
//  Les chemins d'API exposés aux vues Vue/Nuxt ne changent pas : seule
//  l'organisation du code côté serveur est réorganisée.
// =====================================================================
app.use('/api/scolarite', require('./routes/scolarite.routes.cjs'));
app.use('/api/dashboard', require('./routes/dashboard.routes.cjs'));
app.use('/api/parent/assistant', require('./routes/assistant.routes.cjs'));

app.use('/api', require('./routes/etablissement.routes.cjs'));
app.use('/api', require('./routes/cloture.routes.cjs'));
app.use('/api', require('./routes/notifications.routes.cjs'));
app.use('/api', require('./routes/eleves.routes.cjs'));
app.use('/api', require('./routes/classes.routes.cjs'));
app.use('/api', require('./routes/cartes-scolaires.routes.cjs'));
app.use('/api', require('./routes/conduite.routes.cjs'));
app.use('/api', require('./routes/permissions.routes.cjs'));
app.use('/api', require('./routes/parents.routes.cjs'));
app.use('/api', require('./routes/inscription.routes.cjs'));
app.use('/api', require('./routes/enseignants.routes.cjs'));
app.use('/api', require('./routes/matieres.routes.cjs'));
app.use('/api', require('./routes/auth.routes.cjs'));
app.use('/api', require('./routes/export.routes.cjs'));
app.use('/api', require('./routes/presence.routes.cjs'));
app.use('/api', require('./routes/notes.routes.cjs'));
app.use('/api', require('./routes/parent-dashboard.routes.cjs'));
app.use('/api', require('./routes/programme.routes.cjs'));
app.use('/api', require('./routes/bulletin.routes.cjs'));
app.use('/api', require('./routes/administration.routes.cjs'));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
