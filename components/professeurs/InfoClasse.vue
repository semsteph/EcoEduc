<template>
  <v-container class="ic-wrap">
    <div class="ic-header">
      <div class="ic-title">
        <v-icon class="mr-2" color="primary">mdi-school-outline</v-icon>
        Gestion de la classe : <span class="ic-class">{{ classe.classe }}</span>
      </div>
      <div class="ic-subtitle">
        Accédez rapidement aux outils de gestion : notes, présence, conduite et cahier de texte.
      </div>
    </div>

    <v-row dense>
      <v-col
        v-for="(item, index) in items"
        :key="index"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card class="ic-card" elevation="0" @click="navigateTo(item.route)">
          <div class="ic-card-top" :class="item.topClass">
            <v-icon color="white">{{ item.icon }}</v-icon>
          </div>

          <v-card-text class="ic-card-body">
            <div class="ic-card-title">{{ item.name }}</div>
            <div class="ic-card-desc">{{ item.desc }}</div>
          </v-card-text>

          <div class="ic-arrow">
            <v-icon color="primary">mdi-chevron-right</v-icon>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <div class="text-center mt-3">
    </div>
  </v-container>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

defineProps({
  classe: { type: Object, required: true },
  etablissementId: { type: Number, required: true },
  anneeScolaire: { type: String, required: true },
  anneeScolaireId: { type: Number, required: true },
});

const emit = defineEmits(["back", "navigate"]);

const items = [
  {
    name: "Gérer Notes",
    route: "NoteManager",
    icon: "mdi-clipboard-text-outline",
    desc: "Saisir et consulter les notes.",
    topClass: "top-blue",
  },
  {
    name: "Gérer Présence",
    route: "PresenceManager",
    icon: "mdi-calendar-check-outline",
    desc: "Marquer les présents/absents.",
    topClass: "top-blue-dark",
  },
  {
    name: "Derniers Absents",
    route: "PresencesPrecedantes",
    icon: "mdi-account-off-outline",
    desc: "Voir les absences récentes.",
    topClass: "top-blue",
  },
  {
    name: "Gérer Conduite",
    route: "ConductManager",
    icon: "mdi-account-tie-outline",
    desc: "Suivre la discipline des élèves.",
    topClass: "top-blue-dark",
  },
  {
    name: "Cahier de texte",
    route: "CahierDeTexteManager",
    icon: "mdi-book-open-variant",
    desc: "Publier le contenu des cours.",
    topClass: "top-blue",
  },
  {
    name: "Devoirs",
    route: "DevoirsManager",
    icon: "mdi-notebook-edit-outline",
    desc: "Donner des exercices à faire à la maison.",
    topClass: "top-blue-dark",
  },
];

function navigateTo(view) {
  emit("navigate", view);
}
</script>

<style scoped>
/* Interface fine : pas de marge de conteneur en plus de la section. */
.ic-wrap {
  padding: 0 !important;
}

.ic-header {
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(25, 118, 210, 0.12);
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.ic-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-weight: 800;
  color: #0b2e4a;
  font-size: 15px;
}

.ic-subtitle {
  margin-top: 2px;
  color: #546e7a;
  font-size: 13px;
  line-height: 1.3;
}

.ic-class {
  color: #1976d2;
}

.top-blue {
  background: linear-gradient(135deg, #1976d2, #0b2e4a);
}

.top-blue-dark {
  background: linear-gradient(135deg, #0b2e4a, #1976d2);
}

.ic-back {
  border-radius: 999px !important;
  font-weight: 700;
}

/* Carte d'outil fine : une ligne (pastille dégradée 32 px, texte, flèche)
   au lieu d'un grand bandeau dégradé de 44 px au-dessus du texte. */
.ic-card {
  display: flex !important;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 8px 10px !important;
  border-radius: 8px !important;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(25, 118, 210, 0.14);
  background: rgba(255, 255, 255, 0.96);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.ic-card:hover {
  border-color: rgba(25, 118, 210, 0.4);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.ic-card-top {
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  padding: 0;
}

.ic-card-top :deep(.v-icon) {
  font-size: 18px !important;
}

.ic-card-body {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0 !important;
}

.ic-card-title {
  font-weight: 800;
  color: #0b2e4a;
  font-size: 14px;
  line-height: 1.3;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ic-card-desc {
  display: flex;
  align-items: center;
  color: #607d8b;
  font-weight: 600;
  font-size: 12.5px;
  line-height: 1.3;
}

.ic-arrow {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: rgba(25, 118, 210, 0.08);
  border: 1px solid rgba(25, 118, 210, 0.14);
}

@media (max-width: 600px) {
  /* Téléphone : l'en-tête n'est plus un cadre, juste un titre. */
  .ic-header {
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    margin-bottom: 8px;
  }
}
</style>
