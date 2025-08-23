/**
 * Основной composable для игровой логики
 */

import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useSocket } from './useSocket.js'

// Глобальное состояние игры (singleton)
const gameState = reactive({
  // Комната
  room: {
    id: null,
    isHost: false,
    phase: 'setup',
    players: [],
    selectedRoles: [],
    centerCards: 0,
    chatPermissions: {
      canChat: true,
      canSeeAll: true,
      canWhisper: true,
      werewolfChat: false
    },
    votingActive: false,
    gameResult: null
  },
  
  // Текущий игрок
  player: {
    id: null,
    name: null,
    role: null,
    alive: true,
    isHost: false,
    isMe: true
  },
  
  // Чат
  chat: [],
  
  // Ночные действия
  nightAction: {
    active: false,
    role: null,
    timeLimit: 0,
    data: null
  },
  
  // Голосование
  voting: {
    myVote: null,
    canVote: false
  },
  
  // Таймер
  timer: {
    active: false,
    duration: 0,
    remaining: 0,
    interval: null
  },
  
  // Подключение
  connected: false,
  error: null
})

export const useGame = () => {
  const { socket, isConnected, emit, on, off } = useSocket()
  const loading = ref(false)
  
  // Computed properties
  const currentPlayer = computed(() => {
    return gameState.room.players.find(p => p.isMe) || gameState.player
  })
  
  const otherPlayers = computed(() => {
    return gameState.room.players.filter(p => !p.isMe)
  })
  
  const alivePlayers = computed(() => {
    return gameState.room.players.filter(p => p.alive)
  })
  
  const canStartGame = computed(() => {
    const playerCount = gameState.room.players.filter(p => p.role !== 'game_master').length
    const roleCount = gameState.room.selectedRoles.length
    return playerCount >= 3 && roleCount >= playerCount && gameState.player.isHost
  })
  
  const canChat = computed(() => {
    if (gameState.room.phase === 'setup') return true
    if (gameState.room.phase === 'voting') return false
    if (gameState.room.phase === 'night' && !gameState.room.chatPermissions.werewolfChat) return false
    return gameState.room.chatPermissions.canChat
  })
  
  const isWerewolf = computed(() => {
    const role = currentPlayer.value.role
    return role && (role.includes('werewolf') || role === 'mystic_wolf') && role !== 'minion'
  })
  
  // Методы для работы с сокетами
  const createRoom = (username, isPrivate = false, hostAsObserver = false) => {
    loading.value = true
    emit('create-room', { username, isPrivate, hostAsObserver })
  }
  
  const joinRoom = (roomCode, username) => {
    loading.value = true
    emit('join-room', { roomCode, username })
  }
  
  const startGame = () => {
    emit('start-game')
  }
  
  const selectRole = (roleId, action = 'add') => {
    emit('select-role', { roleId, action })
  }
  
  const sendMessage = (text) => {
    if (!canChat.value && !text.startsWith('/')) {
      return false
    }
    emit('send-message', { text })
    return true
  }
  
  const executeNightAction = (action) => {
    emit('night-action', action)
  }
  
  const votePlayer = (targetId) => {
    emit('vote-player', { targetId })
    gameState.voting.myVote = targetId
  }
  
  const adminAction = (action, targetId) => {
    emit('admin-action', { action, targetId })
  }
  
  const reportVoiceActivity = (isActive) => {
    emit('voice-activity', { isActive })
  }
  
  // Методы таймера
  const startTimer = (duration) => {
    if (gameState.timer.interval) {
      clearInterval(gameState.timer.interval)
    }
    
    gameState.timer.active = true
    gameState.timer.duration = duration
    gameState.timer.remaining = duration
    
    gameState.timer.interval = setInterval(() => {
      gameState.timer.remaining--
      
      if (gameState.timer.remaining <= 0) {
        clearInterval(gameState.timer.interval)
        gameState.timer.active = false
      }
    }, 1000)
  }
  
  const stopTimer = () => {
    if (gameState.timer.interval) {
      clearInterval(gameState.timer.interval)
    }
    gameState.timer.active = false
    gameState.timer.remaining = 0
  }
  
  // Форматирование времени
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Получение информации о фазе
  const getPhaseInfo = () => {
    const phases = {
      setup: {
        name: 'Настройка',
        description: 'Выберите роли и начните игру',
        color: 'yellow'
      },
      introduction: {
        name: 'Знакомство',
        description: 'Представьтесь и обсудите стратегии',
        color: 'blue'
      },
      night: {
        name: 'Ночь',
        description: 'Роли выполняют свои действия',
        color: 'purple'
      },
      day: {
        name: 'День',
        description: 'Обсудите подозрения и найдите оборотней',
        color: 'orange'
      },
      voting: {
        name: 'Голосование',
        description: 'Выберите кого исключить',
        color: 'red'
      },
      ended: {
        name: 'Завершено',
        description: 'Игра окончена',
        color: 'green'
      }
    }
    
    return phases[gameState.room.phase] || phases.setup
  }
  
  // Обработчики событий сокета
  const initSocketListeners = () => {
    if (!socket.value) return
    
    // Подключение к комнате
    on('room-created', (data) => {
      loading.value = false
      gameState.room = data.room
      gameState.player = data.player
      gameState.connected = true
    })
    
    on('join-success', (data) => {
      loading.value = false
      gameState.room = data.room
      gameState.player = data.player
      gameState.connected = true
    })
    
    // Обновления игры
    on('game-updated', (data) => {
      if (data.room) {
        Object.assign(gameState.room, data.room)
      }
    })
    
    // Смена фазы
    on('phase-changed', (data) => {
      gameState.room.phase = data.phase
      gameState.voting.myVote = null
      
      if (data.timer) {
        startTimer(data.timer)
      } else {
        stopTimer()
      }
      
      // Воспроизводим звук смены фазы
      playPhaseSound(data.phase)
    })
    
    // Ночные действия
    on('night-action-turn', (data) => {
      gameState.nightAction.active = true
      gameState.nightAction.role = data.role
      gameState.nightAction.timeLimit = data.timeLimit
      gameState.nightAction.data = null
      
      if (data.timeLimit) {
        startTimer(data.timeLimit)
      }
    })
    
    on('night-action-result', (data) => {
      gameState.nightAction.data = data
      
      if (data.success) {
        // Действие выполнено успешно
        gameState.nightAction.active = false
      }
    })
    
    // Чат
    on('new-message', (data) => {
      gameState.chat.push(data.message)
      playMessageSound(data.message.type)
    })
    
    // Голосование
    on('vote-confirmed', (data) => {
      gameState.voting.myVote = data.targetId
    })
    
    on('voting-ended', (data) => {
      gameState.room.votingActive = false
      // Результаты голосования уже в чате
    })
    
    // Ошибки
    on('error', (data) => {
      loading.value = false
      gameState.error = data.message
      console.error('Game error:', data)
    })
  }
  
  // Звуковые эффекты (заглушки)
  const playPhaseSound = (phase) => {
    console.log(`🔊 Playing ${phase} sound`)
  }
  
  const playMessageSound = (type) => {
    if (type === 'whisper') {
      console.log('🔊 Playing whisper sound')
    } else {
      console.log('🔊 Playing message sound')
    }
  }
  
  // Очистка при размонтировании
  const cleanup = () => {
    stopTimer()
  }
  
  onMounted(() => {
    gameState.connected = isConnected.value
  })
  
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    // Состояние
    gameState,
    loading,
    
    // Computed
    currentPlayer,
    otherPlayers,
    alivePlayers,
    canStartGame,
    canChat,
    isWerewolf,
    
    // Методы
    createRoom,
    joinRoom,
    startGame,
    selectRole,
    sendMessage,
    executeNightAction,
    votePlayer,
    adminAction,
    reportVoiceActivity,
    
    // Утилиты
    formatTime,
    getPhaseInfo,
    initSocketListeners,
    cleanup
  }
}