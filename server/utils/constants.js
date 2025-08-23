/**
 * Константы игры
 */

// Фазы игры
export const GAME_PHASES = {
  SETUP: 'setup',
  INTRODUCTION: 'introduction',
  NIGHT: 'night',
  DAY: 'day',
  VOTING: 'voting',
  ENDED: 'ended'
}

// Длительность фаз в секундах
export const PHASE_DURATIONS = {
  [GAME_PHASES.INTRODUCTION]: 180, // 3 минуты
  [GAME_PHASES.NIGHT]: null,       // Зависит от действий
  [GAME_PHASES.DAY]: 300,          // 5 минут
  [GAME_PHASES.VOTING]: 120        // 2 минуты
}

// События Socket.IO
export const SOCKET_EVENTS = {
  // Подключение
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Комнаты
  CREATE_ROOM: 'create-room',
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  ROOM_CREATED: 'room-created',
  JOIN_SUCCESS: 'join-success',
  
  // Игра
  START_GAME: 'start-game',
  SELECT_ROLE: 'select-role',
  GAME_UPDATED: 'game-updated',
  PHASE_CHANGED: 'phase-changed',
  NIGHT_ACTION: 'night-action',
  NIGHT_ACTION_TURN: 'night-action-turn',
  
  // Голосование
  VOTE_PLAYER: 'vote-player',
  VOTING_ENDED: 'voting-ended',
  
  // Чат
  SEND_MESSAGE: 'send-message',
  NEW_MESSAGE: 'new-message',
  NEW_WHISPER: 'new-whisper',
  
  // Админ
  ADMIN_ACTION: 'admin-action',
  
  // Голосовая активность
  VOICE_ACTIVITY: 'voice-activity'
}

// Типы сообщений
export const MESSAGE_TYPES = {
  PUBLIC: 'public',
  WHISPER: 'whisper',
  SYSTEM: 'system',
  GAME_EVENT: 'game-event',
  VOTING_RESULT: 'voting-result',
  GAME_END: 'game-end'
}

// Лимиты
export const LIMITS = {
  MAX_PLAYERS_PER_ROOM: 10,
  MIN_PLAYERS_TO_START: 3,
  MAX_MESSAGES_PER_MINUTE: 20,
  MAX_USERNAME_LENGTH: 16,
  MIN_USERNAME_LENGTH: 2,
  ROOM_CODE_LENGTH: 6
}

// Коды ошибок
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  INVALID_ACTION: 'INVALID_ACTION',
  RATE_LIMITED: 'RATE_LIMITED'
}

// Команды чата
export const CHAT_COMMANDS = {
  WHISPER: ['/ш', '/w', '/whisper'],
  WHISPER_GROUP: ['/wg'],
  HELP: ['/help', '/помощь']
}

// Группы для шепота
export const WHISPER_GROUPS = {
  WEREWOLVES: ['оборотни', 'волки', 'wolves', 'werewolves'],
  VILLAGE: ['деревня', 'жители', 'village', 'villagers'],
  ALL: ['все', 'all'],
  HOST: ['ведущий', 'host', 'gm']
}

// Команды ролей
export const ROLE_TEAMS = {
  VILLAGE: 'village',
  WEREWOLF: 'werewolf', 
  TANNER: 'tanner',
  SPECIAL: 'special',
  NEUTRAL: 'neutral'
}