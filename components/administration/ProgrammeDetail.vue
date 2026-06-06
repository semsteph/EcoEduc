<template>
  <v-container
    fluid
    class="pa-4 bg-lighten-4"
    style="background-color: #f5f7fa; min-height: 100vh;"
  >
    <v-card class="mb-5 rounded-lg border-bottom-blue" elevation="2">
      <v-card-text class="d-flex align-center flex-wrap py-4">
        <div class="d-flex align-center">
          <v-icon color="#1A237E" size="32" class="mr-3">mdi-calendar-clock</v-icon>
          <div>
            <h1 class="text-h5 font-weight-black mb-0" style="color:#1A237E;">
              Programme Hebdomadaire
            </h1>
            <span class="text-subtitle-2 grey--text">
              {{ className }} • {{ anneeScolaire }}
            </span>
          </div>
        </div>

        <v-spacer></v-spacer>

        <div class="mt-3 mt-sm-0">
          <v-btn color="#1A237E" dark depressed class="rounded-pill mr-2 px-6" @click="dialog = true">
            <v-icon left>mdi-plus</v-icon> Ajouter
          </v-btn>
          <v-btn color="success" dark depressed class="rounded-pill px-6" @click="telechargerProgrammePDF">
            <v-icon left>mdi-file-pdf-box</v-icon> PDF
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-card elevation="2" class="rounded-lg overflow-hidden">
      <v-simple-table class="modern-table">
        <template v-slot:default>
          <thead>
            <tr>
              <th class="table-header first-col">MATIÈRES</th>
              <th
                v-for="j in joursDeLaSemaine"
                :key="j.value"
                class="table-header text-center"
              >
                {{ j.label.toUpperCase() }}
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="matiere in matieres" :key="matiere.id" class="table-row">
              <td class="font-weight-bold first-col-cell">{{ matiere.nom }}</td>

              <td
                v-for="jour in joursDeLaSemaine"
                :key="jour.value"
                class="text-center cell-content"
              >
                <div v-if="matiere[jour.value]" class="programme-chip">
                  <div class="time-text">{{ matiere[jour.value] }}</div>

                  <v-btn
                    icon
                    x-small
                    class="delete-icon"
                    @click="supprimerProgramme(matiere.id, jour.value)"
                  >
                    <v-icon size="14" color="red darken-2">mdi-close-circle</v-icon>
                  </v-btn>
                </div>

                <div v-else class="empty-cell">—</div>
              </td>
            </tr>
          </tbody>
        </template>
      </v-simple-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="450">
      <v-card class="rounded-lg">
        <v-toolbar color="#1A237E" dark flat>
          <v-toolbar-title>Nouveau créneau</v-toolbar-title>
        </v-toolbar>

        <v-card-text class="pa-6">
          <v-select
            label="Jour"
            v-model="nouveauProgramme.jour"
            :items="joursDeLaSemaine"
            item-title="label"
            item-value="value"
            outlined
            dense
          />

          <v-text-field
            label="Horaire (ex: 08h - 10h)"
            v-model="nouveauProgramme.horaire"
            outlined
            dense
          />

          <v-select
            label="Matière"
            :items="matiereOptions"
            v-model="nouveauProgramme.matiereId"
            item-title="nom"
            item-value="id"
            outlined
            dense
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn text @click="fermerDialog" class="px-6">Annuler</v-btn>
          <v-btn color="#1A237E" dark depressed @click="ajouterProgramme" class="px-6">
            Valider
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3500">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script>
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API = "http://localhost:8080/api";

export default {
  name: "ProgrammeDetail",
  props: {
    classId: { type: Number, required: true },
    className: { type: String, required: true },
    etablissementId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },

  data() {
    return {
      matieres: [],
      matiereOptions: [],
      dialog: false,

      snackbar: false,
      snackbarMessage: "",
      snackbarColor: "black",

      nouveauProgramme: { jour: "", horaire: "", matiereId: null },

      joursDeLaSemaine: [
        { label: "Lundi", value: "lundi" },
        { label: "Mardi", value: "mardi" },
        { label: "Mercredi", value: "mercredi" },
        { label: "Jeudi", value: "jeudi" },
        { label: "Vendredi", value: "vendredi" },
      ],
    };
  },

  methods: {
    notify(message, color = "black") {
      this.snackbarMessage = message;
      this.snackbarColor = color;
      this.snackbar = true;
    },

    handleAxiosError(err, fallback = "Erreur serveur") {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;

      this.notify(apiMsg || fallback, "red darken-2");
      console.error("AXIOS ERROR:", err?.response || err);
    },

    async fetchData() {
      try {
        const resMat = await axios.get(`${API}/matiere/${this.classId}`);
        this.matiereOptions = Array.isArray(resMat.data) ? resMat.data : [];

        await this.fetchProgrammes();
      } catch (err) {
        this.handleAxiosError(err, "Impossible de charger les matières");
      }
    },

    async fetchProgrammes() {
      try {
        const res = await axios.get(`${API}/programmes/${this.classId}`, {
          params: {
            etablissementId: this.etablissementId,
            anneeScolaireId: this.anneeScolaireId,
          },
        });

        const programmes = Array.isArray(res.data) ? res.data : [];
        this.matieres = this.mapProgrammes(programmes);
      } catch (err) {
        this.handleAxiosError(err, "Impossible de charger le programme");
      }
    },

    mapProgrammes(programmes) {
      const base = (this.matiereOptions || []).map((m) => ({
        id: m.id,
        nom: m.nom,
        lundi: "",
        mardi: "",
        mercredi: "",
        jeudi: "",
        vendredi: "",
      }));

      for (const p of programmes) {
        const matiereId =
          p.matiere_id ?? p["matière_id"] ?? p.matiereId ?? p.matiereID;

        const jour = (p.jour || "").toString().trim().toLowerCase();
        const horaire = (p.horaire || "").toString().trim();

        const row = base.find((item) => Number(item.id) === Number(matiereId));
        if (row && row[jour] !== undefined) {
          row[jour] = horaire;
        }
      }

      return base;
    },

    fermerDialog() {
      this.dialog = false;
      this.nouveauProgramme = { jour: "", horaire: "", matiereId: null };
    },

    async ajouterProgramme() {
      try {
        const jour = (this.nouveauProgramme.jour || "").trim().toLowerCase();
        const horaire = (this.nouveauProgramme.horaire || "").trim();
        const matiereId = this.nouveauProgramme.matiereId;

        if (!jour || !horaire || !matiereId) {
          this.notify("Veuillez remplir Jour, Horaire et Matière.", "orange darken-2");
          return;
        }

        const payload = {
          classId: this.classId,
          etablissementId: this.etablissementId,
          anneeScolaireId: this.anneeScolaireId,
          jour,
          horaire,
          matiereId,
          matiere_id: matiereId,
        };

        await axios.post(`${API}/programme`, payload);

        this.notify("Ajouté avec succès", "success");
        this.fermerDialog();
        await this.fetchProgrammes();
      } catch (err) {
        this.handleAxiosError(err, "Ajout impossible");
      }
    },

    async supprimerProgramme(matiereId, jour) {
      try {
        await axios.delete(`${API}/programme`, {
          data: {
            classId: this.classId,
            etablissementId: this.etablissementId,
            anneeScolaireId: this.anneeScolaireId,
            jour: (jour || "").toLowerCase(),
            matiereId,
            matiere_id: matiereId,
          },
        });

        this.notify("Supprimé", "black");
        await this.fetchProgrammes();
      } catch (err) {
        this.handleAxiosError(err, "Suppression impossible");
      }
    },

    telechargerProgrammePDF() {
      const doc = new jsPDF();
      doc.text(`Programme - ${this.className}`, 14, 15);

      autoTable(doc, {
        head: [["Matières", "Lun", "Mar", "Mer", "Jeu", "Ven"]],
        body: this.matieres.map((m) => [
          m.nom,
          m.lundi || "",
          m.mardi || "",
          m.mercredi || "",
          m.jeudi || "",
          m.vendredi || "",
        ]),
        startY: 20,
      });

      doc.save(`Programme_${this.className}.pdf`);
    },
  },

  created() {
    this.fetchData();
  },
};
</script>

<style scoped>
.border-bottom-blue {
  border-bottom: 4px solid #1A237E !important;
}

.modern-table {
  background-color: white !important;
}

.table-header {
  background-color: #1A237E !important;
  color: white !important;
  font-weight: 600 !important;
  letter-spacing: 1px;
  height: 50px !important;
}

.first-col {
  position: sticky;
  left: 0;
  z-index: 2;
  background-color: #0D1442 !important;
}

.first-col-cell {
  background-color: #f8f9fa;
  color: #1A237E;
  border-right: 2px solid #eee !important;
  position: sticky;
  left: 0;
  z-index: 2;
}

.table-row:hover {
  background-color: #f1f4ff !important;
}

.cell-content {
  padding: 12px !important;
  border-bottom: 1px solid #edf2f7;
  min-width: 120px;
}

.programme-chip {
  background: #E8EAF6;
  border: 1px solid #C5CAE9;
  border-radius: 8px;
  padding: 8px 24px 8px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.3s;
  min-height: 38px;
}

.programme-chip:hover {
  background: white;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.time-text {
  color: #1A237E;
  font-weight: 700;
  font-size: 0.85rem;
  line-height: 1.2;
  text-align: center;
  width: 100%;
}

.empty-cell {
  color: #e0e0e0;
  font-size: 1.2rem;
}

.delete-icon {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px !important;
  height: 18px !important;
  min-width: 18px !important;
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 50%;
  z-index: 3;
}

.delete-icon::before {
  display: none !important;
}

.v-data-table__wrapper {
  overflow-x: auto;
}

@media (max-width: 600px) {
  .time-text {
    font-size: 0.75rem;
  }

  .table-header {
    font-size: 0.7rem !important;
    padding: 0 8px !important;
  }

  .programme-chip {
    padding: 6px 20px 6px 6px;
    min-height: 34px;
  }

  .delete-icon {
    width: 16px !important;
    height: 16px !important;
    min-width: 16px !important;
    top: -5px;
    right: -5px;
  }
}
</style>