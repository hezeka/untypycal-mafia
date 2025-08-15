import { listPublicRooms } from '../socket-server.js'

export default defineEventHandler(async (event) => {
  try {
    // Проверяем, есть ли доступ к gameRooms
    if (!listPublicRooms() || !(listPublicRooms() instanceof Array)) {
      throw new Error('gameRooms is not available or not a Map')
    }

    // Преобразуем gameRooms в массив объектов
    const publicRooms = Array.from(listPublicRooms().values()).map(room => ({
      id: room.id,
      hostName: room.hostName,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      gameState: room.gameState,
      selectedRolesCount: room.selectedRolesCount
    }))

    return publicRooms
  } catch (error) {
    console.error('Error fetching public rooms:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})
