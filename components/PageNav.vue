<template>
  <nav
    v-if="crumbs.length"
    class="page-nav"
    :class="'page-nav--' + position"
    :aria-label="position === 'top' ? 'Fil d’Ariane' : 'Retour'"
  >
    <button
      v-if="canGoBack"
      type="button"
      class="page-nav__back"
      :aria-label="`Retour : ${parent.label}`"
      :title="`Retour : ${parent.label}`"
      @click="goBack"
    >
      <v-icon size="20">mdi-arrow-left</v-icon>
    </button>

    <ol v-if="position === 'top'" ref="trail" class="page-nav__trail">
      <li
        v-for="(crumb, index) in crumbs"
        :key="index"
        class="page-nav__crumb"
      >
        <NuxtLink
          v-if="index < crumbs.length - 1"
          :to="crumb.to"
          class="page-nav__link"
        >
          {{ crumb.label }}
        </NuxtLink>
        <span v-else class="page-nav__current" aria-current="page">{{ crumb.label }}</span>
        <v-icon v-if="index < crumbs.length - 1" size="14" class="page-nav__sep">mdi-chevron-right</v-icon>
      </li>
    </ol>
  </nav>
</template>

<script setup>
// Fil d'Ariane (en haut) et flèche de retour (en haut et en bas) de chaque
// écran des tableaux de bord. Voir composables/usePageNav.ts.
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { usePageNavState } from '@/composables/usePageNav';

const props = defineProps({
  crumbs: { type: Array, required: true },
  position: { type: String, default: 'top' },
  // Étape interne gérée par la page elle-même (formulaire en plusieurs
  // étapes...) : renvoie true si elle a traité le retour.
  beforeBack: { type: Function, default: null },
});

const router = useRouter();
const trail = ref(null);

// Téléphone : un fil d'Ariane long défile jusqu'à l'écran courant.
watch(() => props.crumbs.map((c) => c.label).join('|'), async () => {
  await nextTick();
  if (trail.value) trail.value.scrollLeft = trail.value.scrollWidth;
}, { immediate: true });
const state = usePageNavState();

const parent = computed(() => props.crumbs[props.crumbs.length - 2] || props.crumbs[0]);
const hasInternalStep = computed(() => Boolean(props.beforeBack) || Boolean(state && state.handlers.length));
const canGoBack = computed(() => props.crumbs.length > 1 || hasInternalStep.value);

function goBack() {
  if (props.beforeBack && props.beforeBack()) return;
  // Étape interne ouverte (la plus récente d'abord) : on la ferme.
  if (state) {
    for (let i = state.handlers.length - 1; i >= 0; i -= 1) {
      if (state.handlers[i]()) return;
    }
  }
  if (props.crumbs.length > 1) router.push(parent.value.to);
}
</script>

<style scoped>
.page-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
}

.page-nav--top {
  margin-bottom: 8px;
}

.page-nav--bottom {
  margin-top: 12px;
}

.page-nav__back {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(25, 118, 210, 0.25);
  background: #fff;
  color: #1976d2;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.page-nav__back:hover {
  background: #1976d2;
  color: #fff;
}

.page-nav__back:focus-visible {
  outline: 3px solid rgba(25, 118, 210, 0.35);
  outline-offset: 2px;
}

.page-nav__trail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}

.page-nav__crumb {
  display: inline-flex;
  flex: none;
  align-items: center;
}

.page-nav__link {
  color: #1976d2;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.page-nav__link:hover {
  text-decoration: underline;
}

.page-nav__current {
  color: #0b2e4a;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-nav__sep {
  margin: 0 2px;
  color: #90a4ae;
}

/* Téléphone : le fil d'Ariane reste sur une ligne, défilable. */
@media (max-width: 600px) {
  .page-nav__trail {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .page-nav__trail::-webkit-scrollbar {
    display: none;
  }
}
</style>
