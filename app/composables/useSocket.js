import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

let socketInstance = null
const isConnected = ref(false)

export const useSocket = () => {
  const initSocket = () => {
    if (process.client && !socketInstance) { // Только на клиенте
      // Определяем URL для подключения
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin // Используем тот же домен в продакшене
        : 'http://localhost:3001' // Локальная разработка
      
      console.log('Connecting to socket server:', socketUrl)
      
      socketInstance = io(socketUrl, {
        // Дополнительные опции для продакшена
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        // Таймауты
        timeout: 20000,
        // Автоподключение
        autoConnect: true,
        // Для nginx с SSL
        secure: process.env.NODE_ENV === 'production',
        // Путь к socket.io (nginx проксирует /socket.io/ на порт 3001)
        path: '/socket.io/'
      })
      
      socketInstance.on('connect', () => {
        isConnected.value = true
        console.log('✅ Connected to server:', socketInstance.id)
      })
      
      socketInstance.on('disconnect', (reason) => {
        isConnected.value = false
        console.log('❌ Disconnected from server. Reason:', reason)
      })

      socketInstance.on('connect_error', (error) => {
        console.error('💥 Socket connection error:', error)
        isConnected.value = false
      })

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected after ${attemptNumber} attempts`)
        isConnected.value = true
      })

      socketInstance.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Reconnect attempt #${attemptNumber}`)
      })

      socketInstance.on('reconnect_error', (error) => {
        console.error('💥 Reconnection error:', error)
      })

      socketInstance.on('reconnect_failed', () => {
        console.error('💥 Failed to reconnect to server')
        isConnected.value = false
      })
    }
    return socketInstance
  }

  const getSocket = () => {
    if (!socketInstance && process.client) {
      return initSocket()
    }
    return socketInstance
  }

  const disconnect = () => {
    if (socketInstance) {
      socketInstance.disconnect()
      socketInstance = null
      isConnected.value = false
    }
  }

  return {
    socket: getSocket(),
    isConnected: readonly(isConnected),
    initSocket,
    disconnect
  }
}