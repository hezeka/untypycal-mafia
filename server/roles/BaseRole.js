/**
 * Базовый класс для всех ролей - простой интерфейс
 */

import { ROLE_TEAMS, NIGHT_ORDER } from '../utils/constants.js'
import { RoleAbilities } from './abilities/RoleAbilities.js'

export class BaseRole {
  constructor(id, config = {}) {
    this.id = id
    this.name = config.name || id
    this.description = config.description || ''
    this.team = config.team || ROLE_TEAMS.VILLAGE
    this.color = config.color || 'blue'
    this.hasNightAction = config.hasNightAction || false
    this.nightOrder = config.nightOrder || NIGHT_ORDER[id.toUpperCase()] || 999
    this.implemented = config.implemented !== false
    this.phaseHints = config.phaseHints || {}
  }
  
  /**
   * Выполнение ночного действия - переопределяется в дочерних классах
   */
  async executeNightAction(game, player, action = null) {
    if (!this.hasNightAction) {
      return RoleAbilities.skipAction(game, player.id, 'У роли нет ночного действия')
    }
    
    // Если действие не передано и роль может пропустить - пропускаем
    if (!action) {
      return this.handleAutoAction(game, player)
    }
    
    // Проверяем может ли игрок выполнить действие
    if (!RoleAbilities.canPerformAction(game, player.id, action.type)) {
      return RoleAbilities.skipAction(game, player.id, 'Действие недоступно')
    }
    
    throw new Error(`Night action not implemented for role: ${this.id}`)
  }
  
  /**
   * Автоматическое действие если игрок не выбрал
   */
  async handleAutoAction(game, player) {
    return RoleAbilities.skipAction(game, player.id, 'Игрок не выбрал действие')
  }
  
  /**
   * Валидация ночного действия
   */
  validateNightAction(game, player, action) {
    if (!this.hasNightAction) {
      return { valid: false, error: 'У этой роли нет ночного действия' }
    }
    
    if (!player.alive) {
      return { valid: false, error: 'Мертвые игроки не могут действовать' }
    }
    
    if (game.state.phase !== 'night') {
      return { valid: false, error: 'Действие доступно только ночью' }
    }
    
    return { valid: true }
  }
  
  /**
   * Получение возможных целей для действия
   */
  getAvailableTargets(game, player) {
    if (!this.hasNightAction) return []
    return RoleAbilities.getValidTargets(game, player.id)
  }
  
  /**
   * Получение вариантов действий для UI
   */
  getActionChoices(game, player) {
    return []
  }
  
  /**
   * Проверка может ли роль пропустить действие
   */
  canSkipAction() {
    return true // По умолчанию все роли могут пропустить
  }
  
  /**
   * Получение информации о роли для клиента
   */
  getClientInfo() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      team: this.team,
      color: this.color,
      hasNightAction: this.hasNightAction,
      implemented: this.implemented,
      phaseHints: this.phaseHints,
      canSkip: this.canSkipAction()
    }
  }
  
  /**
   * Получение подсказки для фазы
   */
  getPhaseHint(phase) {
    return this.phaseHints[phase] || ''
  }
  
  /**
   * Проверки команд
   */
  isTeam(team) {
    return this.team === team
  }
  
  isWerewolf() {
    return this.team === ROLE_TEAMS.WEREWOLF
  }
  
  isVillager() {
    return this.team === ROLE_TEAMS.VILLAGE
  }
  
  isTanner() {
    return this.team === ROLE_TEAMS.TANNER
  }
  
  /**
   * Уведомление игрока
   */
  notifyPlayer(game, playerId, message) {
    game.room.sendToPlayer(playerId, 'role-action-result', {
      message,
      timestamp: Date.now()
    })
  }
  
  /**
   * Логирование действия
   */
  logAction(player, action, details = '') {
    console.log(`🎭 ${this.name} (${player.name}): ${action}${details ? ' - ' + details : ''}`)
  }
}