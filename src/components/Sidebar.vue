<template>
  <nav style="width: 210px; background: #232946; color: #fff; padding: 40px 0; min-height: 100vh;">
    <div style="font-size: 22px; font-weight: bold; padding: 0 24px 36px;">QMT管理后台</div>
    <ul style="list-style: none; padding: 0;">
      <li style="margin-bottom: 18px;">
        <router-link
          to="/account-position"
          style="color: inherit; text-decoration: none; padding: 12px 24px; display: block; border-radius: 4px;"
          active-class="active-link"
        >
          账户持仓
        </router-link>
      </li>
      <li>
        <router-link
          to="/strategy-manager"
          style="color: inherit; text-decoration: none; padding: 12px 24px; display: block; border-radius: 4px;"
          active-class="active-link"
        >
          策略管理
        </router-link>
      </li>
      <li>
        <router-link
          to="/position-manager"
          style="color: inherit; text-decoration: none; padding: 12px 24px; display: block; border-radius: 4px;"
          active-class="active-link"
        >
          仓位管理
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.active-link {
  background: #eebbc3;
  color: #232946 !important;
}
</style>