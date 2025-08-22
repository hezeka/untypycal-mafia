/**
 * Централизованный реестр ролей для клиента и сервера
 * Единственный источник правды о ролях в игре
 */

export const ROLES_REGISTRY = {
  villager: {
    id: 'villager',
    name: 'Житель',
    description: 'Обычный житель деревни. Побеждает если убит хотя бы один оборотень.',
    team: 'village',
    color: 'blue',
    hasNightAction: false,
    nightOrder: 999,
    implemented: true,
    phaseHints: {
      day: 'Ищите противоречия в заявлениях игроков',
      night: 'Вы спите, пока другие роли выполняют действия'
    }
  },
  
  seer: {
    id: 'seer', 
    name: 'Провидец',
    description: 'Ночью может посмотреть роль игрока ИЛИ две карты из центра.',
    team: 'village',
    color: 'blue',
    hasNightAction: true,
    nightOrder: 6,
    implemented: true,
    phaseHints: {
      night: 'ВЫБЕРИТЕ: посмотреть роль игрока ИЛИ карты центра',
      day: 'Поделитесь информацией чтобы помочь деревне'
    }
  },
  
  robber: {
    id: 'robber',
    name: 'Грабитель', 
    description: 'Ночью может поменяться ролями с другим игроком и узнать новую роль.',
    team: 'village',
    color: 'blue',
    hasNightAction: true,
    nightOrder: 7,
    implemented: true,
    phaseHints: {
      night: 'Выберите игрока для обмена ролями',
      day: 'Играйте за новую роль, которую получили'
    }
  },
  
  troublemaker: {
    id: 'troublemaker',
    name: 'Смутьян',
    description: 'Ночью меняет роли двух других игроков местами, не узнавая их.',
    team: 'village', 
    color: 'blue',
    hasNightAction: true,
    nightOrder: 8,
    implemented: true,
    phaseHints: {
      night: 'Выберите двух игроков для обмена ролями',
      day: 'Помните кого вы поменяли - это поможет найти оборотней'
    }
  },
  
  drunk: {
    id: 'drunk',
    name: 'Пьяница',
    description: 'Ночью меняет свою роль с картой из центра, не узнавая новую.',
    team: 'village',
    color: 'blue', 
    hasNightAction: true,
    nightOrder: 9,
    implemented: true,
    phaseHints: {
      night: 'Поменяйтесь с картой из центра. Новая роль будет скрыта!',
      day: 'Вы не знаете свою роль. Играйте осторожно'
    }
  },
  
  werewolf: {
    id: 'werewolf',
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
  },
  
  mystic_wolf: {
    id: 'mystic_wolf',
    name: 'Мистический волк',
    description: 'Узнает оборотней, затем может посмотреть карту ИЛИ проголосовать.',
    team: 'werewolf',
    color: 'red',
    hasNightAction: true,
    nightOrder: 11,
    implemented: true,
    phaseHints: {
      night: 'Найдите оборотней, затем ВЫБЕРИТЕ: карту ИЛИ голосование',
      day: 'Используйте информацию для обмана жителей'
    }
  },
  
  tanner: {
    id: 'tanner',
    name: 'Неудачник',
    description: 'Побеждает только если его убивают. Все остальные проигрывают.',
    team: 'tanner',
    color: 'brown',
    hasNightAction: false,
    nightOrder: 999,
    implemented: true,
    phaseHints: {
      night: 'Вы спите',
      day: 'Ведите себя подозрительно! Цель - чтобы вас убили'
    }
  },
  
  doppelganger: {
    id: 'doppelganger',
    name: 'Доппельгангер',
    description: 'Копирует роль игрока и становится ею. Выполняет ее ночное действие.',
    team: 'special',
    color: 'purple',
    hasNightAction: true,
    nightOrder: 2,
    implemented: true,
    phaseHints: {
      night: 'Посмотрите карту и скопируйте роль игрока',
      day: 'Играйте за скопированную роль. Команда могла измениться!'
    }
  },
  
  // Дополнительные оборотни для больших игр
  werewolf_2: {
    id: 'werewolf_2',
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
  },
  
  werewolf_3: {
    id: 'werewolf_3',
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
  }
}

/**
 * Получение роли по ID
 */
export const getRole = (roleId) => {
  return ROLES_REGISTRY[roleId] || null
}

/**
 * Получение всех ролей
 */
export const getAllRoles = () => {
  return ROLES_REGISTRY
}

/**
 * Получение реализованных ролей
 */
export const getImplementedRoles = () => {
  return Object.fromEntries(
    Object.entries(ROLES_REGISTRY).filter(([_, role]) => role.implemented)
  )
}

/**
 * Получение ролей по команде
 */
export const getRolesByTeam = (team) => {
  return Object.fromEntries(
    Object.entries(ROLES_REGISTRY).filter(([_, role]) => role.team === team)
  )
}

/**
 * Получение названий команд
 */
export const getTeamNames = () => {
  return {
    village: 'Деревня',
    werewolf: 'Оборотни', 
    tanner: 'Неудачник',
    special: 'Особые'
  }
}

/**
 * Валидация роли
 */
export const validateRole = (roleId) => {
  return ROLES_REGISTRY.hasOwnProperty(roleId)
}

/**
 * Проверка баланса ролей
 */
export const validateRoleBalance = (selectedRoles) => {
  const counts = { village: 0, werewolf: 0, tanner: 0, special: 0 }
  
  selectedRoles.forEach(roleId => {
    const role = getRole(roleId)
    if (role) counts[role.team]++
  })
  
  const warnings = []
  const total = selectedRoles.length
  
  if (counts.werewolf === 0) warnings.push('Добавьте хотя бы одного оборотня')
  if (counts.werewolf > total / 2) warnings.push('Слишком много оборотней')
  if (counts.village === 0 && counts.special === 0) warnings.push('Добавьте роли деревни')
  
  return { balanced: warnings.length === 0, warnings, counts }
}