<template>
  <v-container class="management-wrapper py-2 px-1 px-sm-3" fluid>
    <v-row align="center" dense class="mb-2 px-1">
      <v-col cols="12" md="8">
        <h1 class="text-h6 font-weight-black text-indigo-darken-3 d-flex align-center">
          <v-icon color="indigo-darken-3" class="mr-2" size="22">mdi-shield-check</v-icon>
          Administration des Classes
        </h1>
        <p class="text-body-2 text-grey-darken-1 mb-0">{{ etablissementNom }} • {{ anneeScolaire }}</p>
      </v-col>
      <v-col cols="12" md="4" class="text-md-right text-left">
      </v-col>
    </v-row>

    <v-fade-transition mode="out-in">
      <v-row v-if="!formActif && !showClasses" dense>
        <v-col v-for="(item, i) in menuItems" :key="i" cols="6" lg="3">
          <v-hover v-slot:default="{ isHovering, props }">
            <v-card
              v-bind="props"
              :elevation="isHovering ? 2 : 0"
              class="mx-auto rounded-lg text-center pa-2 pa-sm-3 menu-tile h-100 transition-swing cursor-pointer border"
              @click="item.action"
            >
              <v-avatar :color="item.color + '-lighten-4'" size="32" class="mb-2">
                <v-icon size="18" :color="item.color + '-darken-2'">{{ item.icon }}</v-icon>
              </v-avatar>
              <div class="text-subtitle-2 font-weight-bold text-grey-darken-3">{{ item.title }}</div>
              <div class="text-caption text-grey">{{ item.subtitle }}</div>
            </v-card>
          </v-hover>
        </v-col>
      </v-row>
    </v-fade-transition>

    <v-dialog v-model="classDialog" max-width="600px" persistent>
      <v-card class="rounded-lg border overflow-hidden">
        <v-toolbar height="40" color="primary" flat>
          <v-icon start class="ml-4">mdi-plus-box</v-icon>
          <v-toolbar-title class="font-weight-bold text-subtitle-1">Créer des classes</v-toolbar-title>
          <v-btn icon @click="closeClassDialog"><v-icon>mdi-close</v-icon></v-btn>
        </v-toolbar>

        <v-card-text class="pa-2 pa-sm-3">
          <v-form @submit.prevent="submitForm">
            <p class="creation-aide">
              Indiquez combien de classes créer pour chaque niveau (laissez 0 pour aucun).
              Noms automatiques : une seule classe porte le nom du niveau (« 2nd D ») ; dès qu'il y en a plusieurs,
              elles sont numérotées (« 2nd D 1 », « 2nd D 2 ») et l'ancienne « 2nd D » devient « 2nd D 1 ».
            </p>
            <div v-for="groupe in groupesNiveaux" :key="groupe.titre" class="creation-groupe">
              <div class="creation-groupe-titre">{{ groupe.titre }}</div>
              <div v-for="p in groupe.niveaux" :key="p.id" class="creation-ligne">
                <span class="creation-nom">{{ p.nom }}</span>
                <div class="creation-compteur">
                  <v-btn icon="mdi-minus" size="x-small" variant="tonal" :disabled="!nombres[p.id]" @click="nombres[p.id] = Math.max(0, (nombres[p.id] || 0) - 1)" />
                  <span class="creation-valeur">{{ nombres[p.id] || 0 }}</span>
                  <v-btn icon="mdi-plus" size="x-small" variant="tonal" color="primary" @click="nombres[p.id] = Math.min(20, (nombres[p.id] || 0) + 1)" />
                </div>
              </div>
            </div>

            <v-divider class="my-3"></v-divider>

            <div class="d-flex flex-column flex-sm-row gap-3">
              <v-btn
                color="indigo-darken-3"
                block
                class="rounded-lg font-weight-bold flex-grow-1"
                type="submit"
                :loading="creating"
                :disabled="!totalACreer"
              >
                Créer {{ totalACreer }} classe(s)
              </v-btn>
              <v-btn
                variant="text"
                color="grey-darken-1"
                block
                class="rounded-lg"
                @click="closeClassDialog"
              >
                Annuler
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-row justify="center" v-if="formActif === 'conduct'">
      <v-col cols="12" md="8" lg="6">
        <v-card class="rounded-lg border pa-3">
          <v-card-title class="text-subtitle-1 font-weight-bold text-indigo">
            Note de conduite
          </v-card-title>
          <v-card-text>
            <p class="conduite-help">
              Note de base de la classe pour la période. Les heures de punition de chaque élève
              sont déduites automatiquement sur son bulletin (½ point par heure).
            </p>
            <v-form @submit.prevent="submitConductForm">
              <div class="conduite-grid">
                <v-text-field
                  v-model="conductNote"
                  label="Note sur 20"
                  placeholder="ex. 18"
                  inputmode="decimal"
                  variant="outlined"
                  color="indigo"
                  prepend-inner-icon="mdi-star-check"
                />
                <v-select
                  v-model="selectedSemestreId"
                  :items="semestresOptions"
                  item-title="name"
                  item-value="id"
                  label="Période"
                  variant="outlined"
                  prepend-inner-icon="mdi-calendar-clock"
                />
              </div>

              <v-select
                v-model="selectedClassIds"
                :items="classesOptions"
                item-title="name"
                item-value="id"
                label="Classes"
                multiple
                variant="outlined"
                chips
                closable-chips
                prepend-inner-icon="mdi-school-outline"
              />
              <div class="d-flex ga-2 mb-2">
                <v-btn size="small" variant="tonal" color="indigo" @click="selectedClassIds = classesOptions.map((c) => c.id)">Toutes les classes</v-btn>
                <v-btn v-if="selectedClassIds.length" size="small" variant="text" @click="selectedClassIds = []">Aucune</v-btn>
              </div>

              <v-btn
                color="indigo"
                block
                class="rounded-lg font-weight-bold mt-2"
                type="submit"
                :loading="savingConduct"
              >
                Attribuer
              </v-btn>
            </v-form>

            <div v-if="classesOptions.length && semestresOptions.length" class="conduite-etat mt-4">
              <div class="conduite-etat-title">Notes déjà attribuées <span class="conduite-etat-aide">· touchez une note pour la modifier</span></div>
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th v-for="s in semestresOptions" :key="s.id" class="text-center">{{ s.name }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in classesOptions" :key="c.id">
                    <td>{{ c.name }}</td>
                    <td v-for="s in semestresOptions" :key="s.id" class="text-center">
                      <button
                        type="button"
                        class="conduite-case"
                        :class="{ vide: !(etatConduite[c.id] && etatConduite[c.id][s.id] !== undefined) }"
                        :title="`Note de conduite de ${c.name} — ${s.name}`"
                        @click="ouvrirModifConduite(c, s)"
                      >
                        <template v-if="etatConduite[c.id] && etatConduite[c.id][s.id] !== undefined">{{ String(etatConduite[c.id][s.id]).replace('.', ',') }}</template>
                        <template v-else>—</template>
                        <v-icon size="12" class="ml-1">mdi-pencil</v-icon>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="modifConduite.ouvert" max-width="380">
      <v-card class="rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold">Note de conduite</v-card-title>
        <v-card-text>
          <div class="mb-2 text-body-2">{{ modifConduite.classe }} · {{ modifConduite.periode }}</div>
          <v-text-field
            v-model="modifConduite.note"
            label="Note sur 20"
            inputmode="decimal"
            variant="outlined"
            density="comfortable"
            autofocus
            :error-messages="modifConduiteErreur"
            @keyup.enter="enregistrerModifConduite"
          />
          <div class="text-caption text-medium-emphasis">Les bulletins déjà enregistrés de cette classe seront recalculés.</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="modifConduite.ouvert = false">Annuler</v-btn>
          <v-btn color="indigo" variant="flat" :loading="savingConduct" @click="enregistrerModifConduite">Enregistrer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-fade-transition>
      <div v-if="formActif === 'program'">
        <v-card class="rounded-lg border pa-3">
          <Programme-cours
            :classe-id="classeId"
            @ouvrir-classe="$emit('ouvrir-classe', $event)"
            @back="cancelForm"
            :etablissement-id="etablissementId"
            :annee-scolaire="anneeScolaire"
            :annee-scolaire-id="anneeScolaireId"
          />
        </v-card>
      </div>
    </v-fade-transition>

    <v-fade-transition>
      <div v-if="showClasses">
        <v-row v-for="(classes, promotion) in classesByPromotion" :key="promotion" class="mb-3">
          <v-col cols="12">
            <div class="d-flex align-center px-2">
              <h3 class="text-subtitle-1 font-weight-bold text-indigo-darken-1">{{ promotion }}</h3>
              <v-divider class="ml-4"></v-divider>
              <v-chip class="ml-4" variant="tonal" color="indigo" size="small">
                {{ classes.length }} sections
              </v-chip>
            </div>
          </v-col>

          <v-col v-for="classe in classes" :key="classe.id" cols="12" sm="6" lg="4">
            <v-card class="rounded-lg border h-100 d-flex flex-column shadow-card overflow-hidden">
              <v-card-item class="bg-white">
                <template v-slot:prepend>
                  <v-avatar color="indigo-lighten-5" rounded="lg">
                    <v-icon color="indigo">mdi-door-open</v-icon>
                  </v-avatar>
                </template>
                <v-card-title class="font-weight-bold text-indigo-darken-4">
                  {{ classe.name }}
                </v-card-title>
                <v-card-subtitle>{{ classe.studentCount }} élèves inscrits</v-card-subtitle>
              </v-card-item>

              <v-divider opacity="0.05"></v-divider>

              <v-card-actions class="pa-2 bg-grey-lighten-5 justify-end">
                <v-btn
                  variant="elevated"
                  color="red-darken-1"
                  prepend-icon="mdi-delete-outline"
                  class="font-weight-bold px-2 px-sm-3"
                  @click="confirmDeleteClass(classe)"
                  rounded="lg"
                >
                  Supprimer
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-fade-transition>

    <v-dialog v-model="notifyDialog.show" max-width="450" persistent>
      <v-card class="rounded-lg pa-2">
        <v-card-text class="text-center pa-2 pa-sm-3">
          <v-avatar :color="notifyDialog.color" size="32" class="mb-2">
            <v-icon size="18" color="white">{{ notifyDialog.icon }}</v-icon>
          </v-avatar>
          <h2 class="text-h6 font-weight-bold mb-2">{{ notifyDialog.title }}</h2>
          <p class="text-body-1 text-grey-darken-1">{{ notifyDialog.message }}</p>
        </v-card-text>

        <v-card-actions class="pb-4 px-3 d-flex justify-center">
          <v-btn
            v-if="notifyDialog.isConfirm"
            color="grey-darken-1"
            variant="text"
            class="font-weight-bold px-2 px-sm-3"
            @click="notifyDialog.show = false"
          >
            Annuler
          </v-btn>
          <v-btn
            :color="notifyDialog.color"
            variant="elevated"
            rounded="pill"
            class="font-weight-bold px-2 px-sm-3 text-white"
            @click="handleDialogAction"
          >
            {{ notifyDialog.confirmText }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from 'axios';
import ProgrammeCours from './ProgrammeCours.vue';
import { usePageBack } from '@/composables/usePageNav';

export default {
  name: 'ClassManagement',
  components: { ProgrammeCours },
  setup() {
    // La flèche retour du cadre (PageNav) ferme d'abord le formulaire
    // « Ajouter une classe », qui n'a pas d'adresse propre.
    const etat = { composant: null };
    usePageBack(() => {
      if (!etat.composant?.activeForm) return false;
      etat.composant.cancelForm();
      return true;
    });
    return { etatRetour: etat };
  },
  props: {
    etablissementId: Number,
    etablissementNom: String,
    anneeScolaire: String,
    anneeScolaireId: Number,
    // Sous-écran donné par la route : 'liste' (Mes classes), 'conduite',
    // 'programmes' ; null = menu des classes.
    ecran: { type: String, default: null },
    // Classe ouverte dans « Programme » (…/programmes/<classeId>).
    classeId: { type: Number, default: null }
  },

  emits: ['changer-ecran', 'ouvrir-classe'],

  computed: {
    modifConduiteErreur() {
      const t = String(this.modifConduite.note ?? '').trim().replace(',', '.');
      if (t === '') return '';
      const n = Number(t);
      return Number.isFinite(n) && n >= 0 && n <= 20 ? '' : 'Une note va de 0 à 20';
    },
    groupesNiveaux() {
      return [
        { titre: 'Collège', niveaux: this.promotions.filter((p) => this.estCollege(p)) },
        { titre: 'Lycée', niveaux: this.promotions.filter((p) => !this.estCollege(p)) },
      ].filter((g) => g.niveaux.length);
    },
    totalACreer() {
      return Object.values(this.nombres).reduce((t, n) => t + (Number(n) || 0), 0);
    },
    showClasses() {
      return this.ecran === 'liste';
    },
    // Formulaire affiché : celui de la route, sinon l'ajout de classe (dialogue).
    formActif() {
      if (this.ecran === 'conduite') return 'conduct';
      if (this.ecran === 'programmes') return 'program';
      return this.activeForm;
    },
    menuItems() {
      return [
        {
          title: 'Ajouter Classe',
          subtitle: 'Générer des sections par niveau',
          icon: 'mdi-plus-box-outline',
          color: 'indigo',
          action: () => {
            this.activeForm = 'addClass';
            this.classDialog = true;
          }
        },
        {
          title: 'Mes Classes',
          subtitle: 'Visualiser et supprimer',
          icon: 'mdi-google-classroom',
          color: 'blue',
          action: () => this.toggleClasses()
        },
        {
          title: 'Programme',
          subtitle: 'Configurer le curriculum',
          icon: 'mdi-book-open-page-variant-outline',
          color: 'teal',
          action: () => this.activateForm('program')
        },
        {
          title: 'Conduite',
          subtitle: 'Attribuer notes de comportement',
          icon: 'mdi-clipboard-text-clock-outline',
          color: 'orange',
          action: () => this.activateForm('conduct')
        }
      ];
    }
  },

  data() {
    return {
      etatConduite: {},
      modifConduite: { ouvert: false, classeId: null, classe: '', semestreId: null, periode: '', note: '' },
      nombres: {},
      creating: false,
      savingConduct: false,
      activeForm: null,
      classDialog: false,
      numberOfClasses: 1,
      selectedPromotionId: null,
      selectedCycle: '',
      conductNote: '',
      selectedSemestreId: null,
      selectedClassIds: [],
      promotions: [],
      semestresOptions: [],
      classesOptions: [],
      classesByPromotion: {},
      notifyDialog: {
        show: false,
        title: '',
        message: '',
        color: 'success',
        icon: 'mdi-check-circle',
        isConfirm: false,
        confirmText: "D'accord",
        actionType: null,
        targetId: null
      }
    };
  },

  methods: {
    authHeaders() {
      const token = localStorage.getItem('token');
      return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    },

    triggerNotify(title, message, type = 'success', isConfirm = false, actionType = null, targetId = null) {
      const config = {
        success: { color: 'green-darken-1', icon: 'mdi-check-circle' },
        error: { color: 'red-darken-1', icon: 'mdi-alert-circle' },
        warning: { color: 'orange-darken-1', icon: 'mdi-alert' }
      };

      this.notifyDialog = {
        show: true,
        title,
        message,
        color: config[type].color,
        icon: config[type].icon,
        isConfirm,
        confirmText: isConfirm ? 'Confirmer' : "D'accord",
        actionType,
        targetId
      };
    },

    handleDialogAction() {
      if (this.notifyDialog.actionType === 'delete') {
        this.deleteClass(this.notifyDialog.targetId);
      }
      this.notifyDialog.show = false;
    },

    // Les sous-écrans sont des routes : la page change d'adresse, le composant
    // est recréé et recharge ses données (classes, semestres) au montage.
    activateForm(formName) {
      this.$emit('changer-ecran', formName === 'conduct' ? 'conduite' : 'programmes');
    },

    cancelForm() {
      this.activeForm = null;
      if (this.ecran) this.$emit('changer-ecran', null);
    },

    closeClassDialog() {
      this.classDialog = false;
      this.selectedPromotionId = null;
      this.selectedCycle = '';
      this.numberOfClasses = 1;
      this.activeForm = null;
    },

    toggleClasses() {
      this.$emit('changer-ecran', 'liste');
    },

    // Toutes les classes demandées, niveau par niveau ; le cycle se déduit
    // du niveau (6ème à 3ème : cycle 1).
    async submitForm() {
      const demandes = this.promotions.filter((p) => (this.nombres[p.id] || 0) > 0);
      if (!demandes.length) return;
      this.creating = true;
      const erreurs = [];
      let creees = 0;
      for (const p of demandes) {
        try {
          const { data } = await axios.post('/api/Classes/multiple', {
            promotion_id: p.id,
            cycle: this.estCollege(p) ? 'Cycle 1' : 'Cycle 2',
            nombre: this.nombres[p.id],
            etablissement_id: this.etablissementId,
          }, this.authHeaders());
          creees += (data.classes || []).length;
        } catch (error) {
          erreurs.push(p.nom);
        }
      }
      this.creating = false;
      this.fetchClasses();
      this.closeClassDialog();
      this.nombres = {};
      if (erreurs.length) this.triggerNotify('Attention', `${creees} classe(s) créée(s). Échec pour : ${erreurs.join(', ')}.`, 'warning');
      else this.triggerNotify('Succès', `${creees} classe(s) créée(s).`, 'success');
    },

    estCollege(p) {
      return /^(6|5|4|3)/.test(String(p.nom || '').trim());
    },

    async submitConductForm() {
      if (this.conductNote === '' || this.conductNote === null || this.selectedClassIds.length === 0 || !this.selectedSemestreId) {
        this.triggerNotify('Données manquantes', 'Indiquez la note, la période et au moins une classe.', 'warning');
        return;
      }
      this.savingConduct = true;
      try {
        const { data } = await axios.post('/api/conduite', {
          note_conduite: String(this.conductNote).replace(',', '.'),
          classe_ids: this.selectedClassIds,
          semestre_id: this.selectedSemestreId,
          anneeScolaireId: this.anneeScolaireId,
        }, this.authHeaders());
        this.selectedClassIds = [];
        await this.fetchEtatConduite();
        this.triggerNotify('Réussite', data.message || 'Notes de conduite attribuées.', 'success');
      } catch (error) {
        this.triggerNotify('Erreur', error?.response?.data?.error || "L'enregistrement a échoué.", 'error');
      } finally {
        this.savingConduct = false;
      }
    },

    ouvrirModifConduite(classe, semestre) {
      const actuelle = this.etatConduite[classe.id] ? this.etatConduite[classe.id][semestre.id] : undefined;
      this.modifConduite = {
        ouvert: true, classeId: classe.id, classe: classe.name, semestreId: semestre.id, periode: semestre.name,
        note: actuelle === undefined ? '' : String(actuelle).replace('.', ','),
      };
    },

    async enregistrerModifConduite() {
      if (this.modifConduiteErreur || this.modifConduite.note === '') return;
      this.savingConduct = true;
      try {
        const { data } = await axios.post('/api/conduite', {
          note_conduite: String(this.modifConduite.note).replace(',', '.'),
          classe_ids: [this.modifConduite.classeId],
          semestre_id: this.modifConduite.semestreId,
          anneeScolaireId: this.anneeScolaireId,
        }, this.authHeaders());
        this.modifConduite.ouvert = false;
        await this.fetchEtatConduite();
        this.triggerNotify('Réussite', data.message || 'Note de conduite modifiée.', 'success');
      } catch (error) {
        this.triggerNotify('Erreur', error?.response?.data?.error || "La modification a échoué.", 'error');
      } finally {
        this.savingConduct = false;
      }
    },

    async fetchEtatConduite() {
      if (!this.anneeScolaireId) return;
      try {
        const { data } = await axios.get(`/api/conduite/etat/${this.anneeScolaireId}`, this.authHeaders());
        this.etatConduite = data || {};
      } catch (error) {
        this.etatConduite = {};
      }
    },

    fetchPromotions() {
      axios.get('/api/Promotions')
        .then((res) => {
          this.promotions = res.data;
        })
        .catch((error) => {
          console.error('[Promotions] Erreur de récupération :', error);
        });
    },

    fetchSemestre() {
      if (!this.etablissementId) return;

      axios.get(`/api/semesters/${this.etablissementId}`)
        .then((res) => {
          this.semestresOptions = res.data.map((s) => ({
            id: s.id,
            name: s.nom
          }));
        })
        .catch((error) => {
          console.error('[Semestres] Erreur de récupération :', error);
        });
    },

    fetchClasses() {
      axios.get(`/api/classetablissement/${this.etablissementId}`, this.authHeaders())
        .then((res) => {
          console.log('[Classes] Réponse brute API classetablissement :', res.data);

          this.classesByPromotion = res.data;

          this.classesOptions = Object.values(res.data)
            .flat()
            .map((cl) => ({
              id: cl.id,
              name: cl.name
            }));

          console.log('[Classes] Classes transformées pour le formulaire de conduite :', this.classesOptions);
        })
        .catch((error) => {
          console.error('[Classes] Erreur de récupération :', error);
          this.classesByPromotion = {};
          this.classesOptions = [];
        });
    },

    confirmDeleteClass(classe) {
      this.triggerNotify(
        'Confirmation',
        `Supprimer "${classe.name}" ?`,
        'warning',
        true,
        'delete',
        classe.id
      );
    },

    deleteClass(id) {
      axios.delete(`/api/Classes/${id}`, {
        data: { etablissement_id: this.etablissementId },
        ...this.authHeaders(),
      })
      .then(() => {
        this.fetchClasses();
        this.triggerNotify('Supprimé', 'La classe a été retirée.', 'success');
      })
      .catch((error) => {
        console.error('[Suppression classe] Erreur :', error);
        this.triggerNotify('Action impossible', 'La classe contient encore des élèves.', 'error');
      });
    }
  },

  mounted() {
    this.etatRetour.composant = this;
    this.fetchSemestre();
    this.fetchPromotions();
    this.fetchClasses();
    this.fetchEtatConduite();
  }
};
</script>

<style scoped>
.creation-aide { font-size: 0.8rem; color: #5f6b7a; margin: 0 0 8px; }
.creation-groupe-titre { font-weight: 800; color: #283593; margin: 8px 0 4px; font-size: 0.85rem; }
.creation-ligne { display: flex; align-items: center; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eef1f6; }
.creation-nom { font-size: 0.9rem; }
.creation-compteur { display: flex; align-items: center; gap: 8px; }
.creation-compteur :deep(.v-btn) { width: 32px !important; height: 32px !important; min-width: 32px !important; }
.creation-valeur { min-width: 18px; text-align: center; font-weight: 700; }
.conduite-help { font-size: 0.8rem; color: #5f6b7a; margin: 0 0 10px; line-height: 1.4; }
.conduite-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.conduite-etat-aide { font-weight: 400; color: #6b7a8c; font-size: 0.75rem; }
.conduite-case { background: none; border: 1px solid transparent; border-radius: 6px; padding: 2px 8px; font: inherit; font-weight: 700; cursor: pointer; color: #1c2a3a; display: inline-flex; align-items: center; }
.conduite-case:hover, .conduite-case:focus { border-color: #3949ab; background: #eef0fb; }
.conduite-case.vide { color: #c62828; font-weight: 400; }
.conduite-etat-title { font-weight: 700; font-size: 0.85rem; color: #3949ab; margin-bottom: 4px; }
.management-wrapper {
  background-color: #f8faff;
  min-height: 90vh;
}

.shadow-card {
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08)!important;
  transition: all 0.3s ease;
}

.shadow-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08)!important;
}

/* Tuiles de menu : petit cadre fin conservé sur téléphone. */
.menu-tile.menu-tile.menu-tile {
  background: #fff !important;
  border: 1px solid rgba(15, 23, 42, 0.1) !important;
  box-shadow: none !important;
}

.cursor-pointer {
  cursor: pointer;
}

.gap-3 {
  gap: 12px;
}

@media (max-width: 600px) {
  /* Téléphone : pas de grand cadre autour de l'écran. */
  .management-wrapper {
    background-color: transparent;
    min-height: 0;
  }
}
</style>