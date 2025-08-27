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
                <div class="phase-icon" :class="gameState.room.phase"></div>
                <div class="phase-description">
                  <h2 style="display: flex; align-items: center; gap: 8px;">
                    {{ phaseInfo.name }}
                    <span v-if="canAdminControl && gameState.room.phase !== 'setup'">
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
                  <div class="player-actions" :class="{ 'night-active': gameState.room.phase === 'night' && gameState.nightAction.active }">
                    
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
                      
                      <!-- Ночные действия - только во время очереди игрока -->
                      <template v-if="gameState.room.phase === 'night' && gameState.nightAction.active">
                        
                        <!-- Провидец и Мистический волк: выбор между игроком и центральными картами -->
                        <template v-if="(gameState.nightAction.role === 'seer' || gameState.nightAction.role === 'mystic_wolf') && canNightActionTarget(player)">
                          <button 
                            @click="nightAction('look_player', player.name)"
                            class="action-btn night-action-btn look"
                          >
                            👁️
                          </button>
                          <button 
                            v-if="gameState.nightAction.role === 'mystic_wolf'"
                            @click="nightAction('vote_kill', player.name)"
                            class="action-btn night-action-btn kill"
                          >
                            ☠️
                          </button>
                        </template>
                        
                        <!-- Смутьян: выбор двух игроков -->
                        <template v-else-if="gameState.nightAction.role === 'troublemaker' && canNightActionTarget(player)">
                          <button 
                            @click="selectTroublemakerTarget(player.name)"
                            class="action-btn night-action-btn swap"
                            :class="{ 
                              selected: selectedTarget1 === player.name || selectedTarget2 === player.name
                            }"
                          >
                            {{ getTargetButtonText(player.name) }}
                          </button>
                        </template>
                        
                        <!-- Пьяница: не может выбирать игроков -->
                        <template v-else-if="gameState.nightAction.role === 'drunk'">
                          <!-- Ничего не показываем, только центральные карты -->
                        </template>
                        
                        <!-- Стандартные роли: выбор одного игрока -->
                        <template v-else-if="canNightActionTarget(player)">
                          <button 
                            @click="nightAction('select_target', player.name)"
                            class="action-btn night-action-btn standard"
                          >
                            {{ getNightActionButtonEmoji() }}
                          </button>
                        </template>
                        
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
                  <!-- Ночная фаза: специальная подсказка с кнопками -->
                  <template v-if="gameState.room.phase === 'night'">
                    <!-- Когда очередь игрока -->
                    <template v-if="gameState.nightAction.active">
                      <div class="night-hint-active">
                        <h4>{{ getRoleName(gameState.nightAction.role) }}</h4>
                        <p>{{ getNightHint() }}</p>
                        
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
                        
                        <!-- Кнопка пропуска -->
                        <button @click="skipNightAction" class="skip-action-btn">
                          Пропустить
                        </button>
                      </div>
                    </template>
                    
                    <!-- Когда не очередь игрока -->
                    <template v-else>
                      {{ getPhaseHint() }}
                    </template>
                  </template>
                  
                  <!-- Остальные фазы -->
                  <template v-else>
                    {{ getPhaseHint() }}
                  </template>
                </div>
              </div>
              <div class="game-stats">
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
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
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
  timer,
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

// Refs
const gameChatRef = ref(null)

// Состояние микрофона
const showMicSettings = ref(false)

// Состояние шепчущих игроков - используем reactive для отслеживания изменений объекта
const whisperingPlayers = reactive({})

const roles = getAllRoles()

// Computed properties
const phaseInfo = computed(() => getPhaseInfo())

const canAdminControl = computed(() => {
  return currentPlayer.value.role === 'game_master' || currentPlayer.value.isHost
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
  
  // Миньон видит роли оборотней (но они его не видят)
  if (currentPlayer.value.role === 'minion' && isWerewolfRole(player.role) && gameState.room.phase !== 'setup') {
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
  return whisperingPlayers[playerId] === true
}

const isSpeaking = (playerId) => {
  const isCurrentlySpeaking = speakingPlayers.value.includes(playerId)
  return isCurrentlySpeaking
}

// Обработка активности шепота
const handleWhisperActivity = (data) => {
  if (data.playerId) {
    whisperingPlayers[data.playerId] = true
    
    // Убираем индикацию через 500ms
    setTimeout(() => {
      whisperingPlayers[data.playerId] = false
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
  
  await executeNightAction(action)
}

// Night action helper methods
const canNightActionTarget = (player) => {
  return player.alive && !player.isMe && player.role !== 'game_master'
}

const selectTroublemakerTarget = (targetName) => {
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
  await executeNightAction({ type: 'look_center', centerCards: [0, 1] })
}

const drunkSwap = async (centerIndex) => {
  await executeNightAction({ centerIndex })
}

const skipNightAction = async () => {
  await executeNightAction({ type: 'skip' })
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
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.skip-action-btn:hover {
  background: #4b5563;
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

</style>