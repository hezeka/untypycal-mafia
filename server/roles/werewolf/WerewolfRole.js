/**
 * Оборотень - злая роль с групповым убийством
 */

import { BaseRole } from '../BaseRole.js'
import { ROLE_TEAMS } from '../../utils/constants.js'

export class WerewolfRole extends BaseRole {
  constructor() {
    super('werewolf', {
      name: 'Оборотень',
      description: 'Ночью узнает других оборотней и голосует за жертву. Побеждает если остается в живых.',
      team: ROLE_TEAMS.WEREWOLF,
      color: 'red',
      hasNightAction: true,
      nightOrder: 3,
      implemented: true,
      phaseHints: {
        introduction: 'Притворяйтесь жителем и сеяте подозрения в других',
        night: 'Голосуйте за жертву вместе с другими оборотнями',
        day: 'Запутывайте следствие и выдвигайте ложные версии',
        voting: 'Голосуйте за жителей, защищайте других оборотней'
      }
    })
  }
  
  /**
   * Ночное действие оборотня - групповое голосование за жертву
   */
  async executeNightAction(game, player) {
    const werewolves = this.getAllWerewolves(game)
    
    // Если оборотень один - может убить кого угодно
    if (werewolves.length === 1) {
      return await this.soloWerewolfKill(game, player)
    }
    
    // Если оборотней несколько - групповое голосование
    return await this.groupWerewolfKill(game, werewolves)
  }
  
  /**
   * Убийство одиночного оборотня
   */
  async soloWerewolfKill(game, player) {
    // Автоматически выбираем случайного жителя
    const villagers = game.getAlivePlayers().filter(p => {
      const role = game.room.getRole(p.role)
      return role && role.team !== ROLE_TEAMS.WEREWOLF && p.id !== player.id
    })
    
    if (villagers.length === 0) {
      return null // Некого убивать
    }
    
    const victim = this.getRandomPlayer(game, [player])
    
    if (!victim) return null
    
    this.logAction(player, 'solo kill', victim.name)
    
    return {
      kills: [victim]
    }
  }
  
  /**
   * Групповое убийство оборотней
   */
  async groupWerewolfKill(game, werewolves) {
    // В упрощенной версии - случайный выбор
    // В полной версии здесь будет система голосования
    
    const nonWerewolves = game.getAlivePlayers().filter(p => {
      const role = game.room.getRole(p.role)
      return role && role.team !== ROLE_TEAMS.WEREWOLF
    })
    
    if (nonWerewolves.length === 0) {
      return null // Некого убивать
    }
    
    const victim = nonWerewolves[Math.floor(Math.random() * nonWerewolves.length)]
    
    console.log(`🐺 Werewolves chose to kill: ${victim.name}`)
    
    return {
      kills: [victim]
    }
  }
  
  /**
   * Получение всех оборотней в игре
   */
  getAllWerewolves(game) {
    return game.getAlivePlayers().filter(p => {
      const role = game.room.getRole(p.role)
      return role && role.team === ROLE_TEAMS.WEREWOLF
    })
  }
  
  /**
   * Проверка может ли оборотень убить цель
   */
  canKillTarget(game, werewolf, target) {
    if (!target || !target.alive) return false
    if (target.id === werewolf.id) return false
    
    const targetRole = game.room.getRole(target.role)
    if (targetRole && targetRole.team === ROLE_TEAMS.WEREWOLF) return false
    
    return true
  }
  
  /**
   * Оборотни могут общаться между собой ночью
   */
  canChatWith(game, player, target) {
    const targetRole = game.room.getRole(target.role)
    return targetRole && targetRole.team === ROLE_TEAMS.WEREWOLF
  }
  
  /**
   * Получение доступных целей (все кроме оборотней)
   */
  getAvailableTargets(game, player) {
    return game.getAlivePlayers().filter(p => {
      if (p.id === player.id) return false
      
      const role = game.room.getRole(p.role)
      return role && role.team !== ROLE_TEAMS.WEREWOLF
    })
  }
}