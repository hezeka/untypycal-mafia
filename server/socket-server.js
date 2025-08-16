
import { Server } from 'socket.io'
import http from 'http'
import express from 'express'
import { GameRoom } from './models/GameRoom.js'
import { ChatCommandProcessor } from './services/ChatCommandProcessor.js'
import { roles, validateRole } from './config/roles.js'
import { 
  canSendMessage, 
  getMessageRecipients, 
  generateRoomId,
  validatePlayerName,
  validatePlayerNameForReconnection,
  getExistingPlayerNames,
  suggestAlternativeNames,
  generateRandomName,
  validateRoomId,
  cleanupDisconnectedPlayers,
  logGameAction,
  sanitizeMessage,
  canStartGame,
  getPhaseDisplayName
} from './utils/gameHelpers.js'

// Создаем Express приложение
const app = express()
app.use(express.json())

const server = http.createServer(app)

// Настройки CORS для работы через nginx
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? [
      "https://mafia.waifucards.app",
      "http://mafia.waifucards.app"
    ]
  : [
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ]

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  // Дополнительные настройки для продакшена
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  // Путь должен совпадать с nginx
  path: '/socket.io/'
})

console.log('🚀 Socket.IO server starting...')
console.log('📍 Environment:', process.env.NODE_ENV || 'development')
console.log('🌐 CORS origins:', corsOrigins)

// Game rooms storage
const gameRooms = new Map()

// HTTP API endpoint для получения публичных комнат
app.get('/api/public-rooms', (req, res) => {
  try {
    const publicRooms = listPublicRooms()
    res.json(publicRooms)
  } catch (error) {
    console.error('HTTP API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Возвращает список публичных комнат в удобном виде
export function listPublicRooms() {
  const rooms = []
  
  for (const [roomId, room] of gameRooms.entries()) {
    if (room.isPrivate) continue

    const hostPlayer = room.players.get(room.hostId)
    const hostName = hostPlayer ? hostPlayer.name : 'Unknown'
    const playerCount = room.players.size
    const selectedRolesCount = Array.isArray(room.selectedRoles) ? room.selectedRoles.length : 0
    const maxPlayers = selectedRolesCount > 0 ? selectedRolesCount + 1 : 10

    rooms.push({
      id: room.id,
      hostName,
      playerCount,
      maxPlayers,
      gameState: room.gameState,
      selectedRolesCount
    })
  }
  
  return rooms
}

// Cleanup disconnected players every 10 minutes
setInterval(() => {
  gameRooms.forEach((room, roomId) => {
    const cleaned = cleanupDisconnectedPlayers(room, 30)
    if (cleaned > 0) {
      logGameAction(roomId, 'cleanup', { playersRemoved: cleaned })
    }
    
    // Если в комнате не осталось подключенных игроков, удаляем её
    const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected)
    if (connectedPlayers.length === 0) {
      room.stopTimer() // Останавливаем таймер перед удалением комнаты
      gameRooms.delete(roomId)
      logGameAction(roomId, 'room_deleted', { reason: 'no_connected_players' })
    }
  })
}, 10 * 60 * 1000)

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id, 'from', socket.handshake.headers.origin || 'unknown')

  socket.on('create-room', (data) => {
    // Валидация данных
    const nameValidation = validatePlayerName(data.playerName, [])
    if (!nameValidation.valid) {
      socket.emit('error', { message: nameValidation.error })
      return
    }

    const roomId = generateRoomId()
    const isPrivate = data.isPrivate || false
    const room = new GameRoom(roomId, socket.id, roles, isPrivate)
    room.addPlayer(socket.id, nameValidation.name, data.preferredColor)
    
    // Ensure host has the game_master role
    const hostPlayer = room.players.get(socket.id)
    if (hostPlayer) {
      hostPlayer.role = 'game_master'
    }
    
    gameRooms.set(roomId, room)
    
    socket.join(roomId)
    socket.emit('room-created', { roomId, gameData: room.getGameData(socket.id) })
    
    logGameAction(roomId, 'room_created', { 
      hostName: nameValidation.name,
      hostId: socket.id,
      isPrivate: isPrivate,
      formattedName: nameValidation.name !== data.playerName ? `"${data.playerName}" -> "${nameValidation.name}"` : 'no formatting'
    })
  })

  socket.on('join-room', (data) => {
    // Валидация формата комнаты
    if (!validateRoomId(data.roomId)) {
      socket.emit('error', { message: 'Неверный формат кода комнаты (должен быть 6 символов: буквы и цифры)' })
      return
    }

    const room = gameRooms.get(data.roomId.toUpperCase())
    if (!room) {
      socket.emit('error', { message: 'Комната не найдена. Проверьте код комнаты.' })
      return
    }

    // СНАЧАЛА проверяем переподключение по имени
    let existingPlayer = null
    for (const [socketId, player] of room.players.entries()) {
      if (player.name.toLowerCase() === data.playerName.toLowerCase().trim()) {
        existingPlayer = { socketId, player }
        break
      }
    }

    // Если это переподключение - НЕ валидируем имя заново
    if (existingPlayer) {
      // RECONNECTION - просто переподключаем без валидации
      const { socketId: oldSocketId, player: playerData } = existingPlayer
      
      logGameAction(data.roomId, 'reconnection_detected', {
        playerName: data.playerName,
        oldSocketId,
        newSocketId: socket.id,
        gameState: room.gameState
      })
      
      // Обновляем голос если был
      if (room.votes.has(oldSocketId)) {
        const vote = room.votes.get(oldSocketId)
        room.votes.delete(oldSocketId)
        room.votes.set(socket.id, vote)
      }
      
      // Remove old socket entry
      room.players.delete(oldSocketId)
      
      // Update host ID if this was the host
      if (oldSocketId === room.hostId || playerData.role === 'game_master') {
        room.hostId = socket.id
        if (playerData.role !== 'game_master') {
          playerData.role = 'game_master'
        }
        logGameAction(data.roomId, 'host_reconnected', { playerName: data.playerName })
      }
      
      // Update player's socket ID and mark as connected
      playerData.id = socket.id
      playerData.connected = true
      playerData.disconnectedAt = null
      room.players.set(socket.id, playerData)
      
      socket.join(data.roomId.toUpperCase())
      
      // Send personalized data to each player
      room.players.forEach((player, playerId) => {
        if (player.connected) {
          const personalizedGameData = room.getGameData(playerId)
          io.to(playerId).emit('game-updated', personalizedGameData)
        }
      })
      
      // Send confirmation to reconnecting player
      socket.emit('join-success', room.getGameData(socket.id))
      
      // logGameAction(data.roomId, 'player_reconnected', { 
      //   playerName: data.playerName,
      //   role: playerData.role || 'no_role'
      // })
      
      return // ВАЖНО: выходим здесь, не выполняем валидацию ниже
    }

    // Если НЕ переподключение - ТОГДА валидируем имя для нового игрока
    const existingNames = getExistingPlayerNames(room)
    const nameValidation = validatePlayerName(data.playerName, existingNames)
    
    if (!nameValidation.valid) {
      // Предлагаем альтернативы если имя занято
      if (nameValidation.error.includes('уже в комнате')) {
        const suggestions = suggestAlternativeNames(data.playerName, existingNames)
        const suggestionText = suggestions.length > 0 
          ? ` Попробуйте: ${suggestions.join(', ')}`
          : ''
        socket.emit('error', { 
          message: nameValidation.error + suggestionText,
          suggestions: suggestions
        })
      } else {
        socket.emit('error', { message: nameValidation.error })
      }
      return
    }

    // NEW PLAYER - only allow during setup
    if (room.gameState !== 'setup') {
      socket.emit('error', { 
        message: 'Игра уже началась, новые игроки не могут присоединиться. Дождитесь окончания текущей игры.' 
      })
      return
    }

    // Проверяем лимит игроков
    const maxPlayers = 20
    if (room.players.size >= maxPlayers) {
      socket.emit('error', { message: `Комната переполнена (максимум ${maxPlayers} игроков)` })
      return
    }

    room.addPlayer(socket.id, nameValidation.name, data.preferredColor)
    
    socket.join(data.roomId.toUpperCase())
    
    // Send personalized data to each player
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        const personalizedGameData = room.getGameData(playerId)
        io.to(playerId).emit('game-updated', personalizedGameData)
      }
    })
    
    // Send confirmation to new player
    socket.emit('join-success', room.getGameData(socket.id))
    
    // Уведомляем других игроков о присоединении
    room.addChatMessage(null, `🎭 ${nameValidation.name} присоединился к игре`, 'system')
    
    // Отправляем системное сообщение всем кроме нового игрока
    room.players.forEach((player, playerId) => {
      if (player.connected && playerId !== socket.id) {
        io.to(playerId).emit('new-message', room.chat[room.chat.length - 1])
      }
    })
    
    logGameAction(data.roomId, 'new_player_joined', { 
      playerName: nameValidation.name,
      totalPlayers: room.players.size,
      formatted: nameValidation.name !== data.playerName
    })
  })

  // Global username availability check
  socket.on('check-global-username', (data) => {
    const { username } = data
    
    // Check format
    const validation = validatePlayerName(username, [])
    if (!validation.valid) {
      socket.emit('global-username-result', {
        available: false,
        error: validation.error,
        suggestions: validation.suggestions || []
      })
      return
    }
    
    // Check uniqueness across all rooms
    const allPlayerNames = new Set()
    for (const room of gameRooms.values()) {
      for (const player of room.players.values()) {
        if (player.name && player.connected) {
          allPlayerNames.add(player.name.toLowerCase())
        }
      }
    }
    
    const normalizedUsername = username.toLowerCase()
    if (allPlayerNames.has(normalizedUsername)) {
      // Generate suggestions
      const suggestions = suggestAlternativeNames(username, Array.from(allPlayerNames))
      
      socket.emit('global-username-result', {
        available: false,
        error: 'Это имя уже используется в другой игре',
        suggestions
      })
      return
    }
    
    socket.emit('global-username-result', {
      available: true,
      formattedName: validation.name
    })
  })

  // Добавляем новый обработчик для проверки доступности имени
  socket.on('check-name-availability', (data) => {
    if (!data.roomId || !data.playerName) {
      socket.emit('name-check-result', { available: false, error: 'Неверные данные' })
      return
    }

    const room = gameRooms.get(data.roomId.toUpperCase())
    if (!room) {
      socket.emit('name-check-result', { available: false, error: 'Комната не найдена' })
      return
    }

    const existingNames = getExistingPlayerNames(room)
    const validation = validatePlayerName(data.playerName, existingNames)
    
    if (validation.valid) {
      socket.emit('name-check-result', { 
        available: true, 
        formattedName: validation.name,
        changed: validation.name !== data.playerName
      })
    } else {
      const suggestions = suggestAlternativeNames(data.playerName, existingNames)
      socket.emit('name-check-result', { 
        available: false, 
        error: validation.error,
        suggestions: suggestions
      })
    }
  })

  // Добавляем обработчик для получения предложений имен
  socket.on('get-name-suggestions', (data) => {
    if (!data.roomId || !data.baseName) {
      socket.emit('name-suggestions', { suggestions: [] })
      return
    }

    const room = gameRooms.get(data.roomId.toUpperCase())
    if (!room) {
      socket.emit('name-suggestions', { suggestions: [] })
      return
    }

    const existingNames = getExistingPlayerNames(room)
    const suggestions = suggestAlternativeNames(data.baseName, existingNames)
    
    // Добавляем случайное имя если мало предложений
    if (suggestions.length < 3) {
      const randomName = generateRandomName(existingNames)
      suggestions.push(randomName)
    }
    
    socket.emit('name-suggestions', { suggestions: suggestions.slice(0, 5) })
  })

  socket.on('select-role', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может выбирать роли' })
      return
    }

    if (!validateRole(data.roleId)) {
      socket.emit('error', { message: 'Недопустимая роль' })
      return
    }

    if (!room.selectedRoles.includes(data.roleId)) {
      room.selectedRoles.push(data.roleId)
      
      // Send personalized updates to all players
      room.players.forEach((player, playerId) => {
        if (player.connected) {
          io.to(playerId).emit('game-updated', room.getGameData(playerId))
        }
      })

      // logGameAction(data.roomId, 'role_selected', { 
      //   roleId: data.roleId,
      //   totalRoles: room.selectedRoles.length
      // })
    }
  })

  socket.on('remove-role', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может удалять роли' })
      return
    }

    const index = room.selectedRoles.indexOf(data.roleId)
    if (index > -1) {
      room.selectedRoles.splice(index, 1)
      
      // Send personalized updates to all players
      room.players.forEach((player, playerId) => {
        if (player.connected) {
          io.to(playerId).emit('game-updated', room.getGameData(playerId))
        }
      })

      // logGameAction(data.roomId, 'role_removed', { 
      //   roleId: data.roleId,
      //   totalRoles: room.selectedRoles.length
      // })
    }
  })

  // Player management handlers
  socket.on('kick-player', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может удалять игроков' })
      return
    }

    const playerToKick = room.players.get(data.playerId)
    if (!playerToKick) {
      socket.emit('error', { message: 'Игрок не найден' })
      return
    }

    if (data.playerId === room.hostId) {
      socket.emit('error', { message: 'Нельзя удалить ведущего' })
      return
    }

    // Remove player from room
    room.removePlayer(data.playerId)
    
    // Notify the kicked player
    io.to(data.playerId).emit('kicked-from-room', {
      message: `Вы были удалены из комнаты ведущим`
    })
    
    // Add system message
    room.addChatMessage(null, `🚪 Игрок ${playerToKick.name} был удален из комнаты`, 'system')
    
    // Update all remaining players
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('game-updated', room.getGameData(playerId))
      }
    })

    console.log(`Player ${playerToKick.name} kicked from room ${data.roomId}`)
  })

  socket.on('toggle-player-mute', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может мутить игроков' })
      return
    }

    const player = room.players.get(data.playerId)
    if (!player) {
      socket.emit('error', { message: 'Игрок не найден' })
      return
    }

    player.muted = data.muted
    
    // Notify the muted/unmuted player
    io.to(data.playerId).emit('mute-status-changed', {
      muted: data.muted,
      message: data.muted ? 'Вам запрещен чат ведущим' : 'Вам разрешен чат'
    })
    
    // Add system message
    room.addChatMessage(null, `${data.muted ? '🔇' : '🔊'} Игрок ${player.name} ${data.muted ? 'замучен' : 'размучен'}`, 'system')
    
    // Update all players
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('game-updated', room.getGameData(playerId))
      }
    })

    console.log(`Player ${player.name} ${data.muted ? 'muted' : 'unmuted'} in room ${data.roomId}`)
  })

  socket.on('kick-disconnected-players', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может удалять игроков' })
      return
    }

    // Find all disconnected players (exclude host)
    const disconnectedPlayers = Array.from(room.players.values())
      .filter(p => !p.connected && p.id !== room.hostId)
    
    if (disconnectedPlayers.length === 0) {
      socket.emit('error', { message: 'Нет отключившихся игроков' })
      return
    }

    // Remove all disconnected players
    const kickedNames = []
    disconnectedPlayers.forEach(player => {
      kickedNames.push(player.name)
      room.removePlayer(player.id)
    })
    
    // Add system message
    room.addChatMessage(null, `🧹 Удалены отключившиеся: ${kickedNames.join(', ')}`, 'system')
    
    // Update all remaining players
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('game-updated', room.getGameData(playerId))
      }
    })

    console.log(`Kicked ${disconnectedPlayers.length} disconnected players from room ${data.roomId}`)
  })

  socket.on('mute-all-players', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может мутить игроков' })
      return
    }

    // Mute/unmute all players except host
    const affectedPlayers = []
    room.players.forEach(player => {
      if (player.id !== room.hostId && player.muted !== data.muted) {
        player.muted = data.muted
        affectedPlayers.push(player.name)
        
        // Notify each affected player
        io.to(player.id).emit('mute-status-changed', {
          muted: data.muted,
          message: data.muted ? 'Все игроки замучены' : 'Все игроки размучены'
        })
      }
    })
    
    if (affectedPlayers.length > 0) {
      // Add system message
      room.addChatMessage(null, `${data.muted ? '🔇' : '🔊'} Все игроки ${data.muted ? 'замучены' : 'размучены'}`, 'system')
    }
    
    // Update all players
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('game-updated', room.getGameData(playerId))
      }
    })

    console.log(`${data.muted ? 'Muted' : 'Unmuted'} all players in room ${data.roomId}`)
  })

  socket.on('assign-roles-manually', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может назначать роли' })
      return
    }

    if (room.gameState !== 'setup') {
      socket.emit('error', { message: 'Роли можно назначать только в фазе настройки' })
      return
    }

    // Validate assignments
    const { assignments } = data
    const assignedRoles = Object.values(assignments)
    const selectedRoles = room.selectedRoles
    
    // Check if all assigned roles are in selected roles
    for (const roleId of assignedRoles) {
      if (!selectedRoles.includes(roleId)) {
        socket.emit('error', { message: `Роль ${roleId} не была выбрана` })
        return
      }
    }
    
    // Check for duplicate role assignments
    const roleCount = {}
    for (const roleId of assignedRoles) {
      roleCount[roleId] = (roleCount[roleId] || 0) + 1
    }
    
    for (const [roleId, count] of Object.entries(roleCount)) {
      const maxCount = selectedRoles.filter(r => r === roleId).length
      if (count > maxCount) {
        socket.emit('error', { message: `Роль ${roleId} назначена слишком много раз` })
        return
      }
    }
    
    // Apply assignments
    for (const [playerId, roleId] of Object.entries(assignments)) {
      const player = room.players.get(playerId)
      if (player && player.role !== 'game_master') {
        player.role = roleId
        console.log(`Manually assigned role ${roleId} to player ${player.name}`)
      }
    }
    
    // Put remaining unassigned roles in center
    const assignedRolesList = Object.values(assignments)
    const unassignedRoles = selectedRoles.filter(roleId => {
      const assignedCount = assignedRolesList.filter(r => r === roleId).length
      const selectedCount = selectedRoles.filter(r => r === roleId).length
      return selectedCount > assignedCount
    })
    
    room.gameData.centerCards = unassignedRoles
    console.log(`Center cards after manual assignment:`, room.gameData.centerCards)
    
    logGameAction(data.roomId, 'roles_assigned_manually', {
      assignmentsCount: Object.keys(assignments).length,
      centerCards: room.gameData.centerCards.length
    })
  })

  socket.on('start-game', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может начать игру' })
      return
    }

    const validation = canStartGame(room)
    if (!validation.canStart) {
      socket.emit('error', { message: validation.error })
      return
    }

    // Check if roles have been manually assigned
    const playersWithRoles = Array.from(room.players.values())
      .filter(p => p.role !== 'game_master' && p.role !== null).length
    
    // Only auto-distribute if roles haven't been manually assigned
    if (playersWithRoles === 0) {
      room.distributeRoles()
    }
    
    room.gameState = 'day'
    room.currentPhase = 'discussion'
    
    // Автоматически запускаем таймер для дневной фазы знакомства
    const dayTimer = 5 * 60 // 5 минут для знакомства
    const roomId = data.roomId.toUpperCase()
    
    room.startTimer(dayTimer, 
      // onTick - каждую секунду
      (remainingTime) => {
        io.to(roomId).emit('timer-updated', { timer: remainingTime })
      },
      // onEnd - когда время истекло
      () => {
        io.to(roomId).emit('timer-ended', { message: 'Время фазы истекло!' })
        room.addChatMessage(null, '⏰ Время дневной фазы знакомства истекло!', 'system')
        
        // Отправляем обновленный чат всем игрокам
        room.players.forEach((player, playerId) => {
          if (player.connected) {
            io.to(playerId).emit('game-updated', room.getGameData(playerId))
          }
        })
      }
    )
    
    // Add welcome message
    room.addChatMessage(null, `🎮 Игра началась! Роли ${playersWithRoles > 0 ? 'назначены ведущим' : 'распределены случайно'}. В центре ${room.gameData.centerCards.length} карт.`, 'system')
    
    // Send personalized game start data to each player
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('game-started', room.getGameData(playerId))
      }
    })
    
    // Отправляем начальное значение таймера
    io.to(roomId).emit('timer-updated', { timer: dayTimer })
    
    logGameAction(data.roomId, 'game_started', {
      playersCount: room.players.size - 1, // Exclude host
      rolesCount: room.selectedRoles.length
    })
  })

  // Новый обработчик для перезапуска игры
  socket.on('restart-game', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room) return

    if (!room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может перезапустить игру' })
      return
    }

    // Принудительно сбрасываем игру в начальное состояние
    room.players.forEach(player => {
      if (player.role !== 'game_master') {
        player.role = null
        player.alive = true
        player.protected = false
        player.votes = 0
      }
    })
    room.selectedRoles = []
    room.chat = []
    room.resetVoting()
    room.gameState = 'setup'
    room.currentPhase = null
    room.stopTimer() // Останавливаем таймер при перезапуске игры

    // Уведомляем всех игроков об обновлении
    room.players.forEach(player => {
      io.to(player.id).emit('game-updated', room.getGameData(player.id))
    })

    logGameAction(data.roomId, 'game_restarted', {
      hostName: room.players.get(socket.id)?.name
    })
  })

  socket.on('change-phase', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может менять фазы' })
      return
    }

    const oldState = room.gameState
    room.gameState = data.gameState
    room.currentPhase = data.currentPhase
    
    // Если переходим к голосованию, сбрасываем предыдущие голоса
    if (data.gameState === 'voting' && oldState !== 'voting') {
      room.resetVoting()
    }
    
    // Автоматически запускаем таймер для определенных фаз
    const phaseTimers = {
      'day': 10 * 60, // 10 минут для дневной фазы
      'voting': 3 * 60, // 3 минуты для голосования  
      'night': 5 * 60 // 5 минут для ночи
    }
    
    if (phaseTimers[data.gameState]) {
      const timerSeconds = phaseTimers[data.gameState]
      const roomId = data.roomId.toUpperCase()
      
      room.startTimer(timerSeconds, 
        // onTick - каждую секунду
        (remainingTime) => {
          io.to(roomId).emit('timer-updated', { timer: remainingTime })
        },
        // onEnd - когда время истекло
        () => {
          io.to(roomId).emit('timer-ended', { message: 'Время фазы истекло!' })
          room.addChatMessage(null, '⏰ Время фазы истекло!', 'system')
          
          // Отправляем обновленный чат всем игрокам
          room.players.forEach((player, playerId) => {
            if (player.connected) {
              io.to(playerId).emit('game-updated', room.getGameData(playerId))
            }
          })
        }
      )
      
      // Отправляем начальное значение таймера
      io.to(roomId).emit('timer-updated', { timer: timerSeconds })
    } else {
      // Останавливаем таймер для фаз без таймера
      const roomId = data.roomId.toUpperCase()
      room.stopTimer()
      io.to(roomId).emit('timer-updated', { timer: null })
    }
    
    io.to(data.roomId).emit('phase-changed', {
      gameState: room.gameState,
      currentPhase: room.currentPhase
    })

    // Отправляем обновленные данные всем игрокам
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('game-updated', room.getGameData(playerId))
      }
    })

    // logGameAction(data.roomId, 'phase_changed', {
    //   oldState,
    //   newState: data.gameState,
    //   newPhase: data.currentPhase,
    //   timerStarted: !!phaseTimers[data.gameState]
    // })
  })

  socket.on('send-message', async (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room) return

    const player = room.players.get(socket.id)
    if (!player) return

    // Санитизируем сообщение
    const sanitizedMessage = sanitizeMessage(data.message)
    if (!sanitizedMessage) {
      socket.emit('error', { message: 'Сообщение не может быть пустым' })
      return
    }

    const messageType = room.isHost(socket.id) ? 'host' : 'player'
    const commandProcessor = new ChatCommandProcessor(room)

    // ОТЛАДКА: логируем каждое сообщение
    console.log(`📨 Message from ${player.name}: "${sanitizedMessage}"`)
    console.log(`🔍 Is command: ${commandProcessor.isCommand(sanitizedMessage)}`)

    // Проверяем, является ли сообщение командой
    if (commandProcessor.isCommand(sanitizedMessage)) {
      try {
        console.log(`🔍 Processing command: ${sanitizedMessage} from ${player.name}`)
        
        // ОТЛАДКА: парсим команду для логирования
        const parsed = commandProcessor.parseCommand(sanitizedMessage)
        console.log(`📊 Parsed command:`, {
          command: parsed?.command,
          args: parsed?.args,
          argsLength: parsed?.args?.length
        })
        
        const result = await commandProcessor.processCommand(socket.id, sanitizedMessage)
        
        console.log(`📊 Command result:`, {
          hasError: !!result.error,
          hasWhisper: !!result.whisperMessage,
          hasHelp: !!result.helpMessage,
          error: result.error
        })
        
        if (result.error) {
          socket.emit('command-error', { message: result.error })
          console.log(`❌ Command error for ${player.name}: ${result.error}`)
          return
        }

        if (result.helpMessage) {
          result.recipients.forEach(recipientId => {
            io.to(recipientId).emit('new-message', result.helpMessage)
          })
          // logGameAction(data.roomId, 'command_executed', { 
          //   player: player.name,
          //   command: sanitizedMessage.split(' ')[0],
          //   type: 'help'
          // })
          return
        }

        if (result.whisperMessage) {
          // СОХРАНЯЕМ шепот в серверной истории чата
          room.chat.push(result.whisperMessage)
          
          result.recipients.forEach(recipientId => {
            io.to(recipientId).emit('new-whisper', result.whisperMessage)
          })

          if (result.whisperMessage.type === 'group_whisper') {
            // logGameAction(data.roomId, 'group_whisper', {
            //   from: player.name,
            //   to: result.whisperMessage.targetGroupName,
            //   membersCount: result.whisperMessage.targetMembers.length
            // })
          } else {
            // logGameAction(data.roomId, 'whisper', {
            //   from: player.name,
            //   to: result.whisperMessage.targetPlayerName
            // })
          }
          return
        }
      } catch (error) {
        console.error('💥 Command processing exception:', error)
        console.error('Stack:', error.stack)
        socket.emit('command-error', { message: 'Ошибка обработки команды: ' + error.message })
      }

      return
    }

    // Обычное сообщение - проверяем права
    if (!canSendMessage(room, player, messageType)) {
      socket.emit('error', { message: 'Вы не можете писать сообщения в текущей фазе' })
      return
    }

    room.addChatMessage(socket.id, sanitizedMessage, messageType)
    
    const lastMessage = room.chat[room.chat.length - 1]
    
    const recipients = getMessageRecipients(room, messageType, player)
    recipients.forEach(recipientId => {
      io.to(recipientId).emit('new-message', lastMessage)
    })

    // logGameAction(data.roomId, 'message', {
    //   from: player.name,
    //   type: messageType,
    //   recipientsCount: recipients.length
    // })
  })

  socket.on('voice-activity', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room) return

    const player = room.players.get(socket.id)
    if (!player) return

    // Проверяем, может ли игрок говорить в текущей фазе
    if (!canPlayerSpeak(room, player)) {
      return // Игнорируем активность если говорить нельзя
    }

    // Отправляем обновление всем игрокам в комнате
    room.players.forEach((roomPlayer, playerId) => {
      if (roomPlayer.connected) {
        io.to(playerId).emit('voice-activity-update', {
          playerId: socket.id,
          playerName: player.name,
          isActive: data.isActive
        })
      }
    })

    // logGameAction(data.roomId, 'voice_activity', {
    //   player: player.name,
    //   isActive: data.isActive,
    //   gameState: room.gameState
    // })
  })

    // Функция проверки прав на речь
  function canPlayerSpeak(room, player) {
    // Ведущий может говорить всегда
    if (room.isHost(player.id)) return true
    
    // Во время подготовки все могут говорить
    if (room.gameState === 'setup') return true
    
    // Во время дня все могут говорить
    if (room.gameState === 'day') return true
    
    // Ночью только оборотни могут говорить
    if (room.gameState === 'night') {
      return room.canSeeWerewolfRoles(player.role)
    }
    
    // Во время голосования никто не может говорить
    if (room.gameState === 'voting') return false
    
    return false
  }

  // СИСТЕМА ГОЛОСОВАНИЯ
  socket.on('vote-player', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room) return

    const voter = room.players.get(socket.id)
    if (!voter || voter.role === 'game_master' || !voter.alive) {
      socket.emit('error', { message: 'Вы не можете голосовать' })
      return
    }

    if (room.gameState !== 'voting') {
      socket.emit('error', { message: 'Голосование сейчас недоступно' })
      return
    }

    // data.targetId может быть null (воздержание) или ID игрока
    if (data.targetId !== null) {
      const target = room.players.get(data.targetId)
      if (!target || target.role === 'game_master' || !target.alive) {
        socket.emit('error', { message: 'Нельзя голосовать за этого игрока' })
        return
      }
    }

    // Сохраняем голос
    room.votes.set(socket.id, data.targetId)

    // Отправляем обновленную информацию о голосовании всем игрокам
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('game-updated', room.getGameData(playerId))
      }
    })

    // logGameAction(data.roomId, 'vote', {
    //   voter: voter.name,
    //   target: data.targetId ? room.players.get(data.targetId)?.name : 'ABSTAIN',
    //   votesSubmitted: room.votes.size,
    //   totalVoters: room.getEligibleVoters().length
    // })
  })

  // Завершение голосования
  socket.on('end-voting', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может завершить голосование' })
      return
    }

    if (room.gameState !== 'voting') {
      socket.emit('error', { message: 'Голосование не активно' })
      return
    }

    // Обрабатываем результаты голосования
    const votingResult = room.processVoting()
    
    // Проверяем условия победы
    const winCondition = room.checkWinConditions()
    
    if (winCondition.gameEnded) {
      room.gameState = 'ended'
      room.currentPhase = 'results'
      room.addChatMessage(null, winCondition.message, 'system')
    } else {
      room.gameState = 'night'
      room.currentPhase = 'start'
      room.timer = 600 // 10 минут на ночную фазу
      room.addChatMessage(null, `🌙 Наступает ночь. ${winCondition.message}`, 'system')
    }

    // Отправляем результаты всем игрокам
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('voting-ended', {
          eliminated: votingResult.eliminated,
          reason: votingResult.reason,
          winCondition: winCondition,
          gameData: room.getGameData(playerId)
        })
      }
    })

    // logGameAction(data.roomId, 'voting_ended', {
    //   eliminated: votingResult.eliminated.length,
    //   winner: winCondition.winner,
    //   gameEnded: winCondition.gameEnded
    // })
  })

  socket.on('admin-action', (data) => {
    console.log('🎯 Admin action received:', data)
    
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может выполнять эти действия' })
      return
    }

    console.log('🔍 Looking for player with ID:', data.targetId)
    console.log('📋 Available player IDs:', Array.from(room.players.keys()))
    
    const targetPlayer = room.players.get(data.targetId)
    if (!targetPlayer) {
      console.log('❌ Player not found in room.players Map')
      socket.emit('error', { message: 'Игрок не найден' })
      return
    }

    logGameAction(data.roomId, 'admin_action', {
      action: data.action,
      target: targetPlayer.name,
      admin: room.players.get(socket.id)?.name
    })

    switch (data.action) {
      case 'kill':
        targetPlayer.alive = false
        targetPlayer.protected = false
        break
      case 'revive':
        targetPlayer.alive = true
        break
      case 'kick':
        room.players.delete(data.targetId)
        room.votes.delete(data.targetId)
        if (targetPlayer.connected) {
          io.to(data.targetId).emit('kicked', { message: 'Вы были исключены из игры ведущим' })
        }
        break
      case 'change_role':
        if (data.newRole && validateRole(data.newRole)) {
          targetPlayer.role = data.newRole
        }
        break
      case 'protect':
        targetPlayer.protected = !targetPlayer.protected
        break
    }

    // Send personalized updated game data to all players
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('game-updated', room.getGameData(playerId))
      }
    })
  })

  socket.on('change-timer', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может изменять таймер' })
      return
    }

    const seconds = Math.max(0, parseInt(data.timer) || 0)
    
    if (seconds > 0) {
      // Запускаем обратный отсчет
      room.startTimer(seconds, 
        // onTick - каждую секунду
        (remainingTime) => {
          const roomId = data.roomId.toUpperCase()
          io.to(roomId).emit('timer-updated', { timer: remainingTime })
        },
        // onEnd - когда время истекло
        () => {
          const roomId = data.roomId.toUpperCase()
          io.to(roomId).emit('timer-ended', { message: 'Время истекло!' })
          room.addChatMessage(null, '⏰ Время фазы истекло!', 'system')
          
          // Отправляем обновленный чат всем игрокам
          room.players.forEach((player, playerId) => {
            if (player.connected) {
              io.to(playerId).emit('game-updated', room.getGameData(playerId))
            }
          })
        }
      )
    } else {
      // Останавливаем таймер
      room.stopTimer()
    }
    
    // Отправляем текущее значение таймера
    const roomId = data.roomId.toUpperCase()
    io.to(roomId).emit('timer-updated', { timer: room.timer })

    // logGameAction(data.roomId, 'timer_changed', { timer: room.timer })
  })

  // Обработчик смены цвета игрока
  socket.on('change-player-color', (data) => {
    console.log('🎨 Server: Received change-player-color event:', data)
    const room = gameRooms.get(data.roomId)
    if (!room) {
      console.log('❌ Server: Room not found:', data.roomId)
      return
    }

    const player = room.players.get(socket.id)
    if (!player) {
      console.log('❌ Server: Player not found:', socket.id)
      return
    }
    console.log('👤 Server: Player found:', { id: player.id, name: player.name, currentColor: player.color })

    // Смена цвета разрешена только на этапе setup
    if (room.gameState !== 'setup') {
      console.log('⚠️ Server: Color change not allowed, game state:', room.gameState)
      socket.emit('error', { message: 'Смена цвета разрешена только на этапе подбора ролей' })
      return
    }

    const result = room.changePlayerColor(socket.id, data.color)
    console.log('🔄 Server: Color change result:', result)
    if (!result.success) {
      console.log('❌ Server: Color change failed:', result.error)
      socket.emit('error', { message: result.error })
      return
    }
    console.log('✅ Server: Color changed successfully, player color now:', player.color)

    // Отправляем обновленные данные всем игрокам
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        console.log('📤 Server: Sending game-updated to player:', playerId)
        io.to(playerId).emit('game-updated', room.getGameData(playerId))
      }
    })
  })

  socket.on('next-phase', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может переключать фазы' })
      return
    }

    // Determine next phase
    let nextState = room.gameState
    let nextPhase = room.currentPhase

    switch (room.gameState) {
      case 'night':
        nextState = 'day'
        nextPhase = 'discussion'
        break
      case 'day':
        nextState = 'voting'
        nextPhase = 'voting'
        room.resetVoting()
        break
      case 'voting':
        // Автоматически обрабатываем голосование
        const votingResult = room.processVoting()
        const winCondition = room.checkWinConditions()
        
        if (winCondition.gameEnded) {
          nextState = 'ended'
          nextPhase = 'results'
          room.addChatMessage(null, winCondition.message, 'system')
        } else {
          nextState = 'night'
          nextPhase = 'start'
          room.addChatMessage(null, `🌙 Наступает ночь. ${winCondition.message}`, 'system')
        }
        
        // Отправляем результаты голосования
        room.players.forEach((player, playerId) => {
          if (player.connected) {
            io.to(playerId).emit('voting-ended', {
              eliminated: votingResult.eliminated,
              reason: votingResult.reason,
              winCondition: winCondition
            })
          }
        })
        
        // logGameAction(data.roomId, 'auto_voting_ended', {
        //   eliminated: votingResult.eliminated.length,
        //   winner: winCondition.winner,
        //   gameEnded: winCondition.gameEnded
        // })
        break
      case 'ended':
        nextState = 'setup'
        nextPhase = null
        // Reset game state for new round
        room.players.forEach(player => {
          if (player.role !== 'game_master') {
            player.role = null
            player.alive = true
            player.protected = false
            player.votes = 0
          }
        })
        room.selectedRoles = []
        room.chat = []
        room.resetVoting()
        break
    }

    room.gameState = nextState
    room.currentPhase = nextPhase
    
    // Автоматически запускаем таймер для определенных фаз
    const phaseTimers = {
      'day': 10 * 60, // 10 минут для дневной фазы
      'voting': 3 * 60, // 3 минуты для голосования  
      'night': 5 * 60 // 5 минут для ночи
    }
    
    if (phaseTimers[nextState]) {
      const timerSeconds = phaseTimers[nextState]
      const roomId = data.roomId.toUpperCase()
      
      room.startTimer(timerSeconds, 
        // onTick - каждую секунду
        (remainingTime) => {
          io.to(roomId).emit('timer-updated', { timer: remainingTime })
        },
        // onEnd - когда время истекло
        () => {
          io.to(roomId).emit('timer-ended', { message: 'Время фазы истекло!' })
          room.addChatMessage(null, '⏰ Время фазы истекло!', 'system')
          
          // Отправляем обновленный чат всем игрокам
          room.players.forEach((player, playerId) => {
            if (player.connected) {
              io.to(playerId).emit('game-updated', room.getGameData(playerId))
            }
          })
        }
      )
      
      // Отправляем начальное значение таймера
      io.to(roomId).emit('timer-updated', { timer: timerSeconds })
    } else {
      // Останавливаем таймер для фаз без таймера
      const roomId = data.roomId.toUpperCase()
      room.stopTimer()
      io.to(roomId).emit('timer-updated', { timer: null })
    }

    io.to(data.roomId).emit('phase-changed', {
      gameState: room.gameState,
      currentPhase: room.currentPhase
    })

    // Send personalized game data update to each player
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('game-updated', room.getGameData(playerId))
      }
    })

    // logGameAction(data.roomId, 'next_phase', {
    //   newState: nextState,
    //   newPhase: nextPhase
    // })
  })

  socket.on('disconnect', (reason) => {
    console.log('❌ User disconnected:', socket.id, 'Reason:', reason)
    
    // Find player in rooms and mark as disconnected instead of removing
    for (const [roomId, room] of gameRooms) {
      const player = room.players.get(socket.id)
      if (player) {
        // Mark player as disconnected but KEEP all data including role and vote
        player.connected = false
        player.disconnectedAt = Date.now()
        
        // If host disconnected, DON'T transfer host immediately
        if (room.hostId === socket.id) {
          console.log(`👑 Host "${player.name}" disconnected but will retain host status`)
        }
        
        // Check remaining connected players
        const connectedPlayersCount = Array.from(room.players.values()).filter(p => p.connected).length
        if (connectedPlayersCount === 0) {
          console.log(`⏰ All players disconnected from room ${roomId}, keeping room for reconnects`)
        } else {
          // Notify remaining players about disconnection with personalized data
          room.players.forEach((remainingPlayer, playerId) => {
            if (remainingPlayer.connected) {
              io.to(playerId).emit('game-updated', room.getGameData(playerId))
            }
          })
        }

        // logGameAction(roomId, 'player_disconnected', {
        //   playerName: player.name,
        //   connectedPlayersLeft: connectedPlayersCount
        // })
        break
      }
    }
  })

  // Обработка ошибок сокета
  socket.on('error', (error) => {
    console.error('Socket error:', error)
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Socket.IO server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Socket.IO server closed')
    process.exit(0)
  })
})

const PORT = process.env.SOCKET_PORT || 3001

server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`)
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 CORS allowed origins:`, corsOrigins)
  console.log(`📁 Game rooms storage initialized`)
})