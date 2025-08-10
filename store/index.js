export const state = () => ({
  socket: null,
  player: {
    id: null,
    name: '',
    role: null
  },
  room: {
    id: null,
    hostId: null,
    isHost: false
  },
  gameData: {
    players: [],
    selectedRoles: [],
    gameState: 'setup', // setup, night, day, voting, ended
    currentPhase: null,
    chat: []
  },
  roles: {
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
    }
  }
})

export const getters = {
  isConnected: state => state.socket && state.socket.connected,
  isInRoom: state => !!state.room.id,
  isHost: state => state.room.isHost,
  currentPlayer: state => state.gameData.players.find(p => p.id === state.player.id),
  otherPlayers: state => state.gameData.players.filter(p => p.id !== state.player.id),
  selectedRoleObjects: state => state.gameData.selectedRoles.map(roleId => ({
    id: roleId,
    ...state.roles[roleId]
  })),
  chatMessages: state => state.gameData.chat
}

export const mutations = {
  setSocket(state, socket) {
    state.socket = socket
  },
  
  setPlayer(state, { id, name }) {
    state.player.id = id
    state.player.name = name
  },
  
  setRoom(state, { id, hostId }) {
    state.room.id = id
    state.room.hostId = hostId
    state.room.isHost = hostId === state.player.id
  },
  
  updateGameData(state, gameData) {
    state.gameData = { ...state.gameData, ...gameData }
    
    // Update player role if available
    const currentPlayer = gameData.players?.find(p => p.id === state.player.id)
    if (currentPlayer && currentPlayer.role) {
      state.player.role = currentPlayer.role
    }
  },
  
  clearRoom(state) {
    state.room = { id: null, hostId: null, isHost: false }
    state.gameData = {
      players: [],
      selectedRoles: [],
      gameState: 'setup',
      currentPhase: null,
      chat: []
    }
    state.player.role = null
  },
  
  addChatMessage(state, message) {
    state.gameData.chat.push(message)
  }
}

export const actions = {
  initSocket({ commit, state }) {
    if (!state.socket) return
    
    state.socket.on('connect', () => {
      console.log('Connected to server')
    })
    
    state.socket.on('disconnect', () => {
      console.log('Disconnected from server')
    })
    
    state.socket.on('room-created', ({ roomId, gameData }) => {
      commit('setRoom', { id: roomId, hostId: gameData.hostId })
      commit('updateGameData', gameData)
    })
    
    state.socket.on('game-updated', (gameData) => {
      commit('updateGameData', gameData)
    })
    
    state.socket.on('game-started', (gameData) => {
      commit('updateGameData', gameData)
    })
    
    state.socket.on('phase-changed', ({ gameState, currentPhase }) => {
      commit('updateGameData', { gameState, currentPhase })
    })
    
    state.socket.on('new-message', (message) => {
      commit('addChatMessage', message)
    })
    
    state.socket.on('vote-updated', ({ votes }) => {
      const players = state.gameData.players.map(player => {
        const voteData = votes.find(v => v.id === player.id)
        return { ...player, votes: voteData ? voteData.votes : 0 }
      })
      commit('updateGameData', { players })
    })
    
    state.socket.on('game-ended', ({ eliminated, gameData }) => {
      commit('updateGameData', gameData)
      // Handle game end logic
    })
    
    state.socket.on('error', ({ message }) => {
      alert(message)
    })
  },
  
  createRoom({ commit, state }, playerName) {
    if (!state.socket) return
    
    commit('setPlayer', { id: state.socket.id, name: playerName })
    state.socket.emit('create-room', { playerName })
  },
  
  joinRoom({ commit, state }, { roomId, playerName }) {
    if (!state.socket) return
    
    commit('setPlayer', { id: state.socket.id, name: playerName })
    state.socket.emit('join-room', { roomId, playerName })
  },
  
  selectRole({ state }, roleId) {
    if (!state.socket || !state.room.isHost) return
    state.socket.emit('select-role', { roomId: state.room.id, roleId })
  },
  
  removeRole({ state }, roleId) {
    if (!state.socket || !state.room.isHost) return
    state.socket.emit('remove-role', { roomId: state.room.id, roleId })
  },
  
  startGame({ state }) {
    if (!state.socket || !state.room.isHost) return
    state.socket.emit('start-game', { roomId: state.room.id })
  },
  
  changePhase({ state }, { gameState, currentPhase }) {
    if (!state.socket || !state.room.isHost) return
    state.socket.emit('change-phase', { roomId: state.room.id, gameState, currentPhase })
  },
  
  sendMessage({ state }, message) {
    if (!state.socket) return
    state.socket.emit('send-message', { roomId: state.room.id, message })
  },
  
  votePlayer({ state }, targetId) {
    if (!state.socket) return
    state.socket.emit('vote-player', { roomId: state.room.id, targetId })
  },
  
  endVoting({ state }) {
    if (!state.socket || !state.room.isHost) return
    state.socket.emit('end-voting', { roomId: state.room.id })
  }
}