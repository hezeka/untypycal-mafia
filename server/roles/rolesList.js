import { getRole as getSharedRole, getAllRoles } from '../utils/gameHelpers.js'

/**
 * Получение информации о роли
 */
export const getRoleInfo = (roleId) => {
  return getSharedRole(roleId)
}

/**
 * Валидация роли
 */
export const validateRole = (roleId) => {
  const role = getRoleInfo(roleId)
  return role && role.implemented
}

/**
 * Получение ночных ролей в правильном порядке
 */
export const getNightRoles = (playerRoles) => {
  const allRoles = getAllRoles()
  const uniqueRoles = [...new Set(playerRoles)]
  
  return uniqueRoles
    .map(roleId => allRoles[roleId])
    .filter(role => role && role.hasNightAction && role.implemented)
    .sort((a, b) => a.nightOrder - b.nightOrder)
}

/**
 * Выполнение ночного действия роли
 */
export const executeRoleAction = async (gameEngine, player, action) => {
  const roleId = player.role
  const roleInfo = getRoleInfo(roleId)
  
  if (!roleInfo || !roleInfo.hasNightAction) {
    return { error: 'У этой роли нет ночных действий' }
  }
  
  try {
    return await getRoleHandler(roleId)(gameEngine, player, action)
  } catch (error) {
    return { error: error.message }
  }
}

/**
 * Получение обработчика роли
 */
const getRoleHandler = (roleId) => {
  const handlers = {
    werewolf: handleWerewolf,
    mystic_wolf: handleMysticWolf,
    minion: handleMinion,
    seer: handleSeer,
    robber: handleRobber,
    troublemaker: handleTroublemaker,
    drunk: handleDrunk,
    bodyguard: handleBodyguard,
    doppelganger: handleDoppelganger,
    werewolf_2: handleWerewolf,
    werewolf_3: handleWerewolf
  }
  
  return handlers[roleId] || handleDefault
}

// === ОБРАБОТЧИКИ РОЛЕЙ ===

const handleWerewolf = async (gameEngine, player, action) => {
  const { type, targetId } = action
  const room = gameEngine.room
  
  if (type === 'vote_kill' && targetId) {
    const target = room.getPlayer(targetId)
    if (!target || !target.alive || target.role === 'game_master') {
      return { error: 'Недопустимая цель' }
    }
    
    if (!gameEngine.werewolfVotes) {
      gameEngine.werewolfVotes = new Map()
    }
    
    gameEngine.werewolfVotes.set(player.id, targetId)
    
    return {
      success: true,
      message: `Вы проголосовали за ${target.name}`,
      data: { voted: targetId }
    }
  }
  
  // Показать других оборотней
  const werewolves = Array.from(room.players.values())
    .filter(p => p.alive && room.isWerewolf(p.role) && p.id !== player.id)
    .map(p => ({ id: p.id, name: p.name, role: p.role }))
  
  return {
    success: true,
    message: werewolves.length > 0 ? 'Вы нашли других оборотней' : 'Вы единственный оборотень',
    data: { werewolves }
  }
}

const handleSeer = async (gameEngine, player, action) => {
  const { type, targetId, centerCards } = action
  const room = gameEngine.room
  
  if (type === 'look_player' && targetId) {
    const target = room.getPlayer(targetId)
    if (!target || target.id === player.id) {
      return { error: 'Недопустимая цель' }
    }
    
    return {
      success: true,
      message: `Роль ${target.name}: ${getRoleInfo(target.role)?.name || target.role}`,
      data: { targetRole: target.role }
    }
  }
  
  if (type === 'look_center' && Array.isArray(centerCards)) {
    const cards = centerCards.slice(0, 2).map(index => room.centerCards[index]).filter(Boolean)
    
    return {
      success: true,
      message: 'Центральные карты просмотрены',
      data: { centerCards: cards }
    }
  }
  
  return { error: 'Выберите действие' }
}

const handleRobber = async (gameEngine, player, action) => {
  const { targetId } = action
  const room = gameEngine.room
  
  if (!targetId) {
    return { error: 'Выберите игрока' }
  }
  
  const target = room.getPlayer(targetId)
  if (!target || target.id === player.id) {
    return { error: 'Недопустимая цель' }
  }
  
  const oldRole = player.role
  const newRole = target.role
  
  gameEngine.swapRoles(player.id, targetId)
  
  return {
    success: true,
    message: `Вы обменялись ролями с ${target.name}. Ваша новая роль: ${getRoleInfo(newRole)?.name || newRole}`,
    data: { newRole }
  }
}

const handleTroublemaker = async (gameEngine, player, action) => {
  const { target1Id, target2Id } = action
  
  if (!target1Id || !target2Id || target1Id === target2Id) {
    return { error: 'Выберите двух разных игроков' }
  }
  
  gameEngine.swapRoles(target1Id, target2Id)
  
  const target1 = gameEngine.room.getPlayer(target1Id)
  const target2 = gameEngine.room.getPlayer(target2Id)
  
  return {
    success: true,
    message: `Вы поменяли роли между ${target1.name} и ${target2.name}`,
    data: { swapped: [target1.name, target2.name] }
  }
}

const handleDrunk = async (gameEngine, player, action) => {
  const { centerIndex } = action
  
  if (typeof centerIndex !== 'number') {
    return { error: 'Выберите центральную карту' }
  }
  
  gameEngine.swapWithCenter(player.id, centerIndex)
  
  return {
    success: true,
    message: 'Вы обменялись с центральной картой. Ваша новая роль скрыта.',
    data: { swapped: true }
  }
}

const handleBodyguard = async (gameEngine, player, action) => {
  const { targetId } = action
  
  if (!targetId) {
    return { error: 'Выберите игрока для защиты' }
  }
  
  gameEngine.protectPlayer(targetId)
  
  const target = gameEngine.room.getPlayer(targetId)
  
  return {
    success: true,
    message: `Вы защитили ${target.name}`,
    data: { protected: targetId }
  }
}

const handleMysticWolf = async (gameEngine, player, action) => {
  // Упрощенная версия - только голосование
  return handleWerewolf(gameEngine, player, action)
}

const handleMinion = async (gameEngine, player, action) => {
  const room = gameEngine.room
  
  const werewolves = Array.from(room.players.values())
    .filter(p => p.alive && room.isWerewolf(p.role))
    .map(p => ({ id: p.id, name: p.name, role: p.role }))
  
  return {
    success: true,
    message: werewolves.length > 0 ? 'Вы знаете оборотней' : 'Оборотней нет',
    data: { werewolves }
  }
}

const handleDoppelganger = async (gameEngine, player, action) => {
  const { targetId } = action
  
  if (!targetId) {
    return { error: 'Выберите игрока для копирования' }
  }
  
  const target = gameEngine.room.getPlayer(targetId)
  if (!target || target.id === player.id) {
    return { error: 'Недопустимая цель' }
  }
  
  // Копируем роль
  player.role = target.role
  
  return {
    success: true,
    message: `Вы скопировали роль ${target.name}: ${getRoleInfo(target.role)?.name || target.role}`,
    data: { newRole: target.role }
  }
}

const handleDefault = async (gameEngine, player, action) => {
  return {
    success: true,
    message: 'Действие выполнено',
    data: {}
  }
}