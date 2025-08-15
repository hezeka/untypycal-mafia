// app/composables/useVoiceActivity.js
import { ref, onMounted, onUnmounted } from 'vue'

const isActive = ref(false)
const isSupported = ref(false)
const mediaStream = ref(null)
const audioContext = ref(null)
const analyser = ref(null)
const animationFrame = ref(null)
// Инициализируем состояние микрофона из localStorage или включаем по умолчанию
const getSavedMicrophoneState = () => {
  if (!process.client) return true
  const saved = localStorage.getItem('microphoneEnabled')
  return saved !== null ? JSON.parse(saved) : true
}

const microphoneEnabled = ref(getSavedMicrophoneState())

// Глобальные переменные для сохранения состояния между вызовами композабла
let lastActivityState = false
let currentOnActivityChange = null // Сохраняем текущий callback глобально

export const useVoiceActivity = () => {
  const VOLUME_THRESHOLD = 0.01 // Порог громкости
  const SMOOTHING = 0.3 // Сглаживание
  
  const initVoiceDetection = async (onActivityChange) => {
    console.log('🎤 initVoiceDetection started')
    
    if (!shouldUseMicrophone()) {
      console.log('🎤 shouldUseMicrophone returned false')
      return false
    }
    
    // Сохраняем callback для использования при отключении
    console.log('💾 Saving callback for voice detection:', typeof onActivityChange)
    currentOnActivityChange = onActivityChange
    
    try {
      // Проверяем поддержку браузера
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('Voice detection not supported')
        return false
      }
      
      console.log('🎤 Browser support confirmed')
      
      // Запрашиваем доступ к микрофону с таймаутом
      console.log('🔍 Requesting microphone access...')
      const mediaPromise = navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      // Добавляем таймаут в 5 секунд
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Microphone access timeout')), 5000)
      })
      
      mediaStream.value = await Promise.race([mediaPromise, timeoutPromise])
      console.log('✅ Microphone access granted')
      
      // Создаем аудио контекст
      console.log('🔧 Creating audio context...')
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContext.value.createMediaStreamSource(mediaStream.value)
      console.log('✅ Audio context created')
      
      // Создаем анализатор
      console.log('🔧 Creating analyser...')
      analyser.value = audioContext.value.createAnalyser()
      analyser.value.fftSize = 256
      analyser.value.smoothingTimeConstant = SMOOTHING
      source.connect(analyser.value)
      console.log('✅ Analyser created and connected')
      
      isSupported.value = true
      
      // Запускаем анализ
      console.log('🚀 Starting volume analysis...')
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
  const toggleMicrophone = async (forceStopCallback = null, forceStartCallback = null, voiceCallback = null) => {
    microphoneEnabled.value = !microphoneEnabled.value
    
    // Сохраняем состояние в localStorage
    if (process.client) {
      localStorage.setItem('microphoneEnabled', JSON.stringify(microphoneEnabled.value))
    }
    
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
      
      // Если передан новый callback, сохраняем его
      if (voiceCallback && typeof voiceCallback === 'function') {
        console.log('💾 Saving new voice callback for first-time initialization')
        currentOnActivityChange = voiceCallback
      }
      
      // Затем переинициализируем микрофон если есть callback
      if (currentOnActivityChange) {
        console.log('🔄 Initializing microphone with saved callback')
        try {
          await initVoiceDetection(currentOnActivityChange)
          console.log('✅ Microphone enabled and voice detection started')
        } catch (error) {
          console.warn('❌ Failed to initialize microphone:', error)
          microphoneEnabled.value = false // Откатываем состояние при ошибке
        }
      } else {
        console.warn('⚠️ No callback available, cannot initialize microphone')
        microphoneEnabled.value = false // Откатываем состояние
      }
    }
  }

  // Функция для проверки, должен ли микрофон работать
  const shouldUseMicrophone = () => {
    if (!microphoneEnabled.value) return false
    if (!process.client) return false
    
    // Проверяем, что вкладка активна
    if (document.hidden) return false
    
    // Дополнительная проверка: если нет поддержки getUserMedia, не инициализируем
    if (!navigator.mediaDevices?.getUserMedia) {
      console.log('📵 getUserMedia not supported, skipping microphone')
      return false
    }
    
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