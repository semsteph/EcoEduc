import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

export default defineNuxtConfig({

  devtools: { enabled: true },

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
      ],
    },
  },

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
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
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
