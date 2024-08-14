<template>
  <v-app>
    <ToolbarComponent @showComponent="showComponent" />
    <component :is="currentComponent"></component>
  </v-app>
</template>

<script>
import ToolbarComponent from '@/components/parents/ToolbarComponent.vue';
import MessagesComponent from '@/components/parents/MessagesComponent.vue';
import NotificationsComponent from '@/components/parents/NotificationsComponent.vue';
import LogoutDialog from '@/components/parents/LogoutDialog.vue';
import ChildrenList from '@/components/parents/ChildrenList.vue';

export default {
  components: {
    ToolbarComponent,
    MessagesComponent,
    NotificationsComponent,
    LogoutDialog,
    ChildrenList
  },
  data() {
    return {
      currentComponent: ChildrenList
    };
  },
  methods: {
    showComponent(component) {
      this.currentComponent
    }
  }
}
</script>
