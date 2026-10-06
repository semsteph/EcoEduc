<template>
  <NotificationComponent :items="affichees" :chargement="notificationsChargement" @ouvrir="ouvrir" />
</template>

<script setup>
import { computed, inject, onMounted, ref, watch } from "vue";
import NotificationComponent from "@/components/professeurs/NotificationComponent.vue";

const { notifications, notificationsChargement, markNotificationsRead, syncAndFetchNotifications, goTo } = inject("profDashboard");

// Ce qui était nouveau à l'ouverture (ou arrivé pendant) reste affiché
// « Nouveau » sur cet écran, même une fois marqué vu côté serveur.
const nouvelles = new Set();
const version = ref(0);
watch(
  notifications,
  (liste) => {
    const nonLues = liste.filter((n) => !n.lu);
    if (!nonLues.length) return;
    nonLues.forEach((n) => nouvelles.add(n.cle));
    version.value += 1;
    markNotificationsRead();
  },
  { immediate: true }
);
const affichees = computed(() => {
  version.value;
  return notifications.value.map((n) => ({ ...n, lu: !nouvelles.has(n.cle) }));
});

onMounted(() => syncAndFetchNotifications());

// Absence d'un élève → appel de la classe ; réponse à une demande → notes.
function ouvrir(n) {
  if (!n.matiereId) return;
  if (n.type === "permission" && n.classeId) goTo(`/matieres/${n.matiereId}/classes/${n.classeId}/presences`);
  else if (n.type === "demande") goTo(n.classeId ? `/matieres/${n.matiereId}/classes/${n.classeId}/notes` : `/matieres/${n.matiereId}`);
}
</script>
