<template>
  <!-- Encadré « À savoir » : l'essentiel d'un écran en quelques points.
       Ouvert la première fois, puis replié si l'utilisateur l'a fermé. -->
  <div class="aide" :class="{ 'is-ouvert': ouvert }">
    <button type="button" class="aide-tete" :aria-expanded="ouvert" @click="basculer">
      <v-icon size="18" color="primary">mdi-lightbulb-on-outline</v-icon>
      <span class="aide-titre">{{ titre }}</span>
      <v-icon size="18" class="aide-chevron">{{ ouvert ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
    </button>
    <div v-show="ouvert" class="aide-corps"><slot /></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  titre: { type: String, default: 'À savoir' },
  // Clé de mémorisation (une par écran).
  cle: { type: String, required: true },
})

const ouvert = ref(true)
const stockage = () => `aide-repliee:${props.cle}`

onMounted(() => {
  try { ouvert.value = localStorage.getItem(stockage()) !== '1' } catch (e) { ouvert.value = true }
})

function basculer() {
  ouvert.value = !ouvert.value
  try { localStorage.setItem(stockage(), ouvert.value ? '0' : '1') } catch (e) { /* stockage indisponible */ }
}
</script>

<style scoped>
.aide { border: 1px solid #cfe0f5; background: #f4f8fe; border-radius: 10px; margin-bottom: 12px; }
.aide-tete { width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: none; border: 0; cursor: pointer; text-align: left; font: inherit; }
.aide-titre { flex: 1; font-weight: 700; color: #0d47a1; font-size: 0.88rem; }
.aide-chevron { color: #5f6b7a; }
.aide-corps { padding: 0 14px 10px 38px; font-size: 0.84rem; color: #2f3d50; line-height: 1.5; }
.aide-corps :deep(ul) { margin: 0; padding-left: 16px; display: grid; gap: 3px; }
.aide-corps :deep(strong) { color: #13294b; }
</style>
