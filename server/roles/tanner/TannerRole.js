import { BaseRole } from '../BaseRole.js'

export class TannerRole extends BaseRole {
  constructor() {
    super('tanner', {
      name: 'Неудачник',
      description: 'Побеждает, если его убивают.',
      team: 'tanner',
      color: 'brown',
      hasNightAction: false,
      nightOrder: 0,
      implemented: true,
      phaseHints: {
        day: 'Ведите себя подозрительно, чтобы вас убили'
      }
    })
  }
}

// ПРОВЕРИТЬ