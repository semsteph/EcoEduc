<template>
  <v-container class="cm-wrap">
    <!-- Liste des classes (les outils de la classe ont leurs propres routes :
         pages/professeurs/dashbord/matieres/[matiereId]/classes/...) -->
    <div class="cm-header">
      <div class="cm-title">
        <v-icon class="mr-2" color="primary">mdi-google-classroom</v-icon>
        Choisir une classe
      </div>
      <div class="cm-subtitle">
        Sélectionnez une classe pour accéder aux outils (notes, présence, conduite…)
      </div>
    </div>

    <v-row dense>
      <v-col
        v-for="classe in filteredClasses"
        :key="classe.classe_id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card class="class-card" @click="selectClass(classe)" elevation="0">
          <div class="class-card-top">
            <v-icon size="22" color="white">mdi-school</v-icon>
          </div>

          <v-card-text class="class-card-body">
            <div class="class-name">{{ classe.classe }}</div>

            <div class="class-meta">
              <v-icon size="16" class="mr-1" color="primary">mdi-information-outline</v-icon>
              Cliquez pour voir les détails
            </div>
          </v-card-text>

          <div class="class-card-arrow">
            <v-icon color="primary">mdi-chevron-right</v-icon>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-alert
      v-if="filteredClasses.length === 0"
      type="info"
      variant="tonal"
      class="mt-4"
    >
      Aucune classe trouvée pour cette matière.
    </v-alert>
  </v-container>
</template>

<script>
export default {
  name: "ClassManager",
  props: {
    subjectId: { type: Number, required: true },
    classes: { type: Array, required: true },
    selectedClassId: { type: Number, required: false },
    etablissementId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  emits: ["class-selected"],
  computed: {
    filteredClasses() {
      return this.classes;
    },
  },
  methods: {
    selectClass(classe) {
      this.$emit("class-selected", classe.classe_id);
    },
  },
  mounted() {
    console.log("Subject ID:", this.subjectId, "Etablissement ID:", this.etablissementId);
  },
};
</script>

<style scoped>
/* Interface fine : pas de marge de conteneur en plus de la section. */
.cm-wrap {
  padding: 0 !important;
}

.cm-header {
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(25, 118, 210, 0.12);
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.cm-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-weight: 800;
  color: #0b2e4a;
  font-size: 15px;
}

.cm-subtitle {
  margin-top: 2px;
  color: #546e7a;
  font-size: 13px;
  line-height: 1.3;
}

/* Carte d'outil fine : une ligne (pastille dégradée 32 px, texte, flèche)
   au lieu d'un grand bandeau dégradé de 44 px au-dessus du texte. */
.class-card {
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

.class-card-top {
  background: linear-gradient(135deg, #1976d2, #0b2e4a);
}

.class-card:hover {
  border-color: rgba(25, 118, 210, 0.4);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.class-card-top {
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  padding: 0;
}

.class-card-top :deep(.v-icon) {
  font-size: 18px !important;
}

.class-card-body {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0 !important;
}

.class-name {
  font-weight: 800;
  color: #0b2e4a;
  font-size: 14px;
  line-height: 1.3;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.class-meta {
  display: flex;
  align-items: center;
  color: #607d8b;
  font-weight: 600;
  font-size: 12.5px;
  line-height: 1.3;
}

.class-card-arrow {
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
  .cm-header {
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    margin-bottom: 8px;
  }
}
</style>
