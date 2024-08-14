<template>
  <div> 
     <v-container class="mt-16">

        <v-row>
          <v-col v-for="detail in details" :key="detail.label" cols="12" md="6">
            <v-card @click="selectDetail(detail.label)">
              <v-card-title>{{ detail.label }}</v-card-title>
            </v-card>
          </v-col>
        </v-row>
      </v-container>   
  </div>
</template>

<script>
export default {
  data() {
    return {
      details: [
          { label: 'Gérer Note' },
          { label: 'Gérer Conduite' },
          { label: 'Gérer Présence' },
          { label: 'Cahier de Texte' }
        ]
    };
  },
  methods: {
    selectDetail(label) {
      this.$emit('selectDetail', label);
    }
  }
}
</script>
