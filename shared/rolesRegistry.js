export const ROLES_REGISTRY = {
  // === КОМАНДА ДЕРЕВНИ ===
  villager: {
    id: 'villager',
    name: 'Житель',
    description: 'Обычный житель без особых способностей.',
    team: 'village',
    color: 'blue',
    hasNightAction: false,
    nightOrder: 0,
    implemented: true,
    phaseHints: {
      day: 'Найдите оборотней по их поведению и противоречиям'
    }
  },
  
  bodyguard: {
    id: 'bodyguard',
    name: 'Страж',
    description: 'Ночью ставит щит на игрока (защита от убийства).',
    team: 'village',
    color: 'blue',
    hasNightAction: true,
    nightOrder: 1,
    implemented: true,
    phaseHints: {
      night: 'Выберите игрока для защиты',
      day: 'Ваша защита могла спасти жизнь'
    }
  },
  
  seer: {
    id: 'seer', 
    name: 'Провидец',
    description: 'Ночью может посмотреть роль игрока ИЛИ две карты из центра.',
    team: 'village',
    color: 'blue',
    hasNightAction: true,
    nightOrder: 5,
    implemented: true,
    phaseHints: {
      night: 'Выберите: посмотреть роль игрока ИЛИ две центральные карты',
      day: 'Используйте полученную информацию для поиска оборотней'
    }
  },
  
  robber: {
    id: 'robber',
    name: 'Грабитель', 
    description: 'Ночью меняется ролями с игроком и узнает новую роль.',
    team: 'village',
    color: 'blue',
    hasNightAction: true,
    nightOrder: 6,
    implemented: true,
    phaseHints: {
      night: 'Выберите игрока для обмена ролями',
      day: 'Играйте согласно новой роли'
    }
  },
  
  troublemaker: {
    id: 'troublemaker',
    name: 'Смутьян',
    description: 'Ночью меняет роли двух игроков местами (не узнает какие).',
    team: 'village', 
    color: 'blue',
    hasNightAction: true,
    nightOrder: 7,
    implemented: true,
    phaseHints: {
      night: 'Выберите двух игроков для обмена ролями',
      day: 'Наблюдайте за поведением - кого вы поменяли?'
    }
  },
  
  drunk: {
    id: 'drunk',
    name: 'Пьяница',
    description: 'Ночью меняет роль с центральной картой (не узнает новую).',
    team: 'village',
    color: 'blue', 
    hasNightAction: true,
    nightOrder: 8,
    implemented: true,
    phaseHints: {
      night: 'Выберите центральную карту для обмена',
      day: 'Вы не знаете свою новую роль'
    }
  },
  
  hunter: {
    id: 'hunter',
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
  },
  
  insomniac: {
    id: 'insomniac',
    name: 'Бессонница',
    description: 'В конце ночи узнает свою текущую роль.',
    team: 'village',
    color: 'blue',
    hasNightAction: true,
    nightOrder: 9,
    implemented: true,
    phaseHints: {
      night: 'В конце ночи вы узнаете свою роль',
      day: 'Используйте знание своей роли'
    }
  },
  
  // === КОМАНДА ОБОРОТНЕЙ ===
  werewolf: {
    id: 'werewolf',
    name: 'Оборотень',
    description: 'Ночью узнает других оборотней и голосует за жертву.',
    team: 'werewolf',
    color: 'red',
    hasNightAction: true,
    nightOrder: 4,
    implemented: true,
    phaseHints: {
      night: 'Найдите других оборотней и выберите жертву',
      day: 'Притворяйтесь жителем и направляйте подозрения'
    }
  },
  
  mystic_wolf: {
    id: 'mystic_wolf',
    name: 'Мистический волк',
    description: 'Узнает оборотней, затем выбирает: голосовать ИЛИ посмотреть роль игрока.',
    team: 'werewolf',
    color: 'red',
    hasNightAction: true,
    nightOrder: 4,
    implemented: true,
    phaseHints: {
      night: 'Найдите оборотней, затем выберите действие',
      day: 'Используйте информацию в своих интересах'
    }
  },
  
  minion: {
    id: 'minion',
    name: 'Миньон',
    description: 'Узнает оборотней (они его не знают). Побеждает с оборотнями.',
    team: 'werewolf',
    color: 'red',
    hasNightAction: false,
    nightOrder: 0,
    implemented: true,
    phaseHints: {
      night: 'Вы видите оборотней в списке игроков',
      day: 'Помогайте оборотням, не выдавая себя'
    }
  },
  
  dream_wolf: {
    id: 'dream_wolf',
    name: 'Волк-сновидец',
    description: 'Оборотни его знают, он их - нет. Не видит ночной чат.',
    team: 'werewolf',
    color: 'red',
    hasNightAction: true,
    nightOrder: 10,
    implemented: true,
    phaseHints: {
      night: 'Вы спите и ничего не делаете',
      day: 'Ведите себя как обычный житель'
    }
  },
  
  // === НЕУДАЧНИК ===
  tanner: {
    id: 'tanner',
    name: 'Неудачник',
    description: 'Побеждает только если его убивают.',
    team: 'tanner',
    color: 'brown',
    hasNightAction: false,
    nightOrder: 0,
    implemented: true,
    phaseHints: {
      day: 'Ведите себя подозрительно, чтобы вас убили'
    }
  },
  
  // === ОСОБЫЕ РОЛИ ===
  doppelganger: {
    id: 'doppelganger',
    name: 'Доппельгангер',
    description: 'Копирует роль игрока и выполняет ее действие.',
    team: 'special',
    color: 'purple',
    hasNightAction: true,
    nightOrder: 2,
    implemented: true,
    phaseHints: {
      night: 'Выберите игрока для копирования роли',
      day: 'Играйте согласно скопированной роли'
    }
  },
  
  prostitute: {
    id: 'prostitute',
    name: 'Путана',
    description: 'Ночью может отключить ночную способность одного игрока.',
    team: 'village',
    color: 'blue',
    hasNightAction: true,
    nightOrder: 3,
    implemented: true,
    phaseHints: {
      night: 'Выберите игрока, чтобы отключить его ночную способность',
      day: 'Вы могли помешать кому-то действовать ночью'
    }
  },
  
  cthulhu: {
    id: 'cthulhu',
    name: 'Ктулху',
    description: 'Ночью отправляет анонимное сообщение игроку. Побеждает если переживет 3 голосования.',
    team: 'special',
    color: 'purple',
    hasNightAction: true,
    nightOrder: 11,
    implemented: true,
    phaseHints: {
      night: 'Выберите игрока и отправьте ему анонимное сообщение',
      day: 'Переживите голосование. Нужно выжить 3 раза для победы'
    }
  },
  
  // === ДОПОЛНИТЕЛЬНЫЕ ОБОРОТНИ ===
  werewolf_2: {
    id: 'werewolf_2',
    name: 'Оборотень',
    description: 'Ночью узнает других оборотней и голосует за жертву.',
    team: 'werewolf',
    color: 'red',
    hasNightAction: true,
    nightOrder: 4,
    implemented: true,
    phaseHints: {
      night: 'Найдите других оборотней и выберите жертву',
      day: 'Притворяйтесь жителем и направляйте подозрения'
    }
  },
  
  werewolf_3: {
    id: 'werewolf_3',
    name: 'Оборотень',
    description: 'Ночью узнает других оборотней и голосует за жертву.',
    team: 'werewolf',
    color: 'red',
    hasNightAction: true,
    nightOrder: 4,
    implemented: true,
    phaseHints: {
      night: 'Найдите других оборотней и выберите жертву',
      day: 'Притворяйтесь жителем и направляйте подозрения'
    }
  },
  
  // === ДОПОЛНИТЕЛЬНЫЕ ЖИТЕЛИ ===
  villager_2: {
    id: 'villager_2',
    name: 'Житель',
    description: 'Обычный житель без особых способностей.',
    team: 'village',
    color: 'blue',
    hasNightAction: false,
    nightOrder: 0,
    implemented: true,
    phaseHints: {
      day: 'Найдите оборотней по их поведению и противоречиям'
    }
  },
  
  villager_3: {
    id: 'villager_3',
    name: 'Житель',
    description: 'Обычный житель без особых способностей.',
    team: 'village',
    color: 'blue',
    hasNightAction: false,
    nightOrder: 0,
    implemented: true,
    phaseHints: {
      day: 'Найдите оборотней по их поведению и противоречиям'
    }
  }
}

/**
 * API для работы с ролями
 */
export const getRole = (roleId) => ROLES_REGISTRY[roleId] || null
export const getAllRoles = () => ROLES_REGISTRY
export const getImplementedRoles = () => Object.fromEntries(Object.entries(ROLES_REGISTRY).filter(([_, role]) => role.implemented))
export const getRolesByTeam = (team) => Object.fromEntries(Object.entries(ROLES_REGISTRY).filter(([_, role]) => role.team === team))
export const validateRole = (roleId) => ROLES_REGISTRY.hasOwnProperty(roleId)
export const getTeamNames = () => ({
  village: 'Деревня',
  werewolf: 'Оборотни', 
  tanner: 'Неудачник',
  special: 'Особые'
})

export const validateRoleBalance = (selectedRoles) => {
  const counts = { village: 0, werewolf: 0, tanner: 0, special: 0 }
  const warnings = []
  
  selectedRoles.forEach(roleId => {
    const role = getRole(roleId)
    if (role) counts[role.team]++
  })
  
  const total = selectedRoles.length
  
  if (counts.werewolf === 0) warnings.push('Добавьте хотя бы одного оборотня')
  if (counts.werewolf > total / 2) warnings.push('Слишком много оборотней')
  if (counts.village === 0 && counts.special === 0) warnings.push('Добавьте роли деревни')
  
  return { balanced: warnings.length === 0, warnings, counts }
}