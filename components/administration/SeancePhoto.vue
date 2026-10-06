<template>
  <!-- Liste des élèves à photographier, numérotée dans l'ordre où il faut
       prendre les photos (consultable sur téléphone pendant la séance, ou
       imprimable). -->
  <v-card class="seance rounded-lg">
    <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
      <v-icon color="primary">mdi-camera-account</v-icon>
      Séance photo — {{ classeNom }}
    </v-card-title>
    <v-card-text>
      <div class="seance-consigne">
        <strong>Photographiez les élèves dans cet ordre</strong>, un élève par photo, de face, sur un fond clair.
        Ensuite, copiez les photos sur l'ordinateur sans les renommer : un clic sur
        « Associer dans l'ordre » les donnera au bon élève.
      </div>
      <div v-if="!eleves.length" class="text-medium-emphasis pa-4 text-center">Tous les élèves ont déjà une photo.</div>
      <ol v-else class="seance-liste">
        <li v-for="e in eleves" :key="e.id">
          <span class="seance-nom">{{ e.nom }} {{ e.prenom }}</span>
          <span class="seance-case" aria-hidden="true"></span>
        </li>
      </ol>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn variant="text" @click="$emit('fermer')">Fermer</v-btn>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-printer" :disabled="!eleves.length" @click="imprimer">Imprimer la liste</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
const props = defineProps({
  eleves: { type: Array, default: () => [] }, // dans l'ordre des photos
  classeNom: { type: String, default: '' },
})
defineEmits(['fermer'])

const echapper = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Fenêtre d'impression dédiée (seulement la liste, une page propre).
function imprimer() {
  const lignes = props.eleves.map((e, i) => `<tr><td>${i + 1}</td><td>${echapper(e.nom)} ${echapper(e.prenom)}</td><td class="c"></td></tr>`).join('')
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Séance photo ${echapper(props.classeNom)}</title>
<style>body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{font-size:18px;margin:0 0 4px}p{font-size:12px;margin:0 0 12px}
table{border-collapse:collapse;width:100%;font-size:13px}td{border:1px solid #999;padding:5px 8px}td:first-child{width:36px;text-align:center}.c{width:60px}</style>
<h1>Séance photo — ${echapper(props.classeNom)}</h1>
<p>Photographier dans cet ordre, un élève par photo. Cocher la case après chaque photo.</p>
<table>${lignes}</table>`)
  w.document.close()
  w.focus()
  w.print()
}
</script>

<style scoped>
.seance-consigne { background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 8px 10px; font-size: 0.84rem; margin-bottom: 10px; line-height: 1.45; }
.seance-liste { margin: 0; padding-left: 28px; max-height: 55vh; overflow-y: auto; }
.seance-liste li { padding: 5px 0; border-bottom: 1px solid #eef1f6; font-size: 0.9rem; }
.seance-liste li { display: list-item; }
.seance-nom { font-weight: 600; }
.seance-case { float: right; width: 16px; height: 16px; border: 1.5px solid #9aa8b8; border-radius: 3px; margin-top: 2px; }
</style>
