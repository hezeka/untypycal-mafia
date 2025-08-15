export default defineEventHandler(async (event) => {
  try {
    const response = await fetch('http://localhost:3001/api/public-rooms')
    
    if (!response.ok) {
      throw new Error(`Socket server responded with ${response.status}`)
    }
    
    const publicRooms = await response.json()
    return publicRooms
  } catch (error) {
    console.error('Error fetching public rooms:', error)
    return []
  }
})
