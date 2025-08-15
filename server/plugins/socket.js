import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'

const gameRooms = new Map()

// Инициализация централизованного хранилища
const initRoomStorage = async () => {
  try {
    // Простая реализация хранилища прямо здесь
    class RoomStorage {
      constructor() {
        this.rooms = new Map()
      }

      addRoom(room) {
        this.rooms.set(room.id, room)
        console.log(`📥 Room ${room.id} synced. Total rooms: ${this.rooms.size}`)
        console.log(`📥 Room details:`, {
          id: room.id,
          isPrivate: room.isPrivate,
          hostId: room.hostId,
          playersCount: room.players.size
        })
      }

      getPublicRooms() {
        const publicRooms = []
        
        for (const room of this.rooms.values()) {
          if (room.isPrivate) continue

          const hostPlayer = room.players.get(room.hostId)
          const hostName = hostPlayer ? hostPlayer.name : 'Unknown'
          const playerCount = room.players.size
          const selectedRolesCount = Array.isArray(room.selectedRoles) ? room.selectedRoles.length : 0
          const maxPlayers = selectedRolesCount > 0 ? selectedRolesCount + 1 : 10
          
          publicRooms.push({
            id: room.id,
            hostName,
            playerCount,
            maxPlayers,
            gameState: room.gameState,
            selectedRolesCount
          })
        }
        
        console.log(`Found ${publicRooms.length} public rooms out of ${this.rooms.size} total`)
        return publicRooms
      }
    }
    
    globalThis.roomStorage = new RoomStorage()
    globalThis.syncGameRoom = (room) => {
      console.log('🔄 syncGameRoom called for room:', room.id, 'isPrivate:', room.isPrivate)
      if (!room) {
        console.error('❌ syncGameRoom: room is null/undefined!')
        return
      }
      if (!globalThis.roomStorage) {
        console.error('❌ syncGameRoom: roomStorage is not available!')
        return
      }
      globalThis.roomStorage.addRoom(room)
    }
    
    console.log('✅ Room storage initialized in socket plugin')
    console.log('✅ globalThis.syncGameRoom type:', typeof globalThis.syncGameRoom)
    console.log('✅ globalThis.roomStorage type:', typeof globalThis.roomStorage)
  } catch (error) {
    console.error('❌ Failed to initialize room storage:', error)
  }
}

initRoomStorage()

// Простая функция-конструктор GameRoom
function GameRoom(id, hostId) {
  this.id = id
  this.hostId = hostId
  this.isPrivate = false
  this.players = new Map()
  this.selectedRoles = []
  this.gameState = 'setup'
  this.currentPhase = null
  this.timer = null
  this.gameData = { centerCards: [], artifacts: [], shields: [] }
  this.chat = []
  this.votes = new Map()
}

// Добавляем методы к прототипу
GameRoom.prototype.addPlayer = function(socketId, name) {
  this.players.set(socketId, {
    id: socketId,
    name: name,
    role: socketId === this.hostId ? 'game_master' : null,
    alive: true,
    protected: false,
    artifact: null,
    votes: 0,
    connected: true
  })
}

GameRoom.prototype.isHost = function(socketId) {
  return this.hostId === socketId
}

GameRoom.prototype.getGameData = function(requestingSocketId) {
  const players = Array.from(this.players.values()).map(player => ({
    id: player.id,
    name: player.name,
    role: player.id === requestingSocketId || this.isHost(requestingSocketId) ? player.role : null,
    alive: player.alive,
    protected: player.protected,
    artifact: player.artifact,
    votes: player.votes,
    connected: player.connected
  }))

  return {
    id: this.id,
    hostId: this.hostId,
    isPrivate: this.isPrivate,
    selectedRoles: this.selectedRoles,
    gameState: this.gameState,
    currentPhase: this.currentPhase,
    timer: this.timer,
    gameData: this.gameData,
    chat: this.chat,
    players: players,
    voting: {
      totalVoters: this.votes.size,
      votesSubmitted: this.votes.size,
      hasVoted: this.votes.has(requestingSocketId),
      votedFor: this.votes.get(requestingSocketId) || null
    }
  }
}

export default defineNitroPlugin(async (nitroApp) => {
  console.log('🔌 Initializing Socket.IO plugin...')
  console.log('🔌 Plugin location: server/plugins/socket.js')
  console.log('🔌 Process PID:', process.pid)
  
  nitroApp.hooks.hook('listen', (server) => {
    console.log('🚀 Socket.IO server starting...')
    
    const io = new Server(server, {
      cors: { origin: "*", methods: ["GET", "POST"] },
      path: '/socket.io/'
    })

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id)

      // Create room
      socket.on('create-room', (data) => {
        console.log('🏠 Creating room with data:', data)
        
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
        const room = new GameRoom(roomId, socket.id)
        room.isPrivate = data.isPrivate || false
        room.addPlayer(socket.id, data.playerName)
        
        console.log(`🏠 Room ${roomId} created:`, {
          isPrivate: room.isPrivate,
          hostId: room.hostId,
          playerName: data.playerName
        })
        
        // Сохраняем в локальный Map
        gameRooms.set(roomId, room)
        console.log(`📦 Room stored in gameRooms. Total: ${gameRooms.size}`)
        
        // Синхронизируем с централизованным хранилищем
        console.log('🔄 Checking globalThis.syncGameRoom:', typeof globalThis.syncGameRoom)
        console.log('🔄 Checking globalThis.roomStorage:', typeof globalThis.roomStorage)
        
        if (globalThis.syncGameRoom) {
          console.log('📤 Syncing room to global storage...')
          globalThis.syncGameRoom(room)
        } else {
          console.log('❌ syncGameRoom not available! Using fallback...')
          // Fallback: добавляем функцию получения публичных комнат прямо из gameRooms
          globalThis.getPublicRoomsFromLocal = () => {
            const publicRooms = []
            for (const room of gameRooms.values()) {
              if (!room.isPrivate) {
                const hostPlayer = room.players.get(room.hostId)
                const hostName = hostPlayer ? hostPlayer.name : 'Unknown'
                const playerCount = room.players.size
                const selectedRolesCount = Array.isArray(room.selectedRoles) ? room.selectedRoles.length : 0
                const maxPlayers = selectedRolesCount > 0 ? selectedRolesCount + 1 : 10
                
                publicRooms.push({
                  id: room.id,
                  hostName,
                  playerCount,
                  maxPlayers,
                  gameState: room.gameState,
                  selectedRolesCount
                })
              }
            }
            return publicRooms
          }
        }
        
        socket.join(roomId)
        socket.emit('room-created', { roomId, gameData: room.getGameData(socket.id) })
        console.log(`✅ Room ${roomId} setup complete`)
      })

      // Join room
      socket.on('join-room', (data) => {
        const room = gameRooms.get(data.roomId)
        if (!room) {
          socket.emit('error', { message: 'Комната не найдена' })
          return
        }

        // Check for reconnection
        let existingPlayer = null
        for (const [socketId, player] of room.players.entries()) {
          if (player.name === data.playerName) {
            existingPlayer = { socketId, player }
            break
          }
        }
        
        if (existingPlayer) {
          // Reconnection
          const { socketId: oldSocketId, player: playerData } = existingPlayer
          room.players.delete(oldSocketId)
          playerData.id = socket.id
          playerData.connected = true
          room.players.set(socket.id, playerData)
          
          if (oldSocketId === room.hostId) {
            room.hostId = socket.id
          }
        } else {
          // New player
          if (room.gameState !== 'setup') {
            socket.emit('error', { message: 'Игра уже началась' })
            return
          }
          room.addPlayer(socket.id, data.playerName)
        }

        socket.join(data.roomId)
        socket.emit('join-success', room.getGameData(socket.id))
        
        // Update all players
        room.players.forEach((player, playerId) => {
          if (player.connected) {
            io.to(playerId).emit('game-updated', room.getGameData(playerId))
          }
        })
      })

      // Select role
      socket.on('select-role', (data) => {
        const room = gameRooms.get(data.roomId)
        if (room && room.isHost(socket.id) && !room.selectedRoles.includes(data.roleId)) {
          room.selectedRoles.push(data.roleId)
          room.players.forEach((player, playerId) => {
            if (player.connected) {
              io.to(playerId).emit('game-updated', room.getGameData(playerId))
            }
          })
        }
      })

      // Remove role
      socket.on('remove-role', (data) => {
        const room = gameRooms.get(data.roomId)
        if (room && room.isHost(socket.id)) {
          const index = room.selectedRoles.indexOf(data.roleId)
          if (index > -1) {
            room.selectedRoles.splice(index, 1)
            room.players.forEach((player, playerId) => {
              if (player.connected) {
                io.to(playerId).emit('game-updated', room.getGameData(playerId))
              }
            })
          }
        }
      })

      // Start game
      socket.on('start-game', (data) => {
        const room = gameRooms.get(data.roomId)
        if (!room || !room.isHost(socket.id)) return

        const nonHostPlayers = Array.from(room.players.values()).filter(p => p.role !== 'game_master')
        if (nonHostPlayers.length !== room.selectedRoles.length) {
          socket.emit('error', { message: 'Количество ролей не совпадает с количеством игроков' })
          return
        }

        // Distribute roles
        const shuffledRoles = [...room.selectedRoles].sort(() => Math.random() - 0.5)
        nonHostPlayers.forEach((player, index) => {
          player.role = shuffledRoles[index]
        })

        room.gameState = 'night'
        room.currentPhase = 'start'
        
        room.players.forEach((player, playerId) => {
          if (player.connected) {
            io.to(playerId).emit('game-started', room.getGameData(playerId))
          }
        })
      })

      // Change phase
      socket.on('change-phase', (data) => {
        const room = gameRooms.get(data.roomId)
        if (!room || !room.isHost(socket.id)) return

        room.gameState = data.gameState
        room.currentPhase = data.currentPhase
        
        if (data.gameState === 'voting') {
          room.votes.clear()
        }
        
        io.to(data.roomId).emit('phase-changed', {
          gameState: room.gameState,
          currentPhase: room.currentPhase
        })

        room.players.forEach((player, playerId) => {
          if (player.connected) {
            io.to(playerId).emit('game-updated', room.getGameData(playerId))
          }
        })
      })

      // Send message
      socket.on('send-message', (data) => {
        const room = gameRooms.get(data.roomId)
        if (!room) return

        const player = room.players.get(socket.id)
        if (!player) return

        const messageType = room.isHost(socket.id) ? 'host' : 'player'
        
        const message = {
          id: uuidv4(),
          playerId: socket.id,
          playerName: player.name,
          message: data.message,
          type: messageType,
          timestamp: Date.now()
        }
        
        room.chat.push(message)
        
        // Send to all connected players
        room.players.forEach((player, playerId) => {
          if (player.connected) {
            io.to(playerId).emit('new-message', message)
          }
        })
      })

      // Vote player
      socket.on('vote-player', (data) => {
        const room = gameRooms.get(data.roomId)
        if (!room || room.gameState !== 'voting') return

        const voter = room.players.get(socket.id)
        if (!voter || voter.role === 'game_master' || !voter.alive) return

        room.votes.set(socket.id, data.targetId)

        room.players.forEach((player, playerId) => {
          if (player.connected) {
            io.to(playerId).emit('game-updated', room.getGameData(playerId))
          }
        })
      })

      // End voting
      socket.on('end-voting', (data) => {
        const room = gameRooms.get(data.roomId)
        if (!room || !room.isHost(socket.id) || room.gameState !== 'voting') return

        // Simple voting result - just end the game
        room.gameState = 'ended'
        room.currentPhase = 'results'

        room.players.forEach((player, playerId) => {
          if (player.connected) {
            io.to(playerId).emit('voting-ended', {
              eliminated: [],
              reason: 'Голосование завершено',
              winCondition: { gameEnded: true, message: 'Игра завершена' },
              gameData: room.getGameData(playerId)
            })
          }
        })
      })

      // Next phase
      socket.on('next-phase', (data) => {
        const room = gameRooms.get(data.roomId)
        if (!room || !room.isHost(socket.id)) return

        switch (room.gameState) {
          case 'night':
            room.gameState = 'day'
            room.currentPhase = 'discussion'
            break
          case 'day':
            room.gameState = 'voting'
            room.currentPhase = 'voting'
            room.votes.clear()
            break
          case 'voting':
            room.gameState = 'ended'
            room.currentPhase = 'results'
            break
          case 'ended':
            room.gameState = 'setup'
            room.currentPhase = null
            room.selectedRoles = []
            room.chat = []
            room.votes.clear()
            room.players.forEach(player => {
              if (player.role !== 'game_master') {
                player.role = null
                player.alive = true
                player.protected = false
                player.votes = 0
              }
            })
            break
        }

        io.to(data.roomId).emit('phase-changed', {
          gameState: room.gameState,
          currentPhase: room.currentPhase
        })

        room.players.forEach((player, playerId) => {
          if (player.connected) {
            io.to(playerId).emit('game-updated', room.getGameData(playerId))
          }
        })
      })

      // Disconnect
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
        
        for (const [roomId, room] of gameRooms) {
          const player = room.players.get(socket.id)
          if (player) {
            player.connected = false
            
            // Синхронизируем изменения с централизованным хранилищем
            if (globalThis.syncGameRoom) {
              globalThis.syncGameRoom(room)
            }
            
            room.players.forEach((remainingPlayer, playerId) => {
              if (remainingPlayer.connected) {
                io.to(playerId).emit('game-updated', room.getGameData(playerId))
              }
            })
            break
          }
        }
      })
    })

    console.log('✅ Socket.IO server initialized successfully')
  })
})