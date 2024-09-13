<template>
  <v-container class="mt-16">
    <template v-if="selectedClass && currentView === 'details'">
      <InfoClasse :classe="selectedClass" @back="goBack" @navigate="navigateTo"/>
    </template>
    <template v-else-if="currentView === 'NoteManager'">
      <NoteManager :classe="selectedClass" :classeId="selectedClassId" :subjectId="subjectId" @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'PresenceManager'">
      <PresenceManager :classe="selectedClass" :classeId="selectedClassId" :subjectId="subjectId" @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'ConductManager'">
      <ConductManager :classe="selectedClass" :classeId="selectedClassId" :subjectId="subjectId" @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'CahierDeTexteManager'">
      <CahierDeTexteManager :classe="selectedClass" :classeId="selectedClassId" :subjectId="subjectId" @back="goBack"/>
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
    selectedClassId: {  // Ajout de la prop pour recevoir l'ID de la classe sélectionnée
      type: Number,
      required: false,
    },
  },
  data() {
    return {
      selectedClass: null,
      currentView: 'details',
    };
  },
  computed: {
    // Filtrer les classes qui correspondent à la matière sélectionnée
    filteredClasses() {
      return this.classes;
    },
  },
  watch: {
    subjectId(newVal) {
      console.log('L\'ID de la matière a été mis à jour:', newVal);
      // Logique pour mettre à jour les classes en fonction de la nouvelle matière sélectionnée
    }
  },
  methods: {
    selectClass(classe) {
      this.selectedClass = classe;
      this.currentView = 'details';
      this.$emit('class-selected', classe.classe_id); // Emit l'événement de sélection de la classe
    },
    goBack() {
      this.currentView = 'details';
      this.selectedClass = null;
    },
    navigateTo(view) {
      this.currentView = view;
    },
  },
  mounted(){
    console.log(this.subjectId);
  }
};
</script>
