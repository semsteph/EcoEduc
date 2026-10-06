<template>
  <v-app>
    <v-container fluid class="app-container pa-2">
      <!-- Titre -->
      <v-row class="justify-center mb-1">
        <v-col cols="12" class="text-center">
          <h1 class="title d-inline-flex align-center">
            <v-icon start size="small" color="primary">mdi-book-open-page-variant</v-icon>
            Cahier de notes
          </h1>
        </v-col>
      </v-row>

      <!-- Les boutons de semestres -->
      <v-row class="semester-scroller-row mb-3" no-gutters>
        <v-col class="px-0" cols="12">
          <div class="semester-scroller">
            <v-btn
              v-for="semester in semesters"
              :key="semester.id"
              :color="currentSemester === semester.nom ? 'primary' : undefined"
              :variant="currentSemester === semester.nom ? 'flat' : 'outlined'"
              @click="changeSemester(semester.nom)"
              :class="{ 'v-btn--active': currentSemester === semester.nom }"
              rounded
              size="small"
              class="semester-btn"
            >
              <v-icon start size="x-small">mdi-calendar</v-icon>
              <span class="semester-label">{{ semester.nom }}</span>
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <!-- Barre d'actions : saisir, enregistrer, valider -->
      <div class="notes-toolbar mb-2">
        <div class="notes-toolbar-title">
          <v-icon size="small" color="primary">mdi-book</v-icon>
          <span>{{ matiereNom }} · {{ currentSemester }}</span>
        </div>
        <div class="notes-toolbar-actions">
          <!-- Enregistrement automatique : état visible en permanence -->
          <span class="etat-sauvegarde" :class="`etat-${etatAffiche.cle}`">
            <v-icon size="16" class="mr-1">{{ etatAffiche.icone }}</v-icon>{{ etatAffiche.texte }}
          </span>
          <v-btn color="teal" size="small" rounded variant="tonal" @click="photoDialog = true">
            <v-icon start size="x-small">mdi-camera</v-icon>
            Photo
          </v-btn>
          <v-btn v-if="dicteePossible" color="deep-purple" size="small" rounded variant="tonal" @click="ouvrirDictee">
            <v-icon start size="x-small">mdi-microphone</v-icon>
            Dicter
          </v-btn>
          <v-btn v-if="nbAVerifier" color="primary" size="small" rounded :loading="savingEdits" @click="saveEdits">
            <v-icon start size="x-small">mdi-content-save-edit</v-icon>
            Confirmer les 00 ({{ nbAVerifier }})
          </v-btn>
          <v-btn color="green-darken-2" size="small" rounded variant="tonal" @click="askValidate">
            <v-icon start size="x-small">mdi-lock-check</v-icon>
            Valider les moyennes
          </v-btn>
          <v-menu location="bottom end">
            <template #activator="{ props }">
              <v-btn v-bind="props" size="small" rounded variant="text" icon="mdi-dots-vertical" aria-label="Plus d'actions" />
            </template>
            <v-list density="compact">
              <v-list-item prepend-icon="mdi-file-pdf-box" title="Fiche de notes vide (PDF)" @click="ficheDialog = true" />
              <v-list-item prepend-icon="mdi-file-excel" title="Télécharger le modèle Excel" @click="generateExcelFile" />
              <v-list-item prepend-icon="mdi-upload" title="Importer un fichier Excel" @click="openImportForm1" />
              <v-list-item prepend-icon="mdi-shield-alert-outline" @click="openMesDemandes">
                <v-list-item-title>
                  Mes demandes
                  <v-badge v-if="demandesNonVuesCount > 0" :content="demandesNonVuesCount" color="deep-orange" inline />
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
        <div class="column-picker">
          <span class="column-picker-label">Colonne :</span>
          <v-chip-group v-model="colonne" mandatory selected-class="text-primary" class="column-chips">
            <v-chip v-for="c in colonnes" :key="c.value" :value="c.value" size="small" variant="outlined">{{ c.title }}</v-chip>
          </v-chip-group>
        </div>
        <p class="notes-help">
          Tapez les notes (0 à 20) ou touchez « Dicter » : elles s'enregistrent toutes seules, même sans réseau (gardées sur le téléphone puis envoyées).
          Quand toute la classe a ses notes, « Valider les moyennes ».
          Un élève absent reçoit une note de rattrapage ou 00 : la validation est refusée tant qu'une case est vide.
          Les notes validées <v-icon size="12">mdi-lock</v-icon> ne se modifient plus que sur demande à l'administration ;
          les cases vides restent saisissables (2e interrogation, devoir…), puis on valide à nouveau.
        </p>
      </div>

      <v-alert v-if="aRevalider" type="info" variant="tonal" density="compact" class="mb-2">
        Des notes ont été ajoutées après la dernière validation. Le bulletin garde les anciennes moyennes jusqu'à une nouvelle
        validation : quand toute la classe a ses notes, cliquez sur « Valider les moyennes ».
      </v-alert>

      <!-- Tableau -->
      <div class="responsive-table-wrapper">
        <v-data-table
          :headers="visibleHeaders"
          :items="students"
          :search="search"
          class="responsive-table"
          :class="{ 'is-one-column': colonne !== 'toutes' }"
          :items-per-page="-1"
          hide-default-footer
          density="compact"
        >
          <template v-slot:item.studentName="{ item }">
            <span>{{ item.nom }} {{ item.prenom }}</span>
          </template>

          <template v-for="f in noteFields" :key="f" #[`item.${f}`]="{ item }">
            <div class="note-container">
              <template v-if="isPending(item.id, f)">
                <span>{{ item[f] ?? '' }}</span>
                <v-tooltip text="En attente de validation par l'administration" location="top">
                  <template #activator="{ props }">
                    <v-icon v-bind="props" class="pending-icon" color="orange-darken-2" size="small">mdi-clock-alert-outline</v-icon>
                  </template>
                </v-tooltip>
              </template>
              <template v-else-if="(item.verrouillees || []).includes(f)">
                <button type="button" class="locked-cell" title="Note validée : demander une modification" @click="confirmDelete(item, f)">
                  <span>{{ item[f] ?? '—' }}</span>
                  <v-icon size="x-small" color="grey">mdi-lock</v-icon>
                </button>
              </template>
              <template v-else>
                <input
                  class="note-input"
                  :class="{ 'is-invalid': !isValidCell(item, f), 'is-edited': isEdited(item, f), 'is-offline': isEdited(item, f) && etatSauvegarde === 'horsligne', 'is-missing': isMissing(item, f) }"
                  :value="cellValue(item, f)"
                  inputmode="decimal"
                  maxlength="5"
                  :aria-label="`${f} de ${item.prenom} ${item.nom}`"
                  @input="onEdit(item, f, $event.target.value)"
                  @keydown.enter.prevent="focusNext($event)"
                />
                <v-icon
                  v-if="item[f] !== null && item[f] !== undefined && !isEdited(item, f)"
                  class="delete-icon"
                  color="red"
                  size="x-small"
                  title="Supprimer cette note"
                  @click="confirmDelete(item, f)"
                >mdi-close-circle</v-icon>
              </template>
            </div>
          </template>

          <template v-slot:[`item.MoyI`]="{ item }">
            <span>{{ item.MoyI || '' }}</span>
          </template>

          <template v-slot:[`item.Moy`]="{ item }">
            <span>{{ item.Moy || '' }}</span>
          </template>

          <template v-slot:[`item.Moycoef`]="{ item }">
            <span>{{ item.Moycoef || '' }}</span>
          </template>
        </v-data-table>
      </div>

      <!-- Confirmation avant de valider (verrouiller) les moyennes -->
      <v-dialog v-model="validateDialog" max-width="440">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon color="green-darken-2" class="mr-2">mdi-lock-check</v-icon>
            Valider les moyennes ?
          </v-card-title>
          <v-card-text>
            Les moyennes de {{ currentSemester }} sont calculées et transmises au bulletin.
            Ensuite, une note validée ne pourra plus être changée que sur demande à l'administration.
            <div class="mt-2 text-medium-emphasis">Tous les élèves doivent avoir une note dans chaque colonne utilisée (00 pour un absent).</div>
            <div v-if="editCount" class="text-warning mt-2">
              {{ editCount }} note(s) tapée(s) ne sont pas encore enregistrées : elles le seront d'abord.
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="validateDialog = false">Annuler</v-btn>
            <v-btn color="green-darken-2" variant="elevated" :loading="savingEdits" @click="saveNotes">Valider</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Validation refusée : des élèves n'ont pas toutes leurs notes -->
      <v-dialog v-model="manquantsDialog" max-width="520" scrollable>
        <v-card>
          <v-card-title class="d-flex align-center text-wrap">
            <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
            Notes manquantes : validation impossible
          </v-card-title>
          <v-card-text>
            <p class="mb-2">
              {{ manquants.length }} élève(s) n'ont pas de note dans une colonne utilisée par le reste de la classe.
              Donnez-leur une note (rattrapage) ou <strong>00</strong>, enregistrez, puis validez.
              Les cases concernées sont <span class="case-manquante">encadrées en rouge</span> dans le tableau.
            </p>
            <div v-for="m in manquants" :key="m.eleveId" class="manquant-ligne">
              <strong>{{ m.nom }} {{ m.prenom }}</strong>
              <span>{{ m.libelles.join(', ') }}</span>
            </div>
          </v-card-text>
          <v-card-actions class="flex-wrap">
            <v-btn variant="text" color="grey-darken-1" @click="mettreZeroManquants">Mettre 00 à ces cases</v-btn>
            <v-spacer />
            <v-btn color="primary" variant="flat" @click="manquantsDialog = false">Je complète</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Peu de notes : double confirmation -->
      <v-dialog v-model="peuDeNotesDialog" max-width="480" persistent>
        <v-card>
          <v-card-title class="d-flex align-center text-wrap">
            <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
            Moyenne sur peu de notes
          </v-card-title>
          <v-card-text>
            <p>
              Cette période ne compte que <strong>{{ peuDeNotes.nbInter }} interrogation(s)</strong> et
              <strong>{{ peuDeNotes.nbDev }} devoir(s)</strong>. Une moyenne se calcule d'habitude sur au moins
              2 interrogations et 2 devoirs.
            </p>
            <p class="text-medium-emphasis">Si d'autres notes sont prévues, annulez et validez plus tard.</p>
            <v-checkbox
              v-model="peuDeNotesConfirme"
              density="compact"
              hide-details
              color="warning"
              :label="`Je confirme : ${peuDeNotes.nbInter} interrogation(s) et ${peuDeNotes.nbDev} devoir(s) seulement pour ${currentSemester}.`"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="peuDeNotesDialog = false">Annuler</v-btn>
            <v-btn color="warning" variant="flat" :disabled="!peuDeNotesConfirme" :loading="savingEdits" @click="saveNotes(true)">Valider quand même</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Remplir une colonne en photographiant la fiche -->
      <NotesParPhoto
        v-model="photoDialog"
        :students="students"
        :colonnes="colonnes.filter((x) => x.value !== 'toutes')"
        :colonne-initiale="colonnePourPhoto"
        :valeur-case="(e, f) => cellValue(e, f)"
        :case-bloquee="raisonCaseBloquee"
        :contexte="{ classeId, subjectId, semesterId: getSemesterId(currentSemester), anneeScolaireId }"
        @placer="placerNotesPhoto"
      />

      <!-- Dictée des notes : choix de la colonne -->
      <v-dialog v-model="dictee.choix" max-width="420">
        <v-card>
          <v-card-title class="font-weight-bold">Dicter les notes</v-card-title>
          <v-card-text>
            <div class="mb-2">Quelle colonne voulez-vous remplir ?</div>
            <v-chip-group v-model="dictee.colonne" mandatory selected-class="text-primary" column>
              <v-chip v-for="c in colonnes.filter((x) => x.value !== 'toutes')" :key="c.value" :value="c.value" variant="outlined">{{ c.title }}</v-chip>
            </v-chip-group>
            <div class="text-caption mt-2">
              Dites la note de chaque élève (« quatorze », « douze et demi »…). Vous pouvez aussi dire « absent », « suivant », « retour » ou « stop ».
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="tonal" @click="dictee.choix = false">Annuler</v-btn>
            <v-btn color="deep-purple" variant="flat" @click="demarrerDictee"><v-icon start>mdi-microphone</v-icon>Commencer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Dictée des notes : élève en cours, en grand -->
      <div v-if="dictee.active" class="dictee-panneau">
        <div class="dictee-haut">
          <span class="dictee-colonne">{{ titreColonne(dictee.colonne) }} · {{ dictee.index + 1 }}/{{ students.length }}</span>
          <span class="dictee-ecoute" :class="{ 'dictee-ecoute--on': dictee.ecoute }">
            <v-icon size="16">{{ dictee.ecoute ? "mdi-microphone" : "mdi-microphone-off" }}</v-icon>
            {{ dictee.ecoute ? "J'écoute…" : "Micro en pause" }}
          </span>
        </div>
        <div class="dictee-eleve">{{ eleveDictee ? `${eleveDictee.nom} ${eleveDictee.prenom}` : "" }}</div>
        <div class="dictee-note">{{ eleveDictee ? cellValue(eleveDictee, dictee.colonne) || "—" : "" }}</div>
        <div class="dictee-entendu">{{ dictee.message }}</div>
        <div class="dictee-boutons">
          <v-btn variant="tonal" @click="commandeDictee('retour')"><v-icon start>mdi-chevron-left</v-icon>Retour</v-btn>
          <v-btn variant="tonal" @click="commandeDictee('absent')">Absent</v-btn>
          <v-btn variant="tonal" @click="commandeDictee('suivant')">Suivant<v-icon end>mdi-chevron-right</v-icon></v-btn>
          <v-btn color="error" variant="flat" @click="arreterDictee()"><v-icon start>mdi-stop</v-icon>Terminer</v-btn>
        </div>
      </div>

      <!-- Fiche de notes vide à imprimer (noms et prénoms déjà inscrits) -->
      <v-dialog v-model="ficheDialog" max-width="460">
        <v-card>
          <v-card-title class="font-weight-bold">Fiche de notes vide (PDF)</v-card-title>
          <v-card-text>
            <div class="mb-2">Les noms et prénoms des élèves sont imprimés : il ne reste qu'à écrire les notes au stylo.</div>
            <div class="font-weight-medium mb-1">Nombre de colonnes de notes</div>
            <v-chip-group v-model="ficheColonnes" mandatory selected-class="text-primary">
              <v-chip v-for="n in 4" :key="n" :value="n" variant="outlined">{{ n }}</v-chip>
            </v-chip-group>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="tonal" @click="ficheDialog = false">Annuler</v-btn>
            <v-btn color="primary" :loading="ficheEnCours" @click="telechargerFiche">
              <v-icon start>mdi-download</v-icon>
              Télécharger
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Bilan d'un import -->
      <v-dialog v-model="bilanImportDialog" max-width="520" scrollable>
        <v-card v-if="bilanImport">
          <v-card-title class="d-flex align-center">
            <v-icon color="primary" class="mr-2">mdi-file-check</v-icon>
            Import {{ bilanImport.type }}
          </v-card-title>
          <v-card-text>
            <div class="bilan-ligne ok"><v-icon size="18" color="success">mdi-check-circle</v-icon> {{ bilanImport.ajoutes.length }} note(s) ajoutée(s).</div>
            <div v-if="bilanImport.dejaNote.length" class="bilan-ligne">
              <v-icon size="18" color="warning">mdi-lock</v-icon>
              <div>
                {{ bilanImport.dejaNote.length }} élève(s) avaient déjà une note {{ bilanImport.type }} : elle n'a <strong>pas</strong> été remplacée.
                <div class="bilan-noms">{{ bilanImport.dejaNote.join(', ') }}</div>
                <div class="text-caption">Pour la changer : supprimez-la (note non validée) ou faites une demande à l'administration (note validée).</div>
              </div>
            </div>
            <div v-if="bilanImport.sansNote.length" class="bilan-ligne erreur">
              <v-icon size="18" color="error">mdi-account-alert</v-icon>
              <div>
                {{ bilanImport.sansNote.length }} élève(s) toujours <strong>sans note {{ bilanImport.type }}</strong>
                (absents du fichier ou case vide). Donnez-leur une note ou 00 avant de valider.
                <div class="bilan-noms">{{ bilanImport.sansNote.join(', ') }}</div>
              </div>
            </div>
            <div v-if="bilanImport.nonTrouves.length" class="bilan-ligne erreur">
              <v-icon size="18" color="error">mdi-account-question</v-icon>
              <div>
                Introuvables dans la classe : vérifiez le fichier.
                <div class="bilan-noms">{{ bilanImport.nonTrouves.join(', ') }}</div>
              </div>
            </div>
            <div v-if="bilanImport.invalides.length" class="bilan-ligne erreur">
              <v-icon size="18" color="error">mdi-alert-circle</v-icon>
              <div>
                Notes invalides (0 à 20), non enregistrées.
                <div class="bilan-noms">{{ bilanImport.invalides.join(', ') }}</div>
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" variant="flat" @click="bilanImportDialog = false">OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Snackbar (manuel, visible desktop/mobile) -->
      <v-snackbar
        v-model="snackbar"
        :color="snackbarColor"
        location="top end"
        :timeout="snackbarColor === 'error' ? -1 : 4000"
        :close-on-back="false"
        class="snackbar-strong"
      >
        <div class="snackbar-content">
          <v-icon class="mr-2" size="small" color="white">{{ snackbarIcon }}</v-icon>
          <span class="snackbar-text">{{ snackbarMessage }}</span>
        </div>

        <template v-slot:actions>
          <v-btn variant="text" color="white" @click="snackbar = false">
            <v-icon start size="small">mdi-close</v-icon>
            Fermer
          </v-btn>
        </template>
      </v-snackbar>

      <!-- Dialogues -->
      <v-dialog v-model="dialog1" max-width="520" class="custom-dialog">
        <v-card>
          <v-card-title><span class="headline">Importer des notes</span></v-card-title>
          <v-card-text>
            <v-form ref="form1" v-model="valid1">
              <v-select v-model="selectedNoteType" :items="noteTypes" label="Type de note" required />
              <v-file-input
                v-model="selectedFile"
                label="Fichier Excel"
                accept=".xlsx, .xls"
                prepend-icon="mdi-upload"
                required
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" variant="text" @click="closeImportForm1">Annuler</v-btn>
            <v-btn color="green-darken-1" variant="text" @click="handleFileUpload">Importer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Note pas encore sauvegardée (moyenne pas encore calculée/persistée) :
           l'enseignant reste libre de la supprimer sans validation. -->
      <v-dialog v-model="confirmDirectDialog" max-width="420" class="custom-dialog">
        <v-card>
          <v-card-title>Confirmation</v-card-title>
          <v-card-text>
            Cette note n'est pas encore validée : vous pouvez la supprimer librement. Voulez-vous vraiment la supprimer ?
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="grey" variant="text" :disabled="sendingRequest" @click="confirmDirectDialog = false">Annuler</v-btn>
            <v-btn color="red" variant="text" :loading="sendingRequest" @click="deleteNoteDirect">Supprimer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Note déjà sauvegardée : la suppression devient une demande, rien
           n'est supprimé ici tant que l'administration n'a pas validé. -->
      <v-dialog v-model="dialog" max-width="480" class="custom-dialog" persistent>
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon color="warning" class="mr-2">mdi-shield-alert-outline</v-icon>
            Validation de l'administration requise
          </v-card-title>
          <v-card-text>
            <p>
              Cette note est <strong>déjà enregistrée</strong>. Pour des raisons de contrôle,
              toute modification ou suppression d'une note déjà sauvegardée doit être
              <strong>validée par l'administration</strong> avant d'être appliquée.
            </p>
            <p class="text-caption mb-3">
              Votre demande sera envoyée immédiatement à l'administration, qui pourra
              l'approuver ou la refuser. La note actuelle reste visible et inchangée jusqu'à sa décision.
            </p>
            <v-text-field
              v-model="nouvelleValeurDemande"
              label="Nouvelle note (laisser vide pour supprimer)"
              inputmode="decimal"
              density="compact"
              variant="outlined"
              class="mb-2"
              :error-messages="nouvelleValeurDemande && !parseNote(nouvelleValeurDemande).ok ? 'Une note va de 0 à 20' : ''"
            />
            <v-textarea
              v-model="motifDemande"
              label="Motif de la demande (optionnel)"
              rows="2"
              auto-grow
              density="compact"
              variant="outlined"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="grey" variant="text" :disabled="sendingRequest" @click="closeRequestDialog">Annuler</v-btn>
            <v-btn color="warning" variant="elevated" :loading="sendingRequest" @click="deleteNote">
              <v-icon start size="small">mdi-send</v-icon>
              Envoyer la demande
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showDeleteDialog" max-width="420" class="custom-dialog">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon color="orange-darken-2" class="mr-2">mdi-clock-alert-outline</v-icon>
            Demande envoyée
          </v-card-title>
          <v-card-text>{{ deleteMessage }}</v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" variant="text" @click="showDeleteDialog = false">OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Suivi des demandes envoyées par l'enseignant -->
      <v-dialog v-model="mesDemandesDialog" max-width="640" class="custom-dialog">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon color="orange-darken-2" class="mr-2">mdi-shield-alert-outline</v-icon>
            Mes demandes de modification de notes
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div v-if="mesDemandes.length === 0" class="text-center text-grey py-4">
              <v-icon size="32" class="mb-2">mdi-check-circle-outline</v-icon>
              <div>Aucune demande envoyée pour le moment.</div>
            </div>
            <v-list v-else density="compact">
              <v-list-item v-for="demande in mesDemandes" :key="demande.id" class="mb-2 demande-item">
                <div class="d-flex justify-space-between align-center flex-wrap">
                  <div>
                    <strong>{{ demande.eleve_prenom }} {{ demande.eleve_nom }}</strong>
                    — {{ demande.matiere_nom }} · {{ noteTypeLabel(demande.note_type) }}
                  </div>
                  <v-chip
                    size="small"
                    :color="statutColor(demande.statut)"
                    variant="elevated"
                    class="ml-2"
                  >
                    {{ statutLabel(demande.statut) }}
                  </v-chip>
                </div>
                <div class="text-caption text-grey mt-1">
                  Ancienne valeur : {{ demande.ancienne_valeur ?? '—' }}
                  <span v-if="demande.type_demande === 'modification'"> → Nouvelle valeur : {{ demande.nouvelle_valeur }}</span>
                  <span v-else> (demande de suppression)</span>
                </div>
                <div v-if="demande.commentaire_admin" class="text-caption mt-1">
                  <v-icon size="14">mdi-comment-quote-outline</v-icon>
                  Réponse de l'administration : {{ demande.commentaire_admin }}
                </div>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" variant="text" @click="mesDemandesDialog = false">Fermer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialogElevesNonTrouves" max-width="520" class="custom-dialog">
        <v-card>
          <v-card-title class="headline">Élèves introuvables</v-card-title>
          <v-card-text>
            <div>Les élèves suivants n’ont pas été trouvés dans la classe sélectionnée :</div>
            <v-list density="compact">
              <v-list-item v-for="(eleve, index) in nonFoundStudents" :key="index">
                <v-list-item-title>{{ eleve }}</v-list-item-title>
              </v-list-item>
            </v-list>
            <div class="gog">Veuillez vérifier si vous importez le bon fichier</div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="text" @click="dialogElevesNonTrouves = false">Fermer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </v-app>
</template>

<script>
import axios from "axios";
import { lireNoteParlee } from "@/composables/noteParlee";
import NotesParPhoto from "@/components/professeurs/NotesParPhoto.vue";

export default {
  components: { NotesParPhoto },
  props: {
    subjectId: { type: Number, required: true },
    classeId: { type: Number, required: true },
    etablissementId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  setup() {
    // Période (semestre) affichée : conservée dans l'URL (?periode=).
    const currentSemester = useUrlState("periode", "");
    return { currentSemester };
  },
  data: () => ({
    dialog1: false,
    dialog2: false,
    dialogElevesNonTrouves: false,

    snackbar: false,
    snackbarMessage: "",
    snackbarColor: "success",
    snackbarIcon: "mdi-check-circle",

    dialog: false,
    confirmDirectDialog: false,
    deleteMessage: "",
    showDeleteDialog: false,
    noteToDelete: null,
    motifDemande: "",
    nouvelleValeurDemande: "",
    sendingRequest: false,

    // Demandes de modification/suppression de notes (circuit de validation admin)
    mesDemandes: [],
    mesDemandesDialog: false,
    demandesNonVuesCount: 0,

    search: "",
    valid1: false,
    valid2: false,

    matiereNom: "",
    semesters: [],

    headers: [
      { title: "Nom/Prénom", value: "studentName", sortable: false },
      { title: "Inter 1", value: "inter1" },
      { title: "Inter 2", value: "inter2" },
      { title: "Inter 3", value: "inter3" },
      { title: "Inter 4", value: "inter4" },
      { title: "MoyI", value: "MoyI" },
      { title: "Devoir 1", value: "Dev1" },
      { title: "Devoir 2", value: "Dev2" },
      { title: "Moy", value: "Moy" },
      { title: "Moycoef", value: "Moycoef" },
    ],
    students: [],

    noteTypes: ["Inter1", "Inter2", "Inter3", "Inter4", "Devoir1", "Devoir2"],
    noteTypes1: ["Inter1", "Inter2", "Inter3", "Inter4"],
    selectedNoteType: null,
    selectedFile: null,

    nonFoundStudents: [],

    // Notes par photo
    photoDialog: false,

    // Dictée des notes
    dictee: { choix: false, active: false, colonne: "inter1", index: 0, ecoute: false, message: "" },
    reconnaissance: null,

    // Fiche de notes vide (PDF)
    ficheDialog: false,
    ficheColonnes: 1,
    ficheEnCours: false,

    // Saisie directe : notes tapées et pas encore enregistrées.
    noteFields: ["inter1", "inter2", "inter3", "inter4", "Dev1", "Dev2"],
    edits: {},
    savingEdits: false,
    // Enregistrement automatique et hors ligne
    etatSauvegarde: "ok", // ok | envoi | horsligne | erreur
    aVerifier: {}, // cases mises à 00 d'un coup : envoyées seulement après confirmation
    minuterieEnvoi: null,
    minuterieMoyennes: null,
    relanceHorsLigne: null,
    validateDialog: false,
    manquantsDialog: false,
    manquants: [],
    peuDeNotesDialog: false,
    peuDeNotesConfirme: false,
    peuDeNotes: { nbInter: 0, nbDev: 0 },
    bilanImportDialog: false,
    bilanImport: null,
    // Sur téléphone : une seule colonne de notes à la fois (plus lisible).
    colonne: "toutes",
    colonnes: [
      { title: "Toutes", value: "toutes" },
      { title: "Inter 1", value: "inter1" }, { title: "Inter 2", value: "inter2" },
      { title: "Inter 3", value: "inter3" }, { title: "Inter 4", value: "inter4" },
      { title: "Devoir 1", value: "Dev1" }, { title: "Devoir 2", value: "Dev2" },
    ],
  }),

  computed: {
    visibleHeaders() {
      if (this.colonne === "toutes") return this.headers;
      return this.headers.filter((h) => ["studentName", this.colonne, "Moy"].includes(h.value));
    },
    editCount() {
      return Object.keys(this.edits).length;
    },
    // Colonne proposée pour la photo : l'affichée si elle a des cases libres, sinon la première libre.
    colonnePourPhoto() {
      const libre = (f) => this.students.some((e) => this.caseDictable(e, f) && !this.cellValue(e, f));
      return (this.colonne !== "toutes" && libre(this.colonne) && this.colonne) || this.noteFields.find(libre) || "inter1";
    },
    dicteePossible() {
      return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    },
    eleveDictee() {
      return this.students[this.dictee.index] || null;
    },
    nbAVerifier() {
      return Object.keys(this.aVerifier).filter((k) => Object.prototype.hasOwnProperty.call(this.edits, k)).length;
    },
    etatAffiche() {
      const attente = this.editCount - this.nbAVerifier;
      if (this.etatSauvegarde === "horsligne" && attente > 0) {
        return { cle: "horsligne", icone: "mdi-wifi-off", texte: `Hors ligne : ${attente} note(s) gardée(s) sur ce téléphone` };
      }
      if (this.etatSauvegarde === "erreur") return { cle: "erreur", icone: "mdi-alert-circle-outline", texte: "Notes non enregistrées : nouvel essai bientôt" };
      if (this.etatSauvegarde === "envoi" || attente > 0) return { cle: "envoi", icone: "mdi-cloud-upload-outline", texte: "Enregistrement…" };
      return { cle: "ok", icone: "mdi-cloud-check-outline", texte: "Notes enregistrées" };
    },
    aRevalider() {
      return this.students.some((s) => s.aRevalider);
    },
    casesManquantes() {
      const set = new Set();
      this.manquants.forEach((m) => m.champs.forEach((f) => set.add(`${m.eleveId}:${f}`)));
      return set;
    },
  },

  methods: {
    editKey(item, f) {
      return `${item.id}:${f}`;
    },
    isEdited(item, f) {
      return Object.prototype.hasOwnProperty.call(this.edits, this.editKey(item, f));
    },
    cellValue(item, f) {
      if (this.isEdited(item, f)) return this.edits[this.editKey(item, f)];
      return item[f] === null || item[f] === undefined ? "" : String(item[f]).replace(".", ",");
    },
    parseNote(text) {
      const t = String(text ?? "").trim().replace(",", ".");
      if (t === "") return { ok: true, value: null };
      const n = Number(t);
      return Number.isFinite(n) && n >= 0 && n <= 20 ? { ok: true, value: n } : { ok: false };
    },
    // Case signalée vide à la validation, et toujours vide.
    isMissing(item, f) {
      if (!this.casesManquantes.has(this.editKey(item, f))) return false;
      const t = this.isEdited(item, f) ? String(this.edits[this.editKey(item, f)]).trim() : (item[f] ?? "");
      return t === "";
    },
    mettreZeroManquants() {
      const next = { ...this.edits };
      this.manquants.forEach((m) => m.champs.forEach((f) => { next[`${m.eleveId}:${f}`] = "0"; }));
      this.edits = next;
      const verif = { ...this.aVerifier };
      this.manquants.forEach((m) => m.champs.forEach((f) => { verif[`${m.eleveId}:${f}`] = true; }));
      this.aVerifier = verif;
      this.persisterAttente();
      this.manquantsDialog = false;
      this.showSnack(`${this.nbAVerifier} case(s) à 00, en jaune : vérifiez puis « Confirmer les 00 ».`, "info");
    },
    isValidCell(item, f) {
      return !this.isEdited(item, f) || this.parseNote(this.edits[this.editKey(item, f)]).ok;
    },
    onEdit(item, f, text) {
      const key = this.editKey(item, f);
      const original = item[f] === null || item[f] === undefined ? "" : String(item[f]);
      const parsed = this.parseNote(text);
      const same = parsed.ok && String(parsed.value ?? "") === original;
      const next = { ...this.edits };
      if (same) delete next[key];
      else next[key] = text;
      this.edits = next;
      if (this.aVerifier[key]) {
        const verif = { ...this.aVerifier };
        delete verif[key]; // tapée à la main : plus besoin de confirmation
        this.aVerifier = verif;
      }
      this.persisterAttente();
      this.planifierEnvoi();
    },

    // ---------------------------------------------------------------
    // Enregistrement automatique et mode hors ligne : chaque note part
    // une seconde après la frappe ; en attendant (ou sans réseau) elle est
    // gardée dans le téléphone et renvoyée dès que possible.
    // ---------------------------------------------------------------
    // ---------------------------------------------------------------
    // Dictée des notes (reconnaissance vocale du navigateur, en français)
    // ---------------------------------------------------------------
    raisonCaseBloquee(eleve, f) {
      if ((eleve.verrouillees || []).includes(f)) return "note validée (verrouillée)";
      if (this.isPending(eleve.id, f)) return "demande en cours auprès de l'administration";
      return null;
    },
    // Notes vérifiées sur l'écran photo : placées dans la colonne, puis
    // enregistrées automatiquement comme une saisie au clavier.
    placerNotesPhoto(notes) {
      notes.forEach(({ eleveId, champ, texte }) => {
        const eleve = this.students.find((e) => e.id === eleveId);
        if (eleve && !this.raisonCaseBloquee(eleve, champ) && !this.cellValue(eleve, champ)) this.onEdit(eleve, champ, texte);
      });
      if (window.innerWidth < 600 && notes[0]) this.colonne = notes[0].champ;
      this.showSnack(`📷 ${notes.length} note(s) placée(s) : elles s'enregistrent toutes seules.`, "success");
    },
    titreColonne(f) {
      return this.colonnes.find((c) => c.value === f)?.title || f;
    },
    caseDictable(eleve, f) {
      return eleve && !(eleve.verrouillees || []).includes(f) && !this.isPending(eleve.id, f);
    },
    ouvrirDictee() {
      // Colonne affichée, sinon la première colonne qui a encore des cases vides.
      const vide = (f) => this.students.some((e) => this.caseDictable(e, f) && (this.cellValue(e, f) === "" || this.cellValue(e, f) === null));
      const libre = (f) => this.students.some((e) => this.caseDictable(e, f));
      this.dictee.colonne =
        (this.colonne !== "toutes" && vide(this.colonne) && this.colonne) || this.noteFields.find(vide) || this.noteFields.find(libre) || "inter1";
      this.dictee.choix = true;
    },
    prochainIndex(depuis, sens = 1) {
      let i = depuis;
      while (i >= 0 && i < this.students.length) {
        if (this.caseDictable(this.students[i], this.dictee.colonne)) return i;
        i += sens;
      }
      return -1;
    },
    demarrerDictee() {
      const Reco = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Reco) return;
      this.dictee.choix = false;
      if (window.innerWidth < 600) this.colonne = this.dictee.colonne;
      // Premier élève dont la case est encore vide.
      let debut = this.students.findIndex((e) => this.caseDictable(e, this.dictee.colonne) && !this.cellValue(e, this.dictee.colonne));
      if (debut < 0) debut = this.prochainIndex(0);
      if (debut < 0) {
        this.showSnack("Toutes les notes de cette colonne sont déjà validées.", "info");
        return;
      }
      this.dictee.index = debut;
      this.dictee.active = true;
      this.dictee.message = "Dites la note de l'élève.";
      const reco = new Reco();
      reco.lang = "fr-FR";
      reco.continuous = true;
      reco.interimResults = false;
      reco.maxAlternatives = 3;
      reco.onstart = () => { this.dictee.ecoute = true; };
      reco.onresult = (ev) => {
        const res = ev.results[ev.results.length - 1];
        const essais = Array.from(res).map((a) => a.transcript);
        const lu = essais.map(lireNoteParlee).find((r) => r.type !== "inconnu");
        if (!lu) {
          this.dictee.message = `Pas compris : « ${essais[0] || ""} ». Répétez la note.`;
          return;
        }
        if (lu.type === "commande") this.commandeDictee(lu.commande);
        else this.noteDictee(lu.valeur, essais[0]);
      };
      reco.onerror = (ev) => {
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
          this.showSnack("Le micro est refusé : autorisez-le dans le navigateur pour dicter les notes.", "warning");
          this.arreterDictee(false);
        }
      };
      // Le navigateur coupe l'écoute après un silence : on la relance.
      reco.onend = () => {
        this.dictee.ecoute = false;
        if (this.dictee.active) setTimeout(() => { try { reco.start(); } catch { /* déjà relancée */ } }, 250);
      };
      this.reconnaissance = reco;
      try { reco.start(); } catch { /* déjà démarrée */ }
      this.montrerEleveDictee();
    },
    noteDictee(valeur, entendu) {
      const eleve = this.eleveDictee;
      if (!eleve) return;
      this.onEdit(eleve, this.dictee.colonne, String(valeur).replace(".", ","));
      this.dictee.message = `« ${entendu} » → ${String(valeur).replace(".", ",")} pour ${eleve.prenom}`;
      this.commandeDictee("suivant", false);
    },
    commandeDictee(commande, annoncer = true) {
      if (commande === "stop") return this.arreterDictee();
      if (commande === "retour") {
        const i = this.prochainIndex(this.dictee.index - 1, -1);
        if (i >= 0) this.dictee.index = i;
        if (annoncer) this.dictee.message = "Élève précédent : dites la note.";
        return this.montrerEleveDictee();
      }
      if (commande === "absent" && annoncer) this.dictee.message = `${this.eleveDictee?.prenom || "Élève"} : absent (case laissée vide).`;
      if (commande === "suivant" && annoncer) this.dictee.message = "Élève suivant.";
      const i = this.prochainIndex(this.dictee.index + 1);
      if (i < 0) {
        this.arreterDictee();
        this.showSnack("Dictée terminée : vérifiez les notes, elles s'enregistrent toutes seules.", "success");
        return;
      }
      this.dictee.index = i;
      this.montrerEleveDictee();
    },
    montrerEleveDictee() {
      this.$nextTick(() => {
        const eleve = this.eleveDictee;
        if (!eleve) return;
        const champ = document.querySelector(`input.note-input[aria-label="${this.dictee.colonne} de ${eleve.prenom} ${eleve.nom}"]`);
        if (champ) champ.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    },
    arreterDictee() {
      this.dictee.active = false;
      this.dictee.ecoute = false;
      try { this.reconnaissance?.stop(); } catch { /* déjà arrêtée */ }
      this.reconnaissance = null;
    },

    cleAttente() {
      const enseignant = decodeJwtPayload(localStorage.getItem("token"))?.id || "x";
      return `notes-attente:${enseignant}:${this.classeId}:${this.subjectId}:${this.getSemesterId(this.currentSemester) || this.currentSemester}`;
    },
    persisterAttente() {
      try {
        const cle = this.cleAttente();
        if (this.editCount) localStorage.setItem(cle, JSON.stringify({ edits: this.edits, aVerifier: this.aVerifier }));
        else localStorage.removeItem(cle);
      } catch {
        // stockage indisponible (navigation privée) : l'envoi immédiat reste actif
      }
    },
    restaurerAttente() {
      try {
        const brut = localStorage.getItem(this.cleAttente());
        if (!brut) return;
        const { edits = {}, aVerifier = {} } = JSON.parse(brut);
        if (!Object.keys(edits).length) return;
        this.edits = { ...edits, ...this.edits };
        this.aVerifier = { ...aVerifier, ...this.aVerifier };
        this.planifierEnvoi(300);
      } catch {
        // données illisibles : ignorées
      }
    },
    planifierEnvoi(delai = 1200) {
      clearTimeout(this.minuterieEnvoi);
      this.minuterieEnvoi = setTimeout(() => this.envoyerAuto(), delai);
    },
    async envoyerAuto() {
      if (this.savingEdits) return this.planifierEnvoi(800);
      const lot = Object.entries(this.edits).filter(([k, t]) => !this.aVerifier[k] && this.parseNote(t).ok);
      if (!lot.length) {
        if (this.etatSauvegarde !== "horsligne" || !this.editCount) this.etatSauvegarde = "ok";
        return;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        this.etatSauvegarde = "horsligne";
        return;
      }
      const envoye = Object.fromEntries(lot);
      this.etatSauvegarde = "envoi";
      try {
        const { data } = await axios.post("/api/notes/saisie", {
          classeId: this.classeId,
          subjectId: this.subjectId,
          semesterId: this.getSemesterId(this.currentSemester),
          anneeScolaireId: this.anneeScolaireId,
          valeurs: lot.map(([key, text]) => {
            const [eleveId, champ] = key.split(":");
            return { eleveId: Number(eleveId), champ, valeur: this.parseNote(text).value };
          }),
        });
        const refuses = new Set((data.refus || []).map((r) => `${r.eleveId}:${r.champ}`));
        const next = { ...this.edits };
        Object.entries(envoye).forEach(([key, text]) => {
          if (refuses.has(key) || next[key] !== text) return; // refusée, ou retapée entre-temps
          delete next[key];
          const [eleveId, champ] = key.split(":");
          const eleve = this.students.find((st) => String(st.id) === eleveId);
          if (eleve) eleve[champ] = this.parseNote(text).value;
        });
        this.edits = next;
        this.persisterAttente();
        this.etatSauvegarde = "ok";
        clearInterval(this.relanceHorsLigne);
        this.relanceHorsLigne = null;
        if (data.refus && data.refus.length) {
          this.showSnack(`⚠️ ${data.refus.length} note(s) refusée(s) : ${data.refus[0].raison}.`, "warning");
        }
        // Moyennes recalculées par le serveur : rafraîchies dès que l'enseignant fait une pause.
        clearTimeout(this.minuterieMoyennes);
        this.minuterieMoyennes = setTimeout(() => this.rafraichirSiInactif(), 5000);
        if (Object.keys(this.edits).some((k) => !this.aVerifier[k] && !envoye[k])) this.planifierEnvoi(300);
      } catch (error) {
        if (!error.response) {
          // Pas de réseau : les notes restent dans le téléphone, nouvel essai régulier.
          this.etatSauvegarde = "horsligne";
          if (!this.relanceHorsLigne) this.relanceHorsLigne = setInterval(() => this.envoyerAuto(), 20000);
        } else {
          this.etatSauvegarde = "erreur";
          this.showSnack(error.response.data?.message || "❌ Les notes n'ont pas pu être enregistrées.", "error");
          if (!this.relanceHorsLigne) this.relanceHorsLigne = setInterval(() => this.envoyerAuto(), 30000);
        }
      }
    },
    // Recharge les moyennes sans déranger une saisie en cours.
    rafraichirSiInactif() {
      const actif = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains("note-input");
      if (actif || this.editCount - this.nbAVerifier > 0) {
        this.minuterieMoyennes = setTimeout(() => this.rafraichirSiInactif(), 5000);
        return;
      }
      this.fetchNotesData();
    },
    auRetourDuReseau() {
      if (this.editCount) this.envoyerAuto();
    },
    // Entrée : passe à la case du dessous (même colonne), comme dans un tableur.
    focusNext(event) {
      const inputs = Array.from(document.querySelectorAll(".note-input"));
      const current = event.target;
      const cell = current.closest("td");
      const index = cell ? Array.from(cell.parentNode.children).indexOf(cell) : -1;
      const row = current.closest("tr");
      let next = row && row.nextElementSibling;
      while (next) {
        const target = next.children[index] && next.children[index].querySelector(".note-input");
        if (target) { target.focus(); target.select(); return; }
        next = next.nextElementSibling;
      }
      const i = inputs.indexOf(current);
      if (i >= 0 && inputs[i + 1]) inputs[i + 1].focus();
    },
    async saveEdits() {
      if (!this.editCount) return true;
      const invalid = Object.values(this.edits).filter((t) => !this.parseNote(t).ok).length;
      if (invalid) {
        this.showSnack(`⚠️ ${invalid} note(s) invalide(s) (en rouge) : une note va de 0 à 20.`, "warning");
        return false;
      }
      this.savingEdits = true;
      try {
        const valeurs = Object.entries(this.edits).map(([key, text]) => {
          const [eleveId, champ] = key.split(":");
          return { eleveId: Number(eleveId), champ, valeur: this.parseNote(text).value };
        });
        const { data } = await axios.post("/api/notes/saisie", {
          classeId: this.classeId,
          subjectId: this.subjectId,
          semesterId: this.getSemesterId(this.currentSemester),
          anneeScolaireId: this.anneeScolaireId,
          valeurs,
        });
        this.edits = {};
        this.aVerifier = {};
        this.persisterAttente();
        this.etatSauvegarde = "ok";
        await this.fetchNotesData();
        if (data.refus && data.refus.length) {
          this.showSnack(`⚠️ ${data.enregistrees} note(s) enregistrée(s), ${data.refus.length} refusée(s) : ${data.refus[0].raison}.`, "warning");
        } else {
          this.showSnack(`✅ ${data.enregistrees} note(s) enregistrée(s).`, "success");
        }
        return true;
      } catch (error) {
        this.showSnack(error?.response?.data?.message || "❌ Les notes n'ont pas pu être enregistrées.", "error");
        return false;
      } finally {
        this.savingEdits = false;
      }
    },
    askValidate() {
      this.validateDialog = true;
    },
    warnUnsaved(event) {
      // Les notes en attente sont gardées dans le téléphone : on ne prévient
      // que pour des 00 non confirmés.
      if (this.nbAVerifier) {
        event.preventDefault();
        event.returnValue = "";
      }
    },
    showSnack(message, type = "success") {
      const map = {
        success: { color: "success", icon: "mdi-check-circle" },
        error: { color: "error", icon: "mdi-alert-circle" },
        warning: { color: "warning", icon: "mdi-alert" },
        info: { color: "info", icon: "mdi-information" },
      };

      const cfg = map[type] || map.info;
      this.snackbarMessage = message;
      this.snackbarColor = cfg.color;
      this.snackbarIcon = cfg.icon;
      this.snackbar = true; // timeout = -1 => reste affiché jusqu'à fermeture
    },

    getButtonColor(semester) {
      return this.currentSemester === semester ? "primary" : "secondary";
    },

    changeSemester(semester) {
      // Les notes en attente restent gardées pour leur période et repartiront.
      if (this.editCount) this.envoyerAuto();
      this.edits = {};
      this.aVerifier = {};
      this.currentSemester = semester;
      this.fetchNotesData().then(() => this.restaurerAttente());
    },

    // Fiche de notes vide à imprimer : en-tête répété sur chaque page (école,
    // classe, matière, enseignant, période), N°, nom, prénom(s), 1 à 4 grandes
    // cases de note et une observation. Un petit code par page servira à la
    // lecture des fiches photographiées.
    async telechargerFiche() {
      this.ficheEnCours = true;
      try {
        const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
        const jeton = decodeJwtPayload(localStorage.getItem("token")) || {};
        let classeNom = "";
        try {
          const { data } = await axios.get("/api/enseignant/matieres-classes", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
          classeNom = (data || []).find((r) => Number(r.classe_id) === Number(this.classeId))?.classe || "";
        } catch {
          classeNom = "";
        }
        const eleves = [...this.students].sort((a, b) =>
          `${a.nom || ""} ${a.prenom || ""}`.localeCompare(`${b.nom || ""} ${b.prenom || ""}`, "fr", { sensitivity: "base" })
        );
        const n = this.ficheColonnes;
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const enseignant = `${jeton.enseignant_prenom || ""} ${jeton.enseignant_nom || ""}`.trim();
        const code = `EE-${this.classeId}-${this.subjectId}`;

        autoTable(doc, {
          startY: 46,
          margin: { top: 46, left: 12, right: 12, bottom: 16 },
          head: [["N°", "Nom", "Prénom(s)", ...Array.from({ length: n }, () => "Note /20"), "Observation"]],
          body: eleves.map((e, i) => [String(i + 1), (e.nom || "").toUpperCase(), e.prenom || "", ...Array(n).fill(""), ""]),
          theme: "grid",
          styles: { fontSize: 10, cellPadding: 2.4, minCellHeight: 9, valign: "middle", lineColor: [120, 120, 120], lineWidth: 0.2, textColor: [20, 20, 20] },
          headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: "bold", halign: "center" },
          alternateRowStyles: { fillColor: [244, 246, 249] },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: n > 2 ? 38 : 48, fontStyle: "bold" },
            2: { cellWidth: n > 2 ? 40 : 52 },
            ...Object.fromEntries(Array.from({ length: n }, (_, k) => [3 + k, { cellWidth: n > 2 ? 18 : 22 }])),
          },
          didDrawPage: () => {
            const largeur = doc.internal.pageSize.getWidth();
            doc.setFontSize(9);
            doc.setTextColor(90);
            doc.text(jeton.etablissement_nom || "", 12, 12);
            doc.text(`Année scolaire ${this.anneeScolaire || ""}`, largeur - 12, 12, { align: "right" });
            doc.setFontSize(15);
            doc.setTextColor(13, 71, 161);
            doc.text("FICHE DE NOTES", largeur / 2, 21, { align: "center" });
            doc.setFontSize(10);
            doc.setTextColor(30);
            doc.text(`Classe : ${classeNom}`, 12, 30);
            doc.text(`Matière : ${this.matiereNom || ""}`, 70, 30);
            doc.text(`Période : ${this.currentSemester || ""}`, 140, 30);
            doc.text(`Enseignant : ${enseignant}`, 12, 37);
            doc.text("Évaluation : ................................................", 105, 37);
          },
        });

        const total = doc.getNumberOfPages();
        for (let p = 1; p <= total; p += 1) {
          doc.setPage(p);
          const largeur = doc.internal.pageSize.getWidth();
          const hauteur = doc.internal.pageSize.getHeight();
          doc.setFontSize(9);
          doc.setTextColor(90);
          doc.text(`Page ${p}/${total}`, largeur / 2, hauteur - 7, { align: "center" });
          doc.setFontSize(7);
          doc.text(`${code}-P${p}`, largeur - 12, hauteur - 7, { align: "right" });
        }
        const propre = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
        doc.save(`Fiche_notes_${propre(classeNom) || "classe"}_${propre(this.matiereNom)}.pdf`);
        this.ficheDialog = false;
      } catch (e) {
        console.error("Fiche de notes :", e);
        this.showSnack("❌ La fiche n'a pas pu être créée.", "error");
      } finally {
        this.ficheEnCours = false;
      }
    },

    // Récupération des étudiants et tri par ordre alphabétique
    async getStudents() {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`/api/classes/${this.classeId}/eleves`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.students = response.data || [];

        this.students.sort((a, b) => {
          const nomA = (a.nom || "").toUpperCase();
          const nomB = (b.nom || "").toUpperCase();
          return nomA < nomB ? -1 : nomA > nomB ? 1 : 0;
        });

      } catch (error) {
        console.error("Erreur lors de la récupération des élèves", error);
        this.showSnack("❌ Impossible de charger les élèves.", "error");
      }
    },

    async fetchSemesters() {
      try {
        const response = await axios.get(`/api/semesters/${this.etablissementId}`);
        this.semesters = response.data || [];

        if (this.semesters.length > 0) {
          // Garde la période lue dans l'URL si elle existe, sinon la 1ère.
          if (!this.semesters.some((s) => s.nom === this.currentSemester)) {
            this.currentSemester = this.semesters[0].nom;
          }
          await this.fetchNotesData();
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des semestres", error);
        this.showSnack("❌ Impossible de charger les semestres.", "error");
      }
    },

    confirmDelete(student, noteTypes) {
      if (!noteTypes) return;

      const noteTypesMapping = {
        inter1: "inter1", inter2: "inter2", inter3: "inter3", inter4: "inter4", Dev1: "Dev1", Dev2: "Dev2",
        Inter1: "inter1",
        Inter2: "inter2",
        Inter3: "inter3",
        Inter4: "inter4",
        Devoir1: "Dev1",
        Devoir2: "Dev2",
      };

      const mappedNoteType = noteTypesMapping[noteTypes];
      if (!mappedNoteType) return;

      if (this.isPending(student.id, mappedNoteType)) {
        this.showSnack("⏳ Une demande est déjà en attente de validation pour cette note.", "warning");
        return;
      }

      this.noteToDelete = { student, noteType: mappedNoteType };

      // Tant que "Sauvegarder" n'a pas été cliqué pour cet élève (moyenne pas
      // encore calculée/persistée), la note n'est pas "officiellement"
      // enregistrée : suppression libre, sans validation administrative.
      if (this.isAlreadySaved(student, mappedNoteType)) {
        this.motifDemande = "";
        this.nouvelleValeurDemande = "";
        this.dialog = true;
      } else {
        this.confirmDirectDialog = true;
      }
    },

    // Note validée (présente lors de la dernière « Valider les moyennes ») :
    // suppression sur demande à l'administration. Une note ajoutée depuis
    // reste libre.
    isAlreadySaved(student, field) {
      return (student.verrouillees || []).includes(field);
    },

    closeRequestDialog() {
      this.dialog = false;
      this.noteToDelete = null;
      this.motifDemande = "";
    },

    // Suppression LIBRE : n'est appelée que pour une note dont la moyenne n'a
    // jamais été sauvegardée. Le serveur revérifie cette condition (défense
    // en profondeur) et bascule vers le circuit de demande si elle a changé
    // entre-temps (ex: un autre onglet a sauvegardé entre-temps).
    async deleteNoteDirect() {
      if (!this.noteToDelete || this.sendingRequest) return;

      const { student, noteType } = this.noteToDelete;
      const semestreId = this.getSemesterId(this.currentSemester);

      this.sendingRequest = true;
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/deleteNote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            eleveId: student.id,
            semestreId,
            anneeScolaireId: this.anneeScolaireId,
            classeId: this.classeId,
            matiereId: this.subjectId,
            etablissementId: this.etablissementId,
            noteType,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          if (result.code === "ADMIN_APPROVAL_REQUIRED") {
            // La moyenne a été sauvegardée entre-temps : on bascule vers le
            // circuit de demande au lieu d'échouer silencieusement.
            this.confirmDirectDialog = false;
            this.motifDemande = "";
            this.dialog = true;
            this.showSnack("⏳ Cette note a déjà été sauvegardée : une validation de l'administration est requise.", "warning");
            return;
          }
          throw new Error(result.message || "Erreur suppression.");
        }

        this.students = this.students.map((s) => {
          if (s.id === student.id) s[noteType] = null;
          return s;
        });

        this.confirmDirectDialog = false;
        this.noteToDelete = null;
        this.showSnack(`✅ Note supprimée pour ${result.nom} ${result.prenom}.`, "success");
      } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        this.confirmDirectDialog = false;
        this.showSnack("❌ Une erreur s'est produite lors de la suppression.", "error");
      } finally {
        this.sendingRequest = false;
      }
    },

    // Envoie une DEMANDE de suppression à l'administration (note déjà
    // sauvegardée) : la note n'est jamais modifiée directement par
    // l'enseignant. Elle ne sera effacée que lorsque l'administration
    // approuvera la demande.
    async deleteNote() {
      if (!this.noteToDelete || this.sendingRequest) return;
      if (this.nouvelleValeurDemande && !this.parseNote(this.nouvelleValeurDemande).ok) return;

      const { student, noteType } = this.noteToDelete;
      const semestreId = this.getSemesterId(this.currentSemester);

      this.sendingRequest = true;
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/notes/modification-requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            eleveId: student.id,
            classeId: this.classeId,
            matiereId: this.subjectId,
            semestreId,
            anneeScolaireId: this.anneeScolaireId,
            etablissementId: this.etablissementId,
            noteType,
            ancienneValeur: student[noteType],
            nouvelleValeur: this.parseNote(this.nouvelleValeurDemande).ok ? this.parseNote(this.nouvelleValeurDemande).value : null,
            motif: this.motifDemande || null,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Erreur lors de l'envoi de la demande.");

        this.dialog = false;
        this.deleteMessage = `⏳ Demande envoyée pour ${student.prenom} ${student.nom}. La note reste inchangée jusqu'à la validation de l'administration.`;
        this.showDeleteDialog = true;

        this.showSnack("✅ Demande envoyée à l'administration.", "success");
        this.noteToDelete = null;
        this.motifDemande = "";
        await this.fetchMesDemandes();
      } catch (error) {
        console.error("Erreur lors de l'envoi de la demande :", error);
        const message = error.message && error.message.includes("attente")
          ? `⏳ ${error.message}`
          : "❌ Une erreur s'est produite lors de l'envoi de la demande.";
        this.showSnack(message, error.message && error.message.includes("attente") ? "warning" : "error");
      } finally {
        this.sendingRequest = false;
      }
    },

    // --- Demandes de modification/suppression : suivi côté enseignant ---
    noteKey(eleveId, noteType) {
      return `${eleveId}_${noteType}`;
    },

    isPending(eleveId, noteType) {
      return this.mesDemandes.some((d) =>
        d.statut === "en_attente" &&
        Number(d.eleve_id) === Number(eleveId) &&
        d.note_type === noteType &&
        Number(d.matieres_id) === Number(this.subjectId) &&
        Number(d.classe_id) === Number(this.classeId) &&
        Number(d.semestre_id) === Number(this.getSemesterId(this.currentSemester))
      );
    },

    noteTypeLabel(noteType) {
      const labels = {
        inter1: "Inter 1", inter2: "Inter 2", inter3: "Inter 3", inter4: "Inter 4",
        TP1: "TP 1", TP2: "TP 2", Dev1: "Devoir 1", Dev2: "Devoir 2",
      };
      return labels[noteType] || noteType;
    },

    statutLabel(statut) {
      const labels = { en_attente: "En attente", approuvee: "Approuvée", rejetee: "Refusée" };
      return labels[statut] || statut;
    },

    statutColor(statut) {
      const colors = { en_attente: "orange-darken-2", approuvee: "green-darken-1", rejetee: "red-darken-1" };
      return colors[statut] || "grey";
    },

    async fetchMesDemandes() {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/notes/modification-requests/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.mesDemandes = response.data || [];
      } catch (error) {
        console.error("Erreur lors de la récupération des demandes :", error);
      }
      await this.fetchDemandesNonVuesCount();
    },

    async fetchDemandesNonVuesCount() {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/notes/modification-requests/mine/count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.demandesNonVuesCount = response.data.count || 0;
      } catch (error) {
        console.error("Erreur lors du comptage des demandes :", error);
      }
    },

    async openMesDemandes() {
      await this.fetchMesDemandes();
      this.mesDemandesDialog = true;

      if (this.demandesNonVuesCount > 0) {
        try {
          const token = localStorage.getItem("token");
          await axios.put("/api/notes/modification-requests/mine/mark-seen", {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
          this.demandesNonVuesCount = 0;
        } catch (error) {
          console.error("Erreur lors du marquage des demandes comme vues :", error);
        }
      }
    },

    openImportForm1() {
      this.dialog1 = true;
    },
    closeImportForm1() {
      this.dialog1 = false;
    },

    async handleFileUpload() {
      if (!this.selectedNoteType || !this.selectedFile) {
        this.showSnack("⚠️ Veuillez remplir tous les champs requis.", "warning");
        return;
      }

      const formData = new FormData();
      formData.append("typeNote", this.selectedNoteType);
      formData.append("file", this.selectedFile);
      formData.append("semestreId", this.getSemesterId(this.currentSemester));
      formData.append("matiereId", this.subjectId);
      formData.append("classeId", this.classeId);
      formData.append("etablissementId", this.etablissementId);
      formData.append("anneeScolaireId", this.anneeScolaireId);

      try {
        const response = await axios.post(`/api/upload/excel`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const d = response.data.details || {};
        this.bilanImport = {
          type: this.selectedNoteType,
          ajoutes: d.ajoutes || [], dejaNote: d.dejaNote || [], nonTrouves: d.nonTrouves || [],
          invalides: d.invalides || [], sansNote: d.sansNote || [],
        };
        this.bilanImportDialog = true;
        this.dialog1 = false;

        await this.fetchNotesData();

        setTimeout(() => {
          this.selectedNoteType = "";
          this.selectedFile = null;
        }, 50);

        if (this.$refs.form1) this.$refs.form1.resetValidation();
      } catch (error) {
        let message = "❌ Erreur lors de l'importation.";
        let details = [];

        if (error.response) {
          const status = error.response.status;
          const data = error.response.data || {};
          if (status === 409) {
            message = data.message || "⚠️ Certaines notes existent déjà.";
            if (Array.isArray(data.details)) details = data.details;
          } else if (status === 400) {
            message = data.message || "⚠️ Requête invalide.";
          } else if (status === 500) {
            message = "❌ Erreur serveur. Réessayez plus tard.";
          } else {
            message = data.message || message;
          }
        }

        this.showSnack(message, "error");

        if (details.length > 0) {
          this.nonFoundStudents = details;
          this.dialogElevesNonTrouves = true;
        }
      }
    },

    getSemesterId(semesterName) {
      const semester = this.semesters.find((sem) => sem.nom === semesterName);
      return semester ? semester.id : null;
    },

    // Récupération des notes selon le semestre
    async fetchNotesData() {
      try {
        const semesterId = this.getSemesterId(this.currentSemester);
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `/api/notes/${this.classeId}/${this.subjectId}/${semesterId}/${this.anneeScolaireId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const notesData = response.data || [];

        this.students.forEach((student) => {
          const studentNotes = notesData.find((note) => note.eleveId === student.id);

          if (studentNotes) {
            student.notesId = studentNotes.notesId || null;
            student.inter1 = studentNotes.inter1 !== null ? Number(studentNotes.inter1) : null;
            student.inter2 = studentNotes.inter2 !== null ? Number(studentNotes.inter2) : null;
            student.inter3 = studentNotes.inter3 !== null ? Number(studentNotes.inter3) : null;
            student.inter4 = studentNotes.inter4 !== null ? Number(studentNotes.inter4) : null;
            student.MoyI = studentNotes.moyInter !== null ? Number(studentNotes.moyInter) : null;
            student.Dev1 = studentNotes.Dev1 !== null ? Number(studentNotes.Dev1) : null;
            student.Dev2 = studentNotes.Dev2 !== null ? Number(studentNotes.Dev2) : null;
            student.Moy = studentNotes.moy !== null ? Number(studentNotes.moy) : null;
            student.Moycoef = studentNotes.coeff !== null ? Number(studentNotes.coeff) : null;
            // Reflète l'état réel en base : true seulement après un clic sur
            // "Sauvegarder" pour cet élève (Moy ci-dessus est toujours
            // recalculé à l'affichage, même avant toute sauvegarde).
            student.estDejaSauvegardee = !!studentNotes.estDejaSauvegardee;
            student.verrouillees = studentNotes.verrouillees || [];
            student.aRevalider = !!studentNotes.aRevalider;
          } else {
            student.notesId = null;
            student.inter1 = null;
            student.inter2 = null;
            student.inter3 = null;
            student.inter4 = null;
            student.MoyI = null;
            student.Dev1 = null;
            student.Dev2 = null;
            student.Moy = null;
            student.Moycoef = null;
            student.estDejaSauvegardee = false;
            student.verrouillees = [];
            student.aRevalider = false;
          }
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des notes :", error);
        this.showSnack("❌ Impossible de récupérer les notes.", "error");
      }
    },

    // « Valider les moyennes » : enregistre d'abord les notes tapées, puis le
    // serveur calcule et verrouille les moyennes de la période.
    async saveNotes(confirmerPeuDeNotes = false) {
      if (!(await this.saveEdits())) return;
      this.savingEdits = true;
      try {
        const { data } = await axios.post(`/api/notes/save`, {
          classeId: this.classeId,
          subjectId: this.subjectId,
          semesterId: this.getSemesterId(this.currentSemester),
          anneeScolaireId: this.anneeScolaireId,
          confirmerPeuDeNotes: confirmerPeuDeNotes === true,
        });
        this.validateDialog = false;
        this.peuDeNotesDialog = false;
        this.manquants = [];
        await this.fetchNotesData();
        this.showSnack(`✅ ${data.message || "Moyennes validées."}`, "success");
      } catch (error) {
        const data = error?.response?.data || {};
        this.validateDialog = false;
        if (data.code === "NOTES_MANQUANTES") {
          this.manquants = data.manquants || [];
          this.manquantsDialog = true;
        } else if (data.code === "PEU_DE_NOTES") {
          this.peuDeNotes = { nbInter: data.nbInter, nbDev: data.nbDev };
          this.peuDeNotesConfirme = false;
          this.peuDeNotesDialog = true;
        } else {
          console.error("Erreur lors de la sauvegarde des notes", error);
          this.showSnack(data.message || "❌ Échec de la validation des moyennes.", "error");
        }
      } finally {
        this.savingEdits = false;
      }
    },

    async generateExcelFile() {
      try {
        const response = await axios({
          url: `/api/export/excel/${this.classeId}`,
          method: "POST",
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Classe_${this.classeId}_Semestre_${this.currentSemester}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();

        this.showSnack("✅ Fichier Excel généré avec succès.", "success");
      } catch (error) {
        console.error("Erreur lors de la génération du fichier Excel", error);
        this.showSnack("❌ Erreur lors de la génération du fichier Excel.", "error");
      }
    },
  },

  beforeUnmount() {
    window.removeEventListener("beforeunload", this.warnUnsaved);
    window.removeEventListener("online", this.auRetourDuReseau);
    this.arreterDictee();
    clearTimeout(this.minuterieEnvoi);
    clearTimeout(this.minuterieMoyennes);
    clearInterval(this.relanceHorsLigne);
    // Dernière tentative d'envoi ; sinon les notes restent gardées dans le téléphone.
    if (this.editCount) this.envoyerAuto();
  },

  async mounted() {
    window.addEventListener("beforeunload", this.warnUnsaved);
    window.addEventListener("online", this.auRetourDuReseau);
    if (window.innerWidth < 600) this.colonne = "inter1";
    axios.get("/api/enseignant/matieres-classes").then(({ data }) => {
      const row = (data || []).find((r) => Number(r.matiere_id) === Number(this.subjectId));
      if (row) this.matiereNom = row.matiere;
    }).catch(() => {});
    await this.getStudents();
    await this.fetchSemesters();
    await this.fetchNotesData();
    // Notes tapées hors ligne lors d'une visite précédente : renvoyées.
    this.restaurerAttente();
    await this.fetchMesDemandes();
  },
};
</script>

<style scoped>
/* Dictée des notes */
.dictee-panneau { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); width: min(560px, calc(100vw - 20px)); background: #fff; border-radius: 18px; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.28); border: 2px solid #7e57c2; padding: 14px 16px; z-index: 2000; text-align: center; }
.dictee-haut { display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; color: #5e35b1; font-weight: 700; }
.dictee-ecoute { display: inline-flex; align-items: center; gap: 4px; color: #90a4ae; }
.dictee-ecoute--on { color: #c62828; }
.dictee-eleve { font-size: 1.5rem; font-weight: 800; color: #1a237e; margin-top: 6px; }
.dictee-note { font-size: 2.6rem; font-weight: 900; color: #4527a0; line-height: 1.1; }
.dictee-entendu { min-height: 20px; font-size: 0.85rem; color: #607d8b; margin: 4px 0 10px; }
.dictee-boutons { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }

/* Enregistrement automatique */
.etat-sauvegarde { display: inline-flex; align-items: center; font-size: 0.82rem; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
.etat-ok { color: #2e7d32; background: #e8f5e9; }
.etat-envoi { color: #1565c0; background: #e3f2fd; }
.etat-horsligne { color: #e65100; background: #fff3e0; }
.etat-erreur { color: #c62828; background: #ffebee; }
.note-input.is-offline { border-color: #fb8c00 !important; background: #fff3e0 !important; }

.notes-toolbar { background: #fff; border-radius: 10px; padding: 8px 10px; border: 1px solid #e3e8ef; }
.notes-toolbar-title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.9rem; margin-bottom: 6px; }
.notes-toolbar-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
/* Une seule colonne de notes : le tableau tient dans l'écran du téléphone. */
.responsive-table.is-one-column { min-width: 0 !important; }
.responsive-table.is-one-column :deep(td:first-child) { white-space: normal; }
.column-picker { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
.column-picker-label { font-size: 0.75rem; color: #5f6b7a; white-space: nowrap; }
.column-chips { overflow-x: auto; flex-wrap: nowrap; }
.notes-help { margin: 6px 0 0; font-size: 0.75rem; color: #5f6b7a; line-height: 1.35; }
.note-input {
  width: 46px; padding: 3px 4px; border: 1px solid #cfd8e3; border-radius: 6px;
  font-size: 0.85rem; text-align: center; background: #fff;
}
.note-input:focus { outline: 2px solid #1976d2; border-color: #1976d2; }
.note-input.is-edited { background: #fff8e1; border-color: #f0b429; }
.note-input.is-invalid { background: #fdecea; border-color: #d32f2f; }
.note-input.is-missing { border: 2px solid #d32f2f; background: #fff5f5; }
.case-manquante { border: 2px solid #d32f2f; border-radius: 4px; padding: 0 4px; }
.manquant-ligne { display: flex; justify-content: space-between; gap: 10px; padding: 5px 0; border-bottom: 1px solid #eef1f5; font-size: 0.88rem; }
.manquant-ligne span { color: #c62828; text-align: right; }
.bilan-ligne { display: flex; gap: 8px; align-items: flex-start; padding: 6px 0; font-size: 0.88rem; }
.bilan-noms { font-size: 0.8rem; color: #5f6b7a; margin-top: 2px; }
.lock-icon { margin-left: 2px; cursor: pointer; }
.locked-cell { display: inline-flex; align-items: center; gap: 2px; background: none; border: 0; padding: 2px; cursor: pointer; color: inherit; font: inherit; }
/* Container */
.app-container {
  width: 100%;
  max-width: 100% !important;
  padding: 8px !important;
  box-sizing: border-box;
}

/* Retour */
.retour-btn {
  max-width: 240px;
}

/* Titre */
.title {
  font-weight: 800;
  font-size: 1.05rem;
  margin: 0;
}

/* Semestres */
.semester-scroller {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  align-items: center;
  padding: 4px 4px;
}
.semester-btn {
  flex: 0 0 auto;
  min-width: 72px;
  padding: 4px 10px !important;
  border-radius: 10px!important;
  font-size: 0.78rem;
  text-transform: uppercase;
  white-space: nowrap;
}

/* Actions */
.action-btn {
  font-size: 0.75rem;
  padding: 6px 8px !important;
}

/* Toolbar */
.responsive-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px !important;
  height: auto !important;
  border: 1px solid rgba(15, 23, 42, 0.1);
  box-shadow: none !important;
  background: #fff !important;
}
/* Barre d'outils fine : hauteur au contenu (au lieu des 64 px Vuetify),
   les boutons passent à la ligne au lieu d'être rognés. */
.responsive-toolbar :deep(.v-toolbar__content) {
  height: auto !important;
  min-height: 40px;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0;
}
.toolbar-title {
  font-size: 0.95rem;
  font-weight: 700;
}
.responsive-text {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.6);
}

/* Boutons toolbar */
.responsive-button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.toolbar-btn {
  min-width: 84px;
  font-size: 0.78rem;
  padding: 6px 8px !important;
}

/* Tableau */
.responsive-table-wrapper {
  overflow-x: auto;
  width: 100%;
  padding-bottom: 8px;
}
.responsive-table {
  min-width: 640px;
}

/* --- SNACKBAR: bien visible desktop & mobile --- */
.snackbar-strong :deep(.v-overlay__content),
.snackbar-strong :deep(.v-snackbar__wrapper),
.snackbar-strong :deep(.v-snackbar) {
  width: min(560px, calc(100vw - 24px)) !important;
}

.snackbar-strong :deep(.v-snackbar__wrapper) {
  border-radius: 10px!important;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08)!important;
  border: 1px solid rgba(255, 255, 255, 0.22) !important;
}

.snackbar-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
}

.snackbar-text {
  font-size: 0.95rem;
  line-height: 1.25rem;
  word-break: break-word;
}

/* Dialogues - responsive */
.custom-dialog .v-card {
  border-radius: 10px;
}

/* Petits écrans */
@media (max-width: 480px) {
  .retour-btn {
    max-width: 160px;
  }
  .title {
    font-size: 1rem;
  }
  .semester-btn {
    min-width: 56px;
    padding: 2px 8px !important;
    font-size: 12px !important;
  }
  .action-btn {
    font-size: 12.5px !important;
    padding: 4px 8px !important;
  }
  .toolbar-title {
    font-size: 0.85rem;
  }
  .responsive-text {
    font-size: 12px;
  }
  .toolbar-btn {
    min-width: 0;
    font-size: 12.5px !important;
    padding: 0 8px !important;
  }
  .responsive-table {
    min-width: 900px;
  }
  .responsive-button-group {
    width: 100%;
  }

  .snackbar-text {
    font-size: 0.88rem;
  }
}

/* Très petits écrans */
@media (max-width: 360px) {
  .semester-btn {
    min-width: 48px;
    padding: 2px 6px !important;
    font-size: 12px !important;
    border-radius: 8px!important;
  }
  .toolbar-btn {
    min-width: 0;
    font-size: 12px !important;
    padding: 0 6px !important;
  }
  .title {
    font-size: 0.95rem;
  }
  .responsive-table {
    min-width: 900px;
  }
  .snackbar-text {
    font-size: 0.82rem;
  }
}

/* Bouton actif */
.v-btn--active {
  background-color: #1976d2 !important;
  color: white !important;
}

/* Note en attente de validation administrative */
.pending-icon {
  cursor: help;
}

.demande-item {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 10px 12px !important;
}
</style>
