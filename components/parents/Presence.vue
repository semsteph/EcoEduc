<template>
  <div>
    <h1>Présences pour le :</h1>
    
    <!-- Liste dynamique des semestres avec v-expansion-panels -->
    <v-expansion-panels v-model="selectedPanel" multiple>
      <v-expansion-panel v-for="(semestre, index) in semestres" :key="index">
        <v-expansion-panel-title>
          {{ semestre }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <!-- Tableau des présences pour le semestre sélectionné -->
          <v-data-table :headers="headers" :items="filteredPresence(semestre)" item-key="id" class="elevation-1">
            <template v-slot:item.date="{ item }">
              <td>{{ formaterDate(item.date) }}</td>
            </template>
            <template v-slot:item.matiere="{ item }">
              <td>{{ item.matiere }}</td>
            </template>
            <template v-slot:item.heure="{ item }">
              <td>{{ item.heure }}</td>
            </template>
            <template v-slot:item.presence="{ item }">
              <td>{{ item.presence }}</td>
            </template>
            <template v-slot:item.motif="{ item }">
              <td>
                <v-textarea
                  v-model="item.motif"
                  label="Motif"
                  rows="2"
                  auto-grow
                  @input="handleMotifChange(item.id, item.motif)"
                  :style="{ maxHeight: '120px' }"
                  class="elevation-0"
                  outlined
                  dense
                ></v-textarea>
              </td>
            </template>
          </v-data-table>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Boutons d'action -->
    <div class="action-buttons">
      <v-btn color="primary" @click="submitMotifs" large outlined>
        Envoyer
      </v-btn>
      <v-btn color="secondary" @click="$emit('back')" large outlined>
        Retour
      </v-btn>
    </div>

    <!-- Snackbar pour afficher les messages de succès ou d'erreur -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" top right>
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script>
import axios from 'axios';
import dayjs from 'dayjs';

export default {
  props: {
    childId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      semestres: [],
      selectedPanel: null,
      headers: [
        { title: 'Date', value: 'date' },
        { title: 'Matière', value: 'matiere' },
        { title: 'Heure', value: 'heure' },
        { title: 'Présence', value: 'presence' },
        { title: 'Motif', value: 'motif' },
      ],
      presenceData: [],
      modifiedMotifs: {},
      snackbar: {
        show: false,
        message: '',
        color: '',
      },
    };
  },
  methods: {
    async fetchPresenceData() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.$router.push('/login');
          return;
        }

        const response = await axios.get('http://localhost:8080/api/presence', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            childId: this.childId,
          },
        });

        this.presenceData = response.data;
        // Extraire les noms des semestres de manière unique
        this.semestres = [...new Set(this.presenceData.map(item => item.semestreNom))];
        this.modifiedMotifs = {};
      } catch (error) {
        console.error('Erreur lors de la récupération des données de présence :', error);
        this.$router.push('/login');
      }
    },
    filteredPresence(semestre) {
      // Filtrer les données de présence selon le semestre sélectionné
      return this.presenceData.filter(item => item.semestreNom === semestre);
    },
    formaterDate(date) {
      return dayjs(date).format('DD/MM/YYYY');
    },
    handleMotifChange(id, motif) {
      this.modifiedMotifs[id] = motif;
    },
    async submitMotifs() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.$router.push('/login');
          return;
        }

        const updatePromises = Object.keys(this.modifiedMotifs).map(async id => {
          const response = await axios.post(`http://localhost:8080/api/presence/${id}/motif`, { motif: this.modifiedMotifs[id] }, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.status !== 200) {
            throw new Error(`Échec de la mise à jour du motif pour l'ID ${id}`);
          }
        });

        await Promise.all(updatePromises);

        this.showSnackbar('Le motif a été enregistrer  avec succès', 'success');
        this.modifiedMotifs = {};
      } catch (error) {
        console.error('Erreur lors de la mise à jour des motifs :', error);
        this.showSnackbar('Erreur lors de la mise à jour des motifs', 'error');
      }
    },
    showSnackbar(message, color) {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },
  },
  mounted() {
    this.fetchPresenceData();
  },
};
</script>

<style scoped>
.v-expansion-panels {
  margin-bottom: 20px;
}

.v-textarea {
  width: 100%;
  min-height: 40px;
  resize: none;
  max-height: 120px;
  overflow-y: auto;
}

.action-buttons {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
}

.elevation-0 {
  box-shadow: none !important;
}
</style>
