/**
 * Главный игровой движок для "Нетипичной Мафии"
 * Простая реализация без over-engineering
 */

import { PhaseManager } from './PhaseManager.js'
import { WinConditions } from './WinConditions.js'
import { EventBus } from '../utils/EventBus.js'
import { GAME_PHASES, PHASE_DURATIONS, SOCKET_EVENTS } from '../utils/constants.js'

export class GameEngine {
  constructor(room) {
    this.room = room
    this.phaseManager = new PhaseManager(this)
    this.winConditions = new WinConditions(this)
    this.eventBus = new EventBus()
    
    // Простое состояние игры
    this.state = {
      phase: GAME_PHASES.SETUP,
      timer: null,
      isFirstRound: true,
      actionQueue: [],
      centerCards: [], // 3 карты в центре для ONUW
      artifacts: new Map(), // Артефакты ролей (щиты, превращения)
      nightResults: null // Результаты ночи
    }
    
    this.setupEventListeners()
  }
  
  /**
   * Начало игры - переход к фазе знакомства
   */
  startGame() {
    console.log(`🎮 Starting game in room ${this.room.id}`)
    
    this.distributeRoles()
    this.changePhase(GAME_PHASES.INTRODUCTION)
    
    this.eventBus.emit('game-started', {
      roomId: this.room.id,
      players: this.getAlivePlayers()
    })
  }
  
  /**
   * Переход к следующей фазе
   */
  nextPhase() {
    const currentPhase = this.state.phase
    const nextPhase = this.phaseManager.getNextPhase(currentPhase)
    
    if (nextPhase === GAME_PHASES.ENDED) {
      return this.endGame()
    }
    
    this.changePhase(nextPhase)
  }
  
  /**
   * Смена фазы с таймером
   */
  changePhase(newPhase) {
    const oldPhase = this.state.phase
    this.state.phase = newPhase
    
    // Очищаем старый таймер
    if (this.state.timer) {
      clearTimeout(this.state.timer)
      this.state.timer = null
    }
    
    console.log(`📅 Phase changed: ${oldPhase} → ${newPhase}`)
    
    // Обработка фазы
    this.handlePhaseStart(newPhase)
    
    // Уведомляем всех о смене фазы
    this.room.broadcast('phase-changed', {
      phase: newPhase,
      duration: PHASE_DURATIONS[newPhase] || null,
      phaseData: this.getPhaseData(newPhase)
    })
    
    // Запускаем таймер если нужен
    const duration = PHASE_DURATIONS[newPhase]
    if (duration) {
      this.startPhaseTimer(duration)
    }
    
    this.eventBus.emit('phase-changed', { oldPhase, newPhase, game: this })
  }
  
  /**
   * Обработка начала фазы
   */
  handlePhaseStart(phase) {
    switch (phase) {
      case GAME_PHASES.INTRODUCTION:
        this.handleIntroductionStart()
        break
        
      case GAME_PHASES.NIGHT:
        this.handleNightStart()
        break
        
      case GAME_PHASES.DAY:
        this.handleDayStart()
        break
        
      case GAME_PHASES.VOTING:
        this.handleVotingStart()
        break
    }
  }
  
  /**
   * Фаза знакомства - игроки представляются
   */
  handleIntroductionStart() {
    this.room.updateChatPermissions({
      canChat: true,
      canSeeAll: true,
      canWhisper: true
    })
    
    // Системное сообщение
    this.room.addSystemMessage(
      'Фаза знакомства началась! Расскажите о себе и своих подозрениях. ' +
      'Можете называть свои роли (правдиво или ложно).'
    )
  }
  
  /**
   * Ночная фаза - выполнение ночных действий
   */
  handleNightStart() {
    console.log('🌙 Starting night phase')
    
    this.room.updateChatPermissions({
      canChat: false,
      canSeeAll: false,
      canWhisper: true,
      werewolfChat: true // Только оборотни видят сообщения друг друга
    })
    
    // Очищаем результаты предыдущей ночи
    this.state.nightResults = {
      kills: [],
      protections: [],
      roleChanges: [],
      revealed: []
    }
    
    // Запускаем ночные действия
    this.executeNightActions()
  }
  
  /**
   * Дневная фаза - обсуждение
   */
  handleDayStart() {
    console.log('☀️ Starting day phase')
    
    this.room.updateChatPermissions({
      canChat: true,
      canSeeAll: true,
      canWhisper: true
    })
    
    // Объявляем результаты ночи
    this.announceNightResults()
  }
  
  /**
   * Фаза голосования
   */
  handleVotingStart() {
    console.log('🗳️ Starting voting phase')
    
    this.room.updateChatPermissions({
      canChat: false, // Полная тишина
      canSeeAll: false,
      canWhisper: true // Только шепот ведущему
    })
    
    this.room.startVoting()
  }
  
  /**
   * Выполнение ночных действий согласно ONUW порядку
   */
  async executeNightActions() {
    const nightRoles = this.getNightRoles()
    
    for (const role of nightRoles) {
      await this.executeRoleAction(role)
      
      // Пауза между действиями ролей
      await this.sleep(500)
    }
  }
  
  /**
   * Получение ролей с ночными действиями в правильном порядке
   */
  getNightRoles() {
    return this.getAlivePlayers()
      .filter(player => {
        const role = this.room.getRole(player.role)
        return role && role.hasNightAction
      })
      .sort((a, b) => {
        const roleA = this.room.getRole(a.role)
        const roleB = this.room.getRole(b.role)
        return (roleA.nightOrder || 999) - (roleB.nightOrder || 999)
      })
  }
  
  /**
   * Выполнение действия роли
   */
  async executeRoleAction(player) {
    const role = this.room.getRole(player.role)
    if (!role) return
    
    console.log(`🎭 Executing ${role.name} action for ${player.name}`)
    
    try {
      const result = await role.executeNightAction(this, player)
      
      if (result) {
        this.state.nightResults = {
          ...this.state.nightResults,
          ...result
        }
      }
      
    } catch (error) {
      console.error(`❌ Error executing ${role.name} action:`, error)
    }
  }
  
  /**
   * Объявление результатов ночи
   */
  announceNightResults() {
    const results = this.state.nightResults
    
    if (results.kills.length > 0) {
      const killedNames = results.kills.map(p => p.name).join(', ')
      
      if (results.protections.some(p => results.kills.includes(p))) {
        this.room.addSystemMessage(`🛡️ Щит сработал! Никто не погиб.`)
      } else {
        this.room.addSystemMessage(`💀 Прошлой ночью погиб: ${killedNames}`)
        
        // Убиваем игроков
        results.kills.forEach(player => {
          this.room.killPlayer(player.id)
        })
      }
    } else {
      this.room.addSystemMessage(`😴 Прошлой ночью все спали спокойно.`)
    }
    
    // Другие результаты ночи
    if (results.roleChanges.length > 0) {
      results.roleChanges.forEach(change => {
        console.log(`🔄 Role change: ${change.player.name} → ${change.newRole}`)
      })
    }
  }
  
  /**
   * Проверка условий победы
   */
  checkWinConditions() {
    return this.winConditions.check()
  }
  
  /**
   * Завершение игры
   */
  endGame() {
    const winResult = this.checkWinConditions()
    
    this.state.phase = GAME_PHASES.ENDED
    
    this.room.broadcast('game-ended', {
      result: winResult,
      finalStats: this.getFinalStats()
    })
    
    console.log(`🏁 Game ended in room ${this.room.id}:`, winResult)
    
    this.eventBus.emit('game-ended', { game: this, result: winResult })
  }
  
  /**
   * Запуск таймера фазы
   */
  startPhaseTimer(duration) {
    this.state.timer = setTimeout(() => {
      console.log(`⏰ Phase timer expired for ${this.state.phase}`)
      
      // Особая обработка для голосования
      if (this.state.phase === GAME_PHASES.VOTING) {
        this.handleVotingTimeout()
      } else {
        this.nextPhase()
      }
    }, duration * 1000)
  }

  /**
   * Обработка истечения времени голосования
   */
  handleVotingTimeout() {
    console.log('🗳️ Voting timeout - adding abstain votes for non-voters')
    
    // Получаем всех игроков которые могут голосовать
    const votingPlayers = Array.from(this.room.players.values())
      .filter(p => p.alive && p.role !== 'game_master')
    
    // Добавляем воздержание для тех кто не проголосовал
    votingPlayers.forEach(player => {
      if (!this.room.votes.has(player.id)) {
        console.log(`🗳️ Adding abstain vote for ${player.name}`)
        this.room.votes.set(player.id, null)
      }
    })
    
    // Завершаем голосование
    const results = this.room.endVoting()
    
    // Уведомляем всех о завершении голосования
    this.room.broadcast(SOCKET_EVENTS.VOTING_ENDED, {
      results
    })
    
    // Переходим к следующей фазе
    this.nextPhase()
  }
  
  /**
   * Раздача ролей игрокам
   */
  distributeRoles() {
    const players = this.getPlayersForRoleDistribution()
    const selectedRoles = [...this.room.selectedRoles]
    
    console.log(`🎭 Distributing roles to ${players.length} players:`, players.map(p => p.name))
    console.log(`🎭 Available roles:`, selectedRoles)
    
    // Перемешиваем роли
    for (let i = selectedRoles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedRoles[i], selectedRoles[j]] = [selectedRoles[j], selectedRoles[i]]
    }
    
    console.log(`🎭 Shuffled roles:`, selectedRoles)
    
    // Раздаем роли игрокам
    for (let i = 0; i < players.length; i++) {
      if (selectedRoles[i]) {
        console.log(`🎭 Assigning ${selectedRoles[i]} to ${players[i].name}`)
        this.room.assignRole(players[i].id, selectedRoles[i])
      }
    }
    
    // Оставшиеся роли уходят в центр (для ONUW механик)
    this.state.centerCards = selectedRoles.slice(players.length)
    
    console.log(`🎭 Roles distributed. Center cards: ${this.state.centerCards.join(', ')}`)
    
    // Логируем финальное состояние всех игроков
    const allPlayers = Array.from(this.room.players.values())
    console.log(`🎭 Final player roles:`, allPlayers.map(p => `${p.name}: ${p.role || 'null'}`))
  }
  
  /**
   * Получение данных фазы для клиента
   */
  getPhaseData(phase) {
    switch (phase) {
      case GAME_PHASES.NIGHT:
        return {
          canAct: this.canPlayerActAtNight.bind(this),
          nightOrder: this.getNightRoles().map(p => ({
            player: p.name,
            role: p.role,
            order: this.room.getRole(p.role)?.nightOrder || 999
          }))
        }
        
      case GAME_PHASES.VOTING:
        return {
          canVote: true,
          alivePlayers: this.getAlivePlayers().map(p => ({
            id: p.id,
            name: p.name
          }))
        }
        
      default:
        return {}
    }
  }
  
  /**
   * Проверка может ли игрок действовать ночью
   */
  canPlayerActAtNight(playerId) {
    const player = this.room.getPlayer(playerId)
    if (!player || !player.alive) return false
    
    const role = this.room.getRole(player.role)
    return role && role.hasNightAction
  }
  
  /**
   * Получение живых игроков (исключая ведущего)
   */
  getAlivePlayers() {
    return Array.from(this.room.players.values()).filter(p => p.alive && p.role !== 'game_master')
  }
  
  /**
   * Получение игроков для распределения ролей (без ролей, живые, не ведущий)
   */
  getPlayersForRoleDistribution() {
    return Array.from(this.room.players.values()).filter(p => 
      p.alive && 
      (p.role === null || p.role === undefined) && 
      p.role !== 'game_master'
    )
  }
  
  /**
   * Получение статистики игры
   */
  getFinalStats() {
    const players = Array.from(this.room.players.values())
    
    return {
      totalPlayers: players.length,
      alivePlayers: players.filter(p => p.alive).length,
      rounds: this.state.isFirstRound ? 1 : 2,
      duration: Date.now() - this.room.createdAt
    }
  }
  
  /**
   * Настройка слушателей событий
   */
  setupEventListeners() {
    this.eventBus.on('player-killed', (data) => {
      this.checkWinConditions()
    })
    
    this.eventBus.on('voting-completed', (data) => {
      this.handleVotingResults(data)
    })
  }
  
  /**
   * Обработка результатов голосования
   */
  handleVotingResults(data) {
    const { eliminated } = data
    
    if (eliminated) {
      this.room.killPlayer(eliminated.id)
      this.room.addSystemMessage(`⚖️ Голосованием исключен: ${eliminated.name}`)
    }
    
    // Проверяем условия победы
    const winResult = this.checkWinConditions()
    if (winResult) {
      this.endGame()
    } else {
      // Начинаем новый цикл
      this.state.isFirstRound = false
      this.nextPhase()
    }
  }
  
  /**
   * Утилита для задержки
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  /**
   * Очистка ресурсов
   */
  destroy() {
    if (this.state.timer) {
      clearTimeout(this.state.timer)
    }
    
    this.eventBus.removeAllListeners()
    console.log(`🧹 GameEngine destroyed for room ${this.room.id}`)
  }
}