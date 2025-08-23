/**
 * Роль: Провидец
 */

import { BaseRole } from '../BaseRole.js'

export class SeerRole extends BaseRole {
  constructor() {
    super('seer', {
      name: 'Провидец',
      description: 'Ночью может посмотреть роль игрока или две центральные карты.',
      team: 'village',
      color: 'blue',
      hasNightAction: true,
      nightOrder: 6,
      implemented: true,
      phaseHints: {
        night: 'Выберите игрока или центральные карты для просмотра',
        day: 'Используйте полученную информацию для поиска оборотней'
      }
    })
  }
  
  async executeNightAction(gameEngine, player, action) {
    const { type, targetId, centerCards } = action
    const room = gameEngine.room
    
    if (type === 'look_player') {
      if (!targetId) {
        return { error: 'Выберите игрока для просмотра' }
      }
      
      const target = room.getPlayer(targetId)
      if (!target || target.id === player.id || target.role === 'game_master') {
        return { error: 'Недопустимая цель' }
      }
      
      return {
        success: true,
        message: `Роль игрока ${target.name}:`,
        data: {
          type: 'player',
          targetName: target.name,
          targetRole: target.role,
          roleInfo: room.getRoleInfo(target.role)
        }
      }
    }
    
    if (type === 'look_center') {
      if (!Array.isArray(centerCards) || centerCards.length !== 2) {
        return { error: 'Выберите две центральные карты' }
      }
      
      const cards = centerCards.map(index => {
        if (index < 0 || index >= room.centerCards.length) {
          return null
        }
        return {
          index,
          role: room.centerCards[index],
          roleInfo: room.getRoleInfo(room.centerCards[index])
        }
      }).filter(card => card !== null)
      
      if (cards.length !== 2) {
        return { error: 'Недопустимые карты' }
      }
      
      return {
        success: true,
        message: 'Центральные карты:',
        data: {
          type: 'center',
          cards
        }
      }
    }
    
    return { error: 'Выберите действие: посмотреть игрока или центральные карты' }
  }
  
  getAvailableActions(gameEngine, player) {
    const room = gameEngine.room
    
    return {
      canLookPlayer: true,
      canLookCenter: room.centerCards.length >= 2,
      players: this.getAvailableTargets(gameEngine, player),
      centerCards: room.centerCards.length
    }
  }
}