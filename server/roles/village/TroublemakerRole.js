import { BaseRole } from '../BaseRole.js'

export class TroublemakerRole extends BaseRole {
  constructor() {
    super('troublemaker', {
      name: 'Смутьян',
      description: 'Ночью меняет роли двух игроков местами (не узнает какие).',
      team: 'village',
      color: 'blue',
      hasNightAction: true,
      nightOrder: 8,
      implemented: true,
      phaseHints: {
        night: 'Выберите двух игроков для обмена ролями',
        day: 'Наблюдайте за поведением игроков'
      }
    })
  }
  
  async executeNightAction(gameEngine, player, action) {
    const { target1Id, target2Id } = action
    const room = gameEngine.room
    
    if (!target1Id || !target2Id) {
      return { error: 'Выберите двух игроков' }
    }
    
    if (target1Id === target2Id) {
      return { error: 'Выберите разных игроков' }
    }
    
    const target1 = room.getPlayer(target1Id)
    const target2 = room.getPlayer(target2Id)
    
    if (!target1 || !target2 || target1.role === 'game_master' || target2.role === 'game_master') {
      return { error: 'Недопустимые цели' }
    }
    
    if (target1Id === player.id || target2Id === player.id) {
      return { error: 'Нельзя выбирать себя' }
    }
    
    gameEngine.swapRoles(target1Id, target2Id)
    
    return {
      success: true,
      message: `Вы поменяли роли между ${target1.name} и ${target2.name}`,
      data: {
        target1: target1.name,
        target2: target2.name
      }
    }
  }
}