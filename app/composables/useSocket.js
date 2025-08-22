/**
 * Socket.IO composable - простое подключение к серверу
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

// Глобальный экземпляр сокета (singleton)
let socketInstance = null
const isConnected = ref(false)
const connectionError = ref(null)

export const useSocket = () => {
  const socket = ref(socketInstance)
  
  /**
   * Инициализация подключения к сокету
   */
  const initSocket = () => {
    if (socketInstance) {
      return socketInstance
    }
    
    const serverUrl = process.env.NODE_ENV === 'production'
      ? 'https://mafia.waifucards.app'
      : 'http://localhost:3001'
    
    console.log(`🔌 Connecting to socket server: ${serverUrl}`)
    
    socketInstance = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })
    
    socket.value = socketInstance
    
    // Обработчики подключения
    socketInstance.on('connect', () => {
      console.log('✅ Connected to server:', socketInstance.id)
      isConnected.value = true
      connectionError.value = null
    })
    
    socketInstance.on('disconnect', (reason) => {
      console.warn('❌ Disconnected from server:', reason)
      isConnected.value = false
      
      if (reason === 'io server disconnect') {
        // Сервер принудительно отключил - переподключаемся
        socketInstance.connect()
      }
    })
    
    socketInstance.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error)
      isConnected.value = false
      connectionError.value = error.message
    })
    
    // Обработка переподключения
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`)
      isConnected.value = true
      connectionError.value = null
    })
    
    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`)
    })
    
    socketInstance.on('reconnect_error', (error) => {
      console.error('🔄 Reconnection error:', error)
      connectionError.value = error.message
    })
    
    socketInstance.on('reconnect_failed', () => {
      console.error('💀 Reconnection failed')
      connectionError.value = 'Не удалось переподключиться к серверу'
    })
    
    // Общий обработчик ошибок
    socketInstance.on('error', (error) => {
      console.error('⚠️ Socket error:', error)
    })
    
    // Подтверждение подключения от сервера
    socketInstance.on('connected', (data) => {
      console.log('🎉 Server acknowledged connection:', data)
    })
    
    // Уведомление о перезагрузке сервера
    socketInstance.on('server-shutdown', (data) => {
      console.warn('🔄 Server shutdown:', data.message)
      // Можно показать уведомление пользователю
    })
    
    return socketInstance
  }
  
  /**
   * Отключение от сокета
   */
  const disconnectSocket = () => {
    if (socketInstance) {
      console.log('🔌 Disconnecting from server')
      socketInstance.disconnect()
      socketInstance = null
      socket.value = null
      isConnected.value = false
    }
  }
  
  /**
   * Переподключение к серверу
   */
  const reconnectSocket = () => {
    if (socketInstance) {
      console.log('🔄 Manual reconnection')
      socketInstance.connect()
    } else {
      initSocket()
    }
  }
  
  /**
   * Отправка события с обработкой ошибок
   */
  const emit = (event, data = {}, callback = null) => {
    if (!socketInstance || !isConnected.value) {
      console.warn('⚠️ Cannot emit - not connected to server')
      return false
    }
    
    try {
      if (callback) {
        socketInstance.emit(event, data, callback)
      } else {
        socketInstance.emit(event, data)
      }
      
      return true
    } catch (error) {
      console.error(`❌ Error emitting ${event}:`, error)
      return false
    }
  }
  
  /**
   * Подписка на событие с автоматической отпиской
   */
  const on = (event, handler) => {
    if (!socketInstance) {
      console.warn('⚠️ Cannot subscribe - socket not initialized')
      return () => {}
    }
    
    socketInstance.on(event, handler)
    
    // Возвращаем функцию отписки
    return () => {
      if (socketInstance) {
        socketInstance.off(event, handler)
      }
    }
  }
  
  /**
   * Одноразовая подписка на событие
   */
  const once = (event, handler) => {
    if (!socketInstance) {
      console.warn('⚠️ Cannot subscribe - socket not initialized')
      return () => {}
    }
    
    socketInstance.once(event, handler)
    
    return () => {
      if (socketInstance) {
        socketInstance.off(event, handler)
      }
    }
  }
  
  /**
   * Отписка от события
   */
  const off = (event, handler = null) => {
    if (socketInstance) {
      if (handler) {
        socketInstance.off(event, handler)
      } else {
        socketInstance.off(event)
      }
    }
  }
  
  /**
   * Проверка подключения
   */
  const checkConnection = () => {
    return socketInstance && socketInstance.connected
  }
  
  /**
   * Получение ID сокета
   */
  const getSocketId = () => {
    return socketInstance ? socketInstance.id : null
  }
  
  /**
   * Автоматическая инициализация при монтировании
   */
  onMounted(() => {
    if (!socketInstance) {
      initSocket()
    }
  })
  
  /**
   * Очистка при размонтировании (только если нет других подключений)
   */
  onUnmounted(() => {
    // Не отключаем автоматически - может использоваться в других компонентах
    // disconnectSocket()
  })
  
  return {
    // Состояние
    socket,
    isConnected,
    connectionError,
    
    // Методы подключения
    initSocket,
    disconnectSocket,
    reconnectSocket,
    
    // Методы работы с событиями
    emit,
    on,
    once,
    off,
    
    // Утилиты
    checkConnection,
    getSocketId
  }
}