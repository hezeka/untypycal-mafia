import { BaseRole } from '../BaseRole.js'

export class MinionRole extends BaseRole {
  constructor() {
    super('minion', {
      name: 'Миньон',
      description: 'Ночью узнает всех оборотней (оборотни его не знают). Побеждает с оборотнями.',
      team: 'werewolf',
      color: 'red',
      hasNightAction: true,
      nightOrder: 4,
      implemented: true,
      phaseHints: {
        night: 'Вы узнаете оборотней, но они вас не знают',
        day: 'Помогайте оборотням, не выдавая себя'
      }
    })
  }
  
  async executeNightAction(gameEngine, player, action) {
    const room = gameEngine.room
    
    const werewolves = Array.from(room.players.values())
      .filter(p => p.alive && room.isWerewolf(p.role))
      .map(p => ({ id: p.id, name: p.name, role: p.role }))
    
    return {
      success: true,
      message: werewolves.length > 0 ? 'Вы знаете оборотней' : 'Оборотней нет',
      data: { werewolves }
    }
  }
}