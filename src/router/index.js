import { createRouter, createWebHistory } from 'vue-router'
import AccountPosition from '../views/AccountPosition.vue'
import StrategyManager from '../views/StrategyManager.vue'
import PositionManager from '../views/PositionManager.vue' // 新增
import TodolistPage from '../views/TodolistPage.vue'

const routes = [
  { path: '/', redirect: '/account-position' },
  { path: '/account-position', component: AccountPosition },
  { path: '/strategy-manager', component: StrategyManager },
  { path: '/position-manager', component: PositionManager }, // 新增
  { path: '/todolist', component: TodolistPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router