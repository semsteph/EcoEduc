<template>
  <v-container fluid class="pa-4 bg-grey-lighten-4">

    <v-row align="center" class="mb-6 px-2">
      <v-col cols="auto">
        <v-btn
          icon
          variant="elevated"
          color="white"
          elevation="2"
          @click="$emit('back')"
        >
          <v-icon color="success">mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>

      <v-col>
        <h1 class="text-h5 font-weight-bold text-success d-flex align-center">
          <v-icon start size="32">
            mdi-cash-multiple
          </v-icon>

          Scolarité - {{ className }}
        </h1>

        <div class="text-caption text-grey-darken-1">
          {{ etablissementNom }} • {{ anneeScolaire }}
        </div>
      </v-col>

      <v-col cols="12" sm="auto">
        <v-btn
          color="success"
          prepend-icon="mdi-file-pdf-box"
          rounded="pill"
          @click="downloadPDF"
        >
          Exporter PDF
        </v-btn>
      </v-col>
    </v-row>

    <v-card
      flat
      class="rounded-xl"
    >

      <v-toolbar
        color="white"
        flat
      >
        <v-toolbar-title>
          Situation des scolarités
        </v-toolbar-title>

        <v-spacer />

        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Rechercher un élève"
          density="compact"
          hide-details
          variant="solo-filled"
          rounded="pill"
        />
      </v-toolbar>

      <v-data-table
        :headers="headers"
        :items="filteredEleves"
        item-value="id"
      >

        <template #item.montantTotal="{ item }">
          {{ formatMoney(item.montantTotal) }}
        </template>

        <template #item.montantPaye="{ item }">
          <span class="text-success font-weight-bold">
            {{ formatMoney(item.montantPaye) }}
          </span>
        </template>

        <template #item.reste="{ item }">
          <span
            :class="
              item.reste > 0
                ? 'text-error font-weight-bold'
                : 'text-success font-weight-bold'
            "
          >
            {{ formatMoney(item.reste) }}
          </span>
        </template>

        <template #item.actions="{ item }">

          <v-btn
            size="small"
            color="success"
            class="mr-2"
            prepend-icon="mdi-cash-plus"
            @click="effectuerPaiement(item)"
          >
            Paiement
          </v-btn>

          <v-btn
            size="small"
            color="primary"
            prepend-icon="mdi-history"
            @click="voirHistorique(item)"
          >
            Historique
          </v-btn>

        </template>

      </v-data-table>

    </v-card>

  </v-container>
</template>