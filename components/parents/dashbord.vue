<template>
  <v-app>
    <ToolbarComponent @showComponent="showComponent" />
    <component :is="currentComponent" @selectChild="selectChild"></component>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import ToolbarComponent from '~/components/ToolbarComponent.vue'
import MessagesComponent from '~/components/MessagesComponent.vue'
import NotificationsComponent from '~/components/NotificationsComponent.vue'
import LogoutDialog from '~/components/LogoutDialog.vue'
import ChildrenList from '~/components/ChildrenList.vue'
import ChildDetail from '~/components/ChildDetail.vue'

const currentComponent = ref('ChildrenList')
const selectedChild = ref(null)

function showComponent(component) {
  currentComponent.value = component
}

function selectChild(id) {
  selectedChild.value = id
  currentComponent.value = 'ChildDetail'
}
</script>
t>
