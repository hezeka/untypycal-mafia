/**
 * Роль: Мистический волк
 */

import { BaseRole } from '../BaseRole.js'

export class MysticWolfRole extends BaseRole {
  constructor() {
    super('mystic_wolf', {
      name: 'Мистический волк',
      description: 'Ночью сначала находит оборотней, затем выбирает - голосовать ИЛИ посмотреть карту.',
      team: 'werewolf',
      color: 'red',
      hasNightAction: true,
      nightOrder: 11,
      implemented: true,
      phaseHints: {
        night: 'Найдите оборотней, затем выберите: голосовать или смотреть карту',
        day: 'Используйте полученную информацию'
      }
    })
  }
  
  async executeNightAction(gameEngine, player, action) {
    const { type, targetId } = action
    const room = gameEngine.room
    
    // Первое действие - показать оборотней
    if (type === 'reveal_werewolves') {
      const werewolves = Array.from(room.players.values())
        .filter(p => p.alive && room.isWerewolf(p.role) && p.id !== player.id)
        .map(p => ({ id: p.id, name: p.name, role: p.role }))
      
      return {
        success: true,
        message: werewolves.length > 0 ? 'Вы нашли других оборотней' : 'Других оборотней нет',
        data: {
          werewolves,
          canChooseAction: true
        }
      }
    }
    
    // Выбор: голосовать или смотреть
    if (type === 'choose_vote') {
      // Участвует в голосовании оборотней
      if (!gameEngine.werewolfVotes) {
        gameEngine.werewolfVotes = new Map()
      }
      
      if (!targetId) {
        return { error: 'Выберите цель для убийства' }
      }
      
      const target = room.getPlayer(targetId)
      if (!target || !target.alive || target.role === 'game_master' || room.isWerewolf(target.role)) {
        return { error: 'Недопустимая цель' }
      }
      
      gameEngine.werewolfVotes.set(player.id, targetId)
      
      return {
        success: true,
        message: `Вы проголосовали за убийство ${target.name}`,
        data: {
          choice: 'vote',
          target: target.name
        }
      }
    }
    
    if (type === 'choose_look') {
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
          choice: 'look',
          targetName: target.name,
          targetRole: target.role,
          roleInfo: room.getRoleInfo(target.role)
        }
      }
    }
    
    return { error: 'Сначала найдите оборотней' }
  }
  
  getAvailableTargets(gameEngine, player) {
    // Для голосования - все кроме оборотней
    const room = gameEngine.room
    const voteTargets = Array.from(room.players.values())
      .filter(p => p.alive && p.id !== player.id && p.role !== 'game_master' && !room.isWerewolf(p.role))
      .map(p => ({ id: p.id, name: p.name, type: 'vote' }))
    
    // Для просмотра - все кроме себя
    const lookTargets = Array.from(room.players.values())
      .filter(p => p.alive && p.id !== player.id && p.role !== 'game_master')
      .map(p => ({ id: p.id, name: p.name, type: 'look' }))
    
    return { voteTargets, lookTargets }
  }
}