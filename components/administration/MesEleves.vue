<template>
  <v-container fluid class="eleve-container">
    <!-- Bouton retour -->
    <v-btn
      icon
      color="primary"
      variant="text"
      class="mb-3"
      @click="$emit('back')"
      :size="$vuetify.display.smAndDown ? 'x-small' : 'default'"
    >
      <v-icon :size="$vuetify.display.smAndDown ? 16 : 24">mdi-arrow-left</v-icon>
    </v-btn>

    <!-- Titre -->
    <h2 class="title">Liste des Élèves</h2>

    <!-- Barre de recherche -->
    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="🔍 Rechercher par nom ou prénom..."
        class="search-input"
      />
    </div>

    <!-- Liste des élèves -->
    <div class="eleve-list">
      <div
        v-for="eleve in filteredEleves"
        :key="eleve.id"
        class="eleve-card"
      >
        <div class="avatar">{{ getInitials(eleve.nom, eleve.prenom) }}</div>
        <div class="eleve-info">
          <p class="eleve-nom">{{ eleve.nom }}</p>
          <p class="eleve-prenom">{{ eleve.prenom }}</p>
        </div>
        <v-icon
          color="primary"
          class="info-btn"
          @click="toggleDetails(eleve)"
        >
          mdi-information
        </v-icon>
      </div>
    </div>

    <!-- DIALOGUE AVEC LES DÉTAILS DE L'ÉLÈVE -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title class="headline">
          <v-icon class="mr-2" color="primary">mdi-account</v-icon>
          Détails de l'élève
        </v-card-title>
        <v-card-text v-if="selectedEleve">
          <p><strong>Nom :</strong> {{ selectedEleve.nom }}</p>
          <p><strong>Prénom :</strong> {{ selectedEleve.prenom }}</p>
          <p><strong>Classe :</strong> {{ selectedEleve.classe_nom }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="success" @click="voirBulletin(selectedEleve)">
            <v-icon start small>mdi-file-document</v-icon>
            Bulletin
          </v-btn>
          <v-btn text @click="dialog = false">
            <v-icon start small>mdi-close</v-icon>
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
export default {
  name: "ListeEleves",
  props: {
    etablissementId: { type: Number, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      eleves: [],
      searchQuery: "",
      selectedEleve: null,
      dialog: false
    };
  },
  computed: {
    filteredEleves() {
      const query = this.searchQuery.toLowerCase();
      return this.eleves.filter(e =>
        (e.nom + " " + e.prenom).toLowerCase().includes(query)
      );
    }
  },
  mounted() {
    this.fetchEleves();
  },
  methods: {
    async fetchEleves() {
      try {
        const response = await fetch("http://localhost:8080/api/eleves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            etablissement_id: this.etablissementId,
            annee_scolaire_id: this.anneeScolaireId
          })
        });
        this.eleves = await response.json();
      } catch (error) {
        console.error("Erreur lors du chargement des élèves :", error);
      }
    },
    getInitials(nom, prenom) {
      return nom.charAt(0).toUpperCase() + prenom.charAt(0).toUpperCase();
    },
    toggleDetails(eleve) {
      this.selectedEleve = eleve;
      this.dialog = true;
    },
    voirBulletin(eleve) {
      alert(`Afficher le bulletin de ${eleve.nom} ${eleve.prenom}`);
    }
  }
};
</script>

<style scoped>
.eleve-container {
  max-width: 900px;
  margin: auto;
  padding: 1.5rem;
}

.title {
  text-align: center;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #2c3e50;
}

.search-bar {
  text-align: center;
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  max-width: 500px;
  padding: 10px 16px;
  font-size: 15px;
  border: 1px solid #ccc;
  border-radius: 10px;
  outline: none;
  background-color: #f9f9f9;
}

.eleve-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.eleve-card {
  display: flex;
  align-items: center;
  background: white;
  padding: 10px;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  transition: 0.2s;
}

.eleve-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.avatar {
  width: 40px;
  height: 40px;
  background: #3f51b5;
  color: white;
  border-radius: 50%;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.eleve-info {
  flex-grow: 1;
}

.eleve-nom {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.eleve-prenom {
  margin: 0;
  font-size: 13px;
  color: #7f8c8d;
}

.info-btn {
  font-size: 20px;
  cursor: pointer;
}

@media (max-width: 600px) {
  .title {
    font-size: 20px;
  }
  .search-input {
    font-size: 14px;
    padding: 8px 12px;
  }
  .eleve-card {
    padding: 8px;
  }
  .avatar {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }
  .eleve-nom {
    font-size: 15px;
  }
  .eleve-prenom {
    font-size: 12px;
  }
  .info-btn {
    font-size: 18px;
  }
}
</style>
