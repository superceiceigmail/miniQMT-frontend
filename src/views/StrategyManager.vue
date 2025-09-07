<template>
  <div class="strategy-container">
    <div class="strategy-column">
      <h2>策略管理</h2>
    <!-- 策略操作 -->
    <div style="margin-bottom: 20px;">
      <label for="strategy-select">选择策略：</label>
      <select id="strategy-select" v-model="selectedStrategy">
        <option value="">请选择策略</option>
        <option v-for="(strategy, name) in strategies" :key="name" :value="name">
          {{ name }}
        </option>
      </select>
      <button @click="showAddStrategy = true" style="margin-left:12px;">新增策略</button>
      <button @click="showEditStrategy = true" :disabled="!selectedStrategy" style="margin-left:6px;">编辑策略</button>
      <button @click="deleteStrategy" :disabled="!selectedStrategy" style="margin-left:6px;color:#c00;">删除策略</button>
      <button @click="openChangeDefaultAmount" :disabled="!selectedStrategy" style="margin-left:6px;">一键变更策略默认金额</button>
      <button @click="exportStrategies" style="margin-left:12px;">导出策略</button>
      <input type="file" ref="importFile" style="display:none;" @change="importFromFile" accept=".json"/>
      <button @click="triggerImport" style="margin-left:8px;">导入策略</button>
    </div>


  </div>

    <!-- 策略类型和仓位特性显示 -->
    <div v-if="selectedStrategy && strategies[selectedStrategy]" style="margin-bottom:12px;">
      <div>
        <span style="color:#888;">类型：</span>
        <span>{{ strategies[selectedStrategy]?.type || '未设置' }}</span>
      </div>
      <div>
        <span style="color:#888;">仓位特性：</span>
        <span>{{ positionCharacteristicText(strategies[selectedStrategy]?.position_characteristic) }}</span>
      </div>
    </div>

    <!-- 新增策略模态框 -->
    <div v-if="showAddStrategy" class="modal">
      <div class="modal-content">
        <h4>新增策略</h4>
        <input v-model="newStrategyName" placeholder="策略名称" style="width:180px;" />
        <input v-model="newStrategyType" placeholder="策略类型" style="width:120px;margin-left:10px;" />
        <div style="margin-top:12px;">
          <label>仓位特性：</label>
          <select v-model="newStrategyPositionCharacteristic" style="margin-left:6px;">
            <option value="fixed">固定仓位</option>
            <option value="shrink">自动收缩</option>
            <option value="stretch">自动拉伸</option>
          </select>
        </div>
        <div style="margin-top:12px;">
          <button @click="addStrategy">确定</button>
          <button @click="showAddStrategy = false" style="margin-left:10px;">取消</button>
        </div>
        <div v-if="strategyNameError" style="color:#c00;">{{ strategyNameError }}</div>
      </div>
    </div>

    <!-- 编辑策略模态框 -->
    <div v-if="showEditStrategy" class="modal">
      <div class="modal-content">
        <h4>编辑策略</h4>
        <div style="margin-bottom:12px;">
          <label>策略名称：</label>
          <input v-model="editStrategyForm.name" style="width:180px;" />
        </div>
        <div style="margin-bottom:12px;">
          <label>策略类型：</label>
          <input v-model="editStrategyForm.type" style="width:120px;" />
        </div>
        <div style="margin-bottom:12px;">
          <label>仓位特性：</label>
          <select v-model="editStrategyForm.position_characteristic" style="margin-left:6px;">
            <option value="fixed">固定仓位</option>
            <option value="shrink">自动收缩</option>
            <option value="stretch">自动拉伸</option>
          </select>
        </div>
        <div style="margin-top:12px;">
          <button @click="saveStrategyEdit">保存</button>
          <button @click="showEditStrategy = false" style="margin-left:10px;">取消</button>
        </div>
        <div v-if="editStrategyError" style="color:#c00;">{{ editStrategyError }}</div>
      </div>
    </div>

    <!-- 一键变更策略默认金额模态框 -->
    <div v-if="showChangeDefaultAmount" class="modal">
      <div class="modal-content" style="min-width:320px;">
        <h4 style="margin-bottom:16px;">一键变更策略默认金额</h4>
        <div style="margin-bottom:12px;">
          <label>统一设置金额：</label>
          <input type="number" v-model.number="unifiedAmount" style="width:96px;margin-right:12px;" />
          <button @click="applyUnifiedAmount" style="padding: 2px 10px;">应用到全部</button>
        </div>
        <div style="max-height:400px;overflow:auto;">
          <div v-for="(item, idx) in changeAmountList" :key="item.name" style="margin-bottom:8px;">
            <label style="display:inline-block;width:110px;">{{ item.name }}：</label>
            <input type="number" v-model.number="item.value" style="width:96px;" />
          </div>
        </div>
        <div style="margin-top:18px;">
          <button @click="showChangeDefaultAmount = false">取消</button>
          <button @click="saveChangeDefaultAmount" style="margin-left:14px;">保存</button>
        </div>
      </div>
    </div>

    <!-- 标的操作 -->
    <div v-if="selectedStrategy" style="margin-bottom:12px;">
      <button @click="showAddTarget = true">新增标的</button>
    </div>

    <!-- 标的表格 -->
    <table v-if="currentTargets.length > 0" border="1" cellpadding="8" style="background:#fff;min-width:760px;">
      <thead>
        <tr>
          <th>标的</th>
          <th>市值</th>
          <th>默认金额</th>
          <th>当前持有</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(target, idx) in currentTargets" :key="target.name">
          <td>{{ target.name }}</td>
          <td>{{ Number(getMarketValue(target)).toFixed(2) }}</td>
          <td>{{ target.default_amount }}</td>
          <td>
            <span :style="{color: target.hold ? 'green' : 'gray'}">
              {{ target.hold ? '持有' : '未持有' }}
            </span>
          </td>
          <td>
            <button @click="editTarget(idx)">编辑</button>
            <button @click="deleteTarget(idx)" style="color:#c00;">删除</button>
            <button @click="switchTarget(idx)" style="margin-left:6px;">切换</button>
            <button @click="buyTarget(idx)" style="margin-left:6px;color:#090;">买入</button>
            <button @click="sellTarget(idx)" style="margin-left:6px;color:#900;">卖出</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else-if="selectedStrategy" style="color:#888;">该策略下暂无标的</div>

    <!-- 切换标的模态框 -->
    <div v-if="showSwitchModal" class="modal">
      <div class="modal-content">
        <h4>切换标的</h4>
        <div style="margin-bottom:12px;">
          <label>选择目标标的：</label>
          <select v-model="switchTargetName" style="margin-left:6px;">
            <option value="">请选择标的</option>
            <option
              v-for="target in currentTargets.filter((_, i) => i !== currentSwitchIdx)"
              :key="target.name"
              :value="target.name"
            >
              {{ target.name }}
            </option>
          </select>
        </div>
        <div style="margin-top:12px;">
          <button @click="confirmSwitch">确认</button>
          <button @click="showSwitchModal = false" style="margin-left:10px;">取消</button>
        </div>
      </div>
    </div>

    <!-- 变更列表 -->
    <div style="margin-top:24px;">
      <h3>变更列表 ({{ tradePlans.length }})</h3>
      <button @click="generateTradePlan" style="margin-bottom:12px;">生成交易计划</button>
      <table v-if="tradePlans.length > 0" border="1" cellpadding="8" style="background:#fff;margin-top:12px;min-width:760px;">
        <thead>
          <tr>
            <th>策略</th>
            <th>标的</th>
            <th>操作</th>
            <th>金额</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(plan, idx) in tradePlans" :key="plan.timestamp">
            <td>{{ plan.strategy }}</td>
            <td>{{ plan.action === '切换' ? `${plan.fromTarget}→${plan.toTarget}` : plan.target }}</td>
            <td>{{ plan.action }}</td>
            <td>{{ plan.amount }}</td>
            <td>{{ plan.status }}</td>
            <td>
              <button @click="deleteTradePlan(idx)" style="color:#c00;">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>



    <!-- 新增/编辑标的模态框 -->
    <div v-if="showAddTarget || editingTargetIdx !== null" class="modal">
      <div class="modal-content">
        <h4>{{ editingTargetIdx !== null ? '编辑标的' : '新增标的' }}</h4>
        <input v-model="targetForm.name" placeholder="标的名称" style="width:160px;" :disabled="editingTargetIdx !== null"/>
        <input v-model.number="targetForm.default_amount" type="number" placeholder="默认金额" style="width:120px; margin-left:10px;" />
        <label style="margin-left:10px;">
          <input type="checkbox" v-model="targetForm.hold" /> 持有
        </label>
        <div style="margin-top:12px;">
          <button @click="saveTarget">{{ editingTargetIdx !== null ? '保存' : '添加' }}</button>
          <button @click="cancelTargetEdit" style="margin-left:10px;">取消</button>
        </div>
        <div v-if="targetFormError" style="color:#c00;">{{ targetFormError }}</div>
      </div>
    </div>
    <!-- 资金和调整信息 -->
    <div v-if="showFinalPlan && assetInfo.total_asset" class="fund-info">
      <h3>资金信息</h3>
      <div>当前总资产: {{ assetInfo.total_asset.toFixed(2) }}</div>
      <div>当前可用资金: {{ assetInfo.cash.toFixed(2) }}</div>
      <div>当前持仓市值: {{ assetInfo.market_value.toFixed(2) }}</div>

      <div v-if="planAdjustment" class="adjustment-info">
        <h4>计划调整</h4>
        <div>{{ planAdjustment.message }}</div>
      </div>
    </div>

    <!-- 最终交易计划 -->
    <div v-if="showFinalPlan" class="final-plan">
      <h3>最终交易计划</h3>
      <button @click="exportFinalPlan" style="margin-bottom:12px;">导出交易计划</button>
      <table border="1" cellpadding="8">
        <thead>
          <tr>
            <th>策略</th>
            <th>标的</th>
            <th>操作</th>
            <th>金额</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(plan, idx) in finalTradePlan" :key="idx">
            <td>{{ plan.strategy }}</td>
            <td>{{ plan.name }}</td>
            <td>{{ plan.action }}</td>
            <td>{{ Math.abs(plan.amount).toFixed(2) }}</td>
            <td>{{ plan.adjusted ? '已根据市值调整' : '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watchEffect } from 'vue'

// 默认策略数据（升级为新结构方便测试）
const defaultStrategies = {
  '科技成长策略': {
    type: '成长',
    position_characteristic: 'fixed',
    targets: [
      { name: '中证500', default_amount: 10000, hold: false },
      { name: '创业板指', default_amount: 9000, hold: true }
    ]
  },
  '国债策略': {
    type: '债券',
    position_characteristic: 'shrink',
    targets: [
      { name: '30年国债', default_amount: 190000, hold: false },
      { name: '可转债', default_amount: 80000, hold: false }
    ]
  }
}

const strategies = ref({})
const selectedStrategy = ref('')
const showAddStrategy = ref(false)
const showEditStrategy = ref(false)
const newStrategyName = ref('')
const newStrategyType = ref('')
const newStrategyPositionCharacteristic = ref('fixed') // 默认固定仓位
const strategyNameError = ref('')
const editStrategyForm = ref({
  name: '',
  type: '',
  position_characteristic: 'fixed'
})
const editStrategyError = ref('')
const showAddTarget = ref(false)
const editingTargetIdx = ref(null)
const targetForm = ref({ name: '', default_amount: 0, hold: false })
const targetFormError = ref('')

const positions = ref([])  // 持仓数组
const tradePlans = ref([]) // 变更计划数组
const showSwitchModal = ref(false) // 是否显示切换标的模态框
const currentSwitchIdx = ref(null) // 当前正在切换的标的索引
const switchTargetName = ref('') // 切换目标标的名称
const finalTradePlan = ref([]) // 最终交易计划
const showFinalPlan = ref(false) // 是否显示最终交易计划
const assetInfo = ref({}) // 资产信息
const planAdjustment = ref(null) // 计划调整信息

// 仓位特性文本映射
function positionCharacteristicText(value) {
  const map = {
    'fixed': '固定仓位',
    'shrink': '自动收缩',
    'stretch': '自动拉伸'
  }
  return map[value] || '未设置'
}

// 导入导出相关
const importFile = ref(null)
function exportStrategies() {
  const data = localStorage.getItem('strategies') || '{}'
  // 使用2个空格作为缩进格式化JSON
  const formattedData = JSON.stringify(JSON.parse(data), null, 2)
  const blob = new Blob([formattedData], {type: 'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'strategies.json'
  a.click()
  URL.revokeObjectURL(url)
}
function triggerImport() {
  importFile.value && importFile.value.click()
}
function importFromFile(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = function(e) {
    try {
      const obj = JSON.parse(e.target.result)
      if (typeof obj === 'object') {
        // 兼容迁移：如果导入的是老数组结构
        Object.keys(obj).forEach(k => {
          if (Array.isArray(obj[k])) {
            obj[k] = {
              type: '',
              position_characteristic: 'fixed', // 默认值
              targets: obj[k]
            }
          }
        })
        localStorage.setItem('strategies', JSON.stringify(obj))
        strategies.value = obj
        selectedStrategy.value = Object.keys(obj)[0] || ''
        alert('导入成功！')
      } else {
        alert('导入内容格式有误！')
      }
    } catch {
      alert('JSON解析失败')
    }
  }
  reader.readAsText(file)
}

// 一键变更策略默认金额相关
const showChangeDefaultAmount = ref(false)
const changeAmountList = ref([])
const unifiedAmount = ref(null)

function openChangeDefaultAmount() {
  if (!selectedStrategy.value) return
  changeAmountList.value = (strategies.value[selectedStrategy.value]?.targets || []).map(item => ({
    name: item.name,
    value: item.default_amount
  }))
  unifiedAmount.value = null
  showChangeDefaultAmount.value = true
}
function applyUnifiedAmount() {
  if (unifiedAmount.value !== null && unifiedAmount.value !== undefined) {
    changeAmountList.value.forEach(item => {
      item.value = unifiedAmount.value
    })
  }
}
function saveChangeDefaultAmount() {
  const targets = strategies.value[selectedStrategy.value]?.targets
  changeAmountList.value.forEach(editItem => {
    const t = targets.find(x => x.name === editItem.name)
    if (t) t.default_amount = editItem.value
  })
  saveToStorage()
  showChangeDefaultAmount.value = false
}

const positionsLoaded = ref(false)
async function loadPositions() {
  try {
    const resp = await fetch('/template_account_info/template_account_position_info.json?_t=' + Date.now());
    if (resp.ok) {
      const json = await resp.json();
      if (json && Array.isArray(json.positions)) {
        positions.value = json.positions;
      } else {
        positions.value = [];
      }
    } else {
      positions.value = [];
    }
  } catch (e) {
    positions.value = [];
  }
  positionsLoaded.value = true
}

function getMarketValue(target) {
  if (!Array.isArray(positions.value) || positions.value.length === 0) return 0;
  const found = positions.value.find(
    p => p.stock_name === target.name || (target.code && p.stock_code === target.code)
  );
  return Number(found?.market_value) || 0;
}

// 数据迁移兼容：首次加载时自动从数组结构转新结构
function migrateStrategies(raw) {
  if (!raw) return {}
  let changed = false
  Object.keys(raw).forEach(k => {
    if (Array.isArray(raw[k])) {
      raw[k] = {
        type: '',
        position_characteristic: 'fixed', // 默认值
        targets: raw[k]
      }
      changed = true
    }
  })
  return raw
}

onMounted(() => {
  const saved = localStorage.getItem('strategies')
  if (saved) {
    let raw = JSON.parse(saved)
    // 数据迁移
    const migrated = migrateStrategies(raw)
    strategies.value = migrated
    // 若有迁移，自动覆盖回 localStorage
    if (JSON.stringify(migrated) !== saved) {
      localStorage.setItem('strategies', JSON.stringify(migrated))
    }
  } else {
    strategies.value = JSON.parse(JSON.stringify(defaultStrategies))
    localStorage.setItem('strategies', JSON.stringify(strategies.value))
  }
  selectedStrategy.value = Object.keys(strategies.value)[0] || ''
  loadPositions()
})

watchEffect(() => {
  if (showEditStrategy.value && selectedStrategy.value) {
    const strategy = strategies.value[selectedStrategy.value]
    editStrategyForm.value = {
      name: selectedStrategy.value,
      type: strategy.type || '',
      position_characteristic: strategy.position_characteristic || 'fixed'
    }
  }
})

const currentTargets = computed(() => {
  if (!selectedStrategy.value) return []
  return strategies.value[selectedStrategy.value]?.targets || []
})

function saveToStorage() {
  localStorage.setItem('strategies', JSON.stringify(strategies.value))
}

function addStrategy() {
  const name = newStrategyName.value.trim()
  if (!name) {
    strategyNameError.value = '策略名称不能为空'
    return
  }
  if (strategies.value[name]) {
    strategyNameError.value = '策略已存在'
    return
  }
  strategies.value[name] = {
    type: newStrategyType.value.trim(),
    position_characteristic: newStrategyPositionCharacteristic.value,
    targets: []
  }
  saveToStorage()
  selectedStrategy.value = name
  newStrategyName.value = ''
  newStrategyType.value = ''
  newStrategyPositionCharacteristic.value = 'fixed' // 重置为默认值
  showAddStrategy.value = false
  strategyNameError.value = ''
}

function saveStrategyEdit() {
  const oldName = selectedStrategy.value
  const newName = editStrategyForm.value.name.trim()

  if (!newName) {
    editStrategyError.value = '策略名称不能为空'
    return
  }

  // 检查名称是否已存在（且不是当前策略）
  if (newName !== oldName && strategies.value[newName]) {
    editStrategyError.value = '策略名称已存在'
    return
  }

  // 获取原策略数据
  const strategyData = strategies.value[oldName]

  // 如果名称改变了，需要先删除旧的再添加新的
  if (newName !== oldName) {
    delete strategies.value[oldName]
  }

  // 更新策略数据
  strategies.value[newName] = {
    type: editStrategyForm.value.type.trim(),
    position_characteristic: editStrategyForm.value.position_characteristic,
    targets: strategyData.targets
  }

  // 更新选中策略
  selectedStrategy.value = newName
  saveToStorage()
  showEditStrategy.value = false
  editStrategyError.value = ''
}

function deleteStrategy() {
  if (!selectedStrategy.value) return
  if (!confirm(`确定要删除策略【${selectedStrategy.value}】吗？`)) return
  delete strategies.value[selectedStrategy.value]
  const keys = Object.keys(strategies.value)
  selectedStrategy.value = keys[0] || ''
  saveToStorage()
}

function editTarget(idx) {
  editingTargetIdx.value = idx
  const target = { ...currentTargets.value[idx] }
  targetForm.value = { ...target }
  showAddTarget.value = false
  targetFormError.value = ''
}

function saveTarget() {
  const form = targetForm.value
  if (!form.name.trim()) {
    targetFormError.value = '标的名称不能为空'
    return
  }
  if (form.default_amount <= 0) {
    targetFormError.value = '默认金额需大于0'
    return
  }
  const targets = strategies.value[selectedStrategy.value].targets
  if (editingTargetIdx.value !== null) {
    targets[editingTargetIdx.value] = { ...form }
    editingTargetIdx.value = null
  } else {
    if (targets.some(t => t.name === form.name)) {
      targetFormError.value = '标的名称已存在'
      return
    }
    targets.push({ ...form })
    showAddTarget.value = false
  }
  targetForm.value = { name: '', default_amount: 0, hold: false }
  targetFormError.value = ''
  saveToStorage()
}

function cancelTargetEdit() {
  editingTargetIdx.value = null
  showAddTarget.value = false
  targetForm.value = { name: '', default_amount: 0, hold: false }
  targetFormError.value = ''
}

function deleteTarget(idx) {
  if (!confirm(`确定要删除标的【${currentTargets.value[idx].name}】吗？`)) return
  strategies.value[selectedStrategy.value].targets.splice(idx, 1)
  saveToStorage()
}

function switchTarget(idx) {
  const current = currentTargets.value[idx]
  const marketValue = getMarketValue(current)

  if (marketValue <= 0) {
    alert('该标的市值为0，不允许切换')
    return
  }

  const otherTargets = currentTargets.value.filter((_, i) => i !== idx)
  if (otherTargets.length === 0) {
    alert('该策略下没有其他标的可切换')
    return
  }
  currentSwitchIdx.value = idx
  switchTargetName.value = ''
  showSwitchModal.value = true
}

function confirmSwitch() {
  const idx = currentSwitchIdx.value
  const current = currentTargets.value[idx]
  const target = currentTargets.value.find(t => t.name === switchTargetName.value)

  if (!target) {
    alert('请选择要切换的标的')
    return
  }

  tradePlans.value.push({
    strategy: selectedStrategy.value,
    fromTarget: current.name,
    toTarget: target.name,
    amount: current.default_amount,
    action: '切换',
    status: '待执行',
    timestamp: new Date().toISOString()
  })

  showSwitchModal.value = false
}

function buyTarget(idx) {
  const target = currentTargets.value[idx]
  tradePlans.value.push({
    strategy: selectedStrategy.value,
    target: target.name,
    amount: target.default_amount,
    action: '买入',
    status: '待执行',
    timestamp: new Date().toISOString()
  })
}

function sellTarget(idx) {
  const target = currentTargets.value[idx]
  const marketValue = getMarketValue(target)

  if (marketValue <= 0) {
    alert('该标的市值为0，不允许卖出')
    return
  }

  tradePlans.value.push({
    strategy: selectedStrategy.value,
    target: target.name,
    amount: target.default_amount,
    action: '卖出',
    status: '待执行',
    timestamp: new Date().toISOString()
  })
}

function deleteTradePlan(index) {
  tradePlans.value.splice(index, 1)
}

function adjustPlanBasedOnFunds() {
  if (!assetInfo.value.total_asset || !assetInfo.value.available) return

  // 计算总买入和总卖出金额
  let totalBuy = 0
  let totalSell = 0
  finalTradePlan.value.forEach(plan => {
    if (plan.action === '买入') {
      totalBuy += plan.amount
    } else {
      totalSell += Math.abs(plan.amount)
    }
  })

  // 计算执行后可用资金
  const currentAvailable = Number(assetInfo.value.available)
  const postExecutionAvailable = currentAvailable - totalBuy + totalSell

  // 检查是否需要调整
  if (postExecutionAvailable < 10000) {
    // 资金不足，需要收缩买入计划
    const deficit = 10000 - postExecutionAvailable
    adjustBuyPlans('shrink', deficit)
  } else if (postExecutionAvailable > 20000) {
    // 资金过多，可以拉伸买入计划
    const surplus = postExecutionAvailable - 20000
    adjustBuyPlans('stretch', surplus)
  }
}

function adjustBuyPlans(adjustType, amount) {
  // 获取可调整的买入计划（自动收缩/拉伸策略）
  const adjustablePlans = finalTradePlan.value.filter(plan =>
    plan.action === '买入' &&
    strategies.value[plan.strategy]?.position_characteristic === adjustType
  )

  if (adjustablePlans.length === 0) {
    planAdjustment.value = {
      message: `资金${adjustType === 'shrink' ? '不足' : '过多'}，但没有可${adjustType === 'shrink' ? '收缩' : '拉伸'}的买入计划`,
      adjusted: false
    }
    return
  }

  // 计算总可调整金额
  const totalAdjustableAmount = adjustablePlans.reduce((sum, plan) => sum + plan.amount, 0)

  // 计算调整比例
  const adjustRatio = adjustType === 'shrink'
    ? Math.max(0, (totalAdjustableAmount - amount) / totalAdjustableAmount)
    : 1 + (amount / totalAdjustableAmount)

  // 应用调整
  adjustablePlans.forEach(plan => {
    plan.amount = Math.round(plan.amount * adjustRatio)
  })

  // 更新调整信息
  planAdjustment.value = {
    message: `已${adjustType === 'shrink' ? '收缩' : '拉伸'}买入计划，调整比例: ${(adjustRatio * 100).toFixed(2)}%`,
    adjusted: true,
    adjustType,
    adjustRatio
  }
}

async function generateTradePlan() {
  // 加载资产信息
  try {
    const response = await fetch('/template_account_info/template_account_asset_info.json?_t=' + Date.now())
    if (response.ok) {
      assetInfo.value = await response.json()
    }
  } catch (e) {
    console.error('加载资产信息失败:', e)
    assetInfo.value = {}
  }

  // 按标的合并所有操作
  const mergedPlans = {}

  tradePlans.value.forEach(plan => {
    const targetName = plan.action === '切换' ? plan.fromTarget : plan.target
    if (!mergedPlans[targetName]) {
      mergedPlans[targetName] = {
        name: targetName,
        buy: 0,
        sell: 0,
        strategy: plan.strategy
      }
    }

    if (plan.action === '买入') {
      mergedPlans[targetName].buy += plan.amount
    } else if (plan.action === '卖出') {
      mergedPlans[targetName].sell += plan.amount
    } else if (plan.action === '切换') {
      mergedPlans[targetName].sell += plan.amount
    }
  })

  // 处理卖出操作，考虑市值因素
  const positionsMap = {}
  positions.value.forEach(p => {
    positionsMap[p.stock_name] = Number(p.market_value)
  })

  finalTradePlan.value = Object.values(mergedPlans)
    .map(plan => {
      // 计算净买入/卖出
      const netAmount = plan.buy - plan.sell

      // 如果是卖出操作
      if (netAmount < 0) {
        const marketValue = positionsMap[plan.name] || 0

        // 市值为0不允许卖出
        if (marketValue <= 0) {
          return null
        }

        // 市值大于卖出金额的110%
        if (marketValue > Math.abs(netAmount) * 1.1) {
          return {
            name: plan.name,
            amount: -marketValue * 1.03, // 卖出当前市值的103%
            action: '卖出',
            strategy: plan.strategy,
            adjusted: true
          }
        }
      }

      return {
        name: plan.name,
        amount: netAmount,
        action: netAmount >= 0 ? '买入' : '卖出',
        strategy: plan.strategy,
        adjusted: false
      }
    })
    .filter(plan => plan && Math.abs(plan.amount) > 0) // 过滤掉金额为0的项

  // 计算总买入和总卖出金额
  let totalBuy = 0
  let totalSell = 0
  finalTradePlan.value.forEach(plan => {
    if (plan.action === '买入') {
      totalBuy += plan.amount
    } else {
      totalSell += Math.abs(plan.amount)
    }
  })

  // 计算执行后资金
  const currentAvailable = Number(assetInfo.value.cash)
  const postExecutionAvailable = currentAvailable - totalBuy + totalSell

  // 检查是否需要调整
  if (postExecutionAvailable < 10000) {
    // 资金不足，需要收缩买入计划
    const deficit = 10000 - postExecutionAvailable
    adjustBuyPlans('shrink', deficit)
  } else if (postExecutionAvailable > 20000) {
    // 资金过多，可以拉伸买入计划
    const surplus = postExecutionAvailable - 20000
    adjustBuyPlans('stretch', surplus)
  }

  showFinalPlan.value = true
}

watchEffect(() => {
  if (showAddTarget.value) {
    targetForm.value = { name: '', default_amount: 0, hold: false }
    targetFormError.value = ''
    editingTargetIdx.value = null
  }
})

function exportFinalPlan() {
  try {
    // 1. 根据变更列表更新标的持有状态
    updateTargetHoldStatus();

    // 2. 获取当前总资产
    const totalAsset = assetInfo.value.total_asset || 0;

    // 3. 构造符合要求的JSON数据结构
    const exportData = {
      sell_stocks_info: finalTradePlan.value
        .filter(plan => plan.action === '卖出')
        .map(plan => ({
          name: plan.name,
          ratio: totalAsset > 0 ? ((Math.abs(plan.amount) / totalAsset) * 100).toFixed(2) : 0
        })),
      buy_stocks_info: finalTradePlan.value
        .filter(plan => plan.action === '买入')
        .map(plan => ({
          name: plan.name,
          ratio: totalAsset > 0 ? ((Math.abs(plan.amount) / totalAsset) * 100).toFixed(2) : 0
        }))
    };

    // 将数据转换为格式化的JSON字符串
    const jsonStr = JSON.stringify(exportData, null, 2);

    // 使用Clipboard API复制到剪贴板
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(jsonStr).then(() => {
        alert('交易计划已复制到剪贴板，标的持有状态已更新！');
      }).catch(err => {
        console.error('复制失败:', err);
        fallbackCopyTextToClipboard(jsonStr);
      });
    } else {
      // 降级方案
      fallbackCopyTextToClipboard(jsonStr);
    }
  } catch (error) {
    console.error('导出交易计划时出错:', error);
    alert('导出失败，请重试');
  }
}

function updateTargetHoldStatus() {
  // 遍历变更列表中的每个计划
  tradePlans.value.forEach(plan => {
    // 检查是否存在对应的策略
    if (strategies.value[plan.strategy]) {
      // 根据操作类型更新标的持有状态
      if (plan.action === '买入') {
        // 买入操作：找到对应的标的并设置为持有状态
        const target = strategies.value[plan.strategy].targets.find(t => t.name === plan.target);
        if (target) {
          target.hold = true;
        }
      } else if (plan.action === '卖出') {
        // 卖出操作：找到对应的标的并设置为未持有状态
        const target = strategies.value[plan.strategy].targets.find(t => t.name === plan.target);
        if (target) {
          target.hold = false;
        }
      } else if (plan.action === '切换') {
        // 切换操作：将源标的设置为未持有，目标标的设置为持有
        const fromTarget = strategies.value[plan.strategy].targets.find(t => t.name === plan.fromTarget);
        const toTarget = strategies.value[plan.strategy].targets.find(t => t.name === plan.toTarget);
        if (fromTarget) fromTarget.hold = false;
        if (toTarget) toTarget.hold = true;
      }
    }
  });

  // 保存更新后的状态到本地存储
  saveToStorage();
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    alert('交易计划已复制到剪贴板，标的持有状态已更新！');
  } catch (err) {
    console.error('Fallback: 无法复制文本', err);
    alert('复制失败，请手动复制以下内容:\n' + text);
  }
  document.body.removeChild(textArea);
}</script>

<style scoped>
.strategy-container {
  padding: 16px;
}

.fund-info,
.final-plan {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.modal {
  position: fixed;
  top: 0; left: 0; right:0; bottom:0;
  background: rgba(0,0,0,0.3);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: #fff;
  border-radius: 6px;
  padding: 24px 32px;
  min-width: 320px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.14);
}
</style>