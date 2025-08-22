/**
 * Провидец - может посмотреть роль игрока ИЛИ две карты из центра
 */

import { BaseRole } from '../BaseRole.js'
import { RoleAbilities } from '../abilities/RoleAbilities.js'
import { ROLE_TEAMS } from '../../utils/constants.js'

export class SeerRole extends BaseRole {
  constructor() {
    super('seer', {
      name: 'Провидец',
      description: 'Ночью может посмотреть роль одного игрока ИЛИ две карты из центра.',
      team: ROLE_TEAMS.VILLAGE,
      color: 'blue',
      hasNightAction: true,
      nightOrder: 6,
      implemented: true,
      phaseHints: {
        night: 'ВЫБЕРИТЕ: посмотреть роль игрока ИЛИ две карты из центра',
        day: 'Поделитесь информацией чтобы помочь деревне'
      }
    })
  }
  
  async executeNightAction(game, player, action) {
    if (!action) {
      return RoleAbilities.createChoice(game, player.id, [
        { id: 'look_player', name: 'Посмотреть роль игрока', type: 'look_player' },
        { id: 'look_center', name: 'Посмотреть две карты из центра', type: 'look_center' }
      ])
    }
    
    if (action.type === 'look_player' && action.targetId) {
      const result = RoleAbilities.lookAtPlayer(game, player, action.targetId)
      
      this.logAction(player, 'looked at player', result.targetName)
      this.notifyPlayer(game, player.id, 
        `Вы видите: ${result.targetName} - ${result.roleName}`)
      
      return { looked: result }
    }
    
    if (action.type === 'look_center') {
      const result = RoleAbilities.lookAtCenter(game, player, [0, 1])
      
      this.logAction(player, 'looked at center cards')
      
      const cardNames = result.cards.map(c => c.roleName).join(', ')
      this.notifyPlayer(game, player.id, `В центре: ${cardNames}`)
      
      return { centerCards: result }
    }
    
    return RoleAbilities.skipAction(game, player.id, 'Провидец пропустил выбор')
  }
  
  getActionChoices(game, player) {
    return [
      {
        id: 'look_player',
        name: 'Посмотреть роль игрока',
        description: 'Узнать роль одного игрока',
        targets: RoleAbilities.getValidTargets(game, player.id)
      },
      {
        id: 'look_center',
        name: 'Посмотреть карты центра',
        description: 'Узнать две карты из центра стола',
        targets: [] // Не требует цели
      }
    ]
  }
}