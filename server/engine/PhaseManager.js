/**
 * Менеджер фаз игры - простое управление переходами
 */

import { GAME_PHASES } from '../utils/constants.js'

export class PhaseManager {
  constructor(game) {
    this.game = game
  }
  
  /**
   * Получение следующей фазы в цикле
   */
  getNextPhase(currentPhase) {
    // Проверяем условия победы
    if (this.game.checkWinConditions()) {
      return GAME_PHASES.ENDED
    }
    
    switch (currentPhase) {
      case GAME_PHASES.SETUP:
        return GAME_PHASES.INTRODUCTION
        
      case GAME_PHASES.INTRODUCTION:
        return GAME_PHASES.NIGHT
        
      case GAME_PHASES.NIGHT:
        return GAME_PHASES.DAY
        
      case GAME_PHASES.DAY:
        return GAME_PHASES.VOTING
        
      case GAME_PHASES.VOTING:
        // После голосования - новый цикл или конец игры
        return this.game.checkWinConditions() ? GAME_PHASES.ENDED : GAME_PHASES.NIGHT
        
      default:
        console.warn(`⚠️ Unknown phase: ${currentPhase}`)
        return GAME_PHASES.ENDED
    }
  }
  
  /**
   * Проверка является ли фаза циклической
   */
  isCyclicPhase(phase) {
    return [GAME_PHASES.NIGHT, GAME_PHASES.DAY, GAME_PHASES.VOTING].includes(phase)
  }
  
  /**
   * Проверка завершена ли фаза знакомства
   */
  isIntroductionComplete() {
    return !this.game.state.isFirstRound
  }
  
  /**
   * Получение названия фазы для пользователя
   */
  getPhaseName(phase) {
    const names = {
      [GAME_PHASES.SETUP]: 'Настройка игры',
      [GAME_PHASES.INTRODUCTION]: 'Знакомство',
      [GAME_PHASES.NIGHT]: 'Ночь',
      [GAME_PHASES.DAY]: 'День', 
      [GAME_PHASES.VOTING]: 'Голосование',
      [GAME_PHASES.ENDED]: 'Игра завершена'
    }
    
    return names[phase] || 'Неизвестная фаза'
  }
  
  /**
   * Получение описания фазы
   */
  getPhaseDescription(phase) {
    const descriptions = {
      [GAME_PHASES.SETUP]: 'Выберите роли и начните игру',
      [GAME_PHASES.INTRODUCTION]: 'Представьтесь и поделитесь подозрениями',
      [GAME_PHASES.NIGHT]: 'Игроки с ночными способностями выполняют действия',
      [GAME_PHASES.DAY]: 'Обсудите произошедшее и найдите оборотней',
      [GAME_PHASES.VOTING]: 'Проголосуйте за исключение подозрительного игрока',
      [GAME_PHASES.ENDED]: 'Игра завершена'
    }
    
    return descriptions[phase] || ''
  }
  
  /**
   * Проверка можно ли принудительно сменить фазу
   */
  canForcePhaseChange(currentPhase) {
    // Ведущий может принудительно завершить любую фазу кроме голосования
    return currentPhase !== GAME_PHASES.VOTING
  }
  
  /**
   * Получение разрешений для чата в фазе
   */
  getChatPermissions(phase) {
    switch (phase) {
      case GAME_PHASES.SETUP:
      case GAME_PHASES.INTRODUCTION:
      case GAME_PHASES.DAY:
        return {
          canChat: true,
          canSeeAll: true,
          canWhisper: true,
          werewolfChat: false
        }
        
      case GAME_PHASES.NIGHT:
        return {
          canChat: false,
          canSeeAll: false,
          canWhisper: true,
          werewolfChat: true // Только оборотни видят друг друга
        }
        
      case GAME_PHASES.VOTING:
        return {
          canChat: false,
          canSeeAll: false,
          canWhisper: true, // Только шепот ведущему
          werewolfChat: false
        }
        
      case GAME_PHASES.ENDED:
        return {
          canChat: true,
          canSeeAll: true,
          canWhisper: true,
          werewolfChat: false
        }
        
      default:
        return {
          canChat: false,
          canSeeAll: false,
          canWhisper: false,
          werewolfChat: false
        }
    }
  }
  
  /**
   * Получение списка действий доступных в фазе
   */
  getAvailableActions(phase, player) {
    const actions = []
    
    switch (phase) {
      case GAME_PHASES.SETUP:
        if (player.isHost) {
          actions.push('start-game', 'select-roles')
        }
        break
        
      case GAME_PHASES.INTRODUCTION:
        actions.push('chat', 'whisper')
        if (player.isHost) {
          actions.push('force-next-phase')
        }
        break
        
      case GAME_PHASES.NIGHT:
        const role = this.game.room.getRole(player.role)
        if (role && role.hasNightAction) {
          actions.push('night-action')
        }
        actions.push('whisper')
        if (role && role.team === 'werewolf') {
          actions.push('werewolf-chat')
        }
        break
        
      case GAME_PHASES.DAY:
        actions.push('chat', 'whisper')
        if (player.isHost) {
          actions.push('force-next-phase')
        }
        break
        
      case GAME_PHASES.VOTING:
        if (player.alive) {
          actions.push('vote')
        }
        actions.push('whisper')
        break
        
      case GAME_PHASES.ENDED:
        actions.push('chat', 'whisper')
        if (player.isHost) {
          actions.push('restart-game')
        }
        break
    }
    
    return actions
  }
}