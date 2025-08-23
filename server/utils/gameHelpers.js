/**
 * Утилиты для игры
 */

import { LIMITS } from './constants.js'

/**
 * Генерация ID комнаты
 */
export const generateRoomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < LIMITS.ROOM_CODE_LENGTH; i++) {
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
  
  if (trimmed.length < LIMITS.MIN_USERNAME_LENGTH) {
    return { valid: false, error: `Имя должно быть не менее ${LIMITS.MIN_USERNAME_LENGTH} символов` }
  }
  
  if (trimmed.length > LIMITS.MAX_USERNAME_LENGTH) {
    return { valid: false, error: `Имя должно быть не более ${LIMITS.MAX_USERNAME_LENGTH} символов` }
  }
  
  // Проверяем на недопустимые символы
  const validPattern = /^[a-zA-Zа-яА-Я0-9\s_-]+$/
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Имя содержит недопустимые символы' }
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
  
  const upperCode = code.toUpperCase().trim()
  
  if (upperCode.length !== LIMITS.ROOM_CODE_LENGTH) {
    return { valid: false, error: `Код комнаты должен быть ${LIMITS.ROOM_CODE_LENGTH} символов` }
  }
  
  const validPattern = /^[A-Z0-9]+$/
  if (!validPattern.test(upperCode)) {
    return { valid: false, error: 'Код комнаты содержит недопустимые символы' }
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
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Сообщение не может быть пустым' }
  }
  
  if (trimmed.length > 500) {
    return { valid: false, error: 'Сообщение слишком длинное (максимум 500 символов)' }
  }
  
  return { valid: true, text: trimmed }
}

/**
 * Очистка HTML из пользовательского ввода
 */
export const sanitizeHtml = (text) => {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Throttle функция для ограничения частоты вызовов
 */
export const throttle = (func, delay) => {
  let timeoutId
  let lastExecTime = 0
  
  return function (...args) {
    const currentTime = Date.now()
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args)
      lastExecTime = currentTime
    } else {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func.apply(this, args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }
}

/**
 * Debounce функция для задержки выполнения
 */
export const debounce = (func, delay) => {
  let timeoutId
  
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * Перемешивание массива (алгоритм Фишера-Йетса)
 */
export const shuffleArray = (array) => {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Генерация случайного числа в диапазоне
 */
export const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Форматирование времени в MM:SS
 */
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Проверка валидного ID игрока
 */
export const isValidPlayerId = (id) => {
  return typeof id === 'string' && id.length > 0
}

/**
 * Извлечение IP адреса из сокета
 */
export const getClientIP = (socket) => {
  return socket.handshake.address || 
         socket.conn.remoteAddress || 
         socket.request.connection.remoteAddress ||
         '0.0.0.0'
}

/**
 * Логирование с временной меткой
 */
export const logWithTime = (message, level = 'info') => {
  const timestamp = new Date().toISOString()
  const prefix = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    debug: '🐛'
  }[level] || 'ℹ️'
  
  console.log(`${prefix} [${timestamp}] ${message}`)
}