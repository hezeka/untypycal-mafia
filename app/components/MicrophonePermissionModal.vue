<template>
  <div v-if="isVisible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>🎤 Доступ к микрофону</h3>
        <button @click="closeModal" class="close-btn">✖</button>
      </div>
      
      <div class="modal-body">
        <div v-if="state === 'requesting'" class="permission-state">
          <div class="icon-section">
            <div class="microphone-icon">🎤</div>
            <div class="spinner"></div>
          </div>
          <h4>Запрос разрешения...</h4>
          <p>Пожалуйста, разрешите доступ к микрофону в диалоговом окне браузера.</p>
          <div class="instructions">
            <div class="instruction-item">
              <span class="step">1.</span>
              <span>Нажмите "Разрешить" в диалоге браузера</span>
            </div>
            <div class="instruction-item">
              <span class="step">2.</span>
              <span>Если диалог не появился, проверьте адресную строку</span>
            </div>
            <div class="instruction-item">
              <span class="step">3.</span>
              <span>Убедитесь, что микрофон подключен и работает</span>
            </div>
          </div>
        </div>
        
        <div v-else-if="state === 'denied'" class="permission-state error">
          <div class="icon-section">
            <div class="error-icon">🚫</div>
          </div>
          <h4>Доступ к микрофону заблокирован</h4>
          <p>Для работы голосовой активности необходимо разрешить доступ к микрофону.</p>
          
          <div class="help-section">
            <h5>Как разрешить доступ:</h5>
            <div class="browser-instructions">
              <div class="browser-type">
                <strong>Chrome / Edge:</strong>
                <ol>
                  <li>Нажмите на иконку 🔒 или 🎤 в адресной строке</li>
                  <li>Выберите "Разрешить" для микрофона</li>
                  <li>Обновите страницу</li>
                </ol>
              </div>
              
              <div class="browser-type">
                <strong>Firefox:</strong>
                <ol>
                  <li>Нажмите на иконку щита в адресной строке</li>
                  <li>Снимите блокировку микрофона</li>
                  <li>Обновите страницу</li>
                </ol>
              </div>
              
              <div class="browser-type">
                <strong>Safari:</strong>
                <ol>
                  <li>Меню Safari → Настройки → Веб-сайты</li>
                  <li>Найдите "Микрофон" в левой панели</li>
                  <li>Установите "Разрешить" для этого сайта</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="state === 'error'" class="permission-state error">
          <div class="icon-section">
            <div class="error-icon">⚠️</div>
          </div>
          <h4>Ошибка доступа к микрофону</h4>
          <p>{{ errorMessage }}</p>
          
          <div class="help-section">
            <h5>Возможные решения:</h5>
            <ul>
              <li>Убедитесь, что микрофон подключен и работает</li>
              <li>Проверьте, что микрофон не используется другим приложением</li>
              <li>Перезагрузите браузер</li>
              <li>Проверьте настройки звука в системе</li>
            </ul>
          </div>
        </div>
        
        <div v-else-if="state === 'success'" class="permission-state success">
          <div class="icon-section">
            <div class="success-icon">✅</div>
          </div>
          <h4>Микрофон подключен!</h4>
          <p>Доступ к микрофону получен. Теперь другие игроки будут видеть когда вы говорите.</p>
          
          <div class="success-features">
            <div class="feature-item">
              <span class="feature-icon">🟢</span>
              <span>Голосовая активность включена</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">⚙️</span>
              <span>Настройки доступны при наведении на кнопку микрофона</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🔒</span>
              <span>Данные остаются в браузере, звук не записывается</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <div v-if="state === 'requesting'" class="footer-actions">
          <button @click="retryPermission" class="btn btn-secondary">
            Повторить запрос
          </button>
          <button @click="closeModal" class="btn btn-primary">
            Продолжить без микрофона
          </button>
        </div>
        
        <div v-else-if="state === 'denied'" class="footer-actions">
          <button @click="retryPermission" class="btn btn-primary">
            Попробовать снова
          </button>
          <button @click="closeModal" class="btn btn-secondary">
            Продолжить без микрофона
          </button>
        </div>
        
        <div v-else-if="state === 'error'" class="footer-actions">
          <button @click="retryPermission" class="btn btn-primary">
            Попробовать снова
          </button>
          <button @click="closeModal" class="btn btn-secondary">
            Закрыть
          </button>
        </div>
        
        <div v-else-if="state === 'success'" class="footer-actions">
          <button @click="closeModal" class="btn btn-success">
            Готово
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'permission-granted', 'permission-denied', 'retry'])

const state = ref('requesting') // requesting, denied, error, success
const errorMessage = ref('')

// Watch for visibility changes to reset state
watch(() => props.isVisible, (visible) => {
  if (visible) {
    state.value = 'requesting'
    errorMessage.value = ''
  }
})

// Handle different permission states
const handlePermissionGranted = () => {
  state.value = 'success'
  emit('permission-granted')
}

const handlePermissionDenied = () => {
  state.value = 'denied'
  emit('permission-denied')
}

const handlePermissionError = (error) => {
  state.value = 'error'
  errorMessage.value = error.message || 'Неизвестная ошибка'
  emit('permission-denied')
}

const retryPermission = () => {
  state.value = 'requesting'
  errorMessage.value = ''
  emit('retry')
}

const closeModal = () => {
  emit('close')
}

const handleOverlayClick = () => {
  // Allow closing only if not in requesting state
  if (state.value !== 'requesting') {
    closeModal()
  }
}

// Expose methods for parent component
defineExpose({
  handlePermissionGranted,
  handlePermissionDenied,
  handlePermissionError
})
</script>

<style lang="less" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: rgba(20, 20, 20, 0.98);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h3 {
    margin: 0;
    color: white;
    font-size: 18px;
    font-weight: 600;
  }
  
  .close-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.modal-body {
  padding: 24px;
}

.permission-state {
  text-align: center;
  
  .icon-section {
    position: relative;
    margin-bottom: 20px;
    
    .microphone-icon, .error-icon, .success-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }
    
    .spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80px;
      height: 80px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top: 3px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }
  
  h4 {
    color: white;
    margin: 0 0 12px 0;
    font-size: 20px;
    font-weight: 600;
  }
  
  p {
    color: rgba(255, 255, 255, 0.8);
    margin: 0 0 20px 0;
    font-size: 14px;
    line-height: 1.5;
  }
  
  &.error {
    .error-icon {
      color: #e74c3c;
    }
    
    h4 {
      color: #e74c3c;
    }
  }
  
  &.success {
    .success-icon {
      color: #2ecc71;
    }
    
    h4 {
      color: #2ecc71;
    }
  }
}

.instructions {
  text-align: left;
  margin-top: 16px;
  
  .instruction-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    
    .step {
      background: #667eea;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
      margin-top: 1px;
    }
  }
}

.help-section {
  text-align: left;
  margin-top: 20px;
  
  h5 {
    color: white;
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
  }
  
  ul {
    margin: 0;
    padding-left: 20px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
    
    li {
      margin-bottom: 8px;
      line-height: 1.4;
    }
  }
}

.browser-instructions {
  .browser-type {
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border-left: 3px solid #667eea;
    
    strong {
      color: #667eea;
      font-size: 13px;
    }
    
    ol {
      margin: 8px 0 0 0;
      padding-left: 20px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;
      
      li {
        margin-bottom: 4px;
        line-height: 1.3;
      }
    }
  }
}

.success-features {
  text-align: left;
  margin-top: 16px;
  
  .feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
    
    .feature-icon {
      font-size: 16px;
    }
  }
}

.modal-footer {
  padding: 16px 24px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  
  .footer-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      
      &.btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        
        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
      }
      
      &.btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.2);
        
        &:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
      }
      
      &.btn-success {
        background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
        color: white;
        
        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(46, 204, 113, 0.4);
        }
      }
    }
  }
}

@keyframes spin {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 20px;
  }
  
  .modal-header, .modal-body, .modal-footer {
    padding-left: 16px;
    padding-right: 16px;
  }
  
  .footer-actions {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
}
</style>