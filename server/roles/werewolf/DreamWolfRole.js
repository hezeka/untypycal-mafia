import { BaseRole } from '../BaseRole.js'

export class DreamWolfRole extends BaseRole {
  constructor() {
    super('dream_wolf', {
      name: 'Волк-сновидец',
      description: 'Оборотни его знают, он их - нет. Не видит ночной чат.',
      team: 'werewolf',
      color: 'red',
      hasNightAction: true,
      nightOrder: 18,
      implemented: true,
      phaseHints: {
        night: 'Вы спите и ничего не делаете',
        day: 'Ведите себя как обычный житель'
      }
    })
  }
  
  async executeNightAction(gameEngine, player, action) {
    // Волк-сновидец не делает ничего, только показывает палец оборотням
    return {
      success: true,
      message: 'Вы крепко спите...',
      data: { sleeping: true }
    }
  }
}