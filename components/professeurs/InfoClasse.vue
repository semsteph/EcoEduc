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

    <v-row>
      <v-col
        v-for="(item, index) in items"
        :key="index"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card class="ic-card" elevation="6" @click="navigateTo(item.route)">
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

    <div class="text-center mt-6">
      <v-btn color="primary" class="ic-back" @click="$emit('back')">
        <v-icon start>mdi-arrow-left</v-icon>
        Retour
      </v-btn>
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
.ic-wrap {
  padding-top: 12px;
  padding-bottom: 18px;
}

.ic-header {
  margin-bottom: 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(13, 148, 136, 0.12);
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 10px 40px rgba(11, 46, 74, 0.08);
}

.ic-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-weight: 950;
  color: #0b2e4a;
  font-size: 1.05rem;
}

.ic-class {
  color: #0d9488;
}

.ic-subtitle {
  margin-top: 6px;
  color: #546e7a;
  font-size: 0.92rem;
  line-height: 1.2rem;
}

.ic-card {
  border-radius: 18px !important;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(13, 148, 136, 0.12);
  background: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.ic-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 60px rgba(11, 46, 74, 0.12);
}

.ic-card-top {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 14px;
}

.top-blue {
  background: linear-gradient(90deg, #0d9488, #0b2e4a);
}

.top-blue-dark {
  background: linear-gradient(90deg, #0b2e4a, #0d9488);
}

.ic-card-body {
  padding: 14px;
  padding-right: 56px;
}

.ic-card-title {
  font-weight: 950;
  color: #0b2e4a;
  font-size: 1.02rem;
  margin-bottom: 6px;
}

.ic-card-desc {
  color: #607d8b;
  font-weight: 700;
  font-size: 0.85rem;
}

.ic-arrow {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(13, 148, 136, 0.10);
  border: 1px solid rgba(13, 148, 136, 0.14);
}

.ic-back {
  border-radius: 999px !important;
  font-weight: 900;
}

@media (max-width: 600px) {
  .ic-header {
    padding: 12px;
    border-radius: 14px;
  }
  .ic-card {
    border-radius: 16px !important;
  }
}
</style>
