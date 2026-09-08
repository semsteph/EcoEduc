// Importez les styles de Vuetify et les icônes
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css'; // Importez les icônes Material Design

import { createVuetify } from 'vuetify';

// =====================================================================
// Thème EchoEducation.
//
// Palette "education" (teal principal + ambre accent + vert réussite),
// choisie via le skill de design ui-ux-pro-max pour rester cohérente
// avec le thème déjà utilisé dans l'assistant IA (ChatWithAssistant.vue).
// =====================================================================

const echoEducationTheme = {
  dark: false,
  colors: {
    primary: '#0D9488',
    'primary-darken-1': '#0B7A70',
    secondary: '#D97706',
    'secondary-darken-1': '#B45F04',
    accent: '#7C3AED',
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0EA5E9',
    background: '#F7F7F5',
    surface: '#FFFFFF',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-background': '#0F172A',
    'on-surface': '#0F172A',
  },
};

export default defineNuxtPlugin((app) => {
  const vuetify = createVuetify({
    icons: {
      defaultSet: 'mdi', // Définit 'mdi' comme ensemble d'icônes par défaut
    },

    theme: {
      defaultTheme: 'echoEducationTheme',
      themes: {
        echoEducationTheme,
      },
    },

    // Styles par défaut appliqués à tous les composants du même type,
    // pour une apparence cohérente (coins arrondis, ombres douces)
    // sans avoir à répéter les mêmes props partout.
    defaults: {
      VCard: {
        rounded: 'lg',
        elevation: 1,
      },
      VBtn: {
        rounded: 'lg',
        style: 'text-transform: none; letter-spacing: normal; font-weight: 600;',
      },
      VTextField: {
        rounded: 'lg',
        variant: 'outlined',
        density: 'comfortable',
      },
      VTextarea: {
        rounded: 'lg',
        variant: 'outlined',
        density: 'comfortable',
      },
      VSelect: {
        rounded: 'lg',
        variant: 'outlined',
        density: 'comfortable',
      },
      VChip: {
        rounded: 'lg',
      },
      VAlert: {
        rounded: 'lg',
      },
      VNavigationDrawer: {
        elevation: 0,
      },
      VAppBar: {
        elevation: 0,
      },
    },
  });

  app.vueApp.use(vuetify);
});
