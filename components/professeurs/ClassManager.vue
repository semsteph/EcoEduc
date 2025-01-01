<template>
  <v-container class="mt-16">
    <template v-if="selectedClass && currentView === 'details'">
      <InfoClasse 
        :classe="selectedClass" 
        :etablissement-id="etablissementId" 
        @back="goBack" 
        @navigate="navigateTo"
      />
    </template>
    <template v-else-if="currentView === 'NoteManager'">
      <NoteManager 
        :classe="selectedClass" 
        :classeId="selectedClassId" 
        :subjectId="subjectId" 
        :etablissement-id="etablissementId" 
        @back="goBack"
      />
    </template>
    <template v-else-if="currentView === 'PresenceManager'">
      <PresenceManager 
        :classe="selectedClass" 
        :classeId="selectedClassId" 
        :subjectId="subjectId" 
        :etablissement-id="etablissementId" 
        @back="goBack"
      />
    </template>
    <template v-else-if="currentView === 'PresencesPrecedantes'">
      <PresencesPrecedantes 
        :classe="selectedClass" 
        :classeId="selectedClassId" 
        :subjectId="subjectId" 
        :etablissement-id="etablissementId" 
        @back="goBack"
      />
    </template>
    <template v-else-if="currentView === 'ConductManager'">
      <ConductManager 
        :classe="selectedClass" 
        :classeId="selectedClassId" 
        :subjectId="subjectId" 
        :etablissement-id="etablissementId" 
        @back="goBack"
      />
    </template>
    <template v-else-if="currentView === 'CahierDeTexteManager'">
      <CahierDeTexteManager 
        :classe="selectedClass" 
        :classeId="selectedClassId" 
        :subjectId="subjectId" 
        :etablissement-id="etablissementId" 
        @back="goBack"
      />
    </template>
    <template v-else>
      <v-row>
        <v-col v-for="classe in filteredClasses" :key="classe.classe_id" cols="12" md="4">
          <v-card @click="selectClass(classe)" color="light-blue lighten-4">
            <v-card-title>{{ classe.classe }}</v-card-title>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script>
import InfoClasse from '~/components/professeurs/InfoClasse.vue';
import NoteManager from '~/components/professeurs/NoteManager.vue';
import PresenceManager from '~/components/professeurs/PresenceManager.vue';
import ConductManager from '~/components/professeurs/ConductManager.vue';
import CahierDeTexteManager from '~/components/professeurs/CahierDeTexteManager.vue';
import PresencesPrecedantes from '~/components/professeurs/PresencesPrecedantes.vue';

export default {
  components: {
    InfoClasse,
    NoteManager,
    PresenceManager,
    PresencesPrecedantes,
    ConductManager,
    CahierDeTexteManager,
  },
  name: 'ClassManager',
  props: {
    subjectId: {
      type: Number,
      required: true,
    },
    classes: {
      type: Array,
      required: true,
    },
    selectedClassId: {
      type: Number,
      required: false,
    },
    etablissementId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      selectedClass: null,
      currentView: null, // Vue par défaut à null pour afficher la liste
    };
  },
  computed: {
    filteredClasses() {
      return this.classes;
    },
  },
  methods: {
    selectClass(classe) {
      this.selectedClass = classe;
      this.currentView = 'details';
      this.$emit('class-selected', classe.classe_id);
    },
    goBack() {
      if (this.currentView === 'details') {
        // Si on est dans 'details', retourne à la liste des classes
        this.selectedClass = null;
        this.currentView = null;
      } else {
        // Si on est dans une autre vue, retourne aux détails de la classe
        this.currentView = 'details';
      }
    },
    navigateTo(view) {
      this.currentView = view;
    },
  },
  mounted() {
    console.log(this.subjectId, this.etablissementId);
  },
};
</script>
