<template>
  <v-container fluid class="eleve-container">
    <!-- Bouton retour -->

    <!-- Titre -->
    <h2 class="title">Liste des Élèves</h2>

    <!-- Barre de recherche -->
    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="🔍 Rechercher par nom, prénom ou classe..."
        class="search-input"
      />
    </div>

    <AideEssentiel cle="nos-eleves-parent" titre="À savoir : le parent de l'élève">
      <ul class="aide-liste">
        <li>Un élève inscrit sans parent est marqué <strong>« Sans parent »</strong>. Le filtre ci-dessous les regroupe.</li>
        <li>Cliquez sur l'icône <v-icon size="16" color="warning">mdi-account-supervisor</v-icon> de l'élève : choisissez un parent déjà inscrit ou créez-le (téléphone ou e-mail suffit).</li>
        <li>Les frères et sœurs sans parent (même nom) sont proposés pour être rattachés en même temps.</li>
        <li>Parent sans e-mail : « Créer son accès » lui donne un identifiant et un mot de passe à lui remettre.</li>
      </ul>
    </AideEssentiel>

    <div class="filtres">
      <v-chip :color="filtre === 'tous' ? 'primary' : undefined" :variant="filtre === 'tous' ? 'flat' : 'outlined'" size="small" @click="filtre = 'tous'">
        Tous ({{ eleves.length }})
      </v-chip>
      <v-chip :color="filtre === 'sansParent' ? 'warning' : undefined" :variant="filtre === 'sansParent' ? 'flat' : 'outlined'" size="small" prepend-icon="mdi-account-question" @click="filtre = 'sansParent'">
        Sans parent ({{ nbSansParent }})
      </v-chip>
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
          <span v-if="!eleve.parent_id" class="sans-parent">Sans parent</span>
        </div>
        <div class="d-flex">
          <v-icon
            :color="eleve.parent_id ? 'teal' : 'warning'"
            class="info-btn mr-2"
            :title="eleve.parent_id ? 'Parent : ' + (eleve.parent_prenom || '') + ' ' + (eleve.parent_nom || '') : 'Rattacher un parent'"
            @click="ouvrirParent(eleve)"
          >
            mdi-account-supervisor
          </v-icon>
          <v-icon
            color="primary"
            class="info-btn mr-2"
            @click="toggleDetails(eleve)"
          >
            mdi-information
          </v-icon>
          <v-icon
            color="grey-darken-1"
            class="info-btn mr-2"
            @click="ouvrirEdition(eleve)"
          >
            mdi-pencil
          </v-icon>
          <v-icon
            color="error"
            class="info-btn"
            @click="ouvrirSuppression(eleve)"
          >
            mdi-delete
          </v-icon>
        </div>
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
          <p>
            <strong>Parent :</strong>
            <template v-if="selectedEleve.parent_id">
              {{ selectedEleve.parent_prenom }} {{ selectedEleve.parent_nom }}
              <span v-if="selectedEleve.parent_contact"> · {{ selectedEleve.parent_contact }}</span>
            </template>
            <span v-else class="text-warning">aucun</span>
            <v-btn size="x-small" variant="text" color="primary" @click="dialog = false; ouvrirParent(selectedEleve)">
              {{ selectedEleve.parent_id ? 'Changer' : 'Rattacher' }}
            </v-btn>
          </p>
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

    <!-- DIALOGUE PARENT -->
    <v-dialog v-model="parentDialog" max-width="560px" scrollable :fullscreen="$vuetify.display.xs">
      <AssocierParent
        v-if="parentDialog && eleveParent"
        :key="eleveParent.id"
        :eleve="eleveParent"
        :eleves="eleves"
        :etablissement-id="etablissementId"
        :annee-scolaire-id="anneeScolaireId"
        @modifie="fetchEleves"
        @fermer="parentDialog = false"
      />
    </v-dialog>

    <!-- DIALOGUE D'ÉDITION -->
    <v-dialog v-model="editDialog" max-width="500px">
      <v-card v-if="editForm">
        <v-card-title class="headline">
          <v-icon class="mr-2" color="primary">mdi-pencil</v-icon>
          Modifier l'élève
        </v-card-title>
        <v-card-text>
          <v-alert v-if="editError" type="error" density="compact" class="mb-4" closable @click:close="editError = ''">
            {{ editError }}
          </v-alert>
          <v-text-field v-model="editForm.nom" label="Nom" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="editForm.prenom" label="Prénom" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="editForm.dateNaissance" type="date" label="Date de naissance" variant="outlined" density="compact" class="mb-2" />
          <v-select v-model="editForm.sexe" :items="['M', 'F']" label="Sexe" variant="outlined" density="compact" class="mb-2" />
          <v-select
            v-model="editForm.classeId"
            :items="classes"
            item-title="nom"
            item-value="id"
            label="Classe"
            variant="outlined"
            density="compact"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="editDialog = false">Annuler</v-btn>
          <v-btn color="primary" :loading="editLoading" @click="enregistrerEdition">Enregistrer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIALOGUE DE SUPPRESSION -->
    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card v-if="eleveASupprimer">
        <v-card-title class="headline">
          <v-icon class="mr-2" color="error">mdi-delete</v-icon>
          Supprimer l'élève
        </v-card-title>
        <v-card-text>
          <v-alert v-if="deleteError" type="error" density="compact" class="mb-4" closable @click:close="deleteError = ''">
            {{ deleteError }}
          </v-alert>
          <p>
            Confirmer la suppression de
            <strong>{{ eleveASupprimer.nom }} {{ eleveASupprimer.prenom }}</strong> ?
            Cette action est irréversible.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="deleteDialog = false">Annuler</v-btn>
          <v-btn color="error" :loading="deleteLoading" @click="confirmerSuppression">Supprimer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import AideEssentiel from "@/components/AideEssentiel.vue";
import AssocierParent from "@/components/administration/AssocierParent.vue";

export default {
  name: "ListeEleves",
  components: { AideEssentiel, AssocierParent },
  props: {
    etablissementId: { type: Number, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      eleves: [],
      classes: [],
      searchQuery: "",
      filtre: "tous",
      parentDialog: false,
      eleveParent: null,
      selectedEleve: null,
      dialog: false,

      editDialog: false,
      editForm: null,
      editError: "",
      editLoading: false,

      deleteDialog: false,
      eleveASupprimer: null,
      deleteError: "",
      deleteLoading: false
    };
  },
  computed: {
    filteredEleves() {
      const query = this.searchQuery.toLowerCase();
      return this.eleves.filter(e =>
        (this.filtre !== "sansParent" || !e.parent_id) &&
        (e.nom + " " + e.prenom + " " + (e.classe_nom || "")).toLowerCase().includes(query)
      );
    },
    nbSansParent() {
      return this.eleves.filter(e => !e.parent_id).length;
    }
  },
  mounted() {
    this.fetchEleves();
    this.fetchClasses();
  },
  methods: {
    authHeaders() {
      const token = localStorage.getItem("token");
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    async fetchEleves() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/eleves", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            etablissement_id: this.etablissementId,
            annee_scolaire_id: this.anneeScolaireId
          })
        });
        const data = await response.json();
        // Réponse d'erreur du serveur (objet au lieu d'une liste) : liste vide
        // plutôt qu'un écran cassé.
        this.eleves = response.ok && Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Erreur lors du chargement des élèves :", error);
        this.eleves = [];
      }
    },
    async fetchClasses() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/classe/${this.etablissementId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.classes = response.ok ? await response.json() : [];
      } catch (error) {
        console.error("Erreur lors du chargement des classes :", error);
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
    },

    ouvrirParent(eleve) {
      this.eleveParent = eleve;
      this.parentDialog = true;
    },
    ouvrirEdition(eleve) {
      this.editError = "";
      this.editForm = {
        id: eleve.id,
        nom: eleve.nom,
        prenom: eleve.prenom,
        dateNaissance: (eleve.date_naissance || "").slice(0, 10),
        sexe: eleve.sexe || "",
        classeId: eleve.classe_id,
        parentId: eleve.parent_id
      };
      this.editDialog = true;
    },
    async enregistrerEdition() {
      this.editError = "";
      this.editLoading = true;
      try {
        const response = await fetch(`/api/eleves/${this.editForm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...this.authHeaders() },
          body: JSON.stringify(this.editForm)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          this.editError = data.message || "Erreur lors de la modification.";
          return;
        }
        this.editDialog = false;
        await this.fetchEleves();
      } catch (error) {
        console.error("Erreur lors de la modification de l'élève :", error);
        this.editError = "Erreur lors de la modification.";
      } finally {
        this.editLoading = false;
      }
    },

    ouvrirSuppression(eleve) {
      this.deleteError = "";
      this.eleveASupprimer = eleve;
      this.deleteDialog = true;
    },
    async confirmerSuppression() {
      this.deleteError = "";
      this.deleteLoading = true;
      try {
        const response = await fetch(`/api/eleves/${this.eleveASupprimer.id}`, {
          method: "DELETE",
          headers: { ...this.authHeaders() }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          this.deleteError = data.message || "Erreur lors de la suppression.";
          return;
        }
        this.deleteDialog = false;
        await this.fetchEleves();
      } catch (error) {
        console.error("Erreur lors de la suppression de l'élève :", error);
        this.deleteError = "Erreur lors de la suppression.";
      } finally {
        this.deleteLoading = false;
      }
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
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  transition: 0.2s;
}

.eleve-card:hover {
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
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

.filtres {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.aide-liste {
  margin: 0;
  padding-left: 18px;
  font-size: 0.84rem;
}

.sans-parent {
  display: inline-block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 600;
  color: #8a5300;
  background: #fff3cd;
  border-radius: 6px;
  padding: 0 6px;
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
