<template>
  <div class="microphone-settings" 
       :class="{ visible: isVisible }"
       @mouseenter="$emit('mouseenter')"
       @mouseleave="$emit('mouseleave')">
    <div class="settings-panel">
      <div class="panel-header">
        <h4>🎤 Настройки микрофона</h4>
        <button @click="resetToDefaults" class="reset-btn">↻</button>
      </div>
      
      <div class="settings-content">
        <!-- Volume Meter -->
        <div class="volume-section">
          <div class="volume-meter">
            <div class="meter-fill" 
                 :style="{ 
                   width: `${Math.min(currentVolume * 2000, 100)}%`,
                   backgroundColor: currentVolume > threshold ? '#00ff88' : '#555'
                 }">
            </div>
            <div class="threshold-line" 
                 :style="{ left: `${Math.min(threshold * 2000, 100)}%` }">
            </div>
          </div>
          <div class="volume-indicator">
            <span class="activity-dot" :class="{ active: isActive }"></span>
            {{ isActive ? 'Говорит' : 'Тихо' }} ({{ currentVolume.toFixed(3) }})
          </div>
        </div>

        <!-- Threshold Control -->
        <div class="control-group">
          <label class="control-label">
            Чувствительность: {{ getThresholdLabel(threshold) }}
          </label>
          <div class="slider-container">
            <input 
              type="range" 
              v-model.number="threshold" 
              min="0.001" 
              max="0.050" 
              step="0.001"
              class="slider threshold-slider"
              @input="onThresholdChange"
            >
            <div class="slider-marks">
              <span class="mark">Высокая</span>
              <span class="mark">Средняя</span>
              <span class="mark">Низкая</span>
            </div>
          </div>
        </div>

        <!-- Smoothing Control -->
        <div class="control-group">
          <label class="control-label">
            Сглаживание: {{ getSmoothingLabel(smoothing) }}
          </label>
          <div class="slider-container">
            <input 
              type="range" 
              v-model.number="smoothing" 
              min="0.1" 
              max="0.8" 
              step="0.05"
              class="slider smoothing-slider"
              @input="onSmoothingChange"
            >
            <div class="slider-marks">
              <span class="mark">Быстро</span>
              <span class="mark">Средне</span>
              <span class="mark">Плавно</span>
            </div>
          </div>
        </div>

        <!-- Device Selection -->
        <div class="control-group">
          <label class="control-label">
            Устройство ввода
          </label>
          <div class="device-selector">
            <select 
              v-model="selectedDeviceId" 
              @change="onDeviceChange"
              class="device-select"
              :disabled="loadingDevices"
            >
              <option value="">По умолчанию</option>
              <option 
                v-for="device in audioDevices" 
                :key="device.deviceId" 
                :value="device.deviceId"
              >
                {{ device.label || `Микрофон ${device.deviceId.slice(0, 8)}...` }}
              </option>
            </select>
            <button 
              @click="refreshDevices" 
              class="refresh-btn"
              :disabled="loadingDevices"
              title="Обновить список устройств"
            >
              {{ loadingDevices ? '⏳' : '🔄' }}
            </button>
          </div>
          <div v-if="loadingDevices" class="loading-text">
            Загрузка устройств...
          </div>
          <div v-else-if="audioDevices.length === 0" class="no-devices-text">
            Устройства не найдены. Подключите микрофон.
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-section">
          <div class="stat-row">
            <span>Срабатываний:</span>
            <span class="stat-value">{{ activationCount }}</span>
          </div>
          <div class="stat-row">
            <span>Максимум:</span>
            <span class="stat-value">{{ maxVolume.toFixed(3) }}</span>
          </div>
        </div>
      </div>
      
      <div class="panel-footer">
        <button @click="applyAndClose" class="apply-btn">
          ✓ Применить
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useVoiceActivity } from '~/composables/useVoiceActivity'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'applied', 'mouseenter', 'mouseleave'])

// Reactive data
const threshold = ref(0.01)
const smoothing = ref(0.3)
const currentVolume = ref(0)
const isActive = ref(false)
const activationCount = ref(0)
const maxVolume = ref(0)
const selectedDeviceId = ref('')
const audioDevices = ref([])
const loadingDevices = ref(false)

// Audio context for real-time monitoring
let audioContext = null
let analyser = null
let mediaStream = null
let animationFrame = null
let lastActiveState = false

const { updateVolumeThreshold, updateSmoothing, updateSelectedDevice, getAudioDevices, getCurrentSettings } = useVoiceActivity()

// Computed labels
const getThresholdLabel = (value) => {
  if (value <= 0.005) return 'Очень высокая'
  if (value <= 0.010) return 'Высокая'
  if (value <= 0.020) return 'Средняя'
  if (value <= 0.035) return 'Низкая'
  return 'Очень низкая'
}

const getSmoothingLabel = (value) => {
  if (value <= 0.25) return 'Быстрая реакция'
  if (value <= 0.45) return 'Средняя'
  if (value <= 0.65) return 'Плавная'
  return 'Очень плавная'
}

// Load saved settings from localStorage
const loadSettings = () => {
  if (!process.client) return
  
  try {
    const savedThreshold = localStorage.getItem('voiceThreshold')
    const savedSmoothing = localStorage.getItem('voiceSmoothing')
    
    if (savedThreshold) {
      threshold.value = parseFloat(savedThreshold)
    }
    if (savedSmoothing) {
      smoothing.value = parseFloat(savedSmoothing)
    }
  } catch (error) {
    console.warn('Ошибка загрузки настроек микрофона:', error)
  }
}

// Load audio devices
const loadAudioDevices = async () => {
  loadingDevices.value = true
  try {
    const devices = await getAudioDevices()
    audioDevices.value = devices
    console.log('🎤 Loaded audio devices:', devices.length)
  } catch (error) {
    console.error('Error loading audio devices:', error)
    audioDevices.value = []
  } finally {
    loadingDevices.value = false
  }
}

// Refresh devices list
const refreshDevices = async () => {
  await loadAudioDevices()
}

// Save settings to localStorage
const saveSettings = () => {
  if (!process.client) return
  
  try {
    localStorage.setItem('voiceThreshold', threshold.value.toString())
    localStorage.setItem('voiceSmoothing', smoothing.value.toString())
  } catch (error) {
    console.warn('Ошибка сохранения настроек микрофона:', error)
  }
}

// Initialize microphone for monitoring
const initMicrophone = async () => {
  if (!props.isVisible) return
  
  try {
    if (!navigator.mediaDevices?.getUserMedia) return
    
    // Настройки аудио с возможным указанием устройства
    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
    
    // Если выбрано конкретное устройство, добавляем его ID
    if (selectedDeviceId.value) {
      audioConstraints.deviceId = { exact: selectedDeviceId.value }
      console.log('🎤 Debug microphone using device:', selectedDeviceId.value)
    } else {
      console.log('🎤 Debug microphone using default device')
    }
    
    mediaStream = await navigator.mediaDevices.getUserMedia({ 
      audio: audioConstraints
    })

    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    const source = audioContext.createMediaStreamSource(mediaStream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = smoothing.value
    source.connect(analyser)

    startAnalysis()
  } catch (error) {
    console.error('Ошибка инициализации микрофона для настроек:', error)
  }
}

// Start volume analysis
const startAnalysis = () => {
  if (!analyser) return

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  
  const analyze = () => {
    if (!analyser) return

    analyser.getByteFrequencyData(dataArray)
    
    // Calculate volume
    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i]
    }
    const volume = sum / bufferLength / 255
    
    currentVolume.value = volume
    
    // Update max volume
    if (volume > maxVolume.value) {
      maxVolume.value = volume
    }
    
    // Check activity
    const currentlyActive = volume > threshold.value
    
    if (currentlyActive !== lastActiveState) {
      if (currentlyActive) {
        activationCount.value++
      }
      lastActiveState = currentlyActive
    }
    
    isActive.value = currentlyActive
    
    animationFrame = requestAnimationFrame(analyze)
  }
  
  analyze()
}

// Stop microphone monitoring
const stopMicrophone = () => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
  
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
  
  analyser = null
}

// Event handlers
const onThresholdChange = () => {
  saveSettings()
}

const onSmoothingChange = () => {
  if (analyser) {
    analyser.smoothingTimeConstant = smoothing.value
  }
  saveSettings()
}

const onDeviceChange = async () => {
  console.log('🎤 Device changed to:', selectedDeviceId.value)
  updateSelectedDevice(selectedDeviceId.value)
  
  // Если микрофон активен, перезапускаем его с новым устройством
  if (props.isVisible && analyser) {
    console.log('🔄 Restarting microphone with new device...')
    stopMicrophone()
    await new Promise(resolve => setTimeout(resolve, 100))
    initMicrophone()
  }
}

const resetToDefaults = () => {
  threshold.value = 0.01
  smoothing.value = 0.3
  saveSettings()
  
  if (analyser) {
    analyser.smoothingTimeConstant = smoothing.value
  }
}

const applyAndClose = () => {
  // Apply settings to main voice activity
  updateVolumeThreshold(threshold.value)
  updateSmoothing(smoothing.value)
  
  saveSettings()
  emit('applied')
  emit('close')
}

// Watch for visibility changes
watch(() => props.isVisible, (visible) => {
  if (visible) {
    loadSettings()
    // Load current settings from useVoiceActivity
    const currentSettings = getCurrentSettings()
    threshold.value = currentSettings.threshold
    smoothing.value = currentSettings.smoothing
    selectedDeviceId.value = currentSettings.selectedDeviceId || ''
    
    // Reset stats
    activationCount.value = 0
    maxVolume.value = 0
    lastActiveState = false
    
    // Load devices and init microphone
    loadAudioDevices().then(() => {
      initMicrophone()
    })
  } else {
    stopMicrophone()
  }
})

onMounted(() => {
  loadSettings()
})

onUnmounted(() => {
  stopMicrophone()
})
</script>

<style lang="less" scoped>
.microphone-settings {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  margin-bottom: 8px;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.2s ease;
  pointer-events: none;
  z-index: 1000;
  
  &.visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: all;
  }
}

.settings-panel {
  background: rgba(20, 20, 20, 0.98);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 0;
  min-width: 280px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h4 {
    margin: 0;
    font-size: 14px;
    color: white;
    font-weight: 600;
  }
  
  .reset-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.settings-content {
  padding: 16px;
}

.volume-section {
  margin-bottom: 16px;
  
  .volume-meter {
    position: relative;
    height: 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 8px;
    
    .meter-fill {
      height: 100%;
      transition: width 0.1s ease, background-color 0.2s ease;
      border-radius: 6px;
    }
    
    .threshold-line {
      position: absolute;
      top: 0;
      width: 2px;
      height: 100%;
      background: #ff6b6b;
      box-shadow: 0 0 4px #ff6b6b;
    }
  }
  
  .volume-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    
    .activity-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #555;
      transition: all 0.2s ease;
      
      &.active {
        background: #00ff88;
        box-shadow: 0 0 8px rgba(0, 255, 136, 0.6);
      }
    }
  }
}

.control-group {
  margin-bottom: 16px;
  
  .control-label {
    display: block;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 8px;
    font-weight: 500;
  }
  
  .slider-container {
    position: relative;
    
    .slider {
      width: 100%;
      height: 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      outline: none;
      -webkit-appearance: none;
      cursor: pointer;
      
      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        background: #00ff88;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      
      &::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: #00ff88;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      
      &.threshold-slider::-webkit-slider-thumb {
        background: #667eea;
      }
      
      &.threshold-slider::-moz-range-thumb {
        background: #667eea;
      }
    }
    
    .slider-marks {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      
      .mark {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
      }
    }
  }
}

.stats-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    margin-bottom: 4px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    span:first-child {
      color: rgba(255, 255, 255, 0.7);
    }
    
    .stat-value {
      color: #00ff88;
      font-weight: 600;
    }
  }
}
  
  .device-selector {
    display: flex;
    gap: 8px;
    align-items: center;
    
    .device-select {
      flex: 1;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid #ffffff14;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      cursor: pointer;

      // border-radius: 6px;
      // padding: 6px 8px;
      // background: #ffffff03;
      // border-color: #ffffff14;
      // color: #575757;
      // max-width: 300px;
      // cursor: pointer;
      
      &:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      option {
        background: rgba(20, 20, 20, 0.98);
        color: white;
        padding: 8px;
      }
    }
    
    .refresh-btn {
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: white;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
      
      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
        border-color: #667eea;
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

.panel-footer {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  
  .apply-btn {
    width: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    padding: 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.2s ease;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  }
  
  .loading-text, .no-devices-text {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 4px;
    font-style: italic;
  }
  
  .no-devices-text {
    color: rgba(255, 193, 7, 0.8);
  }
}
</style>