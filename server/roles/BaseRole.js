/**
 * Базовый класс для всех ролей
 */

export class BaseRole {
  constructor(id, config) {
    this.id = id
    this.name = config.name
    this.description = config.description
    this.team = config.team
    this.color = config.color
    this.hasNightAction = config.hasNightAction || false
    this.nightOrder = config.nightOrder || 0
    this.implemented = config.implemented || false
    this.phaseHints = config.phaseHints || {}
  }
  
  /**
   * Выполнение ночного действия роли
   * @param {GameEngine} gameEngine - Игровой движок
   * @param {Object} player - Игрок, выполняющий действие
   * @param {Object} action - Данные действия
   * @returns {Promise<Object>} Результат действия
   */
  async executeNightAction(gameEngine, player, action) {
    return { success: true, message: 'Действие выполнено' }
  }
  
  /**
   * Проверка возможности выполнения действия
   */
  canExecuteAction(gameEngine, player) {
    return player.alive && this.hasNightAction
  }
  
  /**
   * Получение доступных целей для действия
   */
  getAvailableTargets(gameEngine, player) {
    const room = gameEngine.room
    return Array.from(room.players.values())
      .filter(p => p.alive && p.id !== player.id && p.role !== 'game_master')
      .map(p => ({
        id: p.id,
        name: p.name,
        role: room.shouldShowPlayerRole(p, player) ? p.role : null
      }))
  }
  
  /**
   * Получение центральных карт
   */
  getCenterCards(gameEngine) {
    return gameEngine.room.centerCards.map((role, index) => ({
      index,
      role: null // Игроки не видят центральные карты
    }))
  }
}