<template>
  <StudentManagement @component-selected="ouvrir" @back="aller()" />
</template>

<script setup>
// /administration/dashbord/eleves : menu des modules « Élèves ».
import { inject } from "vue";
import StudentManagement from "@/components/administration/StudentManagement.vue";

const { aller } = inject("adminNav");

// Tuile choisie (nom de composant émis par StudentManagement) → adresse.
const CHEMINS = {
  Inscription: "/eleves/inscription",
  MesEleves: "/eleves/liste",
  PresenceManagement: "/eleves/presences",
  PunishmentManagement: "/eleves/punitions",
  NoteConsultation: "/eleves/notes",
  BulletinManagement: "/eleves/bulletins",
  Reinscription: "/eleves/reinscriptions",
  CarteScolaire: "/eleves/cartes-scolaires",
  Scolarite: "/eleves/scolarite",
  EducMaster: "/eleves/educmaster",
  Orientation: "/eleves/orientation",
};
const ouvrir = (composant) => {
  if (CHEMINS[composant]) aller(CHEMINS[composant]);
};
</script>
