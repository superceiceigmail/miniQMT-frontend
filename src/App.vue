<template>
  <div style="display: flex; min-height: 100vh;">
    <Sidebar />
    <div style="flex:1; background: #f6f8fa;">
      <Topbar />
      <div style="padding: 32px 24px;">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
</script>