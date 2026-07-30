<template>
  <div class="auth-page">
    <!-- Panneau de marque (gauche en desktop, haut en mobile) -->
    <aside class="brand-panel">
      <div class="brand-panel__overlay"></div>
      <div class="brand-panel__content">
        <div class="brand-mark">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 9.5 12 4l9 5.5v9A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5v-9Z"
                  stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M9 20v-6h6v6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
          </svg>
          <span>Espace Administration</span>
        </div>

        <div class="brand-panel__headline">
          <h1>Bienvenue sur votre portail de gestion</h1>
          <p>
            Connectez-vous pour accéder au tableau de bord de votre établissement
            et piloter vos activités en toute sécurité.
          </p>
        </div>

        <ul class="brand-panel__points">
          <li><span class="dot"></span> Accès sécurisé et personnalisé</li>
          <li><span class="dot"></span> Tableau de bord centralisé</li>
          <li><span class="dot"></span> Suivi en temps réel</li>
        </ul>
      </div>
    </aside>

    <!-- Panneau formulaire -->
    <main class="form-panel">
      <form class="auth-form" @submit.prevent="submitForm" novalidate>
        <header class="auth-form__header">
          <h2>Connexion</h2>
          <p>Renseignez vos identifiants pour continuer.</p>
        </header>

        <!-- Message d'erreur -->
        <div
          v-if="errorMessage"
          class="alert alert--error"
          role="alert"
          aria-live="assertive"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>
            <path d="M12 7.5v5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="12" cy="16.3" r="1" fill="currentColor"/>
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Nom d'utilisateur -->
        <div class="field">
          <label for="nom_utilisateur" class="field__label">Nom d'utilisateur</label>
          <div class="field__control">
            <svg class="field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.6"/>
              <path d="M5 19a7 7 0 0 1 14 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            <input
              id="nom_utilisateur"
              v-model="nom_utilisateur"
              type="text"
              autocomplete="username"
              placeholder="Entrez votre nom d'utilisateur"
              required
              class="field__input"
            />
          </div>
        </div>

        <!-- Mot de passe -->
        <div class="field">
          <label for="mot_de_passe" class="field__label">Mot de passe</label>
          <div class="field__control">
            <svg class="field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="10.5" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" stroke-width="1.6"/>
            </svg>
            <input
              id="mot_de_passe"
              v-model="mot_de_passe"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Entrez votre mot de passe"
              required
              class="field__input"
            />
            <button
              type="button"
              class="field__toggle"
              :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              @click="showPassword = !showPassword"
            >
              <svg v-if="showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 3l18 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <path d="M10.6 6.2A9 9 0 0 1 12 6c5 0 9 4.5 9 6a11 11 0 0 1-2.3 3M6.2 6.6C3.9 8 2 10.6 2 12c0 1.5 4 6 9 6a9 9 0 0 0 3.3-.6"
                      stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <path d="M9.6 9.6a3.4 3.4 0 0 0 4.8 4.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z" stroke="currentColor" stroke-width="1.6"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/>
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn--primary" :disabled="loading">
          <span v-if="loading" class="spinner" aria-hidden="true"></span>
          <span>{{ loading ? 'Connexion en cours…' : 'Se connecter' }}</span>
        </button>

        <button type="button" class="btn btn--ghost" @click="goBack">
          Retour à l'accueil
        </button>
      </form>
    </main>

    <!-- Dialog de succès -->
    <v-dialog v-model="dialog" max-width="440" persistent>
      <v-card class="success-card">
        <div class="success-card__icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.6"/>
            <path d="m8 12.5 2.5 2.5L16 9.5" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <v-card-title class="success-card__title">Connexion réussie</v-card-title>
        <v-card-text class="success-card__text">
          Vous allez être redirigé vers votre tableau de bord.
        </v-card-text>
        <v-card-actions class="success-card__actions">
          <v-btn variant="text" @click="closeDialog">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ConnexionEtablissement',
  data() {
    return {
      nom_utilisateur: '',
      mot_de_passe: '',
      dialog: false,
      loading: false,
      showPassword: false,
      errorMessage: '',
    };
  },
  methods: {
    clearSessionStorage() {
      [
        'token',
        'etablissement_nom',
        'etablissement_id',
        'user_type',
        'administration_id',
        'administration_nom',
        'poste',
        'modules_autorises',
      ].forEach((key) => localStorage.removeItem(key));
    },

    goToDashboard(etablissementId, etablissementNom) {
      this.dialog = true;
      setTimeout(() => {
        this.$router.push({
          path: '/administration/dashbord',
          query: {
            etablissement_id: etablissementId,
            etablissement_nom: etablissementNom,
          },
        });
      }, 2000);
    },

    async submitForm() {
      this.errorMessage = '';
      this.loading = true;

      const identifiant = this.nom_utilisateur;
      const motDePasse = this.mot_de_passe;

      try {
        // 1) Tentative en tant que fondateur/directeur (compte établissement)
        const response = await axios.post('/api/loginEtablissement', {
          nom_utilisateur: identifiant,
          mot_de_passe: motDePasse,
        });
        const { token, etablissement } = response.data;

        this.clearSessionStorage();
        localStorage.setItem('token', token);
        localStorage.setItem('etablissement_nom', etablissement.nom);
        localStorage.setItem('etablissement_id', etablissement.id);
        localStorage.setItem('user_type', 'etablissement');

        this.goToDashboard(etablissement.id, etablissement.nom);
      } catch (etablissementError) {
        // 2) Repli : tentative en tant que collaborateur (comptable, secrétaire, etc.)
        try {
          const response = await axios.post('/api/loginAdministration', {
            email: identifiant,
            mot_de_passe: motDePasse,
          });
          const { token, administration } = response.data;

          this.clearSessionStorage();
          localStorage.setItem('token', token);
          localStorage.setItem('etablissement_id', administration.etablissement_id);
          localStorage.setItem('etablissement_nom', administration.etablissement_nom || '');
          localStorage.setItem('user_type', 'administration');
          localStorage.setItem('administration_id', administration.id);
          localStorage.setItem('administration_nom', `${administration.prenom} ${administration.nom}`);
          localStorage.setItem('poste', administration.poste);
          localStorage.setItem('modules_autorises', JSON.stringify(administration.modules_autorises || []));

          this.goToDashboard(administration.etablissement_id, administration.etablissement_nom || '');
        } catch (administrationError) {
          const apiMessage =
            administrationError.response && administrationError.response.data && administrationError.response.data.message
              ? administrationError.response.data.message
              : null;
          this.errorMessage =
            apiMessage ||
            'Identifiants incorrects ou service indisponible. Veuillez réessayer.';
          console.error(
            'Erreur lors de la connexion :',
            administrationError.response ? administrationError.response.data : administrationError.message
          );
        }
      } finally {
        this.loading = false;
      }
    },
    closeDialog() {
      this.dialog = false;
    },
    goBack() {
      this.$router.push('/administration/Accueil');
    },
  },
};
</script>

<style scoped>
.auth-page {
  /* Palette */
  --navy-900: #0c1f38;
  --navy-800: #122a4d;
  --navy-700: #1b3a66;
  --accent: #2e7cf6;
  --accent-dark: #1e63d0;
  --surface: #ffffff;
  --bg: #eef2f7;
  --text: #16223a;
  --muted: #5d6b82;
  --border: #d8e0ec;
  --danger: #d64545;
  --danger-bg: #fdecec;

  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  background-color: var(--bg);
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: var(--text);
}

/* ---------- Panneau de marque ---------- */
.brand-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-image: url('@/assets/administration/depositphotos_91369982-stock-photo-notebook-stack-with-apple-and.webp');
  background-size: cover;
  background-position: center;
  color: #fff;
}

.brand-panel__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    140deg,
    rgba(12, 31, 56, 0.92) 0%,
    rgba(27, 58, 102, 0.88) 100%
  );
}

.brand-panel__content {
  position: relative;
  z-index: 1;
  max-width: 460px;
  padding: 56px 48px;
  width: 100%;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 48px;
}

.brand-panel__headline h1 {
  font-size: 32px;
  line-height: 1.2;
  font-weight: 700;
  margin: 0 0 16px;
}

.brand-panel__headline p {
  font-size: 16px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.78);
  margin: 0 0 40px;
}

.brand-panel__points {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.brand-panel__points li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
}

.brand-panel__points .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px rgba(46, 124, 246, 0.25);
  flex-shrink: 0;
}

/* ---------- Panneau formulaire ---------- */
.form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}

.auth-form {
  width: 100%;
  max-width: 400px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 12px 32px rgba(16, 34, 58, 0.08);
}

.auth-form__header {
  margin-bottom: 28px;
}

.auth-form__header h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 6px;
}

.auth-form__header p {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
}

/* Alerte */
.alert {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  line-height: 1.4;
  border-radius: 8px;
  padding: 11px 14px;
  margin-bottom: 20px;
}

.alert--error {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid rgba(214, 69, 69, 0.25);
}

.alert svg {
  flex-shrink: 0;
}

/* Champs */
.field {
  margin-bottom: 18px;
}

.field__label {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 7px;
}

.field__control {
  position: relative;
  display: flex;
  align-items: center;
}

.field__icon {
  position: absolute;
  left: 13px;
  color: var(--muted);
  pointer-events: none;
}

.field__input {
  width: 100%;
  padding: 12px 14px 12px 42px;
  font-size: 15px;
  color: var(--text);
  background: #fbfcfe;
  border: 1px solid var(--border);
  border-radius: 9px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.field__input::placeholder {
  color: #a3adbf;
}

.field__input:focus {
  outline: none;
  background: #fff;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(46, 124, 246, 0.15);
}

.field__toggle {
  position: absolute;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.2s ease, background 0.2s ease;
}

.field__toggle:hover {
  color: var(--accent);
  background: rgba(46, 124, 246, 0.08);
}

.field__toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Boutons */
.btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  padding: 13px;
  border-radius: 9px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease,
    transform 0.05s ease;
}

.btn:active {
  transform: translateY(1px);
}

.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.btn--primary {
  margin-top: 6px;
  background: var(--accent);
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background: var(--accent-dark);
}

.btn--primary:disabled {
  background: #9cc0f7;
  cursor: not-allowed;
}

.btn--ghost {
  margin-top: 10px;
  background: transparent;
  color: var(--muted);
  border-color: var(--border);
}

.btn--ghost:hover {
  background: #f4f6fa;
  color: var(--text);
}

/* Spinner */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dialog de succès */
.success-card {
  border-radius: 16px !important;
  padding: 28px 24px 16px;
  text-align: center;
}

.success-card__icon {
  display: flex;
  justify-content: center;
  color: #1f9d63;
  margin-bottom: 8px;
}

.success-card__title {
  justify-content: center;
  font-size: 19px !important;
  font-weight: 700 !important;
}

.success-card__text {
  color: var(--muted);
  font-size: 14.5px;
}

.success-card__actions {
  justify-content: center;
}

/* ---------- Responsive ---------- */
@media (max-width: 900px) {
  .auth-page {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    min-height: 230px;
  }

  .brand-panel__content {
    padding: 36px 28px;
  }

  .brand-mark {
    margin-bottom: 24px;
  }

  .brand-panel__headline h1 {
    font-size: 26px;
  }

  .brand-panel__points {
    display: none;
  }
}

@media (max-width: 480px) {
  .form-panel {
    padding: 28px 18px;
  }

  .auth-form {
    padding: 28px 22px;
    box-shadow: none;
    border: none;
  }
}

/* Mouvement réduit */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }

  .btn,
  .field__input,
  .field__toggle {
    transition: none;
  }
}
</style>