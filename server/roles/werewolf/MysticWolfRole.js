/**
 * Мистический волк - может посмотреть карту игрока ИЛИ участвовать в голосовании
 */

import { BaseRole } from '../BaseRole.js'
import { RoleAbilities } from '../abilities/RoleAbilities.js'
import { ROLE_TEAMS } from '../../utils/constants.js'

export class MysticWolfRole extends BaseRole {
  constructor() {
    super('mystic_wolf', {
      name: 'Мистический волк',
      description: 'Узнает других оборотней, затем может посмотреть карту игрока ИЛИ проголосовать за жертву.',
      team: ROLE_TEAMS.WEREWOLF,
      color: 'red',
      hasNightAction: true,
      nightOrder: 11,
      implemented: true,
      phaseHints: {
        night: 'Сначала найдите оборотней, затем ВЫБЕРИТЕ: посмотреть карту ИЛИ проголосовать',
        day: 'Используйте полученную информацию для обмана жителей'
      }
    })
  }
  
  async executeNightAction(game, player, action) {
    // Сначала всегда находим оборотней
    const werewolvesResult = RoleAbilities.findWerewolves(game, player)
    
    // Если нет действия - предлагаем выбор
    if (!action) {
      return RoleAbilities.createChoice(game, player.id, [
        { id: 'look', name: 'Посмотреть карту игрока', type: 'look_player' },
        { id: 'vote', name: 'Участвовать в голосовании оборотней', type: 'werewolf_vote' }
      ])
    }
    
    this.logAction(player, 'found werewolves', werewolvesResult.werewolves.length.toString())
    
    // Выполняем выбранное действие
    if (action.type === 'look_player' && action.targetId) {
      const lookResult = RoleAbilities.lookAtPlayer(game, player, action.targetId)
      this.notifyPlayer(game, player.id, 
        `Вы видите: ${lookResult.targetName} - ${lookResult.roleName}`)
      
      return {
        werewolves: werewolvesResult,
        looked: lookResult
      }
    }
    
    if (action.type === 'werewolf_vote') {
      // Мистический волк участвует в голосовании оборотней
      return {
        werewolves: werewolvesResult,
        participatesInVote: true
      }
    }
    
    // Пропуск действия
    return RoleAbilities.skipAction(game, player.id, 'Мистический волк пропустил выбор')
  }
  
  getActionChoices(game, player) {
    return [
      {
        id: 'look_player',
        name: 'Посмотреть карту игрока',
        description: 'Узнать роль одного игрока',
        targets: RoleAbilities.getValidTargets(game, player.id)
      },
      {
        id: 'werewolf_vote', 
        name: 'Голосовать за жертву',
        description: 'Участвовать в голосовании оборотней за жертву',
        targets: RoleAbilities.getValidTargets(game, player.id).filter(t => {
          const role = game.room.getRole(game.room.getPlayer(t.id)?.role)
          return role && role.team !== ROLE_TEAMS.WEREWOLF
        })
      }
    ]
  }
  
  canSkipAction() {
    return true
  }
}