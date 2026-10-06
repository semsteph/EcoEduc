<template>
  <NuxtLink
    :to="to"
    class="back-to-home"
    :class="{ 'on-dark': dark }"
    aria-label="Retour à la page d'accueil"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span>Retour à l'accueil</span>
  </NuxtLink>
</template>

<script>
// Bouton de retour vers la page d'accueil, commun à toutes les pages de
// connexion (parents, enseignants, administration) : même place (en haut à
// gauche), même libellé, même style partout.
export default {
  name: 'BackToHome',

  props: {
    to: {
      type: String,
      default: '/Accueil/Accueil',
    },
    // Posé sur un fond sombre (panneau de marque de l'administration).
    dark: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style scoped>
.back-to-home {
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 5px 12px 5px 8px;
  border-radius: 999px;
  border: 1px solid rgba(25, 118, 210, 0.2);
  background: rgba(255, 255, 255, 0.92);
  color: #0b2e4a;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  box-shadow: none;
  backdrop-filter: blur(8px);
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.back-to-home:hover {
  background: #1976d2;
  color: #fff;
}

.back-to-home:active {
  transform: translateY(1px);
}

.back-to-home:focus-visible {
  outline: 3px solid rgba(25, 118, 210, 0.45);
  outline-offset: 2px;
}

/* Fond sombre et opaque : reste lisible sur la photo du panneau de marque
   comme sur le formulaire blanc quand on fait défiler la page. */
.back-to-home.on-dark {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(12, 31, 56, 0.72);
  color: #fff;
}

.back-to-home.on-dark:hover {
  background: #fff;
  color: #0c1f38;
}

/* Très petits écrans : l'icône seule, le libellé reste lu par les
   lecteurs d'écran (aria-label). */
@media (max-width: 340px) {
  .back-to-home span {
    display: none;
  }

  .back-to-home {
    padding: 8px 10px;
  }
}
</style>
