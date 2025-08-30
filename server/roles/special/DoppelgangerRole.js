import { BaseRole } from '../BaseRole.js'
import { getRole } from '../../utils/gameHelpers.js'

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
    
    // Сохраняем информацию о копировании, но пока НЕ меняем роль
    const oldRole = player.role
    const targetRole = target.role
    player.copiedFrom = target.id
    
    const roleInfo = getRole(targetRole)
    
    // Если у скопированной роли есть ночное действие, выполняем его автоматически
    if (roleInfo && roleInfo.hasNightAction) {
      try {
        // Получаем обработчик роли из rolesList.js
        const { getRoleHandler } = await import('../rolesList.js')
        const roleHandler = getRoleHandler(targetRole)
        
        if (roleHandler) {
          const autoResult = await roleHandler(gameEngine, player, { type: 'auto' })
          
          return {
            success: true,
            message: `Вы скопировали роль ${target.name}: ${roleInfo.name || targetRole}`,
            data: {
              oldRole,
              newRole: targetRole,
              roleInfo,
              actionResult: autoResult,
              changeRoleAfterAction: true // Флаг для GameEngine
            }
          }
        }
      } catch (error) {
        return {
          success: true,
          message: `Вы скопировали роль ${target.name}: ${roleInfo.name || targetRole}`,
          data: {
            oldRole,
            newRole: targetRole,
            roleInfo,
            actionError: error.message,
            changeRoleAfterAction: true // Флаг для GameEngine
          }
        }
      }
    }
    
    // Если у роли нет ночного действия, просто завершаем
    return {
      success: true,
      message: `Вы скопировали роль ${target.name}: ${roleInfo?.name || targetRole}`,
      data: {
        oldRole,
        newRole: targetRole,
        roleInfo,
        changeRoleAfterAction: true // Флаг для GameEngine
      }
    }
  }
}