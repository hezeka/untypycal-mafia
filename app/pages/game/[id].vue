<template>
  <div class="game-page">
    
    <!-- Шапка: [Логотип "Нетипичка" | Навигация (Роли, Правила) | Панель игры] -->
    <header class="game-header">
      
      <!-- Левая часть: логотип + навигация -->
      <div class="header-left">
        <div class="logo-section">
          <img src="/images/logo.png" alt="Нетипичка" class="logo-img" />
          <h1 class="logo-text">НЕТИПИЧКА</h1>
        </div>
        
        <nav class="header-nav">
          <button @click="showRoles = true" class="nav-button">Роли</button>
          <button @click="showRules = true" class="nav-button">Правила</button>
        </nav>
      </div>
      
      <!-- Правая часть: [Мьют звука | Мьют микро | разделитель | статус + код | Покинуть] -->
      <div class="header-right">
        <div class="game-controls">
          <!-- Аудио контроли -->
          <button @click="toggleSound" class="control-btn" :class="{ active: soundEnabled }">
            <img src="/icons/mute.png" alt="Звук" />
          </button>
          
          <button @click="toggleMicrophone" class="control-btn" :class="{ active: micEnabled }">
            <img src="/icons/microphone.png" alt="Микрофон" />
          </button>
          
          <div class="control-separator"></div>
          
          <!-- Статус подключения + код комнаты -->
          <div @click="copyRoomLink" class="room-status" :class="{ connected: gameState.connected }">
            <div class="status-indicator"></div>
            <span class="room-code">{{ gameState.room.id }}</span>
          </div>
          
          <!-- Кнопка покидания -->
          <button @click="confirmLeaveGame" class="leave-btn">Покинуть</button>
        </div>
      </div>
      
    </header>

    <!-- Основная область игры -->
    <main class="game-main">
      
      <!-- НАСТРОЙКА ИГРЫ -->
      <template v-if="gameState.room.phase === 'setup'">
        <GameSetup />
      </template>
      
      <!-- ИГРОВЫЕ ФАЗЫ -->
      <template v-else>
        <div class="game-layout">
          
          <!-- Левая часть - основная игровая область -->
          <div class="game-area">
            
            <!-- [Фаза игры + таймер смены | Шпаргалка] -->
            <div class="phase-header">
              <div class="phase-info">
                <h2 class="current-phase">{{ phaseInfo.name }}</h2>
                <div v-if="gameState.timer.active" class="phase-timer">
                  {{ formatTime(gameState.timer.remaining) }}
                </div>
                <div v-else class="phase-timer inactive">—</div>
              </div>
              
              <div class="phase-cheatsheet">
                <button @click="showCheatsheet = !showCheatsheet" class="cheatsheet-btn">
                  Шпаргалка
                </button>
                <div v-if="showCheatsheet" class="cheatsheet-content">
                  {{ phaseInfo.description }}
                </div>
              </div>
            </div>
            
            <!-- [Центральные карты (если есть)] -->
            <div v-if="gameState.room.centerCards > 0" class="center-cards-section">
              <h3>Центральные карты</h3>
              <div class="center-cards-grid">
                <div v-for="n in gameState.room.centerCards" :key="n" class="center-card">
                  <img src="/roles/card-back.png" alt="Центральная карта" />
                </div>
              </div>
            </div>
            
            <!-- [Сетка игроков GRID 2x3 или 3x2] -->
            <div class="players-section">
              <div class="players-grid" :class="getPlayersGridClass()">
                
                <div 
                  v-for="player in gameState.room.players" 
                  :key="player.id"
                  class="player-card"
                  :class="getPlayerCardClass(player)"
                >
                  
                  <!-- Аватар/Роль с когтями для оборотней -->
                  <div class="player-avatar">
                    <!-- Картинка роли если видна -->
                    <img 
                      v-if="player.role && shouldShowRole(player)"
                      :src="`/roles/compressed/${player.role}.webp`"
                      :alt="getRoleName(player.role)"
                      class="role-image"
                      @error="$event.target.src = `/roles/${player.role}.png`"
                    />
                    <!-- Обычный аватар -->
                    <div v-else class="default-avatar">
                      {{ player.name[0]?.toUpperCase() }}
                    </div>
                    
                    <!-- Иконка когтей для оборотней -->
                    <div v-if="isWerewolfRole(player.role) && shouldShowRole(player)" class="werewolf-claws">
                      <img src="/icons/claws.png" alt="Оборотень" />
                    </div>
                  </div>
                  
                  <!-- Информация об игроке -->
                  <div class="player-info">
                    <div class="player-name">{{ player.name }}</div>
                    
                    <!-- Название роли под ником если раскрыта -->
                    <div v-if="player.role && shouldShowRole(player)" class="player-role">
                      {{ getRoleName(player.role) }}
                    </div>
                    
                    <!-- Статусы игрока -->
                    <div class="player-status">
                      <span v-if="!player.alive" class="status-dead">Мертв</span>
                      <span v-if="!player.connected" class="status-offline">Оффлайн</span>
                      <span v-if="player.isHost" class="status-host">Ведущий</span>
                    </div>
                  </div>
                  
                  <!-- Кнопки управления под игроками -->
                  <div class="player-actions">
                    
                    <!-- Своя карточка: [О вашей роли] на всю ширину -->
                    <template v-if="player.isMe">
                      <button @click="showMyRoleInfo" class="action-btn role-info-btn">
                        О вашей роли
                      </button>
                    </template>
                    
                    <!-- Другие игроки -->
                    <template v-else>
                      
                      <!-- [ЛС] для всех -->
                      <button @click="openWhisperTo(player)" class="action-btn whisper-btn">
                        ЛС
                      </button>
                      
                      <!-- Кнопки ведущего: [ЛС | Защитить | Убить/Воскресить | Выгнать] -->
                      <template v-if="canAdminControl">
                        <button @click="adminAction('protect', player.id)" class="action-btn admin-btn">
                          Защитить
                        </button>
                        <button 
                          @click="adminAction(player.alive ? 'kill' : 'revive', player.id)" 
                          class="action-btn admin-btn"
                        >
                          {{ player.alive ? 'Убить' : 'Воскресить' }}
                        </button>
                        <button @click="adminAction('kick', player.id)" class="action-btn admin-btn danger">
                          Выгнать
                        </button>
                      </template>
                      
                      <!-- Кнопки оборотня: [ЛС | ☠️ голос за убийство | 👁️ посмотреть роль] -->
                      <template v-if="isWerewolf && gameState.room.phase === 'night'">
                        <button 
                          v-if="canKillPlayer(player)"
                          @click="nightAction('vote_kill', player.id)" 
                          class="action-btn werewolf-btn"
                        >
                          ☠️
                        </button>
                        <button 
                          v-if="canLookAtPlayer(player)"
                          @click="nightAction('look_player', player.id)" 
                          class="action-btn werewolf-btn"
                        >
                          👁️
                        </button>
                      </template>
                      
                      <!-- Голосование -->
                      <template v-if="gameState.room.phase === 'voting' && canVoteFor(player)">
                        <button 
                          @click="voteForPlayer(player.id)" 
                          class="action-btn vote-btn"
                          :class="{ voted: gameState.voting.myVote === player.id }"
                        >
                          {{ gameState.voting.myVote === player.id ? '✓' : 'Голос' }}
                        </button>
                      </template>
                      
                    </template>
                  </div>
                  
                </div>
                
              </div>
            </div>
            
            <!-- [Подсказка о текущей фазе] + Кнопки ведущего -->
            <div class="phase-controls">
              <div class="phase-hint">
                <div class="hint-content">
                  {{ getPhaseHint() }}
                </div>
              </div>
              
              <!-- Кнопки управления фазами для ведущего -->
              <div v-if="canAdminControl && gameState.room.phase !== 'setup'" class="admin-phase-controls">
                <h4>Управление игрой</h4>
                <div class="phase-buttons">
                  <button 
                    @click="adminAction('next-phase')" 
                    class="admin-btn phase-btn"
                  >
                    Следующая фаза
                  </button>
                  <button 
                    v-if="gameState.room.phase === 'voting'"
                    @click="adminAction('force-vote')" 
                    class="admin-btn phase-btn"
                  >
                    Завершить голосование
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Ночные действия -->
            <NightActions v-if="gameState.room.phase === 'night'" />
            
            <!-- Результаты игры -->
            <GameResults 
              v-if="gameState.room.phase === 'ended'" 
              @new-game="handleNewGame"
              @leave="handleLeaveGame"
            />
            
          </div>
          
        </div>
      </template>
      
    </main>

    <!-- Правая панель - Игровой чат (фиксированная ширина) -->
    <aside class="game-sidebar">
      <GameChat />
    </aside>

    <!-- Модальные окна -->
    <RoleInfoModal 
      v-if="showRoleModal && currentPlayer.role"
      :role="currentPlayer.role"
      @close="showRoleModal = false"
    />
    
    <RulesModal 
      v-if="showRules"
      @close="showRules = false"
    />
    
    <!-- <RolesModal 
      v-if="showRoles"
      @close="showRoles = false"
    /> -->
    
    <!-- Уведомления -->
    <div v-if="error" @click="error = null" class="error-notification">
      {{ error }}
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '~/composables/useGame'
import { useUser } from '~/composables/useUser'
import { getRole, getAllRoles } from '../../../shared/rolesRegistry.js'

const route = useRoute()
const router = useRouter()

const { 
  gameState, 
  currentPlayer,
  formatTime, 
  getPhaseInfo,
  initSocketListeners,
  joinRoom,
  votePlayer,
  adminAction: gameAdminAction,
  executeNightAction,
  cleanup
} = useGame()

// Local state
const soundEnabled = ref(true)
const micEnabled = ref(false)
const showCheatsheet = ref(false)
const showRoleModal = ref(false)
const showRules = ref(false)
const showRoles = ref(false)
const error = ref(null)

const roles = getAllRoles()

// Computed properties
const phaseInfo = computed(() => getPhaseInfo())

const canAdminControl = computed(() => {
  return currentPlayer.value.role === 'game_master' || currentPlayer.value.isHost
})

const isWerewolf = computed(() => {
  const role = currentPlayer.value.role
  return role && (role.includes('werewolf') || role === 'mystic_wolf') && role !== 'minion'
})

// Methods
const copyRoomLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    // TODO: Показать уведомление "Ссылка скопирована"
  } catch (err) {
    console.error('Failed to copy room link:', err)
  }
}

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
}

const toggleMicrophone = () => {
  micEnabled.value = !micEnabled.value
}

const confirmLeaveGame = () => {
  if (confirm('Вы уверены, что хотите покинуть игру?')) {
    handleLeaveGame()
  }
}

const handleLeaveGame = () => {
  router.push('/')
}

const handleNewGame = () => {
  // TODO: Логика создания новой игры
  router.push('/')
}

// Player methods
const shouldShowRole = (player) => {
  // Свою роль видишь всегда
  if (player.isMe) return true
  
  // game_master видит все роли
  if (currentPlayer.value.role === 'game_master') return true
  
  // Оборотни видят роли других оборотней (кроме фазы setup)
  if (isWerewolf.value && isWerewolfRole(player.role) && gameState.room.phase !== 'setup') {
    return true
  }
  
  return false
}

const isWerewolfRole = (role) => {
  if (!role) return false
  const roleInfo = roles[role]
  return roleInfo?.team === 'werewolf' && role !== 'minion'
}

const getRoleName = (roleId) => {
  return roles[roleId]?.name || roleId
}

const getPlayersGridClass = () => {
  const count = gameState.room.players.length
  if (count <= 4) return 'grid-2x2'
  if (count <= 6) return 'grid-3x2'
  return 'grid-3x3'
}

const getPlayerCardClass = (player) => {
  const classes = []
  
  if (player.isMe) classes.push('is-me')
  if (!player.alive) classes.push('is-dead')
  if (!player.connected) classes.push('is-offline')
  if (player.role === 'game_master') classes.push('is-gamemaster')
  if (isWerewolfRole(player.role)) classes.push('is-werewolf')
  
  return classes
}

const getPhaseHint = () => {
  const role = currentPlayer.value.role
  if (!role) return phaseInfo.value.description
  
  const roleInfo = roles[role]
  if (!roleInfo?.phaseHints) return phaseInfo.value.description
  
  const phase = gameState.room.phase
  return roleInfo.phaseHints[phase] || roleInfo.phaseHints.day || phaseInfo.value.description
}

// Action methods
const showMyRoleInfo = () => {
  showRoleModal.value = true
}

const openWhisperTo = (player) => {
  // TODO: Открыть чат с фокусом на команде шепота
  console.log('Whisper to:', player.name)
}

const canVoteFor = (player) => {
  return player.alive && !player.isMe && player.role !== 'game_master'
}

const canKillPlayer = (player) => {
  return player.alive && !isWerewolfRole(player.role) && player.role !== 'game_master'
}

const canLookAtPlayer = (player) => {
  return player.alive && !player.isMe && player.role !== 'game_master'
}

const voteForPlayer = (targetId) => {
  votePlayer(targetId)
}

const adminAction = (action, targetId) => {
  gameAdminAction(action, targetId)
}

const nightAction = (type, targetId) => {
  executeNightAction({ type, targetId })
}

// Lifecycle
onMounted(async () => {
  // Сначала инициализируем слушатели сокетов
  initSocketListeners()
  
  // Получаем ID комнаты из URL
  const roomId = route.params.id
  
  if (roomId && !gameState.room.id) {
    // Если есть комната в URL, но нет активной игры - пытаемся подключиться
    const { username } = useUser()
    
    if (username.value) {
      // Ждем подключения сокета если он еще не подключен
      if (!gameState.connected) {
        console.log('🔄 Waiting for socket connection...')
        
        // Ждем до 3 секунд подключения
        let attempts = 0
        const maxAttempts = 30 // 3 секунды по 100мс
        
        const waitForConnection = () => {
          if (gameState.connected && attempts < maxAttempts) {
            console.log('✅ Socket connected, joining room...')
            joinRoom(roomId, username.value)
          } else if (attempts < maxAttempts) {
            attempts++
            setTimeout(waitForConnection, 100)
          } else {
            console.error('❌ Socket connection timeout')
            router.push('/')
          }
        }
        
        waitForConnection()
      } else {
        // Уже подключены - сразу подключаемся к комнате
        joinRoom(roomId, username.value)
      }
    } else {
      // Нет имени пользователя - перенаправляем на главную
      router.push('/')
    }
  } else if (!roomId) {
    // Нет ID комнаты в URL - перенаправляем на главную
    router.push('/')
  }
})

onUnmounted(() => {
  cleanup()
})
</script>