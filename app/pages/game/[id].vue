<template>
  <div class="game-page">
    <div class="container">
      <!-- Room not found or loading - показываем ПЕРВЫМ -->
      <div v-if="!isInRoom" class="loading-section">
        <div class="card text-center">
          <div class="card-header">Присоединение к комнате {{ route.params.id }}</div>
          
          <form @submit.prevent="joinRoom" class="join-form">
            <div class="input-group">
              <label for="playerName" class="input-label">Ваше имя:</label>
              <input 
                id="playerName"
                v-model="playerName" 
                class="input" 
                :class="{
                  'input-error': nameValidation.error,
                  'input-success': nameValidation.valid && playerName.length > 0,
                  'input-warning': nameValidation.changed
                }"
                placeholder="Введите ваше имя" 
                required
                maxlength="15"
                autofocus
                @input="validateNameInput"
                @blur="checkNameAvailability"
              >
              
              <!-- Индикатор валидации -->
              <div class="validation-feedback">
                <div v-if="nameValidation.checking" class="validation-checking">
                  <span class="spinner">⏳</span> Проверка доступности...
                </div>
                <div v-else-if="nameValidation.error" class="validation-error">
                  ❌ {{ nameValidation.error }}
                </div>
                <div v-else-if="nameValidation.valid && playerName.length > 0" class="validation-success">
                  ✅ {{ nameValidation.changed ? `Будет использовано: "${nameValidation.formattedName}"` : 'Имя доступно' }}
                </div>
                <div v-else-if="playerName.length > 0" class="validation-info">
                  💡 Имя может содержать только буквы, цифры, дефис и подчеркивание
                </div>
              </div>
            </div>

            <!-- Предложения альтернативных имен -->
            <div v-if="nameSuggestions.length > 0" class="name-suggestions">
              <p class="suggestions-title">💡 Попробуйте эти варианты:</p>
              <div class="suggestions-list">
                <button 
                  v-for="suggestion in nameSuggestions" 
                  :key="suggestion"
                  type="button"
                  class="suggestion-btn"
                  @click="selectSuggestion(suggestion)"
                >
                  {{ suggestion }}
                </button>
              </div>
            </div>

            <!-- Правила для имен -->
            <div class="name-rules">
              <details>
                <summary>📋 Правила для имен</summary>
                <ul class="rules-list">
                  <li>От 1 до 15 символов</li>
                  <li>Только буквы, цифры, дефис (-) и подчеркивание (_)</li>
                  <li>Должно начинаться с буквы</li>
                  <li>Пробелы и слеши (/) запрещены</li>
                  <li>Имя должно быть уникальным в комнате</li>
                </ul>
              </details>
            </div>
            
            <button 
              type="submit" 
              class="btn btn-primary"
              :disabled="!canJoin"
            >
              {{ nameValidation.checking ? 'Проверка...' : 'Присоединиться к игре' }}
            </button>
          </form>

          <div class="mt-3">
            <NuxtLink to="/" class="btn btn-secondary">
              Вернуться на главную
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Game Setup Section -->
      <div v-else-if="gameState === 'setup'" class="setup-section">
        <div class="room-header">
          <h2>Комната: {{ roomId }}</h2>
          <div class="room-info">
            <span class="text-muted">{{ isHost ? 'Вы ведущий' : 'Ведущий: ' + hostName }}</span>
            <span class="player-count">Игроков: {{ players.length }}</span>
          </div>
        </div>

        <div class="setup-grid">
          <!-- Roles Selection (Host only) -->
          <div v-if="isHost" class="roles-section">
            <div class="card">
              <div class="card-header">
                Выбор ролей
                <span class="role-counter">({{ selectedRoles.length }} выбрано)</span>
              </div>
              <div class="roles-grid">
                <RoleCard
                  v-for="(role, roleId) in roles"
                  :key="roleId"
                  :role="role"
                  :role-id="roleId"
                  :selected="selectedRoles.includes(roleId)"
                  @toggle="toggleRole"
                />
              </div>
            </div>
          </div>

          <!-- Players and Chat -->
          <div class="game-sidebar">
            <!-- Players List -->
            <div class="card mb-2">
              <div class="card-header">Игроки</div>
              <div class="players-list">
                <div 
                  v-for="player in players" 
                  :key="player.id"
                  class="player-item"
                  :class="{ 
                    'is-host': player.id === hostId,
                    'is-disconnected': !player.connected,
                    'is-self': player.id === currentPlayerId
                  }"
                >
                  <div class="player-main-info">
                    <span class="player-name">
                      {{ player.name }}
                      <span v-if="!player.connected" class="disconnected-badge">😴</span>
                    </span>
                    <span v-if="player.id === hostId" class="host-badge">Ведущий</span>
                  </div>
                  
                  <!-- Show role if it's the current player or if game started -->
                  <div v-if="player.role && (player.id === currentPlayerId || gameState !== 'setup')" class="player-role">
                    <span class="role-badge" :class="roles[player.role]?.color">
                      {{ roles[player.role]?.name }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Selected Roles Display -->
            <div class="card mb-2" v-if="selectedRoles.length > 0">
              <div class="card-header">Выбранные роли</div>
              <div class="selected-roles-list">
                <div 
                  v-for="roleId in selectedRoles" 
                  :key="roleId"
                  class="role-tag"
                  :class="roles[roleId].color"
                >
                  {{ roles[roleId].name }}
                </div>
              </div>
            </div>

            <!-- Chat -->
            <GameChat />

            <!-- Start Game Button -->
            <button 
              v-if="isHost"
              @click="startGame"
              class="btn btn-success"
              :disabled="players.length !== selectedRoles.length || players.length < 2"
            >
              {{ players.length === selectedRoles.length ? 'Начать игру' : `Нужно ${players.length} ролей для игроков` }}
            </button>
          </div>
        </div>
      </div>

      <!-- Game in Progress -->
      <GameBoard v-else />
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const router = useRouter()

const { 
  isInRoom, 
  isHost, 
  room, 
  gameData, 
  roles,
  allPlayers,
  initSocketListeners,
  joinRoom: joinGameRoom,
  selectRole,
  removeRole,
  startGame: startNewGame
} = useGame()

const { socket } = useSocket()

// Local reactive data
const playerName = ref('')
const nameSuggestions = ref([])
const nameValidation = reactive({
  valid: false,
  error: null,
  checking: false,
  changed: false,
  formattedName: null
})

// Computed properties
const roomId = computed(() => route.params.id)
const hostId = computed(() => room.hostId)
const gameState = computed(() => gameData.gameState)
const players = computed(() => allPlayers.value)
const selectedRoles = computed(() => gameData.selectedRoles)

const currentPlayerId = computed(() => {
  return socket?.id
})

const hostName = computed(() => {
  const hostPlayer = gameData.players.find(p => p.id === hostId.value)
  return hostPlayer ? hostPlayer.name : 'Неизвестно'
})

const canJoin = computed(() => {
  return playerName.value.trim().length > 0 && 
         nameValidation.valid && 
         !nameValidation.checking
})

// Валидация имени в реальном времени
const validateNameInput = debounce(() => {
  const name = playerName.value.trim()
  
  if (!name) {
    resetValidation()
    return
  }

  // Базовая клиентская валидация
  if (name.length > 15) {
    setValidationError('Имя слишком длинное (максимум 15 символов)')
    return
  }

  if (!/^[a-zA-Zа-яА-Я0-9_-]*$/.test(name)) {
    setValidationError('Недопустимые символы. Используйте только буквы, цифры, дефис и подчеркивание')
    return
  }

  if (name.length > 0 && !/^[a-zA-Zа-яА-Я]/.test(name)) {
    setValidationError('Имя должно начинаться с буквы')
    return
  }

  if (name.includes('/')) {
    setValidationError('Символ "/" запрещен в именах')
    return
  }

  if (name.includes(' ')) {
    setValidationError('Пробелы запрещены в именах')
    return
  }

  // Если базовая валидация прошла, сбрасываем ошибки
  nameValidation.error = null
  nameValidation.valid = true
}, 300)

// Проверка доступности имени на сервере
const checkNameAvailability = debounce(() => {
  const name = playerName.value.trim()
  
  if (!name || nameValidation.error) return
  
  nameValidation.checking = true
  
  socket.emit('check-name-availability', {
    roomId: roomId.value,
    playerName: name
  })
}, 500)

// Обработчики событий сокета
const setupSocketListeners = () => {
  socket.on('name-check-result', (result) => {
    nameValidation.checking = false
    
    if (result.available) {
      nameValidation.valid = true
      nameValidation.error = null
      nameValidation.changed = result.changed
      nameValidation.formattedName = result.formattedName
      nameSuggestions.value = []
    } else {
      nameValidation.valid = false
      nameValidation.error = result.error
      nameSuggestions.value = result.suggestions || []
    }
  })

  socket.on('name-suggestions', (result) => {
    nameSuggestions.value = result.suggestions || []
  })
}

// Вспомогательные функции
const setValidationError = (error) => {
  nameValidation.error = error
  nameValidation.valid = false
  nameValidation.checking = false
  nameValidation.changed = false
  nameSuggestions.value = []
}

const resetValidation = () => {
  nameValidation.error = null
  nameValidation.valid = false
  nameValidation.checking = false
  nameValidation.changed = false
  nameValidation.formattedName = null
  nameSuggestions.value = []
}

const selectSuggestion = (suggestion) => {
  playerName.value = suggestion
  nameSuggestions.value = []
  nameValidation.valid = true
  nameValidation.error = null
  nameValidation.changed = false
  nameValidation.formattedName = suggestion
}

// Debounce utility
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Methods
const joinRoom = async () => {
  if (!canJoin.value) return
  
  const finalName = nameValidation.formattedName || playerName.value.trim()
  await joinGameRoom({ 
    roomId: roomId.value, 
    playerName: finalName
  })
}

const toggleRole = (roleId) => {
  if (selectedRoles.value.includes(roleId)) {
    removeRole(roleId)
  } else {
    selectRole(roleId)
  }
}

const startGame = () => {
  startNewGame()
}

// Initialize socket listeners and try to reconnect to room if possible
onMounted(() => {
  initSocketListeners()
  setupSocketListeners()
  
  // Try to reconnect to the room from URL
  const urlRoomId = roomId.value
  if (urlRoomId) {
    // Check if user has a saved name, otherwise show join form
    const savedName = localStorage.getItem('playerName')
    const savedRoom = localStorage.getItem('currentRoom')
    
    if (savedName && savedRoom === urlRoomId) {
      playerName.value = savedName
      console.log(`Attempting to rejoin room ${urlRoomId} as ${savedName}`)
      joinGameRoom({ 
        roomId: urlRoomId, 
        playerName: savedName 
      })
    } else {
      console.log(`Room ${urlRoomId} found in URL, but no matching saved data`)
    }
  }
})

// Save player name to localStorage when they join
watch(() => playerName.value, (newName) => {
  if (newName.trim()) {
    localStorage.setItem('playerName', newName.trim())
  }
})

// Also save room ID to localStorage when joining
watch(() => room.id, (newRoomId) => {
  if (newRoomId) {
    localStorage.setItem('currentRoom', newRoomId)
  }
})

// Clear localStorage when leaving room
const clearStoredData = () => {
  localStorage.removeItem('currentRoom')
  localStorage.removeItem('playerName')
}

// Redirect to home if room doesn't exist after some time
let redirectTimeout = null

onMounted(() => {
  redirectTimeout = setTimeout(() => {
    if (!isInRoom.value) {
      console.log('Room not found after timeout, redirecting to home')
      clearStoredData()
      router.push('/')
    }
  }, 15000) // 15 seconds timeout
})

// Clear timeout if room is found
watch(isInRoom, (inRoom) => {
  if (inRoom && redirectTimeout) {
    clearTimeout(redirectTimeout)
    redirectTimeout = null
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (redirectTimeout) {
    clearTimeout(redirectTimeout)
  }
})

// Meta
definePageMeta({
  title: 'Игра - Нетипичная Мафия'
})
</script>

<style lang="less" scoped>
.game-page {
  min-height: 100vh;
  padding: 20px 0;
}

.loading-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  
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

.name-rules {
  margin: 16px 0;
  
  details {
    summary {
      cursor: pointer;
      color: rgba(255, 255, 255, 0.7);
      font-size: 13px;
      padding: 8px 0;
      
      &:hover {
        color: rgba(255, 255, 255, 0.9);
      }
    }
    
    .rules-list {
      margin: 8px 0 0 20px;
      padding: 0;
      
      li {
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
        margin-bottom: 4px;
        line-height: 1.4;
      }
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.game-page {
  min-height: 100vh;
  padding: 20px 0;
}

.loading-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  
  .card {
    max-width: 400px;
    width: 100%;
  }
  
  .join-form {
    margin: 20px 0;
  }
}

.setup-section {
  .room-header {
    text-align: center;
    margin-bottom: 30px;
    
    h2 {
      margin-bottom: 8px;
    }
    
    .room-info {
      display: flex;
      justify-content: center;
      gap: 20px;
      
      .player-count {
        color: #667eea;
      }
    }
  }
  
  .setup-grid {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 20px;
  }
  
  .roles-section {
    .role-counter {
      color: #667eea;
      font-size: 14px;
    }
    
    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
  }
  
  .game-sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .players-list {
    .player-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      
      &:last-child {
        border-bottom: none;
      }
      
      .player-main-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      &.is-host .player-name {
        color: #667eea;
        font-weight: 500;
      }
      
      &.is-self {
        background: rgba(102, 126, 234, 0.1);
        border-radius: 4px;
        padding: 8px;
        margin: 4px 0;
      }
      
      &.is-disconnected {
        opacity: 0.6;
        
        .player-name {
          color: rgba(255, 255, 255, 0.5);
        }
      }
      
      .disconnected-badge {
        margin-left: 4px;
        font-size: 12px;
      }
      
      .host-badge {
        font-size: 12px;
        background: rgba(102, 126, 234, 0.2);
        color: #667eea;
        padding: 2px 8px;
        border-radius: 12px;
      }
      
      .player-role {
        .role-badge {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
          
          &.blue { background: rgba(52, 152, 219, 0.2); color: #3498db; }
          &.red { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
          &.brown { background: rgba(139, 69, 19, 0.2); color: #8b4513; }
          &.purple { background: rgba(155, 89, 182, 0.2); color: #9b59b6; }
          &.gold { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
        }
      }
    }
  }
  
  .selected-roles-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    
    .role-tag {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      
      &.blue { border-left: 3px solid #3498db; }
      &.red { border-left: 3px solid #e74c3c; }
      &.brown { border-left: 3px solid #8b4513; }
      &.purple { border-left: 3px solid #9b59b6; }
    }
  }
}

@media (max-width: 768px) {
  .setup-grid {
    grid-template-columns: 1fr !important;
  }
  
  .roles-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>