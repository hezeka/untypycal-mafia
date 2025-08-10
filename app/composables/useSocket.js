import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

let socketInstance = null
const isConnected = ref(false)

export const useSocket = () => {
  const initSocket = () => {
    if (process.client && !socketInstance) { // Только на клиенте
      socketInstance = io(process.env.NODE_ENV === 'production' ? 'http://localhost:3001' : 'http://localhost:3001')
      
      socketInstance.on('connect', () => {
        isConnected.value = true
        console.log('Connected to server')
      })
      
      socketInstance.on('disconnect', () => {
        isConnected.value = false
        console.log('Disconnected from server')
      })

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
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