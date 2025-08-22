<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <button @click="$emit('close')" class="modal-close">×</button>
      
      <h2 class="modal-title">Настройки</h2>
      
      <div class="settings-content">
        
        <section class="setting-section">
          <h3>Звук</h3>
          <div class="setting-item">
            <label class="setting-label">
              <input 
                v-model="soundEnabled"
                type="checkbox"
                class="setting-checkbox"
              />
              <span>Включить звуковые эффекты</span>
            </label>
          </div>
          
          <div v-if="soundEnabled" class="setting-item">
            <label class="setting-label">
              Громкость звука
            </label>
            <input 
              v-model="soundVolume"
              type="range"
              min="0"
              max="100"
              class="setting-range"
            />
            <span class="range-value">{{ soundVolume }}%</span>
          </div>
        </section>
        
        <section class="setting-section">
          <h3>Голосовая активность</h3>
          <div class="setting-item">
            <label class="setting-label">
              <input 
                v-model="vadEnabled"
                type="checkbox"
                class="setting-checkbox"
              />
              <span>Показывать говорящих игроков</span>
            </label>
          </div>
          
          <div class="setting-item">
            <button 
              @click="testMicrophone"
              :disabled="!vadEnabled"
              class="btn btn-secondary"
            >
              {{ microphoneStatus }}
            </button>
          </div>
        </section>
        
        <section class="setting-section">
          <h3>Интерфейс</h3>
          <div class="setting-item">
            <label class="setting-label">
              <input 
                v-model="showTimestamps"
                type="checkbox"
                class="setting-checkbox"
              />
              <span>Показывать время сообщений</span>
            </label>
          </div>
          
          <div class="setting-item">
            <label class="setting-label">
              <input 
                v-model="compactMode"
                type="checkbox"
                class="setting-checkbox"
              />
              <span>Компактный режим чата</span>
            </label>
          </div>
        </section>
        
        <section class="setting-section">
          <h3>Информация</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Версия:</span>
              <span class="info-value">2.0.0</span>
            </div>
            <div class="info-item">
              <span class="info-label">Сервер:</span>
              <span class="info-value" :class="{ 'connected': isConnected }">
                {{ isConnected ? 'Подключен' : 'Отключен' }}
              </span>
            </div>
          </div>
        </section>
        
      </div>
      
      <div class="settings-actions">
        <button @click="resetSettings" class="btn btn-outline">
          Сбросить
        </button>
        <button @click="saveSettings" class="btn btn-primary">
          Сохранить
        </button>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSocket } from '~/composables/useSocket'
import { useVoiceActivity } from '~/composables/useVoiceActivity'

defineEmits(['close'])

const { isConnected } = useSocket()
const { vadEnabled: globalVadEnabled, checkMicrophonePermission } = useVoiceActivity()

// Локальные настройки
const soundEnabled = ref(true)
const soundVolume = ref(70)
const vadEnabled = ref(true)
const showTimestamps = ref(true)
const compactMode = ref(false)
const microphoneStatus = ref('Проверить микрофон')

// Методы
const testMicrophone = async () => {
  microphoneStatus.value = 'Проверка...'
  
  try {
    const hasPermission = await checkMicrophonePermission()
    microphoneStatus.value = hasPermission ? 'Микрофон работает' : 'Нет доступа к микрофону'
  } catch (error) {
    microphoneStatus.value = 'Ошибка микрофона'
  }
  
  setTimeout(() => {
    microphoneStatus.value = 'Проверить микрофон'
  }, 3000)
}

const saveSettings = () => {
  const settings = {
    soundEnabled: soundEnabled.value,
    soundVolume: soundVolume.value,
    vadEnabled: vadEnabled.value,
    showTimestamps: showTimestamps.value,
    compactMode: compactMode.value
  }
  
  localStorage.setItem('mafia-settings', JSON.stringify(settings))
  
  // Применяем настройки
  globalVadEnabled.value = vadEnabled.value
  
  console.log('Settings saved:', settings)
}

const loadSettings = () => {
  try {
    const saved = localStorage.getItem('mafia-settings')
    if (saved) {
      const settings = JSON.parse(saved)
      
      soundEnabled.value = settings.soundEnabled ?? true
      soundVolume.value = settings.soundVolume ?? 70
      vadEnabled.value = settings.vadEnabled ?? true
      showTimestamps.value = settings.showTimestamps ?? true
      compactMode.value = settings.compactMode ?? false
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}
const resetSettings = () => {
  soundEnabled.value = true
  soundVolume.value = 70
  vadEnabled.value = true
  showTimestamps.value = true
  compactMode.value = false
}
onMounted(() => {
  loadSettings()
})
</script>