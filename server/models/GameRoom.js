import { GameEngine } from '../engine/GameEngine.js'
import { getRoleInfo, validateRole } from '../roles/rolesList.js'
import { generateRoomId, sanitizeHtml } from '../utils/gameHelpers.js'
import { GAME_PHASES, MESSAGE_TYPES, LIMITS, ROLE_TEAMS } from '../utils/constants.js'
import { GameHistory } from './GameHistory.js'

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
    this.usedRandomIds = new Set()  // Для отслеживания уже использованных случайных номеров
    
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
    this.votingMode = 'democratic' // 'democratic' или 'chaotic'
    
    // Голосование за пропуск фазы
    this.phaseSkipVotes = new Set() // ID игроков, проголосовавших за пропуск
    this.phaseSkipThreshold = 1.0 // 100% игроков для пропуска
    
    // Подключения Socket.IO
    this.sockets = new Map()
    
    // История игры
    this.gameHistory = new GameHistory()
  }
  
  // ✅ ГЕНЕРАЦИЯ УНИКАЛЬНОГО СЛУЧАЙНОГО ID ДЛЯ СОРТИРОВКИ
  generateRandomSortId() {
    let randomId
    do {
      randomId = Math.floor(Math.random() * 10000) + 1
    } while (this.usedRandomIds.has(randomId))
    
    this.usedRandomIds.add(randomId)
    return randomId
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

  // ✅ ПОЛУЧЕНИЕ ПРАВ ЧАТА ДЛЯ КОНКРЕТНОГО ИГРОКА
  getPlayerChatPermissions(player) {
    if (!player) return { canChat: false, canSeeAll: false, canWhisper: false, werewolfChat: false }
    
    // Наблюдатели имеют ограниченные права
    if (player.role === 'observer' || player.isObserver) {
      return {
        canChat: false,        // Наблюдатели не могут писать
        canSeeAll: true,       // Но видят все общие сообщения
        canWhisper: false,     // Не могут шептать
        werewolfChat: false    // Не видят ночной чат оборотней
      }
    }
    
    // Для остальных игроков используем общие права
    return this.chatPermissions
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
      
      // Логируем переподключение
      this.gameHistory.logPlayerConnection(existingPlayer, 'reconnect')
      
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
      randomSortId: this.generateRandomSortId()  // Присваиваем случайный номер для сортировки
    }
    
    this.players.set(playerId, player)
    
    // Логируем присоединение игрока
    this.gameHistory.logPlayerConnection(player, 'join')
    
    // Если игра уже началась и у игрока нет роли, попробуем назначить ее
    if (this.gameState !== GAME_PHASES.SETUP && !player.role && !player.isHost) {
      this.assignRoleToNewPlayer(player)
    }
    
    return player
  }
  
  // Назначает роль новому игроку, присоединившемуся к уже запущенной игре
  assignRoleToNewPlayer(player) {
    // Все поздние присоединения становятся наблюдателями
    console.log(`👁️ Late-joining player ${player.name} becomes observer`)
    player.role = 'observer'
    player.alive = false // Наблюдатели не участвуют в голосовании и не имеют прав игрока
    player.isObserver = true // Дополнительный флаг для удобства
  }
  
  // Уведомляет о смерти игрока с раскрытием роли
  announcePlayerDeath(player, cause = 'killed', killer = null) {
    if (!player || !player.role) {
      console.log(`⚠️ Cannot announce death: player=${!!player}, role=${player?.role}`)
      return
    }
    
    console.log(`💀 Announcing death: ${player.name} (alive: ${player.alive} -> false, role: ${player.role})`)
    
    // Логируем смерть в историю
    this.gameHistory.logPlayerDeath(player, cause, killer)
    
    const roleInfo = this.getRoleInfo(player.role)
    const roleName = roleInfo?.name || player.role
    
    let message = ''
    switch (cause) {
      case 'night':
        message = `💀 ${player.name} был убит ночью. Он был ${roleName}.`
        break
      case 'voting':
        message = `🗳️ ${player.name} был исключен голосованием. Он был ${roleName}.`
        break
      case 'hunter':
        message = `🏹 ${player.name} был застрелен охотником. Он был ${roleName}.`
        break
      default:
        message = `💀 ${player.name} погиб. Он был ${roleName}.`
    }
    
    console.log(`💀 Player death announced: ${player.name} (${roleName}), alive status: ${player.alive}`)
    this.addSystemMessage(message)
    
    // Отправляем специальное событие раскрытия роли
    this.broadcast('role-revealed', {
      playerId: player.id,
      playerName: player.name,
      role: player.role,
      roleName: roleName,
      cause: cause,
      alive: player.alive // Добавляем статус для отладки
    })
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

  // Получить игроков в случайном порядке (по randomSortId)
  getSortedPlayers() {
    return Array.from(this.players.values()).sort((a, b) => a.randomSortId - b.randomSortId)
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
  
  setVotingMode(mode) {
    if (this.gameState !== GAME_PHASES.SETUP) {
      throw new Error('Нельзя изменять режим голосования после начала игры')
    }
    
    if (!['democratic', 'chaotic'].includes(mode)) {
      throw new Error('Неизвестный режим голосования')
    }
    
    this.votingMode = mode
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
    
    // Логируем начало игры в историю
    const activePlayers = Array.from(this.players.values()).filter(p => p.role !== 'game_master')
    this.gameHistory.startGame(activePlayers, this.selectedRoles)
    
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
    
    // Логируем сообщение в историю
    if (type === MESSAGE_TYPES.WHISPER) {
      this.gameHistory.logChatMessage(sender, text, 'whisper', recipient)
    } else if (type === MESSAGE_TYPES.PUBLIC) {
      this.gameHistory.logChatMessage(sender, text, 'public')
    }
    
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
    
    // Отправляем всем подключенным (без дополнительного game-updated)
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
    if (!targetPlayer) return false
    
    // В setup фазе роли не показываются никому
    if (this.gameState === GAME_PHASES.SETUP) return false

    // В фазе ended все роли показываются всем
    if (this.gameState === GAME_PHASES.ENDED) return true

    // ВАЖНО: Роли мертвых игроков видят ВСЕ (включая анонимных пользователей)
    if (targetPlayer.alive === false) return true
    
    // Если нет информации о смотрящем игроке (анонимный просмотр), больше ничего не показываем
    if (!viewerPlayer) return false

    // Свою роль видишь всегда (если она есть)
    if (targetPlayer.id === viewerPlayer.id) return true

    // game_master видит все роли
    if (viewerPlayer.role === 'game_master') return true

    // Наблюдатели видят только роли мертвых игроков (уже проверено выше)
    if (viewerPlayer.role === 'observer' || viewerPlayer.isObserver) return false

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
    if (!voter || !voter.alive || voter.role === 'game_master' || voter.role === 'observer' || voter.isObserver) {
      throw new Error('Игрок не может голосовать')
    }
    
    // null означает воздержание
    this.votes.set(voterId, targetId)
    
    // Проверяем, все ли проголосовали
    this.checkVotingCompletion()
  }
  
  checkVotingCompletion() {
    if (!this.votingActive) return
    
    // Считаем всех живых игроков (кроме game_master и наблюдателей)
    const eligibleVoters = Array.from(this.players.values())
      .filter(p => p.alive && p.role !== 'game_master' && p.role !== 'observer' && !p.isObserver)
    
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
    
    let eliminated = []
    const totalVotes = this.votes.size
    
    if (this.votingMode === 'democratic') {
      // Демократичный режим: нужно 50% или более голосов (как в Among Us)
      const requiredPercentage = totalVotes / 2 // 50% от всех голосов
      
      // Найдем игрока(ов) с максимальным количеством голосов
      const maxVotes = Math.max(0, ...voteCounts.values())
      
      if (maxVotes > 0) {
        // Проверим, есть ли у кого-то 50% или более голосов
        if (maxVotes >= requiredPercentage) {
          // Найдем всех игроков с максимальным количеством голосов
          const playersWithMaxVotes = []
          for (const [playerId, votes] of voteCounts) {
            if (votes === maxVotes) {
              playersWithMaxVotes.push(playerId)
            }
          }
          
          // Исключаем только если один игрок набрал максимум (нет ничьи)
          // Даже если несколько игроков набрали 50%+, но поровну - это ничья
          if (playersWithMaxVotes.length === 1) {
            eliminated = playersWithMaxVotes
          }
        }
      }
    } else {
      // Хаотичный режим: максимальное количество голосов (как было изначально)
      const maxVotes = Math.max(0, ...voteCounts.values())
      
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
    }
    
    // Логируем голосование в историю
    this.gameHistory.logVoting(Object.fromEntries(this.votes), eliminated)
    
    return {
      eliminated,
      voteCounts: Object.fromEntries(voteCounts),
      abstainCount,
      totalVotes,
      votingMode: this.votingMode
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

  // Синхронизация статуса и ролей игроков для всех подключенных клиентов
  syncPlayersStatus() {
    console.log('🔄 Syncing players status for all connected clients...')
    this.sockets.forEach((socket, socketId) => {
      const viewer = this.getPlayer(socketId)
      if (viewer) {
        socket.emit('players-status-sync', {
          players: this.getSortedPlayers().map(p => ({
            id: p.id,
            name: p.name,
            connected: p.connected,
            alive: p.alive,
            role: this.shouldShowPlayerRole(p, viewer) ? p.role : undefined
          }))
        })
      }
    })
    console.log('✅ Players status synced for all clients')
  }
  
  getRoleInfo(roleId) {
    return getRoleInfo(roleId)
  }
  
  // Получить историю игры
  getGameHistory(importance = null) {
    if (!this.gameHistory) {
      return []
    }
    return this.gameHistory.getHistory(importance)
  }
  
  // Получить статистику игроков
  getPlayerStatistics() {
    if (!this.gameHistory) {
      return []
    }
    return this.gameHistory.getPlayerStats()
  }
  
  // Получить форматированную историю
  getFormattedHistory(importance = null) {
    if (!this.gameHistory) {
      return 'История недоступна - игра еще не началась'
    }
    return this.gameHistory.getFormattedHistory(importance)
  }
  
  // Получить сводку игры
  getGameSummary() {
    if (!this.gameHistory) {
      return {
        duration: 0,
        nights: 0,
        days: 0,
        votings: 0,
        totalEvents: 0,
        criticalEvents: 0,
        playerStats: []
      }
    }
    return this.gameHistory.getGameSummary()
  }
  
  // Получить прогресс ночных действий
  getNightProgress() {
    if (!this.gameEngine || this.gameState !== GAME_PHASES.NIGHT) {
      return {
        currentRole: null,
        completedRoles: [],
        allRoles: []
      }
    }
    
    return this.gameEngine.getNightProgress()
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
      chatPermissions: player ? this.getPlayerChatPermissions(player) : this.chatPermissions,
      votingActive: this.votingActive,
      votingMode: this.votingMode,
      gameResult: this.gameResult,
      votingRounds: this.votingRounds,
      daysSurvived: this.daysSurvived,
      civiliansKilled: this.civiliansKilled,
      timer: this.gameEngine ? this.gameEngine.getTimerInfo() : null,
      phaseSkipStatus: this.getPhaseSkipStatus(),
      voting: {
        active: this.votingActive,
        votes: Object.fromEntries(this.votes)
      },
      players: this.getSortedPlayers().map(p => ({
        id: p.id,
        name: p.name,
        role: this.shouldShowPlayerRole(p, player) ? p.role : null,
        alive: p.alive,
        connected: p.connected,
        isHost: p.isHost,
        isMe: p.id === playerId,
        randomSortId: p.randomSortId
      }))
    }
  }
  
  resetGame() {
    // Сбрасываем игровое состояние
    this.gameState = GAME_PHASES.SETUP
    this.selectedRoles = []
    this.centerCards = []
    this.votingActive = false
    this.votes.clear()
    this.phaseSkipVotes.clear()
    this.gameResult = null
    this.votingRounds = 0
    this.daysSurvived = 0
    this.civiliansKilled = 0
    this.chat = []
    
    // Сбрасываем права чата к состоянию по умолчанию
    this.chatPermissions = this.getDefaultChatPermissions()
    
    // Очищаем использованные случайные ID для новых игроков
    this.usedRandomIds.clear()
    
    // Сбрасываем состояние игроков
    for (const player of this.players.values()) {
      const wasGameMaster = player.role === 'game_master'
      
      if (!wasGameMaster) {
        player.role = null
        player.messageCount = 0
        player.whisperCount = 0
      }
      player.alive = true
      
      // Сбрасываем флаг использования команды Ктулху
      player.cthulhuOrderUsedTonight = false
    }
    
    // Сбрасываем игровой движок
    if (this.gameEngine) {
      this.gameEngine.destroy()
      this.gameEngine = null
    }
    
    // Сбрасываем историю игры
    this.gameHistory.reset()
    
    console.log(`🔄 Room ${this.id} has been reset`)
  }
  
  // Методы для голосования за пропуск фазы
  addPhaseSkipVote(playerId) {
    const player = this.getPlayer(playerId)
    
    // Исключаем: мертвых игроков, ведущих-наблюдателей и наблюдателей
    // Ведущий-игрок (isHost=true, но role !== 'game_master') может голосовать
    if (!player || !player.alive || player.role === 'observer' || player.isObserver) {
      throw new Error('Игрок не может голосовать за пропуск')
    }
    
    // Ведущий-наблюдатель (role === 'game_master') не может голосовать
    if (player.role === 'game_master') {
      throw new Error('Ведущий-наблюдатель не может голосовать за пропуск')
    }
    
    // Проверяем допустимые фазы для пропуска
    if (!this.canSkipCurrentPhase()) {
      throw new Error('Текущую фазу нельзя пропустить')
    }
    
    this.phaseSkipVotes.add(playerId)
    
    // Проверяем, достигнут ли порог для пропуска
    return this.checkPhaseSkipThreshold()
  }
  
  removePhaseSkipVote(playerId) {
    this.phaseSkipVotes.delete(playerId)
  }
  
  canSkipCurrentPhase() {
    return this.gameState === GAME_PHASES.INTRODUCTION || this.gameState === GAME_PHASES.DAY
  }
  
  checkPhaseSkipThreshold() {
    // Подсчитываем игроков, которые могут голосовать за пропуск
    // Исключаем: мертвых, ведущих-наблюдателей (role === 'game_master') и наблюдателей  
    // Включаем: живых игроков и ведущих-игроков (isHost=true, но role !== 'game_master')
    const eligibleVoters = Array.from(this.players.values())
      .filter(p => p.alive && p.role !== 'game_master' && p.role !== 'observer' && !p.isObserver)
    
    const requiredVotes = Math.ceil(eligibleVoters.length * this.phaseSkipThreshold)
    const currentVotes = this.phaseSkipVotes.size
    
    console.log(`⏭️ Phase skip votes: ${currentVotes}/${requiredVotes} (threshold: ${this.phaseSkipThreshold})`)
    console.log(`⏭️ Eligible voters:`, eligibleVoters.map(p => `${p.name}(${p.role || 'no-role'}, host:${p.isHost})`))
    
    return currentVotes >= requiredVotes
  }
  
  clearPhaseSkipVotes() {
    this.phaseSkipVotes.clear()
  }
  
  getPhaseSkipStatus() {
    // Подсчитываем игроков, которые могут голосовать за пропуск
    // Исключаем: мертвых, ведущих-наблюдателей (role === 'game_master') и наблюдателей
    // Включаем: живых игроков и ведущих-игроков (isHost=true, но role !== 'game_master')
    const eligibleVoters = Array.from(this.players.values())
      .filter(p => p.alive && p.role !== 'game_master' && p.role !== 'observer' && !p.isObserver)
    
    return {
      votes: this.phaseSkipVotes.size,
      required: Math.ceil(eligibleVoters.length * this.phaseSkipThreshold),
      total: eligibleVoters.length,
      canSkip: this.canSkipCurrentPhase(),
      voters: Array.from(this.phaseSkipVotes)
    }
  }
  
  removePlayer(playerId) {
    const player = this.getPlayer(playerId)
    if (!player) return false
    
    // Удаляем игрока
    this.players.delete(playerId)
    this.sockets.delete(playerId)
    this.votes.delete(playerId)
    this.phaseSkipVotes.delete(playerId)
    
    console.log(`👋 Player ${player.name} removed from room ${this.id}`)
    return true
  }
  
  destroy() {
    if (this.gameEngine) {
      this.gameEngine.destroy()
    }
  }
}