/**
 * Composable для звуковых эффектов - простая реализация
 */

import { ref, onMounted } from 'vue'

// Глобальное состояние звуков (singleton)
const soundEnabled = ref(true)
const volume = ref(0.2)
const audioCache = new Map()

// Конфигурация звуков
const SOUNDS = {
  // Фазы игры
  'game-start': '/sounds/game-start.mp3',
  'phase-change': '/sounds/phase-change.mp3',
  'night': '/sounds/night.mp3',
  'day': '/sounds/day.mp3',
  'voting': '/sounds/voting.mp3',
  
  // Чат и уведомления
  'message': '/sounds/message.mp3',
  'whisper': '/sounds/whisper.mp3',
  'notification': '/sounds/notification.mp3',
  
  // Специальные события
  'night-turn': '/sounds/notification.mp3', // Используем notification для ночной очереди
  'voting-start': '/sounds/voting.mp3',      // Используем voting для начала голосования
  'night-action': '/sounds/notification.mp3', // Клик по ночным кнопкам
}

export const useSound = () => {
  /**
   * Предзагрузка звука
   */
  const preloadSound = (soundId) => {
    if (audioCache.has(soundId)) return
    
    const soundPath = SOUNDS[soundId]
    if (!soundPath) {
      console.warn(`Sound not found: ${soundId}`)
      return
    }
    
    try {
      const audio = new Audio(soundPath)
      audio.preload = 'auto'
      audio.volume = volume.value
      audioCache.set(soundId, audio)
    } catch (error) {
      console.error(`Failed to preload sound ${soundId}:`, error)
    }
  }
  
  /**
   * Воспроизведение звука
   */
  const playSound = (soundId, customVolume = null) => {
    if (!soundEnabled.value) return
    
    try {
      let audio = audioCache.get(soundId)
      
      // Если звук не предзагружен - загружаем
      if (!audio) {
        const soundPath = SOUNDS[soundId]
        if (!soundPath) {
          console.warn(`Sound not found: ${soundId}`)
          return
        }
        
        audio = new Audio(soundPath)
        audioCache.set(soundId, audio)
      }
      
      // Останавливаем предыдущее воспроизведение
      audio.currentTime = 0
      
      // Устанавливаем громкость
      audio.volume = customVolume !== null ? customVolume : volume.value
      
      // Воспроизводим
      const playPromise = audio.play()
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Автовоспроизведение заблокировано браузером
          if (error.name === 'NotAllowedError') {
            console.log('Audio autoplay blocked by browser')
          } else {
            console.error(`Error playing sound ${soundId}:`, error)
          }
        })
      }
      
    } catch (error) {
      console.error(`Failed to play sound ${soundId}:`, error)
    }
  }
  
  /**
   * Остановка всех звуков
   */
  const stopAllSounds = () => {
    audioCache.forEach(audio => {
      try {
        audio.pause()
        audio.currentTime = 0
      } catch (error) {
        // Игнорируем ошибки остановки
      }
    })
  }
  
  /**
   * Включение/выключение звуков
   */
  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    
    if (!soundEnabled.value) {
      stopAllSounds()
    }
    
    // Сохраняем в localStorage
    try {
      localStorage.setItem('mafia-sound-enabled', soundEnabled.value.toString())
    } catch (error) {
      // Игнорируем ошибки localStorage
    }
  }
  
  /**
   * Изменение громкости
   */
  const setVolume = (newVolume) => {
    volume.value = Math.max(0, Math.min(1, newVolume))
    
    // Обновляем громкость всех загруженных звуков
    audioCache.forEach(audio => {
      audio.volume = volume.value
    })
    
    // Сохраняем в localStorage
    try {
      localStorage.setItem('mafia-sound-volume', volume.value.toString())
    } catch (error) {
      // Игнорируем ошибки localStorage
    }
  }
  
  /**
   * Предзагрузка всех звуков
   */
  const preloadAllSounds = () => {
    Object.keys(SOUNDS).forEach(soundId => {
      preloadSound(soundId)
    })
  }
  
  /**
   * Проверка поддержки аудио
   */
  const isAudioSupported = () => {
    return typeof Audio !== 'undefined'
  }
  
  /**
   * Получение информации о звуке
   */
  const getSoundInfo = (soundId) => {
    const audio = audioCache.get(soundId)
    
    if (!audio) return null
    
    return {
      duration: audio.duration || 0,
      currentTime: audio.currentTime || 0,
      paused: audio.paused,
      volume: audio.volume,
      readyState: audio.readyState
    }
  }
  
  /**
   * Очистка кэша звуков
   */
  const clearCache = () => {
    stopAllSounds()
    audioCache.clear()
  }
  
  /**
   * Восстановление настроек из localStorage
   */
  const restoreSettings = () => {
    try {
      const savedEnabled = localStorage.getItem('mafia-sound-enabled')
      if (savedEnabled !== null) {
        soundEnabled.value = savedEnabled === 'true'
      }
      
      const savedVolume = localStorage.getItem('mafia-sound-volume')
      if (savedVolume !== null) {
        const vol = parseFloat(savedVolume)
        if (!isNaN(vol)) {
          volume.value = Math.max(0, Math.min(1, vol))
        }
      }
    } catch (error) {
      console.warn('Failed to restore sound settings:', error)
    }
  }
  
  /**
   * Инициализация при монтировании
   */
  onMounted(() => {
    if (!isAudioSupported()) {
      console.warn('Audio not supported in this browser')
      soundEnabled.value = false
      return
    }
    
    restoreSettings()
    
    // Предзагружаем критически важные звуки
    const criticalSounds = ['notification', 'message', 'phase-change']
    criticalSounds.forEach(soundId => {
      preloadSound(soundId)
    })
  })
  
  return {
    // Состояние
    soundEnabled,
    volume,
    
    // Основные методы
    playSound,
    stopAllSounds,
    toggleSound,
    setVolume,
    
    // Управление кэшем
    preloadSound,
    preloadAllSounds,
    clearCache,
    
    // Утилиты
    isAudioSupported,
    getSoundInfo,
    
    // Константы
    availableSounds: Object.keys(SOUNDS)
  }
}