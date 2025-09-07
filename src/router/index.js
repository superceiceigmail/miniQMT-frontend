import { createRouter, createWebHistory } from 'vue-router'
import AccountPosition from '../views/AccountPosition.vue'
import StrategyManager from '../views/StrategyManager.vue'
import PositionManager from '../views/PositionManager.vue' // 新增

const routes = [
  { path: '/', redirect: '/account-position' },
  { path: '/account-position', component: AccountPosition },
  { path: '/strategy-manager', component: StrategyManager },
  { path: '/position-manager', component: PositionManager }, // 新增
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router