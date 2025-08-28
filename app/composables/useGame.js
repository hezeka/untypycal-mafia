/**
 * app/composables/useGame.js - Исправленная игровая логика
 */

import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useSocket } from './useSocket.js'
import { useAPI } from './useAPI.js'
import { useTimer } from './useTimer.js'
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
    data: null,
    result: null
  },
  
  // Голосование
  voting: {
    myVote: null
  },
  
  
  // Подключение
  connected: false
})

export const useGame = () => {
  const { socket, isConnected, emit, on, getSocketId } = useSocket()
  const { getRoomData, joinRoom: apiJoinRoom, getChatHistory, manageRole, managePhase, nightAction } = useAPI()
  const timer = useTimer()
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
    const permissions = gameState.room.chatPermissions
    
    // Если чат полностью отключен (например, в voting), то нельзя писать никому
    if (!permissions.canChat) {
      return false
    }
    
    // Если включен режим werewolfChat (ночная фаза), проверяем роль игрока
    if (permissions.werewolfChat) {
      const playerRole = currentPlayer.value?.role || gameState.player.role
      if (!playerRole) {
        return false
      }
      
      // Определяем оборотней по ролям (как на сервере в GameRoom.js)
      const werewolfRoles = [
        'werewolf', 'werewolf_2', 'werewolf_3',
        'mystic_wolf', 'alpha_wolf', 'dream_wolf'
      ]
      
      return werewolfRoles.includes(playerRole)
    }
    
    // В остальных случаях используем базовое право canChat
    return permissions.canChat
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
  
  const joinRoom = async (roomCode, username) => {
    loading.value = true
    
    try {
      // Сначала получаем данные комнаты для проверки существования
      console.log('🔄 Checking room exists:', roomCode)
      const roomData = await getRoomData(roomCode)
      console.log('✅ Room found:', roomData)
      
      // Обновляем состояние комнаты
      Object.assign(gameState.room, roomData)
      
      // Если сокет подключен, присоединяемся через HTTP API
      if (isConnected.value && getSocketId()) {
        console.log('🔄 Joining room via HTTP API...')
        const result = await apiJoinRoom(roomCode, username, getSocketId())
        console.log('✅ Joined successfully:', result)
        
        // Обновляем состояние с персонализированными данными
        Object.assign(gameState.room, result.room)
        Object.assign(gameState.player, result.player)
        gameState.connected = true
        
        // Регистрируем сокет в комнате
        const room = gameState.room
        if (room && socket.value) {
          room.addSocket?.(getSocketId(), socket.value)
        }
        
      } else {
        console.warn('⚠️ Socket not connected, joining as observer')
        // Можно присоединиться как наблюдатель без сокета
        gameState.connected = false
      }
      
    } catch (error) {
      console.error('❌ Failed to join room:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  // Безопасный emit с проверкой подключения
  const safeEmit = (event, data) => {
    if (!isConnected.value) {
      console.warn(`⚠️ Cannot emit ${event} - not connected to server`)
      return false
    }
    
    return emit(event, data)
  }
  
  const startGame = async () => {
    if (!gameState.room.id || !gameState.player.id) {
      console.error('❌ Cannot start game: missing room or player ID')
      return false
    }

    try {
      console.log('🚀 Starting game...')
      const result = await managePhase(gameState.room.id, 'start-game', gameState.player.id)
      console.log('✅ Game started successfully:', result)
      
      // Обновляем локальное состояние комнаты
      if (result.room) {
        Object.assign(gameState.room, result.room)
      }
      
      return true
    } catch (error) {
      console.error('❌ Failed to start game:', error)
      return false
    }
  }
  
  const selectRole = async (roleId, action = 'add') => {
    if (!gameState.room.id || !gameState.player.id) {
      console.error('❌ Cannot select role: missing room or player ID')
      return false
    }

    try {
      console.log(`🎭 ${action === 'add' ? 'Adding' : 'Removing'} role:`, roleId)
      const result = await manageRole(gameState.room.id, roleId, action, gameState.player.id)
      console.log('✅ Role management successful:', result)
      
      // Обновляем локальное состояние комнаты
      if (result.room) {
        Object.assign(gameState.room, result.room)
      }
      
      return true
    } catch (error) {
      console.error('❌ Role management failed:', error)
      return false
    }
  }
  
  const sendMessage = (text) => {
    if (!text.trim()) return false
    return safeEmit('send-message', { text })
  }
  
  // Показать ошибку как системное сообщение
  const showChatError = (message) => {
    const errorMessage = {
      id: `error_${Date.now()}`,
      type: 'error',
      senderId: 'system',
      senderName: 'Система',
      text: message,
      timestamp: Date.now(),
      isOwn: false
    }
    
    // Добавляем ошибку в чат
    gameState.chat.push(errorMessage)
    
    // Удаляем ошибку через 5 секунд
    setTimeout(() => {
      const errorIndex = gameState.chat.findIndex(msg => msg.id === errorMessage.id)
      if (errorIndex !== -1) {
        gameState.chat.splice(errorIndex, 1)
      }
    }, 5000)
  }
  
  const executeNightAction = async (action) => {
    try {
      const playerId = gameState.player.id || getSocketId()
      const result = await nightAction(gameState.room.id, playerId, action)
      
      if (result.success) {
        console.log('✅ Night action executed successfully:', result)
        // Скрываем интерфейс ночного действия после успешного выполнения
        gameState.nightAction.active = false
        
        // Обновляем результат ночного действия для отображения
        gameState.nightAction.result = {
          success: true,
          message: result.message,
          data: result.data || {},
          blocked: result.data?.blocked || false
        }
        
        return { success: true, message: result.message || 'Действие выполнено' }
      } else {
        console.error('❌ Night action failed:', result.error)
        return { success: false, message: result.error || 'Ошибка выполнения действия' }
      }
    } catch (error) {
      console.error('❌ Night action API error:', error)
      return { success: false, message: error.message || 'Ошибка сети' }
    }
  }
  
  const votePlayer = (targetId) => {
    if (safeEmit('vote', { targetId })) {
      gameState.voting.myVote = targetId
    }
  }
  
  const adminAction = async (action, targetId = null) => {
    if (!gameState.room.id || !gameState.player.id) {
      console.error('❌ Cannot perform admin action: missing room or player ID')
      return false
    }

    try {
      console.log(`🎮 Admin action: ${action}`, targetId ? `target: ${targetId}` : '')
      
      // Фазовые действия через HTTP API
      if (['next-phase', 'force-vote'].includes(action)) {
        const result = await managePhase(gameState.room.id, action, gameState.player.id)
        console.log('✅ Phase action successful:', result)
        
        // Обновляем локальное состояние комнаты
        if (result.room) {
          Object.assign(gameState.room, result.room)
        }
        
        return true
      }
      
      // Остальные admin действия через сокеты (kill, revive, kick)
      return safeEmit('admin-action', { action, targetId })
      
    } catch (error) {
      console.error('❌ Admin action failed:', error)
      return false
    }
  }

  // Новая функция для загрузки данных комнаты через HTTP
  const loadRoomData = async (roomId) => {
    loading.value = true
    
    try {
      console.log('🔄 Loading room data for:', roomId)
      const roomData = await getRoomData(roomId)
      console.log('✅ Room data loaded:', roomData)
      
      // Обновляем состояние комнаты
      Object.assign(gameState.room, roomData)
      return roomData
      
    } catch (error) {
      console.log(error.message)
      if (error.message === 'Комната не найдена') {
        console.error('❌ Room not found, redirecting to home...')
        router.push('/')
        return
      }
      console.error('❌ Failed to load room data:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Функция для загрузки истории чата
  const loadChatHistory = async (roomId, playerId = null) => {
    try {
      console.log('🔄 Loading chat history for room:', roomId, 'player:', playerId)
      console.log('🔄 Current gameState.player.id:', gameState.player.id)
      
      const chatData = await getChatHistory(roomId, playerId)
      
      // Если gameState.player.id пуст, но мы знаем playerId из API - обновляем для корректного отображения  
      if (!gameState.player.id && chatData.playerId) {
        console.log('🔧 Updating gameState.player.id from API:', chatData.playerId)
        gameState.player.id = chatData.playerId
      }
      
      // Очищаем текущий чат и загружаем историю
      gameState.chat = chatData.messages || []
      
      return chatData.messages
      
    } catch (error) {
      console.error('❌ Failed to load chat history:', error)
      // Не пробрасываем ошибку, чтобы не блокировать загрузку комнаты
      gameState.chat = []
      return []
    }
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
    console.log('🔌 initSocketListeners called')
    
    // Инициализируем сокет если он не инициализирован
    const { initSocket } = useSocket()
    const socketInstance = initSocket()
    
    if (!socketInstance) {
      console.warn('🔌 Failed to initialize socket')
      return
    }
    
    console.log('🔌 Setting up socket listeners...')
    
    // Ждем подключения сокета
    const setupListeners = () => {
      if (!socketInstance.connected) {
        console.log('🔌 Waiting for socket connection...')
        setTimeout(setupListeners, 100)
        return
      }
      
      console.log('🔌 Socket connected, setting up listeners for:', socketInstance.id)
      
      // Создание комнаты (пока оставим для обратной совместимости)
      on('room-created', (data) => {
        console.log('✅ Room created:', data.room.id)
        loading.value = false
        Object.assign(gameState.room, data.room)
        Object.assign(gameState.player, data.player)
        gameState.connected = true
        
        // Автоматический переход на игровую страницу
        router.push(`/game/${data.room.id}`)
      })
      
      // Присоединение к комнате через Socket.IO
      on('join-success', (data) => {
        console.log('✅ Joined room:', data.room.id)
        loading.value = false
        Object.assign(gameState.room, data.room)
        Object.assign(gameState.player, data.player)
        gameState.connected = true
        
        // Автоматический переход на игровую страницу
        router.push(`/game/${data.room.id}`)
      })
      
      // Обновления игры
      on('game-updated', (data) => {
        console.log('🔄 Game updated:', data)
        if (data.room) {
          Object.assign(gameState.room, data.room)
          console.log('✅ Room state updated:', gameState.room)
          
          // Проверяем таймер в данных комнаты
          console.log('🔍 Checking for timer in room data:', data.room.timer)
          if (data.room.timer && data.room.timer.endTime) {
            console.log('⏰ Found timer in room data, syncing...', data.room.timer)
            timer.setEndTime(data.room.timer.endTime)
          } else {
            console.log('❌ No timer found in game-updated, keeping current timer')
            // Не сбрасываем таймер при game-updated если его нет - он может быть установлен через phase-changed
          }
        }
      })
      
      // Смена фазы
      on('phase-changed', (data) => {
        console.log('🔄 Phase changed:', data)
        gameState.room.phase = data.phase
        gameState.voting.myVote = null
        
        // Очищаем состояние ночных действий при смене фазы (кроме night)
        if (data.phase !== 'night') {
          gameState.nightAction.active = false
          gameState.nightAction.role = null
          gameState.nightAction.result = null
        }
        
        // Синхронизируем таймер с сервером
        console.log('⏰ Phase timer data:', data.timer, 'End time:', data.timerEndTime)
        if (data.timerEndTime) {
          console.log('✅ Starting phase timer, ends at:', new Date(data.timerEndTime))
          timer.setEndTime(data.timerEndTime)
        } else {
          console.log('❌ No phase timer, deactivating')
          timer.setEndTime(null)
        }
      })
      
      // Ночные действия
      on('night-action-turn', (data) => {
        console.log('🌙 Night action turn received:', data)
        gameState.nightAction.active = true
        gameState.nightAction.role = data.role
        gameState.nightAction.timeLimit = data.timeLimit
        gameState.nightAction.data = null
        gameState.nightAction.result = null // Очищаем предыдущий результат
        console.log('🌙 Night action state updated:', {
          active: gameState.nightAction.active,
          role: gameState.nightAction.role
        })
      })
      
      on('night-action-timer', (data) => {
        console.log('⏰ Night action timer update:', data)
        timer.setEndTime(data.endTime)
      })
      
      on('night-action-result', (data) => {
        console.log('🌙 Received night action result:', data)
        
        // Обновляем состояние с результатом
        gameState.nightAction.result = {
          message: data.message,
          data: data.data || {}
        }
        
        // Можно деактивировать интерфейс ночного действия
        gameState.nightAction.active = false
      })
      
      // Чат
      on('new-message', (data) => {
        // Проверяем, что сообщение еще не добавлено (избегаем дублирования)
        const messageExists = gameState.chat.some(msg => 
          msg.id === data.message.id || 
          (msg.timestamp === data.message.timestamp && msg.senderId === data.message.senderId)
        )
        
        if (!messageExists) {
          console.log('💬 New message received:', data.message.text.substring(0, 50) + '...')
          
          // Обогащаем сообщение дополнительной информацией
          const enrichedMessage = { ...data.message }
          
          // Добавляем имя получателя для whisper сообщений (если еще не добавлено)
          if (data.message.type === 'whisper' && data.message.recipientId && !data.message.recipientName) {
            const recipient = gameState.room.players.find(p => p.id === data.message.recipientId)
            enrichedMessage.recipientName = recipient?.name
          }
          
          // Маркируем собственные сообщения по имени (более надежно чем по ID)
          if (data.message.senderName === gameState.player.name && data.message.senderId !== 'system') {
            enrichedMessage.isOwn = true
          }
          
          gameState.chat.push(enrichedMessage)
        } else {
          console.log('⚠️ Duplicate message ignored:', data.message.id)
        }
      })
      
      // Голосование
      on('vote-confirmed', (data) => {
        gameState.voting.myVote = data.targetId
      })
      
      on('voting-ended', (data) => {
        gameState.room.votingActive = false
      })
      
      // Анонимные сообщения от Ктулху
      on('cthulhu-message', (data) => {
        // Показываем специальное уведомление игроку
        const cthulhuMessage = {
          id: `cthulhu-${Date.now()}`,
          type: 'cthulhu',
          from: data.from,
          message: data.message,
          timestamp: Date.now(),
          isSpecial: true
        }
        
        // Добавляем в чат как специальное сообщение
        gameState.chat.push({
          id: cthulhuMessage.id,
          type: 'system',
          text: `🐙 ${data.from}: "${data.message}"`,
          timestamp: cthulhuMessage.timestamp,
          senderId: 'cthulhu',
          senderName: data.from,
          isSpecial: true
        })
      })
      
      // Прогресс выживания Ктулху
      on('cthulhu-survival', (data) => {
        // Показываем прогресс только самому Ктулху
        if (gameState.player.role === 'cthulhu') {
          const progressMessage = {
            id: `cthulhu-progress-${Date.now()}`,
            type: 'system',
            text: `🐙 Вы пережили ${data.survivedCount} из ${data.totalNeeded} голосований`,
            timestamp: Date.now(),
            senderId: 'system',
            senderName: 'Система',
            isSpecial: true
          }
          gameState.chat.push(progressMessage)
        }
      })
      
      // Блокировка ночного действия теперь приходит как шёпот через new-message
      
      // Ошибки
      on('error', (data) => {
        console.error('🚨 Socket error:', data)
        loading.value = false
        
        // Если ошибка подключения к комнате - показываем пользователю
        if (data.code === 'ROOM_NOT_FOUND') {
          console.error('❌ Room not found, redirecting to home...')
          router.push('/')
        } else {
          // Показываем ошибку в чате
          showChatError(data.message || 'Произошла ошибка')
        }
      })
    }
    
    // Запускаем установку слушателей
    setupListeners()
  }
  
  // Очистка при размонтировании
  const cleanup = () => {
    // Таймер очистится автоматически через onUnmounted в useTimer
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
    showChatError,
    executeNightAction,
    votePlayer,
    adminAction,
    
    // Утилиты
    formatTime: timer.formatTime,
    getPhaseInfo,
    initSocketListeners,
    loadRoomData,
    loadChatHistory,
    cleanup,
    
    // Таймер
    timer,
    setTimerEndTime: timer.setEndTime
  }
}