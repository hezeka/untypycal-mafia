/**
 * Система логирования истории игры
 */

import { getAllRoles } from '../../shared/rolesRegistry.js'

export const EVENT_TYPES = {
  // Ключевые события игры
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  PHASE_CHANGE: 'phase_change',
  
  // Ночные действия
  NIGHT_PROTECT: 'night_protect',
  NIGHT_KILL: 'night_kill',
  NIGHT_INVESTIGATE: 'night_investigate',
  NIGHT_BLOCK: 'night_block',
  NIGHT_CONVERT: 'night_convert',
  NIGHT_CTHULHU_ORDER: 'night_cthulhu_order',
  NIGHT_HUNTER_MARK: 'night_hunter_mark',
  NECROMANCER_RESURRECT: 'necromancer_resurrect',
  
  // Дневные события
  VOTING_START: 'voting_start',
  VOTING_END: 'voting_end',
  PLAYER_ELIMINATED: 'player_eliminated',
  HUNTER_REVENGE: 'hunter_revenge',
  
  // События игроков
  PLAYER_DEATH: 'player_death',
  ROLE_REVEALED: 'role_revealed',
  
  // Чат (основные события)
  CHAT_MESSAGE: 'chat_message',
  CHAT_WHISPER: 'chat_whisper',
  
  // Подключения (минорные события)
  PLAYER_JOIN: 'player_join',
  PLAYER_LEAVE: 'player_leave',
  PLAYER_RECONNECT: 'player_reconnect'
}

export const EVENT_IMPORTANCE = {
  CRITICAL: 'critical',    // Ключевые события: ночные действия, голосования, убийства, изгнания
  NORMAL: 'normal',        // Основные события: сообщения и личные сообщения
  MINOR: 'minor'           // Минорные события: подключения, реконнекты
}

export class GameHistory {
  constructor() {
    this.events = []
    this.gameStartTime = null
    this.gameEndTime = null
    this.currentNight = 0
    this.currentDay = 0
    this.currentVoting = 0
    this.playerStats = new Map() // Статистика игроков
  }

  // Получить русское название роли
  getRoleName(roleId) {
    const roles = getAllRoles()
    return roles[roleId]?.name || roleId
  }

  // Начало игры
  startGame(players, selectedRoles) {
    this.gameStartTime = Date.now()
    this.events = [] // Очищаем историю
    this.playerStats.clear()
    
    // Инициализируем статистику игроков
    players.forEach(player => {
      if (player.role !== 'game_master') {
        this.playerStats.set(player.id, {
          name: player.name,
          role: player.role,
          messagesCount: 0,
          whispersCount: 0,
          nightActions: [],
          votesReceived: 0,
          votesGiven: 0,
          daysAlive: 0,
          eliminationDay: null,
          eliminationCause: null
        })
      }
    })

    this.addEvent(EVENT_TYPES.GAME_START, {
      players: players.filter(p => p.role !== 'game_master').map(p => ({
        id: p.id,
        name: p.name,
        role: p.role
      })),
      selectedRoles,
      timestamp: this.gameStartTime
    }, EVENT_IMPORTANCE.CRITICAL)
  }

  // Конец игры
  endGame(gameResult) {
    this.gameEndTime = Date.now()
    
    this.addEvent(EVENT_TYPES.GAME_END, {
      result: gameResult,
      duration: this.gameEndTime - this.gameStartTime,
      timestamp: this.gameEndTime
    }, EVENT_IMPORTANCE.CRITICAL)
  }

  // Смена фазы
  changePhase(newPhase, oldPhase) {
    if (newPhase === 'night') {
      this.currentNight++
    } else if (newPhase === 'day') {
      this.currentDay++
    } else if (newPhase === 'voting') {
      this.currentVoting++
    }

    this.addEvent(EVENT_TYPES.PHASE_CHANGE, {
      from: oldPhase,
      to: newPhase,
      night: this.currentNight,
      day: this.currentDay,
      voting: this.currentVoting
    }, EVENT_IMPORTANCE.CRITICAL)
  }

  // Ночное действие
  logNightAction(actionType, actor, target, details = {}) {
    const event = {
      actionType,
      actor: actor ? { id: actor.id, name: actor.name, role: actor.role } : null,
      target: target ? { id: target.id, name: target.name, role: target.role } : null,
      night: this.currentNight,
      details,
      success: details.success !== false
    }

    // Добавляем в статистику игрока
    if (actor && this.playerStats.has(actor.id)) {
      this.playerStats.get(actor.id).nightActions.push({
        night: this.currentNight,
        action: actionType,
        target: target ? target.name : null,
        success: event.success
      })
    }

    this.addEvent(actionType, event, EVENT_IMPORTANCE.CRITICAL)
  }

  // Голосование
  logVoting(votes, eliminated) {
    const votingData = {
      voting: this.currentVoting,
      day: this.currentDay,
      votes: Object.fromEntries(
        Object.entries(votes).map(([voterId, targetId]) => [
          this.getPlayerName(voterId),
          targetId ? this.getPlayerName(targetId) : 'Воздержался'
        ])
      ),
      eliminated: eliminated.map(playerId => ({
        id: playerId,
        name: this.getPlayerName(playerId),
        role: this.getPlayerRole(playerId)
      }))
    }

    // Обновляем статистику голосования
    Object.entries(votes).forEach(([voterId, targetId]) => {
      if (this.playerStats.has(voterId)) {
        this.playerStats.get(voterId).votesGiven++
      }
      if (targetId && this.playerStats.has(targetId)) {
        this.playerStats.get(targetId).votesReceived++
      }
    })

    this.addEvent(EVENT_TYPES.VOTING_END, votingData, EVENT_IMPORTANCE.CRITICAL)
  }

  // Смерть игрока
  logPlayerDeath(player, cause, killer = null) {
    const deathEvent = {
      player: { id: player.id, name: player.name, role: player.role },
      cause, // 'voting', 'night', 'hunter'
      killer: killer ? { id: killer.id, name: killer.name, role: killer.role } : null,
      day: this.currentDay,
      night: this.currentNight
    }

    // Обновляем статистику
    if (this.playerStats.has(player.id)) {
      const stats = this.playerStats.get(player.id)
      stats.eliminationDay = this.currentDay
      stats.eliminationCause = cause
      stats.daysAlive = this.currentDay
    }

    this.addEvent(EVENT_TYPES.PLAYER_DEATH, deathEvent, EVENT_IMPORTANCE.CRITICAL)
  }

  // Сообщение в чате
  logChatMessage(sender, message, type = 'public', recipient = null) {
    if (!sender || !this.playerStats.has(sender.id)) return

    const stats = this.playerStats.get(sender.id)
    if (type === 'whisper') {
      stats.whispersCount++
    } else {
      stats.messagesCount++
    }

    this.addEvent(type === 'whisper' ? EVENT_TYPES.CHAT_WHISPER : EVENT_TYPES.CHAT_MESSAGE, {
      sender: { id: sender.id, name: sender.name, role: sender.role },
      recipient: recipient ? { id: recipient.id, name: recipient.name } : null,
      message: message.substring(0, 100), // Обрезаем длинные сообщения
      type
    }, EVENT_IMPORTANCE.NORMAL)
  }

  // Подключение игрока
  logPlayerConnection(player, action) {
    this.addEvent(
      action === 'join' ? EVENT_TYPES.PLAYER_JOIN : 
      action === 'leave' ? EVENT_TYPES.PLAYER_LEAVE : EVENT_TYPES.PLAYER_RECONNECT,
      {
        player: { id: player.id, name: player.name },
        action
      },
      EVENT_IMPORTANCE.MINOR
    )
  }

  // Добавить событие
  addEvent(type, data, importance = EVENT_IMPORTANCE.NORMAL) {
    this.events.push({
      id: this.events.length + 1,
      type,
      data,
      importance,
      timestamp: Date.now()
    })
  }

  // Получить отфильтрованную историю
  getHistory(importance = null) {
    if (!importance) {
      return this.events
    }
    
    const importanceLevels = {
      [EVENT_IMPORTANCE.CRITICAL]: [EVENT_IMPORTANCE.CRITICAL],
      [EVENT_IMPORTANCE.NORMAL]: [EVENT_IMPORTANCE.CRITICAL, EVENT_IMPORTANCE.NORMAL],
      [EVENT_IMPORTANCE.MINOR]: [EVENT_IMPORTANCE.CRITICAL, EVENT_IMPORTANCE.NORMAL, EVENT_IMPORTANCE.MINOR]
    }
    
    if (!importanceLevels[importance]) {
      return this.events
    }
    
    return this.events.filter(event => importanceLevels[importance].includes(event.importance))
  }

  // Получить статистику игроков
  getPlayerStats() {
    return Array.from(this.playerStats.values())
  }

  // Получить сводку игры
  getGameSummary() {
    return {
      duration: this.gameEndTime ? this.gameEndTime - this.gameStartTime : Date.now() - this.gameStartTime,
      nights: this.currentNight,
      days: this.currentDay,
      votings: this.currentVoting,
      totalEvents: this.events.length,
      criticalEvents: this.events.filter(e => e.importance === EVENT_IMPORTANCE.CRITICAL).length,
      playerStats: this.getPlayerStats()
    }
  }

  // Форматированная история для отображения
  getFormattedHistory(importance = null) {
    const actualImportance = importance || EVENT_IMPORTANCE.NORMAL
    const events = this.getHistory(actualImportance)
    const formatted = []
    
    let currentNight = 0
    let currentDay = 0
    let currentVoting = 0
    
    events.forEach(event => {
      const data = event.data
      
      switch (event.type) {
        case EVENT_TYPES.PHASE_CHANGE:
          if (data.to === 'night' && data.night > currentNight) {
            currentNight = data.night
            formatted.push(`\n**Ночь ${currentNight}:**`)
          } else if (data.to === 'day' && data.day > currentDay) {
            currentDay = data.day
            formatted.push(`\n**День ${currentDay}:**`)
          } else if (data.to === 'voting' && data.voting > currentVoting) {
            currentVoting = data.voting
            formatted.push(`\n**Голосование ${currentVoting}:**`)
          }
          break
          
        case EVENT_TYPES.NIGHT_PROTECT:
          formatted.push(`${data.actor.name}(${this.getRoleName(data.actor.role)}) защищает ${data.target.name}(${this.getRoleName(data.target.role)})`)
          break
          
        case EVENT_TYPES.NIGHT_KILL:
          formatted.push(`Оборотни убивают ${data.target.name}`)
          break
          
        case EVENT_TYPES.NIGHT_INVESTIGATE:
          formatted.push(`${data.actor.name}(${this.getRoleName(data.actor.role)}) проверяет ${data.target.name}(${this.getRoleName(data.target.role)})`)
          break
          
        case EVENT_TYPES.NIGHT_CTHULHU_ORDER:
          formatted.push(`${data.actor.name}(Ктулху) отдаёт приказ "${data.details.order}" игроку ${data.target.name}(${this.getRoleName(data.target.role)})`)
          break

        case EVENT_TYPES.NECROMANCER_RESURRECT:
          formatted.push(`${data.actor.name}(${this.getRoleName(data.actor.role)}) воскрешает ${data.target.name}(${this.getRoleName(data.target.role)})`)
          break
          
        case EVENT_TYPES.PLAYER_DEATH:
          const cause = data.cause === 'voting' ? 'голосованием' : 
                       data.cause === 'night' ? 'ночью' : 'охотником'
          formatted.push(`${data.player.name} (${this.getRoleName(data.player.role)}) убит ${cause}`)
          break
          
        case EVENT_TYPES.VOTING_END:
          if (data.eliminated.length > 0) {
            data.eliminated.forEach(player => {
              formatted.push(`Исключён ${player.name} (${this.getRoleName(player.role)})`)
            })
          } else {
            formatted.push(`Никто не исключён (ничья в голосовании)`)
          }
          break
          
        case EVENT_TYPES.CHAT_MESSAGE:
          if (importance === EVENT_IMPORTANCE.NORMAL || importance === EVENT_IMPORTANCE.MINOR) {
            formatted.push(`${data.sender.name}: ${data.message}`)
          }
          break
          
        case EVENT_TYPES.CHAT_WHISPER:
          if (importance === EVENT_IMPORTANCE.NORMAL || importance === EVENT_IMPORTANCE.MINOR) {
            formatted.push(`${data.sender.name} → ${data.recipient.name}: ${data.message}`)
          }
          break
      }
    })
    
    return formatted.join('\n')
  }

  // Вспомогательные методы
  getPlayerName(playerId) {
    for (const [id, stats] of this.playerStats) {
      if (id === playerId) return stats.name
    }
    return 'Неизвестный'
  }

  getPlayerRole(playerId) {
    for (const [id, stats] of this.playerStats) {
      if (id === playerId) return stats.role
    }
    return 'Неизвестная'
  }

  // Сброс истории (при новой игре)
  reset() {
    this.events = []
    this.gameStartTime = null
    this.gameEndTime = null
    this.currentNight = 0
    this.currentDay = 0
    this.currentVoting = 0
    this.playerStats.clear()
  }
}