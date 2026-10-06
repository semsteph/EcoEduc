<template>
  <v-container fluid class="pa-0">
    <v-row align="center" class="mb-3 px-3 pt-2">
      <v-col cols="auto">
      </v-col>
      <v-col>
        <h2 class="text-h6 font-weight-bold text-error d-flex align-center">
          <v-icon start size="32" color="error">mdi-book-alert</v-icon>
          {{ selectedStudentId ? 'Historique disciplinaire' : 'Répertoire des élèves' }}
        </h2>
        <div class="text-caption text-grey-darken-1">
          Année scolaire : {{ anneeScolaire }} | {{ etablissementNom }}
        </div>
      </v-col>
    </v-row>

    <v-window v-model="activeView" disabled>
      <v-window-item value="list">
        <v-card border flat class="rounded-lg overflow-hidden elevation-1 mx-4">
          <v-toolbar height="40" color="error-lighten-5" flat class="px-3">
            <v-toolbar-title class="text-subtitle-1 font-weight-bold text-error text-subtitle-1">
              Liste des élèves inscrits
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-chip color="error" variant="flat" size="small" class="font-weight-bold">
              {{ eleves.length }} Élèves
            </v-chip>
          </v-toolbar>

          <v-card-text class="pa-3 pa-md-3 bg-grey-lighten-5">
            <v-row v-if="eleves.length > 0">
              <v-col
                v-for="eleve in eleves"
                :key="eleve.id"
                cols="12"
                sm="6"
                md="4"
                lg="3"
              >
                <v-card
                  class="student-card rounded-lg border-sm"
                  variant="flat"
                  @click="selectStudent(eleve)"
                  ripple
                >
                  <v-card-text class="d-flex align-center pa-3">
                    <v-avatar color="error-lighten-4" size="32" class="me-2 font-weight-bold text-error">
                      {{ eleve.nom.charAt(0) }}{{ eleve.prenom.charAt(0) }}
                    </v-avatar>
                    
                    <div class="overflow-hidden">
                      <div class="text-subtitle-2 font-weight-black text-uppercase text-truncate">
                        {{ eleve.nom }}
                      </div>
                      <div class="text-body-2 text-error text-truncate">
                        {{ eleve.prenom }}
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <v-row v-else justify="center" class="py-12">
              <v-col cols="12" md="8" class="text-center">
                <v-icon size="80" color="grey-lighten-2">mdi-account-off-outline</v-icon>
                <div class="text-h6 text-grey mt-4">Aucun élève trouvé</div>
                <div class="text-body-2 text-grey">
                  Allez dans la Gestion des classes pour inscrire des élèves.
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-window-item>

      <v-window-item value="detail">
        <div class="w-100 px-3">
          <cahier-punition
            v-if="selectedStudent"
            :student-id="selectedStudentId"
            :student-nom="selectedStudentNom"
            :student-prenom="selectedStudentPrenom"
            :annee-scolaire="anneeScolaire"
            :annee-scolaire-id="anneeScolaireId"
            :etablissement-id="etablissementId"
            @back="clearSelection"
          />
        </div>
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script>
import axios from 'axios'
import CahierPunition from './CahierPunition.vue'

export default {
  name: 'PunishmentDetail',
  components: { CahierPunition },
  props: {
    classId: { type: Number, required: true },
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
    eleveId: { type: Number, default: null }
  },
  emits: ['back', 'ouvrir-eleve'],
  data() {
    return {
      eleves: [],
      activeView: 'list'
    }
  },
  computed: {
    // Élève ouvert : donné par la route (…/<classeId>/<eleveId>). Le changer
    // émet « ouvrir-eleve » et la page va vers la nouvelle adresse.
    selectedStudentId: {
      get() { return this.eleveId },
      set(id) { this.$emit('ouvrir-eleve', id) }
    },
    selectedStudent() {
      return this.eleves.find((e) => Number(e.id) === this.eleveId) || null
    },
    selectedStudentNom() {
      return this.selectedStudent ? this.selectedStudent.nom : ''
    },
    selectedStudentPrenom() {
      return this.selectedStudent ? this.selectedStudent.prenom : ''
    }
  },
  watch: {
    eleveId: {
      handler(id) {
        this.activeView = id ? 'detail' : 'list'
      },
      immediate: true
    }
  },
  methods: {
    fetchStudents() {
      axios
        .get(`/api/eleves/${this.classId}/${this.anneeScolaireId}`)
        .then((response) => {
          this.eleves = response.data
          // Élève inconnu dans cette classe : retour à la liste de la classe.
          if (this.eleveId && !this.selectedStudent) this.selectedStudentId = null
        })
        .catch((error) => {
          console.error('Erreur lors de la récupération des élèves:', error)
        })
    },
    // Modification pour accepter l'objet eleve
    selectStudent(eleve) {
      this.selectedStudentId = eleve.id
    },
    clearSelection() {
      this.selectedStudentId = null
    }
  },
  created() {
    this.fetchStudents()
  }
}
</script>