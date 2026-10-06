<!-- Inscription.vue -->
<template>
  <v-container class="registration-page pa-1 pa-sm-3" fluid>
    <!-- Top actions -->
    <v-card class="mx-auto mb-2 elevation-0 rounded-lg" max-width="900">
      <v-card-text class="d-flex flex-row align-center justify-space-between ga-2 pa-2">

        <div class="d-flex flex-row ga-2 flex-grow-1 justify-end top-choices">
          <v-btn
            prepend-icon="mdi-account-plus"
            color="primary"
            class="rounded-pill px-2 px-sm-3"
            @click="toggleSingleForm"
            :variant="showForm ? 'flat' : 'outlined'"
          >
            Individuelle
          </v-btn>
          <v-btn
            prepend-icon="mdi-file-excel"
            color="secondary"
            class="rounded-pill px-2 px-sm-3"
            @click="toggleBulkForm"
            :variant="showBulkForm ? 'flat' : 'outlined'"
          >
            Toute une classe
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- ✅ INSCRIPTION INDIVIDUELLE -->
    <v-expand-transition>
      <v-card v-if="showForm" class="mx-auto elevation-0 rounded-lg pa-2 pa-md-3" max-width="900">
        <v-card-title class="text-subtitle-1 font-weight-bold text-center py-2 text-primary">
          <v-icon start>mdi-account-school</v-icon>
          Fiche d'Inscription Élève
        </v-card-title>

        <v-divider class="mb-3"></v-divider>

        <v-form @submit.prevent="submitForm">
          <AideEssentiel cle="inscription-individuelle">
            <ul>
              <li>Pour inscrire <strong>une classe entière</strong> d'un coup (liste Excel ou Word), utilisez le bouton « Toute une classe ».</li>
              <li>Le parent doit exister : choisissez-le dans la liste ou créez-le avec « Ajouter un parent ».</li>
              <li>La <strong>photo d'identité est facultative</strong> ; elle sert à la carte scolaire, au bulletin et au profil de l'enfant côté parents. Elle peut être ajoutée plus tard.</li>
              <li>Le matricule est attribué automatiquement.</li>
            </ul>
          </AideEssentiel>
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.nom"
                label="Nom de l'élève"
                variant="outlined"
                density="compact"
                required
                prepend-inner-icon="mdi-account-outline"
                placeholder="Ex: KOUADIO"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.prenom"
                label="Prénom de l'élève"
                variant="outlined"
                density="compact"
                required
                prepend-inner-icon="mdi-account-outline"
                placeholder="Ex: Jean"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.dateNaissance"
                label="Date de naissance"
                type="date"
                variant="outlined"
                density="compact"
                required
                prepend-inner-icon="mdi-calendar"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="form.sexe"
                :items="['M', 'F']"
                label="Sexe"
                variant="outlined"
                density="compact"
                required
                prepend-inner-icon="mdi-gender-male-female"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="form.classe"
                :items="classes"
                item-title="nom"
                item-value="id"
                label="Classe d'affectation"
                variant="outlined"
                density="compact"
                required
                prepend-inner-icon="mdi-google-classroom"
              />
            </v-col>

            <!-- ✅ Parent select + bouton "Ajouter un parent" en bas -->
            <v-col cols="12" sm="6">
              <v-autocomplete
                v-model="form.parentId"
                :items="parents"
                item-value="id"
                item-title="text"
                label="Rechercher le Parent"
                variant="outlined"
                density="compact"
                required
                prepend-inner-icon="mdi-account-child"
                placeholder="Taper pour chercher..."
                clearable
              >
                <!-- ✅ Bouton en bas de la liste -->
                <template #append-item>
                  <v-divider class="mt-2"></v-divider>
                  <div class="pa-2">
                    <v-btn
                      block
                      color="primary"
                      variant="tonal"
                      prepend-icon="mdi-account-plus"
                      class="rounded-lg"
                      @click="openParentManagement"
                    >
                      Ajouter un parent
                    </v-btn>
                  </div>
                </template>
              </v-autocomplete>
            </v-col>
          </v-row>

          <PhotoIdentite :key="photoKey" class="mt-2" @change="photo = $event" />

          <v-card-actions class="justify-end mt-2">
            <v-btn color="grey-darken-1" variant="text" @click="showForm = false" class="px-3">
              Annuler
            </v-btn>
            <v-btn
              color="success"
              type="submit"
              variant="elevated"
              class="px-2 px-sm-3 rounded-lg font-weight-bold"
              :loading="loading"
            >
              Valider l'Inscription
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-expand-transition>

    <!-- ✅ INSCRIPTION EN MASSE : coller la liste ou un fichier, vérifier, inscrire, photos -->
    <v-expand-transition>
      <InscriptionMasse
        v-if="showBulkForm"
        :etablissement-id="props.etablissementId"
        :annee-scolaire-id="props.anneeScolaireId"
        @fermer="showBulkForm = false"
        @inscrits="fetchParents"
      />
    </v-expand-transition>

    <!-- ✅ DIALOG ParentManagement.vue -->
    <v-dialog v-model="parentDialog" max-width="1250" persistent scrollable>
      <v-card class="rounded-lg overflow-hidden">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-account-group-outline</v-icon>
            <span class="font-weight-bold">Ajouter / Gérer les Parents</span>
          </div>

          <div class="d-flex align-center">
            <v-btn variant="text" color="grey-darken-1" class="mr-2" @click="closeParentDialog(false)">
              Fermer
            </v-btn>
            <v-btn color="primary" variant="elevated" @click="closeParentDialog(true)">
              Terminé
            </v-btn>
          </div>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="pa-0">
          <!-- ✅ On embarque le composant ParentManagement -->
          <ParentManagement
            ref="parentMgmtRef"
            :garder-dans-adresse="false"
            :etablissementId="props.etablissementId"
            :etablissementNom="props.etablissementNom"
            :anneeScolaire="props.anneeScolaire"
            :anneeScolaireId="props.anneeScolaireId"
            @parent-created="onParentCreated"
            @parent-updated="onParentUpdated"
            @parent-deleted="onParentDeleted"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- ✅ petit snack -->
    <v-snackbar v-model="snack.show" :timeout="2500">
      {{ snack.text }}
      <template #actions>
        <v-btn variant="text" @click="snack.show = false">OK</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import axios from 'axios';
import ParentManagement from './ParentManagement.vue'; // ⚠️ adapte le chemin
import PhotoIdentite from './PhotoIdentite.vue';
import InscriptionMasse from './InscriptionMasse.vue';
import AideEssentiel from '~/components/AideEssentiel.vue';

const props = defineProps({
  etablissementId: Number,
  etablissementNom: String,
  anneeScolaire: String,
  anneeScolaireId: Number
});

defineEmits(['back']);

const form = ref({ nom: '', prenom: '', dateNaissance: '', sexe: '', classe: '', parentId: '' });
// Photo d'identité facultative (déjà recadrée par PhotoIdentite).
const photo = ref(null);
const photoKey = ref(0);

// Formulaire ouvert, gardé dans l'adresse (?inscription=individuelle|masse).
const formulaire = useUrlState('inscription', null, { allowed: ['individuelle', 'masse'] });
const showForm = computed({
  get: () => formulaire.value === 'individuelle',
  set: (open) => { formulaire.value = open ? 'individuelle' : (formulaire.value === 'individuelle' ? null : formulaire.value); },
});
const showBulkForm = computed({
  get: () => formulaire.value === 'masse',
  set: (open) => { formulaire.value = open ? 'masse' : (formulaire.value === 'masse' ? null : formulaire.value); },
});
const loading = ref(false);

const classes = ref([]);
const parents = ref([]);

/** ✅ Dialog parents */
const parentDialog = ref(false);
const parentMgmtRef = ref(null);

/** ✅ Rapport d'importation en masse */

const snack = ref({ show: false, text: '' });

const toast = (text) => {
  snack.value.text = text;
  snack.value.show = true;
};

const toggleSingleForm = () => {
  showForm.value = !showForm.value;
  if (showForm.value) showBulkForm.value = false;
};

const toggleBulkForm = () => {
  showBulkForm.value = !showBulkForm.value;
  if (showBulkForm.value) showForm.value = false;
};

const fetchClasses = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`/api/classe/${props.etablissementId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    classes.value = res.data || [];
  } catch (e) {
    console.error("Erreur classes:", e);
  }
};

const fetchParents = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`/api/Parents/${props.etablissementId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const raw = res.data || [];
    parents.value = raw.map(p => ({
      id: p.id,
      text: `${p.name} ${p.firstName}`.trim()
    }));
  } catch (e) {
    console.error("Erreur parents:", e);
  }
};

/** ✅ Ouvre ParentManagement dans un dialog */
const openParentManagement = async () => {
  parentDialog.value = true;

  // Optionnel : forcer le ParentManagement à se mettre en mode formulaire directement
  await nextTick();
  // si tu exposes une méthode dans ParentManagement (ex: openForm), tu peux l'appeler ici
  // parentMgmtRef.value?.openForm?.();
};

/**
 * ✅ Ferme le dialog.
 * - si refresh=true => on recharge la liste des parents et on garde l'inscription ouverte
 */
const closeParentDialog = async (refresh = true) => {
  parentDialog.value = false;
  if (refresh) {
    await fetchParents();
    toast('Liste des parents mise à jour');
  }
};

/**
 * ✅ Quand un parent est créé depuis ParentManagement,
 * on rafraîchit la liste et on sélectionne automatiquement ce parent.
 */
const onParentCreated = async (createdParent) => {
  await fetchParents();
  if (createdParent?.id) {
    form.value.parentId = createdParent.id;
    toast('Parent ajouté et sélectionné ✅');
  }
};

const onParentUpdated = async () => {
  await fetchParents();
};

const onParentDeleted = async () => {
  await fetchParents();
};

const submitForm = async () => {
  loading.value = true;
  try {
    const inscriptionToken = localStorage.getItem("token");
    const { data: eleve } = await axios.post('/api/inscription', {
      ...form.value,
      etablissementId: props.etablissementId,
      anneeScolaireId: props.anneeScolaireId
    }, {
      headers: { Authorization: `Bearer ${inscriptionToken}` },
    });
    let message = `${eleve.prenom} ${eleve.nom} est inscrit(e). Matricule : ${eleve.matricule || '—'}.`;
    if (photo.value && eleve.id) {
      try {
        const fd = new FormData();
        fd.append('photo', photo.value, 'photo.jpg');
        await axios.post(`/api/eleves/${eleve.id}/photo`, fd);
      } catch (photoError) {
        message += " La photo n'a pas pu être enregistrée : vous pourrez l'ajouter depuis la carte scolaire.";
      }
    }
    alert(message);
    resetForm();
    showForm.value = false;
  } catch (e) {
    console.error(e);
    alert(e?.response?.data?.error || "Erreur lors de l'inscription.");
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  form.value = { nom: '', prenom: '', dateNaissance: '', sexe: '', classe: '', parentId: '' };
  photo.value = null;
  photoKey.value += 1;
};




onMounted(() => {
  fetchClasses();
  fetchParents();
});
</script>

<style scoped>
.registration-page {
  background-color: #f4f7f9;
  min-height: 100vh;
}

.gap-2 {
  gap: 8px;
}

.top-choices .v-btn {
  flex: 0 1 auto;
  min-width: 0;
}

.rounded-pill {
  border-radius: 10px!important;
}

.rounded-xl {
  border-radius: 10px!important;
}

@media (max-width: 600px) {
  .registration-page {
    padding: 4px !important;
    background-color: transparent;
    min-height: 0;
  }

  .v-card-title {
    font-size: 15px !important;
  }

  .top-choices .v-btn {
    flex: 1 1 0;
    padding: 0 8px !important;
    font-size: 13px !important;
  }

  .w-100 {
    width: 100% !important;
  }
}
</style>
