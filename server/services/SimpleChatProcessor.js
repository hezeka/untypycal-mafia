/**
 * Упрощенный обработчик команд чата
 */

export class SimpleChatProcessor {
  constructor() {}
  
  isCommand(message) {
    return message.trim().startsWith('/')
  }
  
  async processCommand(senderId, message, room) {
    const trimmed = message.trim()
    if (!this.isCommand(trimmed)) {
      return { isCommand: false }
    }
    
    const parts = trimmed.substring(1).split(/\s+/)
    const command = parts[0].toLowerCase()
    const args = parts.slice(1)
    
    const sender = room.getPlayer(senderId)
    if (!sender) {
      return { isCommand: true, success: false, error: 'Игрок не найден' }
    }
    
    switch (command) {
      case 'ш':
      case 'w':
      case 'whisper':
        return this.handleWhisper(sender, args, room)
        
      case 'help':
      case 'помощь':
        return this.handleHelp(sender, room)
        
      default:
        return { 
          isCommand: true, 
          success: false, 
          error: `Неизвестная команда: /${command}. Используйте /help для справки.` 
        }
    }
  }
  
  handleWhisper(sender, args, room) {
    if (args.length < 2) {
      return {
        isCommand: true,
        success: false,
        error: 'Используйте: /ш <игрок> <сообщение>'
      }
    }
    
    const targetName = args[0].toLowerCase()
    const messageText = args.slice(1).join(' ').trim()
    
    if (!messageText) {
      return {
        isCommand: true,
        success: false,
        error: 'Сообщение не может быть пустым'
      }
    }
    
    // Шепот ведущему
    if (targetName === 'ведущий' || targetName === 'host') {
      const hostPlayer = Array.from(room.players.values()).find(p => p.isHost)
      if (!hostPlayer) {
        return {
          isCommand: true,
          success: false,
          error: 'Ведущий не найден'
        }
      }
      
      return this.sendWhisper(sender, hostPlayer, messageText, room)
    }
    
    // Поиск игрока по имени
    const targetPlayer = Array.from(room.players.values())
      .find(p => p.name.toLowerCase().includes(targetName))
    
    if (!targetPlayer) {
      return {
        isCommand: true,
        success: false,
        error: `Игрок "${args[0]}" не найден`
      }
    }
    
    if (targetPlayer.id === sender.id) {
      return {
        isCommand: true,
        success: false,
        error: 'Нельзя шептать самому себе'
      }
    }
    
    return this.sendWhisper(sender, targetPlayer, messageText, room)
  }
  
  sendWhisper(sender, target, messageText, room) {
    const whisperMessage = {
      id: Date.now(),
      senderId: sender.id,
      senderName: sender.name,
      senderRole: room.shouldShowPlayerRole(sender, target) ? sender.role : null,
      recipientId: target.id,
      recipientName: target.name,
      text: messageText,
      type: 'whisper',
      timestamp: Date.now()
    }
    
    // Добавляем в чат комнаты
    room.chat.push(whisperMessage)
    
    // Отправляем участникам шепота + ведущему
    const recipients = new Set([sender.id, target.id])
    
    // Добавляем ведущего если он не участник
    const host = Array.from(room.players.values()).find(p => p.isHost || p.role === 'game_master')
    if (host && host.id !== sender.id && host.id !== target.id) {
      recipients.add(host.id)
    }
    
    // Отправляем сообщение
    recipients.forEach(playerId => {
      const socket = room.sockets.get(playerId)
      if (socket) {
        try {
          socket.emit('new-message', { message: whisperMessage })
        } catch (error) {
          console.error(`Failed to send whisper to ${playerId}:`, error)
        }
      }
    })
    
    return {
      isCommand: true,
      success: true
    }
  }
  
  handleHelp(sender, room) {
    const helpText = `📋 Команды чата:
• /ш <игрок> <текст> - личное сообщение
• /ш ведущий <текст> - сообщение ведущему
• /help - эта справка

Примеры:
• /ш Иван Привет!
• /ш ведущий Вопрос по игре`
    
    const helpMessage = {
      id: Date.now(),
      senderId: 'system',
      senderName: 'Система',
      text: helpText,
      type: 'system',
      timestamp: Date.now()
    }
    
    // Отправляем только отправителю
    const socket = room.sockets.get(sender.id)
    if (socket) {
      try {
        socket.emit('new-message', { message: helpMessage })
      } catch (error) {
        console.error(`Failed to send help to ${sender.id}:`, error)
      }
    }
    
    return {
      isCommand: true,
      success: true
    }
  }
}