/**
 * Роль: Оборотень
 */

import { BaseRole } from '../BaseRole.js'

export class WerewolfRole extends BaseRole {
  constructor() {
    super('werewolf', {
      name: 'Оборотень',
      description: 'Ночью узнает других оборотней и голосует за жертву.',
      team: 'werewolf',
      color: 'red',
      hasNightAction: true,
      nightOrder: 3,
      implemented: true,
      phaseHints: {
        night: 'Найдите других оборотней и выберите жертву',
        day: 'Притворяйтесь жителем и сейте подозрения в других'
      }
    })
  }
  
  async executeNightAction(gameEngine, player, action) {
    const { type, targetId } = action
    const room = gameEngine.room
    
    if (type === 'vote_kill') {
      if (!targetId) {
        return { error: 'Выберите цель для убийства' }
      }
      
      const target = room.getPlayer(targetId)
      if (!target || !target.alive || target.role === 'game_master') {
        return { error: 'Недопустимая цель' }
      }
      
      // Добавляем голос за убийство
      if (!gameEngine.werewolfVotes) {
        gameEngine.werewolfVotes = new Map()
      }
      
      gameEngine.werewolfVotes.set(player.id, targetId)
      
      // Проверяем, проголосовали ли все оборотни
      const werewolves = this.getAllWerewolves(room)
      const votedCount = Array.from(gameEngine.werewolfVotes.keys())
        .filter(playerId => werewolves.includes(playerId)).length
      
      if (votedCount >= werewolves.length) {
        this.processWerewolfVotes(gameEngine)
      }
      
      return {
        success: true,
        message: `Вы проголосовали за убийство ${target.name}`,
        data: {
          voted: true,
          target: target.name,
          votesNeeded: werewolves.length - votedCount
        }
      }
    }
    
    // Показать других оборотней (автоматически при начале хода)
    if (type === 'reveal_werewolves') {
      const werewolves = this.getAllWerewolves(room)
        .map(id => room.getPlayer(id))
        .filter(p => p && p.id !== player.id)
        .map(p => ({ id: p.id, name: p.name, role: p.role }))
      
      return {
        success: true,
        message: werewolves.length > 0 ? 'Вы нашли других оборотней' : 'Вы единственный оборотень',
        data: { werewolves }
      }
    }
    
    return { error: 'Неизвестное действие' }
  }
  
  getAllWerewolves(room) {
    return Array.from(room.players.values())
      .filter(p => p.alive && room.isWerewolf(p.role))
      .map(p => p.id)
  }
  
  processWerewolfVotes(gameEngine) {
    const votes = gameEngine.werewolfVotes
    if (!votes || votes.size === 0) return
    
    // Подсчитываем голоса
    const voteCount = new Map()
    for (const [, targetId] of votes) {
      voteCount.set(targetId, (voteCount.get(targetId) || 0) + 1)
    }
    
    // Находим цель с наибольшим количеством голосов
    let maxVotes = 0
    let target = null
    
    for (const [targetId, count] of voteCount) {
      if (count > maxVotes) {
        maxVotes = count
        target = targetId
      }
    }
    
    if (target) {
      gameEngine.killPlayer(target)
    }
    
    // Очищаем голоса
    gameEngine.werewolfVotes.clear()
  }
  
  getAvailableTargets(gameEngine, player) {
    // Оборотни могут убивать всех, кроме других оборотней
    const room = gameEngine.room
    return Array.from(room.players.values())
      .filter(p => p.alive && p.id !== player.id && p.role !== 'game_master' && !room.isWerewolf(p.role))
      .map(p => ({
        id: p.id,
        name: p.name,
        role: room.shouldShowPlayerRole(p, player) ? p.role : null
      }))
  }
}