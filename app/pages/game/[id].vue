<template>
  <div class="game-page">
    
    <!-- Шапка: [Логотип "Нетипичка" | Навигация (Роли, Правила) | Панель игры] -->
    <header class="game-header">
      
      <!-- Левая часть: логотип + навигация -->
      <div class="header-left">
        <a href="/" class="logo-section">
          <img src="/images/logo.png" alt="Нетипичка" class="logo-img" />
          <h1 class="logo-text">НЕТИПИЧКА</h1>
        </a>
        
        <nav class="header-nav">
          <a @click="showRoles = true" class="nav-button">Роли</a>
          <a @click="showRules = true" class="nav-button">Правила</a>
        </nav>
      </div>
      
      <!-- Правая часть: [Мьют звука | Мьют микро | разделитель | статус + код | Покинуть] -->
      <div class="header-right">
        <div class="game-controls">
          <!-- Аудио контроли -->
          <button @click="toggleSound" class="control-btn sound" :class="{ active: soundEnabled }">
          </button>
          
          <div class="microphone-container">
            <button 
              @click="toggleMicrophone" 
              @mouseenter="showMicSettings = true"
              @mouseleave="showMicSettings = false"
              class="control-btn microphone" 
              :class="{ 
                active: vadEnabled && isListening, 
                detecting: isDetecting && vadEnabled && isListening 
              }"
            >
              <div v-if="isDetecting && vadEnabled && isListening" class="voice-indicator">
                <div class="voice-waves">
                  <div class="voice-wave"></div>
                  <div class="voice-wave"></div>
                  <div class="voice-wave"></div>
                </div>
              </div>
            </button>
            
            <!-- Settings Modal on hover -->
            <SettingsModal 
              v-if="showMicSettings"
              @close="showMicSettings = false"
              @mouseenter="showMicSettings = true"
              @mouseleave="showMicSettings = false"
              class="hover-settings-modal"
            />
          </div>
          
          <div class="control-separator"></div>
          
          <!-- Статус подключения + код комнаты -->
          <button @click="copyRoomLink" class="room-btn room-status" :class="{ connected: gameState.connected }">
            <div class="status-indicator"></div>
            <span class="room-code">{{ gameState.room.id }}</span>
          </button>
          
          <!-- Кнопка покидания -->
          <button @click="confirmLeaveGame" class="room-btn leave-btn">Покинуть игру</button>
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
                  <div class="player-avatar" :class="{ speaking: isSpeaking(player.id) }">
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
import { useSocket } from '~/composables/useSocket'
import { useVoiceActivity } from '~/composables/useVoiceActivity'
import { getRole, getAllRoles } from '../../../shared/rolesRegistry.js'
import MicrophoneSettings from '~/components/MicrophoneSettings.vue'
import SettingsModal from '~/components/SettingsModal.vue'

const route = useRoute()
const router = useRouter()

const { socket } = useSocket()
const { 
  isListening,
  vadEnabled,
  isDetecting,
  toggleVAD,
  handlePlayerVoiceActivity,
  speakingPlayers
} = useVoiceActivity()

const { 
  gameState, 
  currentPlayer,
  formatTime, 
  getPhaseInfo,
  initSocketListeners,
  joinRoom,
  loadRoomData,
  loadChatHistory,
  votePlayer,
  adminAction: gameAdminAction,
  executeNightAction,
  cleanup
} = useGame()

// Local state
const soundEnabled = ref(true)
const showCheatsheet = ref(false)
const showRoleModal = ref(false)
const showRules = ref(false)
const showRoles = ref(false)
const error = ref(null)

// Состояние микрофона
const showMicSettings = ref(false)

// Состояние шепчущих игроков
const whisperingPlayers = ref({})

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

const toggleMicrophone = async () => {
  await toggleVAD()
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

const isWhispering = (playerId) => {
  return whisperingPlayers.value[playerId] === true
}

const isSpeaking = (playerId) => {
  console.log(`🔍 Checking if player ${playerId} is speaking. speakingPlayers:`, speakingPlayers.value, 'type:', typeof speakingPlayers.value)
  const isCurrentlySpeaking = speakingPlayers.value.includes(playerId)
  if (isCurrentlySpeaking) {
    console.log(`🗣️ Player ${playerId} is speaking!`)
  }
  return isCurrentlySpeaking
}

// Обработка активности шепота
const handleWhisperActivity = (data) => {
  console.log('💬 Whisper activity received:', data)
  if (data.playerId) {
    console.log(`💬 Adding whisper indication for player ${data.playerId} (${data.playerName})`)
    whisperingPlayers.value[data.playerId] = true
    
    // Убираем индикацию через 500ms
    setTimeout(() => {
      console.log(`💬 Removing whisper indication for player ${data.playerId}`)
      delete whisperingPlayers.value[data.playerId]
    }, 500)
  }
}

const getPlayerCardClass = (player) => {
  const classes = []
  
  if (player.isMe) classes.push('is-me')
  if (!player.alive) classes.push('is-dead')
  if (!player.connected) classes.push('is-offline')
  if (player.role === 'game_master') classes.push('is-gamemaster')
  if (isWerewolfRole(player.role)) classes.push('is-werewolf')
  if (isWhispering(player.id)) classes.push('whispering')
  
  
  console.log(`🏷️ Player ${player.name} classes:`, classes)
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
  console.log('🎮 Game page mounted, room ID:', route.params.id)
  
  // Получаем ID комнаты из URL
  const roomId = route.params.id
  
  if (!roomId) {
    console.error('❌ No room ID in URL')
    router.push('/')
    return
  }

  // Инициализируем слушатели сокетов для реальных обновлений
  initSocketListeners()
  
  // Добавляем обработчик шепота
  if (socket.value) {
    socket.value.on('whisper-activity', handleWhisperActivity)
    socket.value.on('voice-activity', (data) => {
      console.log('🎤 Voice activity received in [id].vue:', data)
      
      // Преобразуем формат события для handlePlayerVoiceActivity
      const eventData = {
        playerId: data.playerId,
        speaking: true // если событие пришло, значит игрок говорит
      }
      
      console.log('🔧 Calling handlePlayerVoiceActivity with:', eventData)
      handlePlayerVoiceActivity(eventData)
      console.log('✅ handlePlayerVoiceActivity called')
      
      // Убираем игрока из speaking через короткое время
      setTimeout(() => {
        console.log('⏰ Removing player from speaking after timeout')
        handlePlayerVoiceActivity({
          playerId: data.playerId,
          speaking: false
        })
      }, 1000) // убираем через 1 секунду
    })
  }
  
  try {
    // Сначала загружаем данные комнаты через HTTP
    console.log('🔄 Loading room data via HTTP...')
    await loadRoomData(roomId)
    console.log('✅ Room data loaded successfully')
    
    // Проверяем, нужно ли присоединиться как игрок
    const { username } = useUser()
    let playerId = null
    
    if (username.value && !gameState.player.id) {
      console.log('🔄 Joining room as player...')
      const joinResult = await joinRoom(roomId, username.value)
      console.log('✅ Joined room successfully')
      playerId = gameState.player.id
      console.log('✅ Player ID after join:', playerId)
    } else if (!username.value) {
      console.log('📺 Viewing room as observer (no username)')
      gameState.connected = false
    } else {
      console.log('👤 Already joined as player')
      playerId = gameState.player.id
    }

    // Если все еще нет playerId, попробуем найти игрока по имени пользователя
    if (!playerId && username.value) {
      console.log('🔍 Looking for player by username:', username.value)
      const existingPlayer = gameState.room.players.find(p => p.name === username.value)
      if (existingPlayer) {
        playerId = existingPlayer.id
        console.log('✅ Found existing player with ID:', playerId)
      }
    }

    // Загружаем историю чата с учетом прав доступа игрока
    console.log('🔄 Loading chat history...')
    console.log('🔄 About to load chat with playerId:', playerId)
    console.log('🔄 gameState.player before chat load:', gameState.player)
    await loadChatHistory(roomId, playerId)
    console.log('✅ Chat history loaded successfully')
    console.log('✅ gameState.player after chat load:', gameState.player)
    
  } catch (error) {
    console.error('❌ Failed to load room:', error)
    error.value = error.message
    
    // Если комната не найдена, перенаправляем на главную через 3 секунды
    if (error.message.includes('не найдена') || error.message.includes('not found')) {
      setTimeout(() => {
        router.push('/')
      }, 3000)
    }
  }
})

onUnmounted(() => {
  // Отписываемся от событий
  if (socket.value) {
    socket.value.off('whisper-activity', handleWhisperActivity)
    socket.value.off('voice-activity', handlePlayerVoiceActivity)
  }
  cleanup()
})
</script>

<style scoped>
/* Анимация шепота для карточек игроков */
.player-card.whispering {
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
  border: 2px solid rgba(168, 85, 247, 0.6);
  animation: whisper-pulse 0.5s ease-in-out;
}

@keyframes whisper-pulse {
  0% {
    box-shadow: 0 0 5px rgba(168, 85, 247, 0.2);
    border-color: rgba(168, 85, 247, 0.3);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.6);
    border-color: rgba(168, 85, 247, 0.8);
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
    border-color: rgba(168, 85, 247, 0.6);
    transform: scale(1);
  }
}

/* Контейнер микрофона для настроек */
.microphone-container {
  position: relative;
}

/* Настройки на hover */
.hover-settings-modal {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
  margin-top: 8px;
  pointer-events: auto;

  width: 300px;
}

.hover-settings-modal .modal-content {
  position: relative;
  min-width: 300px;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Позиционирование для аватара игрока */
.player-avatar {
  position: relative;
}

/* Кнопка микрофона с индикацией */
.control-btn.detecting {
  background: rgba(0, 255, 136, 0.2) !important;
  border-color: rgba(0, 255, 136, 0.5) !important;
  animation: mic-detecting 1s ease-in-out infinite;
}

@keyframes mic-detecting {
  0%, 100% {
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
  }
}

/* Индикатор голоса на кнопке микрофона */
.voice-indicator {
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
  pointer-events: none;
}

.voice-waves {
  display: flex;
  align-items: center;
  gap: 1px;
}

.voice-wave {
  width: 2px;
  height: 8px;
  background: rgba(0, 255, 136, 0.8);
  border-radius: 1px;
  animation: voice-wave 1s ease-in-out infinite;
}

.voice-wave:nth-child(2) {
  animation-delay: 0.1s;
}

.voice-wave:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes voice-wave {
  0%, 100% {
    height: 6px;
    opacity: 0.6;
  }
  50% {
    height: 12px;
    opacity: 1;
  }
}

</style>