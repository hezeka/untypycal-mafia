import { ref, computed, reactive, readonly } from 'vue'
import { useSocket } from './useSocket'
import { useSounds } from './useSound'

// Global state for socket listeners (to prevent multiple initialization)
let globalListenersInitialized = false

// Global state (persists across components)
const player = reactive({
  id: null,
  name: '',
  role: null
})

const voiceActivity = reactive({
  speakingPlayers: new Set(), // ID игроков, которые говорят
  enabled: false
})

const room = reactive({
  id: null,
  hostId: null,
  isHost: false
})

const gameData = reactive({
  players: [],
  selectedRoles: [],
  gameState: 'setup',
  currentPhase: null,
  chat: [],
  timer: null,
  roles: {} // Конфигурация ролей с сервера
})

// Роли теперь загружаются с сервера
// Локальный объект roles больше не нужен

export const useGame = () => {
  const { socket } = useSocket()
  const { playSound } = useSounds()

  // Computed properties
  const isInRoom = computed(() => !!room.id)
  const isHost = computed(() => room.isHost || player.role === 'game_master')
  
  const currentPlayer = computed(() => {
    // Используем более надежный поиск игрока
    const current = gameData.players.find(p => 
      p.id === player.id || 
      p.id === socket.id || 
      p.name === player.name
    )
    
    // Логируем только при отладке и только важные изменения
    if (process.env.NODE_ENV === 'development') {
      if (current && !current._lastLogged) {
        console.log('✅ Current player found:', { 
          id: current.id, 
          name: current.name, 
          role: current.role || 'no_role'
        })
        current._lastLogged = true
      }
    }
    
    return current
  })
  
  const otherPlayers = computed(() => gameData.players.filter(p => p.id !== player.id && p.role !== 'game_master'))
  const allPlayers = computed(() => gameData.players.filter(p => p.role !== 'game_master'))
  const allPlayersForVoting = computed(() => gameData.players.filter(p => p.role !== 'game_master'))
  const selectedRoleObjects = computed(() => 
    gameData.selectedRoles.map(roleId => ({ id: roleId, ...(gameData.roles[roleId] || {}) }))
  )
  const chatMessages = computed(() => gameData.chat)

  // Socket event handlers
  const initSocketListeners = () => {
    // Предотвращаем множественную инициализацию используя глобальное состояние
    if (globalListenersInitialized) {
      console.log('⚠️ Socket listeners already initialized, skipping')
      return
    }
    
    console.log('🔌 Initializing socket listeners')
    globalListenersInitialized = true
    
    socket.on('new-message', (message) => {
      // Существующий код
      const existingMessage = gameData.chat.find(m => m.id === message.id)
      if (!existingMessage) {
        gameData.chat.push(message)
        
        // ДОБАВЛЯЕМ ЗВУК - только если сообщение не от текущего игрока
        if (message.playerId !== player.id) {
          if (message.type === 'system') {
            playSound('notification', 0.7)
          } else {
            playSound('message', 0.4)
          }
        }
      }
    })
    
    // ИСПРАВЛЕНИЕ: Обрабатываем шепоты как обычные сообщения чата
    socket.on('new-whisper', (whisperMessage) => {
      console.log('📨 Received whisper:', whisperMessage)
      
      // Проверяем, нет ли уже такого сообщения
      const existingWhisper = gameData.chat.find(m => m.id === whisperMessage.id)
      if (!existingWhisper) {
        // ДОБАВЛЯЕМ шепот в общий чат как обычное сообщение
        gameData.chat.push(whisperMessage)
        
        // ДОБАВЛЯЕМ ЗВУК - только если шепот не от текущего игрока
        if (whisperMessage.playerId !== player.id) {
          playSound('whisper', 0.6)
        }
      }
    })

    socket.on('voice-activity-update', ({ playerId, isActive, playerName }) => {
      if (isActive) {
        voiceActivity.speakingPlayers.add(playerId)
        // console.log(`🎤 ${playerName} начал говорить`)
      } else {
        voiceActivity.speakingPlayers.delete(playerId)
        // console.log(`🔇 ${playerName} перестал говорить`)
      }
    })
    
    socket.on('room-created', ({ roomId, gameData: newGameData }) => {
      // Предотвращаем обработку дублирующихся событий
      if (room.id === roomId && room.isHost) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Duplicate room-created event ignored for room:', roomId)
        }
        return
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🏠 Room created:', roomId)
      }
      
      room.id = roomId
      room.hostId = newGameData.hostId
      room.isHost = newGameData.hostId === socket.id
      
      // Обновляем player.id СРАЗУ
      player.id = socket.id
      
      updateGameData(newGameData)
    })

    socket.on('join-success', (newGameData) => {
      // Предотвращаем обработку дублирующихся событий
      if (room.id === newGameData.id && player.role) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Duplicate join-success event ignored for room:', newGameData.id)
        }
        return
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📥 Join success for room:', newGameData.id)
      }
      
      // КРИТИЧЕСКИ ВАЖНО: обновляем player.id до всех операций
      player.id = socket.id
      
      // Successful join/rejoin
      room.id = newGameData.id
      room.hostId = newGameData.hostId
      room.isHost = newGameData.hostId === socket.id
      
      // Restore player role from server data СРАЗУ, до updateGameData
      const currentPlayerData = newGameData.players?.find(p => 
        p.id === socket.id || 
        p.name === player.name
      )
      
      if (currentPlayerData) {
        // Обновляем все данные игрока СРАЗУ
        player.id = currentPlayerData.id
        player.name = currentPlayerData.name
        
        if (currentPlayerData.role) {
          player.role = currentPlayerData.role
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Restored role: ${currentPlayerData.role}`)
          }
        }
      }
      
      // Теперь обновляем данные игры
      updateGameData(newGameData)
    })

    socket.on('game-updated', (newGameData) => {
      // Update room info if not set
      if (!room.id && newGameData.id) {
        room.id = newGameData.id
        room.hostId = newGameData.hostId
        room.isHost = newGameData.hostId === socket.id
      }
      
      // Check if current player's role changed BEFORE updating game data
      const currentPlayerData = newGameData.players?.find(p => 
        p.id === player.id || 
        p.id === socket.id ||
        p.name === player.name
      )
      
      if (currentPlayerData && currentPlayerData.role && currentPlayerData.role !== player.role) {
        player.role = currentPlayerData.role
        if (process.env.NODE_ENV === 'development') {
          console.log(`Role updated to: ${currentPlayerData.role}`)
        }
      }
      
      updateGameData(newGameData)
    })

    socket.on('game-started', (newGameData) => {
      console.log('🚀 Game started event received')
      
      // Звук начала игры
      playSound('day', 0.3)
      
      // Force update player role when game starts BEFORE updating game data
      const currentPlayerData = newGameData.players?.find(p => 
        p.id === player.id || 
        p.id === socket.id ||
        p.name === player.name
      )
      
      if (currentPlayerData && currentPlayerData.role) {
        player.role = currentPlayerData.role
        console.log(`🎭 Role assigned at game start: ${currentPlayerData.role}`)
      }
      
      updateGameData(newGameData)
    })

    socket.on('phase-changed', ({ gameState, currentPhase }) => {
      gameData.gameState = gameState
      gameData.currentPhase = currentPhase
      
      // Звук смены фазы
      if (gameState === 'voting') {
        playSound('voting', 0.1)
      } else if (gameState === 'night') {
        playSound('night', 0.1)
      } else if (gameState === 'day') {
        playSound('day', 0.1)
      } else {
        playSound('phaseChange', 0.2)
      }
    })

    socket.on('whisper-error', ({ message }) => {
      // Показываем ошибку шепота
      alert(`Ошибка шепота: ${message}`)
    })

    socket.on('vote-updated', ({ votes }) => {
      gameData.players = gameData.players.map(p => {
        const voteData = votes.find(v => v.id === p.id)
        return { ...p, votes: voteData ? voteData.votes : 0 }
      })
    })

    socket.on('voting-ended', ({ eliminated, reason, winCondition, gameData: newGameData }) => {
      // Звук окончания голосования
      // playSound('notification', 0.7)
      
      // Показываем результаты голосования
      if (eliminated.length > 0) {
        console.log(`Результат голосования: ${reason}`)
      } else {
        console.log(`Результат голосования: ${reason}`)
      }
      
      // Если есть условие победы, показываем его
      if (winCondition) {
        if (winCondition.gameEnded) {
          console.log(`🎉 Игра завершена! ${winCondition.message}`)
        } else {
          console.log(`📅 ${winCondition.message}`)
        }
      }
      
      if (newGameData) {
        updateGameData(newGameData)
      }
    })

    socket.on('timer-updated', ({ timer }) => {
      gameData.timer = timer
    })

    socket.on('timer-ended', ({ message }) => {
      // Звук окончания времени
      playSound('notification', 0.8)
    })

    socket.on('kicked', ({ message }) => {
      alert(message)
      // Clear room state and redirect to home page
      clearRoom()
      if (process.client) {
        navigateTo('/')
      }
    })

    socket.on('command-error', ({ message }) => {
      // Показываем ошибку команды - будет обработана в компоненте GameChat
      console.log('Command error:', message)
    })

    socket.on('error', ({ message, suggestions }) => {
      console.error('Game error:', message)
      
      // Проверяем, является ли это ошибкой валидации имени при ручном вводе
      // (НЕ при переподключении)
      const isNameValidationError = (
        message.includes('имя') || 
        message.includes('Имя') || 
        message.includes('уже в комнате') || 
        message.includes('зарезервировано') ||
        message.includes('слишком длинное') ||
        message.includes('недопустимые символы')
      )
      
      if (isNameValidationError) {
        // Эти ошибки обрабатываются в компонентах форм
        // НЕ показываем alert для ошибок валидации имен
        console.log('Name validation error - handled by form component')
        return
      }
      
      // Для всех остальных ошибок показываем alert
      alert(message)
    })

    // Новые обработчики для валидации имен
    socket.on('name-check-result', (result) => {
      // Этот обработчик будет добавлен в компонентах форм
    })

    socket.on('name-suggestions', (result) => {
      // Этот обработчик будет добавлен в компонентах форм
    })
  }

  // Helper functions
  const updateGameData = (newGameData) => {
    // Проверяем изменения в состоянии игроков (alive, protected, etc.)
    const playersChanged = gameData.players && newGameData.players && 
      gameData.players.some((player, index) => {
        const newPlayer = newGameData.players[index]
        return !newPlayer || 
               player.alive !== newPlayer.alive ||
               player.protected !== newPlayer.protected ||
               player.role !== newPlayer.role ||
               player.connected !== newPlayer.connected
      })
    
    // Более строгая проверка на необходимость обновления данных
    const hasSignificantChanges = 
      gameData.id !== newGameData.id ||
      gameData.gameState !== newGameData.gameState ||
      gameData.players?.length !== newGameData.players?.length ||
      gameData.selectedRoles?.length !== newGameData.selectedRoles?.length ||
      gameData.chat?.length !== newGameData.chat?.length ||
      playersChanged
    
    if (!hasSignificantChanges) {
      // Данные не изменились значительно, пропускаем обновление
      if (process.env.NODE_ENV === 'development') {
        console.log('⏭️ Skipping updateGameData - no significant changes')
      }
      return
    }
    
    // Логируем только при значительных изменениях
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Updating game data:', {
        id: newGameData.id,
        gameState: newGameData.gameState,
        playersCount: newGameData.players?.length || 0,
        selectedRolesCount: newGameData.selectedRoles?.length || 0,
        chatLength: newGameData.chat?.length || 0
      })
    }
    
    Object.assign(gameData, newGameData)
    
    // Обновляем роль текущего игрока только если она ещё не установлена
    if (!player.role) {
      const currentPlayerData = newGameData.players?.find(p => 
        p.id === player.id || 
        p.id === socket.id ||
        p.name === player.name
      )
      
      if (currentPlayerData && currentPlayerData.role) {
        player.role = currentPlayerData.role
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Role updated in updateGameData: ${currentPlayerData.role}`)
        }
      }
    }
  }

  const removeSocketListeners = () => {
    if (!globalListenersInitialized) {
      return
    }
    
    console.log('🔌 Removing socket listeners')
    
    // Удаляем все обработчики событий
    socket.off('new-message')
    socket.off('new-whisper')
    socket.off('voice-activity-update')
    socket.off('room-created')
    socket.off('join-success')
    socket.off('game-updated')
    socket.off('game-started')
    socket.off('phase-changed')
    socket.off('whisper-error')
    socket.off('vote-updated')
    socket.off('voting-ended')
    socket.off('timer-updated')
    socket.off('timer-ended')
    socket.off('kicked')
    socket.off('command-error')
    socket.off('error')
    socket.off('name-check-result')
    socket.off('name-suggestions')
    
    globalListenersInitialized = false
    console.log('✅ Socket listeners removed')
  }

  const clearRoom = () => {
    // Очищаем данные комнаты
    room.id = null
    room.hostId = null
    room.isHost = false
    
    // Очищаем данные игры
    gameData.players = []
    gameData.selectedRoles = []
    gameData.gameState = 'setup'
    gameData.currentPhase = null
    gameData.chat = []
    gameData.timer = null
    
    // Очищаем данные игрока
    player.role = null
    player.id = null
    player.name = ''
    
    // Очищаем голосовую активность
    voiceActivity.speakingPlayers.clear()
    voiceActivity.enabled = false
    
    console.log('🧹 Room state cleared completely')
  }

  // Добавить метод для отправки голосовой активности с throttling:
  let lastVoiceActivitySent = 0
  let lastVoiceState = null
  let voiceActivityTimeout = null
  const VOICE_ACTIVITY_THROTTLE = 200 // 200ms
  
  const sendVoiceActivity = (isActive) => {
    if (!socket || !room.id) return
    
    const now = Date.now()
    
    // Если состояние не изменилось, игнорируем
    if (lastVoiceState === isActive) return
    
    // Сохраняем новое состояние
    lastVoiceState = isActive
    
    // Очищаем предыдущий таймер
    if (voiceActivityTimeout) {
      clearTimeout(voiceActivityTimeout)
      voiceActivityTimeout = null
    }
    
    // Если прошло достаточно времени, отправляем сразу
    if (now - lastVoiceActivitySent >= VOICE_ACTIVITY_THROTTLE) {
      lastVoiceActivitySent = now
      socket.emit('voice-activity', { 
        roomId: room.id, 
        isActive 
      })
    } else {
      // Иначе ставим таймер для отправки позже
      const remainingTime = VOICE_ACTIVITY_THROTTLE - (now - lastVoiceActivitySent)
      voiceActivityTimeout = setTimeout(() => {
        lastVoiceActivitySent = Date.now()
        socket.emit('voice-activity', { 
          roomId: room.id, 
          isActive: lastVoiceState 
        })
        voiceActivityTimeout = null
      }, remainingTime)
    }
  }
  
  // Функция принудительной остановки голосовой активности
  const forceStopVoiceActivity = () => {
    console.log('🔇 Forcing voice activity stop')
    
    // Очищаем таймер
    if (voiceActivityTimeout) {
      clearTimeout(voiceActivityTimeout)
      voiceActivityTimeout = null
    }
    
    // ПРИНУДИТЕЛЬНО отправляем событие отключения независимо от предыдущего состояния
    if (socket && room.id && player.id) {
      console.log('📤 Sending forced voice-activity stop event')
      socket.emit('voice-activity', { 
        roomId: room.id, 
        isActive: false 
      })
      
      // Обновляем локальное состояние немедленно
      voiceActivity.speakingPlayers.delete(player.id)
    }
    
    // Полный сброс состояния
    lastVoiceState = false
    lastVoiceActivitySent = 0
    
    console.log('✅ Voice activity forcefully stopped')
  }
  
  // Функция для принудительного запуска мониторинга (при включении микрофона)
  const forceStartVoiceActivity = () => {
    console.log('🎤 Forcing voice activity monitoring restart')
    
    // Сбрасываем состояние перед запуском
    lastVoiceState = null
    lastVoiceActivitySent = 0
    
    // Очищаем таймер если есть
    if (voiceActivityTimeout) {
      clearTimeout(voiceActivityTimeout)
      voiceActivityTimeout = null
    }
    
    console.log('✅ Voice activity monitoring restarted')
  }

  // Actions
  const createRoom = (playerName, isPrivate = false) => {
    player.id = socket.id
    player.name = playerName
    socket.emit('create-room', { playerName, isPrivate })
  }

  const joinRoom = ({ roomId, playerName }) => {
    player.id = socket.id
    player.name = playerName
    room.id = roomId // Set room ID immediately for UI
    socket.emit('join-room', { roomId, playerName })
  }

  const selectRole = (roleId) => {
    if (!isHost.value) return
    socket.emit('select-role', { roomId: room.id, roleId })
  }

  const removeRole = (roleId) => {
    if (!isHost.value) return
    socket.emit('remove-role', { roomId: room.id, roleId })
  }

  const startGame = () => {
    if (!isHost.value) return
    socket.emit('start-game', { roomId: room.id })
  }

  const restartGame = () => {
    if (!isHost.value) return
    socket.emit('restart-game', { roomId: room.id })
  }

  const changePhase = ({ gameState, currentPhase }) => {
    if (!isHost.value) return
    socket.emit('change-phase', { roomId: room.id, gameState, currentPhase })
  }

  const sendMessage = (message) => {
    socket.emit('send-message', { roomId: room.id, message })
  }

  const votePlayer = (targetId) => {
    socket.emit('vote-player', { roomId: room.id, targetId })
  }

  const endVoting = () => {
    if (!isHost.value) return
    socket.emit('end-voting', { roomId: room.id })
  }

  const adminAction = (action, targetId, newRole = null) => {
    if (!isHost.value) return
    socket.emit('admin-action', { roomId: room.id, action, targetId, newRole })
  }

  const nextPhase = () => {
    if (!isHost.value) return
    socket.emit('next-phase', { roomId: room.id })
  }

  const setTimer = (timer) => {
    if (!isHost.value) return
    socket.emit('change-timer', { roomId: room.id, timer })
  }

  // Load default roles from server
  const loadDefaultRoles = async () => {
    if (process.client && (!gameData.roles || Object.keys(gameData.roles).length === 0)) {
      try {
        console.log('🔄 Loading roles from API...')
        const response = await fetch('/api/roles')
        
        if (response.ok) {
          const roles = await response.json()
          console.log('✅ Successfully loaded', Object.keys(roles).length, 'roles from API')
          gameData.roles = roles
          return roles
        } else {
          throw new Error(`API returned ${response.status}`)
        }
      } catch (error) {
        console.error('❌ Could not load roles from API:', error.message)
        return {}
      }
    }
    return gameData.roles || {}
  }

  // Get all roles (from game data or load default roles)
  const getAllRoles = async () => {
    // If we have roles in game data, return them
    if (gameData.roles && Object.keys(gameData.roles).length > 0) {
      return gameData.roles
    }
    
    // If no roles loaded yet, load them
    if (process.client) {
      const loadedRoles = await loadDefaultRoles()
      return loadedRoles
    }
    
    // Return current roles
    return gameData.roles || {}
  }

  return {
    // State
    player: readonly(player),
    room: readonly(room),
    gameData: readonly(gameData),

    // Computed
    isInRoom,
    isHost,
    currentPlayer,
    otherPlayers,
    allPlayers,
    allPlayersForVoting,
    selectedRoleObjects,
    chatMessages,

    voiceActivity: readonly(voiceActivity),

    // Methods
    sendVoiceActivity,
    forceStopVoiceActivity,
    forceStartVoiceActivity,
    initSocketListeners,
    removeSocketListeners,
    updateGameData,
    clearRoom,
    createRoom,
    joinRoom,
    selectRole,
    removeRole,
    startGame,
    restartGame,
    changePhase,
    sendMessage,
    votePlayer,
    endVoting,
    adminAction,
    nextPhase,
    setTimer,
    getAllRoles
  }
}