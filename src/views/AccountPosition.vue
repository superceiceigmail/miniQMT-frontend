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

      <h3>标的市值与策略分配总和</h3>
      <ECharts
        :option="chartOption"
        :style="{height: chartHeight, width: '100%', marginBottom: '24px'}"
        @click="onBarClick"
      />

      <!-- 下钻饼图弹窗 -->
      <div v-if="showPie" style="position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:99;display:flex;align-items:center;justify-content:center;">
        <div style="background:#fff;padding:20px 32px 16px 32px;border-radius:8px;box-shadow:0 4px 32px rgba(0,0,0,0.2);position:relative;width:370px;">
          <span @click="showPie=false" style="position:absolute;right:16px;top:10px;font-size:20px;cursor:pointer;">×</span>
          <div style="text-align:center;font-weight:bold;font-size:17px;margin-bottom:10px;">{{ selectedStockLabel }}<br/>策略分布</div>
          <ECharts :option="pieDetailOption" style="width:340px;height:260px;" />
        </div>
      </div>
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
    Object.entries(strategies.value.map ?? strategies.value).forEach(([strategyName, strategyObj]) => {
      (strategyObj.targets || []).forEach(t => {
        if (t.name === stockName && t.hold && t.default_amount > 0) {
          result[stockName].push({ name: strategyName, amount: t.default_amount });
        }
      });
    });
  });
  return result;
});

// 计算每个标的的策略分配总和
const strategySumMap = computed(() => {
  const map = {};
  allStockNamesWithCodes.value.forEach(({ name: stockName }) => {
    let sum = 0;
    (stockSourceStrategyMap.value[stockName] || []).forEach(s => {
      sum += s.amount;
    });
    map[stockName] = sum;
  });
  return map;
});

// 计算需要展示的标的（市值>0或策略总和>0）
const displayRows = computed(() => {
  return allStockNamesWithCodes.value
    .map(item => {
      const marketValue = stockMarketValueMap.value[item.name] || 0;
      const strategySum = strategySumMap.value[item.name] || 0;
      return {
        label: `${item.name}（${item.code}）`,
        stockName: item.name,
        marketValue,
        strategySum
      };
    })
    .filter(row => row.marketValue > 0 || row.strategySum > 0);
});

// y轴
const yAxisLabelArr = computed(() => displayRows.value.map(row => row.label));

// 颜色函数
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

// 动态拉长图表高度：每个标的给50px，最小500px
const chartHeight = computed(() => {
  return Math.max(500, yAxisLabelArr.value.length * 50) + 'px';
});

const chartSeries = computed(() => [
  {
    name: '策略分配总和',
    type: 'bar',
    data: displayRows.value.map(row => row.strategySum > 0 ? row.strategySum : null),
    itemStyle: { color: getReferenceColor(0) },
    barGap: '30%',
    barWidth: 10,
    label: { show: true, position: 'right', formatter: '{c}' }
  },
  {
    name: '当前市值',
    type: 'bar',
    data: displayRows.value.map(row => row.marketValue > 0 ? row.marketValue : null),
    itemStyle: { color: '#4e77f4' },
    barGap: '30%',
    barWidth: 10,
    label: { show: true, position: 'right', formatter: '{c}' }
  }
]);

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: params => {
      let res = '';
      if (params && params.length) {
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
  barCategoryGap: '45%'
}));

// ---------------------- 下钻饼图弹窗 ----------------------
const showPie = ref(false);
const pieData = ref([]);
const selectedStock = ref('');
const selectedStockLabel = ref('');

function onBarClick(params) {
  // params.dataIndex 是当前y轴下标
  const row = displayRows.value[params.dataIndex];
  if (!row) return;
  selectedStock.value = row.stockName;
  selectedStockLabel.value = row.label;
  // 策略分配饼图数据
  const arr = (stockSourceStrategyMap.value[row.stockName] || []).map(s => ({
    value: s.amount,
    name: s.name
  }));
  // 没有策略分配则不弹窗
  if (!arr.length) return;
  pieData.value = arr;
  showPie.value = true;
}

const pieDetailOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { top: 'bottom', left: 'center', itemWidth: 16, itemHeight: 10, textStyle: { fontSize: 13 } },
  color: ['#ff9800', '#00bcd4', '#8bc34a', '#e91e63', '#607d8b', '#9c27b0', '#009688', '#2196f3', '#cddc39'],
  series: [
    {
      name: '策略分布',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: true, position: 'outside', formatter: '{b}\n{d}%' },
      labelLine: { show: true },
      data: pieData.value
    }
  ]
}));

onMounted(async () => {
  try {
    // 读取策略缓存
    const saved = localStorage.getItem('strategies');
    if (saved) {
      strategies.value = JSON.parse(saved);
    }

    // 资产和持仓数据
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