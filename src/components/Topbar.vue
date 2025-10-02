<template>
  <div style="height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:#fff;box-shadow:0 2px 8px #eee;">
    <span style="font-weight:bold;font-size:18px;">QMT管理后台</span>
    <div>
      <label style="margin-right:8px;">账户类型：</label>
      <select v-model="strategyType" @change="onTypeChange" style="font-size:16px;padding:4px 8px;">
        <option value="conservative">保守账户</option>
        <option value="aggressive">激进账户</option>
        <option value="ultra">超激进账户</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

// 让所有页面都能响应切换，推荐用 localStorage 作为简单的全局同步（也可用 pinia/provide/inject）
const strategyType = ref(localStorage.getItem('strategyType') || 'conservative')

const onTypeChange = () => {
  localStorage.setItem('strategyType', strategyType.value)
  // 可选：刷新页面后所有页面都会应用这个账户类型
  window.location.reload()
}

// 若希望切换后所有页面都自动响应（不刷新），推荐用 pinia 或 provide/inject 方案
onMounted(() => {
  // 保证刷新后select和localStorage同步
  const saved = localStorage.getItem('strategyType')
  if (saved && saved !== strategyType.value) {
    strategyType.value = saved
  }
})
</script>