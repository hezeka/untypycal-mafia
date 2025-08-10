import { ref, computed, reactive } from 'vue'
import { useSocket } from './useSocket'

// Global state (persists across components)
const player = reactive({
  id: null,
  name: '',
  role: null
})

const room = reactive({
  id: null,
  hostId: null,
  isHost: false
})

const gameData = reactive({
  players: [],
  selectedRoles: [],
  gameState: 'setup',
  currentPhase: null,
  chat: []
})

const roles = {
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

export const useGame = () => {
  const { socket } = useSocket()

  // Computed properties
  const isInRoom = computed(() => !!room.id)
  const isHost = computed(() => room.isHost)
  const currentPlayer = computed(() => {
    const current = gameData.players.find(p => p.id === player.id)
    if (current) {
      console.log('🔍 Current player found in gameData:', current)
    } else {
      console.log('❌ Current player NOT found in gameData. Player ID:', player.id)
      console.log('📊 Available players:', gameData.players.map(p => ({ id: p.id, name: p.name, role: p.role })))
    }
    return current
  })
  const otherPlayers = computed(() => gameData.players.filter(p => p.id !== player.id && p.role !== 'game_master'))
  const allPlayers = computed(() => gameData.players.filter(p => p.role !== 'game_master'))
  const allPlayersForVoting = computed(() => gameData.players.filter(p => p.role !== 'game_master')) // Includes self for voting
  const selectedRoleObjects = computed(() => 
    gameData.selectedRoles.map(roleId => ({ id: roleId, ...roles[roleId] }))
  )
  const chatMessages = computed(() => gameData.chat)

  // Socket event handlers
  const initSocketListeners = () => {
    socket.on('room-created', ({ roomId, gameData: newGameData }) => {
      room.id = roomId
      room.hostId = newGameData.hostId
      room.isHost = newGameData.hostId === player.id
      updateGameData(newGameData)
    })

    socket.on('join-success', (newGameData) => {
      console.log('📥 Join success event received:', newGameData)
      
      // Successful join/rejoin
      room.id = newGameData.id
      room.hostId = newGameData.hostId
      room.isHost = newGameData.hostId === player.id
      updateGameData(newGameData)
      
      // Restore player role from server data
      const currentPlayerData = newGameData.players?.find(p => p.id === player.id)
      if (currentPlayerData) {
        console.log('👤 Current player data from server:', currentPlayerData)
        if (currentPlayerData.role) {
          player.role = currentPlayerData.role
          console.log(`✅ Restored role: ${currentPlayerData.role}`)
        } else {
          console.log('⚠️ No role found in server data')
        }
      } else {
        console.log('❌ Player not found in server response')
      }
      
      console.log('🎮 Final player state:', { id: player.id, name: player.name, role: player.role })
    })

    socket.on('game-updated', (newGameData) => {
      const oldRole = player.role
      updateGameData(newGameData)
      
      // Update room info if not set
      if (!room.id && newGameData.id) {
        room.id = newGameData.id
        room.hostId = newGameData.hostId
        room.isHost = newGameData.hostId === player.id
      }
      
      // Check if current player's role changed
      const currentPlayerData = newGameData.players?.find(p => p.id === player.id)
      if (currentPlayerData && currentPlayerData.role && currentPlayerData.role !== oldRole) {
        player.role = currentPlayerData.role
        console.log(`Your role changed to: ${currentPlayerData.role}`)
      }
    })

    socket.on('game-started', (newGameData) => {
      console.log('🚀 Game started event:', newGameData)
      updateGameData(newGameData)
      
      // Force update player role when game starts
      const currentPlayerData = newGameData.players?.find(p => p.id === player.id)
      if (currentPlayerData && currentPlayerData.role) {
        player.role = currentPlayerData.role
        console.log(`🎭 Role assigned at game start: ${currentPlayerData.role}`)
      }
    })

    socket.on('phase-changed', ({ gameState, currentPhase }) => {
      gameData.gameState = gameState
      gameData.currentPhase = currentPhase
    })

    socket.on('new-message', (message) => {
      // Avoid duplicating messages - check if message already exists
      const existingMessage = gameData.chat.find(m => m.id === message.id)
      if (!existingMessage) {
        gameData.chat.push(message)
      }
    })

    socket.on('vote-updated', ({ votes }) => {
      gameData.players = gameData.players.map(p => {
        const voteData = votes.find(v => v.id === p.id)
        return { ...p, votes: voteData ? voteData.votes : 0 }
      })
    })

    socket.on('game-ended', ({ eliminated, gameData: newGameData }) => {
      updateGameData(newGameData)
    })

    socket.on('timer-updated', ({ timer }) => {
      gameData.timer = timer
    })

    socket.on('kicked', ({ message }) => {
      alert(message)
      // Redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    })

    socket.on('error', ({ message }) => {
      console.error('Game error:', message)
      alert(message)
    })
  }

  // Helper functions
  const updateGameData = (newGameData) => {
    Object.assign(gameData, newGameData)
    
    const currentPlayerData = newGameData.players?.find(p => p.id === player.id)
    if (currentPlayerData && currentPlayerData.role) {
      player.role = currentPlayerData.role
    }
  }

  const clearRoom = () => {
    room.id = null
    room.hostId = null
    room.isHost = false
    gameData.players = []
    gameData.selectedRoles = []
    gameData.gameState = 'setup'
    gameData.currentPhase = null
    gameData.chat = []
    player.role = null
  }

  // Actions
  const createRoom = (playerName) => {
    player.id = socket.id
    player.name = playerName
    socket.emit('create-room', { playerName })
  }

  const joinRoom = ({ roomId, playerName }) => {
    player.id = socket.id
    player.name = playerName
    room.id = roomId // Set room ID immediately for UI
    socket.emit('join-room', { roomId, playerName })
  }

  const selectRole = (roleId) => {
    if (!isHost.value) return
    socket.emit('select-role', { roomId: room.id, roleId })
  }

  const removeRole = (roleId) => {
    if (!isHost.value) return
    socket.emit('remove-role', { roomId: room.id, roleId })
  }

  const startGame = () => {
    if (!isHost.value) return
    socket.emit('start-game', { roomId: room.id })
  }

  const changePhase = ({ gameState, currentPhase }) => {
    if (!isHost.value) return
    socket.emit('change-phase', { roomId: room.id, gameState, currentPhase })
  }

  const sendMessage = (message) => {
    socket.emit('send-message', { roomId: room.id, message })
  }

  const votePlayer = (targetId) => {
    socket.emit('vote-player', { roomId: room.id, targetId })
  }

  const endVoting = () => {
    if (!isHost.value) return
    socket.emit('end-voting', { roomId: room.id })
  }

  const adminAction = (action, targetId, newRole = null) => {
    if (!isHost.value) return
    socket.emit('admin-action', { roomId: room.id, action, targetId, newRole })
  }

  const nextPhase = () => {
    if (!isHost.value) return
    socket.emit('next-phase', { roomId: room.id })
  }

  const setTimer = (timer) => {
    if (!isHost.value) return
    socket.emit('change-timer', { roomId: room.id, timer })
  }

  return {
    // State
    player: readonly(player),
    room: readonly(room),
    gameData: readonly(gameData),
    roles,

    // Computed
    isInRoom,
    isHost,
    currentPlayer,
    otherPlayers,
    allPlayers,
    allPlayersForVoting,
    selectedRoleObjects,
    chatMessages,

    // Methods
    initSocketListeners,
    updateGameData,
    clearRoom,
    createRoom,
    joinRoom,
    selectRole,
    removeRole,
    startGame,
    changePhase,
    sendMessage,
    votePlayer,
    endVoting,
    adminAction,
    nextPhase,
    setTimer
  }
}