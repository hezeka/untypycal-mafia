import { v4 as uuidv4 } from 'uuid'

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

  // Обрабатывает команду
  async processCommand(senderId, message) {
    const parsed = this.parseCommand(message)
    if (!parsed) {
      return { error: 'Неверный формат команды' }
    }

    const command = this.findCommand(parsed.command)
    if (!command) {
      return { 
        error: `Неизвестная команда: /${parsed.command}. Используйте /помощь для списка команд.` 
      }
    }

    const sender = this.room.players.get(senderId)
    if (!sender) {
      return { error: 'Игрок не найден' }
    }

    switch (command) {
      case 'ш':
        return this.processWhisperCommand(sender, parsed.args)
      case 'помощь':
        return this.processHelpCommand(sender)
      case 'кто':
        return this.processWhoCommand(sender)
      case 'время':
        return this.processTimeCommand(sender)
      default:
        return { error: 'Команда не реализована' }
    }
  }

  // Обрабатывает команду шепота
  processWhisperCommand(sender, args) {
    if (args.length < 2) {
      return {
        error: 'Недостаточно аргументов. Используйте: /ш <игрок/группа> <сообщение>'
      }
    }

    const target = args[0].toLowerCase()
    const message = args.slice(1).join(' ').trim()

    if (!message) {
      return {
        error: 'Сообщение не может быть пустым'
      }
    }

    if (message.length > 200) {
      return {
        error: 'Сообщение шепота слишком длинное (максимум 200 символов)'
      }
    }

    // Проверяем, можно ли отправлять шепот в текущей фазе
    const messageType = this.room.isHost(sender.id) ? 'host' : 'player'
    if (!this.canWhisper(sender, messageType)) {
      return {
        error: 'Шепот недоступен в текущей фазе игры'
      }
    }

    // ИСПРАВЛЕНИЕ: Добавляем проверку для "ведущий"
    if (target === 'ведущий' || target === 'host') {
      return this.processHostWhisper(sender, message, messageType)
    }

    // НОВОЕ: Ночные ограничения для всех игроков
    if (this.room.gameState === 'night' && messageType === 'player') {
      // Если игрок не оборотень, он может писать только ведущему
      if (!this.room.canSeeWerewolfRoles(sender.role)) {
        // Проверяем, что цель - действительно ведущий
        if (target !== 'ведущий' && target !== 'host') {
          return {
            error: 'Ночью вы можете писать только ведущему. Используйте: /ш ведущий <сообщение>'
          }
        }
      } else {
        // Если игрок оборотень, он может шептать только ведущему или другим оборотням
        if (target !== 'ведущий' && target !== 'host') {
          // Проверяем, является ли цель оборотнем (для личного шепота)
          const targetPlayer = this.findPlayerByName(target)
          if (targetPlayer && !this.room.isWerewolfRole(targetPlayer.role)) {
            return {
              error: 'Ночью оборотни могут шептать только ведущему или другим оборотням. Для общения с командой используйте обычный чат.'
            }
          }
        }
      }
    }

    // Сначала проверяем группы
    if (this.isGroupName(target)) {
      return this.processGroupWhisper(sender, target, message, messageType)
    }

    // Затем ищем конкретного игрока
    const targetPlayer = this.findPlayerByName(target)
    if (!targetPlayer) {
      const availableTargets = this.getAvailableWhisperTargets(sender)
      return {
        error: `Игрок или группа "${target}" не найдены.\nДоступные цели: ${availableTargets.join(', ')}`
      }
    }

    if (targetPlayer.id === sender.id) {
      return {
        error: 'Нельзя шептать самому себе'
      }
    }

    return this.processPlayerWhisper(sender, targetPlayer, message, messageType)
  }

  // НОВЫЙ МЕТОД: Обработка шепота ведущему
  processHostWhisper(sender, message, messageType) {
    // Если отправитель уже ведущий
    if (messageType === 'host') {
      return {
        error: 'Вы уже ведущий, используйте обычный чат'
      }
    }

    // Находим ведущего
    const hostPlayer = this.room.players.get(this.room.hostId)
    if (!hostPlayer) {
      return {
        error: 'Ведущий не найден'
      }
    }

    // Создаем сообщение шепота ведущему
    const whisperMessage = {
      id: uuidv4(),
      playerId: sender.id,
      playerName: sender.name,
      targetPlayerId: hostPlayer.id,
      targetPlayerName: 'Ведущий',
      message: message,
      type: 'whisper',
      timestamp: Date.now()
    }

    // Определяем получателей (отправитель и ведущий)
    const recipients = [sender.id, hostPlayer.id]

    return {
      success: true,
      whisperMessage,
      recipients: [...new Set(recipients)]
    }
  }

  // Проверяет, является ли название группой
  isGroupName(name) {
    const groups = ['оборотни', 'волки', 'wolves', 'werewolves', 'деревня', 'жители', 'village', 'villagers', 'все', 'all', 'everyone']
    return groups.includes(name)
  }

  // Находит игрока по имени
  findPlayerByName(name) {
    return Array.from(this.room.players.values()).find(p => 
      p.name.toLowerCase() === name && p.role !== 'game_master'
    )
  }

  // Обрабатывает групповой шепот
  processGroupWhisper(sender, groupName, message, messageType) {
    // Дополнительные ночные ограничения для групповых шепотов
    if (this.room.gameState === 'night' && messageType === 'player') {
      const normalizedGroup = groupName.toLowerCase()
      
      // Оборотни не могут шептать группе деревня ночью
      if (this.room.canSeeWerewolfRoles(sender.role)) {
        if (['деревня', 'жители', 'village', 'villagers'].includes(normalizedGroup)) {
          return {
            error: 'Ночью оборотни не могут шептать группе деревня. Используйте обычный чат для общения с командой или /ш ведущий'
          }
        }
      }
      
      // Не-оборотни не могут шептать группе оборотни ночью
      if (!this.room.canSeeWerewolfRoles(sender.role)) {
        if (['оборотни', 'волки', 'wolves', 'werewolves'].includes(normalizedGroup)) {
          return {
            error: 'Ночью вы не можете шептать группе оборотни. Используйте /ш ведущий'
          }
        }
      }
    }

    // Проверяем права отправки в группу
    if (!this.room.canPlayerMessageGroup(sender, groupName)) {
      const groupDisplayName = this.room.getGroupDisplayName(groupName)
      return {
        error: `У вас нет прав для отправки сообщений группе "${groupDisplayName}"`
      }
    }

    // Находим получателей
    const groupMembers = this.room.getGroupMembers(groupName)
    if (groupMembers.length === 0) {
      const groupDisplayName = this.room.getGroupDisplayName(groupName)
      return {
        error: `В группе "${groupDisplayName}" нет подходящих получателей`
      }
    }

    const recipients = groupMembers.map(p => p.id)

    if (!recipients.includes(sender.id)) {
      recipients.push(sender.id)
    }
    
    // Добавляем ведущего в получатели независимо от того, отправитель он или нет
    if (!recipients.includes(this.room.hostId)) {
      recipients.push(this.room.hostId)
    }

    // Создаем сообщение группового шепота
    const whisperMessage = {
      id: uuidv4(),
      playerId: sender.id,
      playerName: sender.name,
      targetGroup: groupName,
      targetGroupName: this.room.getGroupDisplayName(groupName),
      targetMembers: groupMembers.map(p => p.name),
      message: message,
      type: 'group_whisper',
      timestamp: Date.now()
    }

    return {
      success: true,
      whisperMessage,
      recipients: [...new Set(recipients)] // Убираем дубликаты
    }
  }

  // Обрабатывает личный шепот игроку
  processPlayerWhisper(sender, targetPlayer, message, messageType) {
    // Создаем сообщение личного шепота
    const whisperMessage = {
      id: uuidv4(),
      playerId: sender.id,
      playerName: sender.name,
      targetPlayerId: targetPlayer.id,
      targetPlayerName: targetPlayer.name,
      message: message,
      type: 'whisper',
      timestamp: Date.now()
    }

    // Определяем получателей (отправитель, получатель, ведущий)
    const recipients = [sender.id, targetPlayer.id]
    if (!this.room.isHost(sender.id) && !this.room.isHost(targetPlayer.id)) {
      recipients.push(this.room.hostId)
    }

    return {
      success: true,
      whisperMessage,
      recipients: [...new Set(recipients)]
    }
  }

  // Обрабатывает команду помощи
  processHelpCommand(sender) {
    let helpText = '📋 **Доступные команды чата:**\n\n'

    helpText += '**Основные команды:**\n'
    helpText += '• `/ш <игрок> <текст>` - личное сообщение игроку\n'
    helpText += '• `/ш <группа> <текст>` - сообщение группе игроков\n'
    
    // ДОБАВЛЯЕМ: помощь про шепот ведущему
    if (!this.room.isHost(sender.id)) {
      helpText += '• `/ш ведущий <текст>` - сообщение ведущему\n'
    }
    
    helpText += '• `/помощь` - показать эту справку\n'
    helpText += '• `/кто` - список всех игроков\n'
    
    if (this.room.timer) {
      helpText += '• `/время` - показать оставшееся время\n'
    }
    helpText += '\n'

    helpText += '👥 **Доступные группы:**\n'
    if (this.room.canPlayerMessageGroup(sender, 'оборотни')) {
      helpText += '• **Оборотни** (оборотни, волки)\n'
    }
    if (this.room.canPlayerMessageGroup(sender, 'деревня')) {
      helpText += '• **Деревня** (деревня, жители)\n'
    }
    if (this.room.canPlayerMessageGroup(sender, 'все')) {
      helpText += '• **Все игроки** (все)\n'
    }
    
    // ДОБАВЛЯЕМ: ведущий как цель
    if (!this.room.isHost(sender.id)) {
      helpText += '• **Ведущий** (ведущий)\n'
    }
    
    helpText += '\n'

    helpText += '💡 **Советы:**\n'
    helpText += '• Используйте Tab для автодополнения команд\n'
    helpText += '• Команды работают только в определенные фазы игры\n'
    helpText += '• Ведущий видит все шепоты'

    // Отправляем справку только отправителю
    const helpMessage = {
      id: uuidv4(),
      playerId: null,
      playerName: 'Система',
      message: helpText,
      type: 'system',
      timestamp: Date.now()
    }

    return {
      success: true,
      helpMessage,
      recipients: [sender.id]
    }
  }

  // Обрабатывает команду "кто"
  processWhoCommand(sender) {
    const isHost = this.room.isHost(sender.id)
    const gameEnded = this.room.gameState === 'ended'
    
    let whoText = '👥 **Список игроков:**\n\n'

    const players = Array.from(this.room.players.values())
      .filter(p => p.role !== 'game_master')
      .sort((a, b) => a.name.localeCompare(b.name))

    players.forEach((player, index) => {
      const status = []
      
      if (!player.alive) status.push('💀 мертв')
      if (!player.connected) status.push('😴 отключен')
      if (player.protected) status.push('🛡️ защищен')
      if (player.id === sender.id) status.push('👤 вы')
      
      // Показываем роль если разрешено
      let roleInfo = ''
      if (isHost || gameEnded) {
        const role = this.room.roles?.[player.role] || { name: player.role }
        roleInfo = ` (${role.name})`
      } else if (sender.role && this.room.canSeeWerewolfRoles(sender.role) && this.room.isWerewolfRole(player.role)) {
        const role = this.room.roles?.[player.role] || { name: player.role }
        roleInfo = ` (${role.name})`
      }
      
      const statusText = status.length > 0 ? ` [${status.join(', ')}]` : ''
      whoText += `${index + 1}. **${player.name}**${roleInfo}${statusText}\n`
    })

    whoText += `\n📊 Всего игроков: ${players.length}`
    if (this.room.gameState === 'voting') {
      const eligibleVoters = this.room.getEligibleVoters().length
      const votesSubmitted = this.room.votes.size
      whoText += `\n🗳️ Проголосовало: ${votesSubmitted}/${eligibleVoters}`
    }

    const whoMessage = {
      id: uuidv4(),
      playerId: null,
      playerName: 'Система',
      message: whoText,
      type: 'system',
      timestamp: Date.now()
    }

    return {
      success: true,
      helpMessage: whoMessage,
      recipients: [sender.id]
    }
  }

  // Обрабатывает команду времени
  processTimeCommand(sender) {
    if (!this.room.timer) {
      return {
        error: 'Таймер не активен'
      }
    }

    const minutes = Math.floor(this.room.timer / 60)
    const seconds = this.room.timer % 60
    const timeText = `⏰ **Оставшееся время:** ${minutes}:${seconds.toString().padStart(2, '0')}`

    const timeMessage = {
      id: uuidv4(),
      playerId: null,
      playerName: 'Система',
      message: timeText,
      type: 'system',
      timestamp: Date.now()
    }

    return {
      success: true,
      helpMessage: timeMessage,
      recipients: [sender.id]
    }
  }

  // Проверяет, может ли игрок отправлять шепот
  canWhisper(sender, messageType) {
    // Ведущий может шептать всегда
    if (messageType === 'host') return true
    
    // Во время подготовки можно шептать
    if (this.room.gameState === 'setup') return true
    
    // Во время дня можно шептать
    if (this.room.gameState === 'day') return true
    
    // Ночью оборотни могут шептать, а все остальные могут писать только ведущему
    if (this.room.gameState === 'night') {
      return true // Разрешаем шепот всем ночью (ограничение будет в processWhisperCommand)
    }
    
    // Во время голосования шепот запрещен
    return false
  }

  // Получает список доступных целей для шепота
  getAvailableWhisperTargets(sender) {
    const targets = []

    // Добавляем игроков
    this.room.players.forEach((player) => {
      if (player.role !== 'game_master' && player.id !== sender.id) {
        targets.push(player.name)
      }
    })

    // Добавляем доступные группы
    if (this.room.canPlayerMessageGroup(sender, 'оборотни')) {
      targets.push('оборотни')
    }
    if (this.room.canPlayerMessageGroup(sender, 'деревня')) {
      targets.push('деревня')
    }
    if (this.room.canPlayerMessageGroup(sender, 'все')) {
      targets.push('все')
    }

    // ДОБАВЛЯЕМ: ведущий как цель (если отправитель не ведущий)
    if (!this.room.isHost(sender.id)) {
      targets.push('ведущий')
    }

    return targets
  }
}