import { BaseRole } from '../BaseRole.js'

export class DrunkRole extends BaseRole {
  constructor() {
    super('drunk', {
      name: 'Пьяница',
      description: 'Ночью меняет роль с центральной картой (не узнает новую).',
      team: 'village',
      color: 'blue',
      hasNightAction: true,
      nightOrder: 9,
      implemented: true,
      phaseHints: {
        night: 'Выберите центральную карту для обмена',
        day: 'Вы не знаете свою новую роль'
      }
    })
  }
  
  async executeNightAction(gameEngine, player, action) {
    const { centerIndex } = action
    const room = gameEngine.room
    
    if (typeof centerIndex !== 'number' || centerIndex < 0 || centerIndex >= room.centerCards.length) {
      return { error: 'Выберите центральную карту' }
    }
    
    gameEngine.swapWithCenter(player.id, centerIndex)
    
    return {
      success: true,
      message: 'Вы обменялись ролью с центральной картой',
      data: {
        centerIndex,
        message: 'Вы не знаете свою новую роль'
      }
    }
  }
  
  getCenterCards(gameEngine) {
    return gameEngine.room.centerCards.map((role, index) => ({
      index,
      available: true
    }))
  }
}