/**
 * Доппельгангер - копирует роль и выполняет ее действие
 */

import { BaseRole } from '../BaseRole.js'
import { RoleAbilities } from '../abilities/RoleAbilities.js'
import { ROLE_TEAMS } from '../../utils/constants.js'

export class DoppelgangerRole extends BaseRole {
  constructor() {
    super('doppelganger', {
      name: 'Доппельгангер',
      description: 'Копирует роль увиденного игрока и становится ею. Если у роли есть ночное действие - выполняет его.',
      team: ROLE_TEAMS.SPECIAL,
      color: 'purple',
      hasNightAction: true,
      nightOrder: 2,
      implemented: true,
      phaseHints: {
        night: 'Посмотрите карту игрока и скопируйте его роль',
        day: 'Играйте за роль которую скопировали. Ваша команда могла измениться!'
      }
    })
  }
  
  async executeNightAction(game, player, action) {
    if (!action) {
      return this.handleAutoAction(game, player)
    }
    
    if (action.type === 'copy_role' && action.targetId) {
      const target = game.room.getPlayer(action.targetId)
      if (!target || target.id === player.id) {
        return RoleAbilities.skipAction(game, player.id, 'Некорректная цель')
      }
      
      // Копируем роль
      const copyResult = RoleAbilities.copyRole(game, player.id, action.targetId)
      
      this.logAction(player, 'copied role', `${copyResult.target.name} (${copyResult.target.role})`)
      this.notifyPlayer(game, player.id, 
        `Вы скопировали роль: ${copyResult.target.name} - ${game.room.getRole(copyResult.target.role)?.name}`)
      
      // Если у скопированной роли есть ночное действие - выполняем его
      const copiedRole = game.room.getRole(copyResult.copier.newRole)
      if (copiedRole && copiedRole.hasNightAction) {
        this.notifyPlayer(game, player.id, 
          `У скопированной роли есть ночное действие. Выполните его сейчас.`)
        
        // Создаем вторичное действие для скопированной роли
        return {
          copied: copyResult,
          requiresSecondaryAction: true,
          newRole: copiedRole.id
        }
      }
      
      return { copied: copyResult }
    }
    
    // Вторичное действие скопированной роли
    if (action.type === 'secondary_action' && action.secondaryAction) {
      const copiedRole = game.room.getRole(player.role)
      if (copiedRole && copiedRole.hasNightAction) {
        try {
          const result = await copiedRole.executeNightAction(game, player, action.secondaryAction)
          return { secondaryResult: result }
        } catch (error) {
          return RoleAbilities.skipAction(game, player.id, 'Ошибка выполнения скопированного действия')
        }
      }
    }
    
    return RoleAbilities.skipAction(game, player.id, 'Некорректное действие')
  }
  
  async handleAutoAction(game, player) {
    const targets = RoleAbilities.getValidTargets(game, player.id)
    
    if (targets.length === 0) {
      return RoleAbilities.skipAction(game, player.id, 'Нет доступных целей')
    }
    
    // Случайно выбираем игрока
    const randomTarget = targets[Math.floor(Math.random() * targets.length)]
    const copyResult = RoleAbilities.copyRole(game, player.id, randomTarget.id)
    
    this.logAction(player, 'auto copied role', randomTarget.name)
    this.notifyPlayer(game, player.id, 
      `Вы автоматически скопировали роль: ${randomTarget.name}`)
    
    return { copied: copyResult }
  }
  
  getActionChoices(game, player) {
    return [{
      id: 'copy_role',
      name: 'Скопировать роль игрока',
      description: 'Посмотреть карту игрока и стать его ролью',
      targets: RoleAbilities.getValidTargets(game, player.id)
    }]
  }
  
  canSkipAction() {
    return false // Доппельгангер ДОЛЖЕН скопировать роль
  }
}