// Реэкспортируем все из shared/rolesRegistry.js (единый источник истины)
export {
  ROLES_REGISTRY,
  getRole,
  getAllRoles,
  getImplementedRoles,
  getRolesByTeam,
  validateRole,
  getTeamNames,
  validateRoleBalance
} from '../../shared/rolesRegistry.js'

/**
 * Основные утилиты
 */

export const generateRoomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const sanitizeHtml = (text) => {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Имя пользователя обязательно' }
  }
  
  const trimmed = username.trim()
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Имя должно быть не менее 2 символов' }
  }
  
  if (trimmed.length > 16) {
    return { valid: false, error: 'Имя должно быть не более 16 символов' }
  }
  
  return { valid: true, username: trimmed }
}

export const validateRoomCode = (code) => {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Код комнаты обязателен' }
  }
  
  const upperCode = code.toUpperCase().trim()
  
  if (upperCode.length !== 6) {
    return { valid: false, error: 'Код комнаты должен быть 6 символов' }
  }
  
  return { valid: true, code: upperCode }
}

export const validateMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Сообщение не может быть пустым' }
  }
  
  const trimmed = message.trim()
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Сообщение не может быть пустым' }
  }
  
  if (trimmed.length > 500) {
    return { valid: false, error: 'Сообщение слишком длинное' }
  }
  
  return { valid: true, text: trimmed }
}

export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Дополнительные серверные утилиты
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

export const shuffleArray = (array) => {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export const isValidPlayerId = (id) => {
  return typeof id === 'string' && id.length > 0
}

export const getClientIP = (socket) => {
  return socket.handshake.address || 
         socket.conn.remoteAddress || 
         socket.request.connection.remoteAddress ||
         '0.0.0.0'
}