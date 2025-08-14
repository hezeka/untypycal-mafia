<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="loading-section">
      <div class="card text-center">
        <div class="card-header">{{ hasUsername ? 'Сменить никнейм' : 'Установить никнейм' }}</div>
        
        <form @submit.prevent="saveUsername" class="join-form">
          <div class="input-group">
            <label for="username" class="input-label">Ваш никнейм:</label>
            <input 
              id="username"
              v-model="newUsername" 
              class="input" 
              :class="{
                'input-error': validation.error,
                'input-success': validation.isValid && newUsername.length > 0,
                'input-warning': validation.isChecking
              }"
              placeholder="Введите ваш никнейм" 
              required
              maxlength="15"
              autofocus
              @input="validateUsername"
              :disabled="validation.isChecking"
            >
            
            <!-- Индикатор валидации -->
            <div class="validation-feedback">
              <div v-if="validation.isChecking" class="validation-checking">
                <span class="spinner">⏳</span> Проверка доступности...
              </div>
              <div v-else-if="validation.error" class="validation-error">
                ❌ {{ validation.error }}
              </div>
              <div v-else-if="validation.isValid && newUsername.length > 0" class="validation-success">
                ✅ Никнейм доступен
              </div>
              <div v-else-if="newUsername.length > 0" class="validation-info">
                💡 Никнейм может содержать только буквы, цифры, дефис и подчеркивание
              </div>
            </div>
          </div>

          <!-- Предложения альтернативных имен -->
          <div v-if="validation.suggestions.length > 0" class="name-suggestions">
            <p class="suggestions-title">💡 Попробуйте эти варианты:</p>
            <div class="suggestions-list">
              <button 
                v-for="suggestion in validation.suggestions" 
                :key="suggestion"
                type="button"
                class="suggestion-btn"
                @click="selectSuggestion(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            class="btn btn-primary"
            :disabled="!canSaveUsername"
          >
            {{ validation.isChecking ? 'Проверка...' : 'Сохранить' }}
          </button>
        </form>

        <div class="mt-3">
          <button @click="$emit('close')" class="btn btn-secondary">
            Отмена
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  hasUsername: Boolean,
  currentUsername: String
})

const emit = defineEmits(['close'])

const { 
  validation,
  setUsername,
  changeUsername,
  validateUsernameFormat,
  checkUsernameAvailability,
  initializeUsername
} = useUser()

const newUsername = ref('')

// Computed properties
const canSaveUsername = computed(() => {
  const name = newUsername.value.trim()
  return name.length > 0 && !validation.error && !validation.isChecking
})

// Username validation with debouncing
let usernameValidationTimeout = null
const validateUsername = () => {
  clearTimeout(usernameValidationTimeout)
  
  const name = newUsername.value.trim()
  
  if (!name) {
    validation.error = null
    validation.isValid = false
    validation.suggestions = []
    return
  }
  
  // Immediate format validation
  const formatValidation = validateUsernameFormat(name)
  if (!formatValidation.valid) {
    validation.error = formatValidation.error
    validation.isValid = false
    validation.suggestions = []
    return
  }
  
  // Format is valid, clear error temporarily
  validation.error = null
  validation.isValid = true
  validation.suggestions = []
  
  // Debounced availability check
  usernameValidationTimeout = setTimeout(async () => {
    try {
      await checkUsernameAvailability(name)
    } catch (error) {
      console.error('Username validation error:', error)
    }
  }, 500)
}

// Username management methods
const saveUsername = async () => {
  if (!canSaveUsername.value) return
  
  try {
    const result = props.hasUsername 
      ? await changeUsername(newUsername.value.trim())
      : await setUsername(newUsername.value.trim())
    
    if (result.success) {
      emit('close')
      newUsername.value = ''
    }
  } catch (error) {
    validation.error = 'Ошибка при сохранении никнейма'
    console.error('Username save error:', error)
  }
}

const selectSuggestion = (suggestion) => {
  newUsername.value = suggestion
  validation.error = null
  validation.isValid = true
  validation.suggestions = []
  validation.isChecking = false
}

// Initialize when modal opens
watch(() => props.hasUsername, (hasUsername) => {
  newUsername.value = hasUsername ? props.currentUsername : initializeUsername()
  validation.error = null
  validation.isValid = hasUsername // If user already has username, it's valid
  validation.suggestions = []
  validation.isChecking = false
  
  // Auto-focus the input
  nextTick(() => {
    const input = document.getElementById('username')
    if (input) input.focus()
  })
}, { immediate: true })
</script>

<style lang="less" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  
  .loading-section {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: auto;
    
    .card {
      max-width: 500px;
      width: 100%;
    }
    
    .join-form {
      margin: 20px 0;
    }
  }
  
  .input-group {
    margin-bottom: 16px;
    
    .input-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
    }
    
    .input {
      transition: all 0.3s ease;
      
      &.input-error {
        border-color: #e74c3c;
        box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.3);
      }
      
      &.input-success {
        border-color: #2ecc71;
        box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.3);
      }
      
      &.input-warning {
        border-color: #f39c12;
        box-shadow: 0 0 0 2px rgba(243, 156, 18, 0.3);
      }
    }
  }
  
  .validation-feedback {
    margin-top: 8px;
    min-height: 20px;
    font-size: 13px;
    
    .validation-checking {
      color: #3498db;
      display: flex;
      align-items: center;
      gap: 6px;
      
      .spinner {
        animation: spin 1s linear infinite;
      }
    }
    
    .validation-error {
      color: #e74c3c;
      line-height: 1.4;
    }
    
    .validation-success {
      color: #2ecc71;
    }
    
    .validation-info {
      color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
    }
  }
  
  .name-suggestions {
    margin: 16px 0;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border-left: 3px solid #f39c12;
    
    .suggestions-title {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #f39c12;
      font-weight: 500;
    }
    
    .suggestions-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .suggestion-btn {
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      color: white;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.3s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: #f39c12;
        transform: translateY(-1px);
      }
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>