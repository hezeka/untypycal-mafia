// server/utils/constants.js - Все константы игры

// ✅ ФАЗЫ ИГРЫ
export const GAME_PHASES = {
  SETUP: 'setup',
  INTRODUCTION: 'introduction', 
  NIGHT: 'night',
  DAY: 'day',
  VOTING: 'voting',
  ENDED: 'ended'
}

// ✅ ДЛИТЕЛЬНОСТЬ ФАЗ (в секундах)
export const PHASE_DURATIONS = {
  INTRODUCTION: 180,    // 3 минуты
  NIGHT: 30,           // 30 секунд на действие
  DAY: 300,            // 5 минут
  VOTING: 120          // 2 минуты
}

// ✅ ТИПЫ СООБЩЕНИЙ ЧАТА
export const MESSAGE_TYPES = {
  PUBLIC: 'public',            // Обычное сообщение
  WHISPER: 'whisper',          // Личное сообщение
  GROUP_WHISPER: 'group_whisper', // Групповой шепот
  SYSTEM: 'system',            // Системное сообщение
  GAME_EVENT: 'game_event',    // Игровое событие
  NIGHT_RESULT: 'night_result', // Результат ночи
  VOTING_RESULT: 'voting_result' // Результат голосования
}

// ✅ SOCKET.IO СОБЫТИЯ
export const SOCKET_EVENTS = {
  // Клиент → Сервер
  CREATE_ROOM: 'create-room',
  JOIN_ROOM: 'join-room', 
  SEND_MESSAGE: 'send-message',
  START_GAME: 'start-game',
  VOTE: 'vote',
  NIGHT_ACTION: 'night-action',
  ADMIN_ACTION: 'admin-action',
  VOICE_ACTIVITY: 'voice-activity',
  
  // Сервер → Клиент
  ROOM_CREATED: 'room-created',
  JOIN_SUCCESS: 'join-success',        // ✅ Изменено с 'room-joined'
  GAME_STARTED: 'game-started',
  GAME_UPDATED: 'game-updated',
  NEW_MESSAGE: 'new-message',
  PHASE_CHANGED: 'phase-changed',
  VOTE_CAST: 'vote-cast',
  PLAYER_DISCONNECTED: 'player-disconnected',
  VOICE_ACTIVITY: 'voice-activity',
  WHISPER_ACTIVITY: 'whisper-activity',
  ERROR: 'error'
}

// ✅ КОДЫ ОШИБОК
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_ACTION: 'INVALID_ACTION',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR'
}

// ✅ ЛИМИТЫ
export const LIMITS = {
  MAX_PLAYERS_PER_ROOM: 10,
  MIN_PLAYERS_TO_START: 3,
  MAX_ROOMS_PER_IP: 3,
  MESSAGES_PER_MINUTE: 80,
  MAX_MESSAGE_LENGTH: 500,
  MAX_NAME_LENGTH: 20
}

// ✅ КОМАНДЫ РОЛЕЙ
export const ROLE_TEAMS = {
  VILLAGE: 'village',
  WEREWOLF: 'werewolf', 
  TANNER: 'tanner',
  SPECIAL: 'special',
  NEUTRAL: 'neutral'
}

// ✅ ПОРЯДОК НОЧНЫХ ДЕЙСТВИЙ (ONUW)
export const NIGHT_ORDER = {
  DOPPELGANGER: 2,
  WEREWOLF: 3,
  MINION: 4,
  SEER: 6,
  ROBBER: 7,
  TROUBLEMAKER: 8,
  DRUNK: 9,
  MYSTIC_WOLF: 11,
  DREAM_WOLF: 18,
  BODYGUARD: 19
}

// ✅ УСЛОВИЯ ПОБЕДЫ
export const WIN_CONDITIONS = {
  TANNER_KILLED: 'tanner_killed',      // Неудачник убит - он побеждает
  WEREWOLF_KILLED: 'werewolf_killed',  // Оборотень убит - деревня побеждает
  NO_WEREWOLVES_KILLED: 'no_werewolves_killed', // Ни один оборотень не убит - оборотни побеждают
  ALL_VILLAGE_DEAD: 'all_village_dead' // Вся деревня мертва - оборотни побеждают
}

// ✅ ЗВУКОВЫЕ ЭФФЕКТЫ
export const SOUNDS = {
  DAY: '/sounds/day.mp3',
  NIGHT: '/sounds/night.mp3',
  GAME_START: '/sounds/game-start.mp3',
  VOTING: '/sounds/voting.mp3',
  MESSAGE: '/sounds/message.mp3',
  WHISPER: '/sounds/whisper.mp3',
  NOTIFICATION: '/sounds/notification.mp3',
  PHASE_CHANGE: '/sounds/phase-change.mp3'
}

// ✅ ПУТИ К ИЗОБРАЖЕНИЯМ РОЛЕЙ
export const ROLE_IMAGES = {
  BASE_PATH: '/roles/',
  COMPRESSED_PATH: '/roles/compressed/',
  EXTENSION: '.png',
  COMPRESSED_EXTENSION: '.webp',
  FALLBACK: '/roles/villager.png'
}

// ✅ ЦВЕТА РОЛЕЙ
export const ROLE_COLORS = {
  VILLAGE: '#4ade80',     // Зеленый
  WEREWOLF: '#ef4444',    // Красный  
  TANNER: '#a16207',      // Коричневый
  SPECIAL: '#8b5cf6',     // Фиолетовый
  NEUTRAL: '#6b7280'      // Серый
}

// ✅ НАСТРОЙКИ ГОЛОСОВОЙ АКТИВНОСТИ
export const VOICE_SETTINGS = {
  THRESHOLD: 0.01,        // Порог чувствительности микрофона
  THROTTLE_MS: 150,       // Throttling для производительности
  SAMPLE_RATE: 16000,     // Частота дискретизации
  BUFFER_SIZE: 4096       // Размер буфера
}

// ✅ НАСТРОЙКИ ПРОИЗВОДИТЕЛЬНОСТИ
export const PERFORMANCE = {
  HEARTBEAT_INTERVAL: 25000,    // Ping каждые 25 секунд
  CLEANUP_INTERVAL: 300000,     // Очистка каждые 5 минут
  RATE_LIMIT_WINDOW: 1000,     // Окно rate limiting - 1 минута
  MAX_CHAT_HISTORY: 50,        // Максимум сообщений в истории чата
  SOCKET_TIMEOUT: 15000         // Таймаут сокетов - 30 секунд
}

// ✅ ВАЛИДАЦИЯ ДАННЫХ
export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 20,
  MIN_ROOM_ID_LENGTH: 4,
  MAX_ROOM_ID_LENGTH: 8,
  ALLOWED_NAME_CHARS: /^[а-яА-Яa-zA-Z0-9\s_-]+$/,
  HTML_SANITIZE: /<[^>]*>?/gm
}

// ✅ НАСТРОЙКИ РЕЖИМА РАЗРАБОТКИ
export const DEV_MODE = {
  LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  ENABLE_SOCKET_LOGS: process.env.NODE_ENV === 'development',
  MOCK_PLAYERS: process.env.NODE_ENV === 'development',
  SKIP_TIMERS: process.env.SKIP_TIMERS === 'true'
}