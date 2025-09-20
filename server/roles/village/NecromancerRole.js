import { BaseRole } from '../BaseRole.js'
import { EVENT_TYPES } from '../../models/GameHistory.js'

export class NecromancerRole extends BaseRole {
  constructor() {
    super('necromancer', {
      name: 'Некромант',
      description: 'Может воскресить одного игрока за всю игру в любой момент, кроме голосования.',
      team: 'village',
      color: 'blue',
      hasNightAction: false,
      nightOrder: 0,
      implemented: true,
      phaseHints: {
        night: 'Можете воскресить мертвого игрока кнопкой "Воскресить"',
        day: 'Можете воскресить мертвого игрока кнопкой "Воскресить"'
      }
    })
  }

  // Некромант может воскресить игрока в любой момент, кроме голосования
  async resurrectPlayer(gameEngine, necromancerId, targetId) {
    const room = gameEngine.room
    const necromancer = room.getPlayer(necromancerId)
    const target = room.getPlayer(targetId)

    if (!necromancer || !target) {
      return { error: 'Игрок не найден' }
    }

    // Проверяем что некромант еще не использовал свою способность
    if (necromancer.necromancerUsed) {
      return { error: 'Вы уже использовали воскрешение' }
    }

    // Проверяем что цель мертва
    if (target.alive) {
      return { error: 'Этот игрок еще жив' }
    }

    // Проверяем что не идет голосование
    if (room.gameState === 'voting') {
      return { error: 'Нельзя воскрешать во время голосования' }
    }

    // Проверяем что некромант жив
    if (!necromancer.alive) {
      return { error: 'Мертвые не могут использовать способности' }
    }

    // Воскрешаем игрока
    target.alive = true
    necromancer.necromancerUsed = true

    // Логируем воскрешение
    room.gameHistory.logNightAction(EVENT_TYPES.NECROMANCER_RESURRECT, necromancer, target, {
      success: true,
      resurrected: true
    })

    // Отправляем уведомления
    room.broadcast('player-resurrected', {
      necromancerId: necromancer.id,
      necromancerName: necromancer.name,
      targetId: target.id,
      targetName: target.name,
      message: `${necromancer.name} (Некромант) воскресил ${target.name}`
    })

    // Отправляем личное сообщение некроманту
    const whisperMessage = {
      id: `necromancer-resurrect-${Date.now()}`,
      type: 'whisper',
      text: `Вы воскресили ${target.name}. Ваша способность использована.`,
      timestamp: Date.now(),
      senderId: 'system',
      senderName: 'Система',
      recipientId: necromancer.id,
      recipientName: necromancer.name,
      isOwn: false
    }

    room.chat.push(whisperMessage)
    room.sendToPlayer(necromancer.id, 'new-message', { message: whisperMessage })

    return {
      success: true,
      message: `${target.name} воскрешен`,
      data: { 
        targetId: target.id,
        targetName: target.name,
        used: true
      }
    }
  }
}