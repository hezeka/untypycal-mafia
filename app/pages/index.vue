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
            <form @submit.prevent="createRoom">
              <div class="input-group">
                <input 
                  v-model="playerName" 
                  class="input"
                  :class="{
                    'input-error': nameValidation.error,
                    'input-success': nameValidation.valid && playerName.length > 0
                  }"
                  placeholder="Ваше имя (как ведущий)" 
                  required
                  maxlength="15"
                  @input="validateName"
                >
                
                <div class="validation-feedback">
                  <div v-if="nameValidation.error" class="validation-error">
                    ❌ {{ nameValidation.error }}
                  </div>
                  <div v-else-if="nameValidation.valid && playerName.length > 0" class="validation-success">
                    ✅ Имя корректно
                  </div>
                  <div v-else-if="playerName.length > 0" class="validation-info">
                    💡 Без пробелов и слешей
                  </div>
                </div>
              </div>
              
              <button 
                type="submit" 
                class="btn btn-primary"
                :disabled="!canCreateRoom"
              >
                Создать игру
              </button>
            </form>
          </div>

          <div class="card action-card">
            <div class="card-header">Присоединиться</div>
            <p class="text-muted mb-2">Введите код комнаты чтобы присоединиться</p>
            <form @submit.prevent="joinRoom">
              <div class="input-group">
                <input 
                  v-model="roomCode" 
                  class="input"
                  :class="{
                    'input-error': roomValidation.error,
                    'input-success': roomValidation.valid && roomCode.length > 0
                  }"
                  placeholder="Код комнаты (например: ABC123)" 
                  required
                  maxlength="6"
                  style="text-transform: uppercase"
                  @input="validateRoomCode"
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
                type="submit" 
                class="btn btn-secondary"
                :disabled="!canJoinRoom"
              >
                Присоединиться
              </button>
            </form>
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
        <div class="rules-section">
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
    </div>
  </div>
</template>

<script setup>
const { 
  createRoom: createGameRoom,
  initSocketListeners
} = useGame()

// Local reactive data
const playerName = ref('')
const roomCode = ref('')

// Validation states
const nameValidation = reactive({
  valid: false,
  error: null
})

const roomValidation = reactive({
  valid: false,
  error: null
})

// Computed properties
const canCreateRoom = computed(() => {
  return playerName.value.trim().length > 0 && nameValidation.valid
})

const canJoinRoom = computed(() => {
  return roomCode.value.trim().length > 0 && roomValidation.valid
})

// Validation functions
const validateName = () => {
  const name = playerName.value.trim()
  
  if (!name) {
    nameValidation.error = null
    nameValidation.valid = false
    return
  }

  if (name.length > 15) {
    nameValidation.error = 'Имя слишком длинное (максимум 15 символов)'
    nameValidation.valid = false
    return
  }

  if (!/^[a-zA-Zа-яА-Я0-9_-]*$/.test(name)) {
    nameValidation.error = 'Недопустимые символы'
    nameValidation.valid = false
    return
  }

  if (name.length > 0 && !/^[a-zA-Zа-яА-Я]/.test(name)) {
    nameValidation.error = 'Имя должно начинаться с буквы'
    nameValidation.valid = false
    return
  }

  if (name.includes('/')) {
    nameValidation.error = 'Символ "/" запрещен'
    nameValidation.valid = false
    return
  }

  if (name.includes(' ')) {
    nameValidation.error = 'Пробелы запрещены'
    nameValidation.valid = false
    return
  }

  // Проверка на системные имена
  const forbiddenNames = ['система', 'system', 'админ', 'admin', 'ведущий', 'host', 'все', 'оборотни', 'деревня']
  if (forbiddenNames.includes(name.toLowerCase())) {
    nameValidation.error = 'Это имя зарезервировано'
    nameValidation.valid = false
    return
  }

  nameValidation.error = null
  nameValidation.valid = true
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

// Methods
const createRoom = async () => {
  if (!canCreateRoom.value) return
  
  await createGameRoom(playerName.value.trim())
}

const joinRoom = () => {
  if (!canJoinRoom.value) return
  
  const code = roomCode.value.trim().toUpperCase()
  navigateTo(`/game/${code}`)
}

// Watch for room creation to redirect
const { room } = useGame()
watch(() => room.id, (newRoomId) => {
  if (newRoomId) {
    navigateTo(`/game/${newRoomId}`)
  }
})

// Initialize socket listeners on mount
onMounted(() => {
  initSocketListeners()
})
</script>

<style lang="less" scoped>
.home-page {
  min-height: 100vh;
  padding: 20px 0;
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

@media (max-width: 768px) {
  .hero h1 {
    font-size: 2rem !important;
  }
  
  .rules-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>