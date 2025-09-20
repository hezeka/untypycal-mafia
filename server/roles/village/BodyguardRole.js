import { BaseRole } from '../BaseRole.js'
import { EVENT_TYPES } from '../../models/GameHistory.js'

export class BodyguardRole extends BaseRole {
  constructor() {
    super('bodyguard', {
      name: 'Страж',
      description: 'Ночью ставит щит на игрока (защита от убийства).',
      team: 'village',
      color: 'blue',
      hasNightAction: true,
      nightOrder: 19,
      implemented: true,
      phaseHints: {
        night: 'Выберите игрока для защиты',
        day: 'Защищенный игрок не может быть убит'
      }
    })
  }
  
  getNightActionEventType() {
    return EVENT_TYPES.NIGHT_PROTECT
  }

  async performNightAction(gameEngine, player, action) {
    const { targetId } = action
    const room = gameEngine.room
    
    if (!targetId) {
      return { error: 'Выберите игрока для защиты' }
    }
    
    const target = room.getPlayer(targetId)
    if (!target || target.role === 'game_master') {
      return { error: 'Недопустимая цель' }
    }
    
    if (targetId === player.id) {
      return { error: 'Нельзя защищать себя' }
    }
    
    gameEngine.protectPlayer(targetId)
    
    return {
      success: true,
      message: `Вы защитили ${target.name}`,
      data: {
        targetName: target.name
      }
    }
  }
}