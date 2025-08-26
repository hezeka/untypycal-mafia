import { BaseRole } from '../BaseRole.js'

export class MinionRole extends BaseRole {
  constructor() {
    super('minion', {
      name: 'Миньон',
      description: 'Видит роли оборотней в списке игроков (они его не знают). Побеждает с оборотнями.',
      team: 'werewolf',
      color: 'red',
      hasNightAction: false,
      nightOrder: 0,
      implemented: true,
      phaseHints: {
        night: 'Вы видите роли оборотней в списке игроков',
        day: 'Помогайте оборотням, не выдавая себя'
      }
    })
  }
  
  // Миньон не выполняет ночных действий - только видит роли оборотней
}