// Helper functions for game logic

// Helper function to check if player can send messages
export function canSendMessage(room, player, messageType) {
  // Host can always send messages
  if (messageType === 'host') return true
  
  // During setup phase, all players can chat
  if (room.gameState === 'setup') return true
  
  // During day phase, all players can chat
  if (room.gameState === 'day') return true
  
  // During night phase, only werewolves can chat with each other
  if (room.gameState === 'night') {
    return room.canSeeWerewolfRoles(player.role)
  }
  
  // During voting phase, no one can chat
  if (room.gameState === 'voting') return false
  
  return false
}

// Helper function to determine who should receive the message
export function getMessageRecipients(room, messageType, sender) {
  const recipients = []
  
  // Host messages go to everyone
  if (messageType === 'host') {
    room.players.forEach((player) => {
      if (player.connected) {
        recipients.push(player.id)
      }
    })
    return recipients
  }
  
  // During setup and day phases, everyone sees messages
  if (room.gameState === 'setup' || room.gameState === 'day') {
    room.players.forEach((player) => {
      if (player.connected) {
        recipients.push(player.id)
      }
    })
    return recipients
  }
  
  // During night phase, only werewolves see werewolf messages
  if (room.gameState === 'night') {
    if (room.canSeeWerewolfRoles(sender.role)) {
      room.players.forEach((player) => {
        if (player.connected && room.canSeeWerewolfRoles(player.role)) {
          recipients.push(player.id)
        }
      })
    }
    return recipients
  }
  
  return recipients
}

// Generate room ID
export function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Validate player name
export function validatePlayerName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Имя не может быть пустым' }
  }
  
  const trimmed = name.trim()
  if (trimmed.length < 1) {
    return { valid: false, error: 'Имя не может быть пустым' }
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Имя слишком длинное (максимум 20 символов)' }
  }
  
  // Проверяем на недопустимые символы
  if (!/^[a-zA-Zа-яА-Я0-9\s_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Имя содержит недопустимые символы' }
  }
  
  return { valid: true, name: trimmed }
}

// Validate room ID format
export function validateRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') {
    return false
  }
  
  // Room ID должен быть 6 символов, только буквы и цифры
  return /^[A-Z0-9]{6}$/.test(roomId.toUpperCase())
}

// Clean up disconnected players after timeout
export function cleanupDisconnectedPlayers(room, timeoutMinutes = 30) {
  const timeoutMs = timeoutMinutes * 60 * 1000
  const now = Date.now()
  
  const playersToRemove = []
  
  room.players.forEach((player, playerId) => {
    if (!player.connected && player.disconnectedAt) {
      if (now - player.disconnectedAt > timeoutMs) {
        playersToRemove.push(playerId)
      }
    }
  })
  
  playersToRemove.forEach(playerId => {
    room.removePlayer(playerId)
    console.log(`🧹 Cleaned up disconnected player: ${playerId}`)
  })
  
  return playersToRemove.length
}

// Log game action for debugging
export function logGameAction(roomId, action, details = {}) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🎮 Room ${roomId}: ${action}`, details)
}

// Sanitize message content
export function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') {
    return ''
  }
  
  return message
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .substring(0, 300) // Max length
}

// Check if room can start game
export function canStartGame(room) {
  const playerCount = room.players.size
  const nonHostPlayerCount = playerCount - 1 // Исключаем ведущего
  const roleCount = room.selectedRoles.length

  if (nonHostPlayerCount !== roleCount) {
    return { 
      canStart: false, 
      error: `Нужно ${nonHostPlayerCount} ролей для ${nonHostPlayerCount} игроков (исключая ведущего). Сейчас выбрано: ${roleCount}` 
    }
  }

  if (nonHostPlayerCount < 2) {
    return { 
      canStart: false, 
      error: 'Для игры нужно минимум 2 игрока (исключая ведущего)' 
    }
  }

  // Проверяем, что все игроки подключены
  const disconnectedPlayers = Array.from(room.players.values())
    .filter(p => !p.connected && p.role !== 'game_master')
  
  if (disconnectedPlayers.length > 0) {
    return {
      canStart: false,
      error: `Некоторые игроки отключены: ${disconnectedPlayers.map(p => p.name).join(', ')}`
    }
  }

  return { canStart: true }
}

// Get game phase display name
export function getPhaseDisplayName(gameState, currentPhase) {
  const phases = {
    setup: 'Подготовка',
    night: 'Ночная фаза',
    day: 'Дневная фаза', 
    voting: 'Голосование',
    ended: 'Игра завершена'
  }
  
  return phases[gameState] || 'Неизвестная фаза'
}