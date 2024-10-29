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
import InfoClasse from './InfoClasse.vue';
import NoteManager from './NoteManager.vue';
import PresenceManager from './PresenceManager.vue';
import ConductManager from './ConductManager.vue';
import CahierDeTexteManager from './CahierDeTexteManager.vue';

export default {
  components: {
    InfoClasse,
    NoteManager,
    PresenceManager,
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
      required: true, // Reçoit les classes filtrées basées sur la matière sélectionnée depuis le parent
    },
    selectedClassId: {
      type: Number,
      required: false,
    },
    etablissementId: { // Ajout de la prop pour recevoir l'ID de l'établissement
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      selectedClass: null,
      currentView: 'details',
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
      this.currentView = 'details';
      this.selectedClass = null;
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
