/**
 * HTTP API composable для работы с сервером
 */

export const useAPI = () => {
  const baseURL = process.env.NODE_ENV === 'production'
    ? 'https://mafia.waifucards.app'
    : 'http://localhost:3001'

  const apiCall = async (endpoint, options = {}) => {
    try {
      const url = `${baseURL}${endpoint}`
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error)
      throw error
    }
  }

  return {
    // Получить данные комнаты
    getRoomData: async (roomId) => {
      return await apiCall(`/api/rooms/${roomId}`)
    },

    // Получить полное состояние игры (включая ночные действия)
    getGameState: async (roomId, playerId = null) => {
      const params = playerId ? `?playerId=${playerId}` : ''
      return await apiCall(`/api/rooms/${roomId}/game-state${params}`)
    },

    // Присоединиться к комнате
    joinRoom: async (roomId, username, socketId) => {
      return await apiCall(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        body: JSON.stringify({ username, socketId })
      })
    },

    // Получить список публичных комнат
    getPublicRooms: async () => {
      return await apiCall('/api/rooms/public')
    },

    // Получить роли комнаты
    getRoomRoles: async (roomId) => {
      return await apiCall(`/api/rooms/${roomId}/roles`)
    },

    // Получить историю чата комнаты
    getChatHistory: async (roomId, playerId = null) => {
      const params = playerId ? `?playerId=${playerId}` : ''
      return await apiCall(`/api/rooms/${roomId}/chat${params}`)
    },

    // Управление ролями
    manageRole: async (roomId, roleId, action, playerId) => {
      return await apiCall(`/api/rooms/${roomId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ roleId, action, playerId })
      })
    },

    // Управление фазами игры
    managePhase: async (roomId, action, playerId) => {
      return await apiCall(`/api/rooms/${roomId}/phase`, {
        method: 'PUT',
        body: JSON.stringify({ action, playerId })
      })
    },

    // Ночные действия
    nightAction: async (roomId, playerId, action) => {
      return await apiCall(`/api/rooms/${roomId}/night-action`, {
        method: 'POST',
        body: JSON.stringify({ playerId, action })
      })
    },

    // Обнулить комнату (новая игра)
    resetRoom: async (roomId) => {
      return await apiCall(`/api/rooms/${roomId}/reset`, {
        method: 'POST'
      })
    },

    // Покинуть комнату
    leaveRoom: async (roomId, playerId) => {
      return await apiCall(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        body: JSON.stringify({ playerId })
      })
    },

    // Удалить комнату
    deleteRoom: async (roomId) => {
      return await apiCall(`/api/rooms/${roomId}`, {
        method: 'DELETE'
      })
    }
  }
}