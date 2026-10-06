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
      // Interface fine (voir assets/css/interface-fine.css) : densité
      // compacte et aucune ombre épaisse par défaut.
      VCard: {
        rounded: 'lg',
        elevation: 0,
      },
      VBtn: {
        rounded: 'lg',
        density: 'compact',
        elevation: 0,
        style: 'text-transform: none; letter-spacing: normal; font-weight: 600;',
      },
      VTextField: {
        rounded: 'lg',
        variant: 'outlined',
        density: 'compact',
      },
      VTextarea: {
        rounded: 'lg',
        variant: 'outlined',
        density: 'compact',
      },
      VSelect: {
        rounded: 'lg',
        variant: 'outlined',
        density: 'compact',
      },
      VAutocomplete: {
        variant: 'outlined',
        density: 'compact',
      },
      VCombobox: {
        variant: 'outlined',
        density: 'compact',
      },
      VFileInput: {
        variant: 'outlined',
        density: 'compact',
      },
      VList: {
        density: 'compact',
      },
      VTable: {
        density: 'compact',
      },
      VDataTable: {
        density: 'compact',
      },
      VTabs: {
        density: 'compact',
      },
      VChip: {
        rounded: 'lg',
        size: 'small',
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
      // Un message temporaire affiché ne doit pas « avaler » le bouton
      // Précédent du navigateur : sinon l'utilisateur reste sur l'écran.
      VSnackbar: {
        closeOnBack: false,
      },
    },
  });

  app.vueApp.use(vuetify);
});
