const BaseRole = require('./BaseRole')

class Cthulhu extends BaseRole {
  constructor() {
    super('cthulhu', 'Ктулху', 'special')
    this.nightOrder = 12
    this.hasNightAction = true
    this.survivedVotings = 0 // Счетчик выживших голосований
  }

  async performNightAction(gameRoom, playerId, action) {
    if (!action || !action.targetPlayerId || !action.message) {
      return { success: false, error: 'Выберите игрока и напишите сообщение' }
    }

    const targetPlayer = gameRoom.getPlayer(action.targetPlayerId)
    if (!targetPlayer) {
      return { success: false, error: 'Игрок не найден' }
    }

    if (action.targetPlayerId === playerId) {
      return { success: false, error: 'Нельзя отправить сообщение самому себе' }
    }

    // Отправляем анонимное сообщение целевому игроку
    gameRoom.sendToPlayer(action.targetPlayerId, 'cthulhu-message', {
      message: action.message,
      from: 'Ктулху'
    })

    // Сохраняем информацию о действии
    gameRoom.addNightActionResult(playerId, {
      action: 'anonymous_message',
      target: targetPlayer.username,
      message: action.message
    })

    return { 
      success: true, 
      message: `Анонимное сообщение отправлено игроку ${targetPlayer.username}` 
    }
  }

  // Метод для увеличения счетчика выживших голосований
  survivedVoting() {
    this.survivedVotings++
    return this.survivedVotings
  }

  // Проверка условия победы Ктулху
  checkVictoryCondition() {
    return this.survivedVotings >= 3
  }

  // Сброс счетчика (для новых игр)
  reset() {
    this.survivedVotings = 0
  }

  getActionPrompt() {
    return {
      type: 'cthulhu_message',
      title: 'Отправить анонимное сообщение',
      description: 'Выберите игрока и напишите ему сообщение от имени Ктулху',
      needsTarget: true,
      needsMessage: true,
      messagePrompt: 'Введите сообщение для игрока:'
    }
  }
}

module.exports = Cthulhu