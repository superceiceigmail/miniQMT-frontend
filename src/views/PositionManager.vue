<template>
  <div style="max-width: 1200px; margin: 40px auto; font-family: sans-serif;">
    <h2 style="font-size:28px; margin-bottom:16px;">账户持仓信息</h2>
    <div v-if="loading">正在加载数据...</div>
    <div v-else-if="error" style="color:red;">错误: {{ error }}</div>
    <div v-else>
      <!-- 资产结构饼图 -->
      <div style="margin: 0 0 48px 0; display: flex; align-items: center; justify-content: center;">
        <div style="width:340px; height:260px;">
          <ECharts v-if="!loading" :option="pieOption" autoresize />
        </div>
        <div style="margin-left: 36px; font-size:16px;">
          <div>账户ID: <b>{{ asset.account_id }}</b></div>
          <div>总资产: <b>{{ num(asset.total_asset) }}</b></div>
          <div>可用现金: <b>{{ num(asset.cash) }}</b></div>
          <div>冻结资金: <b>{{ num(asset.frozen_cash) }}</b></div>
          <div>持仓市值: <b>{{ num(asset.market_value) }}</b></div>
          <div v-if="otherAmount > 0">国金理财: <b>{{ num(otherAmount) }}</b></div>
        </div>
      </div>

      <h2 style="margin: 48px 0 16px 0; font-size:28px;">策略规划分布</h2>
      <div style="width: 600px; height:340px; margin: 0 auto;">
        <ECharts v-if="!loading" :option="planPieOption" autoresize />
        <!-- 一键调整按钮 -->
        <div style="text-align:center; margin-top: 18px;">
          <button @click="showAdjustModal = true" style="padding:9px 32px; font-size:18px; border-radius:6px; background:#4e77f4; color:#fff; border:none; cursor:pointer;">
            统一调整策略仓位
          </button>
        </div>
      </div>
    </div>
    <!-- 调整策略弹窗 -->
    <div v-if="showAdjustModal" class="modal-mask">
      <div class="modal-box">
        <div style="font-weight:bold; font-size:20px; margin-bottom:16px;">统一调整策略目标仓位</div>
        <div v-for="item in strategyAdjustList" :key="item.name" style="margin-bottom:16px;">
          <label :for="'input-'+item.name" style="font-size:16px;">{{ item.name }}：</label>
          <input
            :id="'input-'+item.name"
            type="number"
            v-model.number="item.amount"
            style="width:140px; padding:4px 12px; font-size:16px;"
          />
          <span style="color:#888; font-size:14px; margin-left:12px;">原金额：{{ num(item.oldAmount) }}</span>
        </div>
        <div style="margin-top:24px; text-align:right;">
          <button @click="onConfirmAdjust" style="padding:7px 32px; background:#4e77f4; color:#fff; border:none; border-radius:5px; margin-right:20px; font-size:16px;">确定</button>
          <button @click="showAdjustModal = false" style="padding:7px 32px; border-radius:5px; border:1px solid #bbb; font-size:16px;">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { use } from 'echarts/core';
import ECharts from 'vue-echarts';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

const asset = ref({});
const positions = ref([]);
const loading = ref(true);
const error = ref("");
const strategies = ref({});

// 只保留有持仓的股票
const filteredPositions = computed(() => {
  const arr = Array.isArray(positions.value) ? positions.value : (positions.value.positions || []);
  return arr.filter(pos => Number(pos.volume) > 0);
});

// 得到当前有持仓标的的策略Map及其相关targets
const strategyHoldingMap = computed(() => {
  // {策略名: Set<target对象>}
  const stratMap = (strategies.value.map ?? strategies.value) || {};
  const result = {};
  filteredPositions.value.forEach(pos => {
    for (const [strategyName, strategyObj] of Object.entries(stratMap)) {
      const t = (strategyObj.targets || []).find(t => t.name === pos.stock_name && t.hold);
      if (t) {
        if (!result[strategyName]) result[strategyName] = new Set();
        result[strategyName].add(t);
      }
    }
  });
  // 转回数组方便遍历
  for (const k in result) result[k] = Array.from(result[k]);
  return result;
});

// ----------- 饼图一数据: 资产结构 -----------
const otherAmount = computed(() => {
  const total = Number(asset.value?.total_asset ?? asset.total_asset) || 0;
  const cash = Number(asset.value?.cash ?? asset.cash) || 0;
  const frozen = Number(asset.value?.frozen_cash ?? asset.frozen_cash) || 0;
  const market = Number(asset.value?.market_value ?? asset.market_value) || 0;
  const other = total - cash - frozen - market;
  return other > 0 ? other : 0;
});

const pieOption = computed(() => {
  const total = Number(asset.value?.total_asset ?? asset.total_asset) || 0;
  const cash = Number(asset.value?.cash ?? asset.cash) || 0;
  const frozen = Number(asset.value?.frozen_cash ?? asset.frozen_cash) || 0;
  const market = Number(asset.value?.market_value ?? asset.market_value) || 0;
  const other = total - cash - frozen - market;
  const pieData = [
    { value: cash, name: '可用现金' },
    { value: frozen, name: '冻结资金' },
    { value: market, name: '持仓市值' }
  ];
  if (other > 0) {
    pieData.push({ value: other, name: '国金理财' });
  }
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      itemWidth: 16,
      itemHeight: 10,
      textStyle: { fontSize: 13 }
    },
    color: ['#4e77f4', '#ff9800', '#8bc34a', '#e91e63'],
    series: [
      {
        name: '资产分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%'
        },
        labelLine: { show: true },
        data: pieData
      }
    ]
  };
});

// ========== 只统计有持仓标的的 default_amount ==========
const plannedHoldingAmount = computed(() => {
  let sum = 0;
  for (const [strategyName, arr] of Object.entries(strategyHoldingMap.value)) {
    arr.forEach(target => {
      sum += Number(target.default_amount) || 0;
    });
  }
  return sum;
});

// 规划现金 = 总资产 - 所有“有持仓标的”的 default_amount 之和 - 国金理财
const planningCash = computed(() => {
  const totalAsset = Number(asset.value?.total_asset ?? asset.total_asset) || 0;
  const guojin = otherAmount.value || 0;
  const planned = plannedHoldingAmount.value || 0;
  if (!totalAsset) return 0;
  return Math.max(totalAsset - planned - guojin, 0);
});

// ----------- 饼图二数据: 策略规划分布 -----------
const planPieData = computed(() => {
  if (!asset.value || !asset.value.total_asset) return [];
  const data = [];
  for (const [strategyName, arr] of Object.entries(strategyHoldingMap.value)) {
    let total = 0;
    arr.forEach(target => {
      total += Number(target.default_amount) || 0;
    });
    if (total > 0) data.push({ name: strategyName, value: total });
  }
  const guojin = otherAmount.value || 0;
  if (guojin > 0) data.push({ name: '国金理财', value: guojin });
  const cash = planningCash.value || 0;
  if (cash > 0) data.push({ name: '规划现金', value: cash });
  return data;
});

const planPieOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'horizontal',
    bottom: 0,
    left: 'center',
    itemWidth: 16,
    itemHeight: 10,
    textStyle: { fontSize: 13 }
  },
  series: [
    {
      name: '策略规划分布',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      minShowLabelAngle: 0,
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}\n{d}%'
      },
      labelLine: { show: true },
      data: planPieData.value
    }
  ]
}));

// ========== 仓位一键调整弹窗相关 ==========
const showAdjustModal = ref(false);
const strategyAdjustList = ref([]);

// 弹窗打开时，统计每个“有持仓”策略当前持仓标的总金额
watch(showAdjustModal, (v) => {
  if (v) {
    const list = [];
    for (const [strategyName, arr] of Object.entries(strategyHoldingMap.value)) {
      let oldAmount = 0;
      arr.forEach(target => { oldAmount += Number(target.default_amount || 0); });
      list.push({ name: strategyName, amount: oldAmount, oldAmount });
    }
    strategyAdjustList.value = list;
  }
});

// 确认调整：等比例调整该策略下所有标的（无论是否持有）的 default_amount
function onConfirmAdjust() {
  const stratMap = (strategies.value.map ?? strategies.value) || {};
  let changed = false;
  for (const item of strategyAdjustList.value) {
    const strategyObj = stratMap[item.name];
    if (!strategyObj) continue;
    // 1. 统计该策略下“当前有持仓标的”的 default_amount 总和
    let oldTotal = 0;
    filteredPositions.value.forEach(pos => {
      const t = (strategyObj.targets || []).find(t => t.name === pos.stock_name && t.hold);
      if (t) oldTotal += Number(t.default_amount || 0);
    });
    // 没变化跳过
    if (Math.abs(Number(item.amount) - oldTotal) < 1e-4) continue;
    changed = true;
    let ratio = oldTotal === 0 ? 1 : (Number(item.amount) / oldTotal);
    // 2. 该策略下所有标的都乘以比例
    if (Number(item.amount) === 0) {
      (strategyObj.targets || []).forEach(t => t.default_amount = 0);
    } else {
      (strategyObj.targets || []).forEach(t => {
        t.default_amount = Math.round(Number(t.default_amount || 0) * ratio * 100) / 100;
      });
    }
  }
  if (changed) {
    localStorage.setItem('strategies', JSON.stringify(strategies.value));
  }
  showAdjustModal.value = false;
}

function num(val) {
  return val !== undefined ? Number(val).toLocaleString() : "--";
}

onMounted(async () => {
  try {
    const saved = localStorage.getItem('strategies');
    if (saved) strategies.value = JSON.parse(saved);
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

<style scoped>
.modal-mask {
  position: fixed;
  z-index: 1000;
  left:0; top:0; right:0; bottom:0;
  background: rgba(0,0,0,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-box {
  background: #fff;
  border-radius: 10px;
  padding: 32px 40px 24px 40px;
  min-width: 340px;
  box-shadow: 0 4px 24px rgba(0,0,0,.18);
}
</style>