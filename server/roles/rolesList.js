/**
 * Серверный реестр ролей с экземплярами
 */

import { ROLES_REGISTRY, getRole as getRegistryRole } from '../../shared/rolesRegistry.js'

// Импорт классов ролей
import { VillagerRole } from './village/VillagerRole.js'
import { SeerRole } from './village/SeerRole.js'
import { RobberRole } from './village/RobberRole.js'
import { TroublemakerRole } from './village/TroublemakerRole.js'
import { DrunkRole } from './village/DrunkRole.js'
import { BodyguardRole } from './village/BodyguardRole.js'
import { WerewolfRole } from './werewolf/WerewolfRole.js'
import { MysticWolfRole } from './werewolf/MysticWolfRole.js'
import { TannerRole } from './tanner/TannerRole.js'

// Создаем экземпляры ролей
const ROLE_INSTANCES = {
  villager: new VillagerRole(),
  seer: new SeerRole(),
  robber: new RobberRole(),
  troublemaker: new TroublemakerRole(),
  drunk: new DrunkRole(),
  bodyguard: new BodyguardRole(),
  werewolf: new WerewolfRole(),
  mystic_wolf: new MysticWolfRole(),
  tanner: new TannerRole(),
  werewolf_2: new WerewolfRole(),
  werewolf_3: new WerewolfRole()
}

/**
 * Получение экземпляра роли для выполнения логики
 */
export const getRole = (roleId) => {
  return ROLE_INSTANCES[roleId] || null
}

/**
 * Получение информации о роли (без логики)
 */
export const getRoleInfo = (roleId) => {
  return getRegistryRole(roleId)
}

/**
 * Получение всех ролей для клиента
 */
export const getClientRolesList = () => {
  return ROLES_REGISTRY
}

/**
 * Валидация роли
 */
export const validateRole = (roleId) => {
  return ROLES_REGISTRY.hasOwnProperty(roleId) && ROLE_INSTANCES.hasOwnProperty(roleId)
}

/**
 * Получение ночных ролей в порядке выполнения
 */
export const getNightRoles = (playerRoles) => {
  const uniqueRoles = [...new Set(playerRoles)] // Убираем дубликаты
  
  return uniqueRoles
    .map(roleId => ({
      id: roleId,
      instance: getRole(roleId),
      info: getRoleInfo(roleId)
    }))
    .filter(role => role.instance && role.info && role.info.hasNightAction)
    .sort((a, b) => a.info.nightOrder - b.info.nightOrder)
}