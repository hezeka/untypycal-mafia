/**
 * Проверка условий победы - простая логика без сложностей
 */

export class WinConditions {
  constructor(game) {
    this.game = game
  }
  
  /**
   * Основная проверка условий победы
   */
  check() {
    const alivePlayers = this.game.getAlivePlayers()
    
    // Никого не осталось - ничья
    if (alivePlayers.length === 0) {
      return {
        type: 'draw',
        message: 'Все игроки погибли. Ничья!',
        winners: []
      }
    }
    
    // Проверяем специальные роли (Ктулху)
    const cthulhuWin = this.checkCthulhuWin()
    if (cthulhuWin) return cthulhuWin
    
    // Проверяем специальные роли (Неудачник)
    const tannerWin = this.checkTannerWin()
    if (tannerWin) return tannerWin
    
    // Проверяем победу оборотней
    const werewolfWin = this.checkWerewolfWin(alivePlayers)
    if (werewolfWin) return werewolfWin
    
    // Проверяем победу деревни
    const villageWin = this.checkVillageWin(alivePlayers)
    if (villageWin) return villageWin
    
    // Игра продолжается
    return null
  }
  
  /**
   * Проверка победы Ктулху
   */
  checkCthulhuWin() {
    const cthulhuPlayers = Array.from(this.game.room.players.values()).filter(p => {
      if (p.role === 'game_master') return false
      const role = this.game.room.getRole(p.role)
      return role && role.id === 'cthulhu' && p.alive
    })
    
    // Проверяем каждого живого Ктулху
    for (const cthulhuPlayer of cthulhuPlayers) {
      const roleInstance = this.game.room.gameEngine?.roleInstances?.get(cthulhuPlayer.id)
      if (roleInstance && roleInstance.checkVictoryCondition && roleInstance.checkVictoryCondition()) {
        return {
          type: 'cthulhu',
          message: `${cthulhuPlayer.name} (Ктулху) побеждает! Пережил 3 голосования. Все остальные проигрывают.`,
          winners: [cthulhuPlayer],
          losers: Array.from(this.game.room.players.values()).filter(p => p.id !== cthulhuPlayer.id && p.role !== 'game_master')
        }
      }
    }
    
    return null
  }

  /**
   * Проверка победы Неудачника
   */
  checkTannerWin() {
    const deadPlayers = Array.from(this.game.room.players.values()).filter(p => !p.alive && p.role !== 'game_master')
    
    const deadTanner = deadPlayers.find(p => {
      const role = this.game.room.getRole(p.role)
      return role && role.team === 'tanner'
    })
    
    if (deadTanner) {
      return {
        type: 'tanner',
        message: `${deadTanner.name} (Неудачник) побеждает! Все остальные проигрывают.`,
        winners: [deadTanner],
        losers: Array.from(this.game.room.players.values()).filter(p => p.id !== deadTanner.id)
      }
    }
    
    return null
  }
  
  /**
   * Проверка победы оборотней
   */
  checkWerewolfWin(alivePlayers) {
    const aliveWerewolves = alivePlayers.filter(p => {
      const role = this.game.room.getRole(p.role)
      return role && role.team === 'werewolf'
    })
    
    const aliveVillagers = alivePlayers.filter(p => {
      const role = this.game.room.getRole(p.role)
      return role && ['village', 'special'].includes(role.team)
    })
    
    // Оборотни побеждают если их больше или равно жителям
    if (aliveWerewolves.length >= aliveVillagers.length && aliveWerewolves.length > 0) {
      return {
        type: 'werewolf',
        message: 'Оборотни захватили деревню!',
        winners: this.getAllWerewolves(),
        losers: this.getAllVillagers()
      }
    }
    
    return null
  }
  
  /**
   * Проверка победы деревни
   */
  checkVillageWin(alivePlayers) {
    const allWerewolves = this.getAllWerewolves()
    const deadWerewolves = allWerewolves.filter(p => !p.alive)
    
    // Деревня побеждает если убит хотя бы один оборотень
    if (deadWerewolves.length > 0) {
      return {
        type: 'village',
        message: `Деревня побеждает! Убит оборотень: ${deadWerewolves.map(p => p.name).join(', ')}`,
        winners: this.getAllVillagers(),
        losers: allWerewolves
      }
    }
    
    // Также проверяем остались ли оборотни вообще
    const aliveWerewolves = alivePlayers.filter(p => {
      const role = this.game.room.getRole(p.role)
      return role && role.team === 'werewolf'
    })
    
    if (aliveWerewolves.length === 0 && allWerewolves.length > 0) {
      return {
        type: 'village',
        message: 'Деревня побеждает! Все оборотни мертвы!',
        winners: this.getAllVillagers(),
        losers: allWerewolves
      }
    }
    
    return null
  }
  
  /**
   * Получение всех оборотней в игре
   */
  getAllWerewolves() {
    return Array.from(this.game.room.players.values()).filter(p => {
      if (p.role === 'game_master') return false
      const role = this.game.room.getRole(p.role)
      return role && role.team === 'werewolf'
    })
  }
  
  /**
   * Получение всех жителей деревни
   */
  getAllVillagers() {
    return Array.from(this.game.room.players.values()).filter(p => {
      if (p.role === 'game_master') return false
      const role = this.game.room.getRole(p.role)
      return role && ['village', 'special'].includes(role.team)
    })
  }
  
  /**
   * Получение всех неудачников
   */
  getAllTanners() {
    return Array.from(this.game.room.players.values()).filter(p => {
      if (p.role === 'game_master') return false
      const role = this.game.room.getRole(p.role)
      return role && role.team === 'tanner'
    })
  }
  
  /**
   * Проверка может ли игра продолжаться
   */
  canGameContinue() {
    const result = this.check()
    return result === null
  }
  
  /**
   * Получение статуса команд
   */
  getTeamStatus() {
    const alivePlayers = this.game.getAlivePlayers()
    
    const teams = {
      werewolf: 0,
      village: 0,
      special: 0,
      tanner: 0,
      neutral: 0
    }
    
    alivePlayers.forEach(player => {
      const role = this.game.room.getRole(player.role)
      if (role) {
        teams[role.team] = (teams[role.team] || 0) + 1
      }
    })
    
    return teams
  }
  
  /**
   * Получение подробной информации о победе
   */
  getDetailedWinInfo(winResult) {
    if (!winResult) return null
    
    const allPlayers = Array.from(this.game.room.players.values()).filter(p => p.role !== 'game_master')
    
    return {
      ...winResult,
      statistics: {
        totalPlayers: allPlayers.length,
        alivePlayers: allPlayers.filter(p => p.alive).length,
        deadPlayers: allPlayers.filter(p => !p.alive).length,
        teamCounts: this.getTeamStatus()
      },
      playerDetails: allPlayers.map(player => ({
        id: player.id,
        name: player.name,
        role: player.role,
        team: this.game.room.getRole(player.role)?.team || 'unknown',
        alive: player.alive,
        isWinner: winResult.winners.some(w => w.id === player.id)
      }))
    }
  }
}