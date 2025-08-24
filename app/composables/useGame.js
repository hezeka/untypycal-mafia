/**
 * app/composables/useGame.js - Исправленная игровая логика
 */

import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useSocket } from './useSocket.js'
import { useRouter } from 'vue-router'

// Глобальное состояние игры (singleton)
const gameState = reactive({
  // Комната
  room: {
    id: null,
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
    myVote: null
  },
  
  // Таймер
  timer: {
    active: false,
    duration: 0,
    remaining: 0,
    interval: null
  },
  
  // Подключение
  connected: false
})

export const useGame = () => {
  const { socket, isConnected, emit, on } = useSocket()
  const router = useRouter()
  const loading = ref(false)
  
  // Computed properties
  const currentPlayer = computed(() => {
    return gameState.room.players.find(p => p.isMe) || gameState.player
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
  
  // Методы для работы с сокетами
  const createRoom = (username, isPrivate = false, hostAsObserver = false) => {
    if (!isConnected.value) {
      console.warn('⚠️ Socket not connected, waiting...')
      // Ждем подключения и повторяем попытку
      const checkConnection = setInterval(() => {
        if (isConnected.value) {
          clearInterval(checkConnection)
          loading.value = true
          emit('create-room', { username, isPrivate, hostAsObserver })
        }
      }, 100)
      
      // Таймаут на случай если подключение не произойдет
      setTimeout(() => {
        clearInterval(checkConnection)
        if (!isConnected.value) {
          console.error('❌ Failed to connect to server')
          loading.value = false
        }
      }, 5000)
      
      return
    }
    
    loading.value = true
    emit('create-room', { username, isPrivate, hostAsObserver })
  }
  
  const joinRoom = (roomCode, username) => {
    if (!isConnected.value) {
      console.warn('⚠️ Socket not connected, waiting...')
      // Ждем подключения и повторяем попытку
      const checkConnection = setInterval(() => {
        if (isConnected.value) {
          clearInterval(checkConnection)
          loading.value = true
          emit('join-room', { roomCode, username })
        }
      }, 100)
      
      // Таймаут на случай если подключение не произойдет
      setTimeout(() => {
        clearInterval(checkConnection)
        if (!isConnected.value) {
          console.error('❌ Failed to connect to server')
          loading.value = false
        }
      }, 5000)
      
      return
    }
    
    loading.value = true
    emit('join-room', { roomCode, username })
  }
  
  // Безопасный emit с проверкой подключения
  const safeEmit = (event, data) => {
    if (!isConnected.value) {
      console.warn(`⚠️ Cannot emit ${event} - not connected to server`)
      return false
    }
    
    return emit(event, data)
  }
  
  const startGame = () => {
    safeEmit('start-game')
  }
  
  const selectRole = (roleId, action = 'add') => {
    safeEmit('select-role', { roleId, action })
  }
  
  const sendMessage = (text) => {
    if (!text.trim()) return false
    return safeEmit('send-message', { text })
  }
  
  const executeNightAction = (action) => {
    safeEmit('night-action', action)
  }
  
  const votePlayer = (targetId) => {
    if (safeEmit('vote-player', { targetId })) {
      gameState.voting.myVote = targetId
    }
  }
  
  const adminAction = (action, targetId) => {
    safeEmit('admin-action', { action, targetId })
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
        description: 'Выберите роли и начните игру'
      },
      introduction: {
        name: 'Знакомство',
        description: 'Представьтесь и обсудите стратегии'
      },
      night: {
        name: 'Ночь',
        description: 'Роли выполняют свои действия'
      },
      day: {
        name: 'День',
        description: 'Обсудите подозрения и найдите оборотней'
      },
      voting: {
        name: 'Голосование',
        description: 'Выберите кого исключить'
      },
      ended: {
        name: 'Завершено',
        description: 'Игра окончена'
      }
    }
    
    return phases[gameState.room.phase] || phases.setup
  }
  
  // Обработчики событий сокета
  const initSocketListeners = () => {
    if (!socket.value) {
      // Если сокет не инициализирован - инициализируем его
      const { initSocket } = useSocket()
      initSocket()
      
      // Ждем инициализации и повторяем попытку
      setTimeout(() => {
        if (socket.value) {
          initSocketListeners()
        }
      }, 100)
      return
    }
    
    console.log('🔌 Initializing socket listeners...')
    
    // Подключение к комнате
    on('room-created', (data) => {
      console.log('✅ Room created:', data.room.id)
      loading.value = false
      Object.assign(gameState.room, data.room)
      Object.assign(gameState.player, data.player)
      gameState.connected = true
      
      // Автоматический переход на игровую страницу
      router.push(`/game/${data.room.id}`)
    })
    
    on('join-success', (data) => {
      console.log('✅ Joined room:', data.room.id)
      loading.value = false
      Object.assign(gameState.room, data.room)
      Object.assign(gameState.player, data.player)
      gameState.connected = true
      
      // Автоматический переход на игровую страницу только если мы не на ней
      if (route.name !== 'game-id') {
        router.push(`/game/${data.room.id}`)
      }
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
        gameState.nightAction.active = false
      }
    })
    
    // Чат
    on('new-message', (data) => {
      gameState.chat.push(data.message)
    })
    
    // Голосование
    on('vote-confirmed', (data) => {
      gameState.voting.myVote = data.targetId
    })
    
    on('voting-ended', (data) => {
      gameState.room.votingActive = false
    })
    
    // Ошибки
    on('error', (data) => {
      console.error('🚨 Socket error:', data)
      loading.value = false
      
      // Если ошибка подключения к комнате - показываем пользователю
      if (data.code === 'ROOM_NOT_FOUND') {
        console.error('❌ Room not found, redirecting to home...')
        router.push('/')
      }
    })
  }
  
  // Очистка при размонтировании
  const cleanup = () => {
    stopTimer()
  }
  
  onMounted(() => {
    // Синхронизируем состояние подключения
    gameState.connected = isConnected.value
    
    // Отслеживаем изменения подключения
    watch(isConnected, (connected) => {
      gameState.connected = connected
      if (connected) {
        console.log('🟢 Socket connected')
      } else {
        console.log('🔴 Socket disconnected')
      }
    })
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
    canStartGame,
    canChat,
    
    // Методы
    createRoom,
    joinRoom,
    startGame,
    selectRole,
    sendMessage,
    executeNightAction,
    votePlayer,
    adminAction,
    
    // Утилиты
    formatTime,
    getPhaseInfo,
    initSocketListeners,
    cleanup
  }
}