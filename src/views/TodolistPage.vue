<template>
  <div class="todolist-page">
    <div class="page-header">
      <h1>待办事项</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="refreshData">刷新</button>
      </div>
    </div>
    
    <div class="content-wrapper">
      <div v-if="loading" class="loading">
        加载中...
      </div>
      
      <div v-else-if="error" class="error">
        {{ error }}
        <button class="btn btn-secondary" @click="loadTodos">重试</button>
      </div>
      
      <div v-else class="todo-list">
        <div v-if="todos.length === 0" class="empty-state">
          <p>暂无待办事项</p>
        </div>
        
        <div v-else class="todo-items">
          <div 
            v-for="todo in todos" 
            :key="todo.id"
            class="todo-item"
            :class="{ 'selected': selectedTodo?.id === todo.id }"
            @click="selectTodo(todo)"
          >
            <div class="todo-content">
              <div class="todo-main">
                <h3 class="todo-title">{{ todo.content }}</h3>
                <div class="todo-meta">
                  <span class="category">{{ todo.category }}</span>
                  <span class="importance" :class="importanceClass(todo.importance)">
                    {{ todo.importance }}
                  </span>
                  <span class="date">{{ formatDate(todo.created_at) }}</span>
                </div>
              </div>
              
              <div class="todo-tags">
                <span 
                  v-for="tag in todo.tags" 
                  :key="tag" 
                  class="tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            
            <div class="todo-actions">
              <button 
                class="btn btn-complete"
                @click.stop="completeTodo(todo)"
                :disabled="completing"
              >
                {{ completing && selectedTodo?.id === todo.id ? '处理中...' : '完成' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Honor Dialog -->
    <HonorDialog 
      :visible="showHonorDialog"
      :todo="selectedTodo"
      @close="closeHonorDialog"
      @confirm="confirmComplete"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import HonorDialog from '../components/HonorDialog.vue'

const todos = ref([])
const selectedTodo = ref(null)
const showHonorDialog = ref(false)
const loading = ref(false)
const error = ref('')
const completing = ref(false)

onMounted(() => {
  loadTodos()
})

const loadTodos = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const response = await fetch('/gui/data/todo.json')
    if (!response.ok) {
      throw new Error('Failed to load todos')
    }
    const data = await response.json()
    todos.value = Array.isArray(data) ? data : []
  } catch (err) {
    error.value = '加载待办事项失败：' + err.message
    console.error('Error loading todos:', err)
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadTodos()
}

const selectTodo = (todo) => {
  selectedTodo.value = todo
}

const completeTodo = (todo) => {
  selectedTodo.value = todo
  showHonorDialog.value = true
}

const closeHonorDialog = () => {
  showHonorDialog.value = false
  selectedTodo.value = null
}

const confirmComplete = async (honor) => {
  completing.value = true
  
  try {
    // Add honor to diary.json
    await addHonorToDiary(honor)
    
    // Remove todo from todo.json
    await removeTodoFromList(honor.id)
    
    // Refresh the page
    await loadTodos()
    
    showHonorDialog.value = false
    selectedTodo.value = null
    
    alert('任务已完成，荣誉已记录！')
    
  } catch (err) {
    alert('操作失败：' + err.message)
    console.error('Error completing todo:', err)
  } finally {
    completing.value = false
  }
}

const addHonorToDiary = async (honor) => {
  try {
    // Get current diary data
    const response = await fetch('/gui/data/diary.json')
    let diaryData = { records: [] }
    
    if (response.ok) {
      diaryData = await response.json()
    }
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0]
    
    // Find or create today's record
    let todayRecord = diaryData.records.find(record => record.date === today)
    
    if (!todayRecord) {
      todayRecord = {
        date: today,
        honors: []
      }
      diaryData.records.push(todayRecord)
    }
    
    // Add honor to today's record
    todayRecord.honors.push(honor)
    
    // Note: In a real application, this would be sent to a backend API
    // For this demo, we're simulating the data update
    console.log('Honor added to diary:', honor)
    console.log('Updated diary data:', diaryData)
    
  } catch (err) {
    throw new Error('Failed to add honor to diary: ' + err.message)
  }
}

const removeTodoFromList = async (todoId) => {
  try {
    // Remove from local state
    todos.value = todos.value.filter(todo => todo.id !== todoId)
    
    // Note: In a real application, this would be sent to a backend API
    // For this demo, we're simulating the data update
    console.log('Todo removed from list:', todoId)
    
  } catch (err) {
    throw new Error('Failed to remove todo: ' + err.message)
  }
}

const importanceClass = (importance) => {
  switch (importance) {
    case '紧急': return 'urgent'
    case '重要': return 'important'
    case '一般': return 'normal'
    default: return 'normal'
  }
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.todolist-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e1e5e9;
}

.page-header h1 {
  margin: 0;
  color: #232946;
  font-size: 28px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.content-wrapper {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading,
.error {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}

.error {
  color: #dc2626;
}

.empty-state {
  padding: 60px 40px;
  text-align: center;
  color: #6b7280;
}

.todo-items {
  padding: 0;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background-color 0.2s;
}

.todo-item:hover {
  background: #f9fafb;
}

.todo-item.selected {
  background: #eef2ff;
  border-left: 4px solid #232946;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-main {
  margin-bottom: 12px;
}

.todo-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #111827;
  line-height: 1.5;
}

.todo-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.category {
  background: #e5e7eb;
  color: #374151;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.importance {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.importance.urgent {
  background: #fee2e2;
  color: #dc2626;
}

.importance.important {
  background: #fef3c7;
  color: #d97706;
}

.importance.normal {
  background: #e0f2fe;
  color: #0369a1;
}

.date {
  color: #6b7280;
  font-size: 12px;
}

.todo-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  background: #f3f4f6;
  color: #4b5563;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 11px;
  border: 1px solid #e5e7eb;
}

.todo-actions {
  margin-left: 16px;
  flex-shrink: 0;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  font-weight: 500;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #232946;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1a1f36;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-complete {
  background: #10b981;
  color: white;
}

.btn-complete:hover:not(:disabled) {
  background: #059669;
}
</style>