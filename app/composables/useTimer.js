import { ref, computed, onUnmounted } from 'vue'

export function useTimer() {
  const endTime = ref(null)
  const isActive = ref(false)
  const intervalId = ref(null)

  // Локальное время в миллисекундах
  const currentLocalTime = ref(Date.now())

  // Обновляем локальное время каждую секунду
  const startLocalTimer = () => {
    if (intervalId.value) {
      clearInterval(intervalId.value)
    }
    
    intervalId.value = setInterval(() => {
      currentLocalTime.value = Date.now()
    }, 1000)
  }

  // Вычисляем оставшееся время
  const remaining = computed(() => {
    if (!isActive.value || !endTime.value) {
      console.log('⚠️ Timer not active or no end time:', { isActive: isActive.value, endTime: endTime.value })
      return 0
    }

    const timeLeft = Math.max(0, endTime.value - currentLocalTime.value)
    const seconds = Math.floor(timeLeft / 1000)
    // console.log('⏰ Timer calculation:', {
    //   endTime: endTime.value,
    //   currentTime: currentLocalTime.value, 
    //   timeLeft,
    //   seconds
    // })
    return seconds // возвращаем в секундах
  })

  // Установка времени окончания
  const setEndTime = (timestamp) => {
    console.log('🔍 Setting timer end time:', timestamp)
    
    if (timestamp) {
      endTime.value = timestamp
      isActive.value = true
      
      console.log('✅ Timer activated, ends at:', new Date(timestamp))
      
      if (!intervalId.value) {
        startLocalTimer()
      }
    } else {
      console.log('⏹️ Timer deactivated')
      isActive.value = false
      endTime.value = null
      
      if (intervalId.value) {
        clearInterval(intervalId.value)
        intervalId.value = null
      }
    }
  }

  // Совместимость со старым API
  const syncWithServer = (timerData) => {
    if (timerData && timerData.endTime) {
      setEndTime(timerData.endTime)
    } else {
      setEndTime(null)
    }
  }

  // Форматирование времени
  const formatTime = (seconds) => {
    // Извлекаем значение если это ref
    const value = seconds && typeof seconds === 'object' && 'value' in seconds ? seconds.value : seconds
    
    if (!value || value <= 0) return '00:00'
    
    const mins = Math.floor(value / 60)
    const secs = value % 60
    const result = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    // console.log('✅ Formatted result:', result)
    return result
  }

  // Очистка при размонтировании
  onUnmounted(() => {
    if (intervalId.value) {
      clearInterval(intervalId.value)
    }
  })

  return {
    remaining,
    isActive,
    syncWithServer,
    setEndTime,
    formatTime
  }
}