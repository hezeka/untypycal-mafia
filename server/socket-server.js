/**
 * Главный сокет сервер для "Нетипичной Мафии"
 * Простая архитектура без over-engineering
 */

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { GameRoom } from './models/GameRoom.js'
import { 
  validateUsername, 
  validateRoomCode, 
  validateMessage, 
  generateRoomId,
  sanitizeHtml,
  throttle 
} from './utils/gameHelpers.js'
import { SOCKET_EVENTS, LIMITS, ERROR_CODES, GAME_PHASES } from './utils/constants.js'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? "https://mafia.waifucards.app" 
      : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
})

const logger = {
  info: (...args) => console.log(`ℹ️ [SocketServer]`, ...args),
  warn: (...args) => console.warn(`⚠️ [SocketServer]`, ...args),
  error: (...args) => console.error(`❌ [SocketServer]`, ...args)
}

// Хранилища
const rooms = new Map()
const playerRooms = new Map() // playerId -> roomId
const rateLimits = new Map() // socketId -> requests[]

// Порт сервера
const PORT = process.env.SOCKET_PORT || 3001

/**
 * Middleware для валидации и rate limiting
 */
const validateRequest = (socket, eventName) => {
  // Rate limiting
  const socketId = socket.id
  if (!rateLimits.has(socketId)) {
    rateLimits.set(socketId, [])
  }
  
  const requests = rateLimits.get(socketId)
  const now = Date.now()
  const oneMinute = 60 * 1000
  
  // Очищаем старые запросы
  const recentRequests = requests.filter(time => now - time < oneMinute)
  
  if (recentRequests.length >= LIMITS.MAX_MESSAGES_PER_MINUTE) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      code: ERROR_CODES.RATE_LIMITED,
      message: 'Слишком много запросов. Подождите минуту.'
    })
    return false
  }
  
  recentRequests.push(now)
  rateLimits.set(socketId, recentRequests)
  
  return true
}

/**
 * Получение комнаты игрока
 */
const getPlayerRoom = (socketId) => {
  const roomId = playerRooms.get(socketId)
  return roomId ? rooms.get(roomId) : null
}

/**
 * Отправка ошибки клиенту
 */
const sendError = (socket, code, message, details = null) => {
  socket.emit(SOCKET_EVENTS.ERROR, {
    code,
    message,
    details,
    timestamp: Date.now()
  })
}

/**
 * Создание комнаты
 */
const handleCreateRoom = (socket, data) => {
  if (!validateRequest(socket, 'create-room')) return
  
  try {
    const { username, isPrivate = false, hostAsObserver = false } = data
    
    // Валидация имени
    const usernameValidation = validateUsername(username)
    if (!usernameValidation.valid) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, usernameValidation.error)
    }
    
    // Создаем комнату
    const room = new GameRoom(socket.id, isPrivate, hostAsObserver)
    rooms.set(room.id, room)
    
    // Добавляем создателя как хоста
    const player = room.addPlayer(socket.id, usernameValidation.username)
    room.addSocket(socket.id, socket)
    playerRooms.set(socket.id, room.id)
    
    logger.info(`Room ${room.id} created by ${player.name}`)
    
    socket.emit(SOCKET_EVENTS.ROOM_CREATED, {
      room: room.getClientData(socket.id),
      player
    })
    
  } catch (error) {
    logger.error('Create room error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

/**
 * Присоединение к комнате
 */
const handleJoinRoom = (socket, data) => {
  if (!validateRequest(socket, 'join-room')) return
  
  try {
    const { roomCode, username } = data
    
    // Валидация данных
    const codeValidation = validateRoomCode(roomCode)
    if (!codeValidation.valid) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, codeValidation.error)
    }
    
    const usernameValidation = validateUsername(username)
    if (!usernameValidation.valid) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, usernameValidation.error)
    }
    
    // Ищем комнату
    const room = rooms.get(codeValidation.code)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    // Проверяем можно ли присоединиться
    if (room.gameState !== GAME_PHASES.SETUP) {
      return sendError(socket, ERROR_CODES.GAME_ALREADY_STARTED, 'Игра уже началась')
    }
    
    // Добавляем игрока
    const player = room.addPlayer(socket.id, usernameValidation.username)
    room.addSocket(socket.id, socket)
    playerRooms.set(socket.id, room.id)
    
    logger.info(`${player.name} joined room ${room.id}`)
    
    // Уведомляем игрока
    socket.emit(SOCKET_EVENTS.JOIN_SUCCESS, {
      room: room.getClientData(socket.id),
      player
    })
    
    // Уведомляем всех в комнате (данные будут персонализированы в broadcast)
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, {
      room: {} // Заглушка, персонализированные данные будут добавлены в broadcast
    })
    
  } catch (error) {
    logger.error('Join room error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

/**
 * Начало игры
 */
const handleStartGame = (socket, data) => {
  if (!validateRequest(socket, 'start-game')) return
  
  try {
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    const player = room.getPlayer(socket.id)
    if (!player || !player.isHost) {
      return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Только хост может начать игру')
    }
    
    // Запускаем игру
    room.startGame()
    
    logger.info(`Game started in room ${room.id}`)
    
    // Уведомляем всех
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, {
      room: {}
    })
    
  } catch (error) {
    logger.error('Start game error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

/**
 * Выбор роли
 */
const handleSelectRole = (socket, data) => {
  if (!validateRequest(socket, 'select-role')) return
  
  try {
    const { roleId } = data
    
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    const player = room.getPlayer(socket.id)
    if (!player || !player.isHost) {
      return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Только хост может выбирать роли')
    }
    
    if (room.gameState !== GAME_PHASES.SETUP) {
      return sendError(socket, ERROR_CODES.GAME_ALREADY_STARTED, 'Нельзя изменять роли после начала игры')
    }
    
    // Добавляем роль
    room.addRole(roleId)
    
    // Уведомляем всех
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, {
      room: {}
    })
    
  } catch (error) {
    logger.error('Select role error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

/**
 * Удаление роли
 */
const handleRemoveRole = (socket, data) => {
  if (!validateRequest(socket, 'remove-role')) return
  
  try {
    const { roleId } = data
    
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    const player = room.getPlayer(socket.id)
    if (!player || !player.isHost) {
      return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Только хост может удалять роли')
    }
    
    if (room.gameState !== GAME_PHASES.SETUP) {
      return sendError(socket, ERROR_CODES.GAME_ALREADY_STARTED, 'Нельзя изменять роли после начала игры')
    }
    
    // Удаляем роль
    room.removeRole(roleId)
    
    // Уведомляем всех
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, {
      room: {}
    })
    
  } catch (error) {
    logger.error('Remove role error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

/**
 * Отправка сообщения
 */
const handleSendMessage = (socket, data) => {
  if (!validateRequest(socket, 'send-message')) return
  
  try {
    const { content, type = 'player' } = data
    
    // Валидация сообщения
    const messageValidation = validateMessage(content)
    if (!messageValidation.valid) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, messageValidation.error)
    }
    
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    const player = room.getPlayer(socket.id)
    if (!player) {
      return sendError(socket, ERROR_CODES.PLAYER_NOT_FOUND, 'Игрок не найден')
    }
    
    // Проверяем права на отправку сообщений
    if (!room.chatPermissions.canChat) {
      return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Чат отключен в данной фазе')
    }
    
    // Создаем сообщение
    const message = room.addMessage({
      type,
      content: messageValidation.message,
      playerName: player.name,
      playerId: socket.id
    })
    
    // Отправляем всем кто может видеть
    room.broadcast(SOCKET_EVENTS.NEW_MESSAGE, message)
    
  } catch (error) {
    logger.error('Send message error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

/**
 * Голосование
 */
const handleVotePlayer = (socket, data) => {
  if (!validateRequest(socket, 'vote-player')) return
  
  try {
    const { targetId } = data
    
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    // Голосуем
    room.votePlayer(socket.id, targetId)
    
    // Проверяем, завершено ли голосование
    if (room.isVotingComplete()) {
      console.log(`🗳️ Voting completed in room ${room.id}`)
      
      // Завершаем голосование и получаем результаты
      const results = room.endVoting()
      
      // Уведомляем всех о завершении голосования
      room.broadcast(SOCKET_EVENTS.VOTING_ENDED, {
        results
      })
      
      // Переходим к следующей фазе
      if (room.gameEngine) {
        room.gameEngine.nextPhase()
      }
    }
    
    // Уведомляем всех об обновлении
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, {
      room: {}
    })
    
  } catch (error) {
    logger.error('Vote player error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

/**
 * Обработка админ действий ведущего
 */
const handleAdminAction = (socket, data) => {
  if (!validateRequest(socket, 'admin-action')) return
  
  try {
    const { action, targetId, targetName } = data
    
    // Находим комнату игрока
    const roomId = playerRooms.get(socket.id)
    if (!roomId) {
      return sendError(socket, ERROR_CODES.PLAYER_NOT_IN_ROOM, 'Вы не находитесь в комнате')
    }
    
    const room = rooms.get(roomId)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    // Проверяем, что игрок - ведущий
    const player = room.getPlayer(socket.id)
    if (!player || player.role !== 'game_master') {
      return sendError(socket, ERROR_CODES.NOT_HOST, 'Только ведущий может выполнять эти действия')
    }
    
    // Находим целевого игрока
    const targetPlayer = room.getPlayer(targetId)
    if (!targetPlayer) {
      return sendError(socket, ERROR_CODES.PLAYER_NOT_FOUND, 'Игрок не найден')
    }
    
    if (targetPlayer.role === 'game_master') {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, 'Нельзя воздействовать на ведущего')
    }
    
    let message = ''
    
    switch (action) {
      case 'kill':
        if (!targetPlayer.alive) {
          return sendError(socket, ERROR_CODES.VALIDATION_ERROR, `${targetPlayer.name} уже мертв`)
        }
        room.killPlayer(targetId)
        message = `💀 Ведущий убил игрока ${targetPlayer.name}`
        break
        
      case 'revive':
        if (targetPlayer.alive) {
          return sendError(socket, ERROR_CODES.VALIDATION_ERROR, `${targetPlayer.name} уже жив`)
        }
        room.revivePlayer(targetId)
        message = `✨ Ведущий воскресил игрока ${targetPlayer.name}`
        break
        
      case 'shield':
        if (targetPlayer.protected) {
          return sendError(socket, ERROR_CODES.VALIDATION_ERROR, `${targetPlayer.name} уже защищен`)
        }
        targetPlayer.protected = true
        message = `🛡️ Ведущий поставил щит игроку ${targetPlayer.name}`
        break
        
      case 'unshield':
        if (!targetPlayer.protected) {
          return sendError(socket, ERROR_CODES.VALIDATION_ERROR, `${targetPlayer.name} не защищен`)
        }
        targetPlayer.protected = false
        message = `❌ Ведущий снял щит с игрока ${targetPlayer.name}`
        break
        
      case 'kick':
        message = `🚪 Ведущий исключил игрока ${targetPlayer.name} из игры`
        room.removePlayer(targetId)
        break
        
      case 'change-role':
        const { newRole } = data
        if (!newRole) {
          return sendError(socket, ERROR_CODES.VALIDATION_ERROR, 'Не указана новая роль')
        }
        room.assignRole(targetId, newRole)
        message = `🔄 Ведущий сменил роль игрока ${targetPlayer.name} на ${newRole}`
        break
        
      default:
        return sendError(socket, ERROR_CODES.VALIDATION_ERROR, 'Неизвестное действие')
    }
    
    // Отправляем системное сообщение
    if (message) {
      room.addSystemMessage(message)
    }
    
    // Уведомляем всех о изменениях
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, {
      room: {}
    })
    
    logger.info(`Admin action: ${player.name} ${action} ${targetPlayer.name} in room ${room.id}`)
    
  } catch (error) {
    logger.error('Admin action error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

/**
 * Принудительная смена фазы
 */
const handleChangePhase = (socket, data) => {
  if (!validateRequest(socket, 'change-phase')) return
  
  try {
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    const player = room.getPlayer(socket.id)
    if (!player || !player.isHost) {
      return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Только хост может менять фазу')
    }
    
    if (!room.gameEngine) {
      return sendError(socket, ERROR_CODES.INVALID_PHASE, 'Игра не началась')
    }
    
    // Переходим к следующей фазе
    room.gameEngine.nextPhase()
    
  } catch (error) {
    logger.error('Change phase error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

/**
 * Отключение игрока
 */
const handleDisconnect = (socket) => {
  logger.info(`Player disconnected: ${socket.id}`)
  
  const room = getPlayerRoom(socket.id)
  if (room) {
    const player = room.getPlayer(socket.id)
    
    // Помечаем как отключенного
    room.removeSocket(socket.id)
    
    // Уведомляем остальных
    room.broadcast(SOCKET_EVENTS.PLAYER_DISCONNECTED, {
      playerId: socket.id,
      playerName: player?.name
    })
    
    // Удаляем из комнаты через 2 минуты если не переподключится
    setTimeout(() => {
      const currentRoom = getPlayerRoom(socket.id)
      if (currentRoom && !currentRoom.sockets.has(socket.id)) {
        currentRoom.removePlayer(socket.id)
        playerRooms.delete(socket.id)
        
        // Если комната пуста - удаляем
        if (currentRoom.isEmpty()) {
          rooms.delete(currentRoom.id)
          currentRoom.destroy()
          logger.info(`Empty room ${currentRoom.id} removed`)
        } else {
          // Уведомляем об удалении игрока
          currentRoom.broadcast(SOCKET_EVENTS.GAME_UPDATED, {
            room: currentRoom.getClientData()
          })
        }
      }
    }, LIMITS.PLAYER_DISCONNECT_TIMEOUT)
  }
  
  // Очищаем rate limiting
  rateLimits.delete(socket.id)
  playerRooms.delete(socket.id)
}

/**
 * Подключение нового клиента
 */
io.on('connection', (socket) => {
  logger.info(`New connection: ${socket.id}`)
  
  // Регистрируем обработчики событий
  socket.on(SOCKET_EVENTS.CREATE_ROOM, (data) => handleCreateRoom(socket, data))
  socket.on(SOCKET_EVENTS.JOIN_ROOM, (data) => handleJoinRoom(socket, data))
  socket.on(SOCKET_EVENTS.START_GAME, (data) => handleStartGame(socket, data))
  socket.on(SOCKET_EVENTS.SELECT_ROLE, (data) => handleSelectRole(socket, data))
  socket.on(SOCKET_EVENTS.REMOVE_ROLE, (data) => handleRemoveRole(socket, data))
  socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data) => handleSendMessage(socket, data))
  socket.on(SOCKET_EVENTS.VOTE_PLAYER, (data) => handleVotePlayer(socket, data))
  socket.on(SOCKET_EVENTS.CHANGE_PHASE, (data) => handleChangePhase(socket, data))
  socket.on(SOCKET_EVENTS.ADMIN_ACTION, (data) => handleAdminAction(socket, data))
  socket.on('disconnect', () => handleDisconnect(socket))
  
  // Отправляем подтверждение подключения
  socket.emit('connected', {
    socketId: socket.id,
    timestamp: Date.now()
  })
})

/**
 * Периодическая очистка пустых комнат
 */
setInterval(() => {
  const emptyRooms = []
  
  for (const [roomId, room] of rooms) {
    if (!room.hasActiveConnections()) {
      emptyRooms.push(roomId)
    }
  }
  
  emptyRooms.forEach(roomId => {
    const room = rooms.get(roomId)
    rooms.delete(roomId)
    room.destroy()
    logger.info(`Cleaned up inactive room: ${roomId}`)
  })
  
  if (emptyRooms.length > 0) {
    logger.info(`Cleaned up ${emptyRooms.length} inactive rooms`)
  }
  
  // Очистка старых rate limits
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  
  for (const [socketId, requests] of rateLimits) {
    const recentRequests = requests.filter(time => now - time < oneHour)
    if (recentRequests.length === 0) {
      rateLimits.delete(socketId)
    } else {
      rateLimits.set(socketId, recentRequests)
    }
  }
  
}, LIMITS.ROOM_CLEANUP_INTERVAL)

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  logger.info('Shutting down server...')
  
  // Уведомляем всех клиентов
  io.emit('server-shutdown', {
    message: 'Сервер перезагружается. Переподключение произойдет автоматически.'
  })
  
  // Закрываем все комнаты
  for (const [roomId, room] of rooms) {
    room.destroy()
  }
  
  // Закрываем сервер
  server.close(() => {
    logger.info('Server shutdown complete')
    process.exit(0)
  })
})

/**
 * Обработка ошибок
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

/**
 * Запуск сервера
 */
server.listen(PORT, () => {
  logger.info(`🚀 Socket server running on port ${PORT}`)
  logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`📡 CORS origin: ${process.env.NODE_ENV === 'production' ? 'https://mafia.waifucards.app' : 'http://localhost:3000'}`)
})

/**
 * Статистика для отладки
 */
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    logger.debug(`Stats: ${rooms.size} rooms, ${io.engine.clientsCount} connections`)
  }, 30000)
}