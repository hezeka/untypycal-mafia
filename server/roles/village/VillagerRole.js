import { BaseRole } from '../BaseRole.js'

export class VillagerRole extends BaseRole {
  constructor() {
    super('villager', {
      name: 'Житель',
      description: 'Обычный житель без особых способностей.',
      team: 'village',
      color: 'blue',
      hasNightAction: false,
      nightOrder: 0,
      implemented: true,
      phaseHints: {
        day: 'Ищите подозрительное поведение и голосуйте против оборотней'
      }
    })
  }
}