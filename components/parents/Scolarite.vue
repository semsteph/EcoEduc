<template>
  <v-container>
    <h1>Scolarité de l'élève</h1>

    <!-- Tableau des données -->
    <v-simple-table class="tableau-scolarite">
      <thead>
        <tr>
          <th>Scolarité</th>
          <th>Tranche 1</th>
          <th>Tranche 2</th>
          <th>Tranche 3</th>
          <th>Tranche 4</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ scolarite }}</td>
          <td>{{ tranche1 }}</td>
          <td>{{ tranche2 }}</td>
          <td>{{ tranche3 }}</td>
          <td>{{ tranche4 }}</td>
        </tr>
        <!-- Lignes pour afficher le statut de chaque tranche -->
        <tr>
          <td></td>
          <td>{{ status1 }}</td>
          <td>{{ status2 }}</td>
          <td>{{ status3 }}</td>
          <td>{{ status4 }}</td>
        </tr>
      </tbody>
    </v-simple-table>

    <!-- Montant restant centré sous le tableau -->
    <div class="reste">
      <strong>Reste à payer :</strong> {{ totalReste }}
    </div>

    <!-- Bouton de retour -->
    <v-btn color="primary" @click="$emit('back')" class="back-button">Retour</v-btn>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      // Valeurs fixes pour le tableau
      scolarite: 1000,  // Scolarité totale fixe
      tranche1: 250,
      tranche2: 250,
      tranche3: 250,
      tranche4: 250,
      status1: 'Payer',  // Statut pour chaque tranche
      status2: 'Payer',
      status3: 'Payer',
      status4: 'Non payer'
    };
  },
  computed: {
    totalReste() {
      // Calculer le montant restant comme la somme des tranches non payées
      let total = 0;
      if (this.status1 === 'Non payer') total += this.tranche1;
      if (this.status2 === 'Non payer') total += this.tranche2;
      if (this.status3 === 'Non payer') total += this.tranche3;
      if (this.status4 === 'Non payer') total += this.tranche4;
      return total;
    }
  }
}
</script>

<style scoped>
.tableau-scolarite th, .tableau-scolarite td {
  border: 1px solid #ddd; /* Bordures entre les cellules */
  padding: 8px; /* Espacement interne des cellules */
  text-align: center; /* Alignement du texte au centre */
}
.tableau-scolarite th {
  background-color: #f4f4f4; /* Couleur de fond pour les en-têtes */
}
.tableau-scolarite td {
  border-top: 1px solid #ddd; /* Bordure au-dessus des cellules */
}
.tableau-scolarite tr:last-child td {
  font-weight: bold; /* Texte en gras pour la ligne de statut */
}
.reste {
  margin-top: 20px; /* Espacement au-dessus du montant restant */
  padding: 10px; /* Espacement interne */
  border-top: 2px solid #ddd; /* Bordure au-dessus du montant restant */
  text-align: center; /* Centrer le texte */
  font-weight: bold; /* Texte en gras */
}
.back-button {
  display: block;
  margin: 20px auto 0; /* Centrer le bouton et le placer en bas */
}
</style>
