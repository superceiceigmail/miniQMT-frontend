<template>
  <div style="display: flex; min-height: 100vh;">
    <Sidebar />
    <div style="flex:1; padding: 32px 24px; background: #f6f8fa;">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import Sidebar from './components/Sidebar.vue'
</script>