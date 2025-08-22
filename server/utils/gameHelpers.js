/**
 * Игровые утилиты и хелперы
 */

import { VALIDATION } from './constants.js'

/**
 * Генерация уникального ID комнаты
 */
export const generateRoomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Валидация имени пользователя
 */
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Имя пользователя обязательно' }
  }
  
  const trimmed = username.trim()
  
  if (trimmed.length < VALIDATION.USERNAME.MIN_LENGTH) {
    return { valid: false, error: `Имя должно содержать минимум ${VALIDATION.USERNAME.MIN_LENGTH} символа` }
  }
  
  if (trimmed.length > VALIDATION.USERNAME.MAX_LENGTH) {
    return { valid: false, error: `Имя должно содержать максимум ${VALIDATION.USERNAME.MAX_LENGTH} символов` }
  }
  
  if (!VALIDATION.USERNAME.PATTERN.test(trimmed)) {
    return { valid: false, error: 'Имя содержит недопустимые символы' }
  }
  
  const lowerName = trimmed.toLowerCase()
  for (const forbidden of VALIDATION.USERNAME.FORBIDDEN_WORDS) {
    if (lowerName.includes(forbidden.toLowerCase())) {
      return { valid: false, error: 'Имя содержит запрещенные слова' }
    }
  }
  
  return { valid: true, username: trimmed }
}

/**
 * Валидация кода комнаты
 */
export const validateRoomCode = (code) => {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Код комнаты обязателен' }
  }
  
  const upperCode = code.trim().toUpperCase()
  
  if (upperCode.length !== VALIDATION.ROOM_CODE.LENGTH) {
    return { valid: false, error: `Код должен содержать ${VALIDATION.ROOM_CODE.LENGTH} символов` }
  }
  
  if (!VALIDATION.ROOM_CODE.PATTERN.test(upperCode)) {
    return { valid: false, error: 'Код должен содержать только буквы и цифры' }
  }
  
  return { valid: true, code: upperCode }
}

/**
 * Валидация сообщения
 */
export const validateMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Сообщение не может быть пустым' }
  }
  
  const trimmed = message.trim()
  
  if (trimmed.length < VALIDATION.MESSAGE.MIN_LENGTH) {
    return { valid: false, error: 'Сообщение слишком короткое' }
  }
  
  if (trimmed.length > VALIDATION.MESSAGE.MAX_LENGTH) {
    return { valid: false, error: 'Сообщение слишком длинное' }
  }
  
  return { valid: true, message: trimmed }
}

/**
 * Санитизация HTML для безопасного отображения
 */
export const sanitizeHtml = (text) => {
  if (!text) return ''
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Перемешивание массива (Fisher-Yates)
 */
export const shuffleArray = (array) => {
  const shuffled = [...array]
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled
}

/**
 * Получение случайного элемента из массива
 */
export const getRandomElement = (array) => {
  if (!array || array.length === 0) return null
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Получение случайных элементов из массива
 */
export const getRandomElements = (array, count) => {
  if (!array || array.length === 0) return []
  
  const shuffled = shuffleArray(array)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/**
 * Задержка выполнения
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Создание throttle функции
 */
export const throttle = (func, limit) => {
  let inThrottle
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Создание debounce функции
 */
export const debounce = (func, delay) => {
  let timeoutId
  
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * Безопасное JSON парсинг
 */
export const safeJsonParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str)
  } catch (error) {
    console.warn('Invalid JSON:', str)
    return defaultValue
  }
}

/**
 * Безопасное JSON stringify
 */
export const safeJsonStringify = (obj, defaultValue = '{}') => {
  try {
    return JSON.stringify(obj)
  } catch (error) {
    console.warn('JSON stringify error:', error)
    return defaultValue
  }
}

/**
 * Проверка является ли объект пустым
 */
export const isEmpty = (obj) => {
  if (obj == null) return true
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0
  if (obj instanceof Map || obj instanceof Set) return obj.size === 0
  return Object.keys(obj).length === 0
}

/**
 * Глубокое клонирование объекта
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (obj instanceof Set) return new Set([...obj].map(item => deepClone(item)))
  if (obj instanceof Map) return new Map([...obj].map(([key, val]) => [key, deepClone(val)]))
  
  const cloned = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  
  return cloned
}

/**
 * Форматирование времени
 */
export const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Форматирование длительности
 */
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return `${secs}с`
}

/**
 * Создание простого логгера
 */
export const createLogger = (prefix) => {
  return {
    info: (...args) => console.log(`ℹ️ [${prefix}]`, ...args),
    warn: (...args) => console.warn(`⚠️ [${prefix}]`, ...args),
    error: (...args) => console.error(`❌ [${prefix}]`, ...args),
    debug: (...args) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🐛 [${prefix}]`, ...args)
      }
    }
  }
}

/**
 * Валидация игрового действия
 */
export const validateGameAction = (action, player, gameState) => {
  if (!action || typeof action !== 'object') {
    return { valid: false, error: 'Неверный формат действия' }
  }
  
  if (!action.type) {
    return { valid: false, error: 'Тип действия обязателен' }
  }
  
  if (!player) {
    return { valid: false, error: 'Игрок не найден' }
  }
  
  if (!player.alive && action.type !== 'chat' && action.type !== 'whisper') {
    return { valid: false, error: 'Мертвые игроки не могут выполнять действия' }
  }
  
  return { valid: true }
}

/**
 * Получение информации об ошибке
 */
export const getErrorInfo = (error) => {
  return {
    message: error.message || 'Неизвестная ошибка',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: Date.now()
  }
}

/**
 * Создание ответа с ошибкой
 */
export const createErrorResponse = (code, message, details = null) => {
  return {
    error: true,
    code,
    message,
    details,
    timestamp: Date.now()
  }
}

/**
 * Создание успешного ответа
 */
export const createSuccessResponse = (data = null, message = null) => {
  return {
    success: true,
    data,
    message,
    timestamp: Date.now()
  }
}

/**
 * Проверка rate limiting
 */
export const checkRateLimit = (requests, timeWindow, maxRequests) => {
  const now = Date.now()
  const windowStart = now - timeWindow
  
  // Удаляем старые запросы
  const recentRequests = requests.filter(timestamp => timestamp > windowStart)
  
  // Проверяем лимит
  if (recentRequests.length >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((recentRequests[0] + timeWindow - now) / 1000)
    }
  }
  
  // Добавляем текущий запрос
  recentRequests.push(now)
  
  return {
    allowed: true,
    remaining: maxRequests - recentRequests.length
  }
}