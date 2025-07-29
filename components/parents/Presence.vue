<template>
  <div class="presence-container">
    <!-- Bouton Retour -->
    <v-btn icon @click="$emit('back')" class="back-button">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>

    <!-- Titre -->
    <h1 class="title">Présences pour le :</h1>

    <!-- Message si aucune donnée -->
    <div v-if="presenceData.length === 0" class="no-data-message">
      Les présences ne sont pas encore disponibles cette année.
    </div>

    <!-- Liste des semestres -->
    <v-expansion-panels v-else v-model="selectedPanel" multiple class="semesters-panel">
      <v-expansion-panel v-for="(semestre, index) in semestres" :key="index">
        <v-expansion-panel-title>
          {{ semestre }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <!-- Tableau des présences -->
          <div class="table-container">
            <v-data-table
              :headers="headers"
              :items="filteredPresence(semestre)"
              item-key="id"
              class="elevation-1 presence-table"
              dense
              mobile-breakpoint="0"
            >
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
                    class="elevation-0 motif-textarea"
                    outlined
                    dense
                  ></v-textarea>
                </td>
              </template>
            </v-data-table>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Boutons d'action -->
    <div class="action-buttons">
      <v-btn color="primary" @click="submitMotifs" class="action-btn">
        Envoyer
      </v-btn>
      <v-btn color="secondary" @click="$emit('back')" class="action-btn">
        Retour
      </v-btn>
    </div>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" top right>
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script>
import axios from "axios";
import dayjs from "dayjs";

export default {
  props: {
    childId: {
      type: Number,
      required: true,
    },
    anneeScolaire: {
      type: String,
      required: true,
    },
    anneeScolaireId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      semestres: [],
      selectedPanel: null,
      headers: [
        { title: "Date", value: "date", align: "start", width: "20%" },
        { title: "Matière", value: "matiere", width: "20%" },
        { title: "Heure", value: "heure", width: "20%" },
        { title: "Présence", value: "presence", width: "20%" },
        { title: "Motif", value: "motif", width: "20%" },
      ],
      presenceData: [],
      modifiedMotifs: {},
      snackbar: {
        show: false,
        message: "",
        color: "",
      },
    };
  },
  methods: {
    async fetchIncidentsData() {
      try {
        const response = await axios.get("http://localhost:8080/api/presence", {
          params: {
            childId: this.childId,
            anneeScolaireId: this.anneeScolaireId,
          },
        });

        this.presenceData = response.data;

        const uniqueSemestres = [
          ...new Set(this.presenceData.map((item) => item.semestreNom)),
        ];
        this.semestres = uniqueSemestres;

      } catch (error) {
        console.error("Erreur lors de la récupération des données de présence :", error);
        this.showSnackbar("Erreur lors du chargement des données de présence", "error");
      }
    },

    filteredPresence(semestre) {
      return this.presenceData.filter((item) => item.semestreNom === semestre);
    },
    formaterDate(date) {
      return dayjs(date).format("DD/MM/YYYY");
    },
    handleMotifChange(id, motif) {
      this.modifiedMotifs[id] = motif;
    },
    async submitMotifs() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          this.$router.push("/login");
          return;
        }

        const updatePromises = Object.keys(this.modifiedMotifs).map(async (id) => {
          await axios.post(
            `http://localhost:8080/api/presence/${id}/motif`,
            { motif: this.modifiedMotifs[id] },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        });

        await Promise.all(updatePromises);

        this.showSnackbar("Motifs enregistrés avec succès", "success");
        this.modifiedMotifs = {};
      } catch (error) {
        console.error("Erreur lors de la mise à jour des motifs :", error);
        this.showSnackbar("Erreur lors de la mise à jour des motifs", "error");
      }
    },
    showSnackbar(message, color) {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },
  },
  mounted() {
    this.fetchIncidentsData();
  },
};
</script>

<style scoped>
.presence-container {
  padding: 16px;
  font-family: Arial, sans-serif;
}

.title {
  font-size: 22px;
  margin-bottom: 10px;
  text-align: center;
}

.no-data-message {
  text-align: center;
  color: #ff5252;
  font-size: 18px;
  margin-top: 20px;
}

.table-container {
  overflow-x: auto;
  width: 100%;
}

.presence-table {
  min-width: 600px;
}

.motif-textarea {
  min-width: 100px;
}

/* Responsive : mobiles et tablettes */
@media (max-width: 768px) {
  .title {
    font-size: 18px;
  }

  .no-data-message {
    font-size: 16px;
  }

  .presence-table {
    font-size: 12px;
    min-width: 100%;
  }

  .motif-textarea {
    font-size: 12px;
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 20px;
    align-items: center;
  }

  .action-btn {
    width: 100%;
    font-size: 14px;
  }

  .back-button {
    margin-bottom: 10px;
  }
}

/* Très petits écrans (ex. téléphones) */
@media (max-width: 480px) {
  .title {
    font-size: 16px;
  }

  .presence-table {
    font-size: 11px;
  }

  .motif-textarea {
    font-size: 11px;
  }
}
</style>
