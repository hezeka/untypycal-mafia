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
    name: roleId // Fallback, роли теперь загружаются через API
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