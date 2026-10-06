<template>
  <v-container class="pa-2 pa-sm-3 pa-md-3 page-bg" fluid>
    <v-row justify="center">
      <v-col cols="12" xl="11">
        <v-card class="mx-auto rounded-lg elevation-4 overflow-hidden main-card">
          <v-toolbar height="52" flat color="primary" dark class="toolbar-custom px-2 px-sm-3">
            <div class="d-flex align-center min-w-0">
              <div class="toolbar-icon-box mr-3">
                <v-icon dark>mdi-cog-outline</v-icon>
              </div>

              <div class="min-w-0">
                <v-toolbar-title class="font-weight-bold text-truncate text-subtitle-1">
                  Paramètres de l'établissement
                </v-toolbar-title>
                <div class="toolbar-subtitle text-caption d-none d-sm-block">
                  Année scolaire, clôture, frais de scolarité et collaborateurs
                </div>
              </div>
            </div>

            <v-spacer></v-spacer>

            <div class="d-none d-md-flex align-center">
              <div class="toolbar-badge">
                Établissement : {{ etablissementId }}
              </div>
            </div>
          </v-toolbar>

          <div class="settings-shell">
            <nav class="settings-nav">
              <button
                v-for="section in visibleSections"
                :key="section.key"
                type="button"
                class="settings-nav__item"
                :class="{ 'settings-nav__item--active': activeSection === section.key }"
                :disabled="isSubmitting"
                @click="selectSection(section.key)"
              >
                <v-icon
                  size="20"
                  class="settings-nav__icon"
                  :color="activeSection === section.key ? 'primary' : '#64748b'"
                >
                  {{ section.icon }}
                </v-icon>
                <span>{{ section.label }}</span>
                <v-icon
                  v-if="activeSection === section.key"
                  size="18"
                  color="primary"
                  class="settings-nav__chevron"
                >
                  mdi-chevron-right
                </v-icon>
              </button>
            </nav>

            <div class="settings-content">
              <!-- ================================================================= -->
              <!-- PANNEAU : ANNÉE SCOLAIRE                                           -->
              <!-- ================================================================= -->
              <div v-if="activeSection === 'annee'" class="settings-panel">
                <div class="section-head mb-4">
                  <div class="section-icon primary-soft">
                    <v-icon color="primary">mdi-calendar-range</v-icon>
                  </div>
                  <div>
                    <div class="section-title-text">Année scolaire</div>
                    <div class="section-subtitle-text">
                      Année active de l'établissement et création de nouvelles années
                    </div>
                  </div>
                </div>

                <v-card flat class="year-card rounded-lg mb-5">
                  <v-card-text class="pa-3 pa-sm-3">
                    <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between">
                      <div>
                        <div class="year-label mb-1">Année scolaire en cours</div>
                        <div class="year-value">
                          {{ currentAnneeScolaire || "Non définie" }}
                        </div>
                      </div>

                      <div class="mt-3 mt-sm-0">
                        <v-chip
                          :color="currentAnneeScolaireId ? 'success' : 'grey'"
                          dark
                          class="font-weight-bold"
                        >
                          {{ currentAnneeScolaireId ? "Année active" : "Aucune année" }}
                        </v-chip>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>

                <v-btn
                  color="primary"
                  elevation="0"
                  class="rounded-lg text-none font-weight-bold btn-main"
                  :disabled="isSubmitting"
                  @click="showAddForm = !showAddForm"
                >
                  <v-icon left>{{ showAddForm ? "mdi-minus" : "mdi-plus" }}</v-icon>
                  {{ showAddForm ? "Masquer le formulaire" : "Ajouter une année" }}
                </v-btn>

                <v-expand-transition>
                  <div v-if="showAddForm">
                    <v-sheet class="pa-3 pa-sm-3 rounded-lg add-form-box mt-4">
                      <v-row dense align="center">
                        <v-col cols="12" md="8">
                          <v-text-field
                            v-model.trim="nouvelleAnnee"
                            label="Libellé (ex : 2025-2026)"
                            placeholder="Saisissez l'année scolaire"
                            outlined
                            dense
                            hide-details="auto"
                            prepend-inner-icon="mdi-calendar-range"
                            class="custom-input"
                            :disabled="isSubmitting"
                            @keyup.enter="ajouterAnneeScolaire"
                          />
                        </v-col>

                        <v-col cols="12" md="4">
                          <div class="d-flex gap-2 actions-mobile">
                            <v-btn
                              color="success"
                              class="flex-grow-1 text-none font-weight-bold rounded-lg"
                              :loading="isAdding"
                              :disabled="isSubmitting"
                              @click="ajouterAnneeScolaire"
                            >
                              Enregistrer
                            </v-btn>

                            <v-btn
                              color="grey lighten-3"
                              class="text-none black--text font-weight-medium rounded-lg"
                              :disabled="isSubmitting"
                              @click="resetAddForm"
                            >
                              Annuler
                            </v-btn>
                          </div>
                        </v-col>
                      </v-row>
                    </v-sheet>
                  </div>
                </v-expand-transition>
              </div>

              <!-- ================================================================= -->
              <!-- PANNEAU : PARAMÈTRES DE CLÔTURE                                    -->
              <!-- ================================================================= -->
              <div v-else-if="activeSection === 'cloture'" class="settings-panel">
                <div class="section-head mb-4">
                  <div class="section-icon indigo-soft">
                    <v-icon color="indigo">mdi-tune-vertical</v-icon>
                  </div>
                  <div>
                    <div class="section-title-text">Paramètres de clôture</div>
                    <div class="section-subtitle-text">
                      Définissez manuellement les règles d’affectation des élèves promus
                    </div>
                  </div>
                </div>

                <v-sheet class="pa-3 pa-sm-3 rounded-lg settings-box">
                  <v-row dense>
                    <v-col cols="12" lg="7">
                      <v-row dense>
                        <v-col cols="12" sm="6">
                          <v-text-field
                            v-model.number="settings.effectifMaxParClasse"
                            type="number"
                            min="1"
                            label="Effectif maximal par classe"
                            outlined
                            dense
                            class="custom-input"
                            hide-details="auto"
                            :disabled="isSavingSettings"
                          />
                        </v-col>

                        <v-col cols="12" sm="6">
                          <v-text-field
                            v-model.number="settings.effectifMinNouvelleClasse"
                            type="number"
                            min="1"
                            label="Effectif minimal d’une nouvelle classe"
                            outlined
                            dense
                            class="custom-input"
                            hide-details="auto"
                            :disabled="isSavingSettings"
                          />
                        </v-col>

                        <v-col cols="12" sm="6">
                          <v-switch
                            v-model="settings.activerCreationAutoClasse"
                            inset
                            color="primary"
                            class="mt-0 settings-switch"
                            :disabled="isSavingSettings"
                            label="Autoriser la création automatique des classes"
                            @change="handleAutoSaveSwitch"
                          />
                        </v-col>

                        <v-col cols="12">
                          <v-textarea
                            v-model.trim="settings.noteInterne"
                            rows="3"
                            auto-grow
                            outlined
                            dense
                            class="custom-input"
                            label="Note interne sur la règle de gestion (facultatif)"
                            placeholder="Ex : toujours utiliser le minimum de classes existantes avant de créer une nouvelle classe."
                            :disabled="isSavingSettings"
                          />
                        </v-col>
                      </v-row>
                    </v-col>

                    <v-col cols="12" lg="5">
                      <v-card flat class="settings-summary-card rounded-lg">
                        <v-card-text class="pa-3">
                          <div class="summary-title mb-3">Résumé métier appliqué</div>

                          <div class="summary-item">
                            <span class="summary-key">Max par classe :</span>
                            <strong>{{ safeMax }}</strong>
                          </div>

                          <div class="summary-item">
                            <span class="summary-key">Min nouvelle classe :</span>
                            <strong>{{ safeMin }}</strong>
                          </div>

                          <div class="summary-item">
                            <span class="summary-key">Création auto :</span>
                            <strong>{{ settings.activerCreationAutoClasse ? "Oui" : "Non" }}</strong>
                          </div>


                          <v-divider class="my-3"></v-divider>

                          <div class="summary-text">
                            Les admis sont répartis équitablement dans les classes du niveau supérieur, sans dépasser le maximum.
                            Les admis de <strong>3ème</strong> passent en <strong>2nde</strong> dans la série proposée ;
                            ceux de <strong>Terminale</strong> quittent l'établissement.
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>

                  <div class="d-flex flex-wrap justify-end gap-2 mt-4">
                    <v-btn
                      color="grey lighten-3"
                      class="text-none black--text font-weight-medium rounded-lg"
                      :disabled="isSavingSettings"
                      @click="resetSettingsForm"
                    >
                      Réinitialiser
                    </v-btn>

                    <v-btn
                      color="indigo"
                      dark
                      class="text-none font-weight-bold rounded-lg"
                      :loading="isSavingSettings"
                      @click="saveSettings"
                    >
                      Enregistrer les paramètres
                    </v-btn>
                  </div>
                </v-sheet>

                <v-card flat class="rounded-lg cloture-cta mt-5">
                  <v-card-text class="pa-3 pa-sm-3 d-flex flex-column flex-sm-row align-sm-center justify-space-between gap-3">
                    <div class="mb-3 mb-sm-0">
                      <div class="section-title-text mb-1">Clôturer l’année</div>
                      <div class="section-subtitle-text">
                        Génère un rapport de simulation à valider avant toute application définitive.
                      </div>
                    </div>

                    <v-btn
                      color="error"
                      elevation="0"
                      class="rounded-lg text-none font-weight-bold btn-main flex-shrink-0"
                      :loading="isPreparingReport || isClosing"
                      :disabled="isSubmitting || !currentAnneeScolaireId"
                      @click="ouvrirRapportCloture"
                    >
                      <v-icon left>mdi-lock-check-outline</v-icon>
                      Clôturer l’année
                    </v-btn>
                  </v-card-text>
                </v-card>

                <!-- Dernière clôture : annulable tant que la nouvelle année n'a pas commencé -->
                <v-card v-if="derniereCloture" flat class="rounded-lg mt-3 annulation-card">
                  <v-card-text class="pa-3">
                    <div class="d-flex align-center flex-wrap ga-2">
                      <v-icon color="primary">mdi-history</v-icon>
                      <div class="flex-grow-1">
                        <div class="font-weight-bold">Dernière clôture : {{ derniereCloture.annee }} → {{ derniereCloture.nouvelleAnnee }}</div>
                        <div class="text-caption">Le {{ formatDateCloture(derniereCloture.date) }} · {{ derniereCloture.eleves }} élève(s)</div>
                      </div>
                      <v-btn
                        v-if="derniereCloture.annulable"
                        variant="outlined"
                        color="primary"
                        class="text-none"
                        prepend-icon="mdi-undo"
                        @click="annulationDialog = true"
                      >Annuler cette clôture</v-btn>
                    </div>
                    <div v-if="!derniereCloture.annulable" class="text-caption mt-2">
                      Elle ne peut plus être annulée : {{ derniereCloture.raisons.join(', ') }}.
                    </div>
                    <div v-else class="text-caption mt-2">
                      Possible tant que rien n'est fait dans la nouvelle année (notes, présences, inscriptions, paiements).
                    </div>
                  </v-card-text>
                </v-card>
              </div>

              <!-- ================================================================= -->
              <!-- PANNEAU : FRAIS DE SCOLARITÉ PAR CLASSE                            -->
              <!-- ================================================================= -->
              <div v-else-if="activeSection === 'alertes'" class="settings-panel">
                <div class="section-title-text mb-1">Alertes des parents</div>
                <div class="section-subtitle-text mb-3">Notifications sur le téléphone et SMS : absences, permissions, bulletins.</div>
                <AlertesSms />
              </div>

              <div v-else-if="activeSection === 'frais'" class="settings-panel">
                <div class="section-head mb-4">
                  <div class="section-icon success-soft">
                    <v-icon color="success">mdi-cash-multiple</v-icon>
                  </div>
                  <div>
                    <div class="section-title-text">Frais de scolarité par promotion</div>
                    <div class="section-subtitle-text">
                      Montant total dû par élève pour
                      « {{ currentAnneeScolaire || "année non définie" }} »
                    </div>
                  </div>
                </div>

                <v-sheet class="pa-3 pa-sm-3 rounded-lg frais-box">
                  <!-- Pas d'année active -->
                  <v-alert
                    v-if="!currentAnneeScolaireId"
                    type="warning"
                    outlined
                    class="rounded-lg mb-0"
                  >
                    Veuillez d’abord définir une année scolaire active avant de paramétrer les frais.
                  </v-alert>

                  <template v-else>
                    <!-- Chargement des promotions -->
                    <div v-if="isLoadingPromotions" class="d-flex justify-center py-3">
                      <v-progress-circular indeterminate color="success" />
                    </div>

                    <template v-else>
                      <v-alert
                        v-if="promotionsFrais.length === 0"
                        type="info"
                        outlined
                        class="rounded-lg mb-0"
                      >
                        Aucune classe trouvée pour cet établissement.
                      </v-alert>

                      <div v-else>
                        <v-row dense align="center" class="mb-2 frais-global">
                          <v-col cols="12" sm="5" md="4">
                            <v-text-field
                              v-model.number="fraisMontant"
                              type="number"
                              min="0"
                              label="Montant de la scolarité (FCFA)"
                              outlined
                              dense
                              hide-details
                              class="custom-input"
                              :disabled="isSavingFrais"
                            />
                          </v-col>

                          <v-col cols="12" sm="5" md="4">
                            <v-select
                              v-model="fraisPromotionId"
                              :items="promotionsFrais"
                              item-title="nom"
                              item-value="id"
                              label="Promotion (ex : 6ème)"
                              outlined
                              dense
                              hide-details
                              class="custom-input"
                              :disabled="isSavingFrais"
                            />
                          </v-col>

                          <v-col cols="12" sm="auto">
                            <v-btn
                              color="success"
                              dark
                              class="text-none font-weight-bold rounded-lg"
                              :loading="isSavingFrais"
                              :disabled="isSavingFrais"
                              @click="appliquerFraisPromotion"
                            >
                              Appliquer
                            </v-btn>
                          </v-col>
                        </v-row>

                        <div class="text-caption grey--text">
                          Le montant saisi sera appliqué à tous les élèves de toutes les classes de la promotion sélectionnée.
                        </div>
                      </div>
                    </template>
                  </template>
                </v-sheet>
              </div>

              <!-- ================================================================= -->
              <!-- PANNEAU : COLLABORATEURS                                           -->
              <!-- ================================================================= -->
              <div v-else-if="activeSection === 'collaborateurs' && isFounder" class="settings-panel">
                <div class="section-head mb-4">
                  <div class="section-icon deep-purple-soft">
                    <v-icon color="deep-purple">mdi-account-multiple-plus-outline</v-icon>
                  </div>
                  <div>
                    <div class="section-title-text">Collaborateurs</div>
                    <div class="section-subtitle-text">
                      Comptes secondaires (comptable, secrétaire…) et leurs accès
                    </div>
                  </div>
                </div>

                <div class="d-flex justify-end mb-3">
                  <v-btn
                    color="deep-purple"
                    dark
                    class="rounded-lg text-none font-weight-bold"
                    @click="openCollaborateurDialog()"
                  >
                    <v-icon left>mdi-plus</v-icon>
                    Ajouter un collaborateur
                  </v-btn>
                </div>

                <v-data-table
                  :headers="collaborateurHeaders"
                  :items="collaborateurs"
                  :loading="isLoadingCollaborateurs"
                  class="elevation-0 rounded-lg custom-table"
                  no-data-text="Aucun collaborateur pour le moment"
                  mobile-breakpoint="768"
                >
                  <template v-slot:item.poste="{ item }">
                    <v-chip small color="deep-purple" dark>{{ item.poste }}</v-chip>
                  </template>

                  <template v-slot:item.modules_autorises="{ item }">
                    <v-chip
                      v-for="key in item.modules_autorises"
                      :key="key"
                      x-small
                      class="mr-1 mb-1"
                      color="grey lighten-3"
                    >
                      {{ moduleLabel(key) }}
                    </v-chip>
                    <span v-if="!item.modules_autorises || !item.modules_autorises.length" class="text-caption grey--text">
                      Aucun accès
                    </span>
                  </template>

                  <template v-slot:item.actions="{ item }">
                    <v-btn icon small @click="openCollaborateurDialog(item)" title="Modifier">
                      <v-icon small>mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn icon small @click="resetCollaborateurPassword(item)" title="Réinitialiser le mot de passe">
                      <v-icon small>mdi-lock-reset</v-icon>
                    </v-btn>
                    <v-btn icon small @click="confirmDeleteCollaborateur(item)" title="Supprimer">
                      <v-icon small color="error">mdi-delete-outline</v-icon>
                    </v-btn>
                  </template>
                </v-data-table>
              </div>
            </div>
          </div>

          <v-card-text class="pa-3 pa-sm-3 pt-0">
            <v-card flat class="rounded-lg info-box pa-3 pa-sm-3">
              <div class="d-flex align-start">
                <v-icon color="primary" class="mr-3 mt-1">mdi-information-outline</v-icon>
                <div>
                  <div class="font-weight-bold mb-1 info-title">Important</div>
                  <div class="text-body-2 info-text">
                    Le rapport de clôture n’est visible qu’après clic sur
                    <strong>“Clôturer l’année”</strong>. Aucune modification n’est
                    appliquée tant que l’administrateur n’a pas cliqué sur
                    <strong>“Valider définitivement”</strong>. Les règles de répartition
                    utilisées proviennent des paramètres ci-dessus.
                  </div>
                </div>
              </div>
            </v-card>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="reportDialog" max-width="1250" scrollable persistent>
      <v-card class="rounded-lg report-dialog-card">
        <v-toolbar height="40"
          flat
          :color="reportMeta.isError ? 'warning darken-1' : 'primary'"
          dark
          class="px-2 px-sm-3"
        >
          <v-icon left>
            {{ reportMeta.isError ? "mdi-file-alert-outline" : "mdi-file-chart-outline" }}
          </v-icon>

          <v-toolbar-title class="text-subtitle-1 text-sm-h6 font-weight-bold text-subtitle-1">
            {{ reportMeta.title }}
          </v-toolbar-title>

          <v-spacer></v-spacer>

          <v-btn icon dark @click="closeReportDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-3 pa-sm-3 report-content-wrap">
          <v-alert
            border="left"
            colored-border
            :color="reportMeta.isError ? 'warning' : 'success'"
            elevation="1"
            class="rounded-lg mb-5"
            :icon="reportMeta.isError ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline'"
          >
            {{ reportMessage }}
          </v-alert>

          <v-row dense class="mb-4">
            <v-col cols="12" sm="6" lg="3">
              <v-card flat class="stat-card stat-card-blue rounded-lg">
                <v-card-text class="pa-3">
                  <div class="stat-label">Classes analysées</div>
                  <div class="stat-value">{{ reportStats.totalClasses }}</div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" lg="3">
              <v-card flat class="stat-card stat-card-green rounded-lg">
                <v-card-text class="pa-3">
                  <div class="stat-label">Élèves qui passent</div>
                  <div class="stat-value">{{ reportStats.totalPassent }}</div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" lg="3">
              <v-card flat class="stat-card stat-card-red rounded-lg">
                <v-card-text class="pa-3">
                  <div class="stat-label">Élèves qui redoublent</div>
                  <div class="stat-value">{{ reportStats.totalEchouent }}</div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" lg="3">
              <v-card flat class="stat-card stat-card-orange rounded-lg">
                <v-card-text class="pa-3">
                  <div class="stat-label">Anomalies détectées</div>
                  <div class="stat-value">{{ reportStats.totalAnomalies }}</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-row dense class="mb-4">
            <v-col cols="12" md="6">
              <v-text-field
                v-model="searchClasse"
                append-icon="mdi-magnify"
                label="Rechercher une classe"
                single-line
                hide-details
                dense
                outlined
                class="custom-input"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="searchEleve"
                append-icon="mdi-account-search-outline"
                label="Rechercher un élève"
                single-line
                hide-details
                dense
                outlined
                class="custom-input"
              />
            </v-col>
          </v-row>

          <!-- Ce qui bloque la clôture : expliqué, avec le responsable et un lien direct -->
          <div v-if="(reportData.blocages || []).length" class="section-block">
            <div class="section-title">
              <v-icon color="error" class="mr-2">mdi-lock-alert-outline</v-icon>
              Pourquoi la clôture est bloquée ({{ reportData.blocages.length }})
            </div>
            <v-card v-for="(b, i) in reportData.blocages" :key="`bloc-${i}`" flat class="rounded-lg blocage-card mb-2">
              <v-card-text class="pa-3">
                <div class="d-flex align-start flex-wrap ga-2">
                  <div class="flex-grow-1">
                    <div class="blocage-titre">{{ i + 1 }}. {{ b.titre }}</div>
                    <v-chip size="x-small" :color="b.responsable === 'Administration' ? 'primary' : 'deep-purple'" variant="flat" class="my-1">
                      {{ b.responsable === 'Administration' ? 'À faire par vous' : b.responsable }}
                    </v-chip>
                    <div class="blocage-explication">{{ b.explication }}</div>
                  </div>
                  <v-btn v-if="b.lien" color="primary" variant="flat" size="small" class="text-none" append-icon="mdi-arrow-right" @click="allerVers(b.lien.chemin)">
                    {{ b.lien.libelle }}
                  </v-btn>
                </div>
                <ul v-if="b.lignes && b.lignes.length" class="liste-compacte mt-2">
                  <li v-for="(l, j) in (blocagesOuverts[i] ? b.lignes : b.lignes.slice(0, 6))" :key="j">{{ l }}</li>
                </ul>
                <button v-if="b.lignes && b.lignes.length > 6" type="button" class="voir-tout" @click="basculer(blocagesOuverts, i)">
                  {{ blocagesOuverts[i] ? 'Réduire' : `Voir tout (${b.lignes.length})` }}
                </button>
              </v-card-text>
            </v-card>
          </div>

          <div v-if="(reportData.avertissements || []).length" class="section-block">
            <div class="section-title">
              <v-icon color="warning" class="mr-2">mdi-alert-outline</v-icon>
              À savoir avant de valider
            </div>
            <v-alert v-for="(a, i) in reportData.avertissements" :key="`avert-${i}`" type="warning" variant="tonal" density="compact" class="mb-2">
              <div class="font-weight-bold">{{ a.titre }}</div>
              <ul v-if="a.details && a.details.length" class="liste-compacte">
                <li v-for="(d, j) in a.details.slice(0, 15)" :key="j">{{ d }}</li>
                <li v-if="a.details.length > 15">… et {{ a.details.length - 15 }} autre(s)</li>
              </ul>
            </v-alert>
          </div>

          <div v-if="aFaire.length" class="section-block">
            <div class="section-title">
              <v-icon color="primary" class="mr-2">mdi-clipboard-check-outline</v-icon>
              À faire maintenant dans la nouvelle année
            </div>
            <v-alert v-for="(a, i) in aFaire" :key="`afaire-${i}`" type="info" variant="tonal" density="compact" class="mb-2">
              <div class="d-flex align-center flex-wrap ga-2">
                <div class="font-weight-bold flex-grow-1">{{ a.titre }}</div>
                <v-btn v-if="a.lien" size="small" color="primary" variant="flat" class="text-none" append-icon="mdi-arrow-right" @click="allerVers(a.lien.chemin)">{{ a.lien.libelle }}</v-btn>
              </div>
              <ul v-if="a.details && a.details.length" class="liste-compacte">
                <li v-for="(d, j) in a.details.slice(0, 20)" :key="j">{{ d }}</li>
                <li v-if="a.details.length > 20">… et {{ a.details.length - 20 }} autre(s)</li>
              </ul>
            </v-alert>
          </div>

          <div class="section-block">
            <div class="section-title">
              <v-icon color="primary" class="mr-2">mdi-google-classroom</v-icon>
              Rapport détaillé par classe
            </div>

            <v-row dense>
              <v-col
                v-for="(item, index) in filteredRapportParClasse"
                :key="`classe-${index}-${item.classeId || item.classeNom}`"
                cols="12"
                md="6"
                xl="4"
              >
                <v-card flat class="rounded-lg class-report-card">
                  <v-card-text class="pa-3">
                    <div class="d-flex align-center justify-space-between mb-3 flex-wrap gap-2">
                      <div class="font-weight-bold text-subtitle-1 class-name">
                        {{ item.classeNom }}
                      </div>

                      <v-chip
                        small
                        :color="getDestinationColor(item.destinationPrevue)"
                        dark
                        class="font-weight-bold"
                      >
                        {{ item.destinationPrevue || "Non définie" }}
                      </v-chip>
                    </div>

                    <v-row dense>
                      <v-col cols="4">
                        <div class="mini-stat-box mini-stat-total">
                          <div class="mini-stat-number">{{ item.totalEleves || 0 }}</div>
                          <div class="mini-stat-label">Total</div>
                        </div>
                      </v-col>

                      <v-col cols="4">
                        <div class="mini-stat-box mini-stat-pass">
                          <div class="mini-stat-number">{{ item.nombreQuiPassent || 0 }}</div>
                          <div class="mini-stat-label">Passent</div>
                        </div>
                      </v-col>

                      <v-col cols="4">
                        <div class="mini-stat-box mini-stat-fail">
                          <div class="mini-stat-number">{{ item.nombreQuiEchouent || 0 }}</div>
                          <div class="mini-stat-label">Redoublent</div>
                        </div>
                      </v-col>
                    </v-row>
                    <template v-if="(item.eleves || []).length">
                      <button type="button" class="voir-tout mt-2" @click="basculer(classesOuvertes, item.classeId)">
                        {{ classesOuvertes[item.classeId] ? 'Masquer les élèves' : `Voir les ${item.eleves.length} élèves et leur moyenne annuelle` }}
                      </button>
                      <div v-if="classesOuvertes[item.classeId]" class="liste-eleves-classe">
                        <div v-for="e in filterEleves(item.eleves)" :key="e.eleveId" class="eleve-moyenne" :class="e.admis ? 'is-admis' : 'is-redouble'">
                          <span class="eleve-name">{{ e.nom }} {{ e.prenom }}</span>
                          <span class="eleve-moy">{{ formatMoy(e.moyenneAnnuelle) }}</span>
                          <span class="eleve-decision">{{ e.admis ? 'Admis' : 'Redouble' }}</span>
                        </div>
                      </div>
                    </template>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" v-if="filteredRapportParClasse.length === 0">
                <v-alert type="info" outlined class="rounded-lg mb-0">
                  Aucune classe ne correspond à votre recherche.
                </v-alert>
              </v-col>
            </v-row>
          </div>

          <div class="section-block" v-if="reportDetailsGroupes.length > 0">
            <div class="section-title">
              <v-icon color="success" class="mr-2">mdi-transit-connection-variant</v-icon>
              Répartition prévue des élèves admis
            </div>

            <v-row dense>
              <v-col
                v-for="(groupe, index) in reportDetailsGroupes"
                :key="`groupe-${index}`"
                cols="12"
                md="6"
                xl="4"
              >
                <v-card flat class="rounded-lg affectation-card">
                  <v-card-text class="pa-3">
                    <div class="d-flex justify-space-between align-start mb-3 flex-wrap gap-2">
                      <div>
                        <div class="font-weight-bold text-subtitle-1">
                          {{ groupe.groupeDestination }}
                        </div>
                        <div class="text-caption grey--text">
                          Type :
                          <strong>{{ formatGroupeType(groupe.type) }}</strong>
                        </div>
                      </div>

                      <v-chip small color="success" dark class="font-weight-bold">
                        {{ groupe.nombreEleves || 0 }} élève(s)
                      </v-chip>
                    </div>

                    <div class="eleves-preview">
                      <div
                        v-for="(eleve, idx) in (groupesOuverts[index] ? filterEleves(groupe.eleves) : filterEleves(groupe.eleves).slice(0, 6))"
                        :key="`eleve-prev-${index}-${idx}-${eleve.eleveId}`"
                        class="eleve-line"
                      >
                        <v-icon small color="primary" class="mr-2">mdi-account</v-icon>
                        <span class="eleve-name">{{ eleve.nom }} {{ eleve.prenom }}</span>
                        <span class="eleve-class ml-2">({{ eleve.classeActuelle }})</span>
                        <span v-if="eleve.moyenneAnnuelle != null" class="eleve-moy ml-auto">{{ formatMoy(eleve.moyenneAnnuelle) }}</span>
                      </div>

                      <button
                        v-if="filterEleves(groupe.eleves).length > 6"
                        type="button"
                        class="voir-tout mt-2"
                        @click="basculer(groupesOuverts, index)"
                      >
                        {{ groupesOuverts[index] ? 'Réduire' : `Voir les ${filterEleves(groupe.eleves).length - 6} autre(s) élève(s)` }}
                      </button>

                      <div
                        v-if="filterEleves(groupe.eleves).length === 0"
                        class="text-caption grey--text"
                      >
                        Aucun élève ne correspond à votre recherche.
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- Fins de cycle : repliées par défaut, une ligne par classe -->
          <div class="section-block" v-if="reportAOrienter.length > 0 || reportSortants.length > 0">
            <div class="section-title">
              <v-icon color="primary" class="mr-2">mdi-school-outline</v-icon>
              Fins de cycle
            </div>
            <v-expansion-panels multiple variant="accordion" class="fin-cycle">
              <v-expansion-panel v-if="reportAOrienter.length > 0" elevation="0">
                <v-expansion-panel-title>
                  <div class="fin-cycle-titre">
                    <strong>Admis de 3ème → 2nde, série à choisir</strong>
                    <v-chip size="small" color="deep-orange" variant="flat" class="ml-2">{{ reportAOrienter.length }}</v-chip>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <p class="text-caption mb-2">
                    Ils passent en 2nde sans série : après la clôture, choisissez la série de chacun selon son vœu (Élèves → Orientation en 2nde).
                  </p>
                  <v-expansion-panels multiple variant="accordion">
                    <v-expansion-panel v-for="g in parClasse(reportAOrienter)" :key="`or-${g.classe}`" elevation="0">
                      <v-expansion-panel-title class="fin-cycle-classe">{{ g.classe }} <span class="fin-cycle-nb">{{ g.eleves.length }} élève(s)</span></v-expansion-panel-title>
                      <v-expansion-panel-text>
                        <div v-for="o in g.eleves" :key="o.eleveId" class="eleve-moyenne is-admis">
                          <span class="eleve-name">{{ o.nom }} {{ o.prenom }}</span>
                          <span class="eleve-moy">{{ formatMoy(o.moyenneAnnuelle) }}</span>
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel v-if="reportSortants.length > 0" elevation="0">
                <v-expansion-panel-title>
                  <div class="fin-cycle-titre">
                    <strong>Sortants : ils quittent l'établissement</strong>
                    <v-chip size="small" color="blue-grey" variant="flat" class="ml-2">{{ reportSortants.length }}</v-chip>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <p class="text-caption mb-2">Leur dossier et leurs bulletins restent consultables.</p>
                  <v-expansion-panels multiple variant="accordion">
                    <v-expansion-panel v-for="g in parClasse(reportSortants)" :key="`so-${g.classe}`" elevation="0">
                      <v-expansion-panel-title class="fin-cycle-classe">{{ g.classe }} <span class="fin-cycle-nb">{{ g.eleves.length }} élève(s) · {{ g.eleves[0].motif }}</span></v-expansion-panel-title>
                      <v-expansion-panel-text>
                        <div v-for="o in g.eleves" :key="o.eleveId" class="eleve-moyenne is-admis">
                          <span class="eleve-name">{{ o.nom }} {{ o.prenom }}</span>
                          <span class="eleve-moy">{{ formatMoy(o.moyenneAnnuelle) }}</span>
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>

          <div class="section-block" v-if="reportMoyennesManquantes.length > 0">
            <div class="section-title">
              <v-icon color="warning darken-2" class="mr-2">mdi-alert-outline</v-icon>
              Détail élève par élève : moyennes manquantes
            </div>

            <v-data-table
              :headers="reportHeadersMoyennes"
              :items="filteredRapportMoyennesManquantes"
              :items-per-page="8"
              class="elevation-0 rounded-lg custom-table"
              no-data-text="Aucune anomalie de moyenne à afficher"
              mobile-breakpoint="768"
            >
              <template v-slot:item.index="{ index }">
                <v-chip x-small color="warning darken-2" dark>
                  {{ index + 1 }}
                </v-chip>
              </template>

              <template v-slot:item.probleme="{ item }">
                <div class="problem-cell">
                  {{ item.probleme }}
                </div>
              </template>
            </v-data-table>
          </div>

          <div class="section-block" v-if="reportAnomaliesPromotion.length > 0 && !(reportData.blocages || []).length">
            <div class="section-title">
              <v-icon color="error" class="mr-2">mdi-alert-decagram-outline</v-icon>
              Anomalies de promotion
            </div>

            <v-row dense>
              <v-col
                v-for="(anomalie, index) in filteredAnomaliesPromotion"
                :key="`anomalie-${index}`"
                cols="12"
                md="6"
              >
                <v-card flat class="rounded-lg anomaly-card">
                  <v-card-text class="pa-3">
                    <div class="d-flex justify-space-between align-start flex-wrap gap-2 mb-2">
                      <div class="font-weight-bold text-subtitle-2">
                        {{
                          anomalie.classeNom ||
                          anomalie.groupe ||
                          `${anomalie.nom || ""} ${anomalie.prenom || ""}`.trim() ||
                          "Anomalie"
                        }}
                      </div>

                      <v-chip small color="error" dark>Bloquant</v-chip>
                    </div>

                    <div class="problem-cell mb-2">
                      {{ anomalie.probleme }}
                    </div>

                    <div
                      v-if="Array.isArray(anomalie.eleves) && anomalie.eleves.length"
                      class="text-body-2"
                    >
                      <div class="font-weight-medium mb-1">Élèves concernés :</div>

                      <div
                        v-for="(eleve, idx) in filterEleves(anomalie.eleves).slice(0, 5)"
                        :key="`anomalie-eleve-${index}-${idx}`"
                        class="eleve-line"
                      >
                        <v-icon small color="error" class="mr-2">mdi-account-alert-outline</v-icon>
                        <span>{{ eleve.nom }} {{ eleve.prenom }}</span>
                        <span class="eleve-class ml-2">({{ eleve.classeActuelle }})</span>
                      </div>

                      <div
                        v-if="filterEleves(anomalie.eleves).length > 5"
                        class="text-caption grey--text mt-2"
                      >
                        + {{ filterEleves(anomalie.eleves).length - 5 }} autre(s)
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <div class="section-block" v-if="reportAlertesCapacite.length > 0">
            <div class="section-title">
              <v-icon color="warning darken-2" class="mr-2">mdi-alert-outline</v-icon>
              Classes qui dépasseront l’effectif maximum
            </div>

            <v-row dense>
              <v-col
                v-for="(alerte, index) in reportAlertesCapacite"
                :key="`alerte-capacite-${index}`"
                cols="12"
                md="6"
              >
                <v-card flat class="rounded-lg anomaly-card">
                  <v-card-text class="pa-3">
                    <div class="d-flex justify-space-between align-start flex-wrap gap-2 mb-2">
                      <div class="font-weight-bold text-subtitle-2">
                        {{ alerte.classeNom }}
                      </div>

                      <v-chip small color="warning darken-2" dark>À vérifier</v-chip>
                    </div>

                    <div class="problem-cell mb-2">
                      {{ alerte.probleme }}
                    </div>

                    <div class="text-caption grey--text">
                      {{ alerte.effectifNouveaux }} nouvel(le)s admis
                      + {{ alerte.effectifExistant }} redoublant(s) déjà présent(s)
                      = {{ alerte.effectifFinal }} (maximum paramétré : {{ alerte.effectifMax }})
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-3 pa-sm-3 flex-wrap action-bar">
          <v-btn text class="text-none" @click="closeReportDialog">
            Fermer
          </v-btn>

          <v-spacer></v-spacer>

          <v-btn
            v-if="canValidateReport"
            color="error"
            depressed
            class="text-none font-weight-bold rounded-lg"
            :loading="isClosing"
            @click="confirmationSaisie = ''; confirmDialog = true"
          >
            <v-icon left>mdi-check-bold</v-icon>
            Valider définitivement
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmDialog" max-width="520" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="headline error--text d-flex align-center">
          <v-icon color="error" left>mdi-alert-circle-outline</v-icon>
          Validation finale
        </v-card-title>

        <v-card-text class="pt-2 black--text">
          <p class="mb-2">
            Vous allez lancer définitivement la clôture de l’année scolaire
            <strong>{{ currentAnneeScolaire }}</strong>.
          </p>
          <p class="mb-2">
            Les élèves passeront dans les classes du rapport, l’année sera marquée <strong>Clôturée</strong>
            (notes figées) et l’année suivante sera ouverte.
          </p>
          <p class="mb-2 text-caption">
            Une erreur ? La clôture peut être annulée tant que rien n’a été fait dans la nouvelle année.
          </p>
          <v-text-field
            v-model="confirmationSaisie"
            :label="`Tapez ${nomAnneeACloturer} pour confirmer`"
            variant="outlined"
            density="compact"
            autocomplete="off"
            hide-details
          />
        </v-card-text>

        <v-card-actions class="pa-3">
          <v-spacer></v-spacer>
          <v-btn text :disabled="isClosing" @click="confirmDialog = false">
            Annuler
          </v-btn>
          <v-btn
            color="error"
            depressed
            class="rounded-lg text-none font-weight-bold"
            :loading="isClosing"
            :disabled="confirmationSaisie.trim() !== nomAnneeACloturer"
            @click="executerClotureConfirmee"
          >
            Clôturer définitivement
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="annulationDialog" max-width="500" persistent>
      <v-card v-if="derniereCloture" class="rounded-lg">
        <v-card-title class="d-flex align-center text-wrap">
          <v-icon color="primary" class="mr-2">mdi-undo</v-icon>
          Annuler la clôture de {{ derniereCloture.annee }} ?
        </v-card-title>
        <v-card-text>
          <p class="mb-2">Tout revient comme avant la clôture :</p>
          <ul class="liste-compacte mb-2">
            <li>chaque élève retrouve sa classe de {{ derniereCloture.annee }} (y compris les sortants) ;</li>
            <li>l’année {{ derniereCloture.annee }} est de nouveau ouverte (notes modifiables) ;</li>
            <li>l’année {{ derniereCloture.nouvelleAnnee }} et les classes créées par la clôture sont retirées, ainsi que la répartition et l’emploi du temps reportés.</li>
          </ul>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="annulationEnCours" @click="annulationDialog = false">Retour</v-btn>
          <v-btn color="primary" variant="flat" :loading="annulationEnCours" @click="annulerCloture">Annuler la clôture</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="collaborateurDialog" max-width="700" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="headline d-flex align-center">
          <v-icon color="deep-purple" left>mdi-account-cog-outline</v-icon>
          {{ collaborateurForm.id ? "Modifier le collaborateur" : "Ajouter un collaborateur" }}
        </v-card-title>

        <v-card-text class="pt-2">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field v-model="collaborateurForm.nom" label="Nom" outlined dense></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="collaborateurForm.prenom" label="Prénom" outlined dense></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-combobox
                v-model="collaborateurForm.poste"
                :items="posteSuggestions"
                label="Rôle / Poste"
                outlined
                dense
                hint="Ex: Comptable, Secrétaire, Surveillant général…"
                persistent-hint
              ></v-combobox>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="collaborateurForm.telephone" label="Téléphone" outlined dense></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="collaborateurForm.email" label="Email" outlined dense type="email"></v-text-field>
            </v-col>
          </v-row>

          <v-divider class="my-3"></v-divider>

          <div class="font-weight-bold mb-2">Accès autorisés</div>
          <div class="text-caption grey--text mb-3">
            Cochez uniquement les modules et onglets que ce collaborateur doit voir en se connectant.
          </div>

          <div v-for="mod in moduleCatalog" :key="mod.key" class="mb-3">
            <v-checkbox
              v-if="mod.children.length"
              :model-value="isModuleChecked(mod.key)"
              :indeterminate="isModuleIndeterminate(mod.key)"
              :label="mod.label"
              hide-details
              density="compact"
              class="font-weight-bold"
              @update:model-value="toggleModule(mod)"
            ></v-checkbox>

            <v-checkbox
              v-else
              :model-value="isModuleChecked(mod.key)"
              :label="mod.label"
              hide-details
              density="compact"
              class="font-weight-bold"
              @update:model-value="toggleSimpleModule(mod.key)"
            ></v-checkbox>

            <div v-if="mod.children.length" class="pl-3">
              <v-checkbox
                v-for="child in mod.children"
                :key="child.key"
                :model-value="collaborateurForm.modules.includes(child.key)"
                :label="child.label"
                hide-details
                density="compact"
                @update:model-value="toggleChild(mod, child)"
              ></v-checkbox>
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-3">
          <v-spacer></v-spacer>
          <v-btn text :disabled="isSavingCollaborateur" @click="collaborateurDialog = false">Annuler</v-btn>
          <v-btn
            color="deep-purple"
            dark
            class="rounded-lg text-none font-weight-bold"
            :loading="isSavingCollaborateur"
            @click="saveCollaborateur"
          >
            Enregistrer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="generatedPasswordDialog" max-width="480" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="headline d-flex align-center">
          <v-icon color="success" left>mdi-check-circle-outline</v-icon>
          Mot de passe généré
        </v-card-title>
        <v-card-text>
          <p>Communiquez ces identifiants au collaborateur. Ce mot de passe ne sera plus affiché ensuite.</p>
          <v-sheet color="#f8f9fa" class="pa-3 rounded-lg text-left border">
            <div class="mb-2"><strong>Email :</strong> {{ generatedCredentials.email }}</div>
            <div><strong>Mot de passe :</strong> <span class="font-weight-bold">{{ generatedCredentials.password }}</span></div>
          </v-sheet>
        </v-card-text>
        <v-card-actions class="pa-3">
          <v-spacer></v-spacer>
          <v-btn color="primary" dark class="rounded-lg text-none font-weight-bold" @click="generatedPasswordDialog = false">
            C'est noté
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteCollaborateurDialog" max-width="480" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="headline error--text d-flex align-center">
          <v-icon color="error" left>mdi-alert-circle-outline</v-icon>
          Supprimer ce collaborateur ?
        </v-card-title>
        <v-card-text>
          Cette action est définitive.
          <strong>{{ collaborateurToDelete?.prenom }} {{ collaborateurToDelete?.nom }}</strong>
          perdra immédiatement l'accès à l'espace administration.
        </v-card-text>
        <v-card-actions class="pa-3">
          <v-spacer></v-spacer>
          <v-btn text :disabled="isSavingCollaborateur" @click="deleteCollaborateurDialog = false">Annuler</v-btn>
          <v-btn
            color="error"
            dark
            class="rounded-lg text-none font-weight-bold"
            :loading="isSavingCollaborateur"
            @click="deleteCollaborateur"
          >
            Supprimer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar"
      :color="snackColor"
      timeout="4500"
      rounded="pill"
      top
      right
    >
      {{ snackText }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar = false">
          Fermer
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import axios from "axios";
import AlertesSms from "@/components/administration/AlertesSms.vue";

const API_BASE = "/api";

function parseBoolean(value, defaultValue = false) {
  if (value === null || value === undefined) return defaultValue;

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["1", "true", "yes", "oui", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "non", "off", ""].includes(normalized)) return false;
  }

  return defaultValue;
}

export default {
  name: "GestionAnneeScolaire",
  components: { AlertesSms },

  props: {
    etablissementId: { type: Number, required: true },
    anneeScolaire: { type: String, required: false, default: "" },
    anneeScolaireId: { type: Number, required: false, default: null },
  },

  setup() {
    // Section des paramètres affichée, gardée dans l'adresse (?onglet=...).
    const activeSection = useUrlState("onglet", "annee", {
      allowed: ["annee", "cloture", "frais", "alertes", "collaborateurs"],
    });
    return { activeSection };
  },

  data() {
    return {
      sections: [
        { key: "annee", label: "Année scolaire", icon: "mdi-calendar-range" },
        { key: "cloture", label: "Clôture", icon: "mdi-tune-vertical" },
        { key: "frais", label: "Frais de scolarité", icon: "mdi-cash-multiple" },
        { key: "alertes", label: "Alertes SMS", icon: "mdi-message-alert-outline" },
        { key: "collaborateurs", label: "Collaborateurs", icon: "mdi-account-multiple-plus-outline", founderOnly: true },
      ],

      showAddForm: false,
      nouvelleAnnee: "",

      // --- Collaborateurs (comptable, secrétaire, etc.) ---
      isLoadingCollaborateurs: false,
      isSavingCollaborateur: false,
      collaborateurs: [],
      collaborateurDialog: false,
      generatedPasswordDialog: false,
      deleteCollaborateurDialog: false,
      collaborateurToDelete: null,
      generatedCredentials: { email: "", password: "" },
      collaborateurForm: {
        id: null,
        nom: "",
        prenom: "",
        poste: "",
        telephone: "",
        email: "",
        modules: [],
      },
      posteSuggestions: ["Comptable", "Secrétaire", "Surveillant général", "Censeur", "Économe"],
      collaborateurHeaders: [
        { text: "Nom", value: "nom" },
        { text: "Prénom", value: "prenom" },
        { text: "Poste", value: "poste" },
        { text: "Email", value: "email" },
        { text: "Accès", value: "modules_autorises", sortable: false },
        { text: "Actions", value: "actions", sortable: false, width: 140 },
      ],
      moduleCatalog: [
        { key: "ClassManagement", label: "Classes", children: [] },
        {
          key: "StudentManagement",
          label: "Élèves",
          children: [
            { key: "Inscription", label: "Inscription" },
            { key: "MesEleves", label: "Nos Élèves" },
            { key: "PresenceManagement", label: "Gestion Présence" },
            { key: "PunishmentManagement", label: "Gestion Punition" },
            { key: "NoteConsultation", label: "Consulter Note" },
            { key: "BulletinManagement", label: "Gestion Bulletin" },
            { key: "Reinscription", label: "Réinscription" },
            { key: "CarteScolaire", label: "Carte Scolaire" },
            { key: "ScolariteManager", label: "Scolarité" },
          ],
        },
        {
          key: "TeacherManagement",
          label: "Enseignants",
          children: [
            { key: "CahierDeTexte", label: "Cahiers de Texte" },
            { key: "MesEnseignants", label: "Mes Enseignants" },
            { key: "EnseignantParclasse", label: "Répartition Enseignants/Classes" },
            { key: "subjectsManager", label: "Matières" },
            { key: "ProgrammesMatieres", label: "Programmes des matières" },
          ],
        },
        { key: "ParentManagement", label: "Parents", children: [] },
        { key: "Parametre", label: "Paramètres", children: [] },
      ],

      snackbar: false,
      snackText: "",
      snackColor: "success",

      confirmDialog: false,
      reportDialog: false,
      // Clôture : empreinte du rapport relu, nom de l'année à retaper,
      // travaux restants, dernière clôture (annulable ?).
      empreinteRapport: null,
      nomAnneeACloturer: "",
      confirmationSaisie: "",
      aFaire: [],
      derniereCloture: null,
      annulationDialog: false,
      annulationEnCours: false,
      // Listes dépliées du rapport (tout voir).
      blocagesOuverts: {},
      groupesOuverts: {},
      classesOuvertes: {},

      isAdding: false,
      isPreparingReport: false,
      isClosing: false,
      isSavingSettings: false,
      isLoadingSettings: false,

      // --- Frais de scolarité par promotion ---
      isLoadingPromotions: false,
      isSavingFrais: false,
      promotionsFrais: [],
      fraisPromotionId: null,
      fraisMontant: null,

      currentAnneeScolaire: this.anneeScolaire || "",
      currentAnneeScolaireId: this.anneeScolaireId || null,

      settings: {
        effectifMaxParClasse: 50,
        effectifMinNouvelleClasse: 10,
        activerCreationAutoClasse: true,
        activerRepartitionIntelligente: true,
        noteInterne: "",
      },

      defaultSettings: {
        effectifMaxParClasse: 50,
        effectifMinNouvelleClasse: 10,
        activerCreationAutoClasse: true,
        activerRepartitionIntelligente: true,
        noteInterne: "",
      },

      reportMessage: "",
      searchClasse: "",
      searchEleve: "",

      reportMeta: {
        title: "Rapport de clôture",
        isError: false,
      },

      reportData: {
        rapportParClasse: [],
        rapportMoyennesManquantes: [],
        anomaliesPromotion: [],
        alertesCapacite: [],
        detailsGroupes: [],
        totalClasses: 0,
        totalElevesConcernes: 0,
        totalAnomaliesPromotion: 0,
        totalAffectationsExistantes: 0,
        totalCreationsDeClasses: 0,
      },

      previewReadyForValidation: false,

      reportHeadersMoyennes: [
        { text: "#", value: "index", sortable: false, width: 70 },
        { text: "Nom", value: "nom" },
        { text: "Prénom", value: "prenom" },
        { text: "Classe", value: "classeNom" },
        { text: "Problème", value: "probleme" },
      ],
    };
  },

  computed: {
    isFounder() {
      if (typeof window === "undefined") return true;
      return localStorage.getItem("user_type") !== "administration";
    },

    visibleSections() {
      return this.sections.filter((section) => !section.founderOnly || this.isFounder);
    },

    isSubmitting() {
      return (
        this.isAdding ||
        this.isPreparingReport ||
        this.isClosing ||
        this.isSavingSettings ||
        this.isLoadingSettings
      );
    },

    safeMax() {
      const value = Number(this.settings.effectifMaxParClasse);
      return Number.isFinite(value) && value > 0 ? value : 1;
    },

    safeMin() {
      const value = Number(this.settings.effectifMinNouvelleClasse);
      return Number.isFinite(value) && value > 0 ? value : 1;
    },

    reportStats() {
      const classes = this.reportData?.rapportParClasse || [];

      const totalPassent = classes.reduce(
        (sum, item) => sum + Number(item.nombreQuiPassent || 0),
        0
      );

      const totalEchouent = classes.reduce(
        (sum, item) => sum + Number(item.nombreQuiEchouent || 0),
        0
      );

      const totalAnomalies =
        (this.reportData?.rapportMoyennesManquantes?.length || 0) +
        (this.reportData?.anomaliesPromotion?.length || 0);

      return {
        totalClasses: classes.length || this.reportData?.totalClasses || 0,
        totalPassent,
        totalEchouent,
        totalAnomalies,
      };
    },

    reportMoyennesManquantes() {
      return this.reportData?.rapportMoyennesManquantes || [];
    },

    reportAnomaliesPromotion() {
      return this.reportData?.anomaliesPromotion || [];
    },

    reportAlertesCapacite() {
      return this.reportData?.alertesCapacite || [];
    },

    reportDetailsGroupes() {
      return this.reportData?.detailsGroupes || [];
    },
    reportSortants() {
      return this.reportData?.sortants || [];
    },
    reportAOrienter() {
      return this.reportData?.aOrienter || [];
    },
    reportOrientations() {
      return this.reportData?.orientations || [];
    },

    filteredRapportParClasse() {
      const search = (this.searchClasse || "").toLowerCase().trim();
      const items = this.reportData?.rapportParClasse || [];

      if (!search) return items;

      return items.filter((item) => {
        const classeNom = String(item.classeNom || "").toLowerCase();
        const destination = String(item.destinationPrevue || "").toLowerCase();
        return classeNom.includes(search) || destination.includes(search);
      });
    },

    filteredRapportMoyennesManquantes() {
      const search = (this.searchEleve || "").toLowerCase().trim();
      const items = this.reportMoyennesManquantes;

      if (!search) return items;

      return items.filter((item) => {
        const fullName = `${item.nom || ""} ${item.prenom || ""}`.toLowerCase();
        const classe = String(item.classeNom || "").toLowerCase();
        const probleme = String(item.probleme || "").toLowerCase();

        return (
          fullName.includes(search) ||
          classe.includes(search) ||
          probleme.includes(search)
        );
      });
    },

    filteredAnomaliesPromotion() {
      const search = (this.searchEleve || "").toLowerCase().trim();
      const items = this.reportAnomaliesPromotion;

      if (!search) return items;

      return items.filter((item) => {
        const nom = `${item.nom || ""} ${item.prenom || ""}`.toLowerCase();
        const classe = String(item.classeNom || item.groupe || "").toLowerCase();
        const probleme = String(item.probleme || "").toLowerCase();

        const eleves = Array.isArray(item.eleves) ? item.eleves : [];
        const foundEleve = eleves.some((e) => {
          const fullName = `${e.nom || ""} ${e.prenom || ""}`.toLowerCase();
          const classeActuelle = String(e.classeActuelle || "").toLowerCase();
          return fullName.includes(search) || classeActuelle.includes(search);
        });

        return (
          nom.includes(search) ||
          classe.includes(search) ||
          probleme.includes(search) ||
          foundEleve
        );
      });
    },

    canValidateReport() {
      return (
        !this.reportMeta.isError &&
        this.previewReadyForValidation &&
        this.currentAnneeScolaireId
      );
    },
  },

  watch: {
    anneeScolaire(newVal) {
      this.currentAnneeScolaire = newVal || "";
    },

    anneeScolaireId(newVal) {
      this.currentAnneeScolaireId = newVal || null;
    },
  },

  created() {
    this.loadSettings();
    // Section relue dans l'adresse : on charge ses données comme au clic
    // (les collaborateurs restent réservés au fondateur).
    if (!this.visibleSections.some((section) => section.key === this.activeSection)) {
      this.activeSection = "annee";
    } else if (this.activeSection !== "annee") {
      this.selectSection(this.activeSection);
    }
  },

  methods: {
    showNotify(text, color = "success") {
      this.snackText = text;
      this.snackColor = color;
      this.snackbar = true;
    },

    // ================================================================
    //  COLLABORATEURS (comptable, secrétaire, etc.)
    // ================================================================
    authHeaders() {
      const token = localStorage.getItem("token");
      return token ? { Authorization: `Bearer ${token}` } : {};
    },

    moduleLabel(key) {
      for (const mod of this.moduleCatalog) {
        if (mod.key === key) return mod.label;
        const child = mod.children.find((c) => c.key === key);
        if (child) return child.label;
      }
      return key;
    },

    isModuleChecked(key) {
      return this.collaborateurForm.modules.includes(key);
    },

    isModuleIndeterminate(key) {
      const mod = this.moduleCatalog.find((m) => m.key === key);
      if (!mod || !mod.children.length) return false;
      const checkedCount = mod.children.filter((c) => this.collaborateurForm.modules.includes(c.key)).length;
      return checkedCount > 0 && checkedCount < mod.children.length;
    },

    toggleSimpleModule(key) {
      const modules = this.collaborateurForm.modules;
      this.collaborateurForm.modules = modules.includes(key)
        ? modules.filter((k) => k !== key)
        : [...modules, key];
    },

    toggleModule(mod) {
      const modules = this.collaborateurForm.modules;
      const childKeys = mod.children.map((c) => c.key);
      const currentlyChecked = modules.includes(mod.key);
      this.collaborateurForm.modules = currentlyChecked
        ? modules.filter((k) => k !== mod.key && !childKeys.includes(k))
        : [...new Set([...modules, mod.key, ...childKeys])];
    },

    toggleChild(mod, child) {
      const modules = this.collaborateurForm.modules;
      let next = modules.includes(child.key)
        ? modules.filter((k) => k !== child.key)
        : [...modules, child.key];

      const anyChildChecked = mod.children.some((c) => next.includes(c.key));
      this.collaborateurForm.modules = anyChildChecked
        ? [...new Set([...next, mod.key])]
        : next.filter((k) => k !== mod.key);
    },

    selectSection(key) {
      this.activeSection = key;
      if (key === "cloture") this.chargerDerniereCloture();
      if (key === "frais" && this.promotionsFrais.length === 0) {
        this.fetchPromotionsFrais();
      }
      if (key === "collaborateurs" && this.collaborateurs.length === 0) {
        this.fetchCollaborateurs();
      }
    },

    async fetchCollaborateurs() {
      this.isLoadingCollaborateurs = true;
      try {
        const { data } = await axios.get(`${API_BASE}/administration/collaborateurs`, {
          headers: this.authHeaders(),
        });
        this.collaborateurs = data;
      } catch (error) {
        this.showNotify(
          error.response?.data?.message || "Erreur lors du chargement des collaborateurs.",
          "error"
        );
      } finally {
        this.isLoadingCollaborateurs = false;
      }
    },

    openCollaborateurDialog(item = null) {
      this.collaborateurForm = item
        ? {
            id: item.id,
            nom: item.nom,
            prenom: item.prenom,
            poste: item.poste,
            telephone: item.telephone || "",
            email: item.email,
            modules: [...(item.modules_autorises || [])],
          }
        : { id: null, nom: "", prenom: "", poste: "", telephone: "", email: "", modules: [] };
      this.collaborateurDialog = true;
    },

    async saveCollaborateur() {
      const form = this.collaborateurForm;
      if (!form.nom || !form.prenom || !form.poste || !form.email) {
        this.showNotify("Nom, prénom, poste et email sont requis.", "error");
        return;
      }

      this.isSavingCollaborateur = true;
      try {
        const payload = {
          nom: form.nom,
          prenom: form.prenom,
          poste: form.poste,
          telephone: form.telephone,
          email: form.email,
          modules_autorises: form.modules,
        };

        if (form.id) {
          await axios.put(`${API_BASE}/administration/collaborateurs/${form.id}`, payload, {
            headers: this.authHeaders(),
          });
          this.showNotify("Collaborateur mis à jour.");
        } else {
          const { data } = await axios.post(`${API_BASE}/administration/collaborateurs`, payload, {
            headers: this.authHeaders(),
          });
          this.generatedCredentials = { email: form.email, password: data.mot_de_passe_temporaire };
          this.generatedPasswordDialog = true;
          this.showNotify("Collaborateur créé.");
        }

        this.collaborateurDialog = false;
        await this.fetchCollaborateurs();
      } catch (error) {
        this.showNotify(error.response?.data?.message || "Erreur lors de l'enregistrement.", "error");
      } finally {
        this.isSavingCollaborateur = false;
      }
    },

    async resetCollaborateurPassword(item) {
      try {
        const { data } = await axios.post(
          `${API_BASE}/administration/collaborateurs/${item.id}/reset-password`,
          {},
          { headers: this.authHeaders() }
        );
        this.generatedCredentials = { email: item.email, password: data.mot_de_passe_temporaire };
        this.generatedPasswordDialog = true;
      } catch (error) {
        this.showNotify(error.response?.data?.message || "Erreur lors de la réinitialisation.", "error");
      }
    },

    confirmDeleteCollaborateur(item) {
      this.collaborateurToDelete = item;
      this.deleteCollaborateurDialog = true;
    },

    async deleteCollaborateur() {
      if (!this.collaborateurToDelete) return;
      this.isSavingCollaborateur = true;
      try {
        await axios.delete(`${API_BASE}/administration/collaborateurs/${this.collaborateurToDelete.id}`, {
          headers: this.authHeaders(),
        });
        this.showNotify("Collaborateur supprimé.");
        this.deleteCollaborateurDialog = false;
        this.collaborateurToDelete = null;
        await this.fetchCollaborateurs();
      } catch (error) {
        this.showNotify(error.response?.data?.message || "Erreur lors de la suppression.", "error");
      } finally {
        this.isSavingCollaborateur = false;
      }
    },

    // ================================================================
    //  FRAIS DE SCOLARITÉ PAR PROMOTION
    // ================================================================
    async fetchPromotionsFrais() {
      if (!this.etablissementId) return;

      this.isLoadingPromotions = true;

      try {
        const response = await axios.get(
          `${API_BASE}/scolarite/promotions/${this.etablissementId}`,
          { headers: this.authHeaders() }
        );

        this.promotionsFrais = response?.data || [];
      } catch (error) {
        console.error("Erreur chargement promotions :", error);
        this.showNotify("Erreur lors du chargement des promotions.", "error");
        this.promotionsFrais = [];
      } finally {
        this.isLoadingPromotions = false;
      }
    },

    async appliquerFraisPromotion() {
      if (!this.currentAnneeScolaireId) {
        this.showNotify("Aucune année scolaire active.", "error");
        return;
      }

      const montant = Number(this.fraisMontant);
      if (!montant || montant <= 0) {
        this.showNotify("Saisissez un montant valide.", "error");
        return;
      }

      if (!this.fraisPromotionId) {
        this.showNotify("Sélectionnez une promotion.", "error");
        return;
      }

      this.isSavingFrais = true;

      try {
        const response = await axios.post(
          `${API_BASE}/scolarite/promotion`,
          {
            promotionId: this.fraisPromotionId,
            anneeScolaireId: this.currentAnneeScolaireId,
            etablissementId: this.etablissementId,
            montantTotal: montant,
          },
          { headers: this.authHeaders() }
        );

        this.showNotify(response?.data?.message || "Frais appliqués.", "success");
      } catch (error) {
        console.error("Erreur enregistrement frais :", error);
        const message =
          error?.response?.data?.message ||
          "Erreur lors de l’enregistrement des frais.";
        this.showNotify(message, "error");
      } finally {
        this.isSavingFrais = false;
      }
    },

    // ================================================================

    normalizeSettingsPayload() {
      return {
        effectifMaxParClasse: Math.max(1, Number(this.settings.effectifMaxParClasse) || 1),
        effectifMinNouvelleClasse: Math.max(1, Number(this.settings.effectifMinNouvelleClasse) || 1),
        activerCreationAutoClasse: parseBoolean(this.settings.activerCreationAutoClasse, true),
        activerRepartitionIntelligente: true,
        noteInterne: String(this.settings.noteInterne || "").trim(),
      };
    },

    async handleAutoSaveSwitch() {
      if (this.isSavingSettings) return;
      await this.saveSettings({ silentSuccess: true, reloadAfterSave: true });
    },

    resetAddForm() {
      this.showAddForm = false;
      this.nouvelleAnnee = "";
    },

    resetSettingsForm() {
      this.settings = { ...this.defaultSettings };
    },

    resetReportState() {
      this.reportMessage = "";
      this.aFaire = [];
      this.confirmationSaisie = "";
      this.blocagesOuverts = {};
      this.groupesOuverts = {};
      this.classesOuvertes = {};
      this.searchClasse = "";
      this.searchEleve = "";
      this.previewReadyForValidation = false;

      this.reportMeta = {
        title: "Rapport de clôture",
        isError: false,
      };

      this.reportData = {
        rapportParClasse: [],
        rapportMoyennesManquantes: [],
        anomaliesPromotion: [],
        alertesCapacite: [],
        detailsGroupes: [],
        totalClasses: 0,
        totalElevesConcernes: 0,
        totalAnomaliesPromotion: 0,
        totalAffectationsExistantes: 0,
        totalCreationsDeClasses: 0,
      };
    },

    closeReportDialog() {
      this.reportDialog = false;
    },

    getDestinationColor(destination) {
      const value = String(destination || "").toLowerCase();
      if (value.includes("fin de cycle")) return "deep-purple";
      if (value.includes("non déterminé")) return "grey";
      return "primary";
    },

    formatGroupeType(type) {
      const map = {
        affectation_existante: "Classe existante",
        creation_nouvelle_classe: "Nouvelle classe",
        repartition_multi_classes: "Répartition multiple",
        division_equilibree: "Division équilibrée",
        groupe_unique: "Classe unique",
      };

      return map[type] || type || "Non défini";
    },

    filterEleves(eleves = []) {
      const search = (this.searchEleve || "").toLowerCase().trim();

      if (!search) return eleves;

      return eleves.filter((e) => {
        const fullName = `${e.nom || ""} ${e.prenom || ""}`.toLowerCase();
        const classeActuelle = String(e.classeActuelle || "").toLowerCase();
        return fullName.includes(search) || classeActuelle.includes(search);
      });
    },

    async loadSettings() {
      if (!this.etablissementId) return;

      this.isLoadingSettings = true;

      try {
        const response = await axios.get(
          `${API_BASE}/cloture-parametres/${this.etablissementId}`,
          { headers: this.authHeaders() }
        );

        const params = response?.data?.parametres || response?.data || {};

        this.settings = {
          effectifMaxParClasse: Number(params.effectifMaxParClasse ?? 50),
          effectifMinNouvelleClasse: Number(params.effectifMinNouvelleClasse ?? 10),
          activerCreationAutoClasse: parseBoolean(params.activerCreationAutoClasse, true),
          activerRepartitionIntelligente: parseBoolean(params.activerRepartitionIntelligente, true),
          noteInterne: params.noteInterne || "",
        };

        this.defaultSettings = { ...this.settings };
      } catch (error) {
        console.error("Erreur chargement paramètres :", error);
        this.settings = { ...this.defaultSettings };
      } finally {
        this.isLoadingSettings = false;
      }
    },

    async saveSettings(options = {}) {
      const { silentSuccess = false, reloadAfterSave = false } = options;

      if (!this.etablissementId) {
        this.showNotify("Établissement introuvable.", "error");
        return;
      }

      const payload = this.normalizeSettingsPayload();

      if (payload.effectifMinNouvelleClasse > payload.effectifMaxParClasse) {
        this.showNotify(
          "L’effectif minimal d’une nouvelle classe ne peut pas dépasser l’effectif maximal.",
          "error"
        );
        return;
      }

      this.isSavingSettings = true;

      try {
        const response = await axios.post(
          `${API_BASE}/cloture-parametres`,
          {
            etablissementId: this.etablissementId,
            ...payload,
          },
          { headers: this.authHeaders() }
        );

        if (reloadAfterSave) {
          await this.loadSettings();
        } else {
          const params = response?.data?.parametres || payload;

          this.settings = {
            effectifMaxParClasse: Number(params.effectifMaxParClasse ?? payload.effectifMaxParClasse),
            effectifMinNouvelleClasse: Number(
              params.effectifMinNouvelleClasse ?? payload.effectifMinNouvelleClasse
            ),
            activerCreationAutoClasse: parseBoolean(
              params.activerCreationAutoClasse,
              payload.activerCreationAutoClasse
            ),
            activerRepartitionIntelligente: parseBoolean(
              params.activerRepartitionIntelligente,
              payload.activerRepartitionIntelligente
            ),
            noteInterne: params.noteInterne ?? payload.noteInterne ?? "",
          };

          this.defaultSettings = { ...this.settings };
        }

        if (!silentSuccess) {
          this.showNotify(
            response?.data?.message || "Paramètres enregistrés avec succès.",
            "success"
          );
        }
      } catch (error) {
        console.error("Erreur enregistrement paramètres :", error);
        const message =
          error?.response?.data?.message ||
          "Erreur lors de l’enregistrement des paramètres.";
        this.showNotify(message, "error");

        await this.loadSettings();
      } finally {
        this.isSavingSettings = false;
      }
    },

    async ajouterAnneeScolaire() {
      if (!this.nouvelleAnnee || !this.etablissementId) {
        this.showNotify("Veuillez saisir une année scolaire valide.", "error");
        return;
      }

      this.isAdding = true;

      try {
        const payload = {
          annee: this.nouvelleAnnee,
          etablissementId: this.etablissementId,
        };

        const response = await axios.post(`${API_BASE}/annees-scolaires`, payload);

        this.currentAnneeScolaire =
          response?.data?.annee ||
          response?.data?.data?.annee ||
          this.nouvelleAnnee;

        this.currentAnneeScolaireId =
          response?.data?.id ||
          response?.data?.anneeScolaireId ||
          response?.data?.data?.id ||
          response?.data?.data?.anneeScolaireId ||
          this.currentAnneeScolaireId;

        this.showNotify(
          response?.data?.message || "Année scolaire ajoutée avec succès !",
          "success"
        );

        this.$emit("annee-ajoutee", {
          annee: this.currentAnneeScolaire,
          anneeScolaireId: this.currentAnneeScolaireId,
        });

        this.resetAddForm();
      } catch (error) {
        console.error("Erreur ajout année :", error);
        const message =
          error?.response?.data?.message ||
          "Erreur lors de l’ajout de l’année scolaire.";
        this.showNotify(message, "error");
      } finally {
        this.isAdding = false;
      }
    },

    // Élèves regroupés par classe (recherche d'élève appliquée), classes
    // dans l'ordre naturel, élèves du meilleur au plus faible.
    parClasse(liste) {
      const groupes = new Map();
      this.filterEleves(liste).forEach((e) => {
        if (!groupes.has(e.classeActuelle)) groupes.set(e.classeActuelle, []);
        groupes.get(e.classeActuelle).push(e);
      });
      return [...groupes]
        .sort(([a], [b]) => String(a).localeCompare(String(b), "fr", { numeric: true }))
        .map(([classe, eleves]) => ({ classe, eleves: eleves.sort((x, y) => (y.moyenneAnnuelle ?? -1) - (x.moyenneAnnuelle ?? -1)) }));
    },
    basculer(objet, cle) {
      objet[cle] = !objet[cle];
    },
    formatMoy(v) {
      return v === null || v === undefined ? "—" : `${String(Math.round(Number(v) * 100) / 100).replace(".", ",")}/20`;
    },
    // Lien d'un blocage : on ferme le rapport et on va corriger.
    allerVers(chemin) {
      this.reportDialog = false;
      this.$router.push(chemin);
    },

    async chargerDerniereCloture() {
      try {
        const { data } = await axios.get(`${API_BASE}/cloture-annee-scolaire/derniere/${this.etablissementId}`, { headers: this.authHeaders() });
        this.derniereCloture = data?.cloture || null;
      } catch (e) {
        this.derniereCloture = null;
      }
    },

    formatDateCloture(date) {
      return date ? new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
    },

    async annulerCloture() {
      this.annulationEnCours = true;
      try {
        const { data } = await axios.post(`${API_BASE}/cloture-annee-scolaire/annuler`, { journalId: this.derniereCloture.id }, { headers: this.authHeaders() });
        this.annulationDialog = false;
        this.showNotify(data.message, "success");
        this.currentAnneeScolaire = data.annee;
        this.currentAnneeScolaireId = data.anneeScolaireId;
        this.$emit("annee-cloturee", { annee: data.annee, anneeScolaireId: data.anneeScolaireId });
        await this.chargerDerniereCloture();
      } catch (error) {
        this.showNotify(error?.response?.data?.message || "L'annulation a échoué.", "error");
        await this.chargerDerniereCloture();
      } finally {
        this.annulationEnCours = false;
      }
    },

    async ouvrirRapportCloture() {
      if (!this.currentAnneeScolaireId) {
        this.showNotify("Aucune année scolaire en cours n’est disponible.", "error");
        return;
      }

      this.isPreparingReport = true;
      this.resetReportState();

      try {
        const response = await axios.post(
          `${API_BASE}/cloture-annee-scolaire`,
          {
            etablissementId: this.etablissementId,
            anneeScolaireId: this.currentAnneeScolaireId,
          },
          { headers: this.authHeaders() }
        );

        const data = response?.data || {};

        this.reportMeta = {
          title: "Rapport de clôture avant validation",
          isError: false,
        };

        this.reportMessage =
          data?.message ||
          "Rapport généré avec succès. Aucune modification n’a encore été appliquée.";

        this.reportData = data?.rapport || this.reportData;
        this.previewReadyForValidation = !!data?.confirmationRequise;
        this.empreinteRapport = data?.empreinte || null;
        this.nomAnneeACloturer = data?.nomAnnee || this.currentAnneeScolaire;
        this.reportDialog = true;
      } catch (error) {
        console.error("Erreur prévisualisation clôture :", error);

        const data = error?.response?.data || {};

        this.reportMeta = {
          title: "Rapport bloquant de clôture",
          isError: true,
        };

        this.reportMessage =
          data?.message ||
          "Impossible de préparer la clôture pour le moment.";

        this.reportData = data?.rapport || this.reportData;
        this.previewReadyForValidation = false;
        this.reportDialog = true;
      } finally {
        this.isPreparingReport = false;
      }
    },

    async executerClotureConfirmee() {
      if (!this.currentAnneeScolaireId) {
        this.showNotify("Aucune année scolaire en cours n’est disponible.", "error");
        return;
      }

      this.confirmDialog = false;
      this.isClosing = true;

      try {
        const response = await axios.post(
          `${API_BASE}/cloture-annee-scolaire`,
          {
            etablissementId: this.etablissementId,
            anneeScolaireId: this.currentAnneeScolaireId,
            confirmation: true,
            empreinte: this.empreinteRapport,
          },
          { headers: this.authHeaders() }
        );

        const data = response?.data || {};

        this.reportMeta = {
          title: "Clôture effectuée avec succès",
          isError: false,
        };

        this.reportMessage =
          data?.message ||
          "Année scolaire clôturée avec succès.";

        this.reportData = data?.rapport || this.reportData;
        this.aFaire = data?.aFaire || [];
        this.previewReadyForValidation = false;
        this.confirmationSaisie = "";
        this.reportDialog = true;
        this.chargerDerniereCloture();

        this.showNotify(this.reportMessage, "success");

        // L'année suivante est ouverte par la clôture : l'écran passe dessus.
        if (data.nouvelleAnneeId) {
          this.currentAnneeScolaire = data.nouvelleAnnee;
          this.currentAnneeScolaireId = data.nouvelleAnneeId;
        }
        this.$emit("annee-cloturee", {
          annee: this.currentAnneeScolaire,
          anneeScolaireId: this.currentAnneeScolaireId,
        });
      } catch (error) {
        console.error("Erreur clôture :", error);

        const data = error?.response?.data || {};
        this.confirmationSaisie = "";

        // Les données ont changé depuis le rapport : nouveau rapport à relire.
        if (data.code === "PLAN_CHANGE") {
          this.reportMeta = { title: "Rapport mis à jour : à relire", isError: false };
          this.reportMessage = data.message;
          this.reportData = data.rapport || this.reportData;
          this.empreinteRapport = data.empreinte || null;
          this.previewReadyForValidation = true;
          this.reportDialog = true;
          return;
        }

        this.reportMeta = {
          title: "Échec de la clôture",
          isError: true,
        };

        this.reportMessage =
          data?.message ||
          "Erreur lors de la clôture de l’année scolaire.";

        this.reportData = data?.rapport || this.reportData;
        this.previewReadyForValidation = false;
        this.reportDialog = true;

        this.showNotify(this.reportMessage, "error");
      } finally {
        this.isClosing = false;
      }
    },
  },
};
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(25, 118, 210, 0.08), transparent 22%),
    radial-gradient(circle at top left, rgba(99, 102, 241, 0.07), transparent 18%),
    linear-gradient(180deg, #f4f7fb 0%, #eef3f9 100%);
}

.main-card {
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: #ffffff;
}

.toolbar-custom {
  min-height: 86px;
}

.toolbar-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.toolbar-subtitle {
  opacity: 0.92;
}

.toolbar-badge {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
}

.min-w-0 {
  min-width: 0;
}

/* ----- Layout paramètres (sidebar + contenu) ----- */
.settings-shell {
  display: flex;
  align-items: stretch;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.settings-nav {
  flex: 0 0 250px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px 12px;
  background: #fbfcfe;
  border-right: 1px solid rgba(15, 23, 42, 0.06);
}

.settings-nav__item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #475569;
  font-size: 0.92rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.settings-nav__icon {
  flex-shrink: 0;
}

.settings-nav__chevron {
  margin-left: auto;
}

.settings-nav__item:hover:not(:disabled) {
  background: rgba(25, 118, 210, 0.06);
  color: #1976d2;
}

.settings-nav__item--active {
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
}

.settings-nav__item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.settings-content {
  flex: 1 1 auto;
  min-width: 0;
  padding: 24px 24px 4px;
}

.settings-panel {
  animation: settings-panel-in 0.15s ease;
}

@keyframes settings-panel-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fin-cycle :deep(.v-expansion-panel) { border: 1px solid #e3e9f1; }
.fin-cycle-titre { display: flex; align-items: center; flex-wrap: wrap; }
.fin-cycle-classe { min-height: 40px !important; font-weight: 600; }
.fin-cycle-nb { margin-left: 8px; font-weight: 400; font-size: 0.8rem; color: #5f6b7a; }
.blocage-card { border: 1px solid #f5c2c0; background: #fff8f7; }
.blocage-titre { font-weight: 800; font-size: 0.95rem; color: #b71c1c; }
.blocage-explication { font-size: 0.86rem; color: #37474f; }
.voir-tout { background: none; border: 0; padding: 0; color: #1565c0; font-weight: 700; font-size: 0.8rem; cursor: pointer; text-decoration: underline; }
.liste-eleves-classe { margin-top: 6px; max-height: 320px; overflow-y: auto; border-top: 1px solid #e3e9f1; padding-top: 4px; }
.eleve-moyenne { display: flex; gap: 8px; align-items: center; font-size: 0.82rem; padding: 2px 4px; border-radius: 4px; }
.eleve-moyenne .eleve-name { flex: 1; min-width: 0; }
.eleve-moyenne.is-redouble { background: #fdecea; }
.eleve-moy { font-weight: 700; white-space: nowrap; }
.eleve-decision { font-size: 0.72rem; font-weight: 700; min-width: 62px; text-align: right; }
.is-admis .eleve-decision { color: #2e7d32; }
.is-redouble .eleve-decision { color: #c62828; }
.annulation-card { border: 1px solid #cfe0f5; background: #f7faff; }
.liste-compacte { margin: 4px 0 0; padding-left: 18px; font-size: 0.85rem; }
.cloture-cta {
  background: linear-gradient(180deg, #fff6f6 0%, #fff0f0 100%) !important;
  border: 1px solid #ffd9d9 !important;
}

.gap-3 {
  gap: 12px;
}

.deep-purple-soft {
  background: #f1e9fb;
}

@media (max-width: 900px) {
  .settings-shell {
    flex-direction: column;
  }

  .settings-nav {
    flex-direction: row;
    flex: 0 0 auto;
    overflow-x: auto;
    gap: 8px;
    padding: 12px;
    border-right: none;
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  }

  .settings-nav__item {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .settings-nav__chevron {
    display: none;
  }

  .settings-content {
    padding: 18px 16px 4px;
  }
}

.year-card {
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid #dbe8f6;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.year-label {
  color: #64748b;
  font-size: 0.95rem;
  font-weight: 600;
}

.year-value {
  color: #0f172a;
  font-size: 1.55rem;
  font-weight: 900;
  line-height: 1.2;
  word-break: break-word;
}

.btn-main {
  min-height: 52px !important;
}

.add-form-box,
.settings-box {
  border: 1px solid #dfe7f1 !important;
  background: linear-gradient(180deg, #fafbfd 0%, #f5f7fb 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.section-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-soft {
  background: #e9f2ff;
}

.indigo-soft {
  background: #eef2ff;
}

.success-soft {
  background: #e6f7ec;
}

.section-title-text {
  font-size: 1.02rem;
  font-weight: 800;
  color: #111827;
}

.section-subtitle-text {
  font-size: 0.88rem;
  color: #64748b;
}

.settings-summary-card {
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid #dbe8f6;
  height: 100%;
}

.summary-title {
  color: #111827;
  font-weight: 800;
  font-size: 1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  color: #334155;
}

.summary-key {
  font-weight: 600;
}

.summary-text {
  color: #475569;
  line-height: 1.5;
}

.settings-switch ::v-deep .v-label {
  color: #1f2937 !important;
  opacity: 1 !important;
  font-weight: 600;
}

/* ----- Frais de scolarité ----- */
.frais-box {
  border: 1px solid #d3edd9 !important;
  background: linear-gradient(180deg, #fbfffc 0%, #f4fbf6 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.frais-global {
  background: #ffffff;
  border: 1px solid #e5edf6;
  border-radius: 10px;
  padding: 10px 12px;
}

.frais-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #e5edf6;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 6px;
}

.frais-row__name {
  flex: 0 0 96px;
  font-weight: 700;
  color: #1f2937;
  word-break: break-word;
}

.frais-row__input {
  flex: 1 1 auto;
}

.info-box {
  background-color: #f8fbff;
  border: 1px solid #dbe8f6;
}

.info-title {
  color: #1f2937;
}

.info-text {
  color: #4b5563;
}

.gap-2 {
  gap: 8px;
}

.report-dialog-card {
  overflow: hidden;
}

.report-content-wrap {
  background: linear-gradient(180deg, #fbfcfe 0%, #f6f9fc 100%);
}

.section-block {
  margin-top: 28px;
}

.section-title {
  display: flex;
  align-items: center;
  font-weight: 800;
  font-size: 1rem;
  color: #1f2937;
  margin-bottom: 16px;
}

.stat-card {
  border: 1px solid transparent;
  height: 100%;
}

.stat-card-blue {
  background: linear-gradient(180deg, #eef5ff 0%, #e3efff 100%);
  border-color: #cfe0ff;
}

.stat-card-green {
  background: linear-gradient(180deg, #effbf1 0%, #e3f7e8 100%);
  border-color: #cdeed8;
}

.stat-card-red {
  background: linear-gradient(180deg, #fff1f1 0%, #ffe7e7 100%);
  border-color: #ffd3d3;
}

.stat-card-orange {
  background: linear-gradient(180deg, #fff7ed 0%, #ffefdb 100%);
  border-color: #ffe0b8;
}

.stat-label {
  font-size: 0.9rem;
  color: #475569;
  margin-bottom: 10px;
  font-weight: 600;
}

.stat-value {
  font-size: 1.85rem;
  line-height: 1;
  font-weight: 900;
  color: #111827;
}

.class-report-card {
  background: #ffffff;
  border: 1px solid #e5edf6;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  height: 100%;
}

.class-name {
  color: #1f2937;
}

.mini-stat-box {
  border-radius: 10px;
  padding: 14px 10px;
  text-align: center;
  height: 100%;
}

.mini-stat-total {
  background: #f4f7fb;
  border: 1px solid #e5eaf2;
}

.mini-stat-pass {
  background: #edf9f0;
  border: 1px solid #d3edd9;
}

.mini-stat-fail {
  background: #fff1f1;
  border: 1px solid #ffdada;
}

.mini-stat-number {
  font-size: 1.25rem;
  font-weight: 900;
  color: #111827;
  line-height: 1.1;
}

.mini-stat-label {
  margin-top: 6px;
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 700;
}

.affectation-card {
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  border: 1px solid #d8e9f8;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  height: 100%;
}

.anomaly-card {
  background: linear-gradient(180deg, #fff9f9 0%, #fff4f4 100%);
  border: 1px solid #ffd8d8;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  height: 100%;
}

.eleves-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.eleve-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  color: #374151;
  font-size: 0.92rem;
}

.eleve-name {
  font-weight: 600;
}

.eleve-class {
  color: #6b7280;
  font-size: 0.82rem;
}

.problem-cell {
  white-space: normal;
  line-height: 1.45;
  color: #b42318;
  font-weight: 600;
}

.custom-table {
  background: white;
  border: 1px solid #e7edf5;
}

.action-bar {
  gap: 10px;
}

.custom-input ::v-deep .v-input__slot {
  background: #ffffff !important;
  border-radius: 10px!important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.custom-input ::v-deep input,
.custom-input ::v-deep textarea {
  color: #111827 !important;
  caret-color: #1976d2 !important;
  font-weight: 500;
}

.custom-input ::v-deep input::placeholder,
.custom-input ::v-deep textarea::placeholder {
  color: #6b7280 !important;
  opacity: 1 !important;
}

.custom-input ::v-deep .v-label {
  color: #4b5563 !important;
  font-weight: 500;
}

.custom-input ::v-deep .v-icon {
  color: #5f6b7a !important;
}

.custom-input ::v-deep .v-input__slot fieldset {
  border-color: #cbd5e1 !important;
}

.custom-input ::v-deep .v-input--is-focused .v-input__slot fieldset {
  border-color: #1976d2 !important;
  border-width: 1px !important;
}

@media (max-width: 768px) {
  .toolbar-custom {
    min-height: 78px;
  }

  .stat-value {
    font-size: 1.55rem;
  }

  .section-title {
    font-size: 0.95rem;
  }

  .year-value {
    font-size: 1.3rem;
  }
}

@media (max-width: 600px) {
  .actions-mobile {
    flex-direction: column;
  }

  .btn-main {
    min-height: 50px !important;
  }

  .stat-value {
    font-size: 1.45rem;
  }

  .mini-stat-box {
    padding: 12px 8px;
  }

  .report-content-wrap {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .action-bar .v-btn {
    width: 100%;
  }

  .frais-row {
    flex-wrap: wrap;
  }

  .frais-row__name {
    flex: 1 1 100%;
  }
}
</style>