/**
 * Неудачник - побеждает только если его убивают
 */

import { BaseRole } from '../BaseRole.js'
import { RoleAbilities } from '../abilities/RoleAbilities.js'
import { ROLE_TEAMS } from '../../utils/constants.js'

export class TannerRole extends BaseRole {
  constructor() {
    super('tanner', {
      name: 'Неудачник',
      description: 'Побеждает только если его убивают голосованием. Если он умирает - все остальные проигрывают.',
      team: ROLE_TEAMS.TANNER,
      color: 'brown',
      hasNightAction: false,
      implemented: true,
      phaseHints: {
        day: 'Ведите себя подозрительно! Ваша цель - чтобы вас убили голосованием',
        night: 'Вы спите. Жители с ночными способностями выполняют действия'
      }
    })
  }
  
  async executeNightAction(game, player) {
    return RoleAbilities.skipAction(game, player.id, 'Неудачник не имеет ночного действия')
  }
}