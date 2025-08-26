// server/services/ChatCommandProcessor.js
import { sanitizeHtml } from '../utils/gameHelpers.js'
import { GAME_PHASES, MESSAGE_TYPES } from '../utils/constants.js'

export class ChatCommandProcessor {
  constructor(room) {
    this.room = room
  }

  // Проверяет, является ли сообщение командой
  isCommand(message) {
    return message.trim().startsWith('/')
  }

  // Парсит команду из сообщения
  parseCommand(message) {
    const trimmed = message.trim()
    if (!this.isCommand(trimmed)) return null

    const parts = trimmed.substring(1).split(/\s+/)
    if (parts.length === 0) return null

    const command = parts[0].toLowerCase()
    const args = parts.slice(1)

    return { command, args, raw: trimmed }
  }

  // Находит команду по имени или алиасу
  findCommand(commandName) {
    const commands = {
      'ш': ['whisper', 'w'],
      'помощь': ['help', 'h', '?'],
      'кто': ['who', 'список', 'list'],
      'время': ['time', 'timer']
    }

    for (const [cmd, aliases] of Object.entries(commands)) {
      if (cmd === commandName || aliases.includes(commandName)) {
        return cmd
      }
    }
    return null
  }

  // ✅ ОСНОВНОЙ МЕТОД ОБРАБОТКИ КОМАНД
  async processCommand(senderId, message) {
    try {
      // Валидация
      if (!message || typeof message !== 'string') {
        return { success: false, error: 'Неверный формат команды' }
      }
      
      if (message.length > 1000) {
        return { success: false, error: 'Команда слишком длинная' }
      }
      
      const parsed = this.parseCommand(message)
      if (!parsed) {
        return { success: false, error: 'Неверный формат команды' }
      }
      
      if (parsed.command.length > 50 || /[<>'"&]/.test(parsed.command)) {
        return { success: false, error: 'Недопустимые символы в команде' }
      }

      const sender = this.room.getPlayer(senderId)
      if (!sender) {
        return { success: false, error: 'Игрок не найден' }
      }

      const command = this.findCommand(parsed.command)
      if (!command) {
        return { 
          success: false, 
          error: `Неизвестная команда: /${parsed.command}. Используйте /помощь для справки.` 
        }
      }

      // Обработка команд
      switch (command) {
        case 'ш':
          return await this.handleWhisperCommand(sender, parsed.args)
          
        case 'помощь':
          return await this.handleHelpCommand(sender)
          
        case 'кто':
          return await this.handleWhoCommand(sender)
          
        case 'время':
          return await this.handleTimeCommand(sender)
          
        default:
          return { success: false, error: 'Команда не реализована' }
      }
    } catch (error) {
      console.error('Command processing error:', error)
      return { success: false, error: 'Ошибка обработки команды' }
    }
  }

  // ✅ ОБРАБОТКА КОМАНДЫ ШЕПОТА
  async handleWhisperCommand(sender, args) {
    if (args.length < 2) {
      return {
        success: false,
        error: 'Используйте: /ш <игрок|группа> <сообщение>\nПример: /ш Иван Привет!'
      }
    }

    const target = args[0].toLowerCase()
    const messageText = args.slice(1).join(' ').trim()
    
    if (!messageText) {
      return { success: false, error: 'Сообщение не может быть пустым' }
    }

    if (messageText.length > 500) {
      return { success: false, error: 'Сообщение слишком длинное' }
    }

    const cleanMessage = sanitizeHtml(messageText)

    // 1. Шепот ведущему (всегда доступен)
    if (target === 'ведущий' || target === 'host') {
      return await this.whisperToHost(sender, cleanMessage)
    }

    // 2. Групповой шепот
    if (this.isGroupTarget(target)) {
      return await this.whisperToGroup(sender, target, cleanMessage)
    }

    // 3. Личный шепот
    return await this.whisperToPlayer(sender, target, cleanMessage)
  }

  // Проверяет, является ли цель группой
  isGroupTarget(target) {
    const groups = ['оборотни', 'волки', 'werewolves', 'деревня', 'жители', 'village', 'все', 'all']
    return groups.includes(target)
  }

  // ✅ ШЕПОТ ВЕДУЩЕМУ
  async whisperToHost(sender, message) {
    const host = Array.from(this.room.players.values())
      .find(p => p.isHost || p.role === 'game_master')
    
    if (!host) {
      return { success: false, error: 'Ведущий не найден' }
    }

    if (sender.id === host.id) {
      return { success: false, error: 'Нельзя шептать самому себе' }
    }

    const whisperMessage = {
      id: Date.now(),
      senderId: sender.id,
      senderName: sender.name,
      senderRole: this.room.shouldShowPlayerRole(sender, host) ? sender.role : null,
      recipientId: host.id,
      recipientName: host.name,
      text: message,
      type: MESSAGE_TYPES.WHISPER,
      timestamp: Date.now()
    }

    // Добавляем в чат
    this.room.chat.push(whisperMessage)

    // Отправляем обоим участникам
    const recipients = [sender.id, host.id]
    
    recipients.forEach(playerId => {
      const socket = this.room.sockets.get(playerId)
      if (socket) {
        socket.emit('new-message', { message: whisperMessage })
      }
    })

    return { success: true }
  }

  // ✅ ГРУППОВОЙ ШЕПОТ
  async whisperToGroup(sender, groupName, message) {
    // Проверяем права на групповые шепоты в зависимости от фазы
    const canGroupWhisper = this.canPlayerGroupWhisper(sender, groupName)
    if (!canGroupWhisper.allowed) {
      return { success: false, error: canGroupWhisper.reason }
    }

    const recipients = this.getGroupRecipients(groupName, sender)
    if (recipients.length === 0) {
      return { success: false, error: 'Нет получателей для этой группы' }
    }

    const whisperMessage = {
      id: Date.now(),
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      groupName: this.getGroupDisplayName(groupName),
      text: message,
      type: MESSAGE_TYPES.GROUP_WHISPER,
      timestamp: Date.now()
    }

    // Добавляем в чат
    this.room.chat.push(whisperMessage)

    // Отправляем всем получателям
    recipients.forEach(playerId => {
      const socket = this.room.sockets.get(playerId)
      if (socket) {
        socket.emit('new-message', { message: whisperMessage })
      }
    })

    return { success: true }
  }

  // ✅ ЛИЧНЫЙ ШЕПОТ
  async whisperToPlayer(sender, targetName, message) {
    // Поиск игрока по имени (частичное совпадение)
    const targetPlayer = Array.from(this.room.players.values())
      .find(p => p.name.toLowerCase().includes(targetName))

    if (!targetPlayer) {
      return { success: false, error: `Игрок "${targetName}" не найден` }
    }

    if (targetPlayer.id === sender.id) {
      return { success: false, error: 'Нельзя шептать самому себе' }
    }

    // Проверяем права на личные шепоты
    if (!this.room.chatPermissions.canWhisper) {
      return { success: false, error: 'Личные сообщения запрещены в этой фазе' }
    }

    const whisperMessage = {
      id: Date.now(),
      senderId: sender.id,
      senderName: sender.name,
      senderRole: this.room.shouldShowPlayerRole(sender, targetPlayer) ? sender.role : null,
      recipientId: targetPlayer.id,
      recipientName: targetPlayer.name,
      text: message,
      type: MESSAGE_TYPES.WHISPER,
      timestamp: Date.now()
    }

    // Добавляем в чат
    this.room.chat.push(whisperMessage)

    // Получатели: отправитель, получатель, ведущий
    const recipients = new Set([sender.id, targetPlayer.id])
    
    const host = Array.from(this.room.players.values())
      .find(p => (p.isHost || p.role === 'game_master') && p.id !== sender.id && p.id !== targetPlayer.id)
    
    if (host) {
      recipients.add(host.id)
    }

    // Отправляем сообщение
    recipients.forEach(playerId => {
      const socket = this.room.sockets.get(playerId)
      if (socket) {
        socket.emit('new-message', { message: whisperMessage })
      }
    })

    // Отправляем событие о шепоте для визуальной индикации (днем, во время знакомства и не ведущему)
    const isHost = targetPlayer.isHost || targetPlayer.role === 'game_master'
    const isDayPhase = this.room.gameState === GAME_PHASES.DAY
    const isIntroductionPhase = this.room.gameState === GAME_PHASES.INTRODUCTION
    
    if (!isHost && (isDayPhase || isIntroductionPhase)) {
      // Отправляем всем в комнате событие о том, что игрок шепчет
      this.room.broadcast('whisper-activity', {
        playerId: sender.id,
        playerName: sender.name
      })
      
      console.log(`💬 Whisper activity sent for ${sender.name} (${sender.id})`)
    }

    return { success: true }
  }

  // ✅ ПРАВА НА ГРУППОВЫЕ ШЕПОТЫ ПО ФАЗАМ
  canPlayerGroupWhisper(sender, groupName) {
    const phase = this.room.gameState

    // Во время голосования - только шепот ведущему
    if (phase === GAME_PHASES.VOTING) {
      return { 
        allowed: false, 
        reason: 'Во время голосования групповые шепоты запрещены' 
      }
    }

    // Днем - запрещены групповые шепоты
    if (phase === GAME_PHASES.DAY) {
      return { 
        allowed: false, 
        reason: 'Днем групповые шепоты запрещены' 
      }
    }

    // Ночью - только оборотни между собой
    if (phase === GAME_PHASES.NIGHT) {
      if (groupName === 'оборотни' || groupName === 'волки' || groupName === 'werewolves') {
        if (!this.room.isWerewolf(sender.role)) {
          return { 
            allowed: false, 
            reason: 'Только оборотни могут общаться ночью' 
          }
        }
        return { allowed: true }
      }
      
      return { 
        allowed: false, 
        reason: 'Ночью доступен только шепот между оборотнями' 
      }
    }

    // В фазе знакомства и настройки - все разрешено
    if (phase === GAME_PHASES.INTRODUCTION || phase === GAME_PHASES.SETUP) {
      // Только ведущий может писать всем
      if (groupName === 'все' || groupName === 'all') {
        if (!sender.isHost && sender.role !== 'game_master') {
          return { 
            allowed: false, 
            reason: 'Только ведущий может писать всем игрокам' 
          }
        }
      }
      return { allowed: true }
    }

    return { allowed: false, reason: 'Групповые шепоты недоступны в этой фазе' }
  }

  // ✅ ПОЛУЧЕНИЕ СПИСКА ПОЛУЧАТЕЛЕЙ ДЛЯ ГРУППЫ
  getGroupRecipients(groupName, sender) {
    const recipients = new Set()
    
    switch (groupName) {
      case 'оборотни':
      case 'волки':
      case 'werewolves':
        // Все оборотни + ведущий
        Array.from(this.room.players.values()).forEach(p => {
          if (this.room.isWerewolf(p.role) || p.role === 'game_master') {
            recipients.add(p.id)
          }
        })
        break
        
      case 'деревня':
      case 'жители':
      case 'village':
        // Все жители + ведущий
        Array.from(this.room.players.values()).forEach(p => {
          if (p.role === 'game_master' || 
              (!this.room.isWerewolf(p.role) && p.role !== 'tanner')) {
            recipients.add(p.id)
          }
        })
        break
        
      case 'все':
      case 'all':
        // Все игроки (только для ведущего)
        if (sender.isHost || sender.role === 'game_master') {
          Array.from(this.room.players.values()).forEach(p => {
            recipients.add(p.id)
          })
        }
        break
    }
    
    return Array.from(recipients)
  }

  // Получение отображаемого имени группы
  getGroupDisplayName(groupName) {
    const names = {
      'оборотни': 'Оборотни',
      'волки': 'Оборотни', 
      'werewolves': 'Оборотни',
      'деревня': 'Деревня',
      'жители': 'Деревня',
      'village': 'Деревня',
      'все': 'Все игроки',
      'all': 'Все игроки'
    }
    return names[groupName] || groupName
  }

  // ✅ КОМАНДА ПОМОЩИ
  async handleHelpCommand(sender) {
    let helpText = '📋 **Доступные команды чата:**\n\n'

    helpText += '**Основные команды:**\n'
    helpText += '• `/ш <игрок> <текст>` - личное сообщение игроку\n'
    helpText += '• `/ш ведущий <текст>` - сообщение ведущему (всегда доступно)\n'
    
    // Групповые команды в зависимости от фазы
    const phase = this.room.gameState
    if (phase === GAME_PHASES.VOTING) {
      helpText += '• `/ш <группа> <текст>` - ❌ **Во время голосования запрещено**\n'
    } else if (phase === GAME_PHASES.DAY) {
      helpText += '• `/ш <группа> <текст>` - ❌ **Днем групповые шепоты запрещены**\n'
    } else if (phase === GAME_PHASES.NIGHT) {
      helpText += '• `/ш оборотни <текст>` - сообщение оборотням (только для оборотней)\n'
    } else {
      helpText += '• `/ш <группа> <текст>` - сообщение группе игроков\n'
    }
    
    helpText += '• `/помощь` - показать эту справку\n'
    helpText += '• `/кто` - список всех игроков\n'
    
    if (this.room.gameEngine?.phaseTimer) {
      helpText += '• `/время` - показать оставшееся время\n'
    }
    helpText += '\n'

    helpText += '👥 **Доступные группы:**\n'
    if (this.canPlayerGroupWhisper(sender, 'оборотни').allowed) {
      helpText += '• **оборотни** (волки, werewolves)\n'
    }
    if (this.canPlayerGroupWhisper(sender, 'деревня').allowed) {
      helpText += '• **деревня** (жители, village)\n'
    }
    if (this.canPlayerGroupWhisper(sender, 'все').allowed) {
      helpText += '• **все** (all) - только для ведущего\n'
    }
    
    helpText += '\n**Примеры:**\n'
    helpText += '• `/ш Иван Привет, как дела?`\n'
    helpText += '• `/ш ведущий У меня вопрос`\n'
    if (phase === GAME_PHASES.NIGHT && this.room.isWerewolf(sender.role)) {
      helpText += '• `/ш оборотни Кого убиваем?`'
    }

    const helpMessage = {
      id: Date.now(),
      senderId: 'system',
      senderName: 'Система',
      text: helpText,
      type: MESSAGE_TYPES.SYSTEM,
      timestamp: Date.now()
    }

    // Отправляем только отправителю
    const socket = this.room.sockets.get(sender.id)
    if (socket) {
      socket.emit('new-message', { message: helpMessage })
    }

    return { success: true }
  }

  // ✅ КОМАНДА СПИСКА ИГРОКОВ
  async handleWhoCommand(sender) {
    const players = Array.from(this.room.players.values())
    const alive = players.filter(p => p.alive && p.role !== 'game_master')
    const dead = players.filter(p => !p.alive && p.role !== 'game_master')
    const host = players.find(p => p.role === 'game_master' || p.isHost)

    let whoText = '👥 **Список игроков:**\n\n'
    
    whoText += `**Живые игроки (${alive.length}):**\n`
    alive.forEach(p => {
      let status = p.connected ? '🟢' : '🔴'
      let roleInfo = ''
      
      // Показываем роль если можно
      if (this.room.shouldShowPlayerRole(p, sender)) {
        const roleData = this.room.getRoleInfo(p.role)
        roleInfo = ` - ${roleData?.name || p.role}`
      }
      
      whoText += `${status} **${p.name}**${roleInfo}\n`
    })

    if (dead.length > 0) {
      whoText += `\n**Мертвые игроки (${dead.length}):**\n`
      dead.forEach(p => {
        let roleInfo = ''
        if (this.room.shouldShowPlayerRole(p, sender)) {
          const roleData = this.room.getRoleInfo(p.role)
          roleInfo = ` - ${roleData?.name || p.role}`
        }
        whoText += `💀 **${p.name}**${roleInfo}\n`
      })
    }

    if (host) {
      whoText += `\n**Ведущий:**\n`
      const status = host.connected ? '🟢' : '🔴'
      whoText += `${status} **${host.name}** - Ведущий`
    }

    whoText += `\n**Фаза игры:** ${this.getPhaseDisplayName(this.room.gameState)}`
    
    if (this.room.centerCards?.length > 0) {
      whoText += `\n**Центральных карт:** ${this.room.centerCards.length}`
    }

    const whoMessage = {
      id: Date.now(),
      senderId: 'system',
      senderName: 'Система',
      text: whoText,
      type: MESSAGE_TYPES.SYSTEM,
      timestamp: Date.now()
    }

    const socket = this.room.sockets.get(sender.id)
    if (socket) {
      socket.emit('new-message', { message: whoMessage })
    }

    return { success: true }
  }

  // ✅ КОМАНДА ВРЕМЕНИ
  async handleTimeCommand(sender) {
    if (!this.room.gameEngine?.phaseTimer) {
      const timeMessage = {
        id: Date.now(),
        senderId: 'system',
        senderName: 'Система',
        text: '⏰ Таймер не активен',
        type: MESSAGE_TYPES.SYSTEM,
        timestamp: Date.now()
      }

      const socket = this.room.sockets.get(sender.id)
      if (socket) {
        socket.emit('new-message', { message: timeMessage })
      }

      return { success: true }
    }

    const remaining = this.room.gameEngine.getRemainingTime()
    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60
    
    let timeText = '⏰ **Оставшееся время:**\n'
    timeText += `${minutes}:${seconds.toString().padStart(2, '0')}\n`
    timeText += `**Фаза:** ${this.getPhaseDisplayName(this.room.gameState)}`

    const timeMessage = {
      id: Date.now(),
      senderId: 'system',
      senderName: 'Система',
      text: timeText,
      type: MESSAGE_TYPES.SYSTEM,
      timestamp: Date.now()
    }

    const socket = this.room.sockets.get(sender.id)
    if (socket) {
      socket.emit('new-message', { message: timeMessage })
    }

    return { success: true }
  }

  // Получение отображаемого имени фазы
  getPhaseDisplayName(phase) {
    const names = {
      [GAME_PHASES.SETUP]: 'Настройка',
      [GAME_PHASES.INTRODUCTION]: 'Знакомство',
      [GAME_PHASES.NIGHT]: 'Ночь',
      [GAME_PHASES.DAY]: 'День',
      [GAME_PHASES.VOTING]: 'Голосование',
      [GAME_PHASES.ENDED]: 'Игра завершена'
    }
    return names[phase] || phase
  }
}