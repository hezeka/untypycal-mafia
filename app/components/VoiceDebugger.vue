<template>
  <div class="voice-debugger" v-if="showDebugger">
    <div class="debugger-header">
      <h3>🎤 Отладка микрофона</h3>
      <button @click="toggleDebugger" class="close-btn">✖</button>
    </div>
    
    <div class="controls-section">
      <div class="control-group">
        <label>Порог активности: {{ threshold.toFixed(3) }}</label>
        <input 
          type="range" 
          v-model.number="threshold" 
          min="0.001" 
          max="0.1" 
          step="0.001"
          class="slider"
        >
      </div>
      
      <div class="control-group">
        <label>Сглаживание: {{ smoothing.toFixed(2) }}</label>
        <input 
          type="range" 
          v-model.number="smoothing" 
          min="0" 
          max="0.9" 
          step="0.05"
          class="slider"
        >
      </div>
      
      <div class="control-group">
        <button @click="resetToDefaults" class="reset-btn">Сбросить</button>
        <button @click="applySettings" class="apply-btn">Применить</button>
      </div>
    </div>

    <div class="visualization-section">
      <div class="volume-meter">
        <div class="meter-label">Громкость: {{ currentVolume.toFixed(3) }}</div>
        <div class="meter-bar">
          <div 
            class="meter-fill" 
            :style="{ 
              width: `${Math.min(currentVolume * 1000, 100)}%`,
              backgroundColor: currentVolume > threshold ? '#00ff88' : '#666'
            }"
          ></div>
          <div 
            class="threshold-line" 
            :style="{ left: `${Math.min(threshold * 1000, 100)}%` }"
          ></div>
        </div>
      </div>
      
      <div class="activity-indicator">
        <div 
          class="activity-light" 
          :class="{ active: isActive }"
        >
          {{ isActive ? '🟢 АКТИВЕН' : '🔴 НЕАКТИВЕН' }}
        </div>
      </div>
      
      <div class="frequency-chart">
        <canvas 
          ref="frequencyCanvas" 
          width="300" 
          height="100"
          class="frequency-display"
        ></canvas>
        <div class="chart-label">Спектр частот</div>
      </div>
      
      <div class="volume-history">
        <canvas 
          ref="volumeCanvas" 
          width="300" 
          height="60"
          class="volume-display"
        ></canvas>
        <div class="chart-label">История громкости</div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Время активности:</span>
          <span class="stat-value">{{ Math.round(activeTime / 1000) }}с</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Срабатываний:</span>
          <span class="stat-value">{{ activationCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Макс. громкость:</span>
          <span class="stat-value">{{ maxVolume.toFixed(3) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Средняя громкость:</span>
          <span class="stat-value">{{ avgVolume.toFixed(3) }}</span>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Кнопка открытия отладчика -->
  <div v-if="!showDebugger" class="debug-toggle">
    <button @click="toggleDebugger" class="debug-toggle-btn">🎤 Отладка</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useVoiceActivity } from '~/composables/useVoiceActivity'

const showDebugger = ref(false)
const threshold = ref(0.01)
const smoothing = ref(0.3)
const currentVolume = ref(0)
const isActive = ref(false)
const activationCount = ref(0)
const activeTime = ref(0)
const maxVolume = ref(0)
const avgVolume = ref(0)

// Canvas refs
const frequencyCanvas = ref(null)
const volumeCanvas = ref(null)

// Audio context and analyser for debugging
let debugAudioContext = null
let debugAnalyser = null
let debugMediaStream = null
let animationFrame = null

// Data storage
const volumeHistory = ref([])
const frequencyData = ref(new Uint8Array(128))

// Stats tracking
let lastActiveState = false
let activeStartTime = 0
let volumeSum = 0
let volumeCount = 0

const { initVoiceDetection, stopVoiceDetection, toggleMicrophone, updateVolumeThreshold, updateSmoothing, getCurrentSettings } = useVoiceActivity()

const toggleDebugger = () => {
  showDebugger.value = !showDebugger.value
  
  if (showDebugger.value) {
    nextTick(() => {
      initDebugMicrophone()
    })
  } else {
    stopDebugMicrophone()
  }
}

const resetToDefaults = () => {
  threshold.value = 0.01
  smoothing.value = 0.3
}

const applySettings = () => {
  // Применяем настройки к основному микрофону
  updateVolumeThreshold(threshold.value)
  updateSmoothing(smoothing.value)
  
  // Также обновляем настройки отладочного анализатора
  if (debugAnalyser) {
    debugAnalyser.smoothingTimeConstant = smoothing.value
  }
  
  console.log('✅ Настройки применены к основному микрофону')
}

const initDebugMicrophone = async () => {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('Микрофон не поддерживается')
      return
    }

    debugMediaStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    })

    debugAudioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    if (debugAudioContext.state === 'suspended') {
      await debugAudioContext.resume()
    }

    const source = debugAudioContext.createMediaStreamSource(debugMediaStream)
    debugAnalyser = debugAudioContext.createAnalyser()
    debugAnalyser.fftSize = 256
    debugAnalyser.smoothingTimeConstant = smoothing.value
    source.connect(debugAnalyser)

    startAnalysis()
  } catch (error) {
    console.error('Ошибка инициализации отладки микрофона:', error)
  }
}

const startAnalysis = () => {
  if (!debugAnalyser) return

  const bufferLength = debugAnalyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  
  const analyze = () => {
    if (!debugAnalyser) return

    debugAnalyser.getByteFrequencyData(dataArray)
    
    // Обновляем данные спектра
    frequencyData.value = new Uint8Array(dataArray)
    
    // Вычисляем громкость
    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i]
    }
    const volume = sum / bufferLength / 255
    
    currentVolume.value = volume
    
    // Обновляем статистику
    volumeSum += volume
    volumeCount++
    avgVolume.value = volumeSum / volumeCount
    
    if (volume > maxVolume.value) {
      maxVolume.value = volume
    }
    
    // История громкости
    volumeHistory.value.push(volume)
    if (volumeHistory.value.length > 150) {
      volumeHistory.value.shift()
    }
    
    // Определяем активность
    const currentlyActive = volume > threshold.value
    
    if (currentlyActive !== lastActiveState) {
      if (currentlyActive) {
        activationCount.value++
        activeStartTime = Date.now()
      } else if (lastActiveState) {
        activeTime.value += Date.now() - activeStartTime
      }
      lastActiveState = currentlyActive
    }
    
    isActive.value = currentlyActive
    
    // Отрисовка
    drawFrequencyChart()
    drawVolumeHistory()
    
    animationFrame = requestAnimationFrame(analyze)
  }
  
  analyze()
}

const drawFrequencyChart = () => {
  const canvas = frequencyCanvas.value
  if (!canvas || !frequencyData.value) return
  
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)
  
  const barWidth = width / frequencyData.value.length
  
  for (let i = 0; i < frequencyData.value.length; i++) {
    const barHeight = (frequencyData.value[i] / 255) * height
    
    ctx.fillStyle = `hsl(${i * 2}, 70%, 50%)`
    ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight)
  }
}

const drawVolumeHistory = () => {
  const canvas = volumeCanvas.value
  if (!canvas || volumeHistory.value.length === 0) return
  
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)
  
  // Линия порога
  const thresholdY = height - (threshold.value * height * 10)
  ctx.strokeStyle = '#ff6b6b'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(0, thresholdY)
  ctx.lineTo(width, thresholdY)
  ctx.stroke()
  ctx.setLineDash([])
  
  // График громкости
  ctx.strokeStyle = '#00ff88'
  ctx.lineWidth = 2
  ctx.beginPath()
  
  const stepX = width / Math.max(volumeHistory.value.length - 1, 1)
  
  volumeHistory.value.forEach((volume, index) => {
    const x = index * stepX
    const y = height - (volume * height * 10) // Масштабируем для видимости
    
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  
  ctx.stroke()
}

const stopDebugMicrophone = () => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  
  if (debugAudioContext) {
    debugAudioContext.close()
    debugAudioContext = null
  }
  
  if (debugMediaStream) {
    debugMediaStream.getTracks().forEach(track => track.stop())
    debugMediaStream = null
  }
  
  debugAnalyser = null
}

// Отслеживаем изменения настроек
watch([threshold, smoothing], () => {
  if (debugAnalyser) {
    debugAnalyser.smoothingTimeConstant = smoothing.value
  }
})

onMounted(() => {
  // Инициализируем значения из текущих настроек
  const currentSettings = getCurrentSettings()
  threshold.value = currentSettings.threshold
  smoothing.value = currentSettings.smoothing
})

onUnmounted(() => {
  stopDebugMicrophone()
})
</script>

<style lang="less" scoped>
.voice-debugger {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 350px;
  background: rgba(0, 0, 0, 0.95);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  color: white;
  font-family: monospace;
  z-index: 1000;
  max-height: 80vh;
  overflow-y: auto;
}

.debugger-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  
  h3 {
    margin: 0;
    font-size: 16px;
  }
  
  .close-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.controls-section {
  margin-bottom: 15px;
  
  .control-group {
    margin-bottom: 10px;
    
    label {
      display: block;
      margin-bottom: 5px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .slider {
      width: 100%;
      height: 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      outline: none;
      -webkit-appearance: none;
      
      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        background: #00ff88;
        border-radius: 50%;
        cursor: pointer;
      }
      
      &::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: #00ff88;
        border-radius: 50%;
        cursor: pointer;
        border: none;
      }
    }
    
    .reset-btn, .apply-btn {
      padding: 8px 12px;
      margin-right: 8px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      cursor: pointer;
      font-size: 11px;
      
      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    }
    
    .apply-btn {
      background: rgba(0, 255, 136, 0.2);
      border-color: #00ff88;
      
      &:hover {
        background: rgba(0, 255, 136, 0.3);
      }
    }
  }
}

.visualization-section {
  margin-bottom: 15px;
  
  .volume-meter {
    margin-bottom: 15px;
    
    .meter-label {
      font-size: 12px;
      margin-bottom: 5px;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .meter-bar {
      position: relative;
      height: 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      overflow: hidden;
      
      .meter-fill {
        height: 100%;
        transition: width 0.1s ease;
        border-radius: 10px;
      }
      
      .threshold-line {
        position: absolute;
        top: 0;
        width: 2px;
        height: 100%;
        background: #ff6b6b;
        box-shadow: 0 0 5px #ff6b6b;
      }
    }
  }
  
  .activity-indicator {
    text-align: center;
    margin-bottom: 15px;
    
    .activity-light {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s ease;
      
      &.active {
        background: rgba(0, 255, 136, 0.2);
        border-color: #00ff88;
        box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
      }
    }
  }
  
  .frequency-chart, .volume-history {
    margin-bottom: 10px;
    text-align: center;
    
    .frequency-display, .volume-display {
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      background: #111;
    }
    
    .chart-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 5px;
    }
  }
}

.stats-section {
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    
    .stat-item {
      background: rgba(255, 255, 255, 0.05);
      padding: 8px;
      border-radius: 4px;
      font-size: 11px;
      
      .stat-label {
        display: block;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 2px;
      }
      
      .stat-value {
        color: #00ff88;
        font-weight: bold;
      }
    }
  }
}

.debug-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999;
  
  .debug-toggle-btn {
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(0, 0, 0, 0.9);
      border-color: #00ff88;
      transform: translateY(-2px);
    }
  }
}
</style>