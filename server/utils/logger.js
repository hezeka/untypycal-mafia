const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

const levels = {
  error: { color: colors.red, prefix: '❌' },
  warn: { color: colors.yellow, prefix: '⚠️' },
  info: { color: colors.blue, prefix: '🔷' },
  debug: { color: colors.gray, prefix: '🔍' }
}

class Logger {
  constructor(name) {
    this.name = name
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  log(level, message, ...args) {
    if (this.isProduction && level === 'debug') {
      return // Не логируем debug в продакшене
    }

    const timestamp = new Date().toLocaleTimeString('ru-RU')
    const levelInfo = levels[level] || levels.info
    const coloredName = `${colors.cyan}[${this.name}]${colors.reset}`
    const coloredLevel = `${levelInfo.color}${levelInfo.prefix}${colors.reset}`
    
    console.log(
      `${colors.gray}${timestamp}${colors.reset} ${coloredLevel} ${coloredName} ${message}`,
      ...args
    )
  }

  error(message, ...args) {
    this.log('error', message, ...args)
  }

  warn(message, ...args) {
    this.log('warn', message, ...args)
  }

  info(message, ...args) {
    this.log('info', message, ...args)
  }

  debug(message, ...args) {
    this.log('debug', message, ...args)
  }
}

export const createLogger = (name) => new Logger(name)

// Глобальный логгер по умолчанию
export const logger = createLogger('App')