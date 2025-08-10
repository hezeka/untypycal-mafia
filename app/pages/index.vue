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
              <input 
                v-model="playerName" 
                class="input mb-2" 
                placeholder="Ваше имя" 
                required
                maxlength="20"
              >
              <button type="submit" class="btn btn-primary" :disabled="!playerName.trim()">
                Создать игру
              </button>
            </form>
          </div>

          <div class="card action-card">
            <div class="card-header">Присоединиться</div>
            <p class="text-muted mb-2">Введите код комнаты чтобы присоединиться</p>
            <form @submit.prevent="joinRoom">
              <input 
                v-model="roomCode" 
                class="input mb-2" 
                placeholder="Код комнаты (например: ABC123)" 
                required
                maxlength="6"
                style="text-transform: uppercase"
              >
              <button type="submit" class="btn btn-secondary" :disabled="!roomCode.trim()">
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
      </div>
    </div>
  </div>
</template>

<script setup>
const { 
  isInRoom, 
  isHost, 
  room, 
  gameData, 
  roles,
  initSocketListeners,
  createRoom: createGameRoom,
  joinRoom: joinGameRoom,
  selectRole,
  removeRole,
  startGame: startNewGame
} = useGame()

// Local reactive data
const playerName = ref('')
const roomCode = ref('')

// Computed properties
const roomId = computed(() => room.id)
const hostId = computed(() => room.hostId)
const gameState = computed(() => gameData.gameState)
const players = computed(() => gameData.players)
const selectedRoles = computed(() => gameData.selectedRoles)

const hostName = computed(() => {
  const host = players.value.find(p => p.id === hostId.value)
  return host ? host.name : 'Неизвестно'
})

// Methods
const createRoom = async () => {
  await createGameRoom(playerName.value.trim())
}

const joinRoom = () => {
  const roomCode = roomCode.value.trim().toUpperCase()
  navigateTo(`/game/${roomCode}`)
}

// Watch for room creation to redirect
watch(() => room.id, (newRoomId) => {
  if (newRoomId) {
    navigateTo(`/game/${newRoomId}`)
  }
})

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
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      
      &:last-child {
        border-bottom: none;
      }
      
      &.is-host .player-name {
        color: #667eea;
        font-weight: 500;
      }
      
      .host-badge {
        font-size: 12px;
        background: rgba(102, 126, 234, 0.2);
        color: #667eea;
        padding: 2px 8px;
        border-radius: 12px;
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
  
  .hero h1 {
    font-size: 2rem !important;
  }
}
</style>