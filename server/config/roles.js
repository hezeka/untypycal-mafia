export const roles = {
  villager: {
    name: 'Мирный житель',
    description: 'Обычный житель без особых способностей. Цель - найти и убить оборотней.',
    color: 'blue',
    night: false,
    team: 'village'
  },
  sentinel: {
    name: 'Страж',
    description: 'Ночью может поставить щит на карту любого игрока (кроме своей). Защищённая карта не может быть просмотрена или перемещена.',
    color: 'blue',
    night: true,
    team: 'village'
  },
  apprentice_seer: {
    name: 'Ученик провидца',
    description: 'Ночью может посмотреть одну из центральных карт.',
    color: 'blue',
    night: true,
    team: 'village'
  },
  paranormal_investigator: {
    name: 'Паранормальный детектив',
    description: 'Может посмотреть до 2 карт игроков. Если найдёт оборотня или неудачника - становится им и останавливается.',
    color: 'blue',
    night: true,
    team: 'village'
  },
  witch: {
    name: 'Ведьма',
    description: 'Может посмотреть центральную карту и ОБЯЗАТЕЛЬНО поменять её с картой игрока. Команда может измениться.',
    color: 'blue',
    night: true,
    team: 'village'
  },
  village_idiot: {
    name: 'Деревенский дурак',
    description: 'Может сдвинуть ВСЕ карты игроков (кроме своей) на одну позицию влево или вправо.',
    color: 'blue',
    night: true,
    team: 'village'
  },
  revealer: {
    name: 'Разоблачитель',
    description: 'Может открыть карту игрока лицом вверх. Если это оборотень или неудачник - переворачивает обратно.',
    color: 'blue',
    night: true,
    team: 'village'
  },
  curator: {
    name: 'Хранитель',
    description: 'Может положить случайный артефакт на карту любого игрока.',
    color: 'blue',
    night: true,
    team: 'village'
  },
  bodyguard: {
    name: 'Телохранитель',
    description: 'Игрок, на которого указывает телохранитель при голосовании, не может быть убит.',
    color: 'blue',
    night: false,
    team: 'village'
  },
  seer: {
    name: 'Провидец',
    description: 'Может посмотреть карту одного игрока или две центральные карты.',
    color: 'blue',
    night: true,
    team: 'village'
  },
  robber: {
    name: 'Грабитель',
    description: 'Меняет свою карту с картой другого игрока и смотрит свою новую роль.',
    color: 'blue',
    night: true,
    team: 'village'
  },
  troublemaker: {
    name: 'Смутьян',
    description: 'Меняет карты двух других игроков местами.',
    color: 'blue',
    night: true,
    team: 'village'
  },
  drunk: {
    name: 'Пьяница',
    description: 'Меняет свою карту с одной из центральных карт.',
    color: 'blue',
    night: true,
    team: 'village'
  },
  insomniac: {
    name: 'Бессонница',
    description: 'В конце ночи смотрит на свою карту.',
    color: 'blue',
    night: true,
    team: 'village'
  },
  hunter: {
    name: 'Охотник',
    description: 'Если его убивают голосованием, тот на кого он указывает - тоже умирает.',
    color: 'blue',
    night: false,
    team: 'village'
  },
  werewolf: {
    name: 'Оборотень',
    description: 'Ночью узнаёт других оборотней. Цель - остаться в живых.',
    color: 'red',
    night: true,
    team: 'werewolf'
  },
  alpha_wolf: {
    name: 'Альфа-волк',
    description: 'Узнаёт других оборотней, затем меняет центральную карту оборотня с картой игрока.',
    color: 'red',
    night: true,
    team: 'werewolf'
  },
  mystic_wolf: {
    name: 'Мистический волк',
    description: 'Узнаёт других оборотней, затем может посмотреть карту одного игрока.',
    color: 'red',
    night: true,
    team: 'werewolf'
  },
  dream_wolf: {
    name: 'Волк-сновидец',
    description: 'Не просыпается с оборотнями, только показывает большой палец. Другие оборотни его знают.',
    color: 'red',
    night: false,
    team: 'werewolf'
  },
  minion: {
    name: 'Миньон',
    description: 'Видит всех оборотней. Побеждает с оборотнями, даже если его убили.',
    color: 'red',
    night: true,
    team: 'werewolf'
  },
  tanner: {
    name: 'Неудачник',
    description: 'Побеждает только если его убили. Если он умирает - оборотни не могут победить.',
    color: 'brown',
    night: false,
    team: 'tanner'
  },
  doppelganger: {
    name: 'Доппельгангер',
    description: 'Копирует способность увиденной роли и становится ею.',
    color: 'purple',
    night: true,
    team: 'special'
  },
  game_master: {
    name: 'Ведущий',
    description: 'Управляет ходом игры, объявляет фазы и наблюдает за игроками.',
    color: 'gold',
    night: false,
    team: 'neutral'
  }
}

// Валидация ролей для проверки на сервере
export const validateRole = (roleId) => {
  return roles.hasOwnProperty(roleId)
}