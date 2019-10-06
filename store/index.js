export const state = () => ({
    roles: {
        villager: {
            name: 'Мирный',
            description: 'Скучная роль',
            color: 'red',
            night: true,
            active: false
        },
        werewolf: {
            name: 'Оборотень',
            description: 'Слабее лва и тигра и наполовину угнетатель',
            color: 'black',
            night: true,
            active: true
        },
        witch: {
            name: 'Ведьма',
            description: 'Хуйня',
            color: 'red',
            night: true,
            active: true
        },
        ctulhu: {
            name: 'Ктулху',
            description: 'Пидор',
            color: 'green',
            night: true,
            active: true
        },
        tanner: {
            name: 'Неудачник',
            description: 'Разрабатывает программу для подбора игроков в мафии',
            color: 'brown',
            night: false,
            active: false
        },
        vampire: {
            name: 'Вампир',
            description: 'гей',
            color: 'violet',
            night: 'even',
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