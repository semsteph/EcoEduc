<template>
  <div class="eleve-item">
    <div id="bulletin" class="eleve-details">
      <div v-if="annees.length" class="annee-choix no-pdf">
        <span>Année :</span>
        <button
          v-for="a in annees"
          :key="a.id"
          type="button"
          class="semestre-btn"
          :class="{ active: anneeChoisie === a.id }"
          @click="choisirAnnee(a.id)"
        >{{ a.nom }}</button>
      </div>

      <div v-if="!semestres.length" class="no-data">
        Aucun bulletin pour {{ nomAnnee }} pour l'instant.
      </div>

      <template v-else>
        <div class="semestres">
          <button
            v-for="semestre in semestres"
            :key="semestre.semestre_id"
            @click="selectSemestre(semestre.semestre_id)"
            :class="{ active: selectedSemestre === semestre.semestre_id }"
            class="semestre-btn no-pdf"
          >
            {{ semestre.nom }}
          </button>
        </div>
        <BulletinOfficiel v-if="bulletinCourant" v-bind="bulletinCourant" />
      </template>
      <div v-if="semestres.length && !bulletinCourant" class="no-data">Aucune donnée disponible pour ce semestre.</div>
    </div>
  </div>
</template>
<script>
import axios from "axios";
import BulletinOfficiel from "@/components/BulletinOfficiel.vue";

export default {
  components: { BulletinOfficiel },
  props: {
    childId: {
      type: Number,
      required: true,
    },
    anneeScolaire: {
      type: String,
      required: true
    },
    anneeScolaireId: {
      type: Number,
      required: true
    },
  },
  setup() {
    // Semestre affiché, conservé dans l'URL (?semestre=...).
    const selectedSemestre = useUrlState("semestre", null, { type: "number" });
    return { selectedSemestre };
  },
  data() {
    return {
      semestres: [],
      filteredData: [],
      moySem: 0,
      moyAn: null,
      decision: null,
      conduite: "",
      rang: "",
      mention: "",
      childNom: "",
      childPrenom: "",
      childClasse: "",
      annees: [],
      anneeChoisie: null,
      donnees: null,
    };
  },
  computed: {
    bulletinCourant() {
      const d = this.donnees;
      const sem = this.semestres.find((x) => x.semestre_id === this.selectedSemestre);
      if (!d || !sem) return null;
      return {
        ecole: { nom: d.etablissementNom || '', annee: d.anneeNom || this.nomAnnee },
        eleve: { nom: d.eleveNom, prenom: d.elevePrenom, classe: d.classeNom, matricule: d.matricule, sexe: d.sexe, dateNaissance: d.dateNaissance, photo: d.photo },
        periode: sem.nom,
        lignes: (sem.bulletins || []).map((b) => ({ matiere: b.matiere, coef: b.coef, moy: b.moy, moycoef: b.moycoef })),
        conduite: sem.conduite,
        resultats: { moyenne: sem.moySem, rang: sem.rang, mention: sem.mention, moyenneAnnuelle: sem.moyAn, rangAnnuel: sem.rangAnnuel, effectifAnnuel: sem.effectifAnnuel, decision: sem.decision },
        stats: sem.stats || null,
      };
    },
    nomAnnee() {
      const a = this.annees.find((x) => x.id === this.anneeChoisie);
      return a ? a.nom : this.anneeScolaire;
    },
  },
  methods: {
    choisirAnnee(id) {
      this.anneeChoisie = id;
      this.selectedSemestre = null;
      this.fetchData();
    },
    async fetchData() {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(
      `/api/bulletined/${this.childId}/${this.anneeChoisie || this.anneeScolaireId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = response.data;
    this.donnees = data && data.semestres ? data : null;

    // Vérification si data est vide ou non structuré comme prévu
    if (!data || !data.semestres || data.semestres.length === 0) {
      this.semestres = [];
      this.childNom = "";
      this.childPrenom = "";
      this.childClasse = "";
      return;
    }

    this.semestres = data.semestres.map((semestre) => ({
      semestre_id: semestre.semestre_id,
      nom: semestre.nom,
      bulletins: semestre.bulletins,
      total: semestre.total,
      moySem: semestre.moySem,
      moyAn: semestre.moyAn,
      rang: semestre.rang,
      mention: semestre.mention,
      conduite: semestre.conduite,
      decision: semestre.decision,
      stats: semestre.stats,
      rangAnnuel: semestre.rangAnnuel,
      effectifAnnuel: semestre.effectifAnnuel,
    }));

    this.childNom = data.eleveNom;
    this.childPrenom = data.elevePrenom;
    this.childClasse = data.classeNom;

    if (this.semestres.length > 0) {
      // Semestre de l'URL s'il existe, sinon le premier.
      const fromUrl = this.semestres.find(
        (s) => Number(s.semestre_id) === this.selectedSemestre
      );
      this.selectedSemestre = fromUrl ? fromUrl.semestre_id : this.semestres[0].semestre_id;
      this.filterBySemestre();
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des données", error);
  }
},

    filterBySemestre() {
      const selectedSemestreData = this.semestres.find(
        (semestre) => semestre.semestre_id === this.selectedSemestre
      );

      if (selectedSemestreData) {
        const uniqueBulletins = selectedSemestreData.bulletins.reduce((acc, curr) => {
          if (!acc.find((item) => item.matiere === curr.matiere)) {
            acc.push(curr);
          }
          return acc;
        }, []);

        this.filteredData = uniqueBulletins;
        this.moySem = selectedSemestreData.moySem || 0;
        this.moyAn = selectedSemestreData.moyAn || 0;
        this.rang = selectedSemestreData.rang || "";
        this.mention = selectedSemestreData.mention || "";
        this.conduite = selectedSemestreData.conduite || "Non définie";
        this.decision = selectedSemestreData.decision || "Non définie";
      } else {
        this.filteredData = [];
      }
    },
    selectSemestre(semestreId) {
      this.selectedSemestre = semestreId;
      this.filterBySemestre();
    },
    isLastSemestre(semestreId) {
      return this.semestres[this.semestres.length - 1]?.semestre_id === semestreId;
    },
  },
  async mounted() {
    // Année affichée : l'année en cours si elle a déjà des bulletins, sinon
    // la plus récente qui en a (après une clôture : l'année terminée).
    try {
      const { data } = await axios.get(`/api/bulletined/${this.childId}/annees`);
      this.annees = Array.isArray(data) ? data : [];
    } catch (e) {
      this.annees = [];
    }
    const courante = this.annees.find((a) => a.id === this.anneeScolaireId);
    this.anneeChoisie = courante ? courante.id : (this.annees[0]?.id || this.anneeScolaireId);
    this.fetchData();
  },
};
</script>



  
<style scoped>
.notes-table { font-size: 0.82rem; width: 100%; }
.notes-table th, .notes-table td { padding: 6px 4px !important; }
.annee-choix { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; font-weight: 600; }
/* Conteneur principal */
.eleve-item {
  margin: 12px auto;
  padding: 12px;
  border: 1px solid rgba(25, 118, 210, 0.18);
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  max-width: 100%;
}

.eleve-info h3 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

/* Bouton Télécharger PDF */
.download-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.3s ease;
  min-height: 32px;
}

.download-btn:hover {
  background-color: #45a049;
}

/* Boutons des semestres */
.semestres {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.semestre-btn {
  flex: 0 1 calc(33.33% - 8px); /* Ajuste la taille */
  text-align: center;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 8px;
  cursor: pointer;
  font-size: 14px;
}

.semestre-btn.active {
  background-color: #0056b3;
}

.semestre-btn:hover {
  background-color: #0056b3;
}

/* Table adaptative */
.table-container {
  overflow-x: auto;
}

.notes-table {
  width: 100%;
  min-width: 420px;
  border-collapse: collapse;
  margin-top: 20px;
}

.notes-table th,
.notes-table td {
  border: 1px solid #007bff;
  padding: 8px;
  text-align: center;
}

/* Responsive design */
@media (max-width: 768px) {
  .semestre-btn {
    font-size: 12px;
    padding: 6px;
  }

  .notes-table th,
  .notes-table td {
    font-size: 12px;
  }
}

@media (max-width: 600px) {
  /* Téléphone : pas de grand cadre autour du bulletin. */
  .eleve-item {
    margin: 4px 0;
    padding: 4px 0;
    border: none;
    background: transparent;
    box-shadow: none;
  }
}

@media (max-width: 480px) {
  .semestre-btn {
    font-size: 13px;
    padding: 6px;
    min-height: 32px;
    flex: 0 1 calc(50% - 8px); /* Sur mobiles, deux boutons par ligne */
  }

  .notes-table th,
  .notes-table td {
    font-size: 13px;
    padding: 8px 6px;
  }

  .download-btn {
    font-size: 12px;
    padding: 8px 10px;
  }
}
</style>