<template>
  <v-container class="info-page">
    <!-- Back button top -->
    <div class="topbar">
    </div>

    <!-- Title -->
    <div class="page-head">
      <div class="title">
        <v-icon size="20" color="primary" class="mr-2">mdi-account-details-outline</v-icon>
        Informations de l'élève
      </div>
      <div class="subtitle">Sélectionnez une rubrique pour consulter les informations.</div>
    </div>

    <!-- Carte élève -->
    <v-card class="student-card" elevation="0">
      <div class="student-accent" aria-hidden="true"></div>

      <div class="student-profil">
        <EleveAvatar :photo="child.photo || ''" :prenom="child.prenom" :nom="child.nom" :size="84" />
        <div class="student-badge student-badge--static">
          <v-icon size="16">mdi-school</v-icon>
          <span class="ml-1">{{ child.class || "Classe" }}</span>
        </div>
      </div>

      <v-card-text class="student-body">
        <div class="student-name">{{ child.prenom }} {{ child.nom }}</div>
        <div class="student-classe"><v-icon size="14" class="mr-1">mdi-school</v-icon>{{ child.class || "Classe" }}</div>
      </v-card-text>
    </v-card>

    <!-- ✅ Actions (2/ligne mobile, 3 md, 3 lg — jamais 4) + centré -->
    <v-card class="actions-shell" elevation="0">
      <div class="shell-accent" aria-hidden="true"></div>

      <v-card-text class="shell-body">
        <div class="shell-top">
          <div class="shell-title">
            <v-icon color="primary" size="18" class="mr-2">mdi-view-grid-outline</v-icon>
            Rubriques
          </div>
          <v-chip size="small" label variant="tonal" class="chip">
            <v-icon start size="16">mdi-format-list-bulleted</v-icon>
            {{ labels.length }} options
          </v-chip>
        </div>

        <v-divider class="my-2" />

        <div class="grid-center">
          <v-row class="grid-row" dense justify="center" align="stretch">
            <v-col
              v-for="(label, index) in labels"
              :key="index"
              cols="6"
              sm="6"
              md="4"
              lg="4"
              class="card-col"
            >
              <v-card
                class="action-card"
                elevation="0"
                @click="navigateTo(label.route)"
              >
                <div class="action-accent" :class="`accent-${label.tone}`"></div>

                <div class="action-body">
                  <div class="action-icon" :class="`icon-${label.tone}`">
                    <v-icon size="20">{{ label.icon }}</v-icon>
                  </div>

                  <div class="action-title">{{ label.name }}</div>

                  <div class="action-cta">
                    Ouvrir
                    <v-icon size="16" class="ml-1">mdi-arrow-right</v-icon>
                  </div>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
    </v-card>

    <!-- Bouton Retour bas -->
    <div class="text-center mt-4">
    </div>
  </v-container>
</template>

<script>
export default {
  name: "InfoDetails",
  emits: ["back", "navigate"],
  props: {
    child: {
      type: Object,
      default: () => ({ id: "", prenom: "", nom: "", class: "", photo: "" }),
    },
  },
  data() {
    return {
      labels: [
        { name: "Notes", route: "notes", icon: "mdi-notebook-outline", tone: "blue" },
        { name: "Bulletin", route: "bulletin", icon: "mdi-file-document-outline", tone: "blue2" },
        { name: "Présence", route: "presence", icon: "mdi-calendar-check-outline", tone: "green" },
        { name: "Conduite", route: "conduite", icon: "mdi-account-check-outline", tone: "amber" },
        { name: "Scolarité", route: "scolarite", icon: "mdi-school-outline", tone: "blue" },
        { name: "Emploi du temps", route: "programme", icon: "mdi-calendar-clock", tone: "purple" },
        { name: "Demande de Permission", route: "permission", icon: "mdi-file-sign", tone: "purple" },
        { name: "Activité", route: "activite", icon: "mdi-run", tone: "amber" },
        { name: "Assistances", route: "assistances", icon: "mdi-account-voice", tone: "green" },
        { name: "Devoirs", route: "devoirs", icon: "mdi-notebook-edit-outline", tone: "purple" },
      ],
      defaultPhoto: "/_nuxt/assets/parents/istockphoto-1495088043-612x612.jpg",
    };
  },
  methods: {
    goBack() {
      this.$emit("back");
    },
    navigateTo(route) {
      this.$emit("navigate", route);
    },
  },
};
</script>

<style scoped>
.student-profil { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 12px 4px; }
.student-badge--static { position: static !important; }
/* ✅ Charte app — version fine */
.info-page {
  padding-top: 8px;
  padding-bottom: 12px;
}

/* Top bar */
.topbar {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 6px;
}
.pill-back {
  border-radius: 999px !important;
  font-weight: 800;
  text-transform: none;
}

/* Title block */
.page-head {
  padding: 2px 2px 8px;
}
.title {
  display: flex;
  align-items: center;
  font-weight: 900;
  color: #0b2e4a;
  letter-spacing: 0.2px;
  font-size: 1.1rem;
}
.subtitle {
  margin-top: 2px;
  color: #455a64;
  font-size: 0.86rem;
}

/* Student card : vignette + nom sur une ligne */
.student-card {
  display: grid !important;
  grid-template-columns: 72px 1fr;
  align-items: center;
  column-gap: 12px;
  padding: 8px;
  border-radius: 10px !important;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  margin-bottom: 10px;
}
.student-accent {
  display: none;
}
.student-img {
  width: 72px;
  height: 72px !important;
  border-radius: 8px;
}
.student-img :deep(.v-responsive__sizer) { padding-bottom: 0 !important; }
.img-overlay {
  display: none;
}
.student-badge {
  display: none;
}
.student-body {
  padding: 0 !important;
}
.student-name {
  font-weight: 900;
  color: #0b2e4a;
  font-size: 1rem;
}
.student-classe {
  display: flex;
  align-items: center;
  margin-top: 2px;
  color: #607d8b;
  font-size: 0.82rem;
  font-weight: 700;
}
/* Actions shell */
.actions-shell {
  border-radius: 10px !important;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
.shell-accent {
  height: 3px;
  width: 100%;
  background: linear-gradient(90deg, #1976d2, rgba(25,118,210,0.18), #1976d2);
}
.shell-body {
  padding: 10px 12px !important;
}
.shell-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.shell-title {
  display: flex;
  align-items: center;
  font-weight: 900;
  color: #0b2e4a;
  font-size: 0.95rem;
}
.chip {
  border-radius: 999px !important;
  font-weight: 800;
}

/* ✅ centrer le grid */
.grid-center {
  display: flex;
  justify-content: center;
}
.grid-row {
  width: 100%;
  max-width: 1120px;
}
.card-col {
  display: flex;
}

/* Action card : tuile basse, barre de couleur fine à gauche */
.action-card {
  position: relative;
  width: 100%;
  border-radius: 8px !important;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.12);
  transition: box-shadow 0.16s ease, border-color 0.16s ease;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.95);
}
.action-card:hover {
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08) !important;
  border-color: rgba(25, 118, 210, 0.28);
}
.action-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  height: auto;
}
.action-body {
  min-height: 44px;
  padding: 6px 10px 6px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
}
.action-icon {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(25, 118, 210, 0.12);
}
.action-icon :deep(.v-icon) {
  font-size: 16px !important;
}
.action-title {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 800;
  color: #0b2e4a;
  font-size: 0.9rem;
  line-height: 1.2;
}
.action-cta {
  display: inline-flex;
  align-items: center;
  font-weight: 700;
  color: #1976d2;
  font-size: 0.8rem;
}

/* Tones (couleurs cohérentes sans casser la charte) */
.accent-blue { background: #1976d2; }
.icon-blue { background: rgba(25,118,210,0.08); color: #1976d2; }

.accent-blue2 { background: #0b2e4a; }
.icon-blue2 { background: rgba(11,46,74,0.08); color: #0b2e4a; }

.accent-green { background: #2e7d32; }
.icon-green { background: rgba(46,125,50,0.10); color: #2e7d32; }

.accent-amber { background: #ed6c02; }
.icon-amber { background: rgba(237,108,2,0.10); color: #ed6c02; }

.accent-purple { background: #6a1b9a; }
.icon-purple { background: rgba(106,27,154,0.10); color: #6a1b9a; }

/* Téléphone : pas de grand cadre, tuiles posées sur la page */
@media (max-width: 600px) {
  .info-page { padding: 8px !important; }
  .title { font-size: 1rem; }
  .actions-shell {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
  .shell-accent { display: none; }
  .shell-body { padding: 0 !important; }
  .grid-row { margin: 0 -3px !important; }
  .grid-row > .card-col { padding: 3px !important; }
  .action-body { min-height: 40px; padding: 4px 6px 4px 10px; gap: 6px; }
  .action-cta { font-size: 0; }
  .action-cta :deep(.v-icon) { font-size: 16px !important; margin: 0 !important; }
  .action-title { font-size: 0.84rem; }
}
</style>
