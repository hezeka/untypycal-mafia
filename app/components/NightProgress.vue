<template>
  <div class="night-progress">
    <div class="progress-bar">
      <div class="progress-segments">
        <div 
          v-for="role in progressData?.allRoles || []" 
          :key="role.id"
          class="progress-segment"
          :class="{
            completed: role.completed,
            active: role.active,
            pending: !role.completed && !role.active
          }"
        >
          <div class="segment-bar"></div>
          <div class="segment-label">{{ role.name }}</div>
        </div>
      </div>
      
      <!-- Общий прогресс -->
      <div class="overall-progress">
        <div class="progress-fill" :style="{ width: `${progressData?.progress || 0}%` }"></div>
      </div>
    </div>
    
    <!-- Текущее действие -->
    <div v-if="progressData?.currentRole" class="current-action">
      <span class="current-label">Текущий ход:</span>
      <span class="current-role">{{ progressData.currentRole.name }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useAPI } from '~/composables/useAPI'
import { useGame } from '~/composables/useGame'

const { getNightProgress } = useAPI()
const { gameState } = useGame()

const progressData = ref(null)
let updateInterval = null

const fetchProgress = async () => {
  if (gameState.room.phase !== 'night' || !gameState.room.id) return
  
  try {
    const progress = await getNightProgress(gameState.room.id)
    progressData.value = progress
  } catch (error) {
    // Если ошибка связана с фазой, не логируем её - это нормально при смене фаз
    if (error.message?.includes('только в ночной фазе')) {
      progressData.value = null
      return
    }
    console.error('Failed to fetch night progress:', error)
  }
}

// Обновляем прогресс каждые 2 секунды в ночной фазе
const startProgressUpdates = () => {
  if (updateInterval) clearInterval(updateInterval)
  
  if (gameState.room.phase === 'night') {
    fetchProgress()
    updateInterval = setInterval(fetchProgress, 2000)
  }
}

const stopProgressUpdates = () => {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
}

// Следим за сменой фазы
watch(() => gameState.room.phase, (newPhase) => {
  if (newPhase === 'night') {
    startProgressUpdates()
  } else {
    stopProgressUpdates()
    progressData.value = null
  }
})

onMounted(() => {
  startProgressUpdates()
})

onUnmounted(() => {
  stopProgressUpdates()
})
</script>

<style scoped>
.night-progress {
  background: rgba(31, 41, 55, 0.9);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #374151;
}

.progress-bar {
  position: relative;
  margin-bottom: 0.75rem;
}

.progress-segments {
  display: flex;
  gap: 2px;
  margin-bottom: 0.5rem;
}

.progress-segment {
  flex: 1;
  text-align: center;
}

.segment-bar {
  height: 6px;
  border-radius: 3px;
  background: #374151;
  margin-bottom: 0.25rem;
  transition: background-color 0.3s;
}

.progress-segment.completed .segment-bar {
  background: #059669;
}

.progress-segment.active .segment-bar {
  background: #f59e0b;
  animation: pulse 1.5s infinite;
}

.progress-segment.pending .segment-bar {
  background: #6b7280;
}

.segment-label {
  font-size: 0.75rem;
  color: #d1d5db;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-segment.active .segment-label {
  color: #fbbf24;
  font-weight: 600;
}

.progress-segment.completed .segment-label {
  color: #10b981;
}

.overall-progress {
  height: 2px;
  background: #374151;
  border-radius: 1px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #059669, #10b981);
  transition: width 0.5s ease-in-out;
  border-radius: 1px;
}

.current-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.current-label {
  color: #9ca3af;
}

.current-role {
  color: #fbbf24;
  font-weight: 600;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Адаптивность для мобильных устройств */
@media (max-width: 640px) {
  .segment-label {
    font-size: 0.625rem;
  }
  
  .current-action {
    font-size: 0.8rem;
  }
  
  .night-progress {
    padding: 0.75rem;
  }
}
</style>