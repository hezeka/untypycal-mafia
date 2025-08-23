import { BaseRole } from '../BaseRole.js'

export class RobberRole extends BaseRole {
  constructor() {
    super('robber', {
      name: 'Грабитель',
      description: 'Ночью меняется ролями с игроком и узнает новую роль.',
      team: 'village',
      color: 'blue',
      hasNightAction: true,
      nightOrder: 7,
      implemented: true,
      phaseHints: {
        night: 'Выберите игрока для обмена ролями',
        day: 'Действуйте согласно новой роли'
      }
    })
  }
  
  async executeNightAction(gameEngine, player, action) {
    const { targetId } = action
    const room = gameEngine.room
    
    if (!targetId) {
      return { error: 'Выберите игрока для обмена ролями' }
    }
    
    const target = room.getPlayer(targetId)
    if (!target || target.id === player.id || target.role === 'game_master') {
      return { error: 'Недопустимая цель' }
    }
    
    const oldRole = player.role
    const newRole = target.role
    
    gameEngine.swapRoles(player.id, targetId)
    
    return {
      success: true,
      message: `Вы обменялись ролями с ${target.name}`,
      data: {
        oldRole,
        newRole,
        newRoleInfo: room.getRoleInfo(newRole),
        targetName: target.name
      }
    }
  }
}