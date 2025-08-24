/**
 * Модель игровой комнаты с интеграцией GameEngine
 */

import { GameEngine } from '../engine/GameEngine.js'
import { getRoleInfo, validateRole } from '../roles/rolesList.js'
import { generateRoomId, sanitizeHtml } from '../utils/gameHelpers.js'
import { GAME_PHASES, MESSAGE_TYPES, LIMITS, ROLE_TEAMS } from '../utils/constants.js'

export class GameRoom {
  constructor(hostId, isPrivate = false, hostAsObserver = false) {
    this.id = generateRoomId()
    this.hostId = hostId
    this.isPrivate = isPrivate
    this.hostAsObserver = hostAsObserver
    this.createdAt = Date.now()
    
    // Игроки
    this.players = new Map()
    this.selectedRoles = []
    this.centerCards = []
    
    // Игровое состояние
    this.gameState = GAME_PHASES.SETUP
    this.gameEngine = null
    this.gameResult = null
    
    // Чат
    this.chat = []
    this.chatPermissions = {
      canChat: true,
      canSeeAll: true,
      canWhisper: true,
      werewolfChat: false
    }
    
    // Голосование
    this.votes = new Map()
    this.votingActive = false
    
    // Подключения Socket.IO
    this.sockets = new Map()
  }
  
  addPlayer(socketId, name) {
    const playerId = socketId
    
    if (this.players.size >= LIMITS.MAX_PLAYERS_PER_ROOM) {
      throw new Error('Комната переполнена')
    }
    
    // Проверяем, есть ли отключенный игрок с таким именем
    const existingPlayer = Array.from(this.players.values())
      .find(p => p.name.toLowerCase() === name.toLowerCase())
    
    if (existingPlayer && existingPlayer.connected) {
      throw new Error('Игрок с таким именем уже в игре')
    }
    
    // Если есть отключенный игрок с таким именем - восстанавливаем его
    if (existingPlayer && !existingPlayer.connected) {
      // Удаляем старую запись
      this.players.delete(existingPlayer.id)
      // Создаем новую с новым socketId
      existingPlayer.id = playerId
      existingPlayer.connected = true
      this.players.set(playerId, existingPlayer)
      return existingPlayer
    }
    
    const isHost = playerId === this.hostId
    const player = {
      id: playerId,
      name: sanitizeHtml(name),
      role: isHost && this.hostAsObserver ? 'game_master' : null,
      alive: true,
      connected: true,
      isHost,
      joinedAt: Date.now()
    }
    
    this.players.set(playerId, player)
    return player
  }
  
  removePlayer(playerId) {
    const player = this.players.get(playerId)
    if (player) {
      player.connected = false
      // Не удаляем игрока полностью - он может переподключиться
    }
  }
  
  getPlayer(playerId) {
    return this.players.get(playerId)
  }
  
  addRole(roleId) {
    if (!validateRole(roleId)) {
      throw new Error('Неизвестная роль')
    }
    
    if (this.gameState !== GAME_PHASES.SETUP) {
      throw new Error('Нельзя изменять роли после начала игры')
    }
    
    this.selectedRoles.push(roleId)
  }
  
  removeRole(roleId) {
    if (this.gameState !== GAME_PHASES.SETUP) {
      throw new Error('Нельзя изменять роли после начала игры')
    }
    
    const index = this.selectedRoles.indexOf(roleId)
    if (index > -1) {
      this.selectedRoles.splice(index, 1)
    }
  }
  
  startGame() {
    const playerCount = Array.from(this.players.values())
      .filter(p => p.role !== 'game_master').length
    
    if (playerCount < LIMITS.MIN_PLAYERS_TO_START) {
      throw new Error('Недостаточно игроков для начала игры')
    }
    
    if (this.selectedRoles.length < playerCount) {
      throw new Error('Выберите достаточно ролей')
    }
    
    this.gameEngine = new GameEngine(this)
    this.gameEngine.startGame()
    
    this.addSystemMessage('Игра началась! Удачи!', MESSAGE_TYPES.GAME_EVENT)
  }
  
  addMessage(senderId, text, type = MESSAGE_TYPES.PUBLIC, recipientId = null) {
    const sender = this.getPlayer(senderId)
    if (!sender) return
    
    const message = {
      id: Date.now(),
      senderId,
      senderName: sender.name,
      senderRole: this.shouldShowRole(senderId) ? sender.role : null,
      text: sanitizeHtml(text),
      type,
      recipientId,
      timestamp: Date.now()
    }
    
    this.chat.push(message)
    
    // Отправляем сообщение нужным получателям
    this.broadcastMessage(message)
  }
  
  addSystemMessage(text, type = MESSAGE_TYPES.SYSTEM) {
    const message = {
      id: Date.now(),
      senderId: 'system',
      senderName: 'Система',
      text: sanitizeHtml(text),
      type,
      timestamp: Date.now()
    }
    
    this.chat.push(message)
    this.broadcast('new-message', { message })
  }
  
  broadcastMessage(message) {
    // Отправляем сообщение только тем, кто может его видеть
    for (const [playerId, socket] of this.sockets) {
      if (this.canPlayerSeeMessage(playerId, message)) {
        try {
          socket.emit('new-message', { message })
        } catch (error) {
          console.error(`❌ Failed to send message to ${playerId}:`, error)
        }
      }
    }
  }
  
  canPlayerSeeMessage(playerId, message) {
    const player = this.getPlayer(playerId)
    if (!player) return false
    
    // Системные сообщения видят все
    if (message.type === MESSAGE_TYPES.SYSTEM || message.senderId === 'system') {
      return true
    }
    
    // Личные сообщения видят только участники
    if (message.type === MESSAGE_TYPES.WHISPER) {
      return message.senderId === playerId || message.recipientId === playerId
    }
    
    // game_master видит все
    if (player.role === 'game_master') {
      return true
    }
    
    // В ночную фазу только оборотни видят чат
    if (this.gameState === GAME_PHASES.NIGHT && this.chatPermissions.werewolfChat) {
      return this.isWerewolf(player.role) || message.senderId === playerId
    }
    
    // В фазу голосования чат отключен (кроме шепота ведущему)
    if (this.gameState === GAME_PHASES.VOTING) {
      return message.type === MESSAGE_TYPES.WHISPER && message.recipientId && 
             this.getPlayer(message.recipientId)?.role === 'game_master'
    }
    
    return this.chatPermissions.canSeeAll
  }
  
  shouldShowRole(playerId) {
    const player = this.getPlayer(playerId)
    if (!player) return false
    
    // game_master видит все роли
    if (player.role === 'game_master') return true
    
    // Оборотни видят роли других оборотней
    if (this.isWerewolf(player.role)) {
      return this.gameState !== GAME_PHASES.SETUP
    }
    
    return false
  }
  
  isWerewolf(role) {
    if (!role) return false
    const roleInfo = getRoleInfo(role)
    return roleInfo?.team === ROLE_TEAMS.WEREWOLF && role !== 'minion'
  }
  
  votePlayer(voterId, targetId) {
    if (!this.votingActive) {
      throw new Error('Голосование не активно')
    }
    
    const voter = this.getPlayer(voterId)
    if (!voter || !voter.alive || voter.role === 'game_master') {
      throw new Error('Вы не можете голосовать')
    }
    
    // null означает воздержание
    this.votes.set(voterId, targetId)
  }
  
  countVotes() {
    const voteCounts = new Map()
    let abstainCount = 0
    
    for (const [, targetId] of this.votes) {
      if (targetId === null) {
        abstainCount++
      } else {
        voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1)
      }
    }
    
    // Находим максимальное количество голосов
    const maxVotes = Math.max(0, ...voteCounts.values())
    const eliminated = []
    
    if (maxVotes > 0) {
      for (const [playerId, votes] of voteCounts) {
        if (votes === maxVotes) {
          eliminated.push(playerId)
        }
      }
    }
    
    return {
      eliminated,
      voteCounts: Object.fromEntries(voteCounts),
      abstainCount,
      totalVotes: this.votes.size
    }
  }
  
  addSocket(playerId, socket) {
    this.sockets.set(playerId, socket)
    
    const player = this.getPlayer(playerId)
    if (player) {
      player.connected = true
    }
  }
  
  removeSocket(playerId) {
    this.sockets.delete(playerId)
    
    const player = this.getPlayer(playerId)
    if (player) {
      player.connected = false
    }
  }
  
  broadcast(event, data) {
    for (const [playerId, socket] of this.sockets) {
      try {
        let personalizedData = data
        if (data && data.room && event === 'game-updated') {
          personalizedData = {
            ...data,
            room: this.getClientData(playerId)
          }
        }
        socket.emit(event, personalizedData)
      } catch (error) {
        console.error(`❌ Failed to send ${event} to ${playerId}:`, error)
      }
    }
  }
  
  sendToPlayer(playerId, event, data) {
    const socket = this.sockets.get(playerId)
    if (socket) {
      try {
        socket.emit(event, data)
      } catch (error) {
        console.error(`❌ Failed to send ${event} to ${playerId}:`, error)
      }
    }
  }
  
  getRoleInfo(roleId) {
    return getRoleInfo(roleId)
  }
  
  getClientData(playerId = null) {
    const player = playerId ? this.getPlayer(playerId) : null
    const isGameMaster = player?.role === 'game_master'
    
    return {
      id: this.id,
      isPrivate: this.isPrivate,
      hostId: this.hostId,
      hostAsObserver: this.hostAsObserver,
      phase: this.gameState,
      selectedRoles: this.selectedRoles,
      centerCards: this.centerCards.length,
      chatPermissions: this.chatPermissions,
      votingActive: this.votingActive,
      gameResult: this.gameResult,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        role: this.shouldShowPlayerRole(p, player) ? p.role : null,
        alive: p.alive,
        connected: p.connected,
        isHost: p.isHost,
        isMe: p.id === playerId
      }))
    }
  }
  
  shouldShowPlayerRole(targetPlayer, viewerPlayer) {
    if (!viewerPlayer) return false
    
    // Свою роль видишь всегда
    if (targetPlayer.id === viewerPlayer.id) return true
    
    // game_master видит все роли
    if (viewerPlayer.role === 'game_master') return true
    
    // Оборотни видят других оборотней
    if (this.isWerewolf(viewerPlayer.role) && this.isWerewolf(targetPlayer.role)) {
      return this.gameState !== GAME_PHASES.SETUP
    }
    
    return false
  }
  
  destroy() {
    if (this.gameEngine) {
      this.gameEngine.destroy()
    }
  }
}