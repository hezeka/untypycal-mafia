// app/composables/useVoiceActivity.js
import { ref, onMounted, onUnmounted } from 'vue'

const isActive = ref(false)
const isSupported = ref(false)
const mediaStream = ref(null)
const audioContext = ref(null)
const analyser = ref(null)
const animationFrame = ref(null)
const microphoneEnabled = ref(true) // Новое состояние для управления микрофоном

export const useVoiceActivity = () => {
  let lastActivityState = false
  let currentOnActivityChange = null // Сохраняем текущий callback
  const VOLUME_THRESHOLD = 0.01 // Порог громкости
  const SMOOTHING = 0.3 // Сглаживание
  
  const initVoiceDetection = async (onActivityChange) => {
    if (!shouldUseMicrophone()) return false
    
    // Сохраняем callback для использования при отключении
    currentOnActivityChange = onActivityChange
    
    try {
      // Проверяем поддержку браузера
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('Voice detection not supported')
        return false
      }
      
      // Запрашиваем доступ к микрофону
      mediaStream.value = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      // Создаем аудио контекст
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContext.value.createMediaStreamSource(mediaStream.value)
      
      // Создаем анализатор
      analyser.value = audioContext.value.createAnalyser()
      analyser.value.fftSize = 256
      analyser.value.smoothingTimeConstant = SMOOTHING
      source.connect(analyser.value)
      
      isSupported.value = true
      
      // Запускаем анализ
      startVolumeAnalysis(onActivityChange)
      
      console.log('✅ Voice detection initialized')
      return true
      
    } catch (error) {
      console.error('❌ Failed to initialize voice detection:', error)
      return false
    }
  }
  
  const startVolumeAnalysis = (onActivityChange) => {
    if (!analyser.value) return
    
    const bufferLength = analyser.value.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    const analyze = () => {
      if (!analyser.value) return
      
      analyser.value.getByteFrequencyData(dataArray)
      
      // Вычисляем средний уровень громкости
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i]
      }
      const average = sum / bufferLength / 255 // Нормализуем 0-1
      
      // Определяем активность
      const currentlyActive = average > VOLUME_THRESHOLD
      
      // Отправляем событие только при изменении состояния
      if (currentlyActive !== lastActivityState) {
        lastActivityState = currentlyActive
        isActive.value = currentlyActive
        onActivityChange(currentlyActive)
      }
      
      animationFrame.value = requestAnimationFrame(analyze)
    }
    
    analyze()
  }
  
  const stopVoiceDetection = () => {
    // Если был активен, уведомляем о прекращении активности
    if (isActive.value && currentOnActivityChange) {
      isActive.value = false
      lastActivityState = false
      currentOnActivityChange(false) // Уведомляем систему об отключении активности
    }
    
    // Останавливаем анимацию
    if (animationFrame.value) {
      cancelAnimationFrame(animationFrame.value)
      animationFrame.value = null
    }
    
    // Закрываем аудио контекст
    if (audioContext.value) {
      audioContext.value.close()
      audioContext.value = null
    }
    
    // Останавливаем медиа поток
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach(track => track.stop())
      mediaStream.value = null
    }
    
    isActive.value = false
    isSupported.value = false
    lastActivityState = false
    currentOnActivityChange = null // Очищаем сохраненный callback
    
    console.log('🔇 Voice detection stopped')
  }

  // Функция для отключения/включения микрофона
  const toggleMicrophone = async () => {
    microphoneEnabled.value = !microphoneEnabled.value
    
    if (!microphoneEnabled.value) {
      // Полностью отключаем микрофон
      stopVoiceDetection()
      console.log('🎤❌ Microphone disabled')
    } else {
      console.log('🎤✅ Microphone enabled')
      // Если у нас есть сохраненный callback, автоматически переинициализируем
      if (currentOnActivityChange) {
        try {
          await initVoiceDetection(currentOnActivityChange)
        } catch (error) {
          console.warn('Failed to reinitialize microphone:', error)
        }
      }
    }
  }

  // Функция для проверки, должен ли микрофон работать
  const shouldUseMicrophone = () => {
    if (!microphoneEnabled.value) return false
    if (!process.client) return false
    
    // Проверяем, что вкладка активна
    if (document.hidden) return false
    
    return true
  }
  
  // Обработка изменений видимости вкладки
  const handleVisibilityChange = () => {
    if (document.hidden && isSupported.value) {
      // Вкладка скрыта - отключаем микрофон
      stopVoiceDetection()
      console.log('🎤💤 Microphone paused (tab hidden)')
    }
    // При возврате к вкладке микрофон нужно будет переинициализировать вручную
  }

  // Инициализируем обработчики событий
  if (process.client) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  // Очистка при размонтировании
  onUnmounted(() => {
    stopVoiceDetection()
    if (process.client) {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  })
  
  return {
    isActive: readonly(isActive),
    isSupported: readonly(isSupported),
    microphoneEnabled: readonly(microphoneEnabled),
    initVoiceDetection,
    stopVoiceDetection,
    toggleMicrophone,
    shouldUseMicrophone
  }
}