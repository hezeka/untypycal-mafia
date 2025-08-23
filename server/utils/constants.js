/**
 * Константы игры - все магические числа в одном месте
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

// Продолжительность фаз в секундах
export const PHASE_DURATIONS = {
  [GAME_PHASES.INTRODUCTION]: 180, // 3 минуты
  [GAME_PHASES.NIGHT]: 30,         // 30 секунд на каждое действие
  [GAME_PHASES.DAY]: 300,          // 5 минут
  [GAME_PHASES.VOTING]: 120        // 2 минуты на голосование
}

// Команды ролей
export const ROLE_TEAMS = {
  VILLAGE: 'village',
  WEREWOLF: 'werewolf', 
  TANNER: 'tanner',
  SPECIAL: 'special',
  NEUTRAL: 'neutral'
}

// Цвета ролей
export const ROLE_COLORS = {
  VILLAGE: 'blue',
  WEREWOLF: 'red',
  TANNER: 'brown',
  SPECIAL: 'purple',
  NEUTRAL: 'gold'
}

// Порядок ночных действий (согласно ONUW)
export const NIGHT_ORDER = {
  COPYCAT: 1,
  DOPPELGANGER: 2,
  WEREWOLF: 3,
  MINION: 4,
  MASON: 5,
  SEER: 6,
  ROBBER: 7,
  TROUBLEMAKER: 8,
  DRUNK: 9,
  INSOMNIAC: 10,
  MYSTIC_WOLF: 11,
  APPRENTICE_SEER: 12,
  PARANORMAL_INVESTIGATOR: 13,
  WITCH: 14,
  VILLAGE_IDIOT: 15,
  REVEALER: 16,
  CURATOR: 17,
  DREAM_WOLF: 18,
  BODYGUARD: 19,
  HUNTER: 20
}

// Типы сообщений чата
export const MESSAGE_TYPES = {
  PLAYER: 'player',
  HOST: 'host', 
  SYSTEM: 'system',
  WHISPER: 'whisper',
  GROUP_WHISPER: 'group_whisper',
  WEREWOLF: 'werewolf'
}

// Команды чата
export const CHAT_COMMANDS = {
  WHISPER: ['/w', '/whisper', '/ш'],
  GROUP_WHISPER: ['/wg', '/шг'],
  HELP: ['/help', '/помощь', '/?']
}

// Группы для шепота
export const WHISPER_GROUPS = {
  WEREWOLVES: ['оборотни', 'волки', 'wolves', 'werewolves', 'ww'],
  VILLAGE: ['деревня', 'жители', 'village', 'villagers'],
  ALL: ['все', 'all', 'everyone'],
  HOST: ['ведущий', 'host', 'gm', 'gamemaster']
}

// Лимиты безопасности
export const LIMITS = {
  MAX_MESSAGE_LENGTH: 500,
  MAX_MESSAGES_PER_MINUTE: 20,
  MAX_ROOMS_PER_IP: 3,
  ROOM_CLEANUP_INTERVAL: 300000, // 5 минут
  PLAYER_DISCONNECT_TIMEOUT: 120000, // 2 минуты
  MAX_PLAYERS_PER_ROOM: 20,
  MIN_PLAYERS_TO_START: 3
}

// Коды ошибок
export const ERROR_CODES = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  INVALID_ROLE: 'INVALID_ROLE',
  INVALID_PHASE: 'INVALID_PHASE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
  NOT_ENOUGH_PLAYERS: 'NOT_ENOUGH_PLAYERS',
  TOO_MANY_PLAYERS: 'TOO_MANY_PLAYERS'
}

// Ключи для локализации
export const I18N_KEYS = {
  // Фазы игры
  PHASE_SETUP: 'phases.setup',
  PHASE_INTRODUCTION: 'phases.introduction',
  PHASE_NIGHT: 'phases.night',
  PHASE_DAY: 'phases.day',
  PHASE_VOTING: 'phases.voting',
  PHASE_ENDED: 'phases.ended',
  
  // Роли
  ROLE_VILLAGER: 'roles.villager.name',
  ROLE_WEREWOLF: 'roles.werewolf.name',
  ROLE_SEER: 'roles.seer.name',
  ROLE_ROBBER: 'roles.robber.name',
  ROLE_TROUBLEMAKER: 'roles.troublemaker.name',
  ROLE_TANNER: 'roles.tanner.name',
  ROLE_DRUNK: 'roles.drunk.name',
  ROLE_INSOMNIAC: 'roles.insomniac.name',
  ROLE_MINION: 'roles.minion.name',
  ROLE_MASON: 'roles.mason.name',
  ROLE_HUNTER: 'roles.hunter.name',
  ROLE_DOPPELGANGER: 'roles.doppelganger.name',
  
  // Действия
  ACTION_VOTE: 'actions.vote',
  ACTION_PROTECT: 'actions.protect',
  ACTION_INVESTIGATE: 'actions.investigate',
  ACTION_SWAP: 'actions.swap',
  ACTION_LOOK: 'actions.look',
  
  // Сообщения
  MESSAGE_GAME_STARTED: 'messages.game_started',
  MESSAGE_PHASE_CHANGED: 'messages.phase_changed',
  MESSAGE_PLAYER_KILLED: 'messages.player_killed',
  MESSAGE_PLAYER_PROTECTED: 'messages.player_protected',
  MESSAGE_VOTING_STARTED: 'messages.voting_started',
  MESSAGE_GAME_ENDED: 'messages.game_ended'
}

// События WebSocket
export const SOCKET_EVENTS = {
  // Клиент -> Сервер
  CREATE_ROOM: 'create-room',
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  START_GAME: 'start-game',
  SELECT_ROLE: 'select-role',
  REMOVE_ROLE: 'remove-role',
  CHANGE_PHASE: 'change-phase',
  SEND_MESSAGE: 'send-message',
  VOTE_PLAYER: 'vote-player',
  NIGHT_ACTION: 'night-action',
  VOICE_ACTIVITY: 'voice-activity',
  ADMIN_ACTION: 'admin-action',
  
  // Сервер -> Клиент
  ROOM_CREATED: 'room-created',
  JOIN_SUCCESS: 'join-success',
  JOIN_ERROR: 'join-error',
  GAME_UPDATED: 'game-updated',
  PHASE_CHANGED: 'phase-changed',
  NEW_MESSAGE: 'new-message',
  NEW_WHISPER: 'new-whisper',
  VOTING_STARTED: 'voting-started',
  VOTING_ENDED: 'voting-ended',
  TIMER_UPDATED: 'timer-updated',
  GAME_ENDED: 'game-ended',
  ERROR: 'error',
  
  // Системные события
  PLAYER_CONNECTED: 'player-connected',
  PLAYER_DISCONNECTED: 'player-disconnected',
  ROOM_DESTROYED: 'room-destroyed'
}

// Валидация данных
export const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Zа-яА-Я0-9\s\-_.]+$/u,
    FORBIDDEN_WORDS: ['admin', 'moderator', 'ведущий', 'система', 'system', 'bot']
  },
  
  ROOM_CODE: {
    LENGTH: 6,
    PATTERN: /^[A-Z0-9]{6}$/
  },
  
  MESSAGE: {
    MAX_LENGTH: 500,
    MIN_LENGTH: 1
  }
}

// Настройки PWA
export const PWA_CONFIG = {
  NAME: 'Нетипичная Мафия',
  SHORT_NAME: 'Мафия',
  DESCRIPTION: 'Социально-дедукционная игра основанная на One Night Ultimate Werewolf',
  THEME_COLOR: '#1a1a1a',
  BACKGROUND_COLOR: '#000000',
  DISPLAY: 'standalone',
  ORIENTATION: 'portrait'
}

// Настройки звуков
export const SOUND_CONFIG = {
  ENABLED_BY_DEFAULT: true,
  DEFAULT_VOLUME: 0.7,
  SOUND_FILES: {
    PHASE_CHANGE: '/sounds/phase-change.mp3',
    MESSAGE: '/sounds/message.mp3',
    WHISPER: '/sounds/whisper.mp3',
    VOTING: '/sounds/voting.mp3',
    GAME_START: '/sounds/game-start.mp3',
    GAME_END: '/sounds/game-end.mp3',
    NIGHT: '/sounds/night.mp3',
    DAY: '/sounds/day.mp3'
  }
}

// Настройки голосовой активности
export const VOICE_CONFIG = {
  VAD_THRESHOLD: 0.5,
  VAD_THROTTLE: 150, // мс
  MAX_SPEAKING_TIME: 60000 // 1 минута
}