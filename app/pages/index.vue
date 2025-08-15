<template>
  <div class="home-page">
    <div class="container">

      <!-- Welcome Section -->
      <div class="welcome-section">
        <div class="hero">
          <h1>Нетипичная Мафия</h1>
          <p class="hero-subtitle">Онлайн платформа для игры в Werewolf</p>
        </div>

        <div class="action-cards">
          <div class="card action-card">
            <div class="card-header">Создать комнату</div>
            <p class="text-muted mb-2">Станьте ведущим и создайте новую игру</p>
            
            <button 
              @click="showCreateRoomModal" 
              class="btn btn-primary"
              :disabled="!hasUsername"
            >
              {{ hasUsername ? 'Создать игру' : 'Сначала установите никнейм' }}
            </button>
          </div>

          <div class="card action-card">
            <div class="card-header">Присоединиться</div>
            <p class="text-muted mb-2">Введите код комнаты чтобы присоединиться</p>
            <div class="input-group">
              <input 
                v-model="roomCode" 
                class="input"
                :class="{
                  'input-error': roomValidation.error,
                  'input-success': roomValidation.valid && roomCode.length > 0
                }"
                placeholder="Код комнаты (например: ABC123)" 
                maxlength="6"
                style="text-transform: uppercase"
                @input="validateRoomCode"
                :disabled="!hasUsername"
              >
              
              <div class="validation-feedback">
                <div v-if="roomValidation.error" class="validation-error">
                  ❌ {{ roomValidation.error }}
                </div>
                <div v-else-if="roomValidation.valid && roomCode.length > 0" class="validation-success">
                  ✅ Формат кода правильный
                </div>
                <div v-else-if="roomCode.length > 0" class="validation-info">
                  💡 6 символов: буквы и цифры
                </div>
              </div>
            </div>
            
            <button 
              @click="joinRoom" 
              class="btn btn-secondary"
              :disabled="!canJoinRoom"
            >
              {{ hasUsername ? 'Присоединиться' : 'Сначала установите никнейм' }}
            </button>
          </div>
        </div>

        <!-- Публичные игры -->
        <div class="public-games-section">
          <div class="card">
            <div class="card-header">🌍 Публичные игры</div>
            <div v-if="publicRooms.length > 0" class="public-rooms-grid">
              <div 
                v-for="room in publicRooms" 
                :key="room.id"
                class="public-room-card"
                @click="joinPublicRoom(room.id)"
              >
                <div class="room-header">
                  <span class="room-id">{{ room.id }}</span>
                  <span class="room-status" :class="`status-${room.gameState}`">
                    {{ getGameStateText(room.gameState) }}
                  </span>
                </div>
                <div class="room-info">
                  <div class="room-host">👑 {{ room.hostName }}</div>
                  <div class="room-players">👥 {{ room.playerCount }}/{{ room.maxPlayers }}</div>
                  <div class="room-roles" v-if="room.selectedRolesCount > 0">
                    🎭 {{ room.selectedRolesCount }} ролей
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else class="no-public-games">
              <p>В данный момент нет активных публичных игр</p>
              <p class="text-muted">Создайте свою публичную игру или присоединитесь по коду комнаты</p>
            </div>
            
            <p v-if="publicRooms.length > 0" class="public-games-note">
              💡 Нажмите на игру чтобы присоединиться
            </p>
          </div>
        </div>

        <div class="info-section mt-3">
          <div class="card">
            <div class="card-header">Как играть</div>
            <div class="info-grid">
              <div class="info-item">
                <h4>1. Подготовка</h4>
                <p>Ведущий выбирает роли и игроки присоединяются к комнате</p>
              </div>
              <div class="info-item">
                <h4>2. Ночная фаза</h4>
                <p>Игроки с ночными способностями выполняют свои действия</p>
              </div>
              <div class="info-item">
                <h4>3. Дневная фаза</h4>
                <p>Обсуждение и поиск оборотней среди игроков</p>
              </div>
              <div class="info-item">
                <h4>4. Голосование</h4>
                <p>Все игроки голосуют за подозреваемого в том, что он оборотень</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Правила для имен -->
        <div class="rules-section" style="display: none;">
          <div class="card">
            <div class="card-header">📋 Правила для имен игроков</div>
            <div class="rules-content">
              <div class="rules-grid">
                <div class="rule-item">
                  <span class="rule-icon">✅</span>
                  <span>Буквы (A-Z, а-я)</span>
                </div>
                <div class="rule-item">
                  <span class="rule-icon">✅</span>
                  <span>Цифры (0-9)</span>
                </div>
                <div class="rule-item">
                  <span class="rule-icon">✅</span>
                  <span>Дефис (-) и подчеркивание (_)</span>
                </div>
                <div class="rule-item">
                  <span class="rule-icon">❌</span>
                  <span>Пробелы</span>
                </div>
                <div class="rule-item">
                  <span class="rule-icon">❌</span>
                  <span>Слеши (/) и спецсимволы</span>
                </div>
                <div class="rule-item">
                  <span class="rule-icon">📏</span>
                  <span>От 1 до 15 символов</span>
                </div>
              </div>
              <p class="rules-note">
                💡 <strong>Почему эти ограничения?</strong> Они предотвращают проблемы с командами чата и обеспечивают стабильную работу игры.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Create Room Modal -->
      <div v-if="showCreateModal" class="modal-overlay">
        <div class="bg-overlay" @click="showCreateModal = false"></div>
        <div class="loading-section">
          <div class="card text-center">
            <div class="card-header">Создать игру</div>
            
            <form @submit.prevent="createRoom" class="join-form">
              <div class="privacy-switch-container">
                <label class="privacy-switch">
                  <input 
                    type="checkbox" 
                    v-model="isPrivateRoom"
                    class="switch-input"
                  >
                  <span class="switch-slider"></span>
                </label>
                <span class="privacy-label-text">Приватная игра</span>
              </div>
              
              <p class="privacy-description">
                {{ isPrivateRoom 
                  ? 'Только по ссылке - игра не будет отображаться на главной странице' 
                  : 'Публичная игра будет отображаться на главной странице для всех' 
                }}
              </p>
              
              <div style="display: flex; gap: 16px; justify-content: center; margin-top: 20px;">
                <button 
                  type="submit" 
                  class="btn btn-primary"
                >
                  Создать игру
                </button>
                <button 
                  type="button"
                  @click="showCreateModal = false" 
                  class="btn btn-secondary"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Username Modal -->
      <div v-if="showUsernameModal" class="modal-overlay">
        <div class="bg-overlay" @click="showUsernameModal = false"></div>
        <div class="loading-section">
          <div class="card text-center">
            <div class="card-header">{{ hasUsername ? 'Сменить никнейм' : 'Установить никнейм' }}</div>
            
            <form @submit.prevent="saveUsername" class="join-form">
              <div class="input-group">
                <label for="newUsername" class="input-label">Ваш никнейм:</label>
                <input 
                  id="newUsername"
                  v-model="newUsername" 
                  class="input" 
                  :class="{
                    'input-error': validation.error,
                    'input-success': validation.isValid && newUsername.length > 0,
                    'input-warning': validation.isChecking
                  }"
                  style="text-align: center;"
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
                    <span class="spinner">⌛</span> Проверка доступности...
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
              
              <div style="display: flex;gap: 16px; justify-content: center;">
                <button 
                  type="submit" 
                  class="btn btn-primary"
                  :disabled="!canSaveUsername"
                >
                  {{ validation.isChecking ? 'Проверка...' : 'Сохранить' }}
                </button>
                <button @click="showUsernameModal = false" class="btn btn-secondary">
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, nextTick } from 'vue'

const { 
  createRoom: createGameRoom,
  initSocketListeners
} = useGame()

const { 
  username,
  hasUsername,
  validation,
  setUsername,
  changeUsername,
  initializeUsername,
  validateUsernameFormat,
  checkUsernameAvailability
} = useUser()

// Local reactive data
const roomCode = ref('')
const showUsernameModal = ref(false)
const showCreateModal = ref(false)
const newUsername = ref('')
const isPrivateRoom = ref(false)
const publicRooms = ref([])

// Validation states
const roomValidation = reactive({
  valid: false,
  error: null
})

// Computed properties
const canJoinRoom = computed(() => {
  return hasUsername.value && roomCode.value.trim().length > 0 && roomValidation.valid
})

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

const validateRoomCode = () => {
  const code = roomCode.value.trim().toUpperCase()
  
  if (!code) {
    roomValidation.error = null
    roomValidation.valid = false
    return
  }

  if (code.length !== 6) {
    roomValidation.error = 'Код должен содержать 6 символов'
    roomValidation.valid = false
    return
  }

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    roomValidation.error = 'Только буквы и цифры'
    roomValidation.valid = false
    return
  }

  roomValidation.error = null
  roomValidation.valid = true
}

// Username management methods
const saveUsername = async () => {
  if (!canSaveUsername.value) return
  
  try {
    const result = hasUsername.value 
      ? await changeUsername(newUsername.value.trim())
      : await setUsername(newUsername.value.trim())
    
    if (result.success) {
      showUsernameModal.value = false
      newUsername.value = ''
    } else {
      // Error is already set in validation state by useUser
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

const showCreateRoomModal = () => {
  if (!hasUsername.value) {
    showUsernameModal.value = true
    return
  }
  showCreateModal.value = true
}

// Room methods
const createRoom = async () => {
  await createGameRoom(username.value, isPrivateRoom.value)
  showCreateModal.value = false
}

const joinRoom = () => {
  if (!canJoinRoom.value) {
    if (!hasUsername.value) {
      showUsernameModal.value = true
      return
    }
    return
  }
  
  const code = roomCode.value.trim().toUpperCase()
  navigateTo(`/game/${code}`)
}

const joinPublicRoom = (roomId) => {
  if (!hasUsername.value) {
    showUsernameModal.value = true
    return
  }
  
  navigateTo(`/game/${roomId}`)
}

const getGameStateText = (gameState) => {
  const stateTexts = {
    'setup': 'Набор',
    'day': 'День', 
    'night': 'Ночь',
    'voting': 'Голосование',
    'ended': 'Завершена'
  }
  return stateTexts[gameState] || gameState
}

const loadPublicRooms = async () => {
  try {
    const response = await fetch('/api/public-rooms')
    if (response.ok) {
      publicRooms.value = await response.json()
    }
  } catch (error) {
    console.error('Failed to load public rooms:', error)
  }
}

// Watch for room creation to redirect
const { room } = useGame()
watch(() => room.id, (newRoomId) => {
  if (newRoomId) {
    navigateTo(`/game/${newRoomId}`)
  }
})

// Initialize username modal when needed
watch(() => showUsernameModal.value, (isOpen) => {
  if (isOpen) {
    newUsername.value = hasUsername.value ? username.value : initializeUsername()
    validation.error = null
    validation.isValid = hasUsername.value // If user already has username, it's valid
    validation.suggestions = []
    validation.isChecking = false
    
    // Auto-focus the input
    nextTick(() => {
      const input = document.getElementById('newUsername')
      if (input) input.focus()
    })
  }
})

// Initialize socket listeners on mount
onMounted(() => {
  initSocketListeners()
  loadPublicRooms()
  
  // Auto-open username modal if no username set
  if (!hasUsername.value) {
    // Small delay to ensure page is fully loaded
    setTimeout(() => {
      showUsernameModal.value = true
    }, 500)
  }
  
  // Refresh public rooms every 30 seconds
  setInterval(loadPublicRooms, 30000)
})
</script>

<style lang="less" scoped>
.home-page {
  min-height: 100vh;
  padding: 20px 0;
}

.modal-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 12px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  .bg-overlay {
    position: absolute;
    left: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    cursor: pointer;
  }
  
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

.welcome-section {
  .hero {
    text-align: center;
    margin-bottom: 40px;
    
    h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .hero-subtitle {
      font-size: 1.2rem;
      color: rgba(255, 255, 255, 0.7);
    }
  }
  
  .action-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
  }
  
  .action-card {
    text-align: center;
  }
  
  .info-section {
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .info-item {
      h4 {
        color: #667eea;
        margin-bottom: 8px;
      }
      
      p {
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
      }
    }
  }
}

.input-group {
  margin-bottom: 16px;
  
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
  }
}

.validation-feedback {
  margin-top: 8px;
  min-height: 20px;
  font-size: 12px;
  
  .validation-error {
    color: #e74c3c;
  }
  
  .validation-success {
    color: #2ecc71;
  }
  
  .validation-info {
    color: rgba(255, 255, 255, 0.6);
  }
}

.rules-section {
  margin-top: 40px;
  
  .rules-content {
    .rules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .rule-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      font-size: 14px;
      
      .rule-icon {
        font-size: 16px;
        min-width: 20px;
      }
    }
    
    .rules-note {
      background: rgba(102, 126, 234, 0.1);
      border: 1px solid rgba(102, 126, 234, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin: 0;
      font-size: 13px;
      line-height: 1.4;
      color: rgba(255, 255, 255, 0.8);
    }
  }
}

.privacy-toggle {
  .privacy-label {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    margin: 0;
    
    .privacy-checkbox {
      width: 18px;
      height: 18px;
      accent-color: #667eea;
      cursor: pointer;
    }
    
    .privacy-text {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      
      .privacy-icon {
        font-size: 16px;
      }
    }
    
    &:hover .privacy-text {
      color: #667eea;
    }
  }
  
  .privacy-description {
    margin: 8px 0 0 30px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.4;
  }
}

.privacy-switch-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 20px 0;
}

.privacy-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;

  .switch-input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .switch-slider {
      background-color: #667eea;
    }

    &:checked + .switch-slider:before {
      transform: translateX(26px);
    }
  }

  .switch-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 24px;

    &:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
  }
}

.privacy-label-text {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.privacy-description {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
  text-align: center;
  margin: 16px 0;
  max-width: 400px;
}

.public-games-section {
  margin: 40px 0;
  
  .public-rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    margin: 20px 0;
  }
  
  .public-room-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }
    
    .room-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      
      .room-id {
        font-weight: 600;
        font-size: 18px;
        color: #667eea;
        font-family: 'Courier New', monospace;
        letter-spacing: 1px;
      }
      
      .room-status {
        padding: 4px 8px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 500;
        
        &.status-setup {
          background: rgba(46, 204, 113, 0.2);
          color: #2ecc71;
        }
        
        &.status-day {
          background: rgba(243, 156, 18, 0.2);
          color: #f39c12;
        }
        
        &.status-night {
          background: rgba(155, 89, 182, 0.2);
          color: #9b59b6;
        }
        
        &.status-voting {
          background: rgba(231, 76, 60, 0.2);
          color: #e74c3c;
        }
        
        &.status-ended {
          background: rgba(149, 165, 166, 0.2);
          color: #95a5a6;
        }
      }
    }
    
    .room-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 14px;
      
      .room-host {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 500;
      }
      
      .room-players {
        color: rgba(255, 255, 255, 0.7);
      }
      
      .room-roles {
        color: rgba(255, 255, 255, 0.7);
      }
    }
  }
  
  .public-games-note {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
    margin: 16px 0 0 0;
  }
  
  .no-public-games {
    text-align: center;
    padding: 40px 20px;
    color: rgba(255, 255, 255, 0.7);
    
    p {
      margin: 8px 0;
      
      &.text-muted {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
      }
    }
  }
}

@media (max-width: 768px) {
  .hero h1 {
    font-size: 2rem !important;
  }
  
  .rules-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>