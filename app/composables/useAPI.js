/**
 * HTTP API composable для работы с сервером
 */

export const useAPI = () => {
  // В браузере process.env может не работать корректно, используем location.hostname
  const isProduction = typeof window !== 'undefined' 
    ? window.location.hostname !== 'localhost' 
    : process.env.NODE_ENV === 'production'
    
  const baseURL = isProduction
    ? 'https://mafia.waifucards.app'
    : 'http://localhost:3001'
    
  console.log('🌐 API baseURL:', baseURL, 'isProduction:', isProduction)

  const apiCall = async (endpoint, options = {}) => {
    try {
      const url = `${baseURL}${endpoint}`
      console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      })

      console.log(`🌐 API Response: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        console.error(`🌐 API Error Response:`, error)
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log(`🌐 API Success:`, endpoint, 'Data keys:', Object.keys(data))
      return data
    } catch (error) {
      console.error(`🌐 API Error (${endpoint}):`, error)
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

    // Управление режимом голосования
    setVotingMode: async (roomId, votingMode, playerId) => {
      return await apiCall(`/api/rooms/${roomId}/voting-mode`, {
        method: 'POST',
        body: JSON.stringify({ votingMode, playerId })
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
    },

    // Получить историю игры
    getGameHistory: async (roomId, importance = null) => {
      const params = importance ? `?importance=${importance}` : ''
      return await apiCall(`/api/rooms/${roomId}/history${params}`)
    },

    // Получить статистику игроков
    getPlayerStatistics: async (roomId) => {
      return await apiCall(`/api/rooms/${roomId}/statistics`)
    },

    // Получить прогресс ночных действий
    getNightProgress: async (roomId) => {
      return await apiCall(`/api/rooms/${roomId}/night-progress`)
    }
  }
}