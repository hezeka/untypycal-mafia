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
    this.nextPlayerId = 1  // Последовательные ID для порядка
    
    // Игровое состояние
    this.gameState = GAME_PHASES.SETUP
    this.gameEngine = null
    this.gameResult = null
    this.votingRounds = 0
    this.daysSurvived = 0
    this.civiliansKilled = 0
    
    // Чат
    this.chat = []
    this.chatPermissions = this.getDefaultChatPermissions()
    
    // Голосование
    this.votes = new Map()
    this.votingActive = false
    
    // Подключения Socket.IO
    this.sockets = new Map()
  }
  
  // ✅ ПРАВА ЧАТА ПО УМОЛЧАНИЮ
  getDefaultChatPermissions() {
    return {
      canChat: true,
      canSeeAll: true,
      canWhisper: true,
      werewolfChat: false
    }
  }

  // ✅ ОБНОВЛЕНИЕ ПРАВ ЧАТА ПО ФАЗАМ
  updateChatPermissions() {
    switch (this.gameState) {
      case GAME_PHASES.SETUP:
      case GAME_PHASES.INTRODUCTION:
        this.chatPermissions = {
          canChat: true,
          canSeeAll: true,
          canWhisper: true,
          werewolfChat: false
        }
        break
        
      case GAME_PHASES.NIGHT:
        this.chatPermissions = {
          canChat: true,           // Оборотни могут говорить
          canSeeAll: false,        // Обычные не видят сообщения
          canWhisper: true,        // Личные сообщения разрешены
          werewolfChat: true       // Только оборотни видят ночной чат
        }
        break
        
      case GAME_PHASES.DAY:
        this.chatPermissions = {
          canChat: true,
          canSeeAll: true,
          canWhisper: true,
          werewolfChat: false
        }
        break
        
      case GAME_PHASES.VOTING:
        this.chatPermissions = {
          canChat: false,          // Чат полностью отключен
          canSeeAll: false,
          canWhisper: true,        // Только шепот ведущему
          werewolfChat: false
        }
        break
        
      case GAME_PHASES.ENDED:
        this.chatPermissions = {
          canChat: true,
          canSeeAll: true,
          canWhisper: true,
          werewolfChat: false
        }
        break
        
      default:
        this.chatPermissions = this.getDefaultChatPermissions()
    }
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
      joinedAt: Date.now(),
      sequentialId: this.nextPlayerId++  // Присваиваем порядковый номер
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

  // Получить игроков в порядке присоединения
  getSortedPlayers() {
    return Array.from(this.players.values()).sort((a, b) => a.sequentialId - b.sequentialId)
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
  
  async startGame() {
    const playerCount = Array.from(this.players.values())
      .filter(p => p.role !== 'game_master').length
    
    if (playerCount < LIMITS.MIN_PLAYERS_TO_START) {
      throw new Error('Недостаточно игроков для начала игры')
    }
    
    if (this.selectedRoles.length < playerCount) {
      throw new Error('Выберите достаточно ролей')
    }
    
    // Очищаем чат перед началом игры
    this.chat = []
    
    this.gameEngine = new GameEngine(this)
    await this.gameEngine.startGame()
    
    // Добавляем системное сообщение с информацией о центральных картах
    const centerCardsCount = this.centerCards.length
    this.addSystemMessage(`🎮 Игра началась! Роли распределены случайно. В центре ${centerCardsCount} карт.`, MESSAGE_TYPES.SYSTEM)
  }

  // ✅ ДОБАВЛЕНИЕ СООБЩЕНИЯ С ПРАВИЛЬНЫМИ ТИПАМИ
  addMessage(senderId, text, type = MESSAGE_TYPES.PUBLIC, recipientId = null) {
    const sender = this.getPlayer(senderId)
    if (!sender) return

    const recipient = recipientId ? this.getPlayer(recipientId) : null

    const message = {
      id: Date.now(),
      senderId,
      senderName: sender.name,
      senderRole: sender.role, // Всегда указываем роль отправителя
      text: sanitizeHtml(text),
      type,
      recipientId,
      recipientName: recipient ? recipient.name : null,
      timestamp: Date.now()
    }

    this.chat.push(message)
    return message
  }

  // ✅ СИСТЕМНЫЕ СООБЩЕНИЯ
  addSystemMessage(text, type = MESSAGE_TYPES.SYSTEM) {
    const message = {
      id: Date.now(),
      senderId: 'system',
      senderName: 'Система',
      senderRole: null,
      text: sanitizeHtml(text),
      type,
      timestamp: Date.now()
    }

    this.chat.push(message)
    
    // Отправляем всем подключенным
    this.broadcast('new-message', { message })
    
    return message
  }

  // ✅ СИСТЕМНЫЕ ЛИЧНЫЕ СООБЩЕНИЯ
  addSystemWhisper(text, recipientId) {
    const recipient = this.getPlayer(recipientId)
    if (!recipient) return null

    const message = {
      id: Date.now(),
      senderId: 'system',
      senderName: 'Система',
      senderRole: null,
      text: sanitizeHtml(text),
      type: MESSAGE_TYPES.WHISPER,
      recipientId,
      recipientName: recipient.name,
      timestamp: Date.now()
    }

    this.chat.push(message)
    
    // Отправляем только получателю
    console.log(`📥 Sending private system message to ${recipientId} (${recipient.name}): "${text.substring(0, 50)}..."`)
    this.sendToPlayer(recipientId, 'new-message', { message })
    
    return message
  }

  // ✅ ПРОВЕРКА - ЯВЛЯЕТСЯ ЛИ ИГРОК ОБОРОТНЕМ
  isWerewolf(roleId) {
    if (!roleId) return false
    
    const werewolfRoles = [
      'werewolf', 'werewolf_2', 'werewolf_3',
      'mystic_wolf', 'alpha_wolf', 'dream_wolf'
    ]
    
    return werewolfRoles.includes(roleId)
  }

  // ✅ УСТАРЕВШАЯ ФУНКЦИЯ - УДАЛЕНА
  // Используйте shouldShowPlayerRole(targetPlayer, viewerPlayer) вместо этой функции

  // ✅ ПРАВА НА ПРОСМОТР РОЛЕЙ ДРУГИХ ИГРОКОВ
  shouldShowPlayerRole(targetPlayer, viewerPlayer) {
    if (!viewerPlayer || !targetPlayer) return false
    
    // В setup фазе роли не показываются
    if (this.gameState === GAME_PHASES.SETUP) return false

    // В фазе ended все роли показываются всем
    if (this.gameState === GAME_PHASES.ENDED) return true

    // Свою роль видишь всегда
    if (targetPlayer.id === viewerPlayer.id) return true

    // game_master видит все роли
    if (viewerPlayer.role === 'game_master') return true

    // Оборотни видят других оборотней (после setup)
    if (this.isWerewolf(viewerPlayer.role) && this.isWerewolf(targetPlayer.role)) {
      return true
    }

    // Миньон видит оборотней (но они его не видят)
    if (viewerPlayer.role === 'minion' && this.isWerewolf(targetPlayer.role)) {
      return true
    }

    return false
  }
  
  addVote(voterId, targetId) {
    if (!this.votingActive) {
      throw new Error('Голосование не активно')
    }
    
    const voter = this.getPlayer(voterId)
    if (!voter || !voter.alive || voter.role === 'game_master') {
      throw new Error('Игрок не может голосовать')
    }
    
    // null означает воздержание
    this.votes.set(voterId, targetId)
    
    // Проверяем, все ли проголосовали
    this.checkVotingCompletion()
  }
  
  checkVotingCompletion() {
    if (!this.votingActive) return
    
    // Считаем всех живых игроков (кроме game_master)
    const eligibleVoters = Array.from(this.players.values())
      .filter(p => p.alive && p.role !== 'game_master')
    
    const votesCount = this.votes.size
    
    console.log(`🗳️ Voting progress: ${votesCount}/${eligibleVoters.length} votes cast`)
    console.log(`🗳️ Eligible voters:`, eligibleVoters.map(p => `${p.name} (${p.id})`))
    console.log(`🗳️ Votes received:`, Array.from(this.votes.keys()))
    
    // Если все проголосовали, завершаем голосование досрочно
    if (votesCount >= eligibleVoters.length && this.gameEngine) {
      console.log(`✅ All ${eligibleVoters.length} players voted, ending voting phase early`)
      
      // Останавливаем таймер голосования
      if (this.gameEngine.phaseTimer) {
        clearTimeout(this.gameEngine.phaseTimer)
        this.gameEngine.phaseTimer = null
      }
      
      // Обрабатываем голосование немедленно
      setTimeout(() => {
        this.gameEngine.processVoting()
        
        // Переходим к следующей фазе
        setTimeout(async () => {
          // Проверяем условия победы - если игра закончилась, не переходим дальше
          if (this.gameEngine.checkWinConditions()) {
            // Игра уже закончена в endGame(), ничего не делаем
            console.log('🏆 Game ended, no phase transition needed')
          } else {
            await this.gameEngine.setPhase(GAME_PHASES.NIGHT)
          }
        }, 2000)
      }, 500) // Небольшая задержка для UI
    }
  }
  
  getVotingResults() {
    const voteCounts = new Map()
    let abstainCount = 0
    
    for (const [voterId, targetId] of this.votes) {
      if (targetId === null) {
        abstainCount++
      } else {
        voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1)
      }
    }
    
    // Находим игроков с максимальным количеством голосов
    const maxVotes = Math.max(0, ...voteCounts.values())
    let eliminated = []
    
    if (maxVotes > 0) {
      const playersWithMaxVotes = []
      for (const [playerId, votes] of voteCounts) {
        if (votes === maxVotes) {
          playersWithMaxVotes.push(playerId)
        }
      }
      
      // Если только один игрок получил максимальное количество голосов - он исключается
      // Если несколько игроков имеют одинаковое максимальное количество голосов (ничья) - никто не исключается
      if (playersWithMaxVotes.length === 1) {
        eliminated = playersWithMaxVotes
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
        
        // Логируем системные сообщения для отладки
        if (event === 'new-message' && data?.message?.senderId === 'system') {
          console.log(`📢 Broadcasting system message to ${playerId}: "${data.message.text.substring(0, 50)}..."`)
        }
        
        // Удалили логирование whisper-activity - больше не используется
        
        socket.emit(event, personalizedData)
      } catch (error) {
        console.error(`❌ Failed to send ${event} to ${playerId}:`, error)
      }
    }
  }
  
  broadcastExcept(event, data, excludePlayerIds = []) {
    for (const [playerId, socket] of this.sockets) {
      if (excludePlayerIds.includes(playerId)) continue
      
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
      votingRounds: this.votingRounds,
      daysSurvived: this.daysSurvived,
      civiliansKilled: this.civiliansKilled,
      timer: this.gameEngine ? this.gameEngine.getTimerInfo() : null,
      players: this.getSortedPlayers().map(p => ({
        id: p.id,
        name: p.name,
        role: this.shouldShowPlayerRole(p, player) ? p.role : null,
        alive: p.alive,
        connected: p.connected,
        isHost: p.isHost,
        isMe: p.id === playerId,
        sequentialId: p.sequentialId
      }))
    }
  }
  
  resetGame() {
    // Сбрасываем игровое состояние
    this.gameState = 'setup'
    this.selectedRoles = []
    this.centerCards = []
    this.votingActive = false
    this.votes.clear()
    this.gameResult = null
    this.votingRounds = 0
    this.daysSurvived = 0
    this.civiliansKilled = 0
    this.chat = []
    
    // Сбрасываем состояние игроков
    for (const player of this.players.values()) {
      player.role = null
      player.alive = true
      if (player.role !== 'game_master') {
        player.messageCount = 0
        player.whisperCount = 0
      }
    }
    
    // Сбрасываем игровой движок
    if (this.gameEngine) {
      this.gameEngine.destroy()
      this.gameEngine = null
    }
    
    console.log(`🔄 Room ${this.id} has been reset`)
  }
  
  removePlayer(playerId) {
    const player = this.getPlayer(playerId)
    if (!player) return false
    
    // Удаляем игрока
    this.players.delete(playerId)
    this.sockets.delete(playerId)
    this.votes.delete(playerId)
    
    console.log(`👋 Player ${player.name} removed from room ${this.id}`)
    return true
  }
  
  destroy() {
    if (this.gameEngine) {
      this.gameEngine.destroy()
    }
  }
}