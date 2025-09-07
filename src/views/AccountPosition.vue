<template>
  <div style="max-width: 900px; margin: 40px auto; font-family: sans-serif;">
    <h2>账户持仓信息</h2>
    <div v-if="loading">正在加载数据...</div>
    <div v-else-if="error" style="color:red;">错误: {{ error }}</div>

    <div v-else>
      <!-- 资金结构饼图 -->
      <div style="margin: 0 0 24px 0; display: flex; align-items: center; justify-content: center;">
        <div style="width:340px; height:260px;">
          <ECharts :option="pieOption" />
        </div>
        <div style="margin-left: 36px; font-size:15px;">
          <div>账户ID: <b>{{ asset.account_id }}</b></div>
          <div>总资产: <b>{{ num(asset.total_asset) }}</b></div>
          <div>可用现金: <b>{{ num(asset.cash) }}</b></div>
          <div>冻结资金: <b>{{ num(asset.frozen_cash) }}</b></div>
          <div>持仓市值: <b>{{ num(asset.market_value) }}</b></div>
          <div v-if="otherAmount > 0">国金理财: <b>{{ num(otherAmount) }}</b></div>
        </div>
      </div>

      <h3>标的市值与来源策略</h3>
      <ECharts :option="chartOption" style="height: 500px; width: 100%; margin-bottom: 24px;" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { use } from 'echarts/core';
import ECharts from 'vue-echarts';
import { BarChart, PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

use([BarChart, PieChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer]);

const asset = ref({});
const positions = ref([]);
const loading = ref(true);
const error = ref("");
const strategies = ref({});

function num(val) {
  return val !== undefined ? Number(val).toLocaleString() : "--";
}

// ============ 数据整理 ============

// 只保留有持仓的股票
const filteredPositions = computed(() => {
  // 兼容 positions.value 为对象或数组
  const arr = Array.isArray(positions.value) ? positions.value : (positions.value.positions || []);
  return arr.filter(pos => Number(pos.volume) > 0);
});

// 标的列表（只用当前有持仓的，且有市值的）+ 股票代码
const allStockNamesWithCodes = computed(() => {
  // [{name, code}]
  return filteredPositions.value.map(p => ({
    name: p.stock_name,
    code: p.stock_code
  }));
});

// 标的y轴显示，带股票代码（不换行）
const yAxisLabelArr = computed(() => {
  return allStockNamesWithCodes.value.map(item => `${item.name}（${item.code}）`);
});

// 市值映射
const stockMarketValueMap = computed(() => {
  const map = {};
  filteredPositions.value.forEach(pos => {
    map[pos.stock_name] = Number(pos.market_value) || 0;
  });
  return map;
});

// 获取每个标的的来源策略（和金额）组成的对象
const stockSourceStrategyMap = computed(() => {
  const result = {};
  allStockNamesWithCodes.value.forEach(({name: stockName}) => {
    result[stockName] = [];
    Object.entries(strategies.value).forEach(([strategyName, strategyObj]) => {
      (strategyObj.targets || []).forEach(t => {
        if (t.name === stockName && t.hold && t.default_amount > 0) {
          result[stockName].push({ name: strategyName, amount: t.default_amount });
        }
      });
    });
  });
  return result;
});

// 收集所有“来源策略”名称（仅当前有持仓标的的）
const allSourceStrategyNames = computed(() => {
  const nameSet = new Set();
  Object.values(stockSourceStrategyMap.value).forEach(arr => {
    arr.forEach(s => {
      nameSet.add(s.name);
    });
  });
  return Array.from(nameSet);
});

// 颜色函数（可自定义调色板）
function getReferenceColor(idx) {
  const palette = ['#ff9800', '#00bcd4', '#8bc34a', '#e91e63', '#607d8b', '#9c27b0', '#009688', '#2196f3', '#cddc39'];
  return palette[idx % palette.length];
}

// ----------- 新增: 国金理财 = 总资产 - 现有三项 -------------
const otherAmount = computed(() => {
  const total = Number(asset.value?.total_asset ?? asset.total_asset) || 0;
  const cash = Number(asset.value?.cash ?? asset.cash) || 0;
  const frozen = Number(asset.value?.frozen_cash ?? asset.frozen_cash) || 0;
  const market = Number(asset.value?.market_value ?? asset.market_value) || 0;
  const other = total - cash - frozen - market;
  // 只要大于0就返回，否则为0
  return other > 0 ? other : 0;
});

// ---------------------- 饼图 Option ----------------------
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
      top: 'bottom',
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

// ---------------------- 分组柱状图 Option ----------------------
const chartSeries = computed(() => {
  // 当前市值主柱
  const actualBar = {
    name: '当前市值',
    type: 'bar',
    data: allStockNamesWithCodes.value.map(item => stockMarketValueMap.value[item.name] || 0),
    itemStyle: { color: '#4e77f4' },
    barGap: '30%',
    barWidth: 12, // 明显变粗
    label: { show: true, position: 'right', formatter: '{c}' }
  };

  const refBars = allSourceStrategyNames.value.map((strategyName, idx) => {
    const stockAmounts = allStockNamesWithCodes.value.map(item => {
      const arr = stockSourceStrategyMap.value[item.name] || [];
      const found = arr.find(x => x.name === strategyName);
      return found ? found.amount : null;
    });
    if (stockAmounts.every(amount => amount == null)) return null;
    return {
      name: strategyName,
      type: 'bar',
      data: stockAmounts,
      itemStyle: { color: getReferenceColor(idx) },
      barGap: '30%',
      barWidth: 8, // 明显变粗
      label: { show: true, position: 'right', formatter: '{c}' }
    };
  }).filter(Boolean);

  return [...refBars, actualBar];
});

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: params => {
      // params: [{seriesName, data, ...}, ...]
      let res = '';
      if (params && params.length) {
        // y轴label
        res += `<div style="font-weight:bold;">${params[0].axisValue.replace('\n', ' ')}</div>`;
        params.forEach(item => {
          if (item.value !== null && item.value !== undefined && item.value !== 0) {
            res += `<div style="margin:2px 0;">
              <span style="display:inline-block;margin-right:6px;width:10px;height:10px;background:${item.color}"></span>
              ${item.seriesName}: <b>${num(item.value)}</b>
              </div>`;
          }
        });
      }
      return res;
    }
  },
  legend: {},
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: yAxisLabelArr.value,
    axisLabel: { fontSize: 14 },
    axisTick: { alignWithLabel: true }
  },
  series: chartSeries.value,
  barCategoryGap: '45%' // 柱子间隔更宽
}));

onMounted(async () => {
  try {
    // 读取策略缓存
    const saved = localStorage.getItem('strategies');
    if (saved) strategies.value = JSON.parse(saved);

    // 原有资产和持仓数据读取
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