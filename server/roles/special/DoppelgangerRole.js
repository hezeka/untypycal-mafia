import { BaseRole } from '../BaseRole.js'
import { getRole } from '../rolesList.js'

export class DoppelgangerRole extends BaseRole {
  constructor() {
    super('doppelganger', {
      name: 'Доппельгангер',
      description: 'Ночью копирует роль игрока и выполняет ее действие.',
      team: 'special',
      color: 'purple',
      hasNightAction: true,
      nightOrder: 2,
      implemented: true,
      phaseHints: {
        night: 'Выберите игрока для копирования роли',
        day: 'Действуйте согласно скопированной роли'
      }
    })
  }
  
  async executeNightAction(gameEngine, player, action) {
    const { targetId } = action
    const room = gameEngine.room
    
    if (!targetId) {
      return { error: 'Выберите игрока для копирования' }
    }
    
    const target = room.getPlayer(targetId)
    if (!target || target.id === player.id || target.role === 'game_master') {
      return { error: 'Недопустимая цель' }
    }
    
    // Копируем роль
    const oldRole = player.role
    player.role = target.role
    player.copiedFrom = target.id
    
    // Меняем команду согласно новой роли
    const roleInfo = room.getRoleInfo(target.role)
    if (roleInfo) {
      // Логика смены команды будет обработана в GameEngine
    }
    
    // Если у скопированной роли есть ночное действие, выполняем его
    const roleInstance = getRole(target.role)
    if (roleInstance && roleInstance.hasNightAction) {
      try {
        const result = await roleInstance.executeNightAction(gameEngine, player, { type: 'auto' })
        return {
          success: true,
          message: `Вы скопировали роль ${target.name}: ${roleInfo?.name || target.role}`,
          data: {
            oldRole,
            newRole: target.role,
            roleInfo,
            actionResult: result
          }
        }
      } catch (error) {
        return {
          success: true,
          message: `Вы скопировали роль ${target.name}: ${roleInfo?.name || target.role}`,
          data: {
            oldRole,
            newRole: target.role,
            roleInfo,
            actionError: error.message
          }
        }
      }
    }
    
    return {
      success: true,
      message: `Вы скопировали роль ${target.name}: ${roleInfo?.name || target.role}`,
      data: {
        oldRole,
        newRole: target.role,
        roleInfo
      }
    }
  }
}