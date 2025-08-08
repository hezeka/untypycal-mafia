export const state = () => ({
    roles: {
        villager: {
            name: 'Мирный житель',
            description: 'Обычный житель без особых способностей. Цель - найти и убить оборотней.',
            color: 'blue',
            night: false,
            active: false
        },
        
        sentinel: {
            name: 'Страж',
            description: 'Ночью может поставить щит на карту любого игрока (кроме своей). Защищённая карта не может быть просмотрена или перемещена.',
            color: 'blue',
            night: true,
            active: true
        },
        
        apprentice_seer: {
            name: 'Ученик провидца',
            description: 'Ночью может посмотреть одну из центральных карт.',
            color: 'blue',
            night: true,
            active: true
        },
        
        paranormal_investigator: {
            name: 'Паранормальный детектив',
            description: 'Может посмотреть до 2 карт игроков. Если найдёт оборотня или неудачника - становится им и останавливается.',
            color: 'blue',
            night: true,
            active: true
        },
        
        witch: {
            name: 'Ведьма',
            description: 'Может посмотреть центральную карту и ОБЯЗАТЕЛЬНО поменять её с картой игрока. Команда может измениться.',
            color: 'blue',
            night: true,
            active: true
        },
        
        village_idiot: {
            name: 'Деревенский дурак',
            description: 'Может сдвинуть ВСЕ карты игроков (кроме своей) на одну позицию влево или вправо.',
            color: 'blue',
            night: true,
            active: true
        },
        
        revealer: {
            name: 'Разоблачитель',
            description: 'Может открыть карту игрока лицом вверх. Если это оборотень или неудачник - переворачивает обратно.',
            color: 'blue',
            night: true,
            active: true
        },
        
        curator: {
            name: 'Хранитель',
            description: 'Может положить случайный артефакт на карту любого игрока.',
            color: 'blue',
            night: true,
            active: true
        },
        
        bodyguard: {
            name: 'Телохранитель',
            description: 'Игрок, на которого указывает телохранитель при голосовании, не может быть убит.',
            color: 'blue',
            night: false,
            active: false
        },
        
        seer: {
            name: 'Провидец',
            description: 'Может посмотреть карту одного игрока или две центральные карты.',
            color: 'blue',
            night: true,
            active: true
        },
        
        robber: {
            name: 'Грабитель',
            description: 'Меняет свою карту с картой другого игрока и смотрит свою новую роль.',
            color: 'blue',
            night: true,
            active: true
        },
        
        troublemaker: {
            name: 'Смутьян',
            description: 'Меняет карты двух других игроков местами.',
            color: 'blue',
            night: true,
            active: true
        },
        
        drunk: {
            name: 'Пьяница',
            description: 'Меняет свою карту с одной из центральных карт.',
            color: 'blue',
            night: true,
            active: true
        },
        
        insomniac: {
            name: 'Бессонница',
            description: 'В конце ночи смотрит на свою карту.',
            color: 'blue',
            night: true,
            active: true
        },
        
        hunter: {
            name: 'Охотник',
            description: 'Если его убивают голосованием, тот на кого он указывает - тоже умирает.',
            color: 'blue',
            night: false,
            active: false
        },
        
        // КОМАНДА ОБОРОТНЕЙ
        werewolf: {
            name: 'Оборотень',
            description: 'Ночью узнаёт других оборотней. Цель - остаться в живых.',
            color: 'red',
            night: true,
            active: false
        },
        
        alpha_wolf: {
            name: 'Альфа-волк',
            description: 'Узнаёт других оборотней, затем меняет центральную карту оборотня с картой игрока.',
            color: 'red',
            night: true,
            active: true
        },
        
        mystic_wolf: {
            name: 'Мистический волк',
            description: 'Узнаёт других оборотней, затем может посмотреть карту одного игрока.',
            color: 'red',
            night: true,
            active: true
        },
        
        dream_wolf: {
            name: 'Волк-сновидец',
            description: 'Не просыпается с оборотнями, только показывает большой палец. Другие оборотни его знают.',
            color: 'red',
            night: false,
            active: false
        },
        
        minion: {
            name: 'Миньон',
            description: 'Видит всех оборотней. Побеждает с оборотнями, даже если его убили.',
            color: 'red',
            night: true,
            active: false
        },
        
        // ОСОБЫЕ РОЛИ
        tanner: {
            name: 'Неудачник',
            description: 'Побеждает только если его убили. Если он умирает - оборотни не могут победить.',
            color: 'brown',
            night: false,
            active: false
        },
        
        doppelganger: {
            name: 'Доппельгангер',
            description: 'Копирует способность увиденной роли и становится ею.',
            color: 'purple',
            night: true,
            active: true
        }
    },
    selectedRoles: [],
    players: []
})

export const getters = {
    roles: s => s.roles,
    selectedRoles: s => s.selectedRoles,
    players: s => s.players
}

const setLS = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value))
}

export const mutations = {
    selectRole(s, role) {
        s.selectedRoles.push(role)
        setLS('roles', s.selectedRoles)
    },
    removeRole(s, index) {
        s.selectedRoles.splice(index, 1)
        setLS('roles', s.selectedRoles)
    },
    addPlayer(s, player) {
        s.players.push({name: player})
        setLS('players', s.players)
    },
    deletePlayer(s, index) {
        s.players.splice(index, 1)
        setLS('players', s.players)
    },
    setRolePlayer(s, index, role) {
        s.players[index].role = role
        setLS('players', s.players)
    },
    killPlayer(s, index) {
        if (!s.players[index].defend) {
            s.players[index].dead = true
        }
        setLS('players', s.players)
    },
    defendPlayer(s, index) {
        s.players[index].defend = true
        s.players[index].dead = false
        setLS('players', s.players)
    },
    push(s, {players, roles} = JSON.stringify({players: [], roles: []})) {
        players != undefined ? s.players = JSON.parse(players) : ''
        roles != undefined ? s.selectedRoles = JSON.parse(roles) : ''
    }
}