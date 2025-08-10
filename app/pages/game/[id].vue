<template>
  <div class="game-page">
    <div class="container">
      <!-- Room not found or loading - показываем ПЕРВЫМ -->
      <div v-if="!isInRoom" class="loading-section">
        <div class="card text-center">
          <div class="card-header">Подключение к комнате {{ route.params.id }}</div>
          <p>Введите свое имя для присоединения к игре:</p>
          
          <form @submit.prevent="joinRoom" class="join-form">
            <input 
              v-model="playerName" 
              class="input mb-2" 
              placeholder="Ваше имя" 
              required
              maxlength="20"
              autofocus
            >
            <button type="submit" class="btn btn-primary" :disabled="!playerName.trim()">
              Присоединиться к игре
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

// Local reactive data
const playerName = ref('')

// Computed properties
const roomId = computed(() => route.params.id)
const hostId = computed(() => room.hostId)
const gameState = computed(() => gameData.gameState)
const players = computed(() => allPlayers.value) // Only non-host players
const selectedRoles = computed(() => gameData.selectedRoles)

const currentPlayerId = computed(() => {
  const { socket } = useSocket()
  return socket?.id
})

const hostName = computed(() => {
  const hostPlayer = gameData.players.find(p => p.id === hostId.value)
  return hostPlayer ? hostPlayer.name : 'Неизвестно'
})

// Methods
const joinRoom = async () => {
  await joinGameRoom({ 
    roomId: roomId.value, 
    playerName: playerName.value.trim() 
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