import { GAME_PHASES, PHASE_DURATIONS } from '../utils/constants.js'
import { getNightRoles, executeRoleAction } from '../roles/rolesList.js'

export class GameEngine {
  constructor(room) {
    this.room = room
    this.currentPhase = GAME_PHASES.SETUP
    this.phaseTimer = null
    this.nightActionIndex = 0
    this.nightRoles = []
    this.killedPlayers = []
    this.protectedPlayers = []
  }

  startGame() {
    this.assignRoles()
    this.setPhase(GAME_PHASES.INTRODUCTION)
  }

  assignRoles() {
    const players = Array.from(this.room.players.values()).filter(p => p.role !== 'game_master')
    const roles = [...this.room.selectedRoles]
    
    // Перемешиваем роли
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]]
    }
    
    // Назначаем роли игрокам
    players.forEach((player, index) => {
      if (index < roles.length) {
        player.role = roles[index]
      }
    })
    
    // Оставшиеся роли - центральные карты
    this.room.centerCards = roles.slice(players.length)
  }

  setPhase(newPhase) {
    this.currentPhase = newPhase
    this.room.gameState = newPhase
    
    // Обновляем права чата
    this.updateChatPermissions()
    
    // Запускаем таймер
    this.startPhaseTimer()
    
    // Специальная логика для фаз
    switch (newPhase) {
      case GAME_PHASES.NIGHT:
        this.startNightPhase()
        break
      case GAME_PHASES.DAY:
        this.announceNightResults()
        break
      case GAME_PHASES.VOTING:
        this.room.votes.clear()
        this.room.votingActive = true
        break
    }
    
    this.room.broadcast('phase-changed', {
      phase: newPhase,
      timer: PHASE_DURATIONS[newPhase] || 0
    })
  }

  updateChatPermissions() {
    switch (this.currentPhase) {
      case GAME_PHASES.INTRODUCTION:
      case GAME_PHASES.DAY:
        this.room.chatPermissions = {
          canChat: true,
          canSeeAll: true,
          canWhisper: true,
          werewolfChat: false
        }
        break
      case GAME_PHASES.NIGHT:
        this.room.chatPermissions = {
          canChat: false,
          canSeeAll: false,
          canWhisper: true,
          werewolfChat: true
        }
        break
      case GAME_PHASES.VOTING:
        this.room.chatPermissions = {
          canChat: false,
          canSeeAll: false,
          canWhisper: true,
          werewolfChat: false
        }
        break
    }
  }

  startPhaseTimer() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
    }
    
    const duration = PHASE_DURATIONS[this.currentPhase]
    if (duration) {
      this.phaseTimer = setTimeout(() => {
        this.nextPhase()
      }, duration * 1000)
    }
  }

  nextPhase() {
    switch (this.currentPhase) {
      case GAME_PHASES.INTRODUCTION:
        this.setPhase(GAME_PHASES.NIGHT)
        break
      case GAME_PHASES.NIGHT:
        this.setPhase(GAME_PHASES.DAY)
        break
      case GAME_PHASES.DAY:
        this.setPhase(GAME_PHASES.VOTING)
        break
      case GAME_PHASES.VOTING:
        this.processVoting()
        if (this.checkWinConditions()) {
          this.setPhase(GAME_PHASES.ENDED)
        } else {
          this.setPhase(GAME_PHASES.NIGHT)
        }
        break
    }
  }

  startNightPhase() {
    this.killedPlayers = []
    this.protectedPlayers = []
    this.nightActionIndex = 0
    
    const players = Array.from(this.room.players.values())
    const playerRoles = players.map(p => p.role).filter(r => r && r !== 'game_master')
    
    this.nightRoles = getNightRoles(playerRoles)
    this.processNextNightAction()
  }

  async processNextNightAction() {
    if (this.nightActionIndex >= this.nightRoles.length) {
      // Все действия выполнены, переходим к дню
      setTimeout(() => this.nextPhase(), 2000)
      return
    }

    const currentRole = this.nightRoles[this.nightActionIndex]
    const players = this.getPlayersWithRole(currentRole.id)
    
    if (players.length > 0) {
      // Уведомляем игроков об их ходе
      players.forEach(player => {
        this.room.sendToPlayer(player.id, 'night-action-turn', {
          role: currentRole.id,
          timeLimit: 30
        })
      })
      
      // Ждем 30 секунд на действие
      setTimeout(() => {
        this.nightActionIndex++
        this.processNextNightAction()
      }, 30000)
    } else {
      // Нет игроков с этой ролью, пропускаем
      this.nightActionIndex++
      this.processNextNightAction()
    }
  }

  getPlayersWithRole(roleId) {
    return Array.from(this.room.players.values())
      .filter(p => p.role === roleId && p.alive)
  }

  async executeNightAction(playerId, action) {
    const player = this.room.getPlayer(playerId)
    if (!player || !player.alive) return { error: 'Игрок не найден' }

    const currentRole = this.nightRoles[this.nightActionIndex]
    if (!currentRole || player.role !== currentRole.id) {
      return { error: 'Сейчас не ваш ход' }
    }

    try {
      const result = await executeRoleAction(this, player, action)
      return result
    } catch (error) {
      return { error: error.message }
    }
  }

  announceNightResults() {
    const messages = []
    
    if (this.killedPlayers.length > 0) {
      this.killedPlayers.forEach(playerId => {
        const player = this.room.getPlayer(playerId)
        if (player) {
          player.alive = false
          messages.push(`${player.name} был убит ночью`)
        }
      })
    } else {
      messages.push('Ночь прошла спокойно')
    }
    
    messages.forEach(msg => {
      this.room.addSystemMessage(msg, 'game-event')
    })
  }

  processVoting() {
    this.room.votingActive = false
    const result = this.room.countVotes()
    
    // Исключаем игрока(ов) с наибольшим количеством голосов
    if (result.eliminated.length > 0) {
      result.eliminated.forEach(playerId => {
        const player = this.room.getPlayer(playerId)
        if (player) {
          player.alive = false
          this.room.addSystemMessage(`${player.name} был исключен голосованием`, 'voting-result')
        }
      })
    } else {
      this.room.addSystemMessage('Никто не был исключен', 'voting-result')
    }
    
    // Показываем результаты голосования
    this.room.broadcast('voting-ended', result)
  }

  checkWinConditions() {
    const alivePlayers = Array.from(this.room.players.values()).filter(p => p.alive)
    const deadPlayers = Array.from(this.room.players.values()).filter(p => !p.alive)
    
    // 1. Неудачник убит - он побеждает
    const tannerKilled = deadPlayers.find(p => p.role === 'tanner')
    if (tannerKilled) {
      this.endGame('tanner', [tannerKilled.id])
      return true
    }
    
    // 2. Хотя бы один оборотень убит - победа деревни
    const werewolfKilled = deadPlayers.find(p => p.role?.includes('werewolf') && p.role !== 'minion')
    if (werewolfKilled) {
      const villageWinners = alivePlayers.filter(p => 
        ['village', 'special'].includes(this.getTeam(p.role)) || p.role === 'minion'
      )
      this.endGame('village', villageWinners.map(p => p.id))
      return true
    }
    
    // 3. Все жители убиты - победа оборотней
    const aliveVillagers = alivePlayers.filter(p => 
      this.getTeam(p.role) === 'village' || p.role === 'tanner'
    )
    if (aliveVillagers.length === 0) {
      const werewolfWinners = alivePlayers.filter(p => 
        this.getTeam(p.role) === 'werewolf'
      )
      this.endGame('werewolf', werewolfWinners.map(p => p.id))
      return true
    }
    
    return false
  }

  getTeam(roleId) {
    const { getRole } = require('../utils/gameHelpers.js')
    const roleInfo = getRole(roleId)
    return roleInfo?.team || 'village'
  }

  endGame(winnerTeam, winnerIds) {
    this.room.gameResult = {
      winnerTeam,
      winners: winnerIds,
      endedAt: Date.now()
    }
    
    this.room.addSystemMessage(`Игра окончена! Победила команда: ${this.getTeamName(winnerTeam)}`, 'game-end')
  }

  getTeamName(team) {
    const names = {
      village: 'Деревня',
      werewolf: 'Оборотни',
      tanner: 'Неудачник'
    }
    return names[team] || team
  }

  // Методы для ролей
  killPlayer(playerId) {
    if (!this.protectedPlayers.includes(playerId)) {
      this.killedPlayers.push(playerId)
    }
  }

  protectPlayer(playerId) {
    this.protectedPlayers.push(playerId)
  }

  swapRoles(playerId1, playerId2) {
    const player1 = this.room.getPlayer(playerId1)
    const player2 = this.room.getPlayer(playerId2)
    
    if (player1 && player2) {
      const temp = player1.role
      player1.role = player2.role
      player2.role = temp
    }
  }

  swapWithCenter(playerId, centerIndex = 0) {
    const player = this.room.getPlayer(playerId)
    if (player && this.room.centerCards[centerIndex]) {
      const temp = player.role
      player.role = this.room.centerCards[centerIndex]
      this.room.centerCards[centerIndex] = temp
    }
  }

  destroy() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
    }
  }
}