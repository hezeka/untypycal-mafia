/**
 * Общие способности ролей для переиспользования
 * Оптимизация: избегаем дублирования кода
 */

export class RoleAbilities {
  
  /**
   * Посмотреть роль игрока
   */
  static lookAtPlayer(game, viewer, targetId) {
    const target = game.room.getPlayer(targetId)
    if (!target) return null
    
    const role = game.room.getRole(target.role)
    
    return {
      type: 'look_player',
      viewer: viewer.id,
      target: targetId,
      targetName: target.name,
      targetRole: target.role,
      roleName: role?.name || 'Неизвестная роль'
    }
  }
  
  /**
   * Посмотреть карты из центра
   */
  static lookAtCenter(game, viewer, indices = [0, 1]) {
    const centerCards = game.state.centerCards || []
    const results = []
    
    indices.forEach(index => {
      if (index >= 0 && index < centerCards.length) {
        const roleId = centerCards[index]
        const role = game.room.getRole(roleId)
        
        results.push({
          index,
          roleId,
          roleName: role?.name || 'Неизвестная роль'
        })
      }
    })
    
    return {
      type: 'look_center',
      viewer: viewer.id,
      cards: results
    }
  }
  
  /**
   * Поменять роли между игроками
   */
  static swapPlayerRoles(game, player1Id, player2Id) {
    const player1 = game.room.getPlayer(player1Id)
    const player2 = game.room.getPlayer(player2Id)
    
    if (!player1 || !player2) return null
    
    const role1 = player1.role
    const role2 = player2.role
    
    game.room.assignRole(player1.id, role2)
    game.room.assignRole(player2.id, role1)
    
    return {
      type: 'swap_players',
      player1: { id: player1.id, name: player1.name, oldRole: role1, newRole: role2 },
      player2: { id: player2.id, name: player2.name, oldRole: role2, newRole: role1 }
    }
  }
  
  /**
   * Поменять роль игрока с картой из центра
   */
  static swapWithCenter(game, playerId, centerIndex) {
    const player = game.room.getPlayer(playerId)
    const centerCards = game.state.centerCards || []
    
    if (!player || centerIndex < 0 || centerIndex >= centerCards.length) return null
    
    const playerRole = player.role
    const centerRole = centerCards[centerIndex]
    
    game.room.assignRole(player.id, centerRole)
    game.state.centerCards[centerIndex] = playerRole
    
    return {
      type: 'swap_center',
      player: { id: player.id, name: player.name, oldRole: playerRole, newRole: centerRole },
      centerIndex,
      oldCenterRole: centerRole,
      newCenterRole: playerRole
    }
  }
  
  /**
   * Найти других оборотней
   */
  static findWerewolves(game, viewer) {
    const werewolves = game.getAlivePlayers().filter(p => {
      if (p.id === viewer.id) return false
      const role = game.room.getRole(p.role)
      return role && role.team === 'werewolf'
    })
    
    return {
      type: 'find_werewolves',
      viewer: viewer.id,
      werewolves: werewolves.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role
      }))
    }
  }
  
  /**
   * Защитить игрока щитом
   */
  static protectPlayer(game, targetId) {
    const target = game.room.getPlayer(targetId)
    if (!target) return null
    
    if (!game.state.artifacts.has('shields')) {
      game.state.artifacts.set('shields', new Set())
    }
    
    game.state.artifacts.get('shields').add(targetId)
    
    return {
      type: 'protect',
      target: targetId,
      targetName: target.name
    }
  }
  
  /**
   * Сдвинуть все роли игроков
   */
  static shiftAllRoles(game, direction = 'left', excludePlayerId = null) {
    const players = game.getAlivePlayers().filter(p => p.id !== excludePlayerId)
    if (players.length < 2) return null
    
    const roles = players.map(p => p.role)
    const shifts = []
    
    if (direction === 'left') {
      const firstRole = roles.shift()
      roles.push(firstRole)
    } else {
      const lastRole = roles.pop()
      roles.unshift(lastRole)
    }
    
    players.forEach((player, index) => {
      const oldRole = player.role
      const newRole = roles[index]
      
      game.room.assignRole(player.id, newRole)
      
      shifts.push({
        playerId: player.id,
        playerName: player.name,
        oldRole,
        newRole
      })
    })
    
    return {
      type: 'shift_roles',
      direction,
      excludedPlayer: excludePlayerId,
      shifts
    }
  }
  
  /**
   * Копировать роль и стать ею
   */
  static copyRole(game, copyerId, targetId) {
    const copier = game.room.getPlayer(copyerId)
    const target = game.room.getPlayer(targetId)
    
    if (!copier || !target) return null
    
    const targetRole = target.role
    game.room.assignRole(copyerId, targetRole)
    
    return {
      type: 'copy_role',
      copier: { id: copyerId, name: copier.name, newRole: targetRole },
      target: { id: targetId, name: target.name, role: targetRole }
    }
  }
  
  /**
   * Создать интерактивное действие с выбором
   */
  static createChoice(game, playerId, choices, allowSkip = true) {
    return {
      type: 'choice_required',
      playerId,
      choices,
      allowSkip,
      timeout: 30000 // 30 секунд на выбор
    }
  }
  
  /**
   * Пропустить действие
   */
  static skipAction(game, playerId, reason = 'Игрок решил пропустить') {
    return {
      type: 'action_skipped',
      playerId,
      reason
    }
  }
  
  /**
   * Получить случайный артефакт
   */
  static getRandomArtifact() {
    const artifacts = [
      'werewolf_claw',    // Коготь оборотня
      'villager_sign',    // Знак селянина
      'tanner_club',      // Дубина неудачника
      'void_nothing',     // Пустота небытия
      'silence_mask',     // Маска молчания
      'shame_cloak'       // Покров позора
    ]
    
    return artifacts[Math.floor(Math.random() * artifacts.length)]
  }
  
  /**
   * Применить артефакт к игроку
   */
  static applyArtifact(game, targetId, artifactType) {
    const target = game.room.getPlayer(targetId)
    if (!target) return null
    
    if (!game.state.artifacts.has('player_artifacts')) {
      game.state.artifacts.set('player_artifacts', new Map())
    }
    
    game.state.artifacts.get('player_artifacts').set(targetId, artifactType)
    
    return {
      type: 'artifact_applied',
      target: targetId,
      targetName: target.name,
      artifact: artifactType
    }
  }
  
  /**
   * Получить доступные цели для действия
   */
  static getValidTargets(game, actorId, excludeSelf = true, onlyAlive = true) {
    let players = game.room.players.filter(p => p.role !== 'game_master')
    
    if (excludeSelf) {
      players = players.filter(p => p.id !== actorId)
    }
    
    if (onlyAlive) {
      players = players.filter(p => p.alive)
    }
    
    return players.map(p => ({
      id: p.id,
      name: p.name,
      alive: p.alive
    }))
  }
  
  /**
   * Проверить может ли игрок выполнить действие
   */
  static canPerformAction(game, playerId, actionType) {
    const player = game.room.getPlayer(playerId)
    if (!player || !player.alive) return false
    
    const role = game.room.getRole(player.role)
    if (!role || !role.hasNightAction) return false
    
    // Проверяем фазу игры
    if (game.state.phase !== 'night') return false
    
    return true
  }
}