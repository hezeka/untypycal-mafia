/**
 * Грабитель - может поменяться ролями с другим игроком
 */

import { BaseRole } from '../BaseRole.js'
import { ROLE_TEAMS } from '../../utils/constants.js'

export class RobberRole extends BaseRole {
  constructor() {
    super('robber', {
      name: 'Грабитель',
      description: 'Ночью может поменяться ролями с другим игроком и узнать свою новую роль.',
      team: ROLE_TEAMS.VILLAGE,
      color: 'blue',
      hasNightAction: true,
      nightOrder: 7,
      implemented: true,
      phaseHints: {
        introduction: 'Попробуйте понять, с кем стоит поменяться ролями',
        night: 'Выберите игрока для обмена ролями',
        day: 'Помните - теперь у вас новая роль и новые цели',
        voting: 'Играйте за свою НОВУЮ роль'
      }
    })
  }
  
  /**
   * Ночное действие грабителя
   */
  async executeNightAction(game, player, action) {
    if (!action || !action.targetId) {
      // Автоматическое действие - меняемся со случайным игроком
      return await this.swapWithRandomPlayer(game, player)
    }
    
    if (action.type === 'swap_roles') {
      return await this.swapRolesAction(game, player, action.targetId)
    }
    
    return null
  }
  
  /**
   * Обмен ролями с выбранным игроком
   */
  async swapRolesAction(game, player, targetId) {
    const target = game.room.getPlayer(targetId)
    
    if (!target || target.id === player.id) {
      return null
    }
    
    const originalPlayerRole = player.role
    const originalTargetRole = target.role
    
    // Выполняем обмен
    const swapSuccess = this.swapRoles(game, player, target)
    
    if (!swapSuccess) {
      return null
    }
    
    this.logAction(player, 'swapped roles with', target.name)
    
    // Сообщаем грабителю его новую роль
    const newRole = game.room.getRole(player.role)
    this.notifyPlayer(game, player.id, 
      `🔄 Вы поменялись ролями с ${target.name}. Теперь вы: ${newRole?.name || 'Неизвестная роль'}`
    )
    
    return {
      roleChanges: [{
        playerId: player.id,
        playerName: player.name,
        oldRole: originalPlayerRole,
        newRole: target.role
      }, {
        playerId: target.id,
        playerName: target.name,
        oldRole: originalTargetRole,
        newRole: originalPlayerRole
      }]
    }
  }
  
  /**
   * Автоматический обмен со случайным игроком
   */
  async swapWithRandomPlayer(game, player) {
    const availableTargets = this.getAvailableTargets(game, player)
    
    if (availableTargets.length === 0) {
      return null
    }
    
    const randomTarget = availableTargets[Math.floor(Math.random() * availableTargets.length)]
    
    return await this.swapRolesAction(game, player, randomTarget.id)
  }
  
  /**
   * Валидация действия грабителя
   */
  validateNightAction(game, player, action) {
    const baseValidation = super.validateNightAction(game, player, action)
    if (!baseValidation.valid) return baseValidation
    
    if (action.type === 'swap_roles') {
      const target = game.room.getPlayer(action.targetId)
      
      if (!target) {
        return { valid: false, error: 'Игрок не найден' }
      }
      
      if (target.id === player.id) {
        return { valid: false, error: 'Нельзя поменяться ролями с самим собой' }
      }
      
      if (!target.alive) {
        return { valid: false, error: 'Нельзя поменяться ролями с мертвым игроком' }
      }
    }
    
    return { valid: true }
  }
  
  /**
   * Получение доступных целей (все живые игроки кроме себя)
   */
  getAvailableTargets(game, player) {
    return game.getAlivePlayers().filter(p => p.id !== player.id)
  }
  
  /**
   * Проверка может ли грабитель поменяться с целью
   */
  canSwapWith(game, player, target) {
    if (!target || !target.alive) return false
    if (target.id === player.id) return false
    
    // Грабитель может поменяться с любым живым игроком
    return true
  }
}