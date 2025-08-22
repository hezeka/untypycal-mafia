/**
 * Смутьян - меняет роли двух игроков местами
 */

import { BaseRole } from '../BaseRole.js'
import { RoleAbilities } from '../abilities/RoleAbilities.js'
import { ROLE_TEAMS } from '../../utils/constants.js'

export class TroublemakerRole extends BaseRole {
  constructor() {
    super('troublemaker', {
      name: 'Смутьян',
      description: 'Ночью меняет роли двух других игроков местами, не узнавая их ролей.',
      team: ROLE_TEAMS.VILLAGE,
      color: 'blue',
      hasNightAction: true,
      nightOrder: 8,
      implemented: true,
      phaseHints: {
        night: 'Выберите двух игроков для обмена ролями между собой',
        day: 'Помните, чьи роли вы поменяли - это поможет найти оборотней'
      }
    })
  }
  
  async executeNightAction(game, player, action) {
    if (!action) {
      return this.handleAutoAction(game, player)
    }
    
    if (action.type === 'swap_two_players' && action.player1Id && action.player2Id) {
      // Проверяем что игроки разные
      if (action.player1Id === action.player2Id) {
        return RoleAbilities.skipAction(game, player.id, 'Нельзя поменять игрока с самим собой')
      }
      
      // Проверяем что не пытается поменять себя
      if (action.player1Id === player.id || action.player2Id === player.id) {
        return RoleAbilities.skipAction(game, player.id, 'Нельзя менять свою роль')
      }
      
      const swapResult = RoleAbilities.swapPlayerRoles(game, action.player1Id, action.player2Id)
      
      if (swapResult) {
        this.logAction(player, 'swapped roles', `${swapResult.player1.name} ↔ ${swapResult.player2.name}`)
        
        this.notifyPlayer(game, player.id, 
          `Вы поменяли роли между ${swapResult.player1.name} и ${swapResult.player2.name}`)
        
        return { swapped: swapResult }
      }
    }
    
    return RoleAbilities.skipAction(game, player.id, 'Некорректное действие')
  }
  
  async handleAutoAction(game, player) {
    const targets = RoleAbilities.getValidTargets(game, player.id)
    
    if (targets.length < 2) {
      return RoleAbilities.skipAction(game, player.id, 'Недостаточно игроков для обмена')
    }
    
    // Случайно выбираем двух игроков
    const player1 = targets[Math.floor(Math.random() * targets.length)]
    let player2 = targets[Math.floor(Math.random() * targets.length)]
    
    // Убеждаемся что игроки разные
    while (player2.id === player1.id && targets.length > 1) {
      player2 = targets[Math.floor(Math.random() * targets.length)]
    }
    
    const swapResult = RoleAbilities.swapPlayerRoles(game, player1.id, player2.id)
    
    this.logAction(player, 'auto swapped', `${player1.name} ↔ ${player2.name}`)
    this.notifyPlayer(game, player.id, 
      `Вы автоматически поменяли роли между ${player1.name} и ${player2.name}`)
    
    return { swapped: swapResult }
  }
  
  getActionChoices(game, player) {
    const targets = RoleAbilities.getValidTargets(game, player.id)
    
    return [{
      id: 'swap_two_players',
      name: 'Поменять роли двух игроков',
      description: 'Выберите двух игроков для обмена ролями',
      requiresTwoTargets: true,
      targets
    }]
  }
  
  canSkipAction() {
    return true
  }
}