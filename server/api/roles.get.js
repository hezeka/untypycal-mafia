import { roles } from '../config/roles.js'

export default defineEventHandler((event) => {
  console.log('🔍 API /api/roles endpoint called')
  
  // Устанавливаем заголовки для JSON
  setHeaders(event, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  })
  
  console.log('📊 Returning', Object.keys(roles).length, 'roles')
  
  return roles
})