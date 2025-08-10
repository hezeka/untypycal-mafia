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
      connected: true // Новое поле для отслеживания подключения
    }
    
    // If this is the host, assign game_master role
    if (socketId === this.hostId) {
      player.role = 'game_master'
    }
    
    this.players.set(socketId, player)
  }

  removePlayer(socketId) {
    this.players.delete(socketId)
  }

  isHost(socketId) {
    return this.hostId === socketId
  }

  getGameData() {
    return {
      id: this.id,
      hostId: this.hostId,
      players: Array.from(this.players.values()),
      selectedRoles: this.selectedRoles,
      gameState: this.gameState,
      currentPhase: this.currentPhase,
      timer: this.timer,
      gameData: this.gameData,
      chat: this.chat
    }
  }

  addChatMessage(playerId, message, type = 'player') {
    const player = this.players.get(playerId)
    this.chat.push({
      id: uuidv4(),
      playerId,
      playerName: player ? player.name : 'Ведущий',
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
    socket.emit('room-created', { roomId, gameData: room.getGameData() })
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
    console.log(`👥 Current players in room:`)
    
    // Log all current players
    room.players.forEach((player, socketId) => {
      console.log(`   - Socket: ${socketId}, Name: "${player.name}", Role: ${player.role}, Connected: ${player.connected}`)
    })

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
      console.log(`   Player role: ${playerData.role}`)
      console.log(`   Player connected status: ${playerData.connected}`)
      
      // Don't delete from map, just update socket ID
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
      
      console.log(`✅ ${data.playerName} RECONNECTED successfully with role: ${playerData.role}`)
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
    
    // Send updated game data to ALL players in the room
    const gameData = room.getGameData()
    console.log(`📤 Sending game data to room ${data.roomId}, players: ${gameData.players.length}`)
    
    io.to(data.roomId).emit('game-updated', gameData)
    
    // Also send a specific confirmation to the joining player
    socket.emit('join-success', gameData)
    
    console.log(`✅ Join process completed for "${data.playerName}"`)
    console.log(`---`)
  })

  socket.on('select-role', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) return

    if (!room.selectedRoles.includes(data.roleId)) {
      room.selectedRoles.push(data.roleId)
      io.to(data.roomId).emit('game-updated', room.getGameData())
    }
  })

  socket.on('remove-role', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) return

    const index = room.selectedRoles.indexOf(data.roleId)
    if (index > -1) {
      room.selectedRoles.splice(index, 1)
      io.to(data.roomId).emit('game-updated', room.getGameData())
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
    
    io.to(data.roomId).emit('game-started', room.getGameData())
    console.log(`Game started in room ${data.roomId}`)
  })

  socket.on('change-phase', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room || !room.isHost(socket.id)) return

    room.gameState = data.gameState
    room.currentPhase = data.currentPhase
    
    io.to(data.roomId).emit('phase-changed', {
      gameState: room.gameState,
      currentPhase: room.currentPhase
    })
  })

  socket.on('send-message', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room) return

    const player = room.players.get(socket.id)
    if (!player) return

    const messageType = room.isHost(socket.id) ? 'host' : 'player'
    
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
      const role = player.role
      return role && (role.includes('wolf') || role === 'werewolf' || role === 'minion')
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
        recipients.push(player.id)
      })
      return recipients
    }
    
    // During setup and day phases, everyone sees messages
    if (room.gameState === 'setup' || room.gameState === 'day') {
      room.players.forEach((player) => {
        recipients.push(player.id)
      })
      return recipients
    }
    
    // During night phase, only werewolves see werewolf messages
    if (room.gameState === 'night') {
      const senderRole = sender.role
      if (senderRole && (senderRole.includes('wolf') || senderRole === 'werewolf' || senderRole === 'minion')) {
        room.players.forEach((player) => {
          const playerRole = player.role
          if (player.role === 'game_master' || 
              (playerRole && (playerRole.includes('wolf') || playerRole === 'werewolf' || playerRole === 'minion'))) {
            recipients.push(player.id)
          }
        })
      }
      return recipients
    }
    
    return recipients
  }

  socket.on('vote-player', (data) => {
    const room = gameRooms.get(data.roomId)
    if (!room) return

    const voter = room.players.get(socket.id)
    const target = Array.from(room.players.values()).find(p => p.id === data.targetId)
    
    if (voter && target) {
      // Reset previous vote
      Array.from(room.players.values()).forEach(p => {
        if (p.votedBy === socket.id) {
          p.votes--
          delete p.votedBy
        }
      })

      // Add new vote
      target.votes++
      target.votedBy = socket.id
      
      io.to(data.roomId).emit('vote-updated', {
        votes: Array.from(room.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          votes: p.votes
        }))
      })
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
        // Disconnect the player's socket if they're connected
        if (targetPlayer.connected) {
          io.to(data.targetId).emit('kicked', { message: 'Вы были исключены из игры ведущим' })
        }
        break
      case 'change_role':
        if (data.newRole && room.roles && room.roles[data.newRole]) {
          targetPlayer.role = data.newRole
        }
        break
      case 'protect':
        targetPlayer.protected = !targetPlayer.protected
        break
    }

    // Send updated game data to all players
    const updatedGameData = room.getGameData()
    io.to(data.roomId).emit('game-updated', updatedGameData)
    console.log(`✅ Admin action completed: ${data.action} on ${targetPlayer.name}`)
    
    // Log the updated player state
    if (data.action === 'change_role') {
      console.log(`   New role: ${targetPlayer.role}`)
    }
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
        break
      case 'voting':
        nextState = 'ended'
        nextPhase = 'results'
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

    // Send game data update
    io.to(data.roomId).emit('game-updated', room.getGameData())
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    
    // Find player in rooms and mark as disconnected instead of removing
    for (const [roomId, room] of gameRooms) {
      const player = room.players.get(socket.id)
      if (player) {
        console.log(`👤 Player "${player.name}" (role: ${player.role}) disconnected from room ${roomId}`)
        
        // Mark player as disconnected but KEEP all data including role
        player.connected = false
        // DO NOT delete the player from the map - just mark as disconnected
        
        // If host disconnected, DON'T transfer host immediately
        // Host role will be restored when they reconnect
        if (room.hostId === socket.id) {
          console.log(`👑 Host "${player.name}" disconnected but will retain host status`)
          // Keep the hostId pointing to the disconnected player
          // They will regain host powers when they reconnect
        }
        
        // Only delete room if ALL players are disconnected for a long time
        const connectedPlayersCount = Array.from(room.players.values()).filter(p => p.connected).length
        if (connectedPlayersCount === 0) {
          console.log(`⏰ All players disconnected from room ${roomId}, but keeping room for potential reconnects`)
          // Don't delete immediately - give time for reconnection
        } else {
          // Notify remaining players about disconnection
          io.to(roomId).emit('game-updated', room.getGameData())
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