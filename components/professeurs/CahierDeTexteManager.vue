<template>
  <v-card>
    <v-card-title>Cahier de Texte</v-card-title>
    <v-card-text>
      <v-tabs v-model="selectedTerm" background-color="deep-purple accent-4" dark>
        <v-tab v-for="term in terms" :key="term">{{ term }}</v-tab>
      </v-tabs>

      <v-tabs-items v-model="selectedTerm">
        <v-tab-item>
          <v-data-table
            :headers="headers"
            :items="activities[selectedTerm]"
            item-key="id"
            class="elevation-1"
            :items-per-page="5"
          >
            <template v-slot:body="props">
              <tbody>
                <tr v-for="(item, index) in props.items" :key="item.id">
                  <td class="table-column">
                    <v-text-field v-model="item.date" type="date" outlined dense></v-text-field>
                  </td>
                  <td class="table-column">
                    <v-text-field v-model="item.hour" type="time" outlined dense></v-text-field>
                  </td>
                  <td class="table-column">
                    <v-textarea v-model="item.activity" outlined rows="3"></v-textarea>
                  </td>
                </tr>
              </tbody>
            </template>
          </v-data-table>

          <v-btn @click="saveData" color="primary" class="mt-3">
            Sauvegarder
          </v-btn>
          <v-btn @click="goBack" class="mt-3" color="secondary">
            Retour
          </v-btn>
        </v-tab-item>
      </v-tabs-items>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'CahierDeTexteManager',
  data() {
    return {
      selectedTerm: 0,
      terms: ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'],
      headers: [
        { text: 'Date', value: 'date' },
        { text: 'Horaire', value: 'hour' },
        { text: 'Activité', value: 'activity' }
      ],
      activities: [
        // Exemple de données pour chaque trimestre
        [
          { id: 1, date: '', hour: '', activity: '' },
          { id: 2, date: '', hour: '', activity: '' }
        ],
        [
          { id: 1, date: '', hour: '', activity: '' },
          { id: 2, date: '', hour: '', activity: '' }
        ],
        [
          { id: 1, date: '', hour: '', activity: '' },
          { id: 2, date: '', hour: '', activity: '' }
        ]
      ]
    }
  },
  methods: {
    saveData() {
      // Logique pour sauvegarder les données
      // Réinitialiser les champs
      this.activities[this.selectedTerm] = this.activities[this.selectedTerm].map(item => ({
        ...item,
        date: '',
        hour: '',
        activity: ''
      }));
    },
    goBack() {
      // Logique pour naviguer vers un autre niveau ou afficher un autre composant
      this.$router.push({ name: 'ClassManager' }); // Remplacez 'NomDuComposantParent' par le nom de votre composant ou vue parent
    }
  }
}
</script>

<style scoped>
.mt-3 {
  margin-top: 16px;
}

.table-column {
  padding: 8px;
}

.v-data-table th, .v-data-table td {
  padding: 16px;
}

.v-textarea {
  width: 100%;
}
</style>
