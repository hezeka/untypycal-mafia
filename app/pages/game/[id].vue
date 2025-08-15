<template>
  <div class="game-page">
    <div class="container">
      <!-- Room not found or loading - показываем ПЕРВЫМ -->
      <div v-if="!isInRoom && !hasUsername" class="loading-section">
        <div class="card text-center">
          <div class="card-header">Необходимо установить никнейм</div>
          <p class="text-muted mb-3">Для участия в игре необходимо установить никнейм</p>
          <NuxtLink to="/" class="btn btn-primary">
            Вернуться на главную
          </NuxtLink>
        </div>
      </div>
      
      <div v-else-if="!isInRoom && hasUsername" class="loading-section">
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
                  v-for="(role, roleId) in availableRoles"
                  :key="roleId"
                  :role="role"
                  :role-id="roleId"
                  :selected="selectedRoles.includes(roleId)"
                  @toggle="toggleRole"
                />
              </div>
            </div>
          </div>
          
          <!-- Roles Display (Players only) -->
          <div v-else class="roles-section">
            <div class="card">
              <div class="card-header">
                Роли в игре
                <span class="role-counter">({{ selectedRoles.length }} выбрано ведущим)</span>
              </div>
              <div v-if="selectedRoles.length > 0" class="roles-grid">
                <RoleCard
                  v-for="(role, roleId) in availableRoles"
                  :key="roleId"
                  :role="role"
                  :role-id="roleId"
                  :selected="selectedRoles.includes(roleId)"
                  :readonly="true"
                />
              </div>
              <div v-else class="empty-roles">
                <p class="text-muted">Ведущий пока не выбрал роли для игры</p>
              </div>
            </div>
          </div>

          <!-- Players and Chat -->
          <div class="game-sidebar">
            <!-- Players List -->
            <div class="card mb-2">
              <div class="card-header">
                Игроки
                <span class="player-count-badge">{{ nonHostPlayers.length }}</span>
              </div>
              
              <!-- Player management controls (Host only) -->
              <div v-if="false && isHost && nonHostPlayers.length > 0" class="player-management-controls">
                <div class="management-actions">
                  <button 
                    @click="kickAllDisconnected"
                    class="btn btn-outline btn-xs"
                    :disabled="!hasDisconnectedPlayers"
                    title="Удалить всех отключившихся"
                  >
                    🧹 Очистить
                  </button>
                  <button 
                    @click="muteAllPlayers"
                    class="btn btn-outline btn-xs"
                    :disabled="allPlayersMuted"
                    title="Замутить всех"
                  >
                    🔇 Мут
                  </button>
                  <button 
                    @click="unmuteAllPlayers"
                    class="btn btn-outline btn-xs"
                    :disabled="!anyPlayersMuted"
                    title="Размутить всех"
                  >
                    🔊 Размут
                  </button>
                </div>
              </div>
              <div class="players-list">
                <div 
                  v-for="player in players" 
                  :key="player.id"
                  class="player-item"
                  :class="{ 
                    'is-host': player.id === hostId,
                    'is-disconnected': !player.connected,
                    'is-self': player.id === currentPlayerId,
                    'is-speaking': isSpeaking(player.id)
                  }"
                >
                  <div class="player-main-info">
                    <span class="player-name">
                      {{ player.name }}
                      <span v-if="!player.connected" class="disconnected-badge">😴</span>
                    </span>
                    <div class="player-badges">
                      <span v-if="player.id === hostId" class="host-badge">Ведущий</span>
                      <!-- Player management controls (only for host and not for themselves) -->
                      <div v-if="isHost && player.id !== hostId && player.id !== currentPlayerId" class="player-controls">
                        <button 
                          @click="kickPlayer(player.id)"
                          class="btn-player-action btn-kick"
                          title="Выгнать игрока"
                        >Выгнать</button>
                        <!-- <button 
                          @click="togglePlayerMute(player.id)"
                          class="btn-player-action btn-mute"
                          :class="{ 'muted': player.muted }"
                          :title="player.muted ? 'Разрешить чат' : 'Запретить чат'"
                        >
                          {{ player.muted ? '🔊' : '🔇' }}
                        </button> -->
                      </div>
                    </div>
                  </div>
                  
                  <!-- Show role if it's the current player or if game started -->
                  <div v-if="player.role && (player.id === currentPlayerId || gameState !== 'setup')" class="player-role">
                    <span class="role-badge" :class="availableRoles[player.role]?.color">
                      {{ availableRoles[player.role]?.name }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Role Assignment Status -->
            <div class="card mb-2" v-if="selectedRoles.length > 0">
              <div class="card-header">
                {{ isHost ? 'Статус распределения ролей' : 'Выбранные роли' }}
              </div>
              
              <!-- For host: show assignment status -->
              <div v-if="isHost" class="role-assignment-status">
                <div class="assignment-progress">
                  <div class="progress-info">
                    <span>Назначено: {{ assignedRolesCount }}/{{ selectedRoles.length }}</span>
                    <div class="progress-bar">
                      <div 
                        class="progress-fill" 
                        :style="{ width: (assignedRolesCount / selectedRoles.length * 100) + '%' }"
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div class="roles-status-list">
                  <div 
                    v-for="roleId in selectedRoles" 
                    :key="roleId"
                    class="role-status-item"
                    :class="{
                      'assigned': isRoleAssigned(roleId),
                      [availableRoles[roleId].color]: true
                    }"
                  >
                    <span class="role-name">{{ availableRoles[roleId].name }}</span>
                    <span class="assignment-status">
                      {{ getAssignedPlayerName(roleId) || 'Не назначено' }}
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- For players: show selected roles -->
              <div v-else class="selected-roles-list">
                <div 
                  v-for="roleId in selectedRoles" 
                  :key="roleId"
                  class="role-tag"
                  :class="availableRoles[roleId].color"
                >
                  {{ availableRoles[roleId].name }}
                </div>
              </div>
            </div>

            <!-- Chat -->
            <GameChat />

            <!-- Game Master Controls (Host only) -->
            <div v-if="isHost" class="host-controls">
              <div class="control-section">
                <h6>Управление ролями</h6>
                <div class="control-buttons">
                  <button 
                    @click="distributeRoles"
                    class="btn-mini-action"
                    :disabled="players.length !== selectedRoles.length || players.length < 2"
                  >🎲</button> <button 
                    @click="clearRoleAssignments"
                    class="btn-mini-action"
                    :disabled="!hasAssignedRoles"
                  >🔄</button>
                </div>
              </div>

              <!-- Manual role assignment -->
              <div v-if="selectedRoles.length > 0" class="role-assignment-section">
                <div class="role-assignments">
                  <div 
                    v-for="player in playersWithAssignments" 
                    :key="player.id"
                    class="player-role-assignment"
                    v-show="player.id !== hostId"
                  >
                    <span class="player-name">{{ player.name }}:</span>
                    <select 
                      @change="assignRoleToPlayer(player.id, $event.target.value)"
                      :value="player.assignedRole || ''"
                      class="role-select"
                    >
                      <option value="">Выберите роль</option>
                      <option 
                        v-for="roleId in availableRolesForPlayer(player.id)" 
                        :key="roleId"
                        :value="roleId"
                      >
                        {{ availableRoles[roleId]?.name }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Start Game Button -->
            <button 
              v-if="isHost"
              @click="startGame"
              class="btn btn-success"
              :disabled="!canStartGame"
            >
              {{ getStartGameButtonText() }}
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
  allPlayers,
  initSocketListeners,
  joinRoom: joinGameRoom,
  selectRole,
  removeRole,
  startGame: startNewGame,
  voiceActivity,
  sendVoiceActivity
} = useGame()

const { username, hasUsername } = useUser()

const { initVoiceDetection, stopVoiceDetection, isSupported } = useVoiceActivity()

const { socket } = useSocket()

// Add role assignment property to players
const playersWithAssignments = computed(() => {
  return players.value.map(player => ({
    ...player,
    assignedRole: roleAssignments.value.get(player.id)
  }))
})

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

// Используем роли с сервера
const availableRoles = computed(() => {
  return gameData.roles || {}
})

const isSpeaking = (playerId) => {
  return voiceActivity.speakingPlayers.has(playerId)
}

// Role assignment management
const roleAssignments = ref(new Map()) // playerId -> roleId

// Computed properties for role management
const nonHostPlayers = computed(() => {
  return players.value.filter(p => p.id !== hostId.value)
})

const assignedRolesCount = computed(() => {
  return roleAssignments.value.size
})

const hasAssignedRoles = computed(() => {
  return assignedRolesCount.value > 0
})

const canStartGame = computed(() => {
  const playersCount = nonHostPlayers.value.length
  const rolesCount = selectedRoles.value.length
  
  // Either all roles are assigned manually, or counts match for auto-distribution
  const allRolesAssigned = assignedRolesCount.value === rolesCount && rolesCount === playersCount
  const readyForAutoDistribution = rolesCount === playersCount && playersCount >= 2
  
  return allRolesAssigned || readyForAutoDistribution
})

// Role assignment methods
const assignRoleToPlayer = (playerId, roleId) => {
  if (!roleId) {
    // Remove assignment
    roleAssignments.value.delete(playerId)
  } else {
    // Check if role is already assigned to another player
    for (const [otherPlayerId, assignedRoleId] of roleAssignments.value) {
      if (assignedRoleId === roleId && otherPlayerId !== playerId) {
        // Remove the role from the other player
        roleAssignments.value.delete(otherPlayerId)
        break
      }
    }
    // Assign the role
    roleAssignments.value.set(playerId, roleId)
  }
}

const distributeRoles = () => {
  if (nonHostPlayers.value.length !== selectedRoles.value.length) return
  
  // Clear existing assignments
  roleAssignments.value.clear()
  
  // Shuffle roles and assign randomly
  const shuffledRoles = [...selectedRoles.value].sort(() => Math.random() - 0.5)
  nonHostPlayers.value.forEach((player, index) => {
    if (index < shuffledRoles.length) {
      roleAssignments.value.set(player.id, shuffledRoles[index])
    }
  })
}

const clearRoleAssignments = () => {
  roleAssignments.value.clear()
}

const availableRolesForPlayer = (playerId) => {
  // Get all selected roles
  const allRoles = [...selectedRoles.value]
  
  // Remove roles that are already assigned to other players
  const assignedToOthers = Array.from(roleAssignments.value.entries())
    .filter(([otherPlayerId]) => otherPlayerId !== playerId)
    .map(([_, roleId]) => roleId)
  
  return allRoles.filter(roleId => !assignedToOthers.includes(roleId))
}

const isRoleAssigned = (roleId) => {
  return Array.from(roleAssignments.value.values()).includes(roleId)
}

const getAssignedPlayerName = (roleId) => {
  for (const [playerId, assignedRoleId] of roleAssignments.value) {
    if (assignedRoleId === roleId) {
      const player = players.value.find(p => p.id === playerId)
      return player?.name
    }
  }
  return null
}

const getStartGameButtonText = () => {
  const playersCount = nonHostPlayers.value.length
  const rolesCount = selectedRoles.value.length
  
  if (playersCount < 2) {
    return 'Нужно минимум 2 игрока'
  }
  
  if (rolesCount !== playersCount) {
    return `Нужно ${playersCount} ролей для игроков`
  }
  
  if (hasAssignedRoles.value && assignedRolesCount.value < rolesCount) {
    return `Назначено ${assignedRolesCount.value}/${rolesCount} ролей`
  }
  
  return 'Начать игру'
}

// Player management functions
const hasDisconnectedPlayers = computed(() => {
  return nonHostPlayers.value.some(p => !p.connected)
})

const allPlayersMuted = computed(() => {
  return nonHostPlayers.value.length > 0 && nonHostPlayers.value.every(p => p.muted)
})

const anyPlayersMuted = computed(() => {
  return nonHostPlayers.value.some(p => p.muted)
})

const kickPlayer = (playerId) => {
  const player = players.value.find(p => p.id === playerId)
  if (!player) return
  
  if (confirm(`Вы уверены, что хотите выгнать игрока "${player.name}"?`)) {
    socket.emit('kick-player', {
      roomId: roomId.value,
      playerId: playerId
    })
  }
}

const togglePlayerMute = (playerId) => {
  const player = players.value.find(p => p.id === playerId)
  if (!player) return
  
  socket.emit('toggle-player-mute', {
    roomId: roomId.value,
    playerId: playerId,
    muted: !player.muted
  })
}

const kickAllDisconnected = () => {
  const disconnectedPlayers = nonHostPlayers.value.filter(p => !p.connected)
  if (disconnectedPlayers.length === 0) return
  
  if (confirm(`Удалить ${disconnectedPlayers.length} отключившихся игроков?`)) {
    socket.emit('kick-disconnected-players', {
      roomId: roomId.value
    })
  }
}

const muteAllPlayers = () => {
  if (confirm(`Замутить всех игроков?`)) {
    socket.emit('mute-all-players', {
      roomId: roomId.value,
      muted: true
    })
  }
}

const unmuteAllPlayers = () => {
  socket.emit('mute-all-players', {
    roomId: roomId.value,
    muted: false
  })
}

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
  socket.on('kicked-from-room', (data) => {
    alert(data.message)
    router.push('/')
  })
  
  socket.on('mute-status-changed', (data) => {
    if (data.muted) {
      alert('⚠️ ' + data.message)
    } else {
      console.log('✅ ' + data.message)
    }
  })
  
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
  // Use saved username if available, otherwise use input
  const finalName = hasUsername.value 
    ? username.value 
    : (nameValidation.formattedName || playerName.value.trim())
    
  if (!finalName) return
  
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
  // If manual assignments exist, send them to the server
  if (hasAssignedRoles.value) {
    const assignments = {}
    roleAssignments.value.forEach((roleId, playerId) => {
      assignments[playerId] = roleId
    })
    socket.emit('assign-roles-manually', {
      roomId: roomId.value,
      assignments
    })
  }
  startNewGame()
}

// Initialize socket listeners and try to reconnect to room if possible
onMounted(async () => {
  initSocketListeners()
  setupSocketListeners()
  
  // Инициализируем микрофон если пользователь его включил
  console.log('🎤 Checking microphone initialization...')
  
  // Создаем callback для голосовой активности
  const voiceActivityCallback = (isActive) => {
    sendVoiceActivity(isActive)
  }
  
  // Микрофон будет инициализирован при первом клике пользователя
  
  // Try to reconnect to the room from URL
  const urlRoomId = roomId.value
  if (urlRoomId && hasUsername.value) {
    // Auto-join if we have a saved username
    console.log(`Attempting to join room ${urlRoomId} as ${username.value}`)
    joinGameRoom({ 
      roomId: urlRoomId, 
      playerName: username.value 
    })
  } else if (urlRoomId && !hasUsername.value) {
    // Set the saved name if available for backward compatibility
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      playerName.value = savedName
    }
    console.log(`Room ${urlRoomId} found, waiting for username input`)
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

// Update role assignments when players list changes
watch(() => players.value, (newPlayers) => {
  if (!isHost.value) return
  
  const currentPlayerIds = new Set(newPlayers.map(p => p.id))
  const assignmentPlayerIds = new Set(roleAssignments.value.keys())
  
  // Remove assignments for players who left
  for (const playerId of assignmentPlayerIds) {
    if (!currentPlayerIds.has(playerId)) {
      roleAssignments.value.delete(playerId)
    }
  }
}, { deep: true })

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
  stopVoiceDetection()
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
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
  }

  .btn-mini-action {
    background: none;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    opacity: 0.6;
    transition: all 0.2s ease;
    
    &:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.1);
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
      transition: 0.2s;
      padding-right: 8px;
      
      &:last-child {
        border-bottom: none;
      }
      
      .player-main-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .player-badges {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }
      
      .player-controls {
        display: flex;
        gap: 4px;
        
        .btn-player-action {
          background: none;
          border: none;
          padding: 4px 6px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          opacity: 0.6;
          transition: all 0.2s ease;
          color: #fff;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07);
          
          &:hover {
            opacity: 1;
            background: rgba(255, 255, 255, 0.1);
          }
          
          &.btn-kick:hover {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
            box-shadow: 0 0 0 1px rgba(255, 74, 74, 0.157);
          }
          
          &.btn-mute {
            &.muted {
              color: #e74c3c;
              opacity: 1;
            }
            
            &:hover {
              background: rgba(241, 196, 15, 0.2);
              color: #f1c40f;
            }
          }
        }
      }
      
      .player-count-badge {
        background: rgba(102, 126, 234, 0.2);
        color: #667eea;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 500;
        margin-left: 8px;
      }
      
      .player-management-controls {
        padding: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.1);
        
        .management-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          
          .btn-xs {
            font-size: 10px;
            padding: 4px 8px;
            
            &:disabled {
              opacity: 0.4;
            }
          }
        }
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
  
      &.is-speaking {
        background: rgba(0, 255, 136, 0.03);
        border-left: 3px solid #2bb173;
        padding-left: 12px;

        .player-name {
          color: #1ecd7b !important;
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
  
  // Host controls styling
  .host-controls {
    margin-bottom: 16px;
    
    .control-section {
      margin: 16px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      
      h6 {
        margin: 0;
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
      }
      
      .control-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        
        .btn-sm {
          font-size: 12px;
          padding: 6px 12px;
        }
      }
    }
    
    .role-assignment-section {
      .role-assignments {
        display: flex;
        flex-direction: column;
        gap: 8px;
        
        .player-role-assignment {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          
          .player-name {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.9);
            min-width: 80px;
          }
          
          .role-select {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            min-width: 140px;
            
            option {
              background: #2c3e50;
              color: white;
            }
            
            &:focus {
              outline: none;
              border-color: #667eea;
            }
          }
        }
      }
    }
  }
  
  // Role assignment status styling
  .role-assignment-status {
    .assignment-progress {
      margin-bottom: 12px;
      
      .progress-info {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 6px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        
        .progress-bar {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          
          .progress-fill {
            height: 100%;
            background: #667eea;
            transition: width 0.3s ease;
          }
        }
      }
    }
    
    .roles-status-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .role-status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        border-left: 3px solid transparent;
        
        &.assigned {
          background: rgba(102, 126, 234, 0.1);
        }
        
        &.blue { border-left-color: #3498db; }
        &.red { border-left-color: #e74c3c; }
        &.brown { border-left-color: #8b4513; }
        &.purple { border-left-color: #9b59b6; }
        &.gold { border-left-color: #f1c40f; }
        
        .role-name {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .assignment-status {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          
          .role-status-item.assigned & {
            color: #667eea;
            font-weight: 500;
          }
        }
      }
    }
  }
  
  .empty-roles {
    padding: 40px 20px;
    text-align: center;
    
    .text-muted {
      color: rgba(255, 255, 255, 0.6);
      font-style: italic;
    }
  }
}

@keyframes voiceGlow {
  0%, 100% {
    text-shadow: 0 0 5px rgba(0, 255, 136, 0.5);
  }
  50% {
    text-shadow: 0 0 10px rgba(0, 255, 136, 0.8);
  }
}

@keyframes voiceBounce {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.1);
  }
}

@media (max-width: 768px) {
  .setup-grid {
    grid-template-columns: 1fr !important;
  }
  
  .roles-grid {
    grid-template-columns: 1fr !important;
  }
  
  .host-controls {
    .control-buttons {
      flex-direction: column;
      
      .btn-sm {
        width: 100%;
      }
    }
  }
  
  .player-management-controls {
    .management-actions {
      justify-content: center;
      
      .btn-xs {
        flex: 1;
        min-width: 0;
      }
    }
  }
  
  .player-main-info {
    .player-badges {
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    
    .player-controls {
      margin-top: 4px;
    }
    
    .role-assignment-section .role-assignments .player-role-assignment {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      
      .player-name {
        min-width: auto;
      }
      
      .role-select {
        min-width: auto;
        width: 100%;
      }
    }
  }
  
  .role-assignment-status {
    .assignment-progress .progress-info {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }
    
    .roles-status-list .role-status-item {
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
      
      .assignment-status {
        text-align: right;
      }
    }
  }
}
</style>