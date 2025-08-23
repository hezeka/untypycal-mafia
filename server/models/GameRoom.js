/**
 * Модель игровой комнаты - простая структура данных
 */

import { GameEngine } from '../engine/GameEngine.js'
import { getRole } from '../roles/rolesList.js'
import { generateRoomId, sanitizeHtml } from '../utils/gameHelpers.js'
import { GAME_PHASES, MESSAGE_TYPES, LIMITS } from '../utils/constants.js'

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
    
    // Игровое состояние
    this.gameState = GAME_PHASES.SETUP
    this.gameEngine = null
    
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
  
  /**
   * Добавление игрока в комнату
   */
  addPlayer(socketId, name) {
    const playerId = socketId
    
    // Проверяем лимиты
    if (this.players.size >= LIMITS.MAX_PLAYERS_PER_ROOM) {
      throw new Error('Комната переполнена')
    }
    
    // Проверяем уникальность имени
    const existingPlayer = Array.from(this.players.values())
      .find(p => p.name.toLowerCase() === name.toLowerCase())
    
    if (existingPlayer) {
      throw new Error('Игрок с таким именем уже существует')
    }
    
    const isHost = playerId === this.hostId
    
    const assignedRole = isHost && this.hostAsObserver ? 'game_master' : null
    
    const player = {
      id: playerId,
      name: name,
      role: assignedRole,
      alive: true,
      protected: false,
      votes: 0,
      connected: true,
      muted: false,
      isHost: isHost,
      joinedAt: Date.now()
    }
    
    this.players.set(playerId, player)
    
    console.log(`👤 Player ${name} joined room ${this.id}, role: ${assignedRole}, hostAsObserver: ${this.hostAsObserver}, isHost: ${isHost}`)
    
    return player
  }
  
  /**
   * Удаление игрока из комнаты
   */
  removePlayer(playerId) {
    const player = this.players.get(playerId)
    if (!player) return false
    
    this.players.delete(playerId)
    this.sockets.delete(playerId)
    
    // Убираем голос если есть
    this.votes.delete(playerId)
    
    console.log(`👤 Player ${player.name} left room ${this.id}`)
    
    // Если ушел хост и есть другие игроки - передаем права
    if (playerId === this.hostId && this.players.size > 0) {
      const newHost = Array.from(this.players.values())[0]
      this.hostId = newHost.id
      newHost.isHost = true
      
      console.log(`👑 New host: ${newHost.name} in room ${this.id}`)
    }
    
    return true
  }
  
  /**
   * Получение игрока
   */
  getPlayer(playerId) {
    return this.players.get(playerId) || null
  }
  
  /**
   * Получение роли
   */
  getRole(roleId) {
    return getRole(roleId)
  }
  
  /**
   * Назначение роли игроку
   */
  assignRole(playerId, roleId) {
    const player = this.players.get(playerId)
    if (!player) return false
    
    player.role = roleId
    
    console.log(`🎭 Assigned role ${roleId} to ${player.name}`)
    
    return true
  }
  
  /**
   * Убийство игрока
   */
  killPlayer(playerId) {
    const player = this.players.get(playerId)
    if (!player) return false
    
    player.alive = false
    
    console.log(`💀 Player ${player.name} was killed`)
    
    // Убираем голос мертвого игрока
    this.votes.delete(playerId)
    
    return true
  }
  
  /**
   * Воскрешение игрока (для отладки)
   */
  revivePlayer(playerId) {
    const player = this.players.get(playerId)
    if (!player) return false
    
    player.alive = true
    
    console.log(`✨ Player ${player.name} was revived`)
    
    return true
  }
  
  /**
   * Добавление роли к выбранным
   */
  addRole(roleId) {
    if (!getRole(roleId)) {
      throw new Error(`Неизвестная роль: ${roleId}`)
    }
    
    this.selectedRoles.push(roleId)
    
    console.log(`🎭 Added role ${roleId} to room ${this.id}`)
  }
  
  /**
   * Удаление роли из выбранных
   */
  removeRole(roleId) {
    const index = this.selectedRoles.indexOf(roleId)
    if (index > -1) {
      this.selectedRoles.splice(index, 1)
      console.log(`🎭 Removed role ${roleId} from room ${this.id}`)
      return true
    }
    return false
  }
  
  /**
   * Начало игры
   */
  startGame() {
    // Считаем игроков без ролей (исключая ведущего, у которого уже есть game_master)
    const playersNeedingRoles = Array.from(this.players.values())
      .filter(p => p.alive && (p.role === null || p.role === undefined))
    
    const playerCount = playersNeedingRoles.length
    
    if (playerCount < LIMITS.MIN_PLAYERS_TO_START) {
      throw new Error(`Недостаточно игроков (минимум ${LIMITS.MIN_PLAYERS_TO_START})`)
    }
    
    if (this.selectedRoles.length < playerCount + 3) {
      throw new Error('Недостаточно ролей (нужно на 3 больше чем игроков)')
    }
    
    // Создаем игровой движок
    this.gameEngine = new GameEngine(this)
    this.gameState = GAME_PHASES.INTRODUCTION
    
    // Запускаем игру
    this.gameEngine.startGame()
    
    console.log(`🎮 Game started in room ${this.id}`)
  }
  
  /**
   * Добавление сообщения в чат
   */
  addMessage(message) {
    // Валидация длины сообщения
    if (message.content && message.content.length > LIMITS.MAX_MESSAGE_LENGTH) {
      throw new Error('Сообщение слишком длинное')
    }
    
    // Санитизация контента
    if (message.content) {
      message.content = sanitizeHtml(message.content)
    }
    
    message.id = Date.now() + Math.random()
    message.timestamp = Date.now()
    
    this.chat.push(message)
    
    // Ограничиваем количество сообщений в памяти
    if (this.chat.length > 1000) {
      this.chat = this.chat.slice(-500)
    }
    
    return message
  }
  
  /**
   * Добавление системного сообщения
   */
  addSystemMessage(content, type = MESSAGE_TYPES.SYSTEM) {
    return this.addMessage({
      type,
      content,
      playerName: 'Система',
      playerId: 'system'
    })
  }
  
  /**
   * Отправка шепота
   */
  sendWhisper(fromId, toId, content) {
    const fromPlayer = this.getPlayer(fromId) || { name: 'Система', id: 'system' }
    const toPlayer = this.getPlayer(toId)
    
    if (!toPlayer && toId !== 'system') {
      throw new Error('Получатель не найден')
    }
    
    const whisper = this.addMessage({
      type: MESSAGE_TYPES.WHISPER,
      content,
      playerName: fromPlayer.name,
      playerId: fromId,
      targetId: toId,
      targetName: toPlayer?.name || 'Система'
    })
    
    return whisper
  }
  
  /**
   * Обновление разрешений чата
   */
  updateChatPermissions(permissions) {
    this.chatPermissions = { ...this.chatPermissions, ...permissions }
  }
  
  /**
   * Начало голосования
   */
  startVoting() {
    this.votingActive = true
    this.votes.clear()
    
    console.log(`🗳️ Voting started in room ${this.id}`)
  }
  
  /**
   * Завершение голосования
   */
  endVoting() {
    this.votingActive = false
    
    const results = this.calculateVotingResults()
    
    console.log(`🗳️ Voting ended in room ${this.id}:`, results)
    
    return results
  }
  
  /**
   * Голосование игрока
   */
  votePlayer(voterId, targetId) {
    if (!this.votingActive) {
      throw new Error('Голосование не активно')
    }
    
    const voter = this.getPlayer(voterId)
    if (!voter || !voter.alive) {
      throw new Error('Только живые игроки могут голосовать')
    }
    
    // Ведущий не может голосовать
    if (voter.role === 'game_master') {
      throw new Error('Ведущий не может голосовать')
    }
    
    // null означает воздержание
    if (targetId !== null) {
      const target = this.getPlayer(targetId)
      if (!target) {
        throw new Error('Цель голосования не найдена')
      }
      
      // Нельзя голосовать против ведущего
      if (target.role === 'game_master') {
        throw new Error('Нельзя голосовать против ведущего')
      }
    }
    
    this.votes.set(voterId, targetId)
    
    console.log(`🗳️ ${voter.name} voted for ${targetId || 'abstain'}`)
  }

  /**
   * Проверяет, завершено ли голосование
   */
  isVotingComplete() {
    if (!this.votingActive) return false
    
    // Получаем игроков, которые могут голосовать (живые, не ведущие)
    const votingPlayers = Array.from(this.players.values())
      .filter(p => p.alive && p.role !== 'game_master')
    
    // Проверяем, проголосовали ли все
    return votingPlayers.length > 0 && this.votes.size >= votingPlayers.length
  }
  
  /**
   * Подсчет результатов голосования
   */
  calculateVotingResults() {
    const voteCounts = new Map()
    let abstainCount = 0
    
    // Подсчитываем голоса
    for (const [voterId, targetId] of this.votes) {
      if (targetId === null) {
        abstainCount++
      } else {
        voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1)
      }
    }
    
    // Находим игрока с наибольшим количеством голосов
    let maxVotes = 0
    let eliminated = null
    
    for (const [playerId, voteCount] of voteCounts) {
      if (voteCount > maxVotes) {
        maxVotes = voteCount
        eliminated = this.getPlayer(playerId)
      }
    }
    
    return {
      eliminated,
      voteCounts: Object.fromEntries(voteCounts),
      abstainCount,
      totalVotes: this.votes.size
    }
  }
  
  /**
   * Добавление сокета
   */
  addSocket(playerId, socket) {
    this.sockets.set(playerId, socket)
    
    const player = this.getPlayer(playerId)
    if (player) {
      player.connected = true
    }
  }
  
  /**
   * Удаление сокета
   */
  removeSocket(playerId) {
    this.sockets.delete(playerId)
    
    const player = this.getPlayer(playerId)
    if (player) {
      player.connected = false
    }
  }
  
  /**
   * Отправка сообщения всем игрокам
   */
  broadcast(event, data) {
    for (const [playerId, socket] of this.sockets) {
      try {
        // Персонализируем данные для каждого игрока
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
  
  /**
   * Отправка сообщения конкретному игроку
   */
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
  
  /**
   * Получение данных комнаты для клиента
   */
  getClientData(playerId = null) {
    const isGameMaster = playerId && this.getPlayer(playerId)?.role === 'game_master'
    
    return {
      id: this.id,
      isPrivate: this.isPrivate,
      hostId: this.hostId,
      hostAsObserver: this.hostAsObserver,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        role: isGameMaster ? p.role : (p.id === playerId ? p.role : null), // ведущий видит все роли, игроки только свою
        alive: p.alive,
        connected: p.connected,
        isHost: p.isHost,
        protected: p.protected
      })),
      selectedRoles: this.selectedRoles,
      gameState: this.gameState,
      chat: this.chat,
      chatPermissions: this.chatPermissions,
      votingActive: this.votingActive,
      votes: Object.fromEntries(this.votes), // все видят все голоса для подсчета
      createdAt: this.createdAt
    }
  }
  
  /**
   * Проверка пуста ли комната
   */
  isEmpty() {
    return this.players.size === 0
  }
  
  /**
   * Проверка есть ли активные подключения
   */
  hasActiveConnections() {
    return Array.from(this.players.values()).some(p => p.connected)
  }
  
  /**
   * Очистка комнаты
   */
  destroy() {
    // Закрываем все сокеты
    for (const [playerId, socket] of this.sockets) {
      try {
        socket.disconnect()
      } catch (error) {
        console.error(`❌ Error disconnecting socket ${playerId}:`, error)
      }
    }
    
    // Уничтожаем игровой движок
    if (this.gameEngine) {
      this.gameEngine.destroy()
    }
    
    // Очищаем данные
    this.players.clear()
    this.sockets.clear()
    this.votes.clear()
    this.chat = []
    
    console.log(`🧹 Room ${this.id} destroyed`)
  }
}