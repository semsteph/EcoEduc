<template>
  <v-container class="bulletin-container pa-4 pa-sm-6 bg-blue-lighten-5 rounded-xl" fluid>
    <v-row align="center" class="mb-6">
      <v-col cols="12" sm="8">
        <h1 class="text-h5 font-weight-bold text-blue-darken-4 d-flex align-center">
          <v-icon size="small" class="mr-3" color="blue-darken-4">mdi-file-certificate</v-icon>
          Gestion des Bulletins
        </h1>
        <div class="d-flex align-center mt-2">
          <v-chip color="blue-darken-4" variant="flat" size="small" class="mr-2">
            <v-icon start size="14">mdi-school</v-icon>
            Classe : {{ classeNomLocal || 'N/A' }}
          </v-chip>
          <span class="text-body-2 text-blue-darken-2 font-weight-medium">{{ etablissementNom || 'Établissement' }}</span>
        </div>
      </v-col>
      <v-col cols="12" sm="4" class="text-sm-right">
        <v-btn
          v-if="eleves.length > 0"
          color="blue-darken-4"
          prepend-icon="mdi-content-save-all"
          size="default"
          rounded="pill"
          elevation="4"
          @click="sauvegarderTousLesBulletins"
          block
          class="text-none text-white font-weight-bold"
        >
          Tout Sauvegarder
        </v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="eleves.length === 0" type="info" variant="elevated" rounded="xl" color="blue-darken-3" icon="mdi-account-search" class="mt-6 shadow-sm">
      Aucune donnée disponible pour cette classe ou aucun élève n'est encore inscrit.
    </v-alert>

    <div v-else>
      <v-expansion-panels v-model="activeEleve" class="rounded-xl overflow-hidden border-blue">
        <v-expansion-panel v-for="eleve in eleves" :key="eleve.id" :value="eleve.id" elevation="2" class="eleve-panel mb-2">
          <v-expansion-panel-title class="py-4" color="blue-darken-4">
            <v-row no-gutters align="center">
              <v-col cols="12" class="d-flex align-center justify-space-between">
                <div class="d-flex align-center">
                  <v-avatar color="white" size="44" class="mr-3 elevation-2">
                    <v-icon color="blue-darken-4" size="24">mdi-account-school</v-icon>
                  </v-avatar>
                  <div class="text-white">
                    <div class="text-caption text-blue-lighten-3 font-weight-bold uppercase">Élève</div>
                    <span class="text-body-1 font-weight-black text-uppercase">{{ eleve.nom || 'NOM' }}</span>
                    <span class="text-body-1 ml-1 font-weight-light text-blue-lighten-4">{{ eleve.prenom || 'Prénom' }}</span>
                  </div>
                </div>
                <v-btn icon="mdi-file-pdf-box" variant="elevated" color="white" size="small" class="text-red-darken-4" @click.stop="downloadPDF(eleve)" elevation="3"></v-btn>
              </v-col>
            </v-row>
          </v-expansion-panel-title>

          <v-expansion-panel-text class="bg-indigo-lighten-5 pa-3">
            <div class="institution-header pa-4 mt-2 mb-4 rounded-lg bg-blue-lighten-4 border-blue-dashed">
              <v-row dense>
                <v-col cols="12" sm="6">
                  <div class="text-caption text-blue-darken-4 font-weight-black uppercase">ÉTABLISSEMENT</div>
                  <div class="text-subtitle-1 font-weight-black text-black text-uppercase">{{ etablissementNom || 'N/A' }}</div>
                </v-col>
                <v-col cols="12" sm="6" class="text-sm-right">
                  <div class="text-caption text-blue-darken-4 font-weight-black uppercase">SESSION SCOLAIRE</div>
                  <div class="text-subtitle-1 font-weight-black text-black">{{ anneeScolaire || 'N/A' }}</div>
                </v-col>
              </v-row>
            </div>

            <div class="px-2 mb-4">
              <v-tabs v-model="selectedSemestreParEleve[eleve.id]" color="blue-darken-4" align-tabs="center" bg-color="transparent" grow density="default">
                <v-tab v-for="semestre in semestres" :key="semestre.id" :value="semestre.id" @click="selectSemestre(eleve.id, semestre.id)" class="text-none font-weight-black text-black text-body-2">
                  <v-icon start size="18">mdi-calendar-range</v-icon>
                  {{ semestre.nom }}
                </v-tab>
              </v-tabs>
            </div>

            <v-card variant="flat" border class="rounded-xl mx-2 mb-4 overflow-hidden border-blue">
              <v-responsive v-if="selectedSemestreParEleve[eleve.id] && notes[selectedSemestreParEleve[eleve.id]] && notes[selectedSemestreParEleve[eleve.id]][eleve.id]">
                <v-table density="comfortable" class="notes-table">
                  <thead class="bg-blue-darken-4">
                    <tr>
                      <th class="text-left text-white text-body-2 font-weight-bold">Matières</th>
                      <th class="text-center text-white text-body-2 font-weight-bold">Coef</th>
                      <th class="text-center text-white text-body-2 font-weight-bold">Moy</th>
                      <th class="text-center text-white text-body-2 font-weight-bold">Moy. Coef</th>
                    </tr>
                  </thead>
                  <tbody class="text-black text-body-2">
                    <tr v-for="note in notes[selectedSemestreParEleve[eleve.id]][eleve.id].moyennes" :key="note.matiereId" class="row-hover">
                      <td class="font-weight-bold text-blue-darken-4">{{ getMatiereNom(note.matiereId) }}</td>
                      <td class="text-center">{{ note.coefficient ?? 'N/A' }}</td>
                      <td class="text-center">{{ note.moy ?? 'N/A' }}</td>
                      <td class="text-center font-weight-black text-indigo-darken-3 bg-blue-lighten-5">{{ note.moycoef ?? 'N/A' }}</td>
                    </tr>
                    
                    <tr v-if="notes[selectedSemestreParEleve[eleve.id]][eleve.id].moyenne_semestrielle" class="bg-blue-darken-1 text-white font-weight-black">
                      <td colspan="2" class="text-right uppercase">Moyenne Semestrielle :</td>
                      <td colspan="2" class="text-center text-h6">{{ notes[selectedSemestreParEleve[eleve.id]][eleve.id].moyenne_semestrielle }}</td>
                    </tr>
                    <tr v-if="notes[selectedSemestreParEleve[eleve.id]][eleve.id].rang" class="bg-white">
                      <td colspan="2" class="text-right font-weight-bold text-blue-darken-4">Rang :</td>
                      <td colspan="2" class="text-center font-weight-black text-body-1">{{ notes[selectedSemestreParEleve[eleve.id]][eleve.id].rang }}</td>
                    </tr>
                    <tr v-if="notes[selectedSemestreParEleve[eleve.id]][eleve.id].mention" class="bg-white">
                      <td colspan="2" class="text-right font-weight-bold text-blue-darken-4 uppercase">Mention :</td>
                      <td colspan="2" class="text-center font-weight-black text-indigo-darken-4">{{ notes[selectedSemestreParEleve[eleve.id]][eleve.id].mention }}</td>
                    </tr>
                    <tr v-if="notes[selectedSemestreParEleve[eleve.id]][eleve.id].moyenne_annuelle" class="bg-indigo-darken-4 text-white font-weight-black">
                      <td colspan="2" class="text-right text-uppercase">Moyenne Annuelle :</td>
                      <td colspan="2" class="text-center text-h6">{{ notes[selectedSemestreParEleve[eleve.id]][eleve.id].moyenne_annuelle }}</td>
                    </tr>
                    <tr v-if="notes[selectedSemestreParEleve[eleve.id]][eleve.id].decision" class="bg-white border-top-blue">
                      <td colspan="2" class="text-right font-weight-bold text-blue-darken-4 uppercase">Décision :</td>
                      <td colspan="2" class="text-center font-weight-black text-body-1">{{ notes[selectedSemestreParEleve[eleve.id]][eleve.id].decision }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-responsive>
              <div v-else class="pa-3 pa-sm-10 text-center text-grey">
                <v-icon size="40" color="red-lighten-3" class="mb-2">mdi-close-circle-outline</v-icon>
                <p class="text-body-1 font-weight-bold">Aucune note disponible pour ce semestre.</p>
              </div>
            </v-card>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <v-dialog v-model="dialog" max-width="500" persistent>
      <v-card class="rounded-xl overflow-hidden border-blue">
        <v-toolbar :color="dialogTitle === 'Succès' ? 'blue-darken-4' : 'red-darken-4'" flat density="compact">
          <v-toolbar-title class="text-body-1 font-weight-bold text-white uppercase">
            <v-icon left size="small" class="mr-2">mdi-information-outline</v-icon>
            {{ dialogTitle }}
          </v-toolbar-title>
        </v-toolbar>
        <v-card-text class="pa-2 pa-sm-6 text-center text-body-1 font-weight-medium" style="white-space: pre-line;">
          {{ message }}
        </v-card-text>
        <v-card-actions class="pa-4 bg-blue-lighten-5">
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-4" variant="elevated" rounded="pill" @click="closeDialog" class="px-2 px-sm-8">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default {
  props: {
    classId: { type: Number, required: true },
    classeNom: { type: String, required: true },
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      eleves: [],
      semestres: [],
      matieres: [],
      notes: {},
      activeEleve: null,
      classeNomLocal: this.classeNom,
      message: '',
      dialog: false,
      dialogTitle: '',
      selectedSemestreParEleve: {}
    };
  },
  methods: {
    async fetchBulletinData() {
      try {
        const response = await axios.get('/api/bulletin', {
          params: { classeId: this.classId, etablissementId: this.etablissementId, anneeScolaireId: this.anneeScolaireId }
        });
        const { semestres, matieres, notes, classeNom } = response.data;
        this.semestres = semestres || [];
        this.matieres = matieres || [];
        this.notes = notes || {};
        this.classeNomLocal = classeNom || 'Inconnue';

        this.eleves = Object.values(notes).flatMap(s => Object.values(s))
          .reduce((acc, e) => {
            if (!acc.find(item => item.id === e.eleveId)) acc.push({ id: e.eleveId, nom: e.nom, prenom: e.prenom });
            return acc;
          }, []);

        if (this.semestres.length > 0) {
          const firstId = this.semestres[0].id;
          this.eleves.forEach(e => { this.selectedSemestreParEleve[e.id] = firstId; });
        }
      } catch (error) { this.showDialog("Erreur de récupération des données.", "Erreur"); }
    },

    selectSemestre(eleveId, semestreId) {
      this.selectedSemestreParEleve = { ...this.selectedSemestreParEleve, [eleveId]: semestreId };
    },

    getMatiereNom(matiereId) {
      const matiere = this.matieres.find(m => m.id === matiereId);
      return matiere ? matiere.nom : 'Matière Inconnue';
    },

    downloadPDF(eleve) {
      try {
        const sId = this.selectedSemestreParEleve[eleve.id];
        const data = this.notes[sId]?.[eleve.id];
        if (!data) {
          this.showDialog("Aucune donnée disponible pour générer le PDF.", "Information");
          return;
        }

        const doc = new jsPDF();
        const sObj = this.semestres.find(s => s.id === sId);
        const sNom = sObj ? sObj.nom : 'Semestre';

        // --- Sécurité Anti-Crash (toUpperCase) ---
        const etabName = (this.etablissementNom || 'Établissement').toUpperCase();
        const studentName = (eleve.nom || 'NOM').toUpperCase();
        const studentPrenom = eleve.prenom || 'Prénom';

        // Header Bleu Marine
        doc.setFillColor(0, 33, 71); 
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text(etabName, 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`SESSION SCOLAIRE : ${this.anneeScolaire || 'N/A'}`, 105, 30, { align: 'center' });

        // Titre Bulletin
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text(`BULLETIN DE NOTES - ${sNom.toUpperCase()}`, 105, 55, { align: 'center' });
        
        // Infos Elève
        doc.setDrawColor(0, 33, 71);
        doc.setLineWidth(0.5);
        doc.line(15, 62, 195, 62);
        
        doc.setFontSize(12);
        doc.text(`ÉLÈVE : ${studentName} ${studentPrenom}`, 15, 72);
        doc.text(`CLASSE : ${this.classeNomLocal || 'N/A'}`, 15, 80);

        // Tableau
        const tableRows = data.moyennes.map(m => [
          this.getMatiereNom(m.matiereId), 
          m.coefficient || 'N/A', 
          m.moy || 'N/A', 
          m.moycoef || 'N/A'
        ]);

        doc.autoTable({
          startY: 85,
          head: [['Matières', 'Coef', 'Moyenne', 'Moy. Coef']],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [0, 33, 71], textColor: [255, 255, 255], fontSize: 11, fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 4, textColor: [0,0,0] },
          columnStyles: { 0: { cellWidth: 80 } }
        });

        // Résultats
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(12);
        doc.text(`MOYENNE SEMESTRIELLE : ${data.moyenne_semestrielle || 'N/A'}`, 15, finalY);
        doc.text(`RANG : ${data.rang || 'N/A'}`, 15, finalY + 8);
        
        if(data.moyenne_annuelle) {
          doc.text(`MOYENNE ANNUELLE : ${data.moyenne_annuelle}`, 110, finalY);
          doc.text(`DÉCISION : ${data.decision || 'N/A'}`, 110, finalY + 8);
        }

        doc.save(`Bulletin_${eleve.nom}_${sNom}.pdf`);
      } catch (e) {
        console.error("PDF Error:", e);
        this.showDialog("Erreur lors de la génération du PDF. Vérifiez les données.", "Erreur");
      }
    },

    async sauvegarderTousLesBulletins() {
      try {
        for (const s of this.semestres) {
          for (const e of this.eleves) {
            const bulletin = this.notes[s.id]?.[e.id];
            if (bulletin) {
              const n = bulletin.moyennes || [];
              const payload = {
                eleveId: e.id, classeId: this.classId, etablissementId: this.etablissementId, anneeScolaireId: this.anneeScolaireId, semestreId: s.id,
                notes: n.filter(x => x.matiereId !== 'conduite'), moyenneSemestrielle: bulletin.moyenne_semestrielle, moyenneAnnuelle: bulletin.moyenne_annuelle,
                rang: bulletin.rang, mention: bulletin.mention, decision: bulletin.decision, conduite: n.find(x => x.matiereId === 'conduite')?.moy || null
              };

              try {
                await axios.post('/api/sauvegarde-bulletin', payload);
              } catch (err) {
                const apiError = err.response?.data;
                if (apiError?.matieresManquantes?.length > 0) {
                  const noms = apiError.matieresManquantes.map(m => m.nom).join(', ');
                  this.message = `Impossible de sauvegarder le bulletin pour ${e.nom} (${e.id}) :\nLes matières suivantes n'ont pas de moyenne : ${noms}`;
                } else {
                  this.message = `Erreur pour ${e.nom} (${e.id}) : ${apiError?.error || 'Erreur inconnue'}`;
                }
                this.dialogTitle = "Erreur lors de la sauvegarde";
                this.dialog = true;
                return;
              }
            }
          }
        }
        this.message = "Tous les bulletins ont été sauvegardés avec succès.";
        this.dialogTitle = "Succès";
        this.dialog = true;
      } catch (error) { this.showDialog("Une erreur inattendue est survenue.", "Erreur globale"); }
    },

    showDialog(msg, title) { this.message = msg; this.dialogTitle = title; this.dialog = true; },
    closeDialog() { this.dialog = false; this.message = ''; }
  },
  mounted() { this.fetchBulletinData(); }
};
</script>

<style scoped>
.bulletin-container { max-width: 1200px; margin: 0 auto; border: 2px solid #0d47a1; }
.eleve-panel { border-bottom: 2px solid #0d47a1 !important; }
.border-blue-dashed { border: 2px dashed #0d47a1; }
.border-blue { border: 1px solid #0d47a1 !important; }
.uppercase { text-transform: uppercase; }
.notes-table th { font-size: 0.9rem !important; }
.row-hover:hover { background-color: #e3f2fd !important; }
/* Styles pour les textes minuscules */
.text-tiny { font-size: 0.75rem !important; }
</style>