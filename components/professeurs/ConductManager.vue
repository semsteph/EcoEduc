<template>
  <v-card>
    <v-card-title>
      Gérer Conduite
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="save">Sauvegarder</v-btn>
    </v-card-title>
    <v-card-text>
      <v-container>
        <!-- Tabs for trimesters -->
        <v-tabs v-model="currentTrimester" background-color="blue" dark>
          <v-tab
            v-for="trimester in trimesters"
            :key="trimester"
            @click="changeTrimester(trimester)"
            :class="{'v-tab--active': currentTrimester === trimester}"
          >
            {{ trimester }}
          </v-tab>
        </v-tabs>

        <!-- Data Table -->
        <v-data-table
          :headers="headers"
          :items="conductRecords"
          item-key="id"
          :items-per-page="5"
          class="elevation-1"
        >
          <template v-slot:item="{ item }">
            <tr>
              <td>
                <!-- List of Students -->
                <v-select
                  :items="students"
                  item-value="name"
                  item-text="name"
                  v-model="item.studentName"
                  dense
                  hide-details
                  readonly
                ></v-select>
              </td>
              <td>
                <v-text-field
                  v-model="item.date"
                  type="date"
                  dense
                  hide-details
                ></v-text-field>
              </td>
              <td>
                <v-text-field
                  v-model="item.hour"
                  type="time"
                  dense
                  hide-details
                ></v-text-field>
              </td>
              <td>
                <v-select
                  v-model="item.punition"
                  :items="punitionOptions"
                  dense
                  hide-details
                  @change="updateConduct(item)"
                ></v-select>
              </td>
              <td>
                <v-textarea
                  v-model="item.motif"
                  dense
                  hide-details
                  rows="1"
                  auto-grow
                ></v-textarea>
              </td>
              <td>
                <!-- Note de conduite, calculée automatiquement -->
                {{ item.conductGrade }}
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-container>
    </v-card-text>
    <v-card-actions>
      <v-btn color="primary" @click="$emit('back')">Retour</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  name: 'ConductManager',
  data() {
    return {
      currentTrimester: 'Trimestre1',
      trimesters: ['Trimestre1', 'Trimestre2', 'Trimestre3'],
      headers: [
        { text: 'Élève', value: 'studentName' },
        { text: 'Date', value: 'date' },
        { text: 'Heure', value: 'hour' },
        { text: 'Punition', value: 'punition' },
        { text: 'Motif', value: 'motif' },
        { text: 'Note de Conduite', value: 'conductGrade' }, // Nouvelle colonne
      ],
      punitionOptions: [2, 4], // Possible values for punishment
      students: [], // Liste des élèves à remplir
      conductRecords: [], // Initial empty array to be filled with data from API
    };
  },
  methods: {
    changeTrimester(trimester) {
      this.currentTrimester = trimester;
      this.fetchConductRecords();
    },
    fetchConductRecords() {
      // Fetch conduct records based on the selected trimester
      // Example API call
      this.conductRecords = [
        // Populate with data from API or mock data
        { studentName: 'John Doe', date: '', hour: '', punition: '', motif: '', conductGrade: '' },
        { studentName: 'Jane Smith', date: '', hour: '', punition: '', motif: '', conductGrade: '' },
      ];
    },
    save() {
      // Implement the logic to save conduct records
      console.log('Save button clicked');
      // Add API call to save data here
      this.conductRecords.forEach(record => {
        record.punition = ''; // Clear punishment field
        record.motif = ''; // Clear motif field
        record.date = ''; // Clear date field
        record.hour = ''; // Clear hour field
        record.conductGrade = ''; // Clear conduct grade
      });
    },
    updateConduct(record) {
      // Calculate the conduct grade based on the punishment
      if (record.punition === 2) {
        record.conductGrade = Math.max(record.conductGrade - 1, 0);
      } else if (record.punition === 4) {
        record.conductGrade = Math.max(record.conductGrade - 2, 0);
      } else {
        // If punishment is neither 2 nor 4, keep the grade unchanged
        record.conductGrade = record.conductGrade;
      }
    },
  },
  created() {
    this.fetchConductRecords();
  },
};
</script>

<style>
.v-tab--active {
  font-weight: bold;
}
</style>
