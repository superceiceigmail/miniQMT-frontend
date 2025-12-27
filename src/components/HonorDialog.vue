<template>
  <div v-if="visible" class="dialog-overlay" @click="onOverlayClick">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h3>完成任务 - 记录荣誉</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      
      <div class="dialog-content">
        <div class="readonly-section">
          <div class="field-group">
            <label>内容：</label>
            <div class="readonly-value">{{ todo.content }}</div>
          </div>
          
          <div class="field-group">
            <label>分类：</label>
            <div class="readonly-value">{{ todo.category }}</div>
          </div>
          
          <div class="field-group">
            <label>标签：</label>
            <div class="readonly-value">{{ todo.tags?.join(', ') || '无' }}</div>
          </div>
          
          <div class="field-group">
            <label>重要性：</label>
            <div class="readonly-value">{{ todo.importance }}</div>
          </div>
        </div>
        
        <div class="input-section">
          <div class="field-group">
            <label for="points">积分：</label>
            <input 
              id="points" 
              v-model.number="honorData.points" 
              type="number" 
              step="0.1" 
              min="0"
              class="input-field"
            />
          </div>
          
          <div class="field-group">
            <label for="unit">单位：</label>
            <select id="unit" v-model="honorData.unit" class="select-field">
              <option value="天">天</option>
              <option value="小时">小时</option>
            </select>
          </div>
          
          <div class="field-group">
            <label for="project">项目：</label>
            <input 
              id="project" 
              v-model="honorData.project" 
              type="text" 
              placeholder="请输入项目名称"
              class="input-field"
            />
          </div>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="onConfirm">确认完成</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  todo: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'confirm'])

const honorData = reactive({
  points: 1.0,
  unit: '小时',
  project: ''
})

// Reset form when dialog opens
watch(() => props.visible, (newValue) => {
  if (newValue) {
    honorData.points = 1.0
    honorData.unit = '小时'
    honorData.project = ''
  }
})

const onOverlayClick = () => {
  emit('close')
}

const onConfirm = () => {
  if (!honorData.project.trim()) {
    alert('请输入项目名称')
    return
  }
  
  const honor = {
    ...props.todo,
    points: honorData.points,
    unit: honorData.unit,
    project: honorData.project.trim(),
    completed_at: new Date().toISOString()
  }
  
  emit('confirm', honor)
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e1e5e9;
}

.dialog-header h3 {
  margin: 0;
  color: #232946;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f5f5f5;
}

.dialog-content {
  padding: 24px;
}

.readonly-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e1e5e9;
}

.input-section {
  margin-top: 20px;
}

.field-group {
  margin-bottom: 16px;
}

.field-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

.readonly-value {
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  color: #6b7280;
}

.input-field,
.select-field {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.input-field:focus,
.select-field:focus {
  outline: none;
  border-color: #232946;
  box-shadow: 0 0 0 2px rgba(35, 41, 70, 0.1);
}

.dialog-footer {
  padding: 20px 24px;
  border-top: 1px solid #e1e5e9;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-primary {
  background: #232946;
  color: white;
}

.btn-primary:hover {
  background: #1a1f36;
}
</style>