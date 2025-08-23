/**
 * Основной composable для игровой логики
 * Простая реализация без over-engineering
 */

import { ref, computed, reactive } from 'vue'
import { useSocket } from './useSocket.js'

// Простая заглушка для звуков
const useSound = () => ({
  playSound: (soundName) => {
    console.log(`🔊 Playing sound: ${soundName}`)
  }
})

// Глобальное состояние игры (singleton)
const gameState = reactive({
  // Комната
  room: {
    id: null,
    isHost: false,
    players: [],
    selectedRoles: [],
    phase: 'setup',
    chatPermissions: {
      canChat: true,
      canSeeAll: true,
      canWhisper: true,
      werewolfChat: false
    }
  },
  
  // Текущий игрок
  player: {
    id: null,
    name: null,
    role: null,
    alive: true,
    isHost: false
  },
  
  // Чат
  chat: [],
  
  // Голосование
  voting: {
    active: false,
    votes: {},
    canVote: false
  },
  
  // Таймер
  timer: {
    active: false,
    duration: 0,
    remaining: 0
  },
  
  // Подключение
  connected: false,
  reconnecting: false
})

export const useGame = () => {
  const { socket, isConnected, emit, on } = useSocket()
  const { playSound } = useSound()
  
  // Refs
  const loading = ref(false)
  const error = ref(null)
  
  // Computed properties
  const currentPlayer = computed(() => {
    return gameState.room.players.find(p => p.id === gameState.player.id) || gameState.player
  })
  
  const otherPlayers = computed(() => {
    return gameState.room.players.filter(p => p.id !== gameState.player.id)
  })
  
  const alivePlayers = computed(() => {
    return gameState.room.players.filter(p => p.alive)
  })
  
  const canStartGame = computed(() => {
    const playerCount = gameState.room.players.filter(p => !p.isHost).length
    const roleCount = gameState.room.selectedRoles.length
    
    return gameState.player.isHost && 
           playerCount >= 3 && 
           roleCount >= playerCount + 3 &&
           gameState.room.phase === 'setup'
  })
  
  const canChat = computed(() => {
    return gameState.room.chatPermissions.canChat && currentPlayer.value.alive
  })
  
  const canVote = computed(() => {
    return gameState.voting.active && 
           currentPlayer.value.alive && 
           gameState.room.phase === 'voting'
  })
  
  // Инициализация слушателей сокета
  const initSocketListeners = () => {
    console.log('🔌 Initializing game socket listeners')
    
    // Успешное создание комнаты
    on('room-created', (data) => {
      console.log('🏠 Room created:', data)
      console.log('🏠 Created player data:', data.player)
      
      gameState.room = {
        ...gameState.room,
        ...data.room,
        isHost: true
      }
      
      gameState.player = {
        ...gameState.player,
        ...data.player,
        isHost: true
      }
      
      console.log('🏠 My player after creation:', gameState.player)
      
      playSound('notification')
    })
    
    // Успешное присоединение к комнате
    on('join-success', (data) => {
      console.log('✅ Joined room:', data)
      
      gameState.room = {
        ...gameState.room,
        ...data.room
      }
      
      gameState.player = {
        ...gameState.player,
        ...data.player
      }
      
      playSound('notification')
    })
    
    // Обновление игры
    on('game-updated', (data) => {
      console.log('🔄 Game updated:', data)
      console.log('🔄 My player in updated data:', data.room?.players?.find(p => p.id === gameState.player.id))
      
      if (data.room) {
        gameState.room = {
          ...gameState.room,
          ...data.room
        }
        
        // Синхронизируем голоса из room.votes в voting.votes
        if (data.room.votes) {
          gameState.voting.votes = data.room.votes
        }
        
        // Синхронизируем статус голосования
        if (data.room.hasOwnProperty('votingActive')) {
          gameState.voting.active = data.room.votingActive
        }
        
        console.log('🔄 My player after update:', gameState.room.players.find(p => p.id === gameState.player.id))
      }
    })
    
    // Смена фазы
    on('phase-changed', (data) => {
      console.log('📅 Phase changed:', data)
      
      gameState.room.phase = data.phase
      
      if (data.duration) {
        startTimer(data.duration)
      }
      
      // Звуки для разных фаз
      switch (data.phase) {
        case 'introduction':
          playSound('game-start')
          break
        case 'night':
          playSound('night')
          break
        case 'day':
          playSound('day')
          break
        case 'voting':
          playSound('voting')
          gameState.voting.active = true
          break
        case 'ended':
          playSound('game-end')
          break
      }
    })
    
    // Новое сообщение
    on('new-message', (message) => {
      console.log('💬 New message:', message)
      
      gameState.chat.push(message)
      
      // Ограничиваем количество сообщений
      if (gameState.chat.length > 500) {
        gameState.chat = gameState.chat.slice(-250)
      }
      
      // Звук только для сообщений других игроков
      if (message.playerId !== gameState.player.id) {
        playSound(message.type === 'whisper' ? 'whisper' : 'message')
      }
    })
    
    // Шепот
    on('new-whisper', (whisper) => {
      console.log('🤫 New whisper:', whisper)
      
      gameState.chat.push(whisper)
      playSound('whisper')
    })
    
    // Завершение голосования
    on('voting-ended', (data) => {
      console.log('🗳️ Voting ended:', data)
      
      gameState.voting.active = false
      
      // Показываем результаты голосования
      if (data.results && data.results.eliminated) {
        // TODO: Показать модал с результатами голосования
        console.log('Eliminated player:', data.results.eliminated)
      }
    })
    
    // Завершение игры
    on('game-ended', (data) => {
      console.log('🏁 Game ended:', data)
      
      gameState.room.phase = 'ended'
      playSound('game-end')
      
      // Показываем результаты
      // TODO: Реализовать модал с результатами
    })
    
    // Обновление таймера
    on('timer-updated', (data) => {
      gameState.timer.remaining = data.remaining
    })
    
    // Ошибки
    on('error', (errorData) => {
      console.error('❌ Socket error:', errorData)
      error.value = errorData.message
      
      // Очищаем ошибку через 5 секунд
      setTimeout(() => {
        error.value = null
      }, 5000)
    })
    
    // Отключение от сервера
    on('disconnect', () => {
      console.warn('🔌 Disconnected from server')
      gameState.connected = false
      gameState.reconnecting = true
    })
    
    // Переподключение
    on('connect', () => {
      console.log('🔌 Reconnected to server')
      gameState.connected = true
      gameState.reconnecting = false
    })
  }
  
  // Создание комнаты
  const createRoom = (username, isPrivate = false, hostAsObserver = false) => {
    console.log('функция выполняется')
    if (!isConnected.value) {
      console.log('❌ Not connected to server')
      return
    }

    console.log('🏠 Creating room...')
    
    loading.value = true
    error.value = null
    
    const success = emit('create-room', {
      username,
      isPrivate,
      hostAsObserver
    })
    
    if (!success) {
      console.log('❌ Failed to emit create-room')
      loading.value = false
      return
    }
    
    setTimeout(() => {
      loading.value = false
    }, 3000)
  }
  
  // Присоединение к комнате
  const joinRoom = (roomCode, username) => {
    if (!isConnected.value) return
    
    loading.value = true
    error.value = null
    
    emit('join-room', {
      roomCode,
      username
    })
    
    setTimeout(() => {
      loading.value = false
    }, 3000)
  }
  
  // Выбор роли
  const selectRole = (roleId) => {
    if (!isConnected.value || !gameState.player.isHost) return
    
    emit('select-role', { roleId })
  }
  
  // Удаление роли
  const removeRole = (roleId) => {
    if (!isConnected.value || !gameState.player.isHost) return
    
    emit('remove-role', { roleId })
  }
  
  // Начало игры
  const startGame = () => {
    if (!isConnected.value || !gameState.player.isHost) return
    
    emit('start-game')
  }
  
  // Отправка сообщения
  const sendMessage = (content, type = 'player') => {
    if (!isConnected.value || !content.trim()) return
    
    emit('send-message', {
      content: content.trim(),
      type
    })
  }
  
  // Голосование
  const votePlayer = (targetId) => {
    if (!isConnected.value) return
    
    emit('vote-player', { targetId })
    
    // Обновляем локальное состояние
    gameState.voting.votes[gameState.player.id] = targetId
  }
  
  // Принудительная смена фазы (только хост)
  const forceNextPhase = () => {
    if (!isConnected.value || !gameState.player.isHost) return
    
    emit('change-phase')
  }
  
  // Админ действия ведущего
  const adminAction = (action, targetId, targetName) => {
    if (!isConnected.value || gameState.player.role !== 'game_master') return
    
    emit('admin-action', {
      action,
      targetId, 
      targetName
    })
  }
  
  // Запуск таймера
  const startTimer = (duration) => {
    gameState.timer.active = true
    gameState.timer.duration = duration
    gameState.timer.remaining = duration
    
    const interval = setInterval(() => {
      gameState.timer.remaining--
      
      if (gameState.timer.remaining <= 0) {
        clearInterval(interval)
        gameState.timer.active = false
      }
    }, 1000)
  }
  
  // Форматирование времени
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    
    return `${secs}с`
  }
  
  // Получение роли по ID (используем централизованный реестр)
  const getRole = (roleId) => {
    const roles = {
      villager: { name: 'Житель', color: 'blue', team: 'village' },
      werewolf: { name: 'Оборотень', color: 'red', team: 'werewolf' },
      seer: { name: 'Провидец', color: 'blue', team: 'village' },
      robber: { name: 'Грабитель', color: 'blue', team: 'village' },
      troublemaker: { name: 'Смутьян', color: 'blue', team: 'village' },
      drunk: { name: 'Пьяница', color: 'blue', team: 'village' },
      mystic_wolf: { name: 'Мистический волк', color: 'red', team: 'werewolf' },
      tanner: { name: 'Неудачник', color: 'brown', team: 'tanner' },
      doppelganger: { name: 'Доппельгангер', color: 'purple', team: 'special' },
      game_master: { name: 'Ведущий', color: 'gold', team: 'neutral' }
    }
    
    return roles[roleId] || { name: 'Неизвестная роль', color: 'gray', team: 'unknown' }
  }
  
  // Очистка состояния (при выходе из комнаты)
  const resetGame = () => {
    gameState.room = {
      id: null,
      isHost: false,
      players: [],
      selectedRoles: [],
      phase: 'setup',
      chatPermissions: {
        canChat: true,
        canSeeAll: true,
        canWhisper: true,
        werewolfChat: false
      }
    }
    
    gameState.player = {
      id: null,
      name: null,
      role: null,
      alive: true,
      isHost: false
    }
    
    gameState.chat = []
    gameState.voting = {
      active: false,
      votes: {},
      canVote: false
    }
    
    gameState.timer = {
      active: false,
      duration: 0,
      remaining: 0
    }
    
    error.value = null
    loading.value = false
  }
  
  // Возвращаем публичный API
  return {
    // Состояние
    gameState,
    loading,
    error,
    
    // Computed
    currentPlayer,
    otherPlayers,
    alivePlayers,
    canStartGame,
    canChat,
    canVote,
    
    // Методы
    initSocketListeners,
    createRoom,
    joinRoom,
    selectRole,
    removeRole,
    startGame,
    sendMessage,
    votePlayer,
    forceNextPhase,
    adminAction,
    formatTime,
    getRole,
    resetGame,
    
    // Утилиты
    isConnected
  }
}