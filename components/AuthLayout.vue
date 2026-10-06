<template>
  <div class="auth-page">

    <!-- Panneau de marque : à gauche sur ordinateur, bandeau compact en haut
         sur téléphone. -->
    <aside class="brand-panel">
      <div class="brand-panel__overlay" aria-hidden="true"></div>

      <div class="brand-panel__content">
        <div class="brand-mark">
          <img :src="logoSrc" alt="" class="brand-mark__logo" />
          <div class="brand-mark__text">
            <span class="brand-mark__name">EchoEducation</span>
            <span class="brand-mark__space">{{ space.label }}</span>
          </div>
        </div>

        <h1 class="brand-panel__headline">{{ space.headline }}</h1>
        <p class="brand-panel__intro">{{ space.intro }}</p>

        <ul class="brand-panel__points">
          <li v-for="point in space.points" :key="point.text">
            <span class="point-icon">
              <v-icon size="18">{{ point.icon }}</v-icon>
            </span>
            {{ point.text }}
          </li>
        </ul>
      </div>
    </aside>

    <!-- Panneau du formulaire -->
    <main class="form-panel">
      <div class="form-card">
        <!-- Fil d'Ariane et flèche de retour (haut), comme dans les tableaux de bord -->
        <PageNav :crumbs="crumbs" position="top" :before-back="beforeBack" />

        <header class="form-card__header">
          <span class="space-chip">
            <v-icon size="16">{{ space.icon }}</v-icon>
            {{ space.label }}
          </span>
          <h2 class="form-card__title">{{ title }}</h2>
          <p v-if="subtitle" class="form-card__subtitle">{{ subtitle }}</p>
        </header>

        <slot />

        <footer v-if="$slots.footer" class="form-card__footer">
          <slot name="footer" />
        </footer>

        <PageNav :crumbs="crumbs" position="bottom" :before-back="beforeBack" />
      </div>

      <p class="form-panel__copyright">
        © {{ new Date().getFullYear() }} EchoEducation · Connexion sécurisée
        <v-icon size="14">mdi-shield-check-outline</v-icon>
      </p>
    </main>
  </div>
</template>

<script>
// Mise en page commune à toutes les pages d'accès (connexion des parents,
// des enseignants, de l'administration, activation du compte parent) : même
// panneau de marque, même carte de formulaire, mêmes champs et boutons.
// Chaque page ne fournit que son formulaire (slot par défaut) et ses liens
// (slot « footer »).
//
// Classes à utiliser dans le formulaire (stylées ici) :
//   .auth-field   champ Vuetify (espacement régulier)
//   .auth-submit  bouton principal
//   .auth-link    lien texte (mot de passe oublié, activer...)
//   .auth-alert   message d'erreur / de succès

import logoSrc from '@/assets/administration/logo-icon.png';
import PageNav from '@/components/PageNav.vue';

const SPACES = {
  parents: {
    label: 'Espace parents',
    home: '/parents/Acceuil',
    icon: 'mdi-account-child-outline',
    headline: 'Suivez la scolarité de vos enfants',
    intro: 'Notes, présences, conduite et échanges avec l’établissement, au même endroit.',
    points: [
      { icon: 'mdi-chart-line', text: 'Notes et bulletins en temps réel' },
      { icon: 'mdi-calendar-check-outline', text: 'Présences et conduite' },
      { icon: 'mdi-robot-happy-outline', text: 'Assistant pour aider aux devoirs' },
    ],
  },
  enseignants: {
    label: 'Espace enseignants',
    icon: 'mdi-human-male-board',
    headline: 'Gérez vos classes simplement',
    intro: 'Cahier de texte, notes, présences et conduite de vos élèves.',
    points: [
      { icon: 'mdi-book-open-page-variant-outline', text: 'Cahier de texte et devoirs' },
      { icon: 'mdi-clipboard-check-outline', text: 'Notes, présences et conduite' },
      { icon: 'mdi-bell-outline', text: 'Notifications de l’administration' },
    ],
  },
  administration: {
    label: 'Espace administration',
    home: '/administration/Accueil',
    icon: 'mdi-domain',
    headline: 'Pilotez votre établissement',
    intro: 'Élèves, enseignants, classes, notes et scolarité dans un tableau de bord unique.',
    points: [
      { icon: 'mdi-view-dashboard-outline', text: 'Tableau de bord centralisé' },
      { icon: 'mdi-account-group-outline', text: 'Gestion des élèves et des enseignants' },
      { icon: 'mdi-lock-check-outline', text: 'Accès sécurisé par rôle' },
    ],
  },
};

export default {
  name: 'AuthLayout',

  components: { PageNav },

  props: {
    role: {
      type: String,
      required: true,
      validator: (value) => Object.keys(SPACES).includes(value),
    },
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      default: '',
    },
    // Étape interne de la page (mot de passe oublié, étapes d'activation) :
    // la flèche y revient d'abord ; renvoie true si elle a traité le retour.
    beforeBack: {
      type: Function,
      default: null,
    },
  },

  data() {
    return { logoSrc };
  },

  computed: {
    space() {
      return SPACES[this.role];
    },
    // Accueil › Espace parents › Connexion
    crumbs() {
      return [
        { label: 'Accueil', to: '/Accueil/Accueil' },
        ...(this.space.home ? [{ label: this.space.label, to: this.space.home }] : []),
        { label: this.title, to: this.$route.path },
      ];
    },
  },
};
</script>

<style scoped>
.auth-page {
  --navy-900: #0c1f38;
  --navy-700: #1b3a66;
  --primary: #1976d2;
  --primary-dark: #0b2e4a;
  --text: #16223a;
  --muted: #5d6b82;
  --border: #d8e0ec;
  --bg: #eef3f9;

  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  background: var(--bg);
  color: var(--text);
}

/* ---------- Panneau de marque ---------- */
.brand-panel {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
  background-image: url('@/assets/administration/depositphotos_91369982-stock-photo-notebook-stack-with-apple-and.webp');
  background-size: cover;
  background-position: center;
  color: #fff;
}

.brand-panel__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, rgba(12, 31, 56, 0.94) 0%, rgba(25, 84, 150, 0.86) 100%);
}

.brand-panel__content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 56px 48px;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}

.brand-mark__logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  padding: 6px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.95);
}

.brand-mark__text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-mark__name {
  font-size: 18px;
  font-weight: 800;
}

.brand-mark__space {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.8;
}

.brand-panel__headline {
  margin: 0 0 12px;
  font-size: clamp(26px, 3vw, 34px);
  font-weight: 800;
  line-height: 1.2;
}

.brand-panel__intro {
  margin: 0 0 32px;
  font-size: 16px;
  line-height: 1.55;
  opacity: 0.88;
}

.brand-panel__points {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}

.brand-panel__points li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  font-weight: 600;
}

.point-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* ---------- Panneau du formulaire ---------- */
.form-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 48px 24px;
}

.form-card {
  width: 100%;
  max-width: 400px;
  padding: 24px 22px 18px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid var(--border);
  box-shadow: 0 1px 3px rgba(12, 31, 56, 0.06);
}

.form-card__header {
  margin-bottom: 16px;
}

.space-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(25, 118, 210, 0.1);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.form-card__title {
  margin: 10px 0 4px;
  font-size: 21px;
  font-weight: 800;
  color: var(--navy-900);
}

.form-card__subtitle {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--muted);
}

.form-card__footer {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px 10px;
}

.form-panel__copyright {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--muted);
}

/* ---------- Éléments du formulaire (fournis par les pages) ---------- */
.form-card :deep(.auth-field) {
  margin-bottom: 10px;
}

.form-card :deep(.auth-submit) {
  width: 100%;
  margin-top: 2px;
}

.form-card :deep(.auth-secondary) {
  width: 100%;
  margin-top: 8px;
}

.form-card :deep(.auth-link) {
  padding: 4px 2px;
  border: none;
  background: none;
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}

.form-card :deep(.auth-link:hover) {
  text-decoration: underline;
}

.form-card :deep(.auth-alert) {
  margin: 0 0 16px;
}

.form-card :deep(.auth-steps) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.form-card :deep(.auth-step) {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #9aa7b8;
  white-space: nowrap;
}

.form-card :deep(.auth-step::before) {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #cfd8e3;
}

.form-card :deep(.auth-step.is-active) {
  color: var(--primary);
}

.form-card :deep(.auth-step.is-active::before) {
  background: var(--primary);
}

.form-card :deep(.auth-step-line) {
  flex: 1;
  height: 2px;
  border-radius: 2px;
  background: var(--border);
}

/* ---------- Tablette et téléphone ---------- */
@media (max-width: 900px) {
  .auth-page {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 1fr;
  }

  .brand-panel__content {
    padding: 22px 24px 22px;
  }

  .brand-mark {
    margin-bottom: 18px;
  }

  .brand-panel__headline {
    font-size: 24px;
  }

  .brand-panel__intro {
    margin-bottom: 0;
    font-size: 15px;
  }

  .brand-panel__points {
    display: none;
  }

  .form-panel {
    justify-content: flex-start;
    padding: 16px 16px 28px;
  }

  /* Le bandeau du haut indique déjà l'espace. */
  .space-chip {
    display: none;
  }

  .form-card__title {
    margin-top: 0;
  }

  /* Téléphone : pas de grand conteneur, le formulaire est posé sur la page. */
  .form-card {
    max-width: none;
    padding: 4px 0 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
}

@media (max-width: 480px) {
  .form-card__title {
    font-size: 19px;
  }

  .brand-panel__content {
    padding: 16px 16px 14px;
  }

  .brand-mark {
    margin-bottom: 12px;
  }

  .brand-panel__headline {
    font-size: 19px;
    margin-bottom: 6px;
  }

  .brand-panel__intro {
    font-size: 13.5px;
  }
}
</style>
