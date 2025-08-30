import { BaseRole } from '../BaseRole.js'

export class CthulhuRole extends BaseRole {
  constructor() {
    super('cthulhu', {
      name: 'Ктулху',
      description: 'Ночью отправляет приказ игроку, который тот должен выполнять весь день. Побеждает если переживет 3 голосования.',
      team: 'special',
      color: 'purple',
      hasNightAction: true,
      nightOrder: 11,
      implemented: true,
      phaseHints: {
        night: 'Дать приказ - выберите игрока на поле',
        day: 'Переживите голосование. Нужно выжить 3 раза для победы'
      }
    })
  }
  
  async executeNightAction(gameEngine, player, action) {
    const { targetId } = action
    const room = gameEngine.room
    
    if (!targetId) {
      return { error: 'Выберите игрока для приказа' }
    }
    
    const target = room.getPlayer(targetId)
    if (!target || target.id === player.id || target.role === 'game_master') {
      return { error: 'Недопустимая цель' }
    }
    
    // Проверяем что команда еще не использовалась в эту ночь
    if (player.cthulhuOrderUsedTonight) {
      return { error: 'Вы уже дали приказ в эту ночь' }
    }
    
    // Автоматически заполняем чат командой приказа
    const chatCommand = `/приказ ${target.name} `
    
    // Отправляем событие для заполнения чата
    room.sendToPlayer(player.id, 'auto-fill-chat', {
      command: chatCommand
    })
    
    // Отправляем инструкцию как шепот
    const instructionMessage = {
      id: `cthulhu-instruction-${Date.now()}`,
      type: 'whisper',
      text: 'Напишите приказ или задание для этого игрока. Он будет выполнять его весь день и держать приказ в секрете. Задание должно быть выполнимым.',
      timestamp: Date.now(),
      senderId: 'system',
      senderName: 'Система',
      recipientId: player.id,
      recipientName: player.name,
      isOwn: false
    }
    
    room.chat.push(instructionMessage)
    room.sendToPlayer(player.id, 'new-message', { message: instructionMessage })
    
    return {
      success: true,
      message: `Выбран игрок ${target.name}. Чат заполнен командой приказа.`,
      data: { 
        targetId: target.id,
        targetName: target.name,
        autoFilled: true,
        actionNotComplete: true // Действие ещё не завершено
      }
    }
  }
}