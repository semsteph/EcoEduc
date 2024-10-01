<template>
  <div>
    <v-card color="blue lighten-4" class="pa-4">
      <v-card-title>Notifications</v-card-title>
      <v-card-text>
        <div v-if="alerts.length > 0">
          <div v-for="(alert, index) in alerts" :key="index" class="mb-3">
            <v-alert type="error" :value="true" class="ma-3">
              L'élève {{ alert.studentName }} de la classe {{ alert.className }} est absent trois fois successivement à des dates consécutives.
              <v-btn color="primary" class="mt-3" @click="contactParent(alert.studentId)">
                Contacter le Parent
              </v-btn>
            </v-alert>
          </div>
        </div>
        <div v-else>
          Pas d'alertes pour le moment.
        </div>
      </v-card-text>
    </v-card>

    
    <v-dialog v-model="dialog" max-width="500px">
      <v-card class="elevation-5 rounded-dialog green-dialog">
        <v-card-title class="dialog-title">Informations du Parent</v-card-title>
        <v-card-text>
          <div v-if="parentInfo">
            <p><strong>Nom:</strong> {{ parentInfo.nom }}</p>
            <p><strong>Prénom:</strong> {{ parentInfo.prenom }}</p>
            <p><strong>Contact:</strong> {{ parentInfo.contact }}</p>
            <p><strong>Email:</strong> {{ parentInfo.email }}</p>
          </div>
          <div v-else>
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <span>Chargement des informations...</span>
          </div>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="dialog = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'NotificationComponent',
  data() {
    return {
      alerts: [],
      dialog: false,
      parentInfo: null
    };
    
  },
  async created() {
  try {
    const response = await axios.get('http://localhost:8080/api/presenceid');
    const presenceData = response.data;

    const absentStudentIds = this.findAbsentStudent(presenceData);
   

    for (const studentId of absentStudentIds) {
      // Utilisez `studentId` pour faire les appels API
      const studentResponse = await axios.get(`http://localhost:8080/api/eleve/${studentId}`);
      const studentData = studentResponse.data;
      const classId = studentData.classe_id;
      console.log(studentResponse.data);

      const classResponse = await axios.get(`http://localhost:8080/api/classes/${classId}`);
      const classData = classResponse.data;

      this.alerts.push({
        studentId: studentId, // Assurez-vous d'utiliser `studentId` ici
        studentName: `${studentData.prenom} ${studentData.nom}`,
        className: classData.nom
      });
    }

    // Met à jour le nombre d'alertes dans le composant parent
    this.$emit('update-notification-count', this.alerts.length);

  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
  }
},

  methods: {

    async contactParent(studentId) {
      try {
        // Récupère l'id du parent a l'eleve
        const studentResponse = await axios.get(`http://localhost:8080/api/eleve/${studentId}`);
        console.log(studentResponse);
        const parentId = studentResponse.data.Parents_id;

        // Récupère les informations du parent à partir de l'API
        const parentResponse = await axios.get(`http://localhost:8080/api/parentid/${parentId}`);
        this.parentInfo = parentResponse.data;

        // Affiche le dialogue avec les informations du parent
        this.dialog = true;
      } catch (error) {
        console.error('Erreur lors de la récupération des informations du parent:', error);
      }
    },
    findAbsentStudent(presenceData) {
      const absences = {};
      const sortedData = presenceData.sort((a, b) => new Date(a.date) - new Date(b.date));
      const studentsWithThreeConsecutiveAbsences = [];

      for (const record of sortedData) {
        if (record.statut === 'Absent') {
          if (!absences[record.eleve_id]) {
            absences[record.eleve_id] = [];
          }
          absences[record.eleve_id].push(new Date(record.date));
        }
      }

      for (const [studentId, dates] of Object.entries(absences)) {
        let consecutiveAbsences = 1;

        for (let i = 1; i < dates.length; i++) {
          const diffInDays = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);

          if (diffInDays === 1) {
            consecutiveAbsences++;
            if (consecutiveAbsences >= 3) {
              studentsWithThreeConsecutiveAbsences.push(studentId);
              break;
            }
          } else {
            consecutiveAbsences = 1;
          }
        }
      }

      return studentsWithThreeConsecutiveAbsences;
    },
   
  }
};
</script>

<style scoped>
.rounded-dialog {
  border-radius: 20px;
  background-color: #f5f5f5;
}

green-dialog {
  background-color: #4caf50; /* Couleur verte */
  color: white;
}
.dialog-title {
  font-size: 20px;
  font-weight: bold;
  color: #3f51b5;
}

.dialog-actions {
  padding-right: 16px;
  padding-bottom: 16px;
}

v-progress-circular {
  margin-right: 10px;
}
</style>
