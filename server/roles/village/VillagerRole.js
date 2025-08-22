/**
 * Житель деревни - базовая роль без способностей
 */

import { BaseRole } from '../BaseRole.js'
import { ROLE_TEAMS } from '../../utils/constants.js'

export class VillagerRole extends BaseRole {
  constructor() {
    super('villager', {
      name: 'Житель',
      description: 'Обычный житель деревни. Побеждает если убит хотя бы один оборотень.',
      team: ROLE_TEAMS.VILLAGE,
      color: 'blue',
      hasNightAction: false,
      implemented: true,
      phaseHints: {
        introduction: 'Представьтесь и выясните, кто может быть оборотнем',
        day: 'Анализируйте поведение игроков и ищите противоречия',
        voting: 'Голосуйте за самого подозрительного игрока'
      }
    })
  }
  
  /**
   * У жителя нет ночного действия
   */
  async executeNightAction(game, player) {
    return null
  }
  
  /**
   * Жители могут голосовать за любого
   */
  getAvailableTargets(game, player) {
    return game.getAlivePlayers().filter(p => p.id !== player.id)
  }
}