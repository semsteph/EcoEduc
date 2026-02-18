<template>
  <v-container class="info-page">
    <!-- Back button top -->
    <div class="topbar">
      <v-btn class="pill-back" variant="tonal" color="primary" @click="$emit('back')">
        <v-icon start>mdi-arrow-left</v-icon>
        Retour
      </v-btn>
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
    <v-card class="student-card" elevation="12">
      <div class="student-accent" aria-hidden="true"></div>

      <v-img :src="child.photo || defaultPhoto" class="student-img" cover>
        <div class="img-overlay"></div>

        <div class="student-badge">
          <v-icon size="16">mdi-school</v-icon>
          <span class="ml-1">{{ child.class || "Classe" }}</span>
        </div>
      </v-img>

      <v-card-text class="student-body">
        <div class="student-name">{{ child.prenom }} {{ child.nom }}</div>
        <div class="student-meta">
          <v-icon size="16" class="mr-1">mdi-identifier</v-icon>
          ID : {{ child.id || "-" }}
        </div>
      </v-card-text>
    </v-card>

    <!-- ✅ Actions (2/ligne mobile, 3 md, 4 lg) + centré -->
    <v-card class="actions-shell" elevation="12">
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

        <v-divider class="my-4" />

        <div class="grid-center">
          <v-row class="grid-row" dense justify="center" align="stretch">
            <v-col
              v-for="(label, index) in labels"
              :key="index"
              cols="6"
              sm="6"
              md="4"
              lg="3"
              class="card-col"
            >
              <v-card
                class="action-card"
                elevation="10"
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
      <v-btn class="pill-back" color="primary" variant="tonal" @click="goBack">
        <v-icon start>mdi-arrow-left</v-icon>
        Retour
      </v-btn>
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
        { name: "Programme", route: "programme", icon: "mdi-book-open-page-variant-outline", tone: "purple" },
        { name: "Demande de Permission", route: "permission", icon: "mdi-file-sign", tone: "purple" },
        { name: "Activité", route: "activite", icon: "mdi-run", tone: "amber" },
        { name: "Assistances", route: "assistances", icon: "mdi-lifebuoy", tone: "green" },
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
/* ✅ Charte app */
.info-page {
  padding-top: 12px;
  padding-bottom: 18px;
}

/* Top bar */
.topbar {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 10px;
}
.pill-back {
  border-radius: 999px !important;
  font-weight: 900;
  text-transform: none;
}

/* Title block */
.page-head {
  padding: 6px 6px 10px;
}
.title {
  display: flex;
  align-items: center;
  font-weight: 900;
  color: #0b2e4a;
  letter-spacing: 0.2px;
  font-size: 1.15rem;
}
.subtitle {
  margin-top: 6px;
  color: #455a64;
  font-size: 0.95rem;
}

/* Student card */
.student-card {
  border-radius: 22px !important;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 70px rgba(11, 46, 74, 0.12);
  margin-bottom: 16px;
}
.student-accent {
  height: 6px;
  width: 100%;
  background: linear-gradient(90deg, #1976d2, rgba(25,118,210,0.22), #1976d2);
}
.student-img {
  height: 200px;
}
.img-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.28) 100%);
}
.student-badge {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(25, 118, 210, 0.16);
  color: #0b2e4a;
  font-weight: 900;
  font-size: 0.85rem;
}
.student-body {
  padding: 14px 14px 16px !important;
}
.student-name {
  font-weight: 900;
  color: #0b2e4a;
  font-size: 1.05rem;
}
.student-meta {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  color: #607d8b;
  font-weight: 700;
  font-size: 0.9rem;
}

/* Actions shell */
.actions-shell {
  border-radius: 22px !important;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 70px rgba(11, 46, 74, 0.12);
}
.shell-accent {
  height: 6px;
  width: 100%;
  background: linear-gradient(90deg, #1976d2, rgba(25,118,210,0.18), #1976d2);
}
.shell-body {
  padding: 16px !important;
}
.shell-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.shell-title {
  display: flex;
  align-items: center;
  font-weight: 900;
  color: #0b2e4a;
}
.chip {
  border-radius: 999px !important;
  font-weight: 900;
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

/* Action card */
.action-card {
  width: 100%;
  border-radius: 18px !important;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.12);
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.95);
}
.action-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 55px rgba(11, 46, 74, 0.16) !important;
  border-color: rgba(25, 118, 210, 0.22);
}
.action-accent {
  height: 6px;
  width: 100%;
  opacity: 0.95;
}
.action-body {
  min-height: 98px;
  padding: 14px 12px 12px;
  display: grid;
  gap: 8px;
  align-content: center;
  justify-items: center;
  text-align: center;
}
.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(25, 118, 210, 0.12);
}
.action-title {
  font-weight: 900;
  color: #0b2e4a;
  font-size: 0.98rem;
}
.action-cta {
  display: inline-flex;
  align-items: center;
  font-weight: 800;
  color: #1976d2;
  font-size: 0.9rem;
}

/* Tones (couleurs cohérentes sans casser la charte) */
.accent-blue { background: linear-gradient(90deg, #1976d2, rgba(25,118,210,0.22), #1976d2); }
.icon-blue { background: rgba(25,118,210,0.08); color: #1976d2; }

.accent-blue2 { background: linear-gradient(90deg, #0b2e4a, rgba(11,46,74,0.18), #0b2e4a); }
.icon-blue2 { background: rgba(11,46,74,0.08); color: #0b2e4a; }

.accent-green { background: linear-gradient(90deg, #2e7d32, rgba(46,125,50,0.18), #2e7d32); }
.icon-green { background: rgba(46,125,50,0.10); color: #2e7d32; }

.accent-amber { background: linear-gradient(90deg, #ed6c02, rgba(237,108,2,0.18), #ed6c02); }
.icon-amber { background: rgba(237,108,2,0.10); color: #ed6c02; }

.accent-purple { background: linear-gradient(90deg, #6a1b9a, rgba(106,27,154,0.18), #6a1b9a); }
.icon-purple { background: rgba(106,27,154,0.10); color: #6a1b9a; }

/* ✅ petits téléphones */
@media (max-width: 480px) {
  .student-img { height: 160px; }
  .shell-body { padding: 14px !important; }
  .action-body { min-height: 90px; padding: 12px 10px; }
  .action-title { font-size: 0.94rem; }
}
</style>
