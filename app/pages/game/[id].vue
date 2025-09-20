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
          
          <!-- <div class="microphone-container">
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
            
            <SettingsModal 
              v-if="showMicSettings"
              @close="showMicSettings = false"
              @mouseenter="showMicSettings = true"
              @mouseleave="showMicSettings = false"
              class="hover-settings-modal"
            />
          </div> -->
          
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
                <div class="phase-icon" :class="gameState.room.phase"></div>
                <div class="phase-description">
                  <h2 style="display: flex; align-items: center; gap: 8px;">
                    {{ phaseInfo.name }}
                    <span v-if="canAdminControl && gameState.room.phase !== 'setup'">
                      <button
                        @click="extendPhase" 
                        class="admin-btn extend-btn"
                        title="Продлить фазу на 1 минуту"
                      >+1 мин</button>
                      <button
                        @click="gameState.room.phase === 'voting' ? adminAction('force-vote') : adminAction('next-phase')" 
                        class="admin-btn phase-btn"
                      >Скип</button>
                    </span>
                  </h2>
                  <p v-if="timer.isActive">Фаза сменится через: <strong>{{ formatTime(timer.remaining) }}</strong></p>
                </div>
              </div>
              <div class="phase-help">
                💡
                <div>{{ phaseInfo.description }}</div>
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
              <div class="players-grid">

                <div class="player-card"
                  v-for="player in gameState.room.players" 
                  :key="player.id"
                  :class="getPlayerCardClass(player)"
                >
                  <div class="player-top">
                    <div class="player-avatar" :class="{ speaking: isSpeaking(player.id) }">
                      <div class="player-avatar_role" v-if="player.role">
                        <img  :src="`/roles/compressed/${player.role}.webp`"
                              :alt="getRoleName(player.role)"
                              class="role-image"
                              @error="handleRoleImageErrorSimple($event, player.role)">
                      </div>
                      <div v-else class="player-avatar_default">
                        {{ player.name[0]?.toUpperCase() }}
                      </div>
                    </div>
                    <div class="player-info">
                      <div class="player-username">{{ player.name }}</div>
                      <div class="player-role" v-if="player.role">{{ getRoleName(player.role) }}</div>
                    </div>
                    <div class="claws" v-if="isWerewolfRole(player.role) && player.role"></div>
                  </div>
                  
                  <!-- Универсальная система кнопок действий -->
                  <div class="player-handlers">
                    <div 
                      v-for="action in getPlayerActions(player)" 
                      :key="action.type"
                      class="player-handler_btn"
                      :class="[action.class, action.extraClass]"
                      :title="action.title"
                      @click="handlePlayerAction(action, player)"
                    >
                      {{ action.class === 'wide' ? action.text : '' }}
                    </div>
                  </div>
                </div>
                
                
              </div>
            </div>
            















            
            <!-- Прогресс ночных действий -->
            <NightProgress v-if="gameState.room.phase === 'night'" />
            
            <!-- [Подсказка о текущей фазе] + Кнопки ведущего -->
            <div class="phase-controls">
              <div class="phase-hint">
                <div class="hint-content">
                  <!-- Ночная фаза: специальная подсказка с кнопками -->
                  <template v-if="gameState.room.phase === 'night'">
                    <!-- Когда очередь игрока -->
                    <template v-if="gameState.nightAction.active">
                      <div class="night-hint-active">
                        <!-- <h4>{{ getRoleName(gameState.nightAction.role) }}</h4> -->
                        <p style="color: #fd5f5f">{{ getNightHint() }}</p>
                      </div>
                    </template>
                    
                    <!-- Когда не очередь игрока -->
                    <template v-else>
                      {{ getPhaseHint() }}
                    </template>
                  </template>
                  
                  <!-- Фаза голосования: показываем прогресс -->
                  <template v-else-if="gameState.room.phase === 'voting' && votingProgress">
                    <div class="voting-hint">
                      {{ getPhaseHint() }}
                      <div class="voting-progress">
                        <div class="votes-text">
                          Проголосовало: {{ votingProgress.voted }}/{{ votingProgress.total }}
                        </div>
                        <div class="human-icons">
                          <span 
                            v-for="i in votingProgress.total" 
                            :key="i"
                            class="human-icon"
                            :class="{ 'voted': i <= votingProgress.voted }"
                          >
                            👤
                          </span>
                        </div>
                      </div>
                    </div>
                  </template>
                  
                  <!-- Остальные фазы -->
                  <template v-else>
                    {{ getPhaseHint() }}
                  </template>
                </div>
                
                <!-- Кнопка и статус голосования за пропуск фазы -->
                <div v-if="canShowSkipButton" class="phase-skip-section">
                  <div class="skip-button-container">
                    <button 
                      v-if="!hasVotedSkip"
                      @click="voteSkipPhase"
                      class="skip-phase-btn"
                      title="Проголосовать за пропуск фазы"
                    >
                      Пропустить
                    </button>
                    <button 
                      v-else
                      @click="unvoteSkipPhase"
                      class="skip-phase-btn voted"
                      title="Отменить голос за пропуск"
                    >
                      Отменить
                    </button>
                  </div>
                  
                  <div class="skip-votes-display">
                    <div class="votes-text">
                      Голосов за пропуск: {{ phaseSkipStatus.votes }}/{{ phaseSkipStatus.required }}
                    </div>
                    <div class="human-icons">
                      <span 
                        v-for="i in phaseSkipStatus.total" 
                        :key="i"
                        class="human-icon"
                        :class="{ 
                          'voted': i <= phaseSkipStatus.votes,
                          'required': i <= phaseSkipStatus.required
                        }"
                      >
                        👤
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Дополнительные кнопки для центральных карт -->
              <div v-if="showCenterCardButtons()" class="center-actions">
                <!-- Провидец: центральные карты -->
                <template v-if="gameState.nightAction.role === 'seer'">
                  <button @click="seerLookCenter" class="center-action-btn">
                    👁️ Посмотреть центральные карты
                  </button>
                </template>
                
                <!-- Пьяница: выбор центральной карты -->
                <template v-if="gameState.nightAction.role === 'drunk'">
                  <div class="drunk-actions">
                    <p>Выберите центральную карту:</p>
                    <button v-for="index in 3" :key="index" @click="drunkSwap(index - 1)" class="center-action-btn">
                      Карта {{ index }}
                    </button>
                  </div>
                </template>
              </div>
              <!-- Кнопка результатов когда игра окончена -->
              <button v-if="gameState.room.phase === 'ended'" @click="showGameResults = true" class="results-btn">
                Результаты
              </button>
              <!-- Кнопка воздержания во время голосования -->
              <button v-else-if="gameState.room.phase === 'voting'" @click="abstainVote" 
                      class="abstain-btn" :class="{ 'pressed': votingAbstained }"
                      :disabled="votingAbstained">
                {{ votingAbstained ? 'Воздерживаетесь' : 'Воздержаться' }}
              </button>
              <!-- Кнопка пропуска -->
              <button v-else-if="gameState.nightAction.active" @click="skipNightAction" 
                      class="skip-action-btn" :class="{ 'pressed': nightActionSkipped }"
                      :disabled="nightActionSkipped">
                {{ nightActionSkipped ? 'Пропущено' : 'Пропустить' }}
              </button>
              <div v-else class="game-stats">
                <span>Дней пережито: {{ gameState.room.daysSurvived || 0 }}</span>
                <div class="v-spacer"></div>
                <span>Погибло мирных: {{ gameState.room.civiliansKilled || 0 }}</span>
              </div>
            </div>
            
            <!-- Результаты ночных действий -->
            <div v-if="gameState.room.phase === 'night' && gameState.nightAction.result && !gameState.nightAction.active" class="night-results">
              <div class="result-panel">
                <h3>{{ getRoleName(gameState.nightAction.role) }}</h3>
                <div class="server-result">
                  <p class="success">{{ gameState.nightAction.result.message }}</p>
                  <div v-if="gameState.nightAction.result.data.targetRole" class="role-info">
                    <strong>Роль игрока:</strong> {{ getRoleName(gameState.nightAction.result.data.targetRole) }}
                  </div>
                  <div v-if="gameState.nightAction.result.data.centerCards" class="center-cards-info">
                    <strong>Центральные карты:</strong> 
                    <span v-for="(card, index) in gameState.nightAction.result.data.centerCards" :key="index">
                      {{ getRoleName(card) }}<span v-if="index < gameState.nightAction.result.data.centerCards.length - 1">, </span>
                    </span>
                  </div>
                  <div v-if="gameState.nightAction.result.data.werewolves" class="werewolves-info">
                    <strong>Оборотни:</strong>
                    <ul>
                      <li v-for="wolf in gameState.nightAction.result.data.werewolves" :key="wolf.id">
                        {{ wolf.name }} ({{ getRoleName(wolf.role) }})
                      </li>
                    </ul>
                  </div>
                  <div v-if="gameState.nightAction.result.data.newRole" class="new-role-info">
                    <strong>Ваша новая роль:</strong> {{ getRoleName(gameState.nightAction.result.data.newRole) }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Центральная область остается пустой в фазе ended -->
            
          </div>
          
        </div>
      </template>
      
    </main>

    <!-- Правая панель - Игровой чат (фиксированная ширина) -->
    <aside class="game-sidebar">
      <GameChat ref="gameChatRef" />
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
    
    <RolesLibraryModal
      v-if="showRoles"
      :selected-roles="gameState.room?.selectedRoles || []"
      @close="showRoles = false"
    />
    
    <!-- Модальное окно результатов игры -->
    <GameResults 
      v-if="gameState.room.phase === 'ended' && showGameResults" 
      @close="showGameResults = false"
      @new-game="handleNewGame"
      @leave="handleLeaveGame"
    />
    
    <!-- Уведомления -->
    <div v-if="error" @click="error = null" class="error-notification">
      {{ error }}
    </div>

    <!-- Уведомления о шёпоте -->
    <!-- Debug: {{ whisperNotifications.length }} notifications -->
    <div v-for="notification in whisperNotifications" :key="notification.id" class="whisper-notification">
      {{ notification.message }}
    </div>

    <!-- Убрали тестовую кнопку -->

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '~/composables/useGame'
import { useUser } from '~/composables/useUser'
import { useSocket } from '~/composables/useSocket'
import { useAPI } from '~/composables/useAPI'
import { useVoiceActivity } from '~/composables/useVoiceActivity'
import { useSound } from '~/composables/useSound'
import { getRole, getAllRoles } from '../../../shared/rolesRegistry.js'
import { handleRoleImageErrorSimple } from '~/utils/imageUtils.js'
import MicrophoneSettings from '~/components/MicrophoneSettings.vue'
import SettingsModal from '~/components/SettingsModal.vue'
import RolesLibraryModal from '~/components/RolesLibraryModal.vue'
import NightProgress from '~/components/NightProgress.vue'

const route = useRoute()
const router = useRouter()

const { socket, isConnected } = useSocket()
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
  timer,
  loadRoomData,
  loadGameState,
  loadChatHistory,
  votePlayer,
  adminAction: gameAdminAction,
  executeNightAction,
  cleanup
} = useGame()

const { playSound } = useSound()

// Local state
const soundEnabled = ref(true)
const showCheatsheet = ref(false)
const showRoleModal = ref(false)
const showRules = ref(false)
const showRoles = ref(false)
const showGameResults = ref(false)
const error = ref(null)
const whisperNotifications = ref([])

// Состояния кнопок Skip/Abstain
const nightActionSkipped = ref(false)
const votingAbstained = ref(false)
const notificationTimeouts = new Map() // Хранилище для таймеров

// Отладка реактивности уведомлений
watch(whisperNotifications, (newVal) => {
  console.log('👁️ whisperNotifications changed:', newVal)
}, { deep: true })

// Отслеживаем смену фаз для звуковых эффектов
watch(() => gameState.room.phase, (newPhase, oldPhase) => {
  if (oldPhase && newPhase !== oldPhase) {
    console.log(`🎵 Phase changed: ${oldPhase} → ${newPhase}`)
    
    // Сбрасываем состояния кнопок при смене фазы
    nightActionSkipped.value = false
    votingAbstained.value = false
    
    // Воспроизводим соответствующий звук
    switch (newPhase) {
      case 'introduction':
        playSound('game-start')
        break
      case 'night':
        playSound('night', 0.1)
        break
      case 'day':
        playSound('day', 0.1)
        break
      case 'voting':
        playSound('voting-start')
        break
      case 'ended':
        playSound('notification')
        showGameResults.value = true // Автоматически показываем результаты
        break
      default:
        // playSound('phase-change')
    }
  }
})

// Отслеживаем начало ночной очереди игрока
watch(() => gameState.nightAction.active, (isActive, wasActive) => {
  if (isActive && !wasActive) {
    console.log('🎵 Your night turn started')
    playSound('night-turn')
  }
})

// Отслеживаем начало голосования (дополнительно к смене фазы)
watch(() => gameState.room.phase === 'voting', (isVoting, wasVoting) => {
  if (isVoting && !wasVoting) {
    console.log('🎵 Voting started')
    // Даем небольшую задержку после звука смены фазы
    setTimeout(() => {
      playSound('voting-start', 0.3) // Чуть тише
    }, 1000)
  }
})

// Refs
const gameChatRef = ref(null)

// Состояние микрофона
const showMicSettings = ref(false)

// Удалили старую систему шепота - теперь используем направленные уведомления

const roles = getAllRoles()

// Computed properties
const phaseInfo = computed(() => getPhaseInfo())

const canAdminControl = computed(() => {
  return currentPlayer.value.role === 'game_master' || currentPlayer.value.isHost
})

const votingProgress = computed(() => {
  if (gameState.room.phase !== 'voting') return null
  
  const totalPlayers = gameState.room.players.filter(p => 
    p.alive && p.role !== 'game_master'
  ).length
  
  // Считаем только голоса от игроков, которые могут голосовать
  const votedPlayers = Object.keys(gameState.voting.votes || {}).filter(voterId => {
    const voter = gameState.room.players.find(p => p.id === voterId)
    return voter && voter.alive && voter.role !== 'game_master'
  }).length
  
  return {
    voted: votedPlayers,
    total: totalPlayers
  }
})

const isWerewolf = computed(() => {
  const role = currentPlayer.value.role
  if (!role) return false
  
  const werewolfRoles = [
    'werewolf', 'werewolf_2', 'werewolf_3',
    'mystic_wolf', 'alpha_wolf', 'dream_wolf'
  ]
  
  return werewolfRoles.includes(role)
})

const phaseSkipStatus = computed(() => {
  return gameState.room.phaseSkipStatus || {
    votes: 0,
    required: 0,
    total: 0,
    canSkip: false,
    voters: []
  }
})

const canShowSkipButton = computed(() => {
  const phase = gameState.room.phase
  return phase === 'introduction' || phase === 'day'
})

const hasVotedSkip = computed(() => {
  const myId = currentPlayer.value?.id
  return myId && phaseSkipStatus.value.voters.includes(myId)
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

const handleLeaveGame = async () => {
  try {
    const api = useAPI()
    const isHost = currentPlayer.value?.isHost
    
    if (isHost) {
      // Если ведущий покидает игру - удаляем комнату
      await api.deleteRoom(route.params.id)
    } else {
      // Обычный игрок просто покидает комнату
      await api.leaveRoom(route.params.id, currentPlayer.value?.id)
    }
    
    // Отключаемся от сокета и переходим на главную
    if (socket.value) {
      socket.value.disconnect()
    }
    
    router.push('/')
  } catch (error) {
    console.error('Failed to leave game:', error)
    // Всё равно переходим на главную в случае ошибки
    router.push('/')
  }
}

const handleNewGame = async () => {
  const canStart = currentPlayer.value?.isHost || currentPlayer.value?.role === 'game_master'
  if (!canStart) return
  
  try {
    const api = useAPI()
    await api.resetRoom(route.params.id)
    
    // Сервер отправит событие room-reset которое обновит состояние
    console.log('✅ New game requested, waiting for room-reset event')
  } catch (error) {
    console.error('Failed to start new game:', error)
  }
}

// Player methods

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

// Удален метод isWhispering - больше не нужен

const isSpeaking = (playerId) => {
  const isCurrentlySpeaking = speakingPlayers.value.includes(playerId)
  return isCurrentlySpeaking
}

// Обработка направленного шепота
const handleWhisperDirection = (data) => {
  console.log('👁️ [WHISPER] Processing whisper direction:', data)
  console.log('👁️ [WHISPER] Current notifications before:', whisperNotifications.value)
  
  try {
    const directionText = data.direction === 'right' ? 'справа' : 'слева'
    const message = `Вы услышали шёпот ${directionText} от вас`
    
    // Простая очистка массива
    whisperNotifications.value.length = 0
    
    // Создаем простое уведомление
    const notification = {
      id: Date.now(),
      message,
      timestamp: Date.now()
    }
    
    console.log('👁️ [WHISPER] Created notification:', notification)
    
    // Добавляем уведомление
    whisperNotifications.value.push(notification)
    
    console.log('👁️ [WHISPER] Notifications after push:', whisperNotifications.value)
    console.log('👁️ [WHISPER] Array length:', whisperNotifications.value.length)
    
    // Простой таймер удаления
    setTimeout(() => {
      console.log('👁️ [WHISPER] Timeout triggered, removing notification')
      const index = whisperNotifications.value.findIndex(n => n.id === notification.id)
      if (index !== -1) {
        whisperNotifications.value.splice(index, 1)
        console.log('👁️ [WHISPER] Notification removed, remaining:', whisperNotifications.value.length)
      }
    }, 3000)
    
  } catch (error) {
    console.error('👁️ [WHISPER] Error in handleWhisperDirection:', error)
  }
}

const getPlayerCardClass = (player) => {
  const classes = []
  
  if (player.isMe) classes.push('is-me')
  if (!player.alive) classes.push('is-dead')
  if (!player.connected) classes.push('is-offline')
  if (player.isHost) classes.push('is-host')
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

// Night action state
const selectedTarget1 = ref('')
const selectedTarget2 = ref('')

// Action methods
const showMyRoleInfo = () => {
  showRoleModal.value = true
}

const openWhisperTo = (player) => {
  if (gameChatRef.value && gameChatRef.value.setInputText) {
    const currentText = gameChatRef.value.messageText || ''
    const trimmedText = currentText.trim()
    
    let whisperCommand
    
    // Если текст пустой или начинается с команды (слеша), перезаписываем
    if (!trimmedText || trimmedText.startsWith('/')) {
      whisperCommand = `/ш ${player.name} `
    } else {
      // Иначе дописываем команду перед существующим текстом
      whisperCommand = `/ш ${player.name} ${trimmedText}`
    }
    
    gameChatRef.value.setInputText(whisperCommand)
  }
}


const canVoteFor = (player) => {
  // Мертвые игроки не могут голосовать, также нельзя голосовать за себя и game_master
  const currentPlayerAlive = currentPlayer.value?.alive !== false
  return currentPlayerAlive && player.alive && !player.isMe && player.role !== 'game_master'
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

const abstainVote = () => {
  votePlayer(null) // null означает воздержание
  votingAbstained.value = true
}

const resurrectPlayer = (targetId) => {
  if (!socket.value) return
  
  socket.value.emit('resurrect-player', {
    targetId: targetId
  })
}

const voteSkipPhase = () => {
  if (!socket.value) return
  
  socket.value.emit('skip-phase', {
    action: 'vote'
  })
}

const unvoteSkipPhase = () => {
  if (!socket.value) return
  
  socket.value.emit('skip-phase', {
    action: 'unvote'
  })
}

const adminAction = (action, targetId) => {
  gameAdminAction(action, targetId)
}

const extendPhase = async () => {
  try {
    const api = useAPI()
    const data = await api.managePhase(route.params.id, 'extend-phase', currentPlayer.value?.id)
    console.log('Phase extended:', data.message)
    
  } catch (err) {
    console.error('Error extending phase:', err)
    error.value = err.message
  }
}

const nightAction = async (type, targetName) => {
  let action = {}
  
  switch (type) {
    case 'look_player':
      action = { type: 'look_player', targetName }
      break
    case 'vote_kill':
      action = { type: 'vote_kill', targetName }
      break
    case 'select_target':
      // Определяем тип действия по роли
      const role = gameState.nightAction.role
      switch (role) {
        case 'werewolf':
        case 'werewolf_2':
        case 'werewolf_3':
        case 'mystic_wolf':
          action = { type: 'vote_kill', targetName }
          break
        case 'robber':
          action = { targetName } // Грабитель просто указывает цель
          break
        case 'bodyguard':
          action = { targetName } // Охранник защищает
          break
        case 'doppelganger':
          action = { targetName } // Двойник копирует
          break
        case 'minion':
          action = {} // Миньон не выбирает, просто узнает оборотней
          break
        default:
          action = { targetName }
      }
      break
  }
  
  const result = await executeNightAction(action)
  
  // Воспроизводим звук только если действие завершено успешно
  if (result.success && !result.message?.includes('Чат заполнен')) {
    playSound('night-action')
  }
}

// Night action helper methods
const canNightActionTarget = (player) => {
  const myRole = currentPlayer.value?.role
  const currentPhase = gameState.room.phase
  
  // Проверяем, что это ночная фаза, у нас есть активное действие
  if (currentPhase !== 'night' || !gameState.nightAction.active) {
    return false
  }
  
  // Проверяем, что это наша очередь
  if (gameState.nightAction.role !== myRole) {
    return false
  }
  
  // Волк-сновидец не имеет ночных действий с игроками
  if (myRole === 'dream_wolf') {
    return false
  }
  
  // Базовые ограничения: игрок должен быть живым, не быть нами, не быть ведущим
  if (!player.alive || player.isMe || player.role === 'game_master') {
    return false
  }
  
  // Специфичные для роли ограничения
  switch (myRole) {
    case 'werewolf':
    case 'werewolf_2': 
    case 'werewolf_3':
    case 'mystic_wolf':
      // Оборотни не могут убивать других оборотней
      return !isWerewolfRole(player.role)
      
    case 'bodyguard':
    case 'robber':
    case 'doppelganger':
    case 'slut':
    case 'cthulhu':
      // Эти роли могут выбрать любого живого игрока (кроме себя)
      return true
      
    default:
      return true
  }
}

const selectTroublemakerTarget = (targetName) => {
  playSound('night-action')
  
  if (!selectedTarget1.value) {
    selectedTarget1.value = targetName
  } else if (!selectedTarget2.value && targetName !== selectedTarget1.value) {
    selectedTarget2.value = targetName
    // Выполняем действие когда выбраны оба игрока
    executeNightAction({ 
      target1Name: selectedTarget1.value, 
      target2Name: selectedTarget2.value 
    })
    // Сбрасываем выбор
    selectedTarget1.value = ''
    selectedTarget2.value = ''
  } else if (targetName === selectedTarget1.value) {
    // Снимаем выбор с первого игрока
    selectedTarget1.value = selectedTarget2.value || ''
    selectedTarget2.value = ''
  } else if (targetName === selectedTarget2.value) {
    // Снимаем выбор со второго игрока
    selectedTarget2.value = ''
  }
}

const getTargetButtonText = (playerName) => {
  if (selectedTarget1.value === playerName) return '1-й выбор'
  if (selectedTarget2.value === playerName) return '2-й выбор'
  return 'Выбрать'
}

const getNightActionButtonEmoji = () => {
  const role = gameState.nightAction.role
  switch (role) {
    case 'werewolf':
    case 'werewolf_2':
    case 'werewolf_3':
    case 'mystic_wolf':
      return '☠️'
    case 'robber':
      return '🔄'
    case 'bodyguard':
      return '🛡️'
    case 'doppelganger':
      return '👥'
    case 'seer':
      return '👁️'
    case 'slut':
      return '🚫'
    default:
      return '✨'
  }
}

const getNightHint = () => {
  const role = gameState.nightAction.role
  const roleInfo = roles[role]
  return roleInfo?.phaseHints?.night || 'Выберите действие или пропустите'
}

const showCenterCardButtons = () => {
  const role = gameState.nightAction.role
  return role === 'seer' || role === 'drunk'
}

const seerLookCenter = async () => {
  playSound('night-action')
  await executeNightAction({ type: 'look_center', centerCards: [0, 1] })
}

const drunkSwap = async (centerIndex) => {
  playSound('night-action')
  await executeNightAction({ centerIndex })
}

const skipNightAction = async () => {
  const result = await executeNightAction({ type: 'skip' })
  if (result.success) {
    playSound('night-action')
    nightActionSkipped.value = true
  }
}

// Тестовая функция для отладки
const testNotification = () => {
  console.log('🔥 [TEST] Testing notification manually')
  handleWhisperDirection({ direction: 'left' })
}

// Система кнопок действий для игроков
const getPlayerActions = (player) => {
  if (player.isMe) {
    return [{ 
      type: 'role_info', 
      text: 'Это вы', 
      title: 'Информация о вашей роли',
      class: 'wide',
      condition: true,
      action: () => alert('Заглушка')
    }]
  }

  const actions = []
  const currentPhase = gameState.room.phase
  const myRole = currentPlayer.value?.role
  
  // Сообщение (всегда доступно для других игроков)
  actions.push({
    type: 'whisper',
    class: 'msg',
    title: 'Отправить личное сообщение',
    condition: true,
    action: () => openWhisperTo(player)
  })
  
  
  // Админские функции
  if (canAdminControl.value) {
    // actions.push({
    //   type: 'defend',
    //   class: 'defend',
    //   title: 'Защитить игрока',
    //   condition: true,
    //   action: () => adminAction('protect', player.id)
    // })
    
    // Убить/Воскресить в зависимости от состояния
    actions.push({
      type: player.alive ? 'kill' : 'revive',
      class: player.alive ? 'kill' : 'revive',
      title: player.alive ? 'Убить игрока' : 'Воскресить игрока',
      condition: true,
      action: () => adminAction(player.alive ? 'kill' : 'revive', player.id)
    })
    
  }
  
  // Голосование
  if (currentPhase === 'voting' && canVoteFor(player)) {
    const hasVoted = gameState.voting.myVote !== null
    const votedForThisPlayer = gameState.voting.myVote === player.id
    
    actions.push({
      type: 'vote',
      class: 'vote',
      title: votedForThisPlayer ? 'Вы проголосовали за этого игрока' : 
             (hasVoted ? 'Вы уже проголосовали' : 'Проголосовать за исключение'),
      condition: true,
      action: () => voteForPlayer(player.id),
      extraClass: votedForThisPlayer ? 'active' : (hasVoted ? 'off' : '')
    })
  }
  
  // Воскрешение для некроманта (доступно в любое время кроме голосования)
  if (myRole === 'necromancer' && currentPhase !== 'voting' && !player.alive) {
    const necromancerUsed = currentPlayer.value?.necromancerUsed
    
    actions.push({
      type: 'resurrect',
      class: 'revive',
      title: necromancerUsed ? 'Воскрешение уже использовано' : 'Воскресить игрока',
      condition: true,
      action: () => resurrectPlayer(player.id),
      extraClass: necromancerUsed ? 'off' : ''
    })
  }
  
  // Ночные действия - только во время активной ночной фазы
  if (currentPhase === 'night' && gameState.nightAction.active && canNightActionTarget(player)) {
    const nightActionCompleted = gameState.nightAction.result !== null
    // Провидец и Мистический волк - осмотр игрока
    if (myRole === 'seer' || myRole === 'mystic_wolf') {
      actions.push({
        type: 'inspect',
        class: 'inspect',
        title: nightActionCompleted ? 'Вы уже совершили действие' : 'Посмотреть роль игрока',
        condition: true,
        extraClass: nightActionCompleted ? 'active' : '',
        action: () => nightAction('look_player', player.name)
      })
      
      // Мистический волк дополнительно может голосовать за убийство
      if (myRole === 'mystic_wolf') {
        actions.push({
          type: 'vote_kill',
          class: 'vote-kill',
          title: nightActionCompleted ? 'Вы уже совершили действие' : 'Проголосовать за убийство',
          condition: true,
          extraClass: nightActionCompleted ? 'active' : '',
          action: () => nightAction('vote_kill', player.name)
        })
      }
    }
    
    else if (myRole === 'werewolf' || myRole === 'werewolf_2' || myRole === 'werewolf_3') {
      actions.push({
        type: 'vote_kill',
        class: 'vote-kill',
        title: nightActionCompleted ? 'Вы уже совершили действие' : 'Проголосовать за убийство',
        condition: true,
        extraClass: nightActionCompleted ? 'active' : '',
        action: () => nightAction('vote_kill', player.name)
      })
    }
    
    // Смутьян - выбор двух игроков
    else if (myRole === 'troublemaker') {
      const isSelected = selectedTarget1.value === player.name || selectedTarget2.value === player.name
      let extraClass = ''
      let title = ''
      
      if (nightActionCompleted) {
        extraClass = 'active'
        title = 'Вы уже совершили действие'
      } else if (isSelected) {
        extraClass = 'selected'
        title = selectedTarget1.value === player.name ? 'Выбран как первая цель' : 'Выбран как вторая цель'
      } else {
        title = 'Выбрать для обмена ролями'
      }
      
      actions.push({
        type: 'troublemake',
        class: 'troublemake',
        title: title,
        condition: true,
        extraClass: extraClass,
        action: () => selectTroublemakerTarget(player.name)
      })
    }
    
    // Стандартные роли - выбор одного игрока  
    else if (myRole !== 'drunk' && myRole !== 'dream_wolf') {
      // Определяем класс кнопки в зависимости от роли
      let buttonClass = 'night-action'
      let title = ''
      
      if (myRole === 'bodyguard') {
        buttonClass = 'shield'
        title = nightActionCompleted ? 'Вы уже совершили действие' : 'Защитить игрока'
      } else if (myRole === 'robber') {
        buttonClass = 'swap'
        title = nightActionCompleted ? 'Вы уже совершили действие' : 'Поменяться ролями'
      } else if (myRole === 'slut') {
        buttonClass = 'block'
        title = nightActionCompleted ? 'Вы уже совершили действие' : 'Отключить способность'
      } else if (myRole === 'doppelganger') {
        buttonClass = 'copy'
        title = nightActionCompleted ? 'Вы уже совершили действие' : 'Скопировать роль'
      } else if (myRole === 'cthulhu') {
        buttonClass = 'message'
        title = nightActionCompleted ? 'Вы уже совершили действие' : 'Дать приказ игроку'
      } else if (myRole === 'insomniac') {
        buttonClass = 'check'
        title = nightActionCompleted ? 'Вы уже совершили действие' : 'Проверить свою роль'
      } else if (myRole === 'minion') {
        buttonClass = 'reveal'
        title = nightActionCompleted ? 'Вы уже совершили действие' : 'Найти оборотней'
      } else {
        buttonClass = 'night-action'
        title = nightActionCompleted ? 'Вы уже совершили действие' : 'Выполнить ночное действие'
      }
      
      actions.push({
        type: 'night_action',
        class: buttonClass,
        title: title,
        condition: true,
        extraClass: nightActionCompleted ? 'active' : '',
        action: () => nightAction('select_target', player.name)
      })
    }
  }
  
  // Предупреждение/Кик (только для ведущего)
  if (canAdminControl.value) {
    actions.push({
      type: 'warn',
      class: 'warn',
      title: 'Выгнать игрока из комнаты',
      condition: true,
      action: () => adminAction('kick', player.id)
    })
  }
  
  return actions.filter(action => action.condition)
}

// Универсальный обработчик действий
const handlePlayerAction = (action, player) => {
  // Не выполняем действие для отключенных кнопок
  if (action.extraClass === 'off') {
    console.log('🚫 Action blocked - button is off')
    return
  }
  
  if (action.action) {
    action.action()
  }
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
  
  // Добавляем обработчики шепота
  if (socket.value) {
    socket.value.on('whisper-direction', (data) => {
      console.log('👁️ Received whisper-direction event:', data)
      handleWhisperDirection(data)
    })
    socket.value.on('voice-activity', (data) => {
      console.log('🎤 Voice activity received in [id].vue:', data)
      
      // Преобразуем формат события для handlePlayerVoiceActivity
      const eventData = {
        playerId: data.playerId,
        speaking: true // если событие пришло, значит игрок говорит
      }
      
      console.log('🔧 Calling handlePlayerVoiceActivity with:', eventData)
      handlePlayerVoiceActivity(eventData)
      
      // Убираем игрока из speaking через короткое время
      setTimeout(() => {
        handlePlayerVoiceActivity({
          playerId: data.playerId,
          speaking: false
        })
      }, 1000) // убираем через 1 секунду
    })
  }
  
  try {
    // Сначала загружаем базовые данные комнаты через HTTP
    console.log('🔄 Loading initial room data via HTTP...')
    await loadRoomData(roomId)
    console.log('✅ Initial room data loaded successfully')
    
    // Проверяем, нужно ли присоединиться как игрок
    const { username } = useUser()
    let playerId = null
    
    if (username.value && !gameState.player.id) {
      console.log('🔄 Waiting for socket connection before joining...')
      
      // Ждем подключения сокета с таймаутом
      let attempts = 0
      const maxAttempts = 50 // 5 секунд
      
      while (!isConnected.value && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      
      if (isConnected.value) {
        console.log('🔄 Socket connected, joining room as player...')
        const joinResult = await joinRoom(roomId, username.value, true) // skip room data check
        console.log('✅ Joined room successfully')
        playerId = gameState.player.id
        console.log('✅ Player ID after join:', playerId)
        
        // Запрашиваем актуальный статус всех игроков после присоединения
        setTimeout(() => {
          console.log('🔄 Requesting players status sync after join...')
        }, 200)
      } else {
        console.warn('⚠️ Socket connection timeout, joining as observer via HTTP API')
        gameState.connected = false
      }
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

    // После определения playerId загружаем полное состояние игры только для ночной фазы
    if (playerId && gameState.room.phase === 'night') {
      console.log('🔄 Loading full game state for night phase restoration...')
      await loadGameState(roomId, playerId, { force: true })
      console.log('✅ Full game state loaded with night actions restored')
    } else if (playerId) {
      console.log('📋 Player context available, state already loaded')
    }

    // ВСЕГДА запрашиваем актуальную синхронизацию статуса игроков после загрузки
    if (isConnected.value && socket.value) {
      setTimeout(() => {
        console.log('🔄 Requesting mandatory players status sync...')
        // Принудительно запрашиваем актуальный статус всех игроков
        socket.value.emit('request-players-sync')
      }, 500) // Даём время серверу обработать присоединение
    }

    // Загружаем историю чата с учетом прав доступа игрока
    console.log('🔄 Loading chat history...')
    console.log('🔄 About to load chat with playerId:', playerId)
    console.log('🔄 gameState.player before chat load:', gameState.player)
    await loadChatHistory(roomId, playerId)
    
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
    socket.value.off('whisper-direction', handleWhisperDirection)
    socket.value.off('voice-activity', handlePlayerVoiceActivity)
  }
  cleanup()
})
</script>

<style scoped>
/* Удалили старые стили анимации шепота */

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

/* Стили для кнопок ночных действий */
.night-action-btn {
  background: #4f46e5 !important;
  color: white !important;
  font-size: 1.2rem;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px !important;
  animation: night-action-pulse 2s ease-in-out infinite;
  border: none !important;
  border-radius: 6px !important;
}

.night-action-btn.look {
  background: #06b6d4 !important;
}

.night-action-btn.kill {
  background: #dc2626 !important;
}

.night-action-btn.swap {
  background: #f59e0b !important;
}

.night-action-btn.swap.selected {
  background: #10b981 !important;
  animation: none;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

.night-action-btn.standard {
  background: #6366f1 !important;
}

.night-action-btn.shield {
  background: #10b981 !important;
}

.night-action-btn.block {
  background: #ef4444 !important;
}

.night-action-btn.copy {
  background: #8b5cf6 !important;
}

.night-action-btn.message {
  background: #6366f1 !important;
}

.night-action-btn.check {
  background: #06b6d4 !important;
}

.night-action-btn.reveal {
  background: #f59e0b !important;
}

.night-action-btn.revive {
  background: #22c55e !important;
}

.night-action-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 0 12px rgba(79, 70, 229, 0.6);
}

.night-action-btn.disabled {
  background: #6b7280 !important;
  cursor: not-allowed !important;
  opacity: 0.5;
  animation: none;
}

@keyframes night-action-pulse {
  0%, 100% {
    box-shadow: 0 0 5px rgba(79, 70, 229, 0.4);
  }
  50% {
    box-shadow: 0 0 15px rgba(79, 70, 229, 0.8);
  }
}

/* Стили для ночной подсказки */
.night-hint-active {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.night-hint-active h4 {
  color: #4f46e5;
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.night-hint-active p {
  margin: 0;
  color: #d1d5db;
}

.center-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.center-action-btn {
  background: #06b6d4;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.center-action-btn:hover {
  background: #0891b2;
}

.drunk-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.drunk-actions p {
  margin: 0;
  color: #d1d5db;
  font-size: 0.9rem;
}

.skip-action-btn {
  background: #91a7d48c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.skip-action-btn:hover:not(:disabled) {
  background: #4b5563;
}

.skip-action-btn.pressed {
  background: #4ade80;
  color: #000;
  cursor: default;
}

.skip-action-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.results-btn {
  background: #059669;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.results-btn:hover {
  background: #047857;
}

.abstain-btn {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.abstain-btn:hover:not(:disabled) {
  background: #d97706;
}

.abstain-btn.pressed {
  background: #4ade80;
  color: #000;
  cursor: default;
}

.abstain-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.admin-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.2s;
  margin-left: 0.5rem;
}

.admin-btn:hover {
  background: #4b5563;
}

.admin-btn.extend-btn {
  background: #059669;
}

.admin-btn.extend-btn:hover {
  background: #047857;
}

.admin-btn.phase-btn {
  background: #dc2626;
}

.admin-btn.phase-btn:hover {
  background: #b91c1c;
}

/* Результаты ночных действий */
.night-results {
  max-width: 600px;
  margin: 1rem auto 0;
}

.result-panel {
  background: #1e3a2e;
  border: 1px solid #059669;
  border-radius: 8px;
  padding: 1.5rem;
}

.result-panel h3 {
  color: #f9fafb;
  margin: 0 0 1rem 0;
}

.server-result .success {
  color: #86efac;
  font-weight: 600;
  margin-bottom: 1rem;
}

.server-result .role-info,
.server-result .center-cards-info,
.server-result .werewolves-info,
.server-result .new-role-info {
  margin-top: 0.75rem;
  color: #f9fafb;
}

.server-result strong {
  color: #fbbf24;
}

.server-result ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.server-result li {
  margin-bottom: 0.25rem;
}

/* Уведомления о шепоте */
.whisper-notification {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(156, 39, 176, 0.95);
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1.1rem;
  z-index: 9999;
  box-shadow: 0 4px 20px rgba(156, 39, 176, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.2);
  min-width: 300px;
  text-align: center;
  pointer-events: none;
}

.whisper-notification + .whisper-notification {
  margin-top: 60px;
}

@keyframes whisper-notification-appear {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  10% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  90% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
}

/* Стили для прогресса голосования */
.voting-hint {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.voting-progress {
  color: #fbbf24;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
  padding: 0.25rem 0.5rem;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.votes-text {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.human-icons {
  display: flex;
  justify-content: center;
  gap: 2px;
  flex-wrap: wrap;
}

.human-icon {
  font-size: 1.2rem;
  opacity: 0.3;
  transition: all 0.3s ease;
}

.human-icon.voted {
  opacity: 1;
  color: #22c55e;
}

.human-icon.required {
  border: 1px solid #fbbf24;
  border-radius: 50%;
  background: rgba(251, 191, 36, 0.1);
}

/* Стили для пропуска фазы */
.phase-skip-section {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.skip-button-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.skip-phase-btn {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.skip-phase-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.skip-phase-btn.voted {
  background: #22c55e;
  color: white;
}

.skip-phase-btn.voted:hover {
  background: #16a34a;
}

.skip-votes-display {
  text-align: center;
}

.skip-votes-display .votes-text {
  color: #3b82f6;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.skip-votes-display .human-icons .human-icon {
  color: #3b82f6;
}

.skip-votes-display .human-icons .human-icon.voted {
  color: #22c55e;
}

</style>