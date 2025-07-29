<template>
  <div class="notification-wrapper">
    <!-- Carte principale -->
    <v-card :elevation="4" class="pa-4 card-style">
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-h6 text-md-h5 text-primary d-flex align-center">
          <v-icon color="primary" class="mr-2 notification-icon">mdi-bell-alert</v-icon>
          Notifications
        </span>
      </v-card-title>
      <v-divider class="my-2"></v-divider>

      <v-card-text class="pp">
        <div v-if="alerts.length > 0">
          <v-row dense justify="center">
            <v-col
              v-for="(alert, index) in alerts"
              :key="index"
              cols="12"
              md="10"
              lg="8"
            >
              <v-alert
                type="warning"
                class="d-block pa-4 alert-card"
                border="start"
                border-color="red"
                colored-border
              >
                <div class="alert-text">
                  <span class="text-body">
                    L'élève <strong>{{ alert.studentName }}</strong> de la classe
                    <strong>{{ alert.className }}</strong> est absent trois fois successivement à des dates consécutives.
                  </span>
                </div>
                <div class="d-flex justify-end mt-2">
                  <v-btn
                    color="primary"
                    class="text-sm-button"
                    variant="elevated"
                    @click="contactParent(alert.studentId)"
                  >
                    <v-icon left class="mr-1">mdi-account-voice</v-icon>
                    Contacter le Parent
                  </v-btn>
                </div>
              </v-alert>
            </v-col>
          </v-row>
        </div>
        <div v-else class="text-caption text-center mt-4 text-grey">
          <v-icon class="mb-2" size="32">mdi-check-circle-outline</v-icon>
          <div>Aucune alerte pour le moment</div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Dialog parent -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card class="elevation-10 rounded-dialog">
        <v-card-title class="dialog-title">
          <v-icon class="mr-2" color="primary">mdi-account-details</v-icon>
          Informations du Parent
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4">
          <div v-if="parentInfo">
            <p><v-icon class="mr-2">mdi-account</v-icon><strong>Nom :</strong> {{ parentInfo.nom }}</p>
            <p><v-icon class="mr-2">mdi-account-outline</v-icon><strong>Prénom :</strong> {{ parentInfo.prenom }}</p>
            <p><v-icon class="mr-2">mdi-phone</v-icon><strong>Contact :</strong> {{ parentInfo.contact }}</p>
            <p><v-icon class="mr-2">mdi-email</v-icon><strong>Email :</strong> {{ parentInfo.email }}</p>
          </div>
          <div v-else class="d-flex align-center">
            <v-progress-circular indeterminate color="primary" class="mr-2"></v-progress-circular>
            <span>Chargement des informations...</span>
          </div>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="flat" @click="dialog = false">
            <v-icon left small>mdi-close-circle</v-icon>
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'NotificationComponent',
  props: {
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  data() {
    return {
      alerts: [],
      dialog: false,
      parentInfo: null,
    };
  },
  async created() {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/presenceidd/${this.etablissementId}/${this.anneeScolaireId}`
      );
      const presenceData = response.data;
      const absentStudentIds = this.findAbsentStudent(presenceData);

      for (const studentId of absentStudentIds) {
        const studentResponse = await axios.get(`http://localhost:8080/api/eleve/${studentId}`);
        const studentData = studentResponse.data;
        const classResponse = await axios.get(`http://localhost:8080/api/classes/${studentData.classe_id}`);

        this.alerts.push({
          studentId,
          studentName: `${studentData.prenom} ${studentData.nom}`,
          className: classResponse.data.nom,
        });
      }

      this.$emit('update-notification-count', this.alerts.length);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
    }
  },
  methods: {
    async contactParent(studentId) {
      try {
        const studentResponse = await axios.get(`http://localhost:8080/api/eleve/${studentId}`);
        const parentId = studentResponse.data.Parents_id;
        const parentResponse = await axios.get(`http://localhost:8080/api/parentid/${parentId}`);

        this.parentInfo = parentResponse.data;
        this.dialog = true;
      } catch (error) {
        console.error("Erreur lors de la récupération des informations du parent:", error);
      }
    },
    findAbsentStudent(presenceData) {
      const absences = {};
      const sortedData = presenceData.sort((a, b) => new Date(a.date) - new Date(b.date));
      const studentsWithThreeConsecutiveAbsences = [];

      for (const record of sortedData) {
        if (record.statut === 'Absent') {
          if (!absences[record.eleve_id]) absences[record.eleve_id] = [];
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
  },
};
</script>

<style scoped>
.notification-wrapper {
  max-width: 100%;
  padding: 8px;
  display: flex;
  justify-content: center;
}

.card-style {
  width: 100%;
  max-width: 1000px;
  border-radius: 16px;
  background-color: #f9fbff;
}

.alert-text {
  font-size: 16px;
  line-height: 1.6;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
}

.alert-card {
  background-color: #fff8e1;
  border-left: 5px solid red;
  border-radius: 12px;
}

.rounded-dialog {
  border-radius: 20px;
  background-color: #ffffff;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e88e5;
  display: flex;
  align-items: center;
}

.dialog-actions {
  padding-right: 16px;
  padding-bottom: 12px;
}

.text-sm-body {
  font-size: 14px;
}

.text-sm-button {
  font-size: 13px;
  padding: 6px 16px;
  min-width: auto;
}

.notification-icon {
  font-size: 28px;
}

@media (max-width: 600px) {
  .card-style {
    padding: 12px !important;
    margin: 0 auto;
  }
  .alert-text {
    font-size: 11px;
    display: block;
  }
  .dialog-title {
    font-size: 12px;
  }
  .text-sm-body {
    font-size: 10px;
  }
  .text-sm-button {
    font-size: 7px;
    padding: 6px 10px;
  }
  .pp {
    display: block;
  }
  .notification-icon {
    font-size: 18px;
  }
}
</style>
