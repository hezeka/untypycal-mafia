// app/composables/useVoiceActivity.js
import { ref, onUnmounted, readonly } from 'vue'

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

// Загрузка сохраненных настроек
const loadSavedSettings = () => {
  if (!process.client) return { threshold: 0.01, smoothing: 0.3 }
  
  try {
    const savedThreshold = localStorage.getItem('voiceThreshold')
    const savedSmoothing = localStorage.getItem('voiceSmoothing')
    
    return {
      threshold: savedThreshold ? parseFloat(savedThreshold) : 0.01,
      smoothing: savedSmoothing ? parseFloat(savedSmoothing) : 0.3
    }
  } catch (error) {
    console.warn('Ошибка загрузки настроек микрофона:', error)
    return { threshold: 0.01, smoothing: 0.3 }
  }
}

// Загружаем сохраненные настройки при инициализации
const savedSettings = loadSavedSettings()

// Глобальные настройки для всех экземпляров useVoiceActivity
let globalVolumeThreshold = savedSettings.threshold // Порог громкости
let globalSmoothing = savedSettings.smoothing // Сглаживание
let globalSelectedDeviceId = null // Выбранное аудио устройство

// Загрузка выбранного устройства
const loadSelectedDevice = () => {
  if (!process.client) return null
  
  try {
    const saved = localStorage.getItem('selectedAudioDevice')
    return saved ? saved : null
  } catch (error) {
    console.warn('Ошибка загрузки выбранного устройства:', error)
    return null
  }
}

globalSelectedDeviceId = loadSelectedDevice()

export const useVoiceActivity = () => {
  // Функции для обновления глобальных настроек
  const updateVolumeThreshold = (newThreshold) => {
    globalVolumeThreshold = newThreshold
    console.log('🎤 Updated volume threshold to:', newThreshold)
  }
  
  const updateSmoothing = (newSmoothing) => {
    globalSmoothing = newSmoothing
    // Если есть активный анализатор, обновляем его настройки
    if (analyser.value) {
      analyser.value.smoothingTimeConstant = newSmoothing
      console.log('🎤 Updated smoothing to:', newSmoothing)
    }
  }
  
  const getCurrentSettings = () => ({
    threshold: globalVolumeThreshold,
    smoothing: globalSmoothing,
    selectedDeviceId: globalSelectedDeviceId
  })

  // Функция для получения списка аудио устройств
  const getAudioDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('enumerateDevices not supported')
        return []
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(device => device.kind === 'audioinput')
      
      console.log('🎤 Found audio devices:', audioInputs.length)
      
      // Если нет меток устройств, нужно сначала запросить разрешения
      if (audioInputs.length > 0 && !audioInputs[0].label) {
        console.log('🔐 Device labels empty, requesting permissions first...')
        try {
          // Запрашиваем временный доступ для получения меток
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          tempStream.getTracks().forEach(track => track.stop())
          
          // Получаем устройства с метками
          const devicesWithLabels = await navigator.mediaDevices.enumerateDevices()
          return devicesWithLabels.filter(device => device.kind === 'audioinput')
        } catch (error) {
          console.warn('Could not get device labels:', error)
          return audioInputs
        }
      }
      
      return audioInputs
    } catch (error) {
      console.error('Error getting audio devices:', error)
      return []
    }
  }

  // Функция для обновления выбранного устройства
  const updateSelectedDevice = (deviceId) => {
    globalSelectedDeviceId = deviceId
    
    // Сохраняем в localStorage
    if (process.client) {
      if (deviceId) {
        localStorage.setItem('selectedAudioDevice', deviceId)
      } else {
        localStorage.removeItem('selectedAudioDevice')
      }
    }
    
    console.log('🎤 Updated selected device to:', deviceId || 'default')
  }
  
  const initVoiceDetection = async (onActivityChange, skipEnabledCheck = false) => {
    console.log('🎤 initVoiceDetection started')
    
    // Проверяем shouldUseMicrophone только если не пропускаем проверку включенности
    if (!skipEnabledCheck && !shouldUseMicrophone()) {
      console.log('🎤 shouldUseMicrophone returned false')
      return false
    }
    
    // Если пропускаем проверку, то проверяем только клиентскую среду и видимость
    if (skipEnabledCheck) {
      if (!process.client) {
        console.log('🎤 Not in client environment')
        return false
      }
      if (document.hidden) {
        console.log('🎤 Tab is hidden')
        return false
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        console.log('📵 getUserMedia not supported')
        return false
      }
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

      // Даем браузеру явно перерисовать UI и выполнить рендер перед запросом доступа.
      // Ждём два кадра + небольшой буфер — это в большинстве случаев устраняет фриз.
      await new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 120)))
      })

      // Не вызываем navigator.permissions.query — на некоторых платформах это добавляет задержку.
      // Переходим сразу к getUserMedia
      
      // Настройки аудио с возможным указанием устройства
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
      
      // Если выбрано конкретное устройство, добавляем его ID
      if (globalSelectedDeviceId) {
        audioConstraints.deviceId = { exact: globalSelectedDeviceId }
        console.log('🎤 Using selected device:', globalSelectedDeviceId)
      } else {
        console.log('🎤 Using default device')
      }

      const mediaPromise = navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints
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
      
      // Проверяем состояние аудио контекста
      if (audioContext.value.state === 'suspended') {
        console.log('🔓 Resuming suspended audio context...')
        await audioContext.value.resume()
      }
      
      const source = audioContext.value.createMediaStreamSource(mediaStream.value)
      console.log('✅ Audio context created')
      
      // Создаем анализатор
      console.log('🔧 Creating analyser...')
      analyser.value = audioContext.value.createAnalyser()
      analyser.value.fftSize = 256
      analyser.value.smoothingTimeConstant = globalSmoothing
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
      
      // Сбрасываем состояния при ошибке
      if (mediaStream.value) {
        mediaStream.value.getTracks().forEach(track => track.stop())
        mediaStream.value = null
      }
      if (audioContext.value) {
        audioContext.value.close()
        audioContext.value = null
      }
      
      isSupported.value = false
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
      const currentlyActive = average > globalVolumeThreshold
      
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
  
  const stopVoiceDetection = (fullStop = true) => {
    console.log(`🔇 Stopping voice detection (full: ${fullStop})...`)
    
    // ВСЕГДА уведомляем о прекращении активности
    if (currentOnActivityChange) {
      console.log('📤 Sending final voice activity stop event')
      currentOnActivityChange(false)
    }
    
    // Останавливаем анимацию
    if (animationFrame.value) {
      cancelAnimationFrame(animationFrame.value)
      animationFrame.value = null
    }
    
    if (fullStop) {
      // ПОЛНАЯ остановка - закрываем все ресурсы
      if (mediaStream.value) {
        console.log('🛑 Stopping media stream tracks (full stop)...')
        mediaStream.value.getTracks().forEach(track => {
          console.log('🛑 Stopping track:', track.kind, track.label)
          track.stop()
        })
        mediaStream.value = null
        console.log('✅ Media stream cleared')
      }
      
      if (audioContext.value) {
        console.log('🛑 Closing audio context...')
        audioContext.value.close().then(() => {
          console.log('✅ Audio context closed')
        }).catch((error) => {
          console.warn('⚠️ Error closing audio context:', error)
        })
        audioContext.value = null
      }
      
      // Сбрасываем анализатор
      analyser.value = null
      isSupported.value = false
    }
    
    // Сбрасываем активные состояния
    isActive.value = false
    lastActivityState = false
    // ВАЖНО: НЕ очищаем currentOnActivityChange и медиа ресурсы при мягкой остановке
    
    console.log(`✅ Voice detection stopped (full: ${fullStop})`)
  }

  const pendingInit = ref(false)
  let pendingUserGestureListener = null

  const triggerPendingInitOnGesture = () => {
    if (pendingUserGestureListener) return
    pendingUserGestureListener = (ev) => {
      if (!ev.isTrusted) return
      // удаляем слушатель и запускаем инициализацию
      document.removeEventListener('pointerdown', pendingUserGestureListener)
      pendingUserGestureListener = null
      if (currentOnActivityChange) {
        initVoiceDetection(currentOnActivityChange)
          .then(ok => { if (ok) pendingInit.value = false })
          .catch(err => {
            console.warn('❌ initVoiceDetection failed on user gesture:', err)
            pendingInit.value = false
          })
      } else {
        pendingInit.value = false
      }
    }
    document.addEventListener('pointerdown', pendingUserGestureListener, { once: false })
  }

  // ИСПРАВЛЕНИЕ: Оптимизированная функция для отключения/включения микрофона
  const toggleMicrophone = async (forceStopCallback = null, forceStartCallback = null, voiceCallback = null, userGestureEvent = null) => {
    const wasEnabled = microphoneEnabled.value
    const targetState = !wasEnabled
    
    if (!targetState) {
      // Выключаем микрофон
      microphoneEnabled.value = false
      
      // Сохраняем состояние в localStorage
      if (process.client) {
        localStorage.setItem('microphoneEnabled', JSON.stringify(false))
      }
      console.log('🎤❌ Disabling microphone...')
      
      // СНАЧАЛА принудительно останавливаем голосовую активность в игре
      if (forceStopCallback && typeof forceStopCallback === 'function') {
        forceStopCallback()
      }
      
      // ИСПРАВЛЕНИЕ: Мягкое отключение - останавливаем только анализ, НЕ закрываем поток
      if (animationFrame.value) {
        cancelAnimationFrame(animationFrame.value)
        animationFrame.value = null
      }
      
      // Отправляем событие о прекращении активности
      if (currentOnActivityChange) {
        currentOnActivityChange(false)
      }
      
      console.log('✅ Microphone disabled (soft shutdown)')
      return true
    } else {
      // Включаем микрофон
      console.log('🎤✅ Trying to enable microphone...')
      
      // Сначала сбрасываем состояние голосовой активности
      if (forceStartCallback && typeof forceStartCallback === 'function') {
        forceStartCallback()
      }
      
      // Если передан новый callback, сохраняем его
      if (voiceCallback && typeof voiceCallback === 'function') {
        console.log('💾 Saving new voice callback')
        currentOnActivityChange = voiceCallback
      }
      
      // ИСПРАВЛЕНИЕ: Проверяем, можем ли возобновить существующий поток
      if (mediaStream.value && analyser.value && currentOnActivityChange) {
        console.log('🔄 Resuming existing microphone stream')
        
        // Проверяем, что поток все еще активен
        const activeTracks = mediaStream.value.getTracks().filter(track => track.readyState === 'live')
        if (activeTracks.length > 0) {
          // Поток активен - просто возобновляем анализ
          microphoneEnabled.value = true
          if (process.client) {
            localStorage.setItem('microphoneEnabled', JSON.stringify(true))
          }
          startVolumeAnalysis(currentOnActivityChange)
          console.log('✅ Microphone resumed without reinitialization')
          return true
        } else {
          console.log('🔄 Stream inactive, need full reinitialization')
        }
      }
      
      // Полная инициализация если нет активного потока
      if (currentOnActivityChange) {
        if (userGestureEvent && userGestureEvent.isTrusted) {
          console.log('🔄 Full microphone initialization (user gesture)')
          try {
            const result = await initVoiceDetection(currentOnActivityChange)
            if (result) {
              microphoneEnabled.value = true
              if (process.client) {
                localStorage.setItem('microphoneEnabled', JSON.stringify(true))
              }
              console.log('✅ Microphone fully initialized')
              return true
            } else {
              console.warn('❌ Failed to initialize microphone: permission denied')
              return false
            }
          } catch (error) {
            console.warn('❌ Failed to initialize microphone:', error)
            throw error
          }
        } else {
          // Откладываем инициализацию до следующего доверенного жеста
          pendingInit.value = true
          console.log('⏳ Microphone init deferred until user gesture')
          triggerPendingInitOnGesture()
          microphoneEnabled.value = true
          if (process.client) {
            localStorage.setItem('microphoneEnabled', JSON.stringify(true))
          }
          return true
        }
      } else {
        console.warn('⚠️ No callback available, cannot initialize microphone')
        return false
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
  
  // ИСПРАВЛЕНИЕ: Более умная обработка изменений видимости вкладки
  const handleVisibilityChange = async () => {
    if (document.hidden && isSupported.value) {
      // Вкладка скрыта - приостанавливаем анализ, но НЕ закрываем полностью микрофон
      console.log('🎤💤 Tab hidden, pausing voice activity...')
      
      if (animationFrame.value) {
        cancelAnimationFrame(animationFrame.value)
        animationFrame.value = null
      }
      
      // Отправляем финальное событие о прекращении активности
      if (currentOnActivityChange) {
        currentOnActivityChange(false)
      }
      
      console.log('✅ Voice activity paused (tab hidden)')
    } else if (!document.hidden && mediaStream.value && analyser.value) {
      // ИСПРАВЛЕНИЕ: Вкладка стала видимой - возобновляем анализ БЕЗ переинициализации
      console.log('🎤🔄 Tab visible, resuming voice activity...')
      
      if (currentOnActivityChange && !animationFrame.value) {
        startVolumeAnalysis(currentOnActivityChange)
        console.log('✅ Voice activity resumed')
      }
    }
  }

  // Инициализируем обработчики событий
  if (process.client) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  // Очистка при размонтировании
  onUnmounted(async () => {
    console.log('🧹 Cleaning up voice activity on unmount...')
    stopVoiceDetection(true) // Полная остановка при размонтировании
    
    // Даем браузеру время полностью освободить ресурсы
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (process.client) {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (pendingUserGestureListener) {
        document.removeEventListener('pointerdown', pendingUserGestureListener)
        pendingUserGestureListener = null
      }
    }
    
    console.log('✅ Voice activity cleanup completed')
  })
  
  // Функция для повторной попытки включения микрофона (без переключения состояния)
  const retryMicrophoneEnable = async (voiceCallback, userGestureEvent = null) => {
    console.log('🔄 Retrying microphone enable...')
    
    // Если уже включен, возвращаем success
    if (microphoneEnabled.value) {
      console.log('🎤 Microphone already enabled')
      return true
    }
    
    // Сохраняем callback
    if (voiceCallback && typeof voiceCallback === 'function') {
      console.log('💾 Saving voice callback for retry')
      currentOnActivityChange = voiceCallback
    }
    
    try {
      // Используем initVoiceDetection с пропуском проверки включенности
      console.log('🎤 Calling initVoiceDetection with skipEnabledCheck=true')
      
      const result = await initVoiceDetection(currentOnActivityChange, true)
      
      if (result) {
        // Успех - обновляем состояние
        microphoneEnabled.value = true
        if (process.client) {
          localStorage.setItem('microphoneEnabled', JSON.stringify(true))
        }
        console.log('✅ Microphone retry successful')
        return true
      } else {
        console.warn('❌ Microphone retry failed: permission denied')
        return false
      }
    } catch (error) {
      console.warn('❌ Microphone retry failed:', error)
      throw error
    }
  }

  return {
    isActive: readonly(isActive),
    isSupported: readonly(isSupported),
    microphoneEnabled: readonly(microphoneEnabled),
    initVoiceDetection,
    stopVoiceDetection,
    toggleMicrophone,
    retryMicrophoneEnable,
    shouldUseMicrophone,
    updateVolumeThreshold,
    updateSmoothing,
    updateSelectedDevice,
    getAudioDevices,
    getCurrentSettings
  }
}