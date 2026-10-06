<template>
  <v-container fluid class="pa-3">

    <v-card elevation="0" class="rounded-lg overflow-hidden" v-if="!selectedClassId">
      <v-toolbar height="40" color="primary" dark flat>
        <v-toolbar-title class="font-weight-bold text-subtitle-1">
          <v-icon start>mdi-card-account-details</v-icon>
          Gestion des Cartes Scolaires
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text class="bg-grey-lighten-4 pa-2 pa-sm-3">
        <AideEssentiel cle="cartes-classes">
          <ul>
            <li>Les <strong>photos prises à l'inscription</strong> sont déjà sur les cartes : rien à refaire.</li>
            <li>Pour les autres : ouvrez la classe, puis « Ajouter les photos de la classe » (toutes les photos en une fois).</li>
            <li>Une carte sans photo s'imprime avec les initiales de l'élève.</li>
            <li>Impression au format carte bancaire, 8 cartes par page A4.</li>
          </ul>
        </AideEssentiel>
        <p class="mb-3 text-body-2 text-medium-emphasis">
          Choisissez une classe. L'état des photos de chaque classe est indiqué.
        </p>
        
        <v-row>
          <template v-if="classes.length > 0">
            <v-col v-for="classe in classes" :key="classe.id" cols="12" sm="6" md="4">
              <v-card
                class="class-card pa-3 text-center rounded-lg"
                variant="outlined"
                color="primary"
                @click="goToClass(classe.id)"
              >
                <v-icon size="40" class="mb-2" color="primary">mdi-google-classroom</v-icon>
                <div class="text-h6 font-weight-bold text-primary">{{ classe.nom }}</div>
                <div class="mt-1">
                  <v-chip size="small" :color="etatCouleur(classe.id)" variant="tonal" class="font-weight-bold">
                    {{ etatTexte(classe.id) }}
                  </v-chip>
                </div>
              </v-card>
            </v-col>
          </template>
          <v-col cols="12" v-else>
            <v-alert type="info" variant="tonal" class="rounded-lg">
              Aucune classe disponible.
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <CarteScolaireUpload
      v-else
      :class-id="selectedClassId"
      :class-name="selectedClassName"
      :etablissement-id="etablissementId"
      :etablissement-nom="etablissementNom"
      :annee-scolaire-nom="anneeScolaire"
      @back="clearSelection"
    />
  </v-container>
</template>

<script>
import axios from 'axios'
import CarteScolaireUpload from './CarteScolaireUpload.vue'
import AideEssentiel from '~/components/AideEssentiel.vue'

export default {
  name: 'CarteScolaire',
  components: { CarteScolaireUpload, AideEssentiel },
  props: {
    etablissementId: { type: Number, required: true },
    anneeScolaireId: { type: Number, required: true },
    etablissementNom: String,
    anneeScolaire: String, // Prop à vérifier
    classeId: { type: Number, default: null },
  },
  emits: ['back', 'ouvrir-classe'],
  data: () => ({
    classes: [],
    etats: {},
  }),
  computed: {
    // Classe ouverte : donnée par la route (…/<classeId>). La changer émet
    // « ouvrir-classe » et la page va vers la nouvelle adresse.
    selectedClassId: {
      get() { return this.classeId },
      set(id) { this.$emit('ouvrir-classe', id) }
    },
    selectedClassName() {
      const classe = this.classes.find((c) => Number(c.id) === Number(this.classeId))
      return classe ? classe.nom : ''
    }
  },
  methods: {
    async fetchEtats() {
      try {
        const { data } = await axios.get('/api/cartes-scolaires/etat')
        this.etats = Object.fromEntries((data || []).map((e) => [e.classeId, e]))
      } catch (e) {
        this.etats = {}
      }
    },
    etatTexte(id) {
      const e = this.etats[id]
      if (!e) return '…'
      if (!e.effectif) return 'Aucun élève'
      if (e.avecPhoto === e.effectif) return `${e.effectif}/${e.effectif} · prête`
      return `${e.avecPhoto}/${e.effectif} photos`
    },
    etatCouleur(id) {
      const e = this.etats[id]
      if (!e || !e.effectif) return 'grey'
      if (e.avecPhoto === e.effectif) return 'success'
      return e.avecPhoto ? 'warning' : 'error'
    },
    async fetchClasses() {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/classe/${this.etablissementId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        this.classes = response.data
        // Classe inconnue dans l'adresse : retour à la liste des classes.
        if (this.classeId && !this.selectedClassName) this.selectedClassId = null
      } catch (error) {
        console.error('Erreur classes:', error)
      }
    },
    goToClass(classId) {
      this.selectedClassId = classId
    },
    clearSelection() {
      this.selectedClassId = null
    }
  },
  created() {
    // Vérification des données reçues via les props
    console.log("--- VÉRIFICATION DES PROPS ---");
    console.log("Établissement:", this.etablissementNom);
    console.log("Année Scolaire:", this.anneeScolaire);
    console.log("------------------------------");
    
    this.fetchClasses()
    this.fetchEtats()
  }
}
</script>

<style scoped>
.class-card {
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: white !important;
}
.class-card:hover {
  transform: translateY(-5px);
  border-color: #1976D2;
}
</style>