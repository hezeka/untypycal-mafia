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
  const { getRoomData, joinRoom: apiJoinRoom, getChatHistory, manageRole, managePhase, nightAction, getGameState } = useAPI()
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
      
      // Определяем оборотней и Ктулху по ролям (как на сервере в GameRoom.js)
      const werewolfRoles = [
        'werewolf', 'werewolf_2', 'werewolf_3',
        'mystic_wolf', 'alpha_wolf', 'dream_wolf'
      ]
      
      // Ктулху тоже может писать в ночной фазе
      return werewolfRoles.includes(playerRole) || playerRole === 'cthulhu'
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
  
  const joinRoom = async (roomCode, username, skipRoomDataCheck = false) => {
    loading.value = true
    
    try {
      // Получаем данные комнаты только если не пропускаем проверку
      if (!skipRoomDataCheck) {
        console.log('🔄 Checking room exists:', roomCode)
        const roomData = await getRoomData(roomCode)
        console.log('✅ Room found:', roomData)
        
        // Обновляем состояние комнаты
        Object.assign(gameState.room, roomData)
      }
      
      // Если сокет подключен, присоединяемся через HTTP API
      if (isConnected.value && getSocketId()) {
        console.log('🔄 Joining room via HTTP API...')
        const result = await apiJoinRoom(roomCode, username, getSocketId())
        console.log('✅ Joined successfully:', result)
        
        // ИСПРАВЛЕНО: Обновляем состояние с персонализированными данными
        // Больше не нужен playersStatus - вся информация уже в result.room.players
        Object.assign(gameState.room, result.room)
        Object.assign(gameState.player, result.player)
        
        console.log('✅ HTTP API join completed. Players with roles:', 
          gameState.room.players.map(p => `${p.name}: ${p.role} (alive: ${p.alive})`))
        
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
  
  // Обновление прав чата по фазе игры
  const updateChatPermissions = (phase) => {
    let newPermissions = {}
    
    switch (phase) {
      case 'setup':
      case 'introduction':
        newPermissions = {
          canChat: true,
          canSeeAll: true,
          canWhisper: true,
          werewolfChat: false
        }
        break
        
      case 'night':
        newPermissions = {
          canChat: true,           // Оборотни могут говорить
          canSeeAll: false,        // Обычные не видят сообщения
          canWhisper: true,        // Личные сообщения разрешены
          werewolfChat: true       // Только оборотни видят ночной чат
        }
        break
        
      case 'day':
        newPermissions = {
          canChat: true,
          canSeeAll: true,
          canWhisper: true,
          werewolfChat: false
        }
        break
        
      case 'voting':
        newPermissions = {
          canChat: false,          // Чат полностью отключен
          canSeeAll: false,
          canWhisper: true,        // Только шепот ведущему
          werewolfChat: false
        }
        break
        
      case 'ended':
        newPermissions = {
          canChat: true,
          canSeeAll: true,
          canWhisper: true,
          werewolfChat: false
        }
        break
        
      default:
        newPermissions = {
          canChat: true,
          canSeeAll: true,
          canWhisper: true,
          werewolfChat: false
        }
    }
    
    gameState.room.chatPermissions = newPermissions
    console.log(`💬 Chat permissions updated for phase ${phase}:`, newPermissions)
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

  // Загрузка полного состояния игры через HTTP (включая ночные действия)
  const loadGameState = async (roomId, playerId = null, options = {}) => {
    // Предотвращаем частые загрузки состояния
    const now = Date.now()
    const lastLoad = loadGameState.lastCall || 0
    if (!options.force && now - lastLoad < 1000) {
      console.log('⚠️ Skipping game state load - too frequent')
      return
    }
    loadGameState.lastCall = now
    
    loading.value = true
    
    try {
      console.log('🔄 Loading full game state for:', roomId, 'player:', playerId)
      const fullGameState = await getGameState(roomId, playerId)
      console.log('✅ Full game state loaded:', fullGameState)
      
      // Более осторожное обновление состояния комнаты
      if (fullGameState.room) {
        // Сохраняем текущие права чата если они не изменились
        const currentChatPerms = gameState.room.chatPermissions
        Object.assign(gameState.room, fullGameState.room)
        
        // Восстанавливаем права чата если фаза не изменилась
        if (currentChatPerms && gameState.room.phase === fullGameState.room.phase) {
          gameState.room.chatPermissions = currentChatPerms
          console.log('💬 Preserved current chat permissions')
        }
      }
      
      // Обновляем состояние игрока, если предоставлено
      if (fullGameState.player) {
        Object.assign(gameState.player, fullGameState.player)
      }
      
      // Обновляем состояние ночного действия только если оно изменилось
      if (fullGameState.nightAction) {
        const currentNightAction = gameState.nightAction
        const newNightAction = fullGameState.nightAction
        
        // Обновляем только если действительно есть изменения
        if (currentNightAction.active !== newNightAction.active || 
            currentNightAction.role !== newNightAction.role) {
          Object.assign(gameState.nightAction, newNightAction)
          console.log('🌙 Updated night action state')
          
          // Устанавливаем таймер, если есть активное ночное действие
          if (newNightAction.active && newNightAction.endTime) {
            timer.setEndTime(newNightAction.endTime)
          }
        }
      }
      
      return fullGameState
      
    } catch (error) {
      console.log(error.message)
      if (error.message === 'Комната не найдена') {
        console.error('❌ Room not found, redirecting to home...')
        router.push('/')
        return
      }
      console.error('❌ Failed to load game state:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Новая функция для загрузки данных комнаты через HTTP (обратная совместимость)
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
        // ИСПРАВЛЕНО: Больше не дублируем логику синхронизации
        // Все данные уже корректно в data.room.players
        Object.assign(gameState.room, data.room)
        Object.assign(gameState.player, data.player)
        
        console.log('✅ Socket join-success completed. Players with roles:', 
          gameState.room.players.map(p => `${p.name}: ${p.role} (alive: ${p.alive})`))
        
        gameState.connected = true
        
        // Автоматический переход на игровую страницу
        router.push(`/game/${data.room.id}`)
      })
      
      // Легкие обновления для присоединения игроков
      on('player-joined', (data) => {
        console.log('👋 Player joined:', data.player)
        // Добавляем или обновляем игрока в списке только если он еще не существует
        const existingPlayerIndex = gameState.room.players.findIndex(p => p.id === data.player.id)
        if (existingPlayerIndex >= 0) {
          // Обновляем только статус подключения существующего игрока
          gameState.room.players[existingPlayerIndex].connected = data.player.connected
          console.log('✅ Updated existing player connection status')
        } else {
          // Добавляем нового игрока только если его действительно нет
          const playerExists = gameState.room.players.some(p => p.name === data.player.name)
          if (!playerExists) {
            gameState.room.players.push(data.player)
            console.log('✅ Added new player to list')
          } else {
            console.log('⚠️ Player already exists, skipping duplicate')
          }
        }
      })
      
      // Переподключение игроков
      on('player-reconnected', (data) => {
        console.log('🔄 Player reconnected:', data.playerName)
        // Обновляем статус игрока на подключенный
        const existingPlayer = gameState.room.players.find(p => p.id === data.playerId)
        if (existingPlayer) {
          existingPlayer.connected = true
          console.log('✅ Updated player reconnection status')
        }
      })
      
      // Синхронизация статуса подключения всех игроков
      on('players-status-sync', (data) => {
        console.log('🔄 Players status sync received:', data.players.length, 'players')
        
        // Обновляем статус игроков - только те поля которые пришли с сервера
        // Сохраняем важные поля которые НЕ приходят в sync: isMe, isHost, sequentialId
        data.players.forEach(serverPlayer => {
          const localPlayer = gameState.room.players.find(p => p.id === serverPlayer.id)
          if (localPlayer) {
            // Обновляем имя только если изменилось (обычно не меняется)
            if (serverPlayer.name !== undefined && serverPlayer.name !== localPlayer.name) {
              localPlayer.name = serverPlayer.name
              console.log(`✅ Updated player name: ${localPlayer.name} -> ${serverPlayer.name}`)
            }
            
            // Обновляем статус подключения только если изменился
            if (serverPlayer.connected !== undefined && serverPlayer.connected !== localPlayer.connected) {
              localPlayer.connected = serverPlayer.connected
              console.log(`✅ Updated ${serverPlayer.name} connection:`, serverPlayer.connected)
            }
            
            // Обновляем статус alive только если изменился
            if (serverPlayer.alive !== undefined && serverPlayer.alive !== localPlayer.alive) {
              localPlayer.alive = serverPlayer.alive
              console.log(`✅ Updated ${serverPlayer.name} alive status:`, serverPlayer.alive)
            }
            
            // Обновляем роль только если она предоставлена и отличается
            if (serverPlayer.role !== undefined && serverPlayer.role !== localPlayer.role) {
              localPlayer.role = serverPlayer.role
              console.log(`✅ Updated ${serverPlayer.name} role:`, serverPlayer.role)
            }
            
            // НЕ ТРОГАЕМ: isMe, isHost, sequentialId - эти поля остаются как были
          }
        })
      })
      
      // Отключение игроков
      on('player-disconnected', (data) => {
        console.log('🔴 Player disconnected:', data.playerName)
        // Обновляем статус игрока на отключенный
        const existingPlayer = gameState.room.players.find(p => p.id === data.playerId)
        if (existingPlayer) {
          existingPlayer.connected = false
          console.log('✅ Updated player disconnection status')
        }
      })
      
      // Обновления ролей
      on('roles-updated', (data) => {
        console.log('🎭 Roles updated:', data)
        gameState.room.selectedRoles = data.selectedRoles
      })
      
      // Действия администратора
      on('admin-action-completed', (data) => {
        console.log('⚡ Admin action completed:', data)
        // При необходимости загружаем полное состояние только для критических действий
        if (['kick'].includes(data.action)) {
          // Только кик требует полной перезагрузки
          loadGameState(gameState.room.id, gameState.player.id)
        }
        // Для kill/revive просто обновим состояние через специальное событие
      })
      
      // Действия с фазами
      on('phase-action-completed', (data) => {
        console.log('⚡ Phase action completed:', data)
        if (data.newPhase) {
          gameState.room.phase = data.newPhase
        }
      })
      
      // Результаты ночи
      on('night-results-announced', (data) => {
        console.log('🌅 Night results announced:', data)
        // Можем обновить состояние игроков если нужно
      })
      
      // Окончание игры
      on('game-ended', (data) => {
        console.log('🏆 Game ended:', data)
        gameState.room.phase = data.phase
        gameState.room.gameResult = data.result
      })
      
      // Сброс комнаты (новая игра)
      on('room-reset', (data) => {
        console.log('🔄 Room reset:', data.message)
        
        // Сбрасываем состояние игры
        gameState.room.phase = 'setup'
        gameState.room.gameResult = null
        gameState.room.gameStartTime = null
        gameState.room.gameEndTime = null
        gameState.room.daysSurvived = 0
        gameState.room.civiliansKilled = 0
        gameState.room.chatStats = {}
        
        // Очищаем ночное состояние
        gameState.nightAction = {
          active: false,
          role: null,
          result: null
        }
        
        // Очищаем состояние голосования
        gameState.voting = {
          active: false,
          myVote: null,
          results: {}
        }
        
        // Сбрасываем состояние всех игроков (очищаем роли, восстанавливаем alive)
        gameState.room.players.forEach(player => {
          if (player.role !== 'game_master') {
            player.role = null
            player.alive = true
          }
        })
        
        // Сбрасываем роли в комнате
        gameState.room.roles = []
        gameState.room.centerCards = 0
        
        console.log('✅ Game state reset to setup phase')
      })
      
      // Обновления игры - только для критических изменений состояния
      on('game-updated', (data) => {
        console.log('🔄 Game updated (critical):', data)
        
        if (data.reason === 'roles-assigned') {
          console.log('🎭 Roles assigned update received')
          // При раздаче ролей обновляем полное состояние
          if (data.room) {
            Object.assign(gameState.room, data.room)
            console.log('✅ Roles updated for all players:', gameState.room.players.map(p => `${p.name}: ${p.role}`))
          }
          
          // УБРАНО: избыточная загрузка данных
          // Роли уже корректно обновлены в data.room выше
          return
        }
        
        if (data.room) {
          // Сохраняем важные текущие состояния перед обновлением
          const currentChatPerms = gameState.room.chatPermissions
          const currentNightAction = gameState.nightAction
          
          Object.assign(gameState.room, data.room)
          
          // Восстанавливаем права чата если фаза не изменилась
          if (currentChatPerms && gameState.room.phase === data.room.phase) {
            gameState.room.chatPermissions = currentChatPerms
            console.log('💬 Preserved chat permissions during game-updated')
          }
          
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
      
      // Персональное назначение роли
      on('role-assigned', (data) => {
        console.log('🎭 Personal role assigned:', data)
        // Обновляем роль игрока немедленно
        if (data.playerId === gameState.player.id || data.playerId === getSocketId()) {
          gameState.player.role = data.role
          console.log(`✅ My role assigned: ${data.role}`)
        }
      })
      
      // Раскрытие роли при смерти
      on('role-revealed', (data) => {
        console.log('💀 Role revealed:', data)
        // Обновляем локальное состояние игрока
        const player = gameState.room.players.find(p => p.id === data.playerId)
        if (player) {
          player.alive = false // Обновляем статус если еще не обновлен
          console.log(`💀 ${data.playerName} role revealed: ${data.roleName}`)
        }
      })
      
      // Смена фазы
      on('phase-changed', (data) => {
        console.log('🔄 Phase changed:', data)
        const oldPhase = gameState.room.phase
        gameState.room.phase = data.phase
        gameState.voting.myVote = null
        
        // Обновляем права чата в зависимости от новой фазы
        updateChatPermissions(data.phase)
        
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
        
        // УБРАНО: избыточное обновление данных при смене фазы
        // Теперь роли корректно синхронизируются через единую логику getClientData
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
      
      // Событие завершения хода игрока (скрывает кнопки действий)
      on('night-turn-ended', (data) => {
        console.log('🌙 Night turn ended for player:', data.playerId)
        // Скрываем кнопки действий если это наш ход закончился
        if (data.playerId === currentPlayer.value?.id) {
          gameState.nightAction.active = false
          console.log('🌙 Hiding night action buttons - turn ended')
        }
      })
      
      // Автозаполнение чата
      on('auto-fill-chat', (data) => {
        console.log('📝 Auto-filling chat:', data.command)
        // Найдем компонент чата и заполним его
        // Это событие обрабатывается в GameChat.vue
      })
      
      // Приказ от Ктулху
      on('cthulhu-order', (data) => {
        console.log('🐙 Received Cthulhu order:', data)
        
        // Добавляем предупреждающее сообщение
        gameState.chat.push({
          id: `cthulhu-warning-${Date.now()}`,
          type: 'cthulhu-warning',
          senderId: 'system',
          senderName: 'Система',
          message: data.warning,
          timestamp: Date.now(),
          isSystemMessage: true,
          specialType: 'cthulhu-warning'
        })
        
        // Добавляем сам приказ через небольшую задержку
        setTimeout(() => {
          gameState.chat.push({
            id: `cthulhu-order-${Date.now()}`,
            type: 'cthulhu-order',
            senderId: 'system',
            senderName: data.from,
            message: `📜 Приказ: ${data.message}`,
            timestamp: Date.now(),
            isSystemMessage: true,
            specialType: 'cthulhu-order'
          })
        }, 1000)
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
    loadGameState,
    loadChatHistory,
    cleanup,
    
    // Таймер
    timer,
    setTimerEndTime: timer.setEndTime
  }
}