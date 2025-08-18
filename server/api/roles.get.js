import { roles } from '../config/roles.js'

export default defineEventHandler((event) => {
  console.log('🔍 API /api/roles endpoint called')
  
  // Устанавливаем заголовки для JSON
  setHeaders(event, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  })
  
  // Исключаем роль ведущего из доступных ролей
  const { game_master, ...availableRoles } = roles
  
  console.log('📊 Returning', Object.keys(availableRoles).length, 'roles (excluding game_master)')
  
  return availableRoles
})