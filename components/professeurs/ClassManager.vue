<template>
  <v-container class="cm-wrap">
    <!-- Vue details (InfoClasse) -->
    <template v-if="selectedClass && currentView === 'details'">
      <InfoClasse
        :classe="selectedClass"
        :etablissement-id="etablissementId"
        :annee-scolaire="anneeScolaire"
        :annee-scolaire-id="anneeScolaireId"
        :subject-id="subjectId"
        @back="goBack"
        @navigate="navigateTo"
      />
    </template>

    <!-- Vue NoteManager -->
    <template v-else-if="currentView === 'NoteManager'">
      <NoteManager
        :classe="selectedClass"
        :classe-id="selectedClassId || selectedClass?.classe_id"
        :subject-id="subjectId"
        :etablissement-id="etablissementId"
        :annee-scolaire="anneeScolaire"
        :annee-scolaire-id="anneeScolaireId"
        @back="goBack"
      />
    </template>

    <!-- Vue PresenceManager -->
    <template v-else-if="currentView === 'PresenceManager'">
      <PresenceManager
        :classe="selectedClass"
        :classe-id="selectedClassId || selectedClass?.classe_id"
        :subject-id="subjectId"
        :etablissement-id="etablissementId"
        :annee-scolaire="anneeScolaire"
        :annee-scolaire-id="anneeScolaireId"
        @back="goBack"
      />
    </template>

    <!-- Vue PresencesPrecedantes -->
    <template v-else-if="currentView === 'PresencesPrecedantes'">
      <PresencesPrecedantes
        :classe="selectedClass"
        :classe-id="selectedClassId || selectedClass?.classe_id"
        :subject-id="subjectId"
        :etablissement-id="etablissementId"
        :annee-scolaire="anneeScolaire"
        :annee-scolaire-id="anneeScolaireId"
        @back="goBack"
      />
    </template>

    <!-- Vue ConductManager -->
    <template v-else-if="currentView === 'ConductManager'">
      <ConductManager
        :classe="selectedClass"
        :classe-id="selectedClassId || selectedClass?.classe_id"
        :subject-id="subjectId"
        :etablissement-id="etablissementId"
        :annee-scolaire="anneeScolaire"
        :annee-scolaire-id="anneeScolaireId"
        @back="goBack"
      />
    </template>

    <!-- Vue CahierDeTexteManager -->
    <template v-else-if="currentView === 'CahierDeTexteManager'">
      <CahierDeTexteManager
        :classe="selectedClass"
        :classe-id="selectedClassId || selectedClass?.classe_id"
        :subject-id="subjectId"
        :etablissement-id="etablissementId"
        :annee-scolaire="anneeScolaire"
        :annee-scolaire-id="anneeScolaireId"
        @back="goBack"
      />
    </template>

    <!-- Liste des classes -->
    <template v-else>
      <div class="cm-header">
        <div class="cm-title">
          <v-icon class="mr-2" color="primary">mdi-google-classroom</v-icon>
          Choisir une classe
        </div>
        <div class="cm-subtitle">
          Sélectionnez une classe pour accéder aux outils (notes, présence, conduite…)
        </div>
      </div>

      <v-row>
        <v-col
          v-for="classe in filteredClasses"
          :key="classe.classe_id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card class="class-card" @click="selectClass(classe)" elevation="6">
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
    </template>
  </v-container>
</template>

<script>
import InfoClasse from "~/components/professeurs/InfoClasse.vue";
import NoteManager from "~/components/professeurs/NoteManager.vue";
import PresenceManager from "~/components/professeurs/PresenceManager.vue";
import ConductManager from "~/components/professeurs/ConductManager.vue";
import CahierDeTexteManager from "~/components/professeurs/CahierDeTexteManager.vue";
import PresencesPrecedantes from "~/components/professeurs/PresencesPrecedantes.vue";

export default {
  name: "ClassManager",
  components: {
    InfoClasse,
    NoteManager,
    PresenceManager,
    PresencesPrecedantes,
    ConductManager,
    CahierDeTexteManager,
  },
  props: {
    subjectId: { type: Number, required: true },
    classes: { type: Array, required: true },
    selectedClassId: { type: Number, required: false },
    etablissementId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  data() {
    return {
      selectedClass: null,
      currentView: null,
    };
  },
  computed: {
    filteredClasses() {
      return this.classes;
    },
  },
  methods: {
    selectClass(classe) {
      this.selectedClass = classe;
      this.currentView = "details";
      this.$emit("class-selected", classe.classe_id);
    },
    goBack() {
      if (this.currentView === "details") {
        this.selectedClass = null;
        this.currentView = null;
      } else {
        this.currentView = "details";
      }
    },
    navigateTo(view) {
      this.currentView = view;
    },
  },
  mounted() {
    console.log("Subject ID:", this.subjectId, "Etablissement ID:", this.etablissementId);
  },
};
</script>

<style scoped>
.cm-wrap {
  padding-top: 12px;
  padding-bottom: 18px;
}

.cm-header {
  margin-bottom: 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(25, 118, 210, 0.12);
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 10px 40px rgba(11, 46, 74, 0.08);
}

.cm-title {
  display: flex;
  align-items: center;
  font-weight: 950;
  color: #0b2e4a;
  font-size: 1.05rem;
}

.cm-subtitle {
  margin-top: 6px;
  color: #546e7a;
  font-size: 0.92rem;
  line-height: 1.2rem;
}

.class-card {
  border-radius: 18px !important;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.class-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 60px rgba(11, 46, 74, 0.12);
}

.class-card-top {
  height: 44px;
  background: linear-gradient(90deg, #1976d2, #0b2e4a);
  display: flex;
  align-items: center;
  padding: 0 14px;
}

.class-card-body {
  padding: 14px;
}

.class-name {
  font-weight: 950;
  color: #0b2e4a;
  font-size: 1.08rem;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.class-meta {
  display: flex;
  align-items: center;
  color: #607d8b;
  font-weight: 700;
  font-size: 0.85rem;
}

.class-card-arrow {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(25, 118, 210, 0.10);
  border: 1px solid rgba(25, 118, 210, 0.14);
}

@media (max-width: 600px) {
  .cm-header {
    padding: 12px;
    border-radius: 14px;
  }
  .class-card {
    border-radius: 16px !important;
  }
}
</style>
