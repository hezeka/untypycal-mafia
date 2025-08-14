// app/composables/useVoiceActivity.js
import { ref, onMounted, onUnmounted } from 'vue'

const isActive = ref(false)
const isSupported = ref(false)
const mediaStream = ref(null)
const audioContext = ref(null)
const analyser = ref(null)
const animationFrame = ref(null)
const microphoneEnabled = ref(true) // Новое состояние для управления микрофоном

// Глобальные переменные для сохранения состояния между вызовами композабла
let lastActivityState = false
let currentOnActivityChange = null // Сохраняем текущий callback глобально

export const useVoiceActivity = () => {
  const VOLUME_THRESHOLD = 0.01 // Порог громкости
  const SMOOTHING = 0.3 // Сглаживание
  
  const initVoiceDetection = async (onActivityChange) => {
    if (!shouldUseMicrophone()) return false
    
    // Сохраняем callback для использования при отключении
    console.log('💾 Saving callback for voice detection:', typeof onActivityChange)
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
    console.log('🔇 Stopping voice detection...')
    
    // ВСЕГДА уведомляем о прекращении активности, даже если не было активности
    if (currentOnActivityChange) {
      console.log('📤 Sending final voice activity stop event')
      currentOnActivityChange(false)
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
    
    // Сбрасываем состояния, но СОХРАНЯЕМ callback для переинициализации
    isActive.value = false
    isSupported.value = false
    lastActivityState = false
    // ВАЖНО: НЕ очищаем currentOnActivityChange, чтобы можно было переинициализировать
    
    console.log('✅ Voice detection fully stopped')
  }

  // Функция для отключения/включения микрофона
  const toggleMicrophone = async (forceStopCallback = null, forceStartCallback = null) => {
    microphoneEnabled.value = !microphoneEnabled.value
    
    if (!microphoneEnabled.value) {
      console.log('🎤❌ Disabling microphone...')
      
      // СНАЧАЛА принудительно останавливаем голосовую активность в игре
      if (forceStopCallback && typeof forceStopCallback === 'function') {
        forceStopCallback()
      }
      
      // Затем останавливаем детекцию микрофона
      stopVoiceDetection()
      
      console.log('✅ Microphone disabled and voice activity stopped')
    } else {
      console.log('🎤✅ Enabling microphone...')
      
      // Сначала сбрасываем состояние голосовой активности
      if (forceStartCallback && typeof forceStartCallback === 'function') {
        forceStartCallback()
      }
      
      // Затем переинициализируем микрофон если есть callback
      if (currentOnActivityChange) {
        console.log('🔄 Reusing saved callback for voice detection')
        try {
          await initVoiceDetection(currentOnActivityChange)
          console.log('✅ Microphone enabled and voice detection restarted')
        } catch (error) {
          console.warn('❌ Failed to reinitialize microphone:', error)
        }
      } else {
        console.warn('⚠️ No callback saved, microphone enabled but not initialized')
        console.log('🔍 Debug: currentOnActivityChange =', currentOnActivityChange)
        console.log('🔍 Debug: typeof currentOnActivityChange =', typeof currentOnActivityChange)
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