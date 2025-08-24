/**
 * Главный сокет сервер с полной игровой логикой
 */

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { GameRoom } from './models/GameRoom.js'
import { SimpleChatProcessor } from './services/SimpleChatProcessor.js'
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
  info: (...args) => console.log(`🎮 [SocketServer]`, ...args),
  warn: (...args) => console.warn(`⚠️ [SocketServer]`, ...args),
  error: (...args) => console.error(`❌ [SocketServer]`, ...args)
}

// Хранилища
const rooms = new Map()
const playerRooms = new Map()
const rateLimits = new Map()
const chatProcessor = new SimpleChatProcessor()

const PORT = process.env.SOCKET_PORT || 3001

const validateRequest = (socket, eventName) => {
  const socketId = socket.id
  if (!rateLimits.has(socketId)) {
    rateLimits.set(socketId, [])
  }
  
  const requests = rateLimits.get(socketId)
  const now = Date.now()
  const oneMinute = 60 * 1000
  
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

const getPlayerRoom = (socketId) => {
  const roomId = playerRooms.get(socketId)
  return roomId ? rooms.get(roomId) : null
}

const sendError = (socket, code, message, details = null) => {
  socket.emit(SOCKET_EVENTS.ERROR, {
    code,
    message,
    details,
    timestamp: Date.now()
  })
}

const handleCreateRoom = (socket, data) => {
  if (!validateRequest(socket, 'create-room')) return
  
  try {
    const { username, isPrivate = false, hostAsObserver = false } = data
    
    const usernameValidation = validateUsername(username)
    if (!usernameValidation.valid) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, usernameValidation.error)
    }
    
    const room = new GameRoom(socket.id, isPrivate, hostAsObserver)
    rooms.set(room.id, room)
    
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

const handleJoinRoom = (socket, data) => {
  if (!validateRequest(socket, 'join-room')) return
  
  try {
    const { roomCode, username } = data
    
    const codeValidation = validateRoomCode(roomCode)
    if (!codeValidation.valid) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, codeValidation.error)
    }
    
    const usernameValidation = validateUsername(username)
    if (!usernameValidation.valid) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, usernameValidation.error)
    }
    
    const room = rooms.get(codeValidation.code)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    const player = room.addPlayer(socket.id, usernameValidation.username)
    room.addSocket(socket.id, socket)
    playerRooms.set(socket.id, room.id)
    
    logger.info(`${player.name} joined room ${room.id}`)
    
    socket.emit(SOCKET_EVENTS.JOIN_SUCCESS, {
      room: room.getClientData(socket.id),
      player
    })
    
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, {
      room: {}
    })
    
  } catch (error) {
    logger.error('Join room error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

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
    
    room.startGame()
    
    logger.info(`Game started in room ${room.id}`)
    
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, {
      room: {}
    })
    
  } catch (error) {
    logger.error('Start game error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

const handleSelectRole = (socket, data) => {
  if (!validateRequest(socket, 'select-role')) return
  
  try {
    const { roleId, action } = data // action: 'add' or 'remove'
    
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    const player = room.getPlayer(socket.id)
    if (!player || !player.isHost) {
      return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Только хост может выбирать роли')
    }
    
    if (action === 'add') {
      room.addRole(roleId)
    } else if (action === 'remove') {
      room.removeRole(roleId)
    }
    
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, {
      room: {}
    })
    
  } catch (error) {
    logger.error('Select role error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

const handleSendMessage = async (socket, data) => {
  if (!validateRequest(socket, 'send-message')) return
  
  try {
    const { text } = data
    
    const messageValidation = validateMessage(text)
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
    
    // Обрабатываем команды чата
    if (chatProcessor.isCommand(text)) {
      const result = await chatProcessor.processCommand(socket.id, text, room)
      
      if (!result.success && result.error) {
        return sendError(socket, ERROR_CODES.VALIDATION_ERROR, result.error)
      }
      
      return // Команды не отображаются в общем чате
    }
    
    // Проверяем права на отправку обычных сообщений
    if (!room.chatPermissions.canChat && room.gameState !== GAME_PHASES.SETUP) {
      if (room.gameState === GAME_PHASES.NIGHT && room.chatPermissions.werewolfChat) {
        if (!room.isWerewolf(player.role)) {
          return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'В ночную фазу могут писать только оборотни')
        }
      } else if (room.gameState === GAME_PHASES.VOTING) {
        return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Во время голосования чат отключен. Используйте /ш ведущий для связи')
      } else {
        return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Сейчас нельзя писать в чат')
      }
    }
    
    // Обычное сообщение
    room.addMessage(socket.id, messageValidation.text)
    
  } catch (error) {
    logger.error('Send message error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

const handleNightAction = async (socket, data) => {
  if (!validateRequest(socket, 'night-action')) return
  
  try {
    const room = getPlayerRoom(socket.id)
    if (!room || !room.gameEngine) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Игра не найдена')
    }
    
    if (room.gameState !== GAME_PHASES.NIGHT) {
      return sendError(socket, ERROR_CODES.INVALID_ACTION, 'Сейчас не ночная фаза')
    }
    
    const result = await room.gameEngine.executeNightAction(socket.id, data)
    
    if (result.error) {
      return sendError(socket, ERROR_CODES.INVALID_ACTION, result.error)
    }
    
    socket.emit('night-action-result', result)
    
  } catch (error) {
    logger.error('Night action error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

const handleVotePlayer = (socket, data) => {
  if (!validateRequest(socket, 'vote-player')) return
  
  try {
    const { targetId } = data
    
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    if (room.gameState !== GAME_PHASES.VOTING) {
      return sendError(socket, ERROR_CODES.INVALID_ACTION, 'Сейчас не фаза голосования')
    }
    
    room.votePlayer(socket.id, targetId)
    
    socket.emit('vote-confirmed', { targetId })
    
  } catch (error) {
    logger.error('Vote error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

const handleAdminAction = (socket, data) => {
  if (!validateRequest(socket, 'admin-action')) return
  
  try {
    const { action, targetId } = data
    
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    const player = room.getPlayer(socket.id)
    if (!player || (player.role !== 'game_master' && !player.isHost)) {
      return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Недостаточно прав')
    }
    
    const target = room.getPlayer(targetId)
    if (!target) {
      return sendError(socket, ERROR_CODES.PLAYER_NOT_FOUND, 'Игрок не найден')
    }
    
    switch (action) {
      case 'kill':
        if (room.gameEngine) {
          room.gameEngine.killPlayer(targetId)
          room.addSystemMessage(`${target.name} был убит администратором`)
        }
        break
      case 'revive':
        target.alive = true
        room.addSystemMessage(`${target.name} был воскрешен администратором`)
        break
      case 'kick':
        room.removePlayer(targetId)
        room.addSystemMessage(`${target.name} был исключен из игры`)
        break
      case 'next-phase':
        if (room.gameEngine) {
          room.gameEngine.nextPhase()
        }
        break
    }
    
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, { room: {} })
    
  } catch (error) {
    logger.error('Admin action error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

const handleVoiceActivity = (socket, data) => {
  const room = getPlayerRoom(socket.id)
  if (room) {
    const player = room.getPlayer(socket.id)
    if (player) {
      room.broadcast('voice-activity', {
        playerId: socket.id,
        playerName: player.name,
        isActive: data.isActive
      })
    }
  }
}

const handleDisconnect = (socket, reason) => {
  logger.info(`Player disconnected: ${socket.id}, reason: ${reason}`)
  
  const room = getPlayerRoom(socket.id)
  if (room) {
    room.removeSocket(socket.id)
    
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, { room: {} })
  }
  
  playerRooms.delete(socket.id)
  rateLimits.delete(socket.id)
}

// Socket.IO обработчики событий
io.on('connection', (socket) => {
  logger.info(`New connection: ${socket.id}`)
  
  socket.on(SOCKET_EVENTS.CREATE_ROOM, (data) => handleCreateRoom(socket, data))
  socket.on(SOCKET_EVENTS.JOIN_ROOM, (data) => handleJoinRoom(socket, data))
  socket.on(SOCKET_EVENTS.START_GAME, (data) => handleStartGame(socket, data))
  socket.on(SOCKET_EVENTS.SELECT_ROLE, (data) => handleSelectRole(socket, data))
  socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data) => handleSendMessage(socket, data))
  socket.on(SOCKET_EVENTS.NIGHT_ACTION, (data) => handleNightAction(socket, data))
  socket.on(SOCKET_EVENTS.VOTE_PLAYER, (data) => handleVotePlayer(socket, data))
  socket.on(SOCKET_EVENTS.ADMIN_ACTION, (data) => handleAdminAction(socket, data))
  socket.on(SOCKET_EVENTS.VOICE_ACTIVITY, (data) => handleVoiceActivity(socket, data))
  
  socket.on('disconnect', (reason) => handleDisconnect(socket, reason))
})

// Очистка неактивных комнат каждые 30 минут
setInterval(() => {
  const now = Date.now()
  const thirtyMinutes = 30 * 60 * 1000
  
  for (const [roomId, room] of rooms) {
    const hasActivePlayers = Array.from(room.players.values()).some(p => p.connected)
    const isOld = now - room.createdAt > thirtyMinutes
    
    if (!hasActivePlayers && isOld) {
      logger.info(`Cleaning up empty room: ${roomId}`)
      room.destroy()
      rooms.delete(roomId)
    }
  }
}, 30 * 60 * 1000)

server.listen(PORT, () => {
  logger.info(`Socket server running on port ${PORT}`)
})

export { io, rooms }