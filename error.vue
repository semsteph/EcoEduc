<template>
  <div class="error-page">
    <div class="error-card">
      <div class="error-code">{{ error?.statusCode || 'Erreur' }}</div>
      <h1 class="error-title">
        {{ notFound ? 'Cette page n’existe pas' : 'Une erreur est survenue' }}
      </h1>
      <p class="error-text">
        {{
          notFound
            ? 'L’adresse demandée est introuvable. Vérifiez le lien ou revenez à l’accueil.'
            : 'Le chargement de la page a échoué. Réessayez dans un instant.'
        }}
      </p>
      <div class="error-actions">
        <button
          type="button"
          class="btn btn--arrow"
          aria-label="Retour à l'accueil"
          title="Retour à l'accueil"
          @click="goHome"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M11 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button v-if="!notFound" type="button" class="btn btn--ghost" @click="reload">
          Réessayer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Page d'erreur de l'application (adresse inconnue, erreur au chargement),
// en français et dans la charte, à la place de la page anglaise par défaut.
const props = defineProps({
  error: { type: Object, default: null },
})

const notFound = computed(() => props.error?.statusCode === 404)

const goHome = () => clearError({ redirect: '/Accueil/Accueil' })
const reload = () => window.location.reload()
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: linear-gradient(180deg, #eaf2ff 0%, #ffffff 55%, #f6f9ff 100%);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

.error-card {
  width: 100%;
  max-width: 400px;
  padding: 24px 20px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid rgba(25, 118, 210, 0.14);
  box-shadow: 0 1px 3px rgba(11, 46, 74, 0.08);
  text-align: center;
}

.error-code {
  font-size: 56px;
  font-weight: 900;
  line-height: 1;
  color: #1976d2;
}

.error-title {
  margin: 14px 0 8px;
  font-size: 22px;
  font-weight: 800;
  color: #0b2e4a;
}

.error-text {
  margin: 0 0 22px;
  font-size: 15px;
  line-height: 1.5;
  color: #455a64;
}

.error-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn {
  min-height: 34px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn--primary {
  background: #1976d2;
  color: #fff;
}

.btn--primary:hover {
  background: #0b2e4a;
}

.btn--arrow {
  align-self: center;
  width: 40px;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border-color: rgba(25, 118, 210, 0.3);
  background: #fff;
  color: #1976d2;
}

.btn--arrow:hover {
  background: #1976d2;
  color: #fff;
}

.btn--ghost {
  background: transparent;
  color: #0b2e4a;
  border-color: rgba(25, 118, 210, 0.25);
}
</style>
