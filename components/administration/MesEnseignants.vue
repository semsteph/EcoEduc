<template>
  <v-container fluid class="enseignants-container">
    <!-- Barre de recherche -->
    <v-text-field
      v-model="searchQuery"
      label="🔍 Rechercher par nom ou prénom"
      prepend-inner-icon="mdi-magnify"
      clearable
      class="mb-3"
      dense
      variant="outlined"
    ></v-text-field>

    <!-- Alerte si aucun enseignant -->
    <div v-if="enseignants.length === 0" class="text-center my-5">
      <v-alert
        type="info"
        color="blue lighten-5"
        border="start"
        elevation="0"
        icon="mdi-information-outline"
        prominent
        class="alert-enseignant"
      >
        Aucun enseignant trouvé. Cliquez sur <strong>Inscrire un enseignant</strong> dans <strong>Gestion Enseignants</strong>.
      </v-alert>
    </div>

    <!-- Cartes des enseignants -->
    <v-row v-else>
      <v-col
        v-for="enseignant in filteredEnseignants"
        :key="enseignant.id"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card class="enseignant-card" elevation="0" rounded>
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2" color="primary">mdi-account-circle</v-icon>
            <span class="title">{{ enseignant.nom }} {{ enseignant.prenom }}</span>
            <v-spacer />
            <v-btn
              icon
              variant="tonal"
              color="primary"
              class="info-emploi"
              :title="`Emploi du temps de ${enseignant.prenom} ${enseignant.nom}`"
              :aria-label="`Emploi du temps de ${enseignant.prenom} ${enseignant.nom}`"
              @click="ouvrirEmploi(enseignant)"
            >
              <v-icon size="22">mdi-information-outline</v-icon>
            </v-btn>
          </v-card-title>

          <v-card-subtitle>
            <v-icon start class="me-1" size="16">mdi-email</v-icon> {{ enseignant.email }}
          </v-card-subtitle>

          <v-card-text class="text--primary">
            <p><v-icon start size="18" class="me-1">mdi-phone</v-icon> {{ enseignant.telephone }}</p>
            <p v-if="enseignant.plusieursEcoles" class="text-caption text-medium-emphasis">
              <v-icon start size="16" class="me-1">mdi-school-outline</v-icon> Enseigne aussi dans un autre établissement (même compte)
            </p>
            <p><v-icon start size="18" class="me-1">mdi-school</v-icon> Classes : <strong>{{ enseignant.classes.join(', ') }}</strong></p>
            <p><v-icon start size="18" class="me-1">mdi-book-open-variant</v-icon> Matières : <strong>{{ enseignant.matieres.join(', ') }}</strong></p>
          </v-card-text>

          <v-card-actions class="flex-wrap ga-1">
            <v-btn color="primary" variant="flat" @click="ouvrirEmploi(enseignant)" size="small">
              <v-icon start size="18">mdi-calendar-clock</v-icon> Emploi du temps
            </v-btn>
            <v-btn color="blue darken-1" variant="outlined" @click="editEnseignant(enseignant)" size="small">
              <v-icon start size="18">mdi-pencil</v-icon> Modifier
            </v-btn>
            <v-btn color="red darken-1" variant="outlined" @click="demanderSuppression(enseignant)" size="small">
              <v-icon start size="18">mdi-account-remove</v-icon> Retirer
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialogue de modification -->
    <v-dialog v-model="dialog" max-width="500" scrollable>
      <v-card rounded>
        <v-card-title class="headline d-flex align-center">
          <v-icon color="primary" class="me-2">mdi-account-edit</v-icon>
          Modifier Enseignant
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-alert v-if="erreurEdition" type="error" variant="tonal" density="compact" class="mb-2">{{ erreurEdition }}</v-alert>
          <v-alert v-if="selectedEnseignant && selectedEnseignant.plusieursEcoles" type="info" variant="tonal" density="compact" class="mb-2">
            Ce professeur enseigne aussi dans un autre établissement : c'est lui qui gère son identifiant et son mot de passe
            (« Mot de passe oublié » sur la page de connexion).
          </v-alert>
          <v-container>
            <v-row dense>
              <v-col cols="12" v-for="field in fields" :key="field.model">
                <v-text-field
                  v-model="selectedEnseignant[field.model]"
                  :label="field.label"
                  :type="field.type || 'text'"
                  :prepend-inner-icon="field.icon"
                  dense
                  outlined
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text color="grey" @click="dialog = false">
            Annuler
          </v-btn>
          <v-btn color="primary" @click="updateEnseignant">
            <v-icon start>mdi-content-save</v-icon> Enregistrer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="emploiDialog" max-width="980" scrollable :fullscreen="$vuetify.display.smAndDown">
      <v-card v-if="enseignantEmploi" class="rounded-lg edt-carte">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon color="primary" class="mr-2">mdi-calendar-clock</v-icon>
          Emploi du temps
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" aria-label="Fermer" @click="emploiDialog = false" />
        </v-card-title>
        <v-card-text class="edt-defile">
          <EmploiDuTemps :url="`/api/enseignants/${enseignantEmploi.id}/emploi-du-temps`" admin />
        </v-card-text>
      </v-card>
    </v-dialog>
    <!-- Suppression : confirmation, puis refus expliqué s'il est encore affecté -->
    <v-dialog v-model="suppression.ouvert" max-width="460">
      <v-card v-if="suppression.enseignant" class="rounded-lg">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon :color="suppression.refus ? 'warning' : 'error'" class="mr-2">{{ suppression.refus ? 'mdi-alert-circle-outline' : 'mdi-delete-alert-outline' }}</v-icon>
          {{ suppression.refus ? 'Retrait impossible' : 'Retirer cet enseignant ?' }}
        </v-card-title>
        <v-card-text>
          <template v-if="!suppression.refus">
            Retirer <strong>{{ suppression.enseignant.prenom }} {{ suppression.enseignant.nom }}</strong> de votre établissement ?
            Il/elle n'y aura plus accès. Les notes et le cahier de texte déjà saisis restent dans vos bulletins.
            <template v-if="suppression.enseignant.plusieursEcoles"> Ses autres établissements ne sont pas touchés.</template>
          </template>
          <template v-else>
            <p class="mb-2">{{ suppression.refus.message }}</p>
            <ul v-if="suppression.refus.affectations && suppression.refus.affectations.length" class="suppr-liste">
              <li v-for="(a, i) in suppression.refus.affectations" :key="i">{{ a.classe }} — {{ a.matiere }}</li>
            </ul>
          </template>
        </v-card-text>
        <v-card-actions class="flex-wrap ga-1">
          <v-spacer />
          <template v-if="!suppression.refus">
            <v-btn variant="text" @click="suppression.ouvert = false">Annuler</v-btn>
            <v-btn color="error" variant="flat" :loading="suppression.encours" @click="confirmerSuppression">Retirer</v-btn>
          </template>
          <template v-else>
            <v-btn variant="text" @click="suppression.ouvert = false">Fermer</v-btn>
            <v-btn v-if="suppression.refus.code === 'AFFECTE'" color="primary" variant="flat" to="/administration/dashbord/enseignants/repartition" @click="suppression.ouvert = false">
              Aller à la répartition
            </v-btn>
          </template>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>


<script>
import axios from 'axios';
import EmploiDuTemps from '@/components/EmploiDuTemps.vue';

export default {
  components: { EmploiDuTemps },
  props: {
    etablissementId: {
      type: Number,
      required: true
    },
    etablissementNom: {
      type: String,
      required: true
    },
    anneeScolaire: {
      type: String,
      required: true
    },
    anneeScolaireId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      emploiDialog: false,
      suppression: { ouvert: false, enseignant: null, refus: null, encours: false },
      enseignantEmploi: null,
      enseignants: [],
      searchQuery: '',
      selectedEnseignant: null,
      dialog: false,
      erreurEdition: '',
    };
  },
  computed: {
    // Identifiant et mot de passe : seulement si le professeur n'enseigne
    // que chez nous (sinon c'est son compte, partagé avec ses autres écoles).
    fields() {
      const liste = [
        { model: 'nom', label: 'Nom', icon: 'mdi-account' },
        { model: 'prenom', label: 'Prénom', icon: 'mdi-account-outline' },
        { model: 'email', label: 'E-mail', icon: 'mdi-email-outline', type: 'email' },
        { model: 'telephone', label: 'Téléphone', icon: 'mdi-phone' },
      ];
      if (this.selectedEnseignant && !this.selectedEnseignant.plusieursEcoles) {
        liste.push(
          { model: 'nom_utilisateur', label: 'Identifiant de connexion', icon: 'mdi-account-key-outline' },
          { model: 'mot_de_passe', label: 'Nouveau mot de passe provisoire (laisser vide pour ne pas changer)', icon: 'mdi-lock-reset', type: 'password' },
        );
      }
      return liste;
    },
    filteredEnseignants() {
      return this.enseignants.filter(enseignant =>
        enseignant.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        enseignant.prenom.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    },
  },
  mounted() {
    this.fetchEnseignants();
  },
  methods: {
    ouvrirEmploi(enseignant) {
      this.enseignantEmploi = enseignant;
      this.emploiDialog = true;
    },
    async fetchEnseignants() {
      try {
        const response = await axios.get(`/api/EnseignantAdmin/${this.etablissementId}`, this.authHeaders());
        this.enseignants = response.data;
        console.log(response.data);
        console.log(this.etablissementId);
      } catch (error) {
        console.error('Erreur lors de la récupération des enseignants', error);
      }
    },
    editEnseignant(enseignant) {
      this.selectedEnseignant = { ...enseignant, mot_de_passe: '' };
      this.erreurEdition = '';
      this.dialog = true;
    },
    authHeaders() {
      const token = localStorage.getItem('token');
      return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    },
    async updateEnseignant() {
      const { id, nom, prenom, email, telephone, nom_utilisateur, mot_de_passe } = this.selectedEnseignant;
      const data = { name: nom, firstName: prenom, email, phone: telephone };
      if (!this.selectedEnseignant.plusieursEcoles) {
        data.username = nom_utilisateur;
        if (mot_de_passe) data.password = mot_de_passe;
      }
      this.erreurEdition = '';
      try {
        await axios.put(`/api/Enseignants/${id}`, data, this.authHeaders());
        this.dialog = false;
        this.fetchEnseignants();
      } catch (error) {
        this.erreurEdition = error?.response?.data?.message || "La modification a échoué.";
      }
    },
    demanderSuppression(enseignant) {
      this.suppression = { ouvert: true, enseignant, refus: null, encours: false };
    },
    async confirmerSuppression() {
      this.suppression.encours = true;
      try {
        await axios.delete(`/api/Enseignants/${this.suppression.enseignant.id}`, this.authHeaders());
        this.suppression.ouvert = false;
        this.fetchEnseignants();
      } catch (error) {
        const data = error?.response?.data || {};
        this.suppression.refus = { code: data.code, message: data.message || "La suppression a échoué.", affectations: data.affectations || [] };
      } finally {
        this.suppression.encours = false;
      }
    },
  },
};
</script>

<style scoped>
.edt-defile { overflow-y: auto !important; max-height: calc(100dvh - 120px); -webkit-overflow-scrolling: touch; }
.suppr-liste { margin: 0; padding-left: 18px; max-height: 220px; overflow-y: auto; font-size: 0.88rem; }
.info-emploi { width: 36px !important; height: 36px !important; min-width: 36px !important; }
.enseignants-container {
  padding: 20px;
}

.title {
  font-weight: 600;
  font-size: 1rem;
}

.enseignant-card {
  transition: 0.3s ease;
}

.enseignant-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.alert-enseignant {
  max-width: 700px;
  margin: auto;
  font-size: 0.9rem;
}

/* Responsive petit écran */
@media (max-width: 600px) {
  .title {
    font-size: 0.85rem;
  }

  .enseignant-card {
    padding: 10px;
  }

  .alert-enseignant {
    font-size: 0.75rem;
    padding: 10px;
  }

  .v-btn {
    font-size: 0.7rem !important;
    padding: 4px 8px !important;
  }

  .v-card-title {
    font-size: 0.9rem;
  }

  .v-card-subtitle,
  .v-card-text {
    font-size: 0.8rem;
  }
}

/* Grand écran */
@media (min-width: 961px) {
  .title {
    font-size: 1.1rem;
  }

  .v-card-subtitle,
  .v-card-text {
    font-size: 0.95rem;
  }
}
</style>

