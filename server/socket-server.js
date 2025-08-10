import { Server } from 'socket.io'
import http from 'http'
import { v4 as uuidv4 } from 'uuid'

const server = http.createServer()
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// Define roles for validation
const roles = {
  villager: true,
  sentinel: true,
  apprentice_seer: true,
  paranormal_investigator: true,
  witch: true,
  village_idiot: true,
  revealer: true,
  curator: true,
  bodyguard: true,
  seer: true,
  robber: true,
  troublemaker: true,
  drunk: true,
  insomniac: true,
  hunter: true,
  werewolf: true,
  alpha_wolf: true,
  mystic_wolf: true,
  dream_wolf: true,
  minion: true,
  tanner: true,
  doppelganger: true,
  game_master: true
}

// Game rooms storage
const gameRooms = new Map()

class GameRoom {
  constructor(id, hostId) {
    this.id = id
    this.hostId = hostId
    this.players = new Map()
    this.selectedRoles = []
    this.gameState = 'setup' // setup, night, day, voting, ended
    this.currentPhase = null
    this.timer = null // Timer in seconds
    this.gameData = {
      centerCards: [],
      artifacts: [],
      shields: []
    }
    this.chat = []
    this.votes = new Map() // Хранение голосов: voterId -> targetId (null = воздержался)
  }

  addPlayer(socketId, name) {
    const player = {
      id: socketId,
      name: name,
      role: null,
      alive: true,
      protected: false,
      artifact: null,
      votes: 0,
      connected: true
    }
    
    // If this is the host, assign game_master role
    if (socketId === this.hostId) {
      player.role = 'game_master'
    }
    
    this.players.set(socketId, player)
  }

  removePlayer(socketId) {
    this.players.delete(socketId)
    this.votes.delete(socketId) // Удаляем голос при отключении
  }

  isHost(socketId) {
    return this.hostId === socketId
  }

  // БЕЗОПАСНАЯ версия getGameData - скрывает роли от обычных игроков
  getGameData(requestingSocketId = null) {
    const isHostRequesting = this.isHost(requestingSocketId)
    const gameEnded = this.gameState === 'ended'
    
    // Базовые данные игры
    const baseData = {
      id: this.id,
      hostId: this.hostId,
      selectedRoles: this.selectedRoles,
      gameState: this.gameState,
      currentPhase: this.currentPhase,
      timer: this.timer,
      gameData: this.gameData,
      chat: this.chat
    }
    
    // Безопасная версия игроков - ИСКЛЮЧАЕМ ВЕДУЩЕГО ИЗ СПИСКА для обычных игроков
    const allPlayers = Array.from(this.players.values())
    let playersToShow = allPlayers
    
    // Если запрос НЕ от ведущего, исключаем ведущего из списка
    if (!isHostRequesting) {
      playersToShow = allPlayers.filter(player => player.role !== 'game_master')
    }
    
    const safePlayers = playersToShow.map(player => {
      const requestingPlayer = this.players.get(requestingSocketId)
      
      // Показываем роль если:
      // 1. Это ведущий
      // 2. Игра закончена
      // 3. Это сам игрок
      // 4. Это оборотень и показываем роли других оборотней
      let shouldShowRole = false
      
      if (isHostRequesting || gameEnded) {
        shouldShowRole = true
      } else if (requestingSocketId === player.id) {
        shouldShowRole = true
      } else if (requestingPlayer && this.canSeeWerewolfRoles(requestingPlayer.role)) {
        shouldShowRole = this.isWerewolfRole(player.role)
      }
      
      return {
        id: player.id,
        name: player.name,
        role: shouldShowRole ? player.role : null,
        alive: player.alive,
        protected: player.protected,
        artifact: player.artifact,
        votes: player.votes,
        connected: player.connected
      }
    })
    
    // Добавляем информацию о голосовании
    const votingData = {
      totalVoters: this.getEligibleVoters().length,
      votesSubmitted: this.votes.size,
      hasVoted: this.votes.has(requestingSocketId),
      votedFor: this.votes.get(requestingSocketId) || null
    }
    
    return {
      ...baseData,
      players: safePlayers,
      voting: votingData
    }
  }

  // Получить игроков, которые могут голосовать (живые, не ведущий)
  getEligibleVoters() {
    return Array.from(this.players.values()).filter(p => 
      p.role !== 'game_master' && p.alive && p.connected
    )
  }

  // Получить игроков, за которых можно голосовать (живые, не ведущий)
  getEligibleTargets() {
    return Array.from(this.players.values()).filter(p => 
      p.role !== 'game_master' && p.alive
    )
  }

  // Проверяет, может ли роль видеть роли оборотней
  canSeeWerewolfRoles(role) {
    return role && (
      role.includes('wolf') || 
      role === 'werewolf' || 
      role === 'minion' ||
      role === 'game_master'
    )
  }

  // Проверяет, является ли роль ролью оборотня
  isWerewolfRole(role) {
    return role && (
      role.includes('wolf') || 
      role === 'werewolf' || 
      role === 'minion'
    )
  }

  addChatMessage(playerId, message, type = 'player') {
    const player = playerId ? this.players.get(playerId) : null
    this.chat.push({
      id: uuidv4(),
      playerId: playerId,
      playerName: player ? player.name : (type === 'system' ? 'Система' : 'Ведущий'),
      message,
      type,
      timestamp: Date.now()
    })
  }

  distributeRoles() {
    const allPlayers = Array.from(this.players.values())
    const nonHostPlayers = allPlayers.filter(player => player.id !== this.hostId)
    const shuffledRoles = [...this.selectedRoles].sort(() => Math.random() - 0.5)
    
    console.log(`Distributing roles to ${nonHostPlayers.length} players (excluding host)`)
    console.log(`Available roles:`, shuffledRoles)
    
    // Distribute roles only to non-host players
    nonHostPlayers.forEach((player, index) => {
      if (index < shuffledRoles.length) {
        player.role = shuffledRoles[index]
        console.log(`Player ${player.name} got role: ${player.role}`)
      }
    })

    // Put remaining cards in center
    this.gameData.centerCards = shuffledRoles.slice(nonHostPlayers.length)
    console.log(`Center cards:`, this.gameData.centerCards)
    
    // Ensure host has the game_master role
    const hostPlayer = this.players.get(this.hostId)
    if (hostPlayer) {
      hostPlayer.role = 'game_master'
      console.log(`Host ${hostPlayer.name} has role: game_master`)
    }
  }

  // Подсчет голосов и определение результата
  processVoting() {
    // Сбрасываем счетчики голосов
    this.players.forEach(player => {
      player.votes = 0
    })

    // Подсчитываем голоса
    const voteCounts = new Map()
    let abstainCount = 0

    this.votes.forEach((targetId, voterId) => {
      if (targetId === null) {
        // Воздержался
        abstainCount++
      } else {
        // Проголосовал за игрока
        const currentCount = voteCounts.get(targetId) || 0
        voteCounts.set(targetId, currentCount + 1)
      }
    })

    // Обновляем счетчики на игроках для отображения
    voteCounts.forEach((count, playerId) => {
      const player = this.players.get(playerId)
      if (player) {
        player.votes = count
      }
    })

    const totalVoters = this.getEligibleVoters().length
    const majority = Math.ceil(totalVoters / 2) // Больше половины

    console.log(`Voting results:`)
    console.log(`Total voters: ${totalVoters}, Majority needed: ${majority}`)
    console.log(`Abstain count: ${abstainCount}`)
    console.log(`Vote counts:`, Array.from(voteCounts.entries()))

    // Формируем сообщение о результатах голосования в чат
    let votingMessage = `🗳️ **Результаты голосования:**\n`
    
    if (voteCounts.size === 0 && abstainCount === totalVoters) {
      votingMessage += `Все игроки воздержались от голосования.`
    } else {
      // Список голосов за каждого игрока
      const voteResults = []
      voteCounts.forEach((count, playerId) => {
        const player = this.players.get(playerId)
        if (player && count > 0) {
          voteResults.push(`${player.name}: ${count} голос${count === 1 ? '' : count < 5 ? 'а' : 'ов'}`)
        }
      })
      
      if (voteResults.length > 0) {
        votingMessage += voteResults.join(', ')
      }
      
      if (abstainCount > 0) {
        votingMessage += `${voteResults.length > 0 ? ', ' : ''}Воздержались: ${abstainCount}`
      }
    }

    // Находим максимальное количество голосов
    let maxVotes = 0
    let playersWithMaxVotes = []

    for (const [playerId, voteCount] of voteCounts) {
      if (voteCount > maxVotes) {
        maxVotes = voteCount
        playersWithMaxVotes = [playerId]
      } else if (voteCount === maxVotes && voteCount > 0) {
        playersWithMaxVotes.push(playerId)
      }
    }

    console.log(`Max votes: ${maxVotes}, Players with max votes: ${playersWithMaxVotes.length}`)

    let resultMessage = ""
    let eliminated = []

    // Проверяем условия для убийства:
    // 1. Максимальное количество голосов должно составлять большинство
    // 2. Только ОДИН игрок должен иметь это максимальное количество голосов
    if (maxVotes >= majority && playersWithMaxVotes.length === 1) {
      const eliminatedPlayer = this.players.get(playersWithMaxVotes[0])
      console.log(`${eliminatedPlayer.name} eliminated with ${maxVotes} votes (majority: ${majority}, unique maximum)`)
      eliminatedPlayer.alive = false
      eliminated = [eliminatedPlayer.id]
      resultMessage = `${eliminatedPlayer.name} получил большинство голосов и был убит.`
    } else if (maxVotes < majority) {
      console.log('No one eliminated - majority not reached')
      resultMessage = totalVoters === 0 ? 'Никто не голосовал.' : `Большинство не достигнуто. Никто не убит.`
    } else {
      // maxVotes >= majority но playersWithMaxVotes.length > 1
      const tiedPlayerNames = playersWithMaxVotes.map(id => this.players.get(id)?.name).join(', ')
      console.log(`Tie detected - ${playersWithMaxVotes.length} players with ${maxVotes} votes each`)
      resultMessage = `Ничья между ${tiedPlayerNames}. Никто не убит.`
    }

    // Добавляем результат в чат
    this.addChatMessage(null, `${votingMessage}\n\n${resultMessage}`, 'system')

    return {
      eliminated,
      reason: resultMessage,
      votingDetails: votingMessage
    }
  }

  // Проверка условий победы
  checkWinConditions() {
    const alivePlayers = Array.from(this.players.values()).filter(p => 
      p.alive && p.role !== 'game_master'
    )
    
    const aliveWerewolves = alivePlayers.filter(p => this.isWerewolfRole(p.role))
    const aliveVillagers = alivePlayers.filter(p => !this.isWerewolfRole(p.role) && p.role !== 'tanner')
    const aliveTanner = alivePlayers.find(p => p.role === 'tanner')
    
    // Проверяем, был ли убит неудачник
    const deadPlayers = Array.from(this.players.values()).filter(p => 
      !p.alive && p.role !== 'game_master'
    )
    const killedTanner = deadPlayers.find(p => p.role === 'tanner')
    
    console.log(`Win check: ${aliveWerewolves.length} werewolves, ${aliveVillagers.length} villagers alive`)
    console.log(`Killed tanner: ${!!killedTanner}`)

    if (killedTanner) {
      // Неудачник убит - он побеждает
      return {
        winner: 'tanner',
        message: `🎯 Неудачник (${killedTanner.name}) победил! Он был убит и достиг своей цели.`,
        gameEnded: true
      }
    } else if (aliveWerewolves.length === 0) {
      // Все оборотни мертвы - деревня побеждает
      return {
        winner: 'village',
        message: `🏘️ Деревня победила! Все оборотни были убиты.`,
        gameEnded: true
      }
    } else if (aliveWerewolves.length >= aliveVillagers.length) {
      // Оборотней больше или равно жителям - оборотни побеждают
      return {
        winner: 'werewolves',
        message: `🐺 Оборотни победили! Они захватили деревню.`,
        gameEnded: true
      }
    } else {
      // Игра продолжается
      return {
        winner: null,
        message: `Игра продолжается. Живы: ${aliveWerewolves.length} оборотней, ${aliveVillagers.length} жителей.`,
        gameEnded: false
      }
    }
  }

  // Сброс голосования
  resetVoting() {
    this.votes.clear()
    this.players.forEach(player => {
      player.votes = 0
    })
  }

  // Безопасное логирование игроков (без ролей)
  logPlayersSecurely() {
    const players = Array.from(this.players.values())
    return players.map(p => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      hasRole: !!p.role
    }))
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('create-room', (data) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    const room = new GameRoom(roomId, socket.id)
    room.addPlayer(socket.id, data.playerName)
    
    // Ensure host has the game_master role
    const hostPlayer = room.players.get(socket.id)
    if (hostPlayer) {
      hostPlayer.role = 'game_master'
    }
    
    gameRooms.set(roomId, room)
    
    socket.join(roomId)
    socket.emit('room-created', { roomId, gameData: room.getGameData(socket.id) })
    console.log(`Room ${roomId} created by ${data.playerName}`)
  })

  socket.on('join-room', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room) {
      console.log(`❌ Room ${data.roomId} not found`)
      socket.emit('error', { message: 'Комната не найдена' })
      return
    }

    console.log(`🔍 Join request: "${data.playerName}" to room ${data.roomId}`)
    console.log(`📊 Room state: ${room.gameState}`)
    console.log(`👥 Current players in room:`, room.logPlayersSecurely())

    // Check if player already exists by name (reconnection)
    let existingPlayer = null
    for (const [socketId, player] of room.players.entries()) {
      if (player.name === data.playerName) {
        existingPlayer = { socketId, player }
        console.log(`✅ Found existing player "${data.playerName}" with old socket ${socketId}`)
        break
      }
    }
    
    if (existingPlayer) {
      // RECONNECTION - always allow regardless of game state
      const { socketId: oldSocketId, player: playerData } = existingPlayer
      console.log(`🔄 RECONNECTING player "${data.playerName}"`)
      console.log(`   Old socket: ${oldSocketId}`)
      console.log(`   New socket: ${socket.id}`)
      console.log(`   Player has role: ${!!playerData.role}`)
      
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
        console.log(`👑 Restoring host status for ${data.playerName}`)
        room.hostId = socket.id
        if (playerData.role !== 'game_master') {
          playerData.role = 'game_master'
        }
      }
      
      // Update player's socket ID and mark as connected
      playerData.id = socket.id
      playerData.connected = true
      room.players.set(socket.id, playerData)
      
      console.log(`✅ ${data.playerName} RECONNECTED successfully`)
    } else {
      // NEW PLAYER - only allow during setup
      console.log(`🆕 NEW player "${data.playerName}" trying to join`)
      if (room.gameState !== 'setup') {
        console.log(`❌ Rejected - game state is "${room.gameState}", not "setup"`)
        socket.emit('error', { message: 'Игра уже началась, новые игроки не могут присоединиться' })
        return
      }
      room.addPlayer(socket.id, data.playerName)
      console.log(`✅ NEW player "${data.playerName}" added successfully`)
    }

    socket.join(data.roomId)
    
    // Send updated game data to ALL players in the room with their respective permissions
    console.log(`📤 Sending game data to room ${data.roomId}`)
    
    // Send personalized data to each player
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        const personalizedGameData = room.getGameData(playerId)
        io.to(playerId).emit('game-updated', personalizedGameData)
      }
    })
    
    // Also send a specific confirmation to the joining player
    socket.emit('join-success', room.getGameData(socket.id))
    
    console.log(`✅ Join process completed for "${data.playerName}"`)
    console.log(`---`)
  })

  socket.on('select-role', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) return

    if (!room.selectedRoles.includes(data.roleId)) {
      room.selectedRoles.push(data.roleId)
      // Send personalized updates to all players
      room.players.forEach((player, playerId) => {
        if (player.connected) {
          io.to(playerId).emit('game-updated', room.getGameData(playerId))
        }
      })
    }
  })

  socket.on('remove-role', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) return

    const index = room.selectedRoles.indexOf(data.roleId)
    if (index > -1) {
      room.selectedRoles.splice(index, 1)
      // Send personalized updates to all players
      room.players.forEach((player, playerId) => {
        if (player.connected) {
          io.to(playerId).emit('game-updated', room.getGameData(playerId))
        }
      })
    }
  })

  socket.on('start-game', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) return

    const playerCount = room.players.size
    const nonHostPlayerCount = playerCount - 1 // Исключаем ведущего
    const roleCount = room.selectedRoles.length

    if (nonHostPlayerCount !== roleCount) {
      socket.emit('error', { 
        message: `Нужно ${nonHostPlayerCount} ролей для ${nonHostPlayerCount} игроков (исключая ведущего). Сейчас выбрано: ${roleCount}` 
      })
      return
    }

    if (nonHostPlayerCount < 2) {
      socket.emit('error', { 
        message: 'Для игры нужно минимум 2 игрока (исключая ведущего)' 
      })
      return
    }

    room.distributeRoles()
    room.gameState = 'night'
    room.currentPhase = 'start'
    
    // Send personalized game start data to each player
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('game-started', room.getGameData(playerId))
      }
    })
    
    console.log(`Game started in room ${data.roomId}`)
  })

  socket.on('change-phase', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) return

    const oldState = room.gameState
    room.gameState = data.gameState
    room.currentPhase = data.currentPhase
    
    // Если переходим к голосованию, сбрасываем предыдущие голоса
    if (data.gameState === 'voting' && oldState !== 'voting') {
      room.resetVoting()
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
  })

  socket.on('send-message', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room) return

    const player = room.players.get(socket.id)
    if (!player) return

    const messageType = room.isHost(socket.id) ? 'host' : 'player'
    
    // Проверяем команду шепота с улучшенной валидацией
    const whisperMatch = data.message.match(/^\/шепот\s+(.+)$/)
    if (whisperMatch) {
      const [, rest] = whisperMatch
      const spaceIndex = rest.indexOf(' ')
      
      if (spaceIndex === -1) {
        // Нет пробела после имени = нет текста сообщения
        socket.emit('whisper-error', { message: 'Неправильный формат. Используйте: /шепот ИмяИгрока текст сообщения' })
        return
      }
      
      const targetName = rest.substring(0, spaceIndex).trim()
      const whisperMessage = rest.substring(spaceIndex + 1).trim()
      
      if (!targetName) {
        socket.emit('whisper-error', { message: 'Укажите имя игрока. Формат: /шепот ИмяИгрока текст сообщения' })
        return
      }
      
      if (!whisperMessage) {
        socket.emit('whisper-error', { message: 'Укажите текст сообщения. Формат: /шепот ИмяИгрока текст сообщения' })
        return
      }
      
      // Ищем целевого игрока
      const targetPlayer = Array.from(room.players.values()).find(p => 
        p.name.toLowerCase() === targetName.toLowerCase() && p.role !== 'game_master'
      )
      
      if (!targetPlayer) {
        const availableNames = Array.from(room.players.values())
          .filter(p => p.role !== 'game_master' && p.id !== socket.id)
          .map(p => p.name)
          .join(', ')
        socket.emit('whisper-error', { 
          message: `Игрок "${targetName}" не найден. Доступные игроки: ${availableNames}` 
        })
        return
      }
      
      if (targetPlayer.id === socket.id) {
        socket.emit('whisper-error', { message: 'Нельзя шептать самому себе' })
        return
      }
      
      // Проверяем разрешения на шепот
      if (!canWhisper(room, player, targetPlayer, messageType)) {
        socket.emit('whisper-error', { message: 'Шепот недоступен в текущей фазе игры' })
        return
      }
      
      // Создаем сообщение шепота
      const whisperChatMessage = {
        id: uuidv4(),
        playerId: socket.id,
        playerName: player.name,
        targetPlayerId: targetPlayer.id,
        targetPlayerName: targetPlayer.name,
        message: whisperMessage,
        type: 'whisper',
        timestamp: Date.now()
      }
      
      // Отправляем шепот отправителю, получателю и ведущему
      const whisperRecipients = [socket.id, targetPlayer.id]
      if (room.hostId !== socket.id && room.hostId !== targetPlayer.id) {
        whisperRecipients.push(room.hostId)
      }
      
      whisperRecipients.forEach(recipientId => {
        io.to(recipientId).emit('new-whisper', whisperChatMessage)
      })
      
      console.log(`💬 Whisper from ${player.name} to ${targetPlayer.name}: ${whisperMessage}`)
      return
    }
    
    // Обычное сообщение
    // Check if player can send messages based on game state and role
    if (!canSendMessage(room, player, messageType)) {
      socket.emit('error', { message: 'Вы не можете писать сообщения в текущей фазе' })
      return
    }

    room.addChatMessage(socket.id, data.message, messageType)
    
    const lastMessage = room.chat[room.chat.length - 1]
    
    // Send message only to players who should see it
    const recipients = getMessageRecipients(room, messageType, player)
    recipients.forEach(recipientId => {
      io.to(recipientId).emit('new-message', lastMessage)
    })
  })

  // Helper function to check if player can whisper
  function canWhisper(room, sender, target, messageType) {
    // Ведущий может шептать всегда
    if (messageType === 'host') return true
    
    // Во время подготовки можно шептать
    if (room.gameState === 'setup') return true
    
    // Во время дня можно шептать
    if (room.gameState === 'day') return true
    
    // Ночью только оборотни могут шептать друг другу
    if (room.gameState === 'night') {
      const senderIsWerewolf = room.canSeeWerewolfRoles(sender.role)
      const targetIsWerewolf = room.canSeeWerewolfRoles(target.role)
      return senderIsWerewolf && targetIsWerewolf
    }
    
    // Во время голосования шепот запрещен
    return false
  }

  // Helper function to check if player can send messages
  function canSendMessage(room, player, messageType) {
    // Host can always send messages
    if (messageType === 'host') return true
    
    // During setup phase, all players can chat
    if (room.gameState === 'setup') return true
    
    // During day phase, all players can chat
    if (room.gameState === 'day') return true
    
    // During night phase, only werewolves can chat with each other
    if (room.gameState === 'night') {
      return room.canSeeWerewolfRoles(player.role)
    }
    
    // During voting phase, no one can chat
    if (room.gameState === 'voting') return false
    
    return false
  }

  // Helper function to determine who should receive the message
  function getMessageRecipients(room, messageType, sender) {
    const recipients = []
    
    // Host messages go to everyone
    if (messageType === 'host') {
      room.players.forEach((player) => {
        if (player.connected) {
          recipients.push(player.id)
        }
      })
      return recipients
    }
    
    // During setup and day phases, everyone sees messages
    if (room.gameState === 'setup' || room.gameState === 'day') {
      room.players.forEach((player) => {
        if (player.connected) {
          recipients.push(player.id)
        }
      })
      return recipients
    }
    
    // During night phase, only werewolves see werewolf messages
    if (room.gameState === 'night') {
      if (room.canSeeWerewolfRoles(sender.role)) {
        room.players.forEach((player) => {
          if (player.connected && room.canSeeWerewolfRoles(player.role)) {
            recipients.push(player.id)
          }
        })
      }
      return recipients
    }
    
    return recipients
  }

  // НОВАЯ СИСТЕМА ГОЛОСОВАНИЯ
  socket.on('vote-player', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room) return

    const voter = room.players.get(socket.id)
    if (!voter || voter.role === 'game_master' || !voter.alive) return

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

    console.log(`Vote from ${voter.name}: ${data.targetId ? room.players.get(data.targetId)?.name : 'ABSTAIN'}`)

    // Отправляем обновленную информацию о голосовании всем игрокам
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('game-updated', room.getGameData(playerId))
      }
    })
  })

  // Завершение голосования
  socket.on('end-voting', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) return

    if (room.gameState !== 'voting') {
      socket.emit('error', { message: 'Голосование не активно' })
      return
    }

    // Обрабатываем результаты голосования
    const votingResult = room.processVoting()
    
    // Проверяем условия победы
    const winCondition = room.checkWinConditions()
    
    if (winCondition.gameEnded) {
      // Игра закончена - есть победитель
      room.gameState = 'ended'
      room.currentPhase = 'results'
      
      // Добавляем сообщение о победе в чат
      room.addChatMessage(null, winCondition.message, 'system')
    } else {
      // Игра продолжается - новый день
      room.gameState = 'day'
      room.currentPhase = 'discussion'
      room.timer = 600 // 10 минут на обсуждение
      
      // Добавляем сообщение о продолжении игры в чат
      room.addChatMessage(null, `🌅 Наступает новый день. ${winCondition.message}`, 'system')
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

    console.log(`Voting ended in room ${data.roomId}: ${votingResult.reason}`)
    if (winCondition.gameEnded) {
      console.log(`Game ended: ${winCondition.winner} wins`)
    } else {
      console.log(`Game continues: new day started`)
    }
  })

  socket.on('admin-action', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) {
      socket.emit('error', { message: 'Только ведущий может выполнять эти действия' })
      return
    }

    const targetPlayer = room.players.get(data.targetId)
    if (!targetPlayer) {
      socket.emit('error', { message: 'Игрок не найден' })
      return
    }

    console.log(`🎮 Admin action: ${data.action} on player ${targetPlayer.name}`)

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
        room.votes.delete(data.targetId) // Удаляем голос
        // Disconnect the player's socket if they're connected
        if (targetPlayer.connected) {
          io.to(data.targetId).emit('kicked', { message: 'Вы были исключены из игры ведущим' })
        }
        break
      case 'change_role':
        if (data.newRole && roles[data.newRole]) {
          targetPlayer.role = data.newRole
          console.log(`   New role assigned: ${data.newRole}`)
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
    
    console.log(`✅ Admin action completed: ${data.action} on ${targetPlayer.name}`)
  })

  socket.on('change-timer', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) return

    room.timer = data.timer
    io.to(data.roomId).emit('timer-updated', { timer: data.timer })
  })

  socket.on('next-phase', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) return

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
        room.resetVoting() // Сбрасываем голоса при переходе к голосованию
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
          nextState = 'day'
          nextPhase = 'discussion'
          room.addChatMessage(null, `🌅 Наступает новый день. ${winCondition.message}`, 'system')
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
        console.log(`Auto-voting ended: ${votingResult.reason}`)
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
    room.timer = nextState === 'day' ? 600 : null // 10 minutes for day phase

    io.to(data.roomId).emit('phase-changed', {
      gameState: room.gameState,
      currentPhase: room.currentPhase,
      timer: room.timer
    })

    // Send personalized game data update to each player
    room.players.forEach((player, playerId) => {
      if (player.connected) {
        io.to(playerId).emit('game-updated', room.getGameData(playerId))
      }
    })
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    
    // Find player in rooms and mark as disconnected instead of removing
    for (const [roomId, room] of gameRooms) {
      const player = room.players.get(socket.id)
      if (player) {
        console.log(`👤 Player "${player.name}" disconnected from room ${roomId}`)
        
        // Mark player as disconnected but KEEP all data including role and vote
        player.connected = false
        
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
        break
      }
    }
  })
})

const PORT = process.env.SOCKET_PORT || 3000

server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})