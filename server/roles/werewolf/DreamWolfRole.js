import { BaseRole } from '../BaseRole.js'

export class DreamWolfRole extends BaseRole {
  constructor() {
    super('dream_wolf', {
      name: 'Волк-сновидец',
      description: 'Оборотни его знают, а он их - нет. Не видит ночной чат.',
      team: 'werewolf',
      color: 'red',
      hasNightAction: false,
      nightOrder: 0,
      implemented: true,
      phaseHints: {
        night: 'Вы спите и ничего не делаете',
        day: 'Ведите себя как обычный житель'
      }
    })
  }
}