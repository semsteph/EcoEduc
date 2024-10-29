<template>
  <div class="background-container">
    <div class="card">
      <h2>Le suivi scolaire : un atout pour la réussite de votre enfant</h2>
      <p>
        Chers parents, le suivi scolaire permet de mieux comprendre les progrès et les difficultés de votre enfant. 
        C’est un moyen de rester informé de son évolution et de l’accompagner dans son parcours.
      </p>
    </div>
    <div class="card">
      <h2>Un lien renforcé avec les enseignants</h2>
      <p>
        Le suivi scolaire favorise la communication entre les parents et les enseignants, pour un suivi personnalisé et adapté.
      </p>
    </div>
    <div class="card">
      <h2>Encourager la motivation et l'engagement</h2>
      <p>
        Être attentif au parcours scolaire de votre enfant, c'est lui montrer que ses efforts comptent et le motiver à persévérer.
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Accueil'
};
</script>

<style scoped>
.background-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.card {
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 10px;
  max-width: 600px;
  text-align: center;
}

.card h2 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.card p {
  color: #34495e;
}
</style>
