import { BaseRole } from '../BaseRole.js'

export class HunterRole extends BaseRole {
  constructor() {
    super('hunter', {
      name: 'Охотник',
      description: 'Если его убивают, он убивает игрока на которого указывает.',
      team: 'village',
      color: 'blue',
      hasNightAction: false,
      nightOrder: 0,
      implemented: true,
      phaseHints: {
        day: 'Выберите цель - если вас убьют, она тоже умрет'
      }
    })
  }
  
  // Специальная логика для охотника будет в GameEngine при обработке смерти
}