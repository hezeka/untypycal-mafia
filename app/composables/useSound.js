// Простая система звуков
const soundsEnabled = ref(true)

// Список звуков (файлы должны быть в /public/sounds/)
const SOUNDS = {
  message: 'message.mp3',
  whisper: 'whisper.mp3',
  gameStart: 'game-start.mp3',
  phaseChange: 'phase-change.mp3',
  voting: 'voting.mp3',
  notification: 'notification.mp3'
}

// Проигрывание звука
const playSound = (soundType, volume = 0.5) => {
  if (!soundsEnabled.value || !process.client) return
  
  try {
    const audio = new Audio(`/sounds/${SOUNDS[soundType]}`)
    audio.volume = Math.min(Math.max(volume, 0), 1) // Ограничиваем громкость 0-1
    audio.play().catch(() => {
      // Игнорируем ошибки (файл не найден, нет разрешения на воспроизведение)
    })
  } catch (error) {
    // Игнорируем ошибки
  }
}

export const useSounds = () => {
  return {
    soundsEnabled: readonly(soundsEnabled),
    toggleSounds: () => soundsEnabled.value = !soundsEnabled.value,
    playSound
  }
}