// server/socket-server.js
import { createServer } from 'http'
import { Server } from 'socket.io'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

import { GameRoom } from './models/GameRoom.js'
import { ChatCommandProcessor } from './services/ChatCommandProcessor.js'
import { SOCKET_EVENTS, ERROR_CODES, LIMITS, GAME_PHASES, MESSAGE_TYPES } from './utils/constants.js'
import { sanitizeHtml } from './utils/gameHelpers.js'
import { getRoleInfo } from './roles/rolesList.js'
import { NecromancerRole } from './roles/village/NecromancerRole.js'
import { createLogger } from './utils/logger.js'

const logger = createLogger('SocketServer')

// Экземпляр роли некроманта
const necromancerRole = new NecromancerRole()

// Функция форматирования результатов ночных действий для чата
const formatNightActionResult = (result, roleId) => {
  const roleInfo = getRoleInfo(roleId)
  const roleName = roleInfo?.name || roleId

  // Провидец - просмотр роли игрока
  if (result.data.targetRole) {
    const targetRoleInfo = getRoleInfo(result.data.targetRole)
    const targetRoleName = targetRoleInfo?.name || result.data.targetRole
    const targetName = result.data.targetName || 'игрок'
    return `🔮 Результат просмотра: ${targetName} имеет роль «${targetRoleName}»`
  }
  
  // Провидец - просмотр центральных карт
  if (result.data.centerCards && result.data.centerCards.length > 0) {
    const cardNames = result.data.centerCards.map(card => {
      const cardInfo = getRoleInfo(card)
      return cardInfo?.name || card
    })
    return `🔮 Центральные карты: ${cardNames.join(', ')}`
  }
  
  // Грабитель - новая роль
  if (result.data.newRole) {
    const newRoleInfo = getRoleInfo(result.data.newRole)
    const newRoleName = newRoleInfo?.name || result.data.newRole
    return `🔄 Ваша новая роль: «${newRoleName}»`
  }
  
  // Миньон/Оборотень - информация о других оборотнях
  if (result.data.werewolves && result.data.werewolves.length > 0) {
    const werewolfList = result.data.werewolves.map(wolf => {
      const wolfRoleInfo = getRoleInfo(wolf.role)
      return `${wolf.name} (${wolfRoleInfo?.name || wolf.role})`
    }).join(', ')
    return `🐺 Оборотни в игре: ${werewolfList}`
  }
  
  // Смутьян - обмен ролей
  if (result.data.swapped) {
    return `🔄 Роли между игроками поменяны местами`
  }
  
  // Охранник - защита
  if (result.data.protected) {
    const protectedPlayer = result.message.match(/защитили (.+)$/)?.[1] || 'игрока'
    return `🛡️ Вы защитили ${protectedPlayer} на эту ночь`
  }
  
  // Голосование оборотней
  if (result.data.voted) {
    return `🐺 Ваш голос учтен`
  }
  
  // Общий результат, если нет специальных данных
  return `✅ ${result.message}`
}

// Функция определения, нужно ли показывать результат в чате
const shouldShowResultInChat = (result, roleId) => {
  // Показываем результаты для информативных действий
  return result.data.targetRole ||           // Провидец - просмотр роли
         result.data.centerCards ||          // Провидец - центральные карты
         result.data.werewolves ||           // Миньон - оборотни
         result.data.newRole ||              // Грабитель - новая роль
         result.data.protected ||            // Охранник - подтверждение защиты
         (result.data.swapped && Array.isArray(result.data.swapped)) // Смутьян - обмен ролей
  
  // НЕ показываем для:
  // - Голосования оборотней (result.data.voted) - это служебное действие
}

const app = express()
const server = createServer(app)

// Trust proxy for production (behind nginx)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// JSON body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Логирование только API запросов к нашим новым эндпоинтам
app.use((req, res, next) => {
  if (req.url.includes('/history') || req.url.includes('/statistics')) {
    console.log(`🌐 ${req.method} ${req.url}`)
  }
  next()
})

// CORS настройки
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://mafia.waifucards.app', 'https://untypical-mafia.vercel.app']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: LIMITS.MESSAGES_PER_MINUTE || 20,
  message: 'Слишком много сообщений, попробуйте позже'
})
app.use('/api', limiter)

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://mafia.waifucards.app', 'https://untypical-mafia.vercel.app']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// Глобальное состояние
const rooms = new Map()
const playerRooms = new Map() // socketId -> roomId
const rateLimitMap = new Map() // Простой rate limiting для сообщений

// Утилиты
const sendError = (socket, code, message) => {
  socket.emit(SOCKET_EVENTS.ERROR, { code, message })
}

const getPlayerRoom = (socketId) => {
  const roomId = playerRooms.get(socketId)
  return roomId ? rooms.get(roomId) : null
}

// Простая функция валидации запросов
const validateRequest = (socket, eventName) => {
  // Базовая валидация - можно расширить при необходимости
  return socket && socket.id
}

const checkMessageRateLimit = (socketId) => {
  const now = Date.now()
  const key = socketId
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, [])
  }
  
  const messages = rateLimitMap.get(key)
  // Удаляем сообщения старше минуты
  const filtered = messages.filter(timestamp => now - timestamp < 60000)
  
  if (filtered.length >= LIMITS.MESSAGES_PER_MINUTE) {
    return false
  }
  
  filtered.push(now)
  rateLimitMap.set(key, filtered)
  return true
}

// === ОСНОВНЫЕ ОБРАБОТЧИКИ ===

const handleJoinRoom = (socket, data) => {
  try {
    const { roomCode, username } = data
    
    if (!roomCode || !username) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, 'Неверные данные')
    }
    
    const room = rooms.get(roomCode)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    // Добавляем игрока
    const player = room.addPlayer(socket.id, sanitizeHtml(username))
    playerRooms.set(socket.id, roomCode)
    room.addSocket(socket.id, socket)
    
    logger.info(`🎮 Player ${username} joined room ${roomCode}`)
    
    // ИСПРАВЛЕНО: Убираем дублирование - используем только getClientData
    const roomData = room.getClientData(socket.id)
    
    console.log(`📊 Socket join-success for ${player.name}`)
    console.log(`📊 Players with roles:`, roomData.players.map(p => `${p.name}: ${p.role} (alive: ${p.alive})`))
    
    socket.emit('join-success', { 
      room: roomData,
      player: player
      // playersStatus больше не нужен - вся информация уже в roomData.players
    })
    
    // Если игрок подключился во время ночной фазы, отправляем информацию о текущем ночном действии
    if (room.gameState === GAME_PHASES.NIGHT && room.gameEngine) {
      const playerRole = player.role
      const nightRoles = room.gameEngine.nightRoles || []
      const currentNightActionIndex = room.gameEngine.nightActionIndex || 0
      
      if (currentNightActionIndex < nightRoles.length) {
        const currentRole = nightRoles[currentNightActionIndex]
        if (currentRole && playerRole === currentRole.id && player.alive) {
          // Отправляем событие о ночном ходе
          socket.emit('night-action-turn', {
            role: currentRole.id,
            timeLimit: 30
          })
          
          // Отправляем информацию о таймере
          const phaseStartTime = room.gameEngine.phaseStartTime || Date.now()
          const endTime = phaseStartTime + (30 * 1000)
          socket.emit('night-action-timer', {
            role: currentRole.id,
            timeLimit: 30,
            endTime: endTime
          })
        }
      }
    }
    
    // Определяем, это новый игрок или переподключение по имени
    const wasReconnection = Array.from(room.players.values())
      .some(p => p.name.toLowerCase() === username.toLowerCase() && p.id !== socket.id)
      
    if (!wasReconnection) {
      // Новый игрок - уведомляем всех
      room.broadcastExcept('player-joined', { 
        player: {
          id: player.id,
          name: player.name,
          isHost: player.isHost,
          connected: true
        }
      }, [socket.id])
    } else {
      // Переподключение - уведомляем об изменении статуса
      room.broadcastExcept('player-reconnected', { 
        playerId: player.id,
        playerName: player.name
      }, [socket.id])
    }
    
    // ВАЖНО: Всегда отправляем актуальный статус подключения всем игрокам
    // чтобы у всех была синхронизированная информация о том, кто онлайн
    setTimeout(() => {
      // Отправляем персонализированную информацию каждому игроку
      room.sockets.forEach((socket, socketId) => {
        const viewer = room.getPlayer(socketId)
        if (viewer) {
          socket.emit('players-status-sync', {
            players: room.getSortedPlayers().map(p => ({
              id: p.id,
              name: p.name,
              connected: p.connected,
              role: room.shouldShowPlayerRole(p, viewer) ? p.role : undefined
            }))
          })
        }
      })
    }, 150) // Увеличиваем задержку для надежности
    
    // Системное сообщение
    // room.addSystemMessage(`${player.name} присоединился к игре`) // Убираем чтобы не засорять чат
    
  } catch (error) {
    logger.error('Join room error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

// ✅ ИСПРАВЛЕННЫЙ ОБРАБОТЧИК СООБЩЕНИЙ
const handleSendMessage = async (socket, data) => {
  try {
    const { text } = data
    
    if (!text || typeof text !== 'string' || !text.trim()) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, 'Пустое сообщение')
    }
    
    // Rate limiting
    if (!checkMessageRateLimit(socket.id)) {
      return sendError(socket, ERROR_CODES.RATE_LIMIT, 'Слишком много сообщений')
    }
    
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    const player = room.getPlayer(socket.id)
    if (!player) {
      return sendError(socket, ERROR_CODES.PLAYER_NOT_FOUND, 'Игрок не найден')
    }
    
    const cleanText = sanitizeHtml(text.trim())
    
    // ✅ ИСПОЛЬЗУЕМ ChatCommandProcessor
    const chatProcessor = new ChatCommandProcessor(room)
    
    if (chatProcessor.isCommand(cleanText)) {
      // Обрабатываем команду
      const result = await chatProcessor.processCommand(socket.id, cleanText)
      
      if (!result.success) {
        return sendError(socket, ERROR_CODES.VALIDATION_ERROR, result.error)
      }
      
      // Команда обработана успешно, ChatCommandProcessor уже отправил сообщения
      return
    }
    
    // ✅ ОБЫЧНОЕ СООБЩЕНИЕ - проверяем права чата
    if (!room.chatPermissions.canChat) {
      return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Чат отключен в этой фазе')
    }
    
    // Проверяем специфичные права для ночи (только оборотни и Ктулху)
    if (room.gameState === GAME_PHASES.NIGHT && room.chatPermissions.werewolfChat) {
      if (!room.isWerewolf(player.role) && player.role !== 'cthulhu') {
        return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Ночью могут говорить только оборотни и Ктулху')
      }
      
      // Дополнительная проверка для Ктулху - только команды /приказ
      if (player.role === 'cthulhu') {
        return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Ктулху может писать только команду /приказ')
      }
    }
    
    // Получаем отправителя
    const sender = room.getPlayer(socket.id)
    if (!sender) return sendError(socket, ERROR_CODES.PLAYER_NOT_FOUND)
    
    // Определяем получателей
    let recipients = []
    
    if (room.gameState === GAME_PHASES.NIGHT && room.chatPermissions.werewolfChat) {
      // Ночью - только оборотни видят сообщения оборотней
      recipients = Array.from(room.players.values())
        .filter(p => room.isWerewolf(p.role) || p.role === 'game_master')
    } else if (room.chatPermissions.canSeeAll) {
      // Обычные фазы - все живые + game_master
      recipients = Array.from(room.players.values())
        .filter(p => p.alive || p.role === 'game_master')
    }
    
    // Создаем базовое сообщение для истории чата
    const baseMessage = {
      id: Date.now(),
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role, // Всегда сохраняем роль в истории
      text: sanitizeHtml(cleanText),
      type: 'public',
      timestamp: Date.now()
    }
    
    // Добавляем в историю чата
    room.chat.push(baseMessage)
    
    // Отправляем персонализированные сообщения получателям
    recipients.forEach(recipient => {
      const socket = room.sockets.get(recipient.id)
      if (socket) {
        try {
          // Создаем персонализированное сообщение для каждого получателя
          const personalizedMessage = {
            ...baseMessage,
            senderRole: room.shouldShowPlayerRole(sender, recipient) ? sender.role : null
          }
          socket.emit(SOCKET_EVENTS.NEW_MESSAGE, { message: personalizedMessage })
        } catch (error) {
          logger.error(`Failed to send message to ${recipient.id}:`, error)
        }
      }
    })
    
    logger.info(`💬 Message from ${player.name} in ${room.id}: ${cleanText.substring(0, 50)}...`)
    
  } catch (error) {
    logger.error('Send message error:', error)
    sendError(socket, ERROR_CODES.SERVER_ERROR, 'Ошибка отправки сообщения')
  }
}

const handleCreateRoom = (socket, data) => {
  console.log(data, 'data', socket.id, 'socket.id');
  try {
    const { username, isPrivate = false, hostAsObserver = false } = data
    
    if (!username) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, 'Укажите имя')
    }
    
    const room = new GameRoom(socket.id, isPrivate, hostAsObserver)
    rooms.set(room.id, room)
    
    // Добавляем создателя как игрока
    const player = room.addPlayer(socket.id, sanitizeHtml(username))
    playerRooms.set(socket.id, room.id)
    room.addSocket(socket.id, socket)
    
    logger.info(`🎮 Room ${room.id} created by ${username}`)
    
    socket.emit(SOCKET_EVENTS.ROOM_CREATED, { 
      room: room.getClientData(socket.id),
      player: player 
    })
    
  } catch (error) {
    logger.error('Create room error:', error)
    sendError(socket, ERROR_CODES.SERVER_ERROR, error.message)
  }
}

const handleStartGame = async (socket, data) => {
  try {
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    const player = room.getPlayer(socket.id)
    if (!player?.isHost) {
      return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Только ведущий может начать игру')
    }
    
    await room.startGame()
    room.broadcast(SOCKET_EVENTS.GAME_STARTED, { room: {} })
    
    logger.info(`🎮 Game started in room ${room.id}`)
    
  } catch (error) {
    logger.error('Start game error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

const handleVote = (socket, data) => {
  try {
    const { targetId } = data
    const room = getPlayerRoom(socket.id)
    
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    if (room.gameState !== GAME_PHASES.VOTING) {
      return sendError(socket, ERROR_CODES.INVALID_ACTION, 'Сейчас не время голосования')
    }
    
    const player = room.getPlayer(socket.id)
    if (!player?.alive) {
      return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Мертвые не голосуют')
    }
    
    if (player.role === 'game_master') {
      return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Ведущий не участвует в голосовании')
    }
    
    room.addVote(socket.id, targetId)
    room.broadcast(SOCKET_EVENTS.VOTE_CAST, { 
      voterId: socket.id,
      targetId: targetId
    })
    
    logger.info(`🗳️ Vote cast in room ${room.id}`)
    
  } catch (error) {
    logger.error('Vote error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

const handleNightAction = async (socket, data) => {
  try {
    const room = getPlayerRoom(socket.id)
    if (!room?.gameEngine) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Игра не найдена')
    }
    
    if (room.gameState !== GAME_PHASES.NIGHT) {
      return sendError(socket, ERROR_CODES.INVALID_ACTION, 'Сейчас не ночь')
    }
    
    const result = await room.gameEngine.executeNightAction(socket.id, data)
    if (result.error) {
      return sendError(socket, ERROR_CODES.INVALID_ACTION, result.error)
    }
    
    // Уведомляем всех об успешном действии
    room.broadcast('night-action-completed', {
      playerId: socket.id,
      result: result
    })
    
  } catch (error) {
    logger.error('Night action error:', error)
    sendError(socket, ERROR_CODES.SERVER_ERROR, error.message)
  }
}

const handleAdminAction = (socket, data) => {
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
        target.alive = false
        room.addSystemMessage(`${target.name} был убит администратором`, MESSAGE_TYPES.SYSTEM)
        // НОВОЕ: Синхронизируем статус после админ убийства
        room.syncPlayersStatus()
        break
      case 'revive':
        target.alive = true
        room.addSystemMessage(`${target.name} был воскрешен администратором`, MESSAGE_TYPES.SYSTEM)
        // НОВОЕ: Синхронизируем статус после админ воскрешения
        room.syncPlayersStatus()
        break
      case 'kick':
        room.removePlayer(targetId)
        room.addSystemMessage(`${target.name} был исключен из игры`, MESSAGE_TYPES.SYSTEM)
        // НОВОЕ: Синхронизируем статус после кика игрока
        room.syncPlayersStatus()
        break
      case 'change-role':
        const { newRole } = data
        if (!newRole) {
          return sendError(socket, ERROR_CODES.VALIDATION_ERROR, 'Не указана новая роль')
        }
        
        const oldRole = target.role
        target.role = newRole
        room.addSystemMessage(`${target.name}: роль изменена с ${oldRole} на ${newRole}`, MESSAGE_TYPES.SYSTEM)
        // НОВОЕ: Синхронизируем статус после смены роли админом
        room.syncPlayersStatus()
        break
      case 'next-phase':
        if (room.gameEngine) {
          room.gameEngine.nextPhase()
        }
        break
    }
    
    // Отправляем специфичное событие вместо полного обновления
    room.broadcast('admin-action-completed', { action, targetId })
    
  } catch (error) {
    logger.error('Admin action error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

const handleResurrectPlayer = async (socket, data) => {
  try {
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }

    const player = room.getPlayer(socket.id)
    if (!player) {
      return sendError(socket, ERROR_CODES.PLAYER_NOT_FOUND, 'Игрок не найден')
    }

    // Проверяем что игрок - некромант
    if (player.role !== 'necromancer') {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, 'Только некромант может воскрешать')
    }

    const { targetId } = data
    if (!targetId) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, 'Не указана цель для воскрешения')
    }

    // Вызываем метод воскрешения роли некроманта
    const result = await necromancerRole.resurrectPlayer(room.gameEngine, socket.id, targetId)
    
    if (result.error) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, result.error)
    }

    // Отправляем обновление комнаты всем игрокам
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, { 
      room: {},  // broadcast method will automatically personalize room data for game-updated events
      message: result.message 
    })

    logger.info(`Player ${player.name} resurrected ${result.data.targetName}`)
    
  } catch (error) {
    logger.error('Resurrect player error:', error)
    sendError(socket, ERROR_CODES.SERVER_ERROR, 'Ошибка при воскрешении')
  }
}

const handleSkipPhase = async (socket, data) => {
  try {
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }

    const player = room.getPlayer(socket.id)
    if (!player) {
      return sendError(socket, ERROR_CODES.PLAYER_NOT_FOUND, 'Игрок не найден')
    }

    const { action } = data // 'vote' или 'unvote'
    
    if (action === 'vote') {
      const shouldSkip = room.addPhaseSkipVote(socket.id)
      
      // Отправляем обновление статуса голосования всем игрокам
      room.broadcast(SOCKET_EVENTS.GAME_UPDATED, { 
        room: {}  // broadcast method will automatically personalize room data for game-updated events
      })

      // Если достигнут порог - пропускаем фазу
      if (shouldSkip) {
        logger.info(`Phase ${room.gameState} skipped by player vote in room ${room.id}`)
        
        // Очищаем голоса за пропуск ПЕРЕД сменой фазы
        room.clearPhaseSkipVotes()
        
        // Отправляем обновление статуса после очистки голосов
        room.broadcast(SOCKET_EVENTS.GAME_UPDATED, { 
          room: {}  // broadcast method will automatically personalize room data for game-updated events
        })
        
        // Используем GameEngine для правильного перехода фазы
        if (room.gameState === GAME_PHASES.INTRODUCTION) {
          // Переход к ночной фазе через GameEngine
          await room.gameEngine.setPhase(GAME_PHASES.NIGHT)
          room.addSystemMessage('Фаза знакомства пропущена голосованием игроков', MESSAGE_TYPES.SYSTEM)
        } else if (room.gameState === GAME_PHASES.DAY) {
          // Переход к голосованию через GameEngine
          await room.gameEngine.setPhase(GAME_PHASES.VOTING)
          room.addSystemMessage('Дневная фаза пропущена голосованием игроков', MESSAGE_TYPES.SYSTEM)
        }
      }
      
    } else if (action === 'unvote') {
      room.removePhaseSkipVote(socket.id)
      
      // Отправляем обновление статуса голосования
      room.broadcast(SOCKET_EVENTS.GAME_UPDATED, { 
        room: {}  // broadcast method will automatically personalize room data for game-updated events
      })
    }
    
  } catch (error) {
    logger.error('Skip phase error:', error)
    sendError(socket, ERROR_CODES.VALIDATION_ERROR, error.message)
  }
}

const handleVoiceActivity = (socket, data) => {
  const room = getPlayerRoom(socket.id)
  if (room) {
    const player = room.getPlayer(socket.id)
    if (player) {
      room.broadcast(SOCKET_EVENTS.VOICE_ACTIVITY, {
        playerId: socket.id,
        playerName: player.name,
        isActive: data.isActive
      })
    }
  }
}

const handleRequestPlayersSync = (socket) => {
  console.log('🔄 Players sync requested by', socket.id)
  const room = getPlayerRoom(socket.id)
  if (room) {
    const viewer = room.getPlayer(socket.id)
    if (viewer) {
      // Отправляем актуальный статус всех игроков запрашивающему клиенту
      socket.emit('players-status-sync', {
        players: room.getSortedPlayers().map(p => ({
          id: p.id,
          name: p.name,
          connected: p.connected,
          role: room.shouldShowPlayerRole(p, viewer) ? p.role : undefined
        }))
      })
      console.log('✅ Players sync sent to', socket.id)
    }
  }
}

const handleDisconnect = (socket) => {
  const room = getPlayerRoom(socket.id)
  if (room) {
    room.removeSocket(socket.id)
    playerRooms.delete(socket.id)
    
    const player = room.getPlayer(socket.id)
    if (player) {
      // room.addSystemMessage(`${player.name} отключился`) // Убираем чтобы не засорять чат
      room.broadcast(SOCKET_EVENTS.PLAYER_DISCONNECTED, { 
        playerId: socket.id,
        playerName: player.name
      })
      
      // Синхронизируем статус подключения после отключения
      setTimeout(() => {
        // Отправляем персонализированную информацию каждому игроку
        room.sockets.forEach((socket, socketId) => {
          const viewer = room.getPlayer(socketId)
          if (viewer) {
            socket.emit('players-status-sync', {
              players: room.getSortedPlayers().map(p => ({
                id: p.id,
                name: p.name,
                connected: p.connected,
                role: room.shouldShowPlayerRole(p, viewer) ? p.role : undefined
              }))
            })
          }
        })
      }, 150)
      
      logger.info(`🔌 Player ${player.name} disconnected from room ${room.id}`)
    }
    
    // Удаляем пустые комнаты
    if (Array.from(room.players.values()).every(p => !p.connected)) {
      rooms.delete(room.id)
      logger.info(`🗑️ Empty room ${room.id} deleted`)
    }
  }
  
  rateLimitMap.delete(socket.id)
}

// === SOCKET.IO СОБЫТИЯ ===

io.on('connection', (socket) => {
  logger.info(`🔌 Client connected: ${socket.id}`)
  
  // Основные события
  socket.on(SOCKET_EVENTS.CREATE_ROOM, (data) => handleCreateRoom(socket, data))
  socket.on(SOCKET_EVENTS.JOIN_ROOM, (data) => handleJoinRoom(socket, data))
  socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data) => handleSendMessage(socket, data))
  socket.on(SOCKET_EVENTS.START_GAME, (data) => handleStartGame(socket, data))
  socket.on(SOCKET_EVENTS.VOTE, (data) => handleVote(socket, data))
  socket.on(SOCKET_EVENTS.NIGHT_ACTION, (data) => handleNightAction(socket, data))
  socket.on(SOCKET_EVENTS.RESURRECT_PLAYER, (data) => handleResurrectPlayer(socket, data))
  socket.on(SOCKET_EVENTS.SKIP_PHASE, (data) => handleSkipPhase(socket, data))
  socket.on(SOCKET_EVENTS.ADMIN_ACTION, (data) => handleAdminAction(socket, data))
  socket.on(SOCKET_EVENTS.VOICE_ACTIVITY, (data) => handleVoiceActivity(socket, data))
  socket.on('request-players-sync', () => handleRequestPlayersSync(socket))
  
  socket.on('disconnect', () => handleDisconnect(socket))
})

// === REST API ===

// Получение списка публичных комнат
app.get('/api/rooms/public', (req, res) => {
  const publicRooms = Array.from(rooms.values())
    .filter(room => !room.isPrivate)
    .map(room => ({
      id: room.id,
      name: `Комната ${room.id}`,
      hostName: room.getPlayer(room.hostId)?.name || 'Неизвестно',
      phase: room.gameState,
      totalPlayers: room.players.size,
      alivePlayers: Array.from(room.players.values()).filter(p => p.alive).length,
      votingRounds: room.votingRounds || 0
    }))
  
  res.json(publicRooms)
})

// Получить историю игры
app.get('/api/rooms/:roomId/history', async (req, res) => {
  const { roomId } = req.params
  const { importance } = req.query // 'critical', 'normal', 'minor'
  const room = rooms.get(roomId)
  
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  // История доступна только после завершения игры
  if (room.gameState !== 'ended') {
    return res.status(400).json({ error: 'История доступна только после завершения игры' })
  }
  
  try {
    const history = room.getGameHistory(importance)
    const formattedHistory = room.getFormattedHistory(importance)
    const playerStats = room.getPlayerStatistics()
    const summary = room.getGameSummary()
    
    res.json({
      history,
      formattedHistory,
      playerStats,
      summary
    })
  } catch (error) {
    logger.error('Get history error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Получить статистику игроков
app.get('/api/rooms/:roomId/statistics', async (req, res) => {
  const { roomId } = req.params
  const room = rooms.get(roomId)
  
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  // Статистика доступна только после завершения игры
  if (room.gameState !== 'ended') {
    return res.status(400).json({ error: 'Статистика доступна только после завершения игры' })
  }
  
  try {
    const playerStats = room.getPlayerStatistics()
    const summary = room.getGameSummary()
    
    res.json({
      playerStats,
      summary
    })
  } catch (error) {
    logger.error('Get statistics error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Получить прогресс ночных действий
app.get('/api/rooms/:roomId/night-progress', async (req, res) => {
  const { roomId } = req.params
  const room = rooms.get(roomId)
  
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  // Прогресс доступен только в ночной фазе
  if (room.gameState !== 'night') {
    return res.status(400).json({ error: 'Прогресс доступен только в ночной фазе' })
  }
  
  try {
    const nightProgress = room.getNightProgress()
    res.json(nightProgress)
  } catch (error) {
    logger.error('Get night progress error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Получение данных конкретной комнаты
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params
  const room = rooms.get(roomId)
  
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  // ИСПРАВЛЕНО: Используем только getClientData(null) для анонимного просмотра
  // Не переопределяем players - доверяем логике getClientData
  const roomData = room.getClientData(null)
  
  
  res.json(roomData)
})

// Получение полного состояния игры (включая ночные действия)
app.get('/api/rooms/:roomId/game-state', (req, res) => {
  const { roomId } = req.params
  const { playerId } = req.query
  
  const room = rooms.get(roomId)
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  try {
    // Базовые данные комнаты
    const gameState = {
      room: room.getClientData(playerId),
      chat: [],
      nightAction: {
        active: false,
        role: null,
        timeLimit: 0,
        endTime: null
      }
    }
    
    // Если игрок указан, добавляем персонализированные данные
    if (playerId) {
      const player = room.getPlayer(playerId)
      if (player) {
        gameState.player = {
          id: player.id,
          name: player.name,
          role: player.role,
          alive: player.alive,
          isHost: player.isHost,
          connected: player.connected
        }
        
        // Добавляем информацию о текущем ночном действии
        if (room.gameState === 'night' && room.gameEngine) {
          const nightRoles = room.gameEngine.nightRoles || []
          const currentNightActionIndex = room.gameEngine.nightActionIndex || 0
          
          if (currentNightActionIndex < nightRoles.length) {
            const currentRole = nightRoles[currentNightActionIndex]
            if (currentRole && player.role === currentRole.id && player.alive) {
              gameState.nightAction = {
                active: true,
                role: currentRole.id,
                timeLimit: 30,
                endTime: (room.gameEngine.phaseStartTime || Date.now()) + (30 * 1000)
              }
            }
          }
        }
      }
    }
    
    res.json(gameState)
    
  } catch (error) {
    logger.error('Get game state error:', error)
    res.status(500).json({ error: 'Ошибка получения состояния игры' })
  }
})

// Присоединение к комнате через HTTP (создание игрока)
app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params
  const { username, socketId } = req.body
  
  if (!username || !socketId) {
    return res.status(400).json({ error: 'Укажите имя пользователя и socketId' })
  }
  
  const room = rooms.get(roomId)
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  try {
    const player = room.addPlayer(socketId, sanitizeHtml(username))
    playerRooms.set(socketId, roomId)
    
    // Пытаемся найти и добавить сокет, если он подключен
    const connectedSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.id === socketId)
    
    if (connectedSocket) {
      room.addSocket(socketId, connectedSocket)
      logger.info(`🔌 Socket ${socketId} registered to room ${roomId}`)
    }
    
    logger.info(`🎮 Player ${username} joined room ${roomId} via HTTP`)
    
    // Определяем, это новый игрок или переподключение
    const wasReconnection = Array.from(room.players.values())
      .some(p => p.name.toLowerCase() === username.toLowerCase() && p.id !== socketId)
      
    if (!wasReconnection) {
      // Новый игрок - уведомляем всех
      room.broadcast('player-joined', { 
        player: {
          id: player.id,
          name: player.name,
          isHost: player.isHost,
          connected: true
        }
      })
    } else {
      // Переподключение - уведомляем об изменении статуса
      room.broadcast('player-reconnected', { 
        playerId: player.id,
        playerName: player.name
      })
    }
    
    // Синхронизируем статус подключения всех игроков
    setTimeout(() => {
      // Отправляем персонализированную информацию каждому игроку
      room.sockets.forEach((socket, socketId) => {
        const viewer = room.getPlayer(socketId)
        if (viewer) {
          socket.emit('players-status-sync', {
            players: room.getSortedPlayers().map(p => ({
              id: p.id,
              name: p.name,
              connected: p.connected,
              role: room.shouldShowPlayerRole(p, viewer) ? p.role : undefined
            }))
          })
        }
      })
    }, 150)
    // room.addSystemMessage(`${player.name} присоединился к игре`) // Убираем чтобы не засорять чат
    
    // ИСПРАВЛЕНО: Убираем дублирование - используем только getClientData
    const roomData = room.getClientData(socketId)
    
    
    res.json({
      room: roomData,
      player: player,
      // playersStatus больше не нужен - вся информация уже в room.players
    })
    
  } catch (error) {
    logger.error('Join room HTTP error:', error)
    res.status(400).json({ error: error.message })
  }
})

// Получение истории чата комнаты
app.get('/api/rooms/:roomId/chat', (req, res) => {
  const { roomId } = req.params
  const { playerId } = req.query
  
  const room = rooms.get(roomId)
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  const player = playerId ? room.getPlayer(playerId) : null
  
  // Фильтруем сообщения на основе прав доступа
  const visibleMessages = room.chat.filter(message => {
    // Системные сообщения и публичные видят все
    if (message.type === 'system' || message.type === 'public') {
      // Но в ночной фазе с werewolfChat только оборотни видят сообщения оборотней
      if (room.gameState === 'night' && room.chatPermissions.werewolfChat && message.type === 'public') {
        const messageSender = room.getPlayer(message.senderId)
        if (messageSender && room.isWerewolf(messageSender.role)) {
          // Сообщение от оборотня - показываем только оборотням и game_master
          return player && (room.isWerewolf(player.role) || player.role === 'game_master')
        }
      }
      return true
    }
    
    // Приватные сообщения (шепот)
    if (message.type === 'whisper') {
      if (!player) return false
      
      // game_master видит все личные сообщения
      if (player.role === 'game_master') return true
      
      // Проверяем по именам игроков (более надежно чем по ID)
      const isSender = message.senderName === player.name
      const isRecipient = message.recipientName === player.name
      
      console.log(`🔍 Whisper filter: message from ${message.senderName} to ${message.recipientName}, checking for player ${player.name}, sender=${isSender}, recipient=${isRecipient}`)
      
      return isSender || isRecipient
    }
    
    return true
  }).map(message => {
    // Добавляем информацию для корректного отображения
    const enrichedMessage = { ...message }
    
    // Маркируем собственные сообщения по имени игрока (более надежно чем ID)
    if (player && message.senderName === player.name && message.senderId !== 'system') {
      enrichedMessage.isOwn = true
      console.log(`🔧 Marking message as own: "${message.text.substring(0, 30)}" from ${message.senderName}`)
    }
    
    // Всегда указываем роль отправителя (если она не указана в истории)
    if (message.senderId !== 'system' && !enrichedMessage.senderRole) {
      const messageSender = room.getPlayer(message.senderId)
      if (messageSender) {
        enrichedMessage.senderRole = messageSender.role
      }
    }
    
    return enrichedMessage
  })
  
  res.json({ 
    messages: visibleMessages,
    playerId: playerId,
    playerName: player?.name
  })
})

// Получение информации о ролях в комнате
app.get('/api/rooms/:roomId/roles', async (req, res) => {
  const { roomId } = req.params
  const room = rooms.get(roomId)
  
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  try {
    const { getAllRoles } = await import('../utils/gameHelpers.js')
    const allRoles = getAllRoles()
    
    const selectedRoleData = room.selectedRoles.map(roleId => {
      const roleInfo = allRoles[roleId]
      return {
        id: roleId,
        name: roleInfo?.name || roleId,
        description: roleInfo?.description || 'Описание отсутствует',
        team: roleInfo?.team || 'unknown',
        hasNightAction: roleInfo?.hasNightAction || false,
        nightOrder: roleInfo?.nightOrder || 999,
        implemented: roleInfo?.implemented || false,
        phaseHints: roleInfo?.phaseHints || {},
        image: `/roles/${roleId}.webp` // Путь к изображению роли
      }
    }).sort((a, b) => {
      // Сортируем по команде, затем по порядку ночи
      const teamOrder = { village: 1, werewolf: 2, special: 3, cthulhu: 4, tanner: 5 }
      if (a.team !== b.team) {
        return (teamOrder[a.team] || 999) - (teamOrder[b.team] || 999)
      }
      return a.nightOrder - b.nightOrder
    })
    
    res.json({
      success: true,
      roles: selectedRoleData,
      totalRoles: selectedRoleData.length,
      centerCards: room.centerCards?.length || 0
    })
    
  } catch (error) {
    logger.error('Get roles error:', error)
    res.status(500).json({ error: 'Ошибка получения ролей' })
  }
})

// Управление ролями в комнате
app.post('/api/rooms/:roomId/roles', (req, res) => {
  const { roomId } = req.params
  const { roleId, action, playerId } = req.body
  
  if (!roleId || !action || !playerId) {
    return res.status(400).json({ error: 'Укажите roleId, action и playerId' })
  }
  
  const room = rooms.get(roomId)
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  const player = room.getPlayer(playerId)
  if (!player || !player.isHost) {
    return res.status(403).json({ error: 'Только ведущий может управлять ролями' })
  }
  
  if (room.gameState !== 'setup') {
    return res.status(400).json({ error: 'Роли можно изменять только в фазе настройки' })
  }
  
  try {
    if (action === 'add') {
      room.addRole(roleId)
      logger.info(`🎭 Role ${roleId} added to room ${roomId} by ${player.name}`)
    } else if (action === 'remove') {
      room.removeRole(roleId)
      logger.info(`🎭 Role ${roleId} removed from room ${roomId} by ${player.name}`)
    } else {
      return res.status(400).json({ error: 'Неверное действие. Используйте add или remove' })
    }
    
    // Уведомляем об изменении ролей более легким событием
    room.broadcast('roles-updated', { 
      selectedRoles: room.selectedRoles,
      action,
      roleId 
    })
    
    res.json({
      success: true,
      selectedRoles: room.selectedRoles,
      room: room.getClientData(playerId)
    })
    
  } catch (error) {
    logger.error('Role management error:', error)
    res.status(400).json({ error: error.message })
  }
})

// Управление режимом голосования
app.post('/api/rooms/:roomId/voting-mode', (req, res) => {
  const { roomId } = req.params
  const { votingMode, playerId } = req.body
  
  if (!votingMode || !playerId) {
    return res.status(400).json({ error: 'Укажите votingMode и playerId' })
  }
  
  const room = rooms.get(roomId)
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  const player = room.getPlayer(playerId)
  if (!player || !player.isHost) {
    return res.status(403).json({ error: 'Только ведущий может изменять режим голосования' })
  }
  
  if (room.gameState !== 'setup') {
    return res.status(400).json({ error: 'Режим голосования можно изменять только в фазе настройки' })
  }
  
  try {
    room.setVotingMode(votingMode)
    logger.info(`🗳️ Voting mode changed to ${votingMode} in room ${roomId} by ${player.name}`)
    
    // Уведомляем об изменении режима голосования
    room.broadcast('voting-mode-updated', { 
      votingMode: room.votingMode
    })
    
    res.json({
      success: true,
      votingMode: room.votingMode,
      room: room.getClientData(playerId)
    })
    
  } catch (error) {
    logger.error('Voting mode management error:', error)
    res.status(400).json({ error: error.message })
  }
})

// Управление фазами игры
app.put('/api/rooms/:roomId/phase', async (req, res) => {
  const { roomId } = req.params
  const { action, playerId } = req.body
  
  if (!action || !playerId) {
    return res.status(400).json({ error: 'Укажите action и playerId' })
  }
  
  const room = rooms.get(roomId)
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  const player = room.getPlayer(playerId)
  if (!player || (!player.isHost && player.role !== 'game_master')) {
    return res.status(403).json({ error: 'Только ведущий или game_master может управлять фазами' })
  }
  
  try {
    let result = { success: true }
    
    switch (action) {
      case 'next-phase':
        if (room.gameEngine) {
          room.gameEngine.nextPhase()
          result.message = 'Переход к следующей фазе'
        } else {
          return res.status(400).json({ error: 'Игра не начата' })
        }
        break
        
      case 'start-game':
        if (room.gameState !== 'setup') {
          return res.status(400).json({ error: 'Игра уже началась или завершена' })
        }
        await room.startGame()
        result.message = 'Игра началась'
        break
        
      case 'force-vote':
        if (room.gameState !== 'voting') {
          return res.status(400).json({ error: 'Сейчас не фаза голосования' })
        }
        if (room.gameEngine) {
          room.gameEngine.forceEndVoting()
          result.message = 'Голосование завершено принудительно'
        }
        break
        
      case 'extend-phase':
        if (room.gameEngine) {
          const extensionResult = room.gameEngine.extendPhase(1)
          result = { ...result, ...extensionResult }
        } else {
          return res.status(400).json({ error: 'Игра не начата' })
        }
        break
        
      default:
        return res.status(400).json({ error: 'Неверное действие' })
    }
    
    logger.info(`🎮 Phase action '${action}' by ${player.name} in room ${roomId}`)
    
    // Уведомляем о действии с фазой без отправки полного состояния
    room.broadcast('phase-action-completed', { 
      action,
      result: result.message,
      newPhase: room.gameState
    })
    
    res.json({
      ...result,
      room: room.getClientData(playerId)
    })
    
  } catch (error) {
    logger.error('Phase management error:', error)
    res.status(400).json({ error: error.message })
  }
})

// Ночные действия
app.post('/api/rooms/:roomId/night-action', async (req, res) => {
  const { roomId } = req.params
  const { playerId, action } = req.body
  
  if (!playerId || action === undefined || action === null) {
    return res.status(400).json({ error: 'Укажите playerId и action' })
  }
  
  const room = rooms.get(roomId)
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  if (!room.gameEngine) {
    return res.status(400).json({ error: 'Игра не найдена' })
  }
  
  if (room.gameState !== GAME_PHASES.NIGHT) {
    return res.status(400).json({ error: 'Сейчас не ночь' })
  }
  
  const player = room.getPlayer(playerId)
  if (!player) {
    return res.status(404).json({ error: 'Игрок не найден' })
  }
  
  try {
    // Преобразуем targetName в targetId для обратной совместимости
    if (action.targetName && !action.targetId) {
      const targetPlayer = Array.from(room.players.values()).find(p => p.name === action.targetName)
      if (targetPlayer) {
        action.targetId = targetPlayer.id
      } else {
        return res.status(400).json({ error: 'Игрок с таким именем не найден' })
      }
    }
    
    // Аналогично для двух целей (смутьян)
    if (action.target1Name && !action.target1Id) {
      const target1 = Array.from(room.players.values()).find(p => p.name === action.target1Name)
      if (target1) {
        action.target1Id = target1.id
      } else {
        return res.status(400).json({ error: 'Первый игрок не найден' })
      }
    }
    
    if (action.target2Name && !action.target2Id) {
      const target2 = Array.from(room.players.values()).find(p => p.name === action.target2Name)
      if (target2) {
        action.target2Id = target2.id
      } else {
        return res.status(400).json({ error: 'Второй игрок не найден' })
      }
    }

    const result = await room.gameEngine.executeNightAction(playerId, action)
    
    if (result.error) {
      return res.status(400).json({ error: result.error })
    }
    
    logger.info(`🌙 Night action by ${player.name} (${player.role}) in room ${roomId}:`, action)
    
    // Добавляем результат в пул отложенных сообщений (только для информативных действий)
    if (result.message && result.data && shouldShowResultInChat(result, player.role)) {
      const systemMessage = formatNightActionResult(result, player.role)
      room.gameEngine.addPendingMessage(playerId, systemMessage)
    }
    
    // Уведомляем остальных о том, что действие выполнено (без деталей)
    room.broadcastExcept('night-action-completed', {
      playerId: playerId,
      roleCompleted: true
    }, [playerId]) // Исключаем самого игрока из broadcast
    
    res.json({
      success: true,
      result: result,
      message: 'Ночное действие выполнено'
    })
    
  } catch (error) {
    logger.error('Night action API error:', error)
    res.status(500).json({ error: error.message })
  }
})

console.log('📍 Reset endpoint is being registered...')

// Сброс комнаты (новая игра)
app.post('/api/rooms/:roomId/reset', async (req, res) => {
  const { roomId } = req.params
  const room = rooms.get(roomId)
  
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  try {
    // Сбрасываем состояние комнаты
    room.resetGame()
    
    // Уведомляем всех клиентов о сбросе
    room.broadcast('room-reset', {
      message: 'Игра сброшена, начинается новая игра'
    })
    
    // Отправляем обновленное состояние комнаты всем клиентам
    room.broadcast('game-updated', {
      reason: 'room-reset',
      room: room.getClientData()
    })
    
    res.json({
      success: true,
      message: 'Комната успешно сброшена'
    })
    
  } catch (error) {
    logger.error('Room reset error:', error)
    res.status(500).json({ error: error.message })
  }
})




// Покинуть комнату
app.post('/api/rooms/:roomId/leave', async (req, res) => {
  const { roomId } = req.params
  const { playerId } = req.body
  
  if (!playerId) {
    return res.status(400).json({ error: 'Укажите playerId' })
  }
  
  const room = rooms.get(roomId)
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  try {
    const player = room.getPlayer(playerId)
    if (!player) {
      return res.status(404).json({ error: 'Игрок не найден' })
    }
    
    // Если это ведущий - удаляем комнату
    if (room.hostId === playerId) {
      room.broadcast('room-deleted', {
        message: 'Ведущий покинул игру, комната удалена'
      })
      rooms.delete(roomId)
      
      return res.json({
        success: true,
        message: 'Комната удалена'
      })
    }
    
    // Удаляем игрока из комнаты
    room.removePlayer(playerId)
    
    // Уведомляем остальных игроков
    room.broadcast('player-left', {
      playerId: playerId,
      playerName: player.name,
      message: `${player.name} покинул игру`
    })
    
    res.json({
      success: true,
      message: 'Успешно покинули комнату'
    })
    
  } catch (error) {
    logger.error('Leave room error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Удалить комнату
app.delete('/api/rooms/:roomId', async (req, res) => {
  const { roomId } = req.params
  const room = rooms.get(roomId)
  
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  try {
    // Уведомляем всех игроков об удалении
    room.broadcast('room-deleted', {
      message: 'Комната была удалена'
    })
    
    // Удаляем комнату
    rooms.delete(roomId)
    
    res.json({
      success: true,
      message: 'Комната успешно удалена'
    })
    
  } catch (error) {
    logger.error('Delete room error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Запуск сервера
const PORT = process.env.SOCKET_PORT || 3001

server.listen(PORT, () => {
  logger.info(`🚀 Socket server running on port ${PORT}`)
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('🛑 Shutting down socket server...')
  server.close(() => {
    logger.info('✅ Socket server closed')
    process.exit(0)
  })
})

// ✅ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ПУБЛИЧНЫХ КОМНАТ (для команды чата)
export function getPublicRooms() {
  return Array.from(rooms.values())
    .filter(room => !room.isPrivate)
    .map(room => ({
      id: room.id,
      name: `Комната ${room.id}`,
      hostName: room.getPlayer(room.hostId)?.name || 'Неизвестно',
      phase: room.gameState,
      totalPlayers: room.players.size,
      alivePlayers: Array.from(room.players.values()).filter(p => p.alive).length,
      daysSurvived: room.daysSurvived || 0,
      votingRounds: room.votingRounds || 0
    }))
}

export { io, rooms }