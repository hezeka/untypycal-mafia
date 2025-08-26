/**
 * Composable для голосовой активности - простая реализация VAD
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { useSocket } from './useSocket.js'

// Простая throttle функция
const throttle = (func, limit) => {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Глобальное состояние (singleton)
const speakingPlayers = ref([])
const isListening = ref(false)
const vadEnabled = ref(true)

export const useVoiceActivity = () => {
  const { emit } = useSocket()
  
  // Локальные refs
  const audioContext = ref(null)
  const analyser = ref(null)
  const microphone = ref(null)
  const dataArray = ref(null)
  const isDetecting = ref(false)
  
  /**
   * Инициализация микрофона и анализа
   */
  const initVoiceDetection = async () => {
    if (!vadEnabled.value || isListening.value) return
    
    try {
      console.log('🎙️ Initializing voice detection')
      
      // Запрашиваем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      // Создаем аудио контекст
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
      analyser.value = audioContext.value.createAnalyser()
      microphone.value = audioContext.value.createMediaStreamSource(stream)
      
      // Настройки анализатора
      analyser.value.fftSize = 256
      analyser.value.smoothingTimeConstant = 0.8
      
      const bufferLength = analyser.value.frequencyBinCount
      dataArray.value = new Uint8Array(bufferLength)
      
      // Подключаем микрофон к анализатору
      microphone.value.connect(analyser.value)
      
      isListening.value = true
      startVAD()
      
      console.log('✅ Voice detection initialized')
      
    } catch (error) {
      console.error('❌ Failed to initialize voice detection:', error)
      vadEnabled.value = false
    }
  }
  
  /**
   * Запуск детектора голосовой активности
   */
  const startVAD = () => {
    if (!analyser.value || !dataArray.value) return
    
    const detectVoice = () => {
      if (!isListening.value) return
      
      analyser.value.getByteFrequencyData(dataArray.value)
      
      // Вычисляем средний уровень звука
      const average = dataArray.value.reduce((sum, value) => sum + value, 0) / dataArray.value.length
      
      // Пороговое значение для детекции речи
      const threshold = 30
      const isSpeaking = average > threshold
      
      // Обновляем состояние только при изменении
      if (isSpeaking !== isDetecting.value) {
        isDetecting.value = isSpeaking
        throttledEmitVoiceActivity(isSpeaking)
      }
      
      // Продолжаем анализ
      requestAnimationFrame(detectVoice)
    }
    
    detectVoice()
  }
  
  /**
   * Throttled отправка голосовой активности
   */
  const throttledEmitVoiceActivity = throttle((isSpeaking) => {
    console.log(`🎤 Emitting voice activity: speaking=${isSpeaking}`)
    emit('voice-activity', { speaking: isSpeaking })
  }, 150)
  
  /**
   * Остановка детекции голоса
   */
  const stopVoiceDetection = () => {
    console.log('🎙️ Stopping voice detection')
    
    isListening.value = false
    isDetecting.value = false
    
    // Останавливаем все треки
    if (microphone.value && microphone.value.mediaStream) {
      microphone.value.mediaStream.getTracks().forEach(track => track.stop())
    }
    
    // Закрываем аудио контекст
    if (audioContext.value && audioContext.value.state !== 'closed') {
      audioContext.value.close()
    }
    
    // Очищаем refs
    audioContext.value = null
    analyser.value = null
    microphone.value = null
    dataArray.value = null
  }
  
  /**
   * Переключение VAD
   */
  const toggleVAD = async () => {
    vadEnabled.value = !vadEnabled.value
    
    if (vadEnabled.value) {
      await initVoiceDetection()
    } else {
      stopVoiceDetection()
    }
  }
  
  /**
   * Обработка голосовой активности других игроков
   */
  const handlePlayerVoiceActivity = (data) => {
    const { playerId, speaking } = data
    console.log(`🎯 handlePlayerVoiceActivity: playerId=${playerId}, speaking=${speaking}`)
    console.log(`📋 speakingPlayers before:`, speakingPlayers.value)
    
    if (speaking) {
      // Добавляем игрока в список говорящих
      if (!speakingPlayers.value.includes(playerId)) {
        speakingPlayers.value.push(playerId)
        console.log(`➕ Added player ${playerId} to speakingPlayers`)
      }
    } else {
      // Убираем игрока из списка говорящих
      const index = speakingPlayers.value.indexOf(playerId)
      if (index > -1) {
        speakingPlayers.value.splice(index, 1)
        console.log(`➖ Removed player ${playerId} from speakingPlayers`)
      }
    }
    
    console.log(`📋 speakingPlayers after:`, speakingPlayers.value)
  }
  
  /**
   * Очистка говорящих игроков
   */
  const clearSpeakingPlayers = () => {
    speakingPlayers.value = []
  }
  
  /**
   * Проверка доступности микрофона
   */
  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' })
      return result.state === 'granted'
    } catch (error) {
      console.warn('Cannot check microphone permission:', error)
      return false
    }
  }
  
  /**
   * Проверка поддержки WebRTC
   */
  const isWebRTCSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }
  
  /**
   * Получение информации о микрофоне
   */
  const getMicrophoneInfo = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const microphones = devices.filter(device => device.kind === 'audioinput')
      
      return microphones.map(mic => ({
        id: mic.deviceId,
        label: mic.label || 'Микрофон',
        groupId: mic.groupId
      }))
    } catch (error) {
      console.error('Failed to get microphone info:', error)
      return []
    }
  }
  
  // Автоматическая инициализация при монтировании (если включено)
  onMounted(async () => {
    if (vadEnabled.value && isWebRTCSupported()) {
      const hasPermission = await checkMicrophonePermission()
      if (hasPermission) {
        await initVoiceDetection()
      }
    }
  })
  
  // Очистка при размонтировании
  onUnmounted(() => {
    stopVoiceDetection()
  })
  
  return {
    // Состояние
    speakingPlayers,
    isListening,
    vadEnabled,
    isDetecting,
    
    // Методы
    initVoiceDetection,
    stopVoiceDetection,
    toggleVAD,
    handlePlayerVoiceActivity,
    clearSpeakingPlayers,
    
    // Утилиты
    checkMicrophonePermission,
    isWebRTCSupported,
    getMicrophoneInfo
  }
}

  /**
   * Простая throttle функция (убираем дублирование внизу)
   */