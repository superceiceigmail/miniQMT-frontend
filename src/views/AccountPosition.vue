<template>
  <div style="max-width: 800px; margin: 40px auto; font-family: sans-serif;">
    <h2>账户持仓信息</h2>
    <div v-if="loading">正在加载数据...</div>
    <div v-else-if="error" style="color:red;">错误: {{ error }}</div>

    <div v-else>
      <div style="margin-bottom:18px; background:#f5f6fa; padding:18px; border-radius:8px; font-size:16px;">
        <div>账户ID: <b>{{ asset.account_id }}</b></div>
        <div>总资产: <b>{{ num(asset.total_asset) }}</b></div>
        <div>可用现金: <b>{{ num(asset.cash) }}</b></div>
        <div>冻结资金: <b>{{ num(asset.frozen_cash) }}</b></div>
        <div>持仓市值: <b>{{ num(asset.market_value) }}</b></div>
        <div>
          现金占比: <b>{{ asset.percent_cash }}</b>　
          持仓占比: <b>{{ asset.percent_market }}</b>
        </div>
      </div>

      <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:15px;">
        <thead style="background:#e0e4ed;">
          <tr>
            <th>股票代码</th>
            <th>股票名称</th>
            <th>市值</th>
            <th>关联策略</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredPositions.length === 0">
            <td colspan="4" style="text-align:center;">暂无数据</td>
          </tr>
          <tr v-for="(pos, i) in filteredPositions" :key="i">
            <td>{{ pos.stock_code || '--' }}</td>
            <td>{{ pos.stock_name || '--' }}</td>
            <td>{{ pos.market_value !== undefined ? pos.market_value : '--' }}</td>
            <td>
              <template v-if="Array.isArray(pos.related_strategies)">
                {{ pos.related_strategies.join(', ') || '--' }}
              </template>
              <template v-else>
                {{ pos.related_strategies || '--' }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";

const asset = ref({});
const positions = ref([]);
const loading = ref(true);
const error = ref("");

function num(val) {
  return val !== undefined ? Number(val).toLocaleString() : "--";
}

// 只保留有持仓的股票
const filteredPositions = computed(() => {
  // 兼容 positions.value 为对象或数组
  const arr = Array.isArray(positions.value) ? positions.value : (positions.value.positions || []);
  return arr.filter(pos => Number(pos.volume) > 0);
});

onMounted(async () => {
  try {
    const assetResp = await fetch("/template_account_info/template_account_asset_info.json");
    if (!assetResp.ok) throw new Error("账户资产文件读取失败");
    asset.value = await assetResp.json();

    const posResp = await fetch("/template_account_info/template_account_position_info.json");
    if (!posResp.ok) throw new Error("持仓文件读取失败");
    positions.value = await posResp.json();

    loading.value = false;
  } catch (e) {
    error.value = e.message || "数据加载失败";
    loading.value = false;
  }
});
</script>