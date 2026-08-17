<template>
  <div class="cahier-container">
    <!-- Vue de sélection des classes -->
    <v-card color="blue lighten-5" v-if="!selectedClassId" class="elevation-2 pa-4 main-card">
      <v-card-title class="title">
        <v-icon class="mr-2" color="blue darken-2">mdi-book-education</v-icon>
        Gestion des Cahiers de Texte
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col
            v-for="classe in classes"
            :key="classe.id"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              class="class-card"
              outlined
              elevation="1"
              @click="goToClass(classe.id)"
            >
              <v-card-title class="class-title">
                <v-icon color="primary" class="mr-2">mdi-google-classroom</v-icon>
                {{ classe.nom }}
              </v-card-title>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Vue détaillée d'une classe -->
    <CahierDeTexteDetail
      v-else
      :class-id="selectedClassId"
      :annee-scolaire="anneeScolaire"
      :annee-scolaire-id="anneeScolaireId"
      :etablissement-id="etablissementId"
      @back="clearSelection"
    />
  </div>
</template>

<script>
import CahierDeTexteDetail from './CahierDeTexteDetail.vue';
import axios from 'axios';

export default {
  name: 'CahierDeTexte',
  components:{
    CahierDeTexteDetail,
  },
  props: {
    etablissementId: {
      type: Number,
      required: true
    },
    etablissementNom: {
      type: String,
      required: true
    },
    anneeScolaire: {
      type: String,
      required: true
    },
    anneeScolaireId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      classes: [],
      selectedClassId: null,
    };
  },
  methods: {
    fetchClasses() {
      const token = localStorage.getItem('token');
      axios.get(`/api/classe/${this.etablissementId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(response => {
          this.classes = response.data;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des classes:', error);
        });
    },
    goToClass(classId) {
      this.selectedClassId = classId;
    },
    clearSelection() {
      this.selectedClassId = null;
    }
  },
  created() {
    this.fetchClasses();
  }
}
</script>
<style scoped>
.cahier-container {
  padding: 24px;
}

.main-card {
  border-radius: 12px;
}

.title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #0d47a1;
  display: flex;
  align-items: center;
}

.class-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  border-radius: 12px;
  background-color: white;
}

.class-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.class-title {
  font-size: 1.1rem;
  font-weight: 500;
  color: #1565c0;
  display: flex;
  align-items: center;
  padding: 16px;
}

/* Responsive pour petits écrans */
@media (max-width: 600px) {
  .cahier-container {
    padding: 12px;
  }

  .title {
    font-size: 1.1rem;
  }

  .class-title {
    font-size: 0.9rem;
    padding: 12px;
  }

  .v-icon {
    font-size: 20px;
  }
}

/* Responsive pour grands écrans */
@media (min-width: 960px) {
  .title {
    font-size: 1.5rem;
  }

  .class-title {
    font-size: 1.2rem;
  }
}
</style>