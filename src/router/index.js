import { createRouter, createWebHistory } from 'vue-router'
import AccountPosition from '../views/AccountPosition.vue'
import StrategyManager from '../views/StrategyManager.vue'

const routes = [
  { path: '/', redirect: '/account-position' },
  { path: '/account-position', component: AccountPosition },
  { path: '/strategy-manager', component: StrategyManager },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router