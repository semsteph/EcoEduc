// Importez les styles de Vuetify et les icônes
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css'; // Importez les icônes Material Design

import { createVuetify } from 'vuetify';

export default defineNuxtPlugin((app) => {
  const vuetify = createVuetify({
    icons: {
      defaultSet: 'mdi', // Définit 'mdi' comme ensemble d'icônes par défaut
    },
    // ... votre configuration existante
  });

  app.vueApp.use(vuetify);
});
