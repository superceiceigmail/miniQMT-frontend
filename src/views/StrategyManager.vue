<template>
  <div class="strategy-container">
    <div class="strategy-column">
      <h2>策略管理</h2>
      <!-- 策略操作 -->
      <div style="margin-bottom: 20px;">
        <label for="strategy-select">选择策略：</label>
        <select id="strategy-select" v-model="selectedStrategy">
          <option value="">请选择策略</option>
          <option v-for="name in strategies.list" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
        <!-- 上移/下移按钮 -->
        <button
          @click="moveStrategy(-1)"
          :disabled="!selectedStrategy || strategies.list.indexOf(selectedStrategy) === 0"
          style="margin-left:8px;">↑上移</button>
        <button
          @click="moveStrategy(1)"
          :disabled="!selectedStrategy || strategies.list.indexOf(selectedStrategy) === strategies.list.length - 1"
          style="margin-left:4px;">↓下移</button>
        <button @click="showAddStrategy = true" style="margin-left:12px;">新增策略</button>
        <button @click="showEditStrategy = true" :disabled="!selectedStrategy" style="margin-left:6px;">编辑策略</button>
        <button @click="deleteStrategy" :disabled="!selectedStrategy" style="margin-left:6px;color:#c00;">删除策略</button>
        <button @click="openChangeDefaultAmount" :disabled="!selectedStrategy" style="margin-left:6px;">一键变更策略默认金额</button>

        <!-- 导出/复制/粘贴/导入 -->
        <button @click="exportStrategies" style="margin-left:12px;">导出策略</button>

        <!-- 新增：复制全部/粘贴全部 -->
        <button @click="copyAllStrategies" style="margin-left:8px;">复制全部策略</button>
        <button @click="pasteAllStrategies" style="margin-left:6px;">粘贴全部策略</button>

        <!-- 保留单策略复制/粘贴（可选） -->
        <button @click="copyStrategy" :disabled="!selectedStrategy" style="margin-left:8px;">复制策略</button>
        <button @click="pasteStrategy" style="margin-left:6px;">粘贴策略</button>

        <input type="file" ref="importFile" style="display:none;" @change="importFromFile" accept=".json"/>
        <button @click="triggerImport" style="margin-left:8px;">导入策略</button>
      </div>
    </div>

    <!-- 策略类型和仓位特性显示 -->
    <div v-if="selectedStrategy && strategies.map[selectedStrategy]" style="margin-bottom:12px;">
      <div>
        <span style="color:#888;">类型：</span>
        <span>{{ strategies.map[selectedStrategy]?.type || '未设置' }}</span>
      </div>
      <div>
        <span style="color:#888;">仓位特性：</span>
        <span>{{ positionCharacteristicText(strategies.map[selectedStrategy]?.position_characteristic) }}</span>
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
        <!-- NOTE: key changed from target.name to idx so same-name targets are allowed without duplicate key warnings -->
        <tr v-for="(target, idx) in currentTargets" :key="idx">
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
          <!-- iterate with index so duplicates are selectable distinctly -->
          <select v-model="switchTargetName" style="margin-left:6px;">
            <option value="">请选择标的</option>
            <option
              v-for="(target, i) in currentTargets"
              :key="i"
              v-if="i !== currentSwitchIdx"
              :value="i"
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
      <div v-if="assetInfo.postExecutionAvailable !== undefined">
        预计执行后可用资金: {{ assetInfo.postExecutionAvailable.toFixed(2) }}
      </div>
      <div>
        是否可以直接买入: <span :style="{color: canDirectlyBuy ? 'green':'red'}">{{ canDirectlyBuy ? '是' : '否' }}</span>
      </div>
      <!-- 新增：显示涉及到变动的策略总数量 -->
      <div>
        涉及策略数量（用于比对，避免漏失）: <strong>{{ tradePlanStrategyCount }}</strong>
      </div>
      <div v-if="planAdjustment" class="adjustment-info">
        <h4>计划调整</h4>
        <div>{{ planAdjustment.message }}</div>
      </div>
    </div>

    <!-- 最终交易计划 -->
    <div v-if="showFinalPlan" class="final-plan">
      <h3>最终交易计划</h3>
      <div style="margin-bottom:12px;">
        <button @click="exportTradePlan" style="margin-right:8px;">导出交易计划（并更新持有状态）</button>
        <button @click="exportSuggestedHoldings">导出建议持仓</button>
      </div>
      <table border="1" cellpadding="8">
        <thead>
          <tr>
            <th>标的</th>
            <th>操作</th>
            <th>金额</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(plan, idx) in finalTradePlan" :key="idx">
            <td>{{ plan.name }}</td>
            <td>{{ plan.action }}</td>
            <td>{{ plan.amount.toFixed(2) }}</td>
            <td>{{ plan.adjusted ? '已根据市值调整' : '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watchEffect } from 'vue'

// ======= 固定基准资产（写死为 700000） =======
// 为避免账户波动或入金影响导出比例，统一使用固定分母 700000。
const BASE_ASSET = 700000
// =============================================

// ======= 策略缓存key变量化逻辑 =======
const strategyType = ref(localStorage.getItem('strategyType') || 'conservative')
const strategyCacheKey = computed(() => {
  switch(strategyType.value) {
    case 'conservative': return 'strategies_conservative';
    case 'aggressive': return 'strategies_aggressive';
    case 'ultra': return 'strategies_ultra';
    default: return `strategies_${strategyType.value}`;
  }
})
// =====================================

// 默认策略数据（升级为新结构支持顺序）
// NOTE: no change needed here for duplicate target names; duplicate names are allowed now.
const defaultStrategies = {
  list: ['科技成长策略', '国债策略'],
  map: {
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
}

// 策略数据结构
const strategies = ref({
  list: [],
  map: {}
})
const selectedStrategy = ref('')
const showAddStrategy = ref(false)
const showEditStrategy = ref(false)
const newStrategyName = ref('')
const newStrategyType = ref('')
const newStrategyPositionCharacteristic = ref('fixed')
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
const showSwitchModal = ref(false)
const currentSwitchIdx = ref(null)
// switchTargetName now stores the target index (number as string from select) instead of name,
// so duplicates are selectable distinctly.
const switchTargetName = ref('')
const finalTradePlan = ref([])
const showFinalPlan = ref(false)
const assetInfo = ref({})
const planAdjustment = ref(null)
const canDirectlyBuy = ref(true) // 新增：是否可以直接买入

// 新增：记录交易计划中涉及到的策略总数（去重）
const tradePlanStrategyCount = ref(0)


// 排序相关
function moveStrategy(direction) {
  const idx = strategies.value.list.indexOf(selectedStrategy.value)
  if (idx === -1) return
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= strategies.value.list.length) return
  const arr = strategies.value.list
  ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
  saveToStorage()
}

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
  try {
    // 打包当前策略 + 运行态数据到一个完整的 export 包
    const exportData = {
      type: 'strategy_cache_export',
      version: 1,
      exported_at: new Date().toISOString(),
      cache_key: strategyCacheKey.value,
      full_cache: true, // 表示这是完整缓存导出（包含 list+map）
      strategies: strategies.value || { list: [], map: {} },
      tradePlans: tradePlans.value || [],
      positions: positions.value || [],
      assetInfo: assetInfo.value || {}
    };

    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `strategies_export_${getLocalDateString()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // 同时也尝试把导出内容复制到剪贴板（方便跨设备粘贴）
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(json).catch(() => {})
    }

    alert('导出完成：已保存为 JSON 文件，并尝试复制到剪贴板。')
  } catch (err) {
    console.error('导出策略失败:', err)
    alert('导出策略失败，请重试')
  }
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
      const parsed = JSON.parse(e.target.result)

      // 如果是我们定义的完整导出包
      if (parsed && parsed.type === 'strategy_cache_export') {
        // 如果这是完整缓存导出（full_cache），提示用户是否覆盖本地缓存
        if (parsed.full_cache) {
          const confirmOverwrite = confirm(
            `检测到这是完整缓存导出（来自 key: ${parsed.cache_key || 'unknown'}）。\n` +
            `覆盖本地缓存会替换当前策略数据（包括持仓状态）。是否要覆盖本地缓存？\n\n` +
            `按“确定”会用文件中的 strategies 完全替换本地缓存；按“取消”则只会合并策略（保留本地不同策略）。`
          )

          if (confirmOverwrite) {
            // 覆盖 localStorage 下当前的 strategyCacheKey
            try {
              // 如果导出包中的 strategies 不是 list+map 结构，先迁移
              const toStore = migrateStrategies(parsed.strategies || parsed)
              localStorage.setItem(strategyCacheKey.value, JSON.stringify(toStore))
              strategies.value = toStore
            } catch (e) {
              console.error('覆盖本地缓存时出错', e)
              alert('覆盖本地缓存失败，已中止。')
              return
            }
          } else {
            // 合并导入（保留本地已有策略，避免同名覆盖）
            const toMerge = migrateStrategies(parsed.strategies || parsed)
            mergeImportedStrategies(toMerge)
          }
        } else {
          // 非 full_cache，仅合并策略
          const toMerge = migrateStrategies(parsed.strategies || parsed)
          mergeImportedStrategies(toMerge)
        }

        // 同步导入运行时数据（不写入 localStorage，除非你想）
        if (Array.isArray(parsed.tradePlans)) {
          tradePlans.value = parsed.tradePlans
        }
        if (Array.isArray(parsed.positions)) {
          positions.value = parsed.positions
        }
        if (parsed.assetInfo && typeof parsed.assetInfo === 'object') {
          assetInfo.value = parsed.assetInfo
        }

        saveToStorage()
        alert('导入成功（策略/缓存 包）。')
      } else {
        // 兼容老的导出，仅是策略 list/map 或数组形式
        const imported = migrateStrategies(parsed)
        mergeImportedStrategies(imported)
        saveToStorage()
        alert('导入策略成功（合并模式）。')
      }
    } catch (err) {
      console.error('importFromFile parse error', err)
      alert('JSON解析失败或格式不支持')
    } finally {
      event.target.value = ''
    }
  }
  reader.readAsText(file)
}

// 新功能：复制/粘贴策略（单条）
async function copyStrategy() {
  if (!selectedStrategy.value) {
    alert('请选择要复制的策略')
    return
  }
  const name = selectedStrategy.value
  const data = strategies.value.map[name]
  if (!data) {
    alert('策略数据不存在')
    return
  }

  const payload = {
    name,
    strategy: data
  }

  const text = JSON.stringify(payload, null, 2)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      alert('策略已复制到剪贴板，可在另一个实例使用“粘贴策略”导入')
    } catch (err) {
      console.error('clipboard.writeText failed', err)
      fallbackCopyTextToClipboard(text)
    }
  } else {
    fallbackCopyTextToClipboard(text)
  }
}

async function pasteStrategy() {
  let text = ''
  if (navigator.clipboard && window.isSecureContext) {
    try {
      text = await navigator.clipboard.readText()
    } catch (err) {
      console.error('读取剪贴板失败', err)
      text = prompt('读取剪贴板失败，请粘贴策略 JSON：')
      if (!text) return
    }
  } else {
    text = prompt('请粘贴策略 JSON：')
    if (!text) return
  }

  try {
    const parsed = JSON.parse(text)
    const imported = migrateStrategies(parsed)
    mergeImportedStrategies(imported)
    saveToStorage()
    alert('粘贴并导入成功')
  } catch (err) {
    console.error('pasteStrategy parse failed', err)
    alert('粘贴内容不是有效的 JSON 或格式不支持')
  }
}

// 新功能：复制/粘贴“全部策略”（整个缓存）
async function copyAllStrategies() {
  try {
    const dataObj = strategies.value || { list: [], map: {} }
    const text = JSON.stringify(dataObj, null, 2)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      alert('全部策略已复制到剪贴板，去另一个实例使用“粘贴全部策略”即可导入')
    } else {
      fallbackCopyTextToClipboard(text)
    }
  } catch (err) {
    console.error('copyAllStrategies failed', err)
    alert('复制全部策略失败，请手动导出或重试')
  }
}

async function pasteAllStrategies() {
  let text = ''
  if (navigator.clipboard && window.isSecureContext) {
    try {
      text = await navigator.clipboard.readText()
    } catch (err) {
      console.error('读取剪贴板失败', err)
      text = prompt('读取剪贴板失败，请粘贴策略 JSON（整个策略缓存）:')
      if (!text) return
    }
  } else {
    text = prompt('请粘贴策略 JSON（整个策略缓存）:')
    if (!text) return
  }

  try {
    const parsed = JSON.parse(text)
    const imported = migrateStrategies(parsed)
    // 当粘贴的是完整缓存（list+map），直接覆盖或合并？
    // 我们采用合并：避免覆盖已有策略，保持唯一命名
    mergeImportedStrategies(imported)
    saveToStorage()
    alert('全部策略粘贴并导入成功')
  } catch (err) {
    console.error('pasteAllStrategies parse failed', err)
    alert('粘贴内容不是有效的 JSON 或格式不支持')
  }
}

// 合并导入策略：避免覆盖同名，必要时自动添加后缀确保唯一
function mergeImportedStrategies(imported) {
  if (!imported || !imported.list || !imported.map) return

  const addedNames = []

  imported.list.forEach(name => {
    const src = imported.map[name]
    if (!src) return
    const unique = uniqueStrategyName(name)
    strategies.value.list.push(unique)
    strategies.value.map[unique] = JSON.parse(JSON.stringify(src))
    addedNames.push(unique)
  })

  if (addedNames.length > 0) {
    selectedStrategy.value = addedNames[0]
  }
}

// 生成唯一策略名（在 existing 策略名冲突时追加后缀）
function uniqueStrategyName(base) {
  let name = base
  let i = 1
  while (strategies.value.map[name]) {
    name = `${base}（复制${i}）`
    i++
  }
  return name
}

// 一键变更策略默认金额相关
const showChangeDefaultAmount = ref(false)
const changeAmountList = ref([])
const unifiedAmount = ref(null)

function openChangeDefaultAmount() {
  if (!selectedStrategy.value) return
  changeAmountList.value = (strategies.value.map[selectedStrategy.value]?.targets || []).map(item => ({
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
  const targets = strategies.value.map[selectedStrategy.value]?.targets || []
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

// 数据迁移兼容：支持对象/数组/新结构
function migrateStrategies(raw) {
  if (!raw) return { list: [], map: {} }
  // 如果是单条拷贝 {name, strategy}
  if (raw.name && raw.strategy) {
    const name = raw.name
    const map = {}
    map[name] = raw.strategy
    return { list: [name], map }
  }

  if (raw.list && raw.map) return raw
  const map = {}
  let list = []
  if (Array.isArray(raw)) {
    raw.forEach((item, i) => {
      const name = item.name || `策略${i+1}`
      list.push(name)
      map[name] = { ...item }
    })
  } else {
    list = Object.keys(raw)
    list.forEach(name => {
      if (Array.isArray(raw[name])) {
        map[name] = {
          type: '',
          position_characteristic: 'fixed',
          targets: raw[name]
        }
      } else {
        map[name] = { ...raw[name] }
      }
    })
  }
  return { list, map }
}

onMounted(() => {
  const saved = localStorage.getItem(strategyCacheKey.value)
  if (saved) {
    try {
      let raw = JSON.parse(saved)
      const migrated = migrateStrategies(raw)
      strategies.value = migrated
      if (JSON.stringify(migrated) !== saved) {
        localStorage.setItem(strategyCacheKey.value, JSON.stringify(migrated))
      }
    } catch (err) {
      console.error('读取本地策略解析失败，使用默认策略', err)
      strategies.value = JSON.parse(JSON.stringify(defaultStrategies))
      localStorage.setItem(strategyCacheKey.value, JSON.stringify(strategies.value))
    }
  } else {
    strategies.value = JSON.parse(JSON.stringify(defaultStrategies))
    localStorage.setItem(strategyCacheKey.value, JSON.stringify(strategies.value))
  }
  selectedStrategy.value = strategies.value.list[0] || ''
  loadPositions()
})

watchEffect(() => {
  if (showEditStrategy.value && selectedStrategy.value) {
    const strategy = strategies.value.map[selectedStrategy.value] || {}
    editStrategyForm.value = {
      name: selectedStrategy.value,
      type: strategy.type || '',
      position_characteristic: strategy.position_characteristic || 'fixed'
    }
  }
})

const currentTargets = computed(() => {
  if (!selectedStrategy.value) return []
  return strategies.value.map[selectedStrategy.value]?.targets || []
})

function saveToStorage() {
  try {
    localStorage.setItem(strategyCacheKey.value, JSON.stringify(strategies.value))
  } catch (err) {
    console.error('保存到本地失败', err)
  }
}

function addStrategy() {
  const name = newStrategyName.value.trim()
  if (!name) {
    strategyNameError.value = '策略名称不能为空'
    return
  }
  if (strategies.value.map[name]) {
    strategyNameError.value = '策略已存在'
    return
  }
  strategies.value.list.push(name)
  strategies.value.map[name] = {
    type: newStrategyType.value.trim(),
    position_characteristic: newStrategyPositionCharacteristic.value,
    targets: []
  }
  saveToStorage()
  selectedStrategy.value = name
  newStrategyName.value = ''
  newStrategyType.value = ''
  newStrategyPositionCharacteristic.value = 'fixed'
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
  if (newName !== oldName && strategies.value.map[newName]) {
    editStrategyError.value = '策略名称已存在'
    return
  }
  const strategyData = strategies.value.map[oldName] || { targets: [] }
  if (newName !== oldName) {
    const idx = strategies.value.list.indexOf(oldName)
    if (idx >= 0) strategies.value.list[idx] = newName
    delete strategies.value.map[oldName]
  }
  strategies.value.map[newName] = {
    type: editStrategyForm.value.type.trim(),
    position_characteristic: editStrategyForm.value.position_characteristic,
    targets: strategyData.targets ? JSON.parse(JSON.stringify(strategyData.targets)) : []
  }
  selectedStrategy.value = newName
  saveToStorage()
  showEditStrategy.value = false
  editStrategyError.value = ''
}

function deleteStrategy() {
  if (!selectedStrategy.value) return
  if (!confirm(`确定要删除策略【${selectedStrategy.value}】吗？`)) return
  const idx = strategies.value.list.indexOf(selectedStrategy.value)
  if (idx >= 0) strategies.value.list.splice(idx, 1)
  delete strategies.value.map[selectedStrategy.value]
  selectedStrategy.value = strategies.value.list[0] || ''
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
  const targets = strategies.value.map[selectedStrategy.value].targets
  if (editingTargetIdx.value !== null) {
    targets[editingTargetIdx.value] = { ...form }
    editingTargetIdx.value = null
  } else {
    // ALLOWED: do NOT block duplicate target names anymore.
    // Previously there was a check preventing same-name targets; removed per requirement.
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
  strategies.value.map[selectedStrategy.value].targets.splice(idx, 1)
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
  // switchTargetName contains the index (as string) of the to-target in currentTargets
  const toIdx = Number(switchTargetName.value)
  if (isNaN(toIdx) || toIdx < 0 || toIdx >= currentTargets.value.length) {
    alert('请选择要切换的标的')
    return
  }
  const target = currentTargets.value[toIdx]

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

  let totalBuy = 0
  let totalSell = 0
  finalTradePlan.value.forEach(plan => {
    if (plan.action === '买入') {
      totalBuy += plan.amount
    } else {
      totalSell += plan.amount
    }
  })

  const currentAvailable = Number(assetInfo.value.available)
  const postExecutionAvailable = currentAvailable - totalBuy + totalSell

  if (postExecutionAvailable < 1000) {
    const deficit = 1000 - postExecutionAvailable
    adjustBuyPlans('shrink', deficit)
  } else if (postExecutionAvailable > 20000) {
    const surplus = postExecutionAvailable - 20000
    adjustBuyPlans('stretch', surplus)
  }
}

function adjustBuyPlans(adjustType, amount) {
  const adjustablePlans = finalTradePlan.value.filter(plan =>
    plan.action === '买入' &&
    strategies.value.map[plan.strategy]?.position_characteristic === adjustType
  )

  if (adjustablePlans.length === 0) {
    planAdjustment.value = {
      message: `资金${adjustType === 'shrink' ? '不足' : '过多'}，但没有可${adjustType === 'shrink' ? '收缩' : '拉伸'}的买入计划`,
      adjusted: false
    }
    return
  }

  const totalAdjustableAmount = adjustablePlans.reduce((sum, plan) => sum + plan.amount, 0)

  const adjustRatio = adjustType === 'shrink'
    ? Math.max(0, (totalAdjustableAmount - amount) / totalAdjustableAmount)
    : 1 + (amount / totalAdjustableAmount)

  adjustablePlans.forEach(plan => {
    plan.amount = Math.round(plan.amount * adjustRatio)
  })

  planAdjustment.value = {
    message: `已${adjustType === 'shrink' ? '收缩' : '拉伸'}买入计划，调整比例: ${(adjustRatio * 100).toFixed(2)}%`,
    adjusted: true,
    adjustType,
    adjustRatio
  }
}

async function generateTradePlan() {
  try {
    const response = await fetch('/template_account_info/template_account_asset_info.json?_t=' + Date.now())
    if (response.ok) {
      assetInfo.value = await response.json()
    }
    console.log('finalTradePlan', JSON.stringify(finalTradePlan.value, null, 2))
  } catch (e) {
    console.error('加载资产信息失败:', e)
    assetInfo.value = {}
  }

  const mergedPlans = {}

  tradePlans.value.forEach(plan => {
    if (plan.action === '切换') {
      if (!mergedPlans[plan.fromTarget]) {
        mergedPlans[plan.fromTarget] = {
          name: plan.fromTarget,
          buy: 0,
          sell: 0,
          strategy: plan.strategy
        }
      }
      mergedPlans[plan.fromTarget].sell += plan.amount

      if (!mergedPlans[plan.toTarget]) {
        mergedPlans[plan.toTarget] = {
          name: plan.toTarget,
          buy: 0,
          sell: 0,
          strategy: plan.strategy
        }
      }
      mergedPlans[plan.toTarget].buy += plan.amount

    } else {
      const targetName = plan.target
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
      }
    }
  })

  const positionsMap = {}
  positions.value.forEach(p => {
    positionsMap[p.stock_name] = Number(p.market_value)
  })

  finalTradePlan.value = Object.values(mergedPlans)
    .map(plan => {
      const netAmount = plan.buy - plan.sell

      if (netAmount < 0) {
        const sellAmount = Math.abs(netAmount)
        const marketValue = positionsMap[plan.name] || 0

        if (marketValue <= 0) {
          return null
        }

        if (
          marketValue > sellAmount * 1.01 &&
          marketValue < sellAmount * 1.1
        ) {
          return {
            name: plan.name,
            amount: Number((marketValue * 1.03).toFixed(2)),
            action: '卖出',
            strategy: plan.strategy,
            adjusted: true
          }
        }

        return {
          name: plan.name,
          amount: Number(sellAmount.toFixed(2)),
          action: '卖出',
          strategy: plan.strategy,
          adjusted: false
        }
      }

      return {
        name: plan.name,
        amount: Number(netAmount.toFixed(2)),
        action: netAmount >= 0 ? '买入' : '卖出',
        strategy: plan.strategy,
        adjusted: false
      }
    })
    .filter(plan => plan && Math.abs(plan.amount) > 0)

  let totalBuy = 0
  let totalSell = 0
  finalTradePlan.value.forEach(plan => {
    if (plan.action === '买入') {
      totalBuy += plan.amount
    } else {
      totalSell += plan.amount
    }
  })

  const currentAvailable = Number(assetInfo.value.cash || 0)
  const postExecutionAvailable = currentAvailable - totalBuy + totalSell
  assetInfo.value.postExecutionAvailable = postExecutionAvailable

  if (postExecutionAvailable < 10000) {
    const deficit = 10000 - postExecutionAvailable
    adjustBuyPlans('shrink', deficit)
  } else if (postExecutionAvailable > 20000) {
    const surplus = postExecutionAvailable - 20000
    adjustBuyPlans('stretch', surplus)
  }

  const totalBuyAmount = finalTradePlan.value
    .filter(plan => plan.action === '买入')
    .reduce((sum, plan) => sum + plan.amount, 0);
  canDirectlyBuy.value = totalBuyAmount <= currentAvailable

  // 新增：统计 tradePlans 中涉及到的策略总数（去重）
  try {
    const strategySet = new Set()
    tradePlans.value.forEach(p => {
      if (p && p.strategy) strategySet.add(p.strategy)
    })
    tradePlanStrategyCount.value = strategySet.size
  } catch (e) {
    tradePlanStrategyCount.value = 0
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

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- New helper: compute suggested final holdings (by strategy default_amount) after applying plans ---
// This returns an array of { name, suggested_amount, suggested_pct } for targets that will be "持有" after applying the plans.
// Behavior:
//  - updateTargetHoldStatus() must be called before this to update strategies' target.hold flags according to the planned operations.
//  - For each target that has hold === true across strategies, we sum its strategy default_amounts (if a target appears in multiple strategies).
//  - Percentage is computed against BASE_ASSET (700000) to keep ratios stable and not affected by account value changes.
function computeSuggestedHoldings(totalAsset, strategiesMap) {
  const suggestedMap = {}
  // aggregate default_amounts for targets that are hold === true
  Object.keys(strategiesMap || {}).forEach(strategyName => {
    const s = strategiesMap[strategyName]
    if (!s || !Array.isArray(s.targets)) return
    s.targets.forEach(t => {
      if (!t || !t.name) return
      if (t.hold) {
        const amt = Number(t.default_amount || 0)
        suggestedMap[t.name] = (suggestedMap[t.name] || 0) + amt
      }
    })
  })

  // Use fixed denom BASE_ASSET to avoid account fluctuations
  let denom = Number(BASE_ASSET || 0)
  if (!denom || denom <= 0) denom = 1

  const arr = Object.keys(suggestedMap).map(name => {
    const val = Number(suggestedMap[name] || 0)
    const pct = (val / denom) * 100
    return {
      name,
      suggested_amount: Number(val.toFixed(2)),
      suggested_pct: Number(pct.toFixed(2))
    }
  }).filter(x => x.suggested_amount > 0).sort((a,b) => b.suggested_pct - a.suggested_pct)

  return arr
}

// --- Split export: exportTradePlan (update hold + export plan without suggested holdings)
// and exportSuggestedHoldings (export final_suggested_holdings only, without mutating strategies) ---

function exportTradePlan() {
  try {
    // Apply hold-status updates based on planned operations (this mutates strategies and saves)
    updateTargetHoldStatus();

    const totalAsset = BASE_ASSET;
    const planDate = getLocalDateString();

    // sell/buy info remain for compatibility
    const sell_stocks_info = finalTradePlan.value
      .filter(plan => plan.action === '卖出')
      .map(plan => ({
        name: plan.name,
        ratio: Number(((plan.amount / totalAsset) * 100).toFixed(2)),
        amount: Number(plan.amount)
      }))

    const buy_stocks_info = finalTradePlan.value
      .filter(plan => plan.action === '买入')
      .map(plan => ({
        name: plan.name,
        ratio: Number(((plan.amount / totalAsset) * 100).toFixed(2)),
        amount: Number(plan.amount)
      }))

    const exportData = {
      plan_date: planDate,
      sell_stocks_info,
      buy_stocks_info,
      can_directly_buy: canDirectlyBuy.value ? '是' : '否'
    };

    const jsonStr = JSON.stringify(exportData, null, 2);

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(jsonStr).then(() => {
        alert('交易计划已复制到剪贴板，标的持有状态已更新！');
      }).catch(err => {
        console.error('复制失败:', err);
        fallbackCopyTextToClipboard(jsonStr);
      });
    } else {
      fallbackCopyTextToClipboard(jsonStr);
    }
  } catch (error) {
    console.error('导出交易计划时出错:', error);
    alert('导出失败，请重试');
  }
}

function exportSuggestedHoldings() {
  try {
    const totalAsset = BASE_ASSET;
    const planDate = getLocalDateString();

    // Do NOT call updateTargetHoldStatus here — this function only exports suggestions based on current strategies' hold flags.
    const final_suggested_holdings = computeSuggestedHoldings(totalAsset, strategies.value.map)

    const exportData = {
      plan_date: planDate,
      final_suggested_holdings
    };

    const jsonStr = JSON.stringify(exportData, null, 2);

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(jsonStr).then(() => {
        alert('建议持仓已复制到剪贴板！');
      }).catch(err => {
        console.error('复制失败:', err);
        fallbackCopyTextToClipboard(jsonStr);
      });
    } else {
      fallbackCopyTextToClipboard(jsonStr);
    }
  } catch (error) {
    console.error('导出建议持仓时出错:', error);
    alert('导出失败，请重试');
  }
}

function updateTargetHoldStatus() {
  tradePlans.value.forEach(plan => {
    if (strategies.value.map[plan.strategy]) {
      if (plan.action === '买入') {
        const target = strategies.value.map[plan.strategy].targets.find(t => t.name === plan.target);
        if (target) {
          target.hold = true;
        }
      } else if (plan.action === '卖出') {
        const target = strategies.value.map[plan.strategy].targets.find(t => t.name === plan.target);
        if (target) {
          target.hold = false;
        }
      } else if (plan.action === '切换') {
        const fromTarget = strategies.value.map[plan.strategy].targets.find(t => t.name === plan.fromTarget);
        const toTarget = strategies.value.map[plan.strategy].targets.find(t => t.name === plan.toTarget);
        if (fromTarget) fromTarget.hold = false;
        if (toTarget) toTarget.hold = true;
      }
    }
  });

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
    alert('文本已复制到剪贴板（回退方式）');
  } catch (err) {
    console.error('Fallback: 无法复制文本', err);
    alert('复制失败，请手动复制以下内容:\n' + text);
  }
  document.body.removeChild(textArea);
}
</script>

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