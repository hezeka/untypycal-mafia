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

// Список запрещенных имен (системные, команды, группы)
const FORBIDDEN_NAMES = [
  // Системные
  'система', 'system', 'админ', 'admin', 'ведущий', 'host', 'сервер', 'server',
  'бот', 'bot', 'модератор', 'moderator', 'game_master', 'gamemaster',
  
  // Команды чата
  'шепот', 'whisper', 'помощь', 'help', 'кто', 'who', 'время', 'time',
  'список', 'list', 'все', 'all', 'everyone',
  
  // Группы
  'оборотни', 'волки', 'wolves', 'werewolves', 'деревня', 'жители', 
  'village', 'villagers', 'мафия', 'mafia',
  
  // Роли (основные)
  'провидец', 'seer', 'грабитель', 'robber', 'смутьян', 'troublemaker',
  'пьяница', 'drunk', 'неудачник', 'tanner', 'охотник', 'hunter',
  'оборотень', 'werewolf', 'миньон', 'minion',
  
  // Общие
  'игрок', 'player', 'гость', 'guest', 'аноним', 'anonymous', 'null', 'undefined'
]

// Форматирование и валидация имени игрока
export function validatePlayerName(name, existingPlayers = []) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Имя не может быть пустым' }
  }
  
  // Убираем лишние пробелы и форматируем
  let formattedName = name.trim()
  
  if (formattedName.length < 1) {
    return { valid: false, error: 'Имя не может быть пустым' }
  }
  
  if (formattedName.length > 15) {
    return { valid: false, error: 'Имя слишком длинное (максимум 15 символов)' }
  }
  
  // Проверяем на запрещенные символы
  if (!/^[a-zA-Zа-яА-Я0-9_-]+$/.test(formattedName)) {
    return { 
      valid: false, 
      error: 'Имя может содержать только буквы, цифры, дефис и подчеркивание. Пробелы и слеши запрещены!' 
    }
  }
  
  // Проверяем, что имя не начинается с цифры или спецсимвола
  if (!/^[a-zA-Zа-яА-Я]/.test(formattedName)) {
    return { 
      valid: false, 
      error: 'Имя должно начинаться с буквы' 
    }
  }
  
  // Проверяем на запрещенные имена
  const lowercaseName = formattedName.toLowerCase()
  if (FORBIDDEN_NAMES.includes(lowercaseName)) {
    return { 
      valid: false, 
      error: 'Это имя зарезервировано системой. Выберите другое.' 
    }
  }
  
  // Проверяем, что имя не похоже на команду
  if (lowercaseName.startsWith('/') || lowercaseName.includes('/')) {
    return { 
      valid: false, 
      error: 'Имя не может содержать слеши (символ /)' 
    }
  }
  
  // Проверяем на существующих игроков (регистронезависимо)
  const nameExists = existingPlayers.some(playerName => 
    playerName.toLowerCase() === lowercaseName
  )
  
  if (nameExists) {
    return { 
      valid: false, 
      error: 'Игрок с таким именем уже в комнате. Выберите другое имя.' 
    }
  }
  
  // Применяем форматирование
  formattedName = formatPlayerName(formattedName)
  
  return { valid: true, name: formattedName }
}

// Форматирование имени игрока для красивого отображения
function formatPlayerName(name) {
  // Делаем первую букву заглавной, остальные строчными
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

// Проверка имени при переподключении
export function validatePlayerNameForReconnection(name, room, excludeSocketId = null) {
  const existingPlayerNames = Array.from(room.players.values())
    .filter(p => p.id !== excludeSocketId) // Исключаем текущего игрока при переподключении
    .map(p => p.name)
  
  return validatePlayerName(name, existingPlayerNames)
}

// Получить список занятых имен в комнате
export function getExistingPlayerNames(room, excludeSocketId = null) {
  return Array.from(room.players.values())
    .filter(p => p.id !== excludeSocketId)
    .map(p => p.name)
}

// Предложить альтернативные имена
export function suggestAlternativeNames(originalName, existingNames) {
  const baseName = originalName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '').substring(0, 10)
  const suggestions = []
  
  // Пробуем добавить цифры
  for (let i = 1; i <= 9; i++) {
    const suggestion = `${baseName}${i}`
    if (!existingNames.includes(suggestion.toLowerCase()) && 
        !FORBIDDEN_NAMES.includes(suggestion.toLowerCase())) {
      suggestions.push(formatPlayerName(suggestion))
      if (suggestions.length >= 3) break
    }
  }
  
  // Пробуем добавить символы
  const suffixes = ['_new', '_player', '_user']
  for (const suffix of suffixes) {
    const suggestion = `${baseName}${suffix}`
    if (!existingNames.includes(suggestion.toLowerCase()) && 
        !FORBIDDEN_NAMES.includes(suggestion.toLowerCase())) {
      suggestions.push(formatPlayerName(suggestion))
      if (suggestions.length >= 5) break
    }
  }
  
  return suggestions
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

// Проверка имени на соответствие шаблонам ботов
export function looksLikeBot(name) {
  const botPatterns = [
    /bot/i,
    /бот/i,
    /test/i,
    /тест/i,
    /admin/i,
    /mod/i,
    /^user\d+$/i,
    /^guest\d+$/i,
    /^анон\d+$/i
  ]
  
  return botPatterns.some(pattern => pattern.test(name))
}

// Генерация случайного имени если нужно
export function generateRandomName(existingNames = []) {
  const adjectives = ['Хитрый', 'Мудрый', 'Быстрый', 'Смелый', 'Тихий', 'Ловкий']
  const animals = ['Волк', 'Лис', 'Кот', 'Сова', 'Еж', 'Заяц']
  
  let attempts = 0
  while (attempts < 20) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const animal = animals[Math.floor(Math.random() * animals.length)]
    const number = Math.floor(Math.random() * 99) + 1
    
    const name = `${adj}${animal}${number}`
    
    if (!existingNames.includes(name.toLowerCase())) {
      return name
    }
    attempts++
  }
  
  // Fallback
  return `Игрок${Date.now().toString().slice(-4)}`
}