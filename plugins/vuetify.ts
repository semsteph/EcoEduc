// Importez les styles de Vuetify et les icônes
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css'; // Importez les icônes Material Design

import { createVuetify } from 'vuetify';

// =====================================================================
// Thème EchoEducation — charte bleu / blanc d'origine.
// =====================================================================

const echoEducationTheme = {
  dark: false,
  colors: {
    primary: '#1976D2',
    'primary-darken-1': '#0B2E4A',
    secondary: '#0B2E4A',
    'secondary-darken-1': '#082032',
    accent: '#1976D2',
    success: '#2E7D32',
    warning: '#ED6C02',
    error: '#DC2626',
    info: '#1976D2',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-background': '#0B2E4A',
    'on-surface': '#0B2E4A',
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
