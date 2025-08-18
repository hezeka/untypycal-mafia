const rolesConfig = {
  villager: {
    name: 'Мирный житель',
    description: 'Обычный житель без особых способностей. Цель - найти и убить оборотней.',
    color: 'blue',
    night: false,
    team: 'village',
    implemented: true,
    phaseHints: {
      day: 'Обсуждайте с другими жителями, кто может быть оборотнем.',
      night: 'Сейчас вы спите. Жители с ночными способностями выполняют свои действия.'
    }
  },
  sentinel: {
    name: 'Страж',
    description: 'Ночью может поставить щит на карту любого игрока (кроме своей). Защищённая карта не может быть просмотрена или перемещена.',
    color: 'blue',
    night: true,
    team: 'village',
    implemented: true,
    phaseHints: {
      day: 'Обсуждайте с другими жителями, кто может быть оборотнем.',
      night: 'Жители спят, вы можете поставить щит на любого игрока, чтобы защитить его от убийства оборотнями.'
    }
  },
  apprentice_seer: {
    name: 'Ученик провидца',
    description: 'Ночью может посмотреть одну из центральных карт.',
    color: 'blue',
    night: true,
    team: 'village',
    implemented: false,
    phaseHints: {
      day: 'Используйте информацию о центральной карте для поиска оборотней.',
      night: 'Посмотрите одну из центральных карт, чтобы узнать, какая роль не участвует в игре.'
    }
  },
  paranormal_investigator: {
    name: 'Паранормальный детектив',
    description: 'Может посмотреть до 2 карт игроков. Если найдёт оборотня или неудачника - становится им и останавливается.',
    color: 'blue',
    night: true,
    team: 'village',
    implemented: true,
    phaseHints: {
      day: 'Действуйте согласно последней роли, которую увидели ночью.',
      night: 'Посмотрите карты игроков. Осторожно: если найдёте оборотня или неудачника - станете им!'
    }
  },
  witch: {
    name: 'Ведьма',
    description: 'Может посмотреть центральную карту и ОБЯЗАТЕЛЬНО поменять её с картой игрока. Команда может измениться.',
    color: 'blue',
    night: true,
    team: 'village',
    implemented: false,
    phaseHints: {
      day: 'Ваша команда могла измениться после обмена картами.',
      night: 'Посмотрите центральную карту и ОБЯЗАТЕЛЬНО поменяйте её с картой любого игрока.'
    }
  },
  village_idiot: {
    name: 'Деревенский дурак',
    description: 'Может сдвинуть ВСЕ карты игроков (кроме своей) на одну позицию влево или вправо.',
    color: 'blue',
    night: true,
    team: 'village',
    implemented: false,
    phaseHints: {
      day: 'Учитывайте, что все роли игроков сдвинулись из-за ваших действий.',
      night: 'Сдвиньте все карты игроков (кроме своей) на одну позицию влево или вправо.'
    }
  },
  revealer: {
    name: 'Разоблачитель',
    description: 'Может открыть карту игрока лицом вверх. Если это оборотень или неудачник - переворачивает обратно.',
    color: 'blue',
    night: true,
    team: 'village',
    implemented: true,
    phaseHints: {
      day: 'Используйте информацию о карте, которую открыли ночью.',
      night: 'Откройте карту игрока. Оборотни и неудачники автоматически переворачиваются обратно.'
    }
  },
  curator: {
    name: 'Хранитель',
    description: 'Может положить случайный артефакт на карту любого игрока.',
    color: 'blue',
    night: true,
    team: 'village',
    implemented: false,
    phaseHints: {
      day: 'Помните, кому вы дали артефакт - это может помочь в поиске оборотней.',
      night: 'Выберите игрока, которому хотите дать случайный артефакт.'
    }
  },
  bodyguard: {
    name: 'Телохранитель',
    description: 'Игрок, на которого указывает телохранитель при голосовании, не может быть убит.',
    color: 'blue',
    night: false,
    team: 'village',
    implemented: true
  },
  seer: {
    name: 'Провидец',
    description: 'Может посмотреть карту одного игрока или две центральные карты.',
    color: 'blue',
    night: true,
    team: 'village',
    implemented: false,
    phaseHints: {
      day: 'Используйте полученную ночью информацию для поиска оборотней.',
      night: 'Выберите одного игрока чтобы узнать его роль, или посмотрите две центральные карты.'
    }
  },
  robber: {
    name: 'Грабитель',
    description: 'Меняет свою карту с картой другого игрока и смотрит свою новую роль.',
    color: 'blue',
    night: true,
    team: 'village',
    implemented: true,
    phaseHints: {
      day: 'Действуйте согласно роли, которую получили ночью.',
      night: 'Выберите игрока, с которым хотите поменяться ролями, и узнайте свою новую роль.'
    }
  },
  troublemaker: {
    name: 'Смутьян',
    description: 'Меняет карты двух других игроков местами.',
    color: 'blue',
    night: true,
    team: 'village',
    implemented: true,
    phaseHints: {
      day: 'Используйте информацию о том, чьи роли вы поменяли, для поиска оборотней.',
      night: 'Выберите двух игроков, которые поменяются ролями между собой.'
    }
  },
  drunk: {
    name: 'Пьяница',
    description: 'Меняет свою карту с одной из центральных карт.',
    color: 'blue',
    night: true,
    team: 'village',
    implemented: false,
    phaseHints: {
      day: 'Вы не знаете свою новую роль. Действуйте осторожно.',
      night: 'Поменяйте свою карту с одной из центральных карт. Вы НЕ узнаете свою новую роль!'
    }
  },
  insomniac: {
    name: 'Бессонница',
    description: 'В конце ночи смотрит на свою карту.',
    color: 'blue',
    night: true,
    team: 'village',
    implemented: true,
    phaseHints: {
      day: 'Вы знаете свою финальную роль после всех ночных действий.',
      night: 'Ждите конца ночи, чтобы посмотреть на свою карту и узнать финальную роль.'
    }
  },
  hunter: {
    name: 'Охотник',
    description: 'Если его убивают голосованием, тот на кого он указывает - тоже умирает.',
    color: 'blue',
    night: false,
    team: 'village',
    implemented: true
  },
  werewolf: {
    name: 'Оборотень',
    description: 'Ночью узнаёт других оборотней. Цель - остаться в живых.',
    color: 'red',
    night: true,
    team: 'werewolf',
    implemented: true,
    phaseHints: {
      day: 'Притворяйтесь обычным жителем. Не выдавайте других оборотней.',
      night: 'Узнайте других оборотней и обсудите с ними стратегию.'
    }
  },
  'werewolf-2': {
    name: 'Оборотень',
    description: 'Ночью узнаёт других оборотней. Цель - остаться в живых.',
    color: 'red',
    night: true,
    team: 'werewolf',
    implemented: true,
    phaseHints: {
      day: 'Притворяйтесь обычным жителем. Не выдавайте других оборотней.',
      night: 'Узнайте других оборотней и обсудите с ними стратегию.'
    }
  },
  'werewolf-3': {
    name: 'Оборотень',
    description: 'Ночью узнаёт других оборотней. Цель - остаться в живых.',
    color: 'red',
    night: true,
    team: 'werewolf',
    implemented: true,
    phaseHints: {
      day: 'Притворяйтесь обычным жителем. Не выдавайте других оборотней.',
      night: 'Узнайте других оборотней и обсудите с ними стратегию.'
    }
  },
  alpha_wolf: {
    name: 'Альфа-волк',
    description: 'Узнаёт других оборотней, затем меняет центральную карту оборотня с картой игрока.',
    color: 'red',
    night: true,
    team: 'werewolf',
    implemented: false,
    phaseHints: {
      day: 'Притворяйтесь обычным жителем. Помните о своих ночных действиях.',
      night: 'Сначала узнайте других оборотней, затем поменяйте центральную карту оборотня с картой игрока.'
    }
  },
  mystic_wolf: {
    name: 'Мистический волк',
    description: 'Узнаёт других оборотней, затем может посмотреть карту одного игрока.',
    color: 'red',
    night: true,
    team: 'werewolf',
    implemented: true,
    phaseHints: {
      day: 'Используйте полученную информацию о ролях для собственной выгоды.',
      night: 'Сначала узнайте других оборотней, затем посмотрите карту одного игрока на выбор.'
    }
  },
  dream_wolf: {
    name: 'Волк-сновидец',
    description: 'Не просыпается с оборотнями, только показывает большой палец. Другие оборотни его знают.',
    color: 'red',
    night: false,
    team: 'werewolf',
    implemented: true
  },
  minion: {
    name: 'Миньон',
    description: 'Видит всех оборотней. Побеждает с оборотнями, даже если его убили.',
    color: 'red',
    night: false,
    team: 'werewolf',
    implemented: true,
    phaseHints: {
      day: 'Защищайте оборотней, не выдавая себя. Можете пожертвовать собой.',
      night: 'Узнайте всех оборотней, но они вас не знают.'
    }
  },
  tanner: {
    name: 'Неудачник',
    description: 'Побеждает только если его убили. Если он умирает - всё остальные проигрывают.',
    color: 'brown',
    night: false,
    team: 'tanner',
    implemented: true,
    phaseHints: {
      day: 'Ведите себя подозрительно, чтобы на вас подумали. Ваша цель - быть убитым.',
      night: 'Сейчас вы спите. Жители с ночными способностями выполняют свои действия.'
    }
  },
  doppelganger: {
    name: 'Доппельгангер',
    description: 'Копирует способность увиденной роли и становится ею.',
    color: 'purple',
    night: true,
    team: 'special',
    implemented: true,
    phaseHints: {
      day: 'Действуйте согласно роли, которую скопировали. Ваша команда могла измениться!',
      night: 'Посмотрите карту игрока и скопируйте его способность. Если у него есть ночное действие - сделайте его!'
    }
  },
  game_master: {
    name: 'Ведущий',
    description: 'Управляет ходом игры, объявляет фазы и наблюдает за игроками.',
    color: 'gold',
    night: false,
    team: 'neutral',
    implemented: true
  }
}

// Порядок команд для сортировки
const teamOrder = {
  'village': 1,
  'werewolf': 2, 
  'tanner': 3,
  'special': 4,
  'neutral': 5
}

// Автоматическая сортировка: implemented -> team -> изначальный порядок
const sortedRoleEntries = Object.entries(rolesConfig)
  .map(([key, role], index) => [key, role, index]) // Добавляем изначальный индекс
  .sort(([, roleA, indexA], [, roleB, indexB]) => {
    // 1. Сначала по реализованности
    if (roleA.implemented && !roleB.implemented) return -1
    if (!roleA.implemented && roleB.implemented) return 1
    
    // 2. Потом по команде
    const teamOrderA = teamOrder[roleA.team] || 999
    const teamOrderB = teamOrder[roleB.team] || 999
    if (teamOrderA !== teamOrderB) return teamOrderA - teamOrderB
    
    // 3. В конце по изначальному порядку
    return indexA - indexB
  })

// Создаем отсортированный объект ролей
export const roles = sortedRoleEntries.reduce((acc, [key, value]) => {
  acc[key] = value
  return acc
}, {})

// Валидация ролей для проверки на сервере
export const validateRole = (roleId) => {
  return roles.hasOwnProperty(roleId)
}