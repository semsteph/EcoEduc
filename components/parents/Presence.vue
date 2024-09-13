<template>
  <div>
    <h1>Présences pour le :</h1>
    
    <!-- Boutons pour sélectionner les semestres -->
    <div class="semestre-buttons">
      <v-btn @click="fetchPresenceData('semestre1')" :class="{ active: semestre === 'semestre1' }" color="primary" depressed>
        Semestre 1
      </v-btn>
      <v-btn @click="fetchPresenceData('semestre2')" :class="{ active: semestre === 'semestre2' }" color="primary" depressed>
        Semestre 2
      </v-btn>
    </div>

    <!-- Tableau des présences -->
    <v-data-table :headers="headers" :items="filteredPresence" item-key="id" class="elevation-1">
      <template v-slot:item.date="{ item }">
        <td>{{ item.date }}</td>
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

export default {
  props: {
    childId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      semestre: 'semestre1',
      headers: [
        { title: 'Date', value: 'date' },
        { title: 'Matière', value: 'matiere' },
        { title: 'Heure', value: 'heure' },
        { title: 'Présence', value: 'presence' },
        { title: 'Motif', value: 'motif' },
      ],
      presenceData: [],
      modifiedMotifs: {}, // Suivi des motifs modifiés
      snackbar: {
        show: false,
        message: '',
        color: '',
      },
    };
  },
  computed: {
    filteredPresence() {
      return this.presenceData;
    },
  },
  methods: {
    async fetchPresenceData(semestre) {
      this.semestre = semestre;
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
            semestre: this.semestre,
          },
        });

        this.presenceData = response.data;
        this.modifiedMotifs = {}; // Réinitialise les motifs modifiés après récupération
      } catch (error) {
        console.error('Erreur lors de la récupération des données de présence :', error);
        this.$router.push('/login');
      }
    },
    handleMotifChange(id, motif) {
      // Mise à jour directe de l'objet modifié
      this.modifiedMotifs[id] = motif;
    },
    async submitMotifs() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.$router.push('/login');
          return;
        }

        // Ne soumettre que les motifs modifiés
        const updatePromises = Object.keys(this.modifiedMotifs).map(async id => {
          const response = await axios.post(`http://localhost:8080/api/presence/${id}/motif`, { motif: this.modifiedMotifs[id] }, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.status !== 200) {
            throw new Error(`Failed to update motif for ID ${id}`);
          }
        });

        await Promise.all(updatePromises);

        // Afficher un message de succès stylisé
        this.showSnackbar('Les motifs modifiés ont été mis à jour avec succès', 'success');

        // Réinitialiser les motifs modifiés
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
    this.fetchPresenceData(this.semestre);
  },
};
</script>

<style scoped>
.semestre-buttons {
  margin-bottom: 20px;
}

.active {
  background-color: #1976d2;
  color: white;
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
