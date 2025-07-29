import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  
  devtools: { enabled: true },
css: [
    '@/assets/css/styles.css' // ➕ Ajout de ton fichier Tailwind CSS
  ],
  

  build: {
    transpile: ['vuetify'],
  },

  modules: [
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        // @ts-expect-error
        config.plugins.push(vuetify({ autoImport: true }))
      })
    },
  ],

  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },
 
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY, // Clé OpenAI (uniquement côté serveur)
    public: {
      baseURL: 'http://localhost:3002', // Base URL exposée côté client
    },
  },

  compatibilityDate: '2024-07-08',
  
})
