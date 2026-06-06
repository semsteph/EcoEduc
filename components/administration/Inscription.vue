<!-- Inscription.vue -->
<template>
  <v-container class="registration-page pa-4 pa-md-8" fluid>
    <!-- Top actions -->
    <v-card class="mx-auto mb-6 elevation-1 rounded-lg" max-width="900">
      <v-card-text class="d-flex flex-column flex-sm-row align-center justify-space-between pa-4">
        <v-btn icon variant="tonal" color="primary" @click="$emit('back')" class="mb-4 mb-sm-0">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>

        <div class="d-flex flex-column flex-sm-row gap-2 w-100 w-sm-auto justify-end">
          <v-btn
            prepend-icon="mdi-account-plus"
            color="primary"
            class="rounded-pill px-6"
            @click="toggleSingleForm"
            :variant="showForm ? 'flat' : 'outlined'"
          >
            Individuelle
          </v-btn>
          <v-btn
            prepend-icon="mdi-file-excel"
            color="secondary"
            class="rounded-pill px-6 ml-sm-2 mt-2 mt-sm-0"
            @click="toggleBulkForm"
            :variant="showBulkForm ? 'flat' : 'outlined'"
          >
            En masse (Excel)
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- ✅ INSCRIPTION INDIVIDUELLE -->
    <v-expand-transition>
      <v-card v-if="showForm" class="mx-auto elevation-2 rounded-xl pa-2 pa-md-6" max-width="900">
        <v-card-title class="text-h5 font-weight-bold text-center py-4 text-primary">
          <v-icon start>mdi-account-school</v-icon>
          Fiche d'Inscription Élève
        </v-card-title>

        <v-divider class="mb-6"></v-divider>

        <v-form @submit.prevent="submitForm">
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.nom"
                label="Nom de l'élève"
                variant="outlined"
                density="comfortable"
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
                density="comfortable"
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
                density="comfortable"
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
                density="comfortable"
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
                density="comfortable"
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
                density="comfortable"
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

          <v-card-actions class="justify-end mt-4">
            <v-btn color="grey-darken-1" variant="text" @click="showForm = false" class="px-4">
              Annuler
            </v-btn>
            <v-btn
              color="success"
              type="submit"
              variant="elevated"
              class="px-8 rounded-lg font-weight-bold"
              :loading="loading"
            >
              Valider l'Inscription
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-expand-transition>

    <!-- ✅ INSCRIPTION EN MASSE -->
    <v-expand-transition>
      <v-card v-if="showBulkForm" class="mx-auto elevation-2 rounded-xl pa-2 pa-md-6" max-width="900">
        <v-card-title class="text-h5 font-weight-bold text-center py-4 text-secondary">
          <v-icon start>mdi-file-multiple</v-icon>
          Importation par Fichier
        </v-card-title>

        <v-divider class="mb-6"></v-divider>

        <v-row justify="center">
          <v-col cols="12" class="text-center">
            <v-btn
              color="info"
              variant="tonal"
              prepend-icon="mdi-download"
              class="mb-6 rounded-pill"
              @click="generateExcelTemplate"
            >
              Télécharger le canevas Excel
            </v-btn>
          </v-col>

          <v-col cols="12" sm="8">
            <v-select
              v-model="bulkForm.classeId"
              :items="classes"
              item-title="nom"
              item-value="id"
              label="Classe de destination"
              variant="outlined"
              prepend-inner-icon="mdi-google-classroom"
              class="mb-2"
            />

            <v-file-input
              @change="handleFileUpload"
              label="Sélectionner le fichier Excel complété"
              variant="outlined"
              accept=".xlsx, .xls"
              prepend-inner-icon="mdi-paperclip"
              show-size
            />
          </v-col>
        </v-row>

        <v-card-actions class="justify-end mt-4">
          <v-btn color="grey-darken-1" variant="text" @click="showBulkForm = false" class="px-4">
            Annuler
          </v-btn>
          <v-btn
            color="success"
            variant="elevated"
            class="px-8 rounded-lg font-weight-bold"
            @click="submitBulkForm"
            :loading="loading"
          >
            Lancer l'importation
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-expand-transition>

    <!-- ✅ DIALOG ParentManagement.vue -->
    <v-dialog v-model="parentDialog" max-width="1250" persistent scrollable>
      <v-card class="rounded-xl overflow-hidden">
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
import { ref, onMounted, nextTick } from 'vue';
import axios from 'axios';
import ParentManagement from './ParentManagement.vue'; // ⚠️ adapte le chemin

const props = defineProps({
  etablissementId: Number,
  etablissementNom: String,
  anneeScolaire: String,
  anneeScolaireId: Number
});

defineEmits(['back']);

const form = ref({ nom: '', prenom: '', dateNaissance: '', sexe: '', classe: '', parentId: '' });
const bulkForm = ref({ classeId: '', file: null });

const showForm = ref(false);
const showBulkForm = ref(false);
const loading = ref(false);

const classes = ref([]);
const parents = ref([]);

/** ✅ Dialog parents */
const parentDialog = ref(false);
const parentMgmtRef = ref(null);

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
    const res = await axios.get(`http://localhost:8080/api/classe/${props.etablissementId}`);
    classes.value = res.data || [];
  } catch (e) {
    console.error("Erreur classes:", e);
  }
};

const fetchParents = async () => {
  try {
    const res = await axios.get(`http://localhost:8080/api/Parents/${props.etablissementId}`);
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
    await axios.post('http://localhost:8080/api/inscription', {
      ...form.value,
      etablissementId: props.etablissementId,
      anneeScolaireId: props.anneeScolaireId
    });
    alert("L'élève a été inscrit avec succès !");
    resetForm();
    showForm.value = false;
  } catch (e) {
    console.error(e);
    alert("Erreur lors de l'inscription.");
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  form.value = { nom: '', prenom: '', dateNaissance: '', sexe: '', classe: '', parentId: '' };
};

const handleFileUpload = (event) => {
  const file = event?.target?.files?.[0] || null;
  bulkForm.value.file = file;
};

const generateExcelTemplate = async () => {
  const XLSX = await import('xlsx');
  const data = [
    ["NOTE:", "NE PAS SUPPRIMER LA LIGNE D'ENTETE. L'EXEMPLE EN LIGNE 3 NE SERA PAS IMPORTE."],
    ['Nom Élève', 'Prénom Élève', 'Date de naissance', 'Sexe', 'Nom Parent', 'Prénom Parent', 'Email Parent', 'Téléphone'],
    ['KOUADIO', 'Jean', '12/05/2011', 'M', 'KOUADIO', 'Claudine', 'claudine.kouadio@mail.com', '0700000000']
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 10 },
    { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 20 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions');
  XLSX.writeFile(wb, 'canevas_inscription_eleves.xlsx');
};

const submitBulkForm = async () => {
  if (!bulkForm.value.file || !bulkForm.value.classeId) {
    alert("Veuillez sélectionner une classe et un fichier.");
    return;
  }
  loading.value = true;

  const formData = new FormData();
  formData.append('file', bulkForm.value.file);
  formData.append('classeId', bulkForm.value.classeId);
  formData.append('etablissementId', props.etablissementId);
  formData.append('anneeScolaireId', props.anneeScolaireId);

  try {
    await axios.post('http://localhost:8080/api/import-eleves', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    alert("Importation réussie !");
    showBulkForm.value = false;
  } catch (e) {
    console.error("Erreur:", e);
    alert("Erreur lors de l'importation.");
  } finally {
    loading.value = false;
  }
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
  gap: 12px;
}

.rounded-pill {
  border-radius: 50px !important;
}

.rounded-xl {
  border-radius: 20px !important;
}

@media (max-width: 600px) {
  .registration-page {
    padding: 10px !important;
  }

  .v-card-title {
    font-size: 1.15rem !important;
  }

  .w-100 {
    width: 100% !important;
  }
}
</style>
