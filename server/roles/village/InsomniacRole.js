import { BaseRole } from '../BaseRole.js'

export class InsomniacRole extends BaseRole {
  constructor() {
    super('insomniac', {
      name: 'Бессонница',
      description: 'В конце ночи узнает свою текущую роль.',
      team: 'village',
      color: 'blue',
      hasNightAction: true,
      nightOrder: 20, // Последний
      implemented: true,
      phaseHints: {
        night: 'В конце ночи вы узнаете свою роль',
        day: 'Используйте знание своей роли'
      }
    })
  }
  
  async executeNightAction(gameEngine, player, action) {
    const room = gameEngine.room
    const roleInfo = room.getRoleInfo(player.role)
    
    return {
      success: true,
      message: `Ваша роль: ${roleInfo?.name || player.role}`,
      data: {
        currentRole: player.role,
        roleInfo
      }
    }
  }
}