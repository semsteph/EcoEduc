<template>
  <v-app>
    <v-container>
      <!-- Semester Buttons -->
      <v-row>
        <v-col
          v-for="semester in semesters"
          :key="semester"
          cols="auto"
        >
          <v-btn
            :color="getButtonColor(semester)"
            @click="changeSemester(semester)"
            :class="{ 'v-btn--active': currentSemester === semester }"
          >
            {{ semester }}
          </v-btn>
        </v-col>
      </v-row>

      <!-- Spacer for margin -->
      <v-spacer class="my-4"></v-spacer>

      <!-- Data Table -->
      <v-data-table
        :headers="headers"
        :items="students"
        item-key="id"
        class="elevation-1"
      >
        <template v-slot:top>
          <v-toolbar flat>
            <v-toolbar-title>Gérer Présence</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="save">Sauvegarder</v-btn>
          </v-toolbar>
        </template>

        <!-- Data Table Slots -->
        <template v-slot:item.name="{ item }">
          <span>{{ item.name }}</span>
        </template>
        <template v-slot:item.date="{ item }">
          <v-text-field
            v-model="item.date"
            label="Date"
            type="date"
          ></v-text-field>
        </template>
        <template v-slot:item.time="{ item }">
          <v-text-field
            v-model="item.time"
            label="Heure"
            placeholder="17h00-18h00"
          ></v-text-field>
        </template>
        <template v-slot:item.status="{ item }">
          <v-select
            v-model="item.status"
            :items="statuses"
            label="Statut"
          ></v-select>
        </template>

        <!-- Bottom Button -->
        <template v-slot:bottom>
          <v-row class="mt-4">
            <v-col class="text-center">
              <v-btn color="primary" @click="$emit('back')">Retour</v-btn>
              <div id="message" style="display: none; padding: 10px; background-color: #dff0d8; color: #3c763d; border: 1px solid #d6e9c6; border-radius: 5px; margin-top: 20px;"></div>

            </v-col>
          </v-row>
        </template>
      </v-data-table>
    </v-container>
  </v-app>
</template>

<script>
import axios from 'axios';

export default {
  props: {
    classeId: {
      type: Number,
      required: true, 
    },
    subjectId: {
      type: Number,
      required: true, 
    }  
  },
  data() {
    return {
      currentSemester: 'Semestre 1',
      semesters: ['Semestre 1', 'Semestre 2'],
      headers: [
        { title: 'Nom/Prenom', value: 'name' },
        { title: 'Date', value: 'date' },
        { title: 'Heure', value: 'time' },
        { title: 'Statut', value: 'status' },
      ],
      statuses: ['Présent', 'Absent', 'Permissionaire'],
      students: [], // Initialement vide
    };
  },
  watch: {
    subjectId(newVal) {
      console.log('L\'ID de la matière a été mis à jour:', newVal);
      // Logique pour mettre à jour les classes en fonction de la nouvelle matière sélectionnée
    }
  },
  methods: {
    getButtonColor(semester) {
      return this.currentSemester === semester ? 'primary' : 'secondary';
    },
    changeSemester(semester) {
      this.currentSemester = semester;
      this.getStudents();
    },
    async getStudents() {
  try {
    const response = await axios.get(`http://localhost:8080/api/classes/${this.classeId}/eleves`);
    
    this.students = response.data.map(student => ({
      ...student,
      name: `${student.nom} ${student.prenom}`, // Concatène nom et prénom
      date: '', // Date par défaut (peut être modifié ultérieurement)
      time: '17h00-18h00', // Heure par défaut
      status: '', // Statut par défaut (à définir plus tard)
    }));
    
  } catch (error) {
    console.error('Erreur lors de la récupération des élèves:', error);
  }
},
async save() {
  try {
    const dataToSave = this.students.map(student => ({
      eleveId: student.id,
      date: student.date,
      time: student.time,
      status: student.status,
      subjectId: this.subjectId,
      classeId: this.classeId,
    }));

    // Envoie les données à l'API
    await axios.post('http://localhost:8080/api/presence', dataToSave);
    console.log('Données sauvegardées:', dataToSave);

    // Réinitialiser les champs des étudiants après la sauvegarde
    this.students = this.students.map(student => ({
      ...student,
      date: '',
      time: '',  // Réinitialiser l'heure si nécessaire
      status: '', // Réinitialiser le statut
    }));

    // Afficher un message de succès
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = 'Les données ont été sauvegardées avec succès !';
    messageDiv.style.display = 'block';
    messageDiv.className = 'success-message';

    // Masquer le message après 5 secondes
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 5000);

  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données:', error);

    // Afficher un message d'erreur
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = 'Une erreur est survenue lors de la sauvegarde des données.';
    messageDiv.style.display = 'block';
    messageDiv.className = 'error-message';

    // Masquer le message après 5 secondes
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 5000);
  }
}

  },

  created() {
    this.getStudents();
  },
  mounted(){
    console.log(this.subjectId);
  }
};
</script>

<style>
.v-btn--active {
  font-weight: bold;
}
.success-message {
  display: none;
  padding: 10px;
  background-color: #dff0d8;
  color: #3c763d;
  border: 1px solid #d6e9c6;
  border-radius: 5px;
  margin-top: 20px;
}

.error-message {
  display: none;
  padding: 10px;
  background-color: #f2dede;
  color: #a94442;
  border: 1px solid #ebccd1;
  border-radius: 5px;
  margin-top: 20px;
}

</style>
