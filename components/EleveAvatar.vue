<template>
  <!-- Photo d'identité de l'élève, ou ses initiales s'il n'en a pas. -->
  <div class="eleve-avatar" :style="{ width: `${size}px`, height: `${size}px`, background: photo && !erreur ? '#e8eef6' : couleur }">
    <img v-if="photo && !erreur" :src="photo" :alt="`Photo de ${prenom} ${nom}`" @error="erreur = true" />
    <span v-else :style="{ fontSize: `${Math.round(size * 0.38)}px` }">{{ initiales }}</span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  photo: { type: String, default: '' },
  prenom: { type: String, default: '' },
  nom: { type: String, default: '' },
  size: { type: Number, default: 48 },
})

const erreur = ref(false)
watch(() => props.photo, () => { erreur.value = false })

const initiales = computed(() => `${(props.prenom || '').trim().charAt(0)}${(props.nom || '').trim().charAt(0)}`.toUpperCase() || '?')

// Couleur stable par élève (même enfant, même couleur partout).
const PALETTE = ['#1565c0', '#2e7d32', '#6a1b9a', '#c62828', '#00838f', '#ef6c00', '#4527a0', '#ad1457']
const couleur = computed(() => {
  const s = `${props.prenom}${props.nom}`
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
})
</script>

<style scoped>
.eleve-avatar {
  flex: none;
  border-radius: 50%;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(15, 35, 70, 0.18);
}
.eleve-avatar img { width: 100%; height: 100%; object-fit: cover; object-position: center 25%; }
</style>
