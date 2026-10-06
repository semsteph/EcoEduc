<template>
  <!-- Photo d'identité facultative : prise avec l'appareil ou choisie,
       recadrée automatiquement au format identité (3:4) et allégée. -->
  <div class="photo-identite">
    <div class="photo-cadre" :class="{ 'is-vide': !apercu }">
      <img v-if="apercu" :src="apercu" alt="Photo d'identité" />
      <v-icon v-else size="34" color="grey">mdi-account-box-outline</v-icon>
    </div>
    <div class="photo-actions">
      <div class="photo-titre">Photo d'identité <span class="photo-facultatif">(facultative)</span></div>
      <div class="photo-boutons">
        <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-camera" :loading="traitement" @click="$refs.camera.click()">
          Prendre une photo
        </v-btn>
        <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-image" :disabled="traitement" @click="$refs.fichier.click()">
          Choisir une image
        </v-btn>
        <v-btn v-if="apercu" size="small" variant="text" color="error" @click="retirer">Retirer</v-btn>
      </div>
      <div v-if="erreur" class="photo-erreur">{{ erreur }}</div>
      <input ref="camera" type="file" accept="image/*" capture="environment" hidden @change="choisir" />
      <input ref="fichier" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*" hidden @change="choisir" />
    </div>
  </div>
</template>

<script>
import { recadrerPhoto } from '~/composables/usePhotoIdentite';

export default {
  name: 'PhotoIdentite',
  props: {
    // Photo déjà enregistrée (adresse), affichée tant qu'on n'en choisit pas d'autre.
    photoUrl: { type: String, default: '' },
  },
  emits: ['change'],
  data() {
    return { apercu: this.photoUrl || '', traitement: false, erreur: '', objectUrl: null };
  },
  watch: {
    photoUrl(v) {
      if (!this.objectUrl) this.apercu = v || '';
    },
  },
  beforeUnmount() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  },
  methods: {
    async choisir(event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!file) return;
      this.erreur = '';
      this.traitement = true;
      try {
        const blob = await this.recadrer(file);
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = URL.createObjectURL(blob);
        this.apercu = this.objectUrl;
        this.$emit('change', blob);
      } catch (e) {
        this.erreur = "Cette image n'a pas pu être lue. Essayez une photo JPG ou PNG.";
      } finally {
        this.traitement = false;
      }
    },
    recadrer(file) {
      return recadrerPhoto(file);
    },
    retirer() {
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
      this.apercu = '';
      this.$emit('change', null);
    },
  },
};
</script>

<style scoped>
.photo-identite { display: flex; gap: 12px; align-items: center; padding: 8px; border: 1px dashed #c5d0de; border-radius: 10px; background: #fafcff; }
.photo-cadre { flex: none; width: 66px; height: 88px; border-radius: 6px; overflow: hidden; background: #fff; border: 1px solid #d5dde8; display: flex; align-items: center; justify-content: center; }
.photo-cadre img { width: 100%; height: 100%; object-fit: cover; }
.photo-actions { min-width: 0; }
.photo-titre { font-weight: 700; font-size: 0.85rem; }
.photo-facultatif { font-weight: 400; color: #6b7a8c; }
.photo-boutons { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.photo-erreur { color: #c62828; font-size: 0.75rem; margin-top: 4px; }
</style>
