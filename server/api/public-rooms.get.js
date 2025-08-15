export default defineEventHandler(async (event) => {
  try {
    console.log('🔍 API: Proxying request to socket-server...')
    
    // Проксируем запрос к socket-server на порту 3001
    const response = await fetch('http://localhost:3001/api/public-rooms')
    
    if (!response.ok) {
      throw new Error(`Socket server responded with ${response.status}`)
    }
    
    const publicRooms = await response.json()
    console.log('✅ API: Public rooms fetched via proxy:', publicRooms.length, 'rooms')
    return publicRooms
  } catch (error) {
    console.error('❌ Error fetching public rooms via proxy:', error)
    return []
  }
})
