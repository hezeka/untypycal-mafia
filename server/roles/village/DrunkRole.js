/**
 * Пьяница - меняет свою роль с картой из центра, не узнавая новую роль
 */

import { BaseRole } from '../BaseRole.js'
import { RoleAbilities } from '../abilities/RoleAbilities.js'
import { ROLE_TEAMS } from '../../utils/constants.js'

export class DrunkRole extends BaseRole {
  constructor() {
    super('drunk', {
      name: 'Пьяница',
      description: 'Ночью меняет свою роль с одной из карт центра, не узнавая новую роль.',
      team: ROLE_TEAMS.VILLAGE,
      color: 'blue',
      hasNightAction: true,
      nightOrder: 9,
      implemented: true,
      phaseHints: {
        night: 'Поменяйте свою карту с одной из центральных. Вы НЕ узнаете новую роль!',
        day: 'Вы не знаете свою роль. Играйте осторожно и наблюдайте за реакциями'
      }
    })
  }
  
  async executeNightAction(game, player, action) {
    if (!action) {
      return this.handleAutoAction(game, player)
    }
    
    if (action.type === 'swap_with_center' && typeof action.centerIndex === 'number') {
      const swapResult = RoleAbilities.swapWithCenter(game, player.id, action.centerIndex)
      
      if (swapResult) {
        this.logAction(player, 'swapped with center', `index ${action.centerIndex}`)
        
        // Пьяница НЕ узнает свою новую роль
        this.notifyPlayer(game, player.id, 
          'Вы поменялись с картой из центра. Ваша новая роль скрыта от вас.')
        
        return { 
          swapped: swapResult,
          hiddenFromPlayer: true // Игрок не видит новую роль
        }
      }
    }
    
    return RoleAbilities.skipAction(game, player.id, 'Некорректный выбор карты')
  }
  
  async handleAutoAction(game, player) {
    const centerCards = game.state.centerCards || []
    
    if (centerCards.length === 0) {
      return RoleAbilities.skipAction(game, player.id, 'Нет карт в центре')
    }
    
    // Случайно выбираем карту из центра
    const randomIndex = Math.floor(Math.random() * centerCards.length)
    const swapResult = RoleAbilities.swapWithCenter(game, player.id, randomIndex)
    
    this.logAction(player, 'auto swapped with center', `index ${randomIndex}`)
    this.notifyPlayer(game, player.id, 
      'Вы автоматически поменялись с картой из центра. Ваша новая роль скрыта.')
    
    return { 
      swapped: swapResult,
      hiddenFromPlayer: true
    }
  }
  
  getActionChoices(game, player) {
    const centerCards = game.state.centerCards || []
    const choices = []
    
    centerCards.forEach((_, index) => {
      choices.push({
        id: 'swap_with_center',
        name: `Поменяться с картой ${index + 1}`,
        description: `Поменять свою роль с ${index + 1}-й картой из центра`,
        centerIndex: index
      })
    })
    
    return choices
  }
  
  canSkipAction() {
    return false // Пьяница ДОЛЖЕН поменяться
  }
}