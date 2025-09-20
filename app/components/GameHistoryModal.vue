<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content game-history-modal">
      <button @click="$emit('close')" class="modal-close">×</button>
      
      <div class="modal-header">
        <h2 class="modal-title">История игры</h2>
        
        <div class="history-filters">
          <button 
            v-for="filter in filters"
            :key="filter.id"
            @click="selectedFilter = filter.id"
            class="filter-btn"
            :class="{ active: selectedFilter === filter.id }"
          >
            {{ filter.name }}
          </button>
        </div>
      </div>
      
      <div class="modal-body">
        <div v-if="loading" class="loading">
          Загрузка истории...
        </div>
        
        <div v-else-if="error" class="error">
          {{ error }}
        </div>
        
        <div v-else class="history-content">
          <!-- Статистика игроков -->
          <div v-if="historyData?.playerStats" class="player-statistics">
            <h3>Статистика игроков</h3>
            <div class="stats-grid">
              <div 
                v-for="stat in historyData.playerStats" 
                :key="stat.name"
                class="player-stat-card"
              >
                <div class="player-info">
                  <div class="player-name">{{ stat.name }}</div>
                  <div class="player-role" :class="`role-${stat.role}`">
                    {{ getRoleName(stat.role) }}
                  </div>
                </div>
                <div class="player-stats">
                  <div class="stat-item">
                    <span class="stat-label">Сообщений:</span>
                    <span class="stat-value">{{ stat.messagesCount }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Личных:</span>
                    <span class="stat-value">{{ stat.whispersCount }}</span>
                  </div>
                  <div v-if="stat.nightActions.length > 0" class="stat-item">
                    <span class="stat-label">Ночных действий:</span>
                    <span class="stat-value">{{ stat.nightActions.length }}</span>
                  </div>
                  <div v-if="stat.eliminationCause" class="stat-item elimination">
                    <span class="stat-label">Исключён:</span>
                    <span class="stat-value">{{ getEliminationText(stat.eliminationCause) }} (День {{ stat.eliminationDay }})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Сводка игры -->
          <div v-if="historyData?.summary" class="game-summary">
            <h3>Сводка игры</h3>
            <div class="summary-stats">
              <div class="summary-item">
                <span class="summary-label">Продолжительность:</span>
                <span class="summary-value">{{ formatDuration(historyData.summary.duration) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Ночей:</span>
                <span class="summary-value">{{ historyData.summary.nights }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Дней:</span>
                <span class="summary-value">{{ historyData.summary.days }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Голосований:</span>
                <span class="summary-value">{{ historyData.summary.votings }}</span>
              </div>
            </div>
          </div>
          
          <!-- Форматированная история -->
          <div class="formatted-history">
            <h3>{{ selectedFilter === 'critical' ? 'Ключевые события' : selectedFilter === 'normal' ? 'Основная история' : 'Полная история' }}</h3>
            <div class="history-text">
              <pre>{{ historyData?.formattedHistory || 'История недоступна' }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAPI } from '~/composables/useAPI'
import { useRoute } from 'vue-router'
import { getAllRoles } from '../../../shared/rolesRegistry.js'

const emit = defineEmits(['close'])

const route = useRoute()
const api = useAPI()
const roles = getAllRoles()

const loading = ref(false)
const error = ref(null)
const historyData = ref(null)
const selectedFilter = ref('normal')

const filters = [
  { id: 'critical', name: 'Ключевые события' },
  { id: 'normal', name: 'Основная история' },
  { id: 'minor', name: 'Полная история' }
]

const loadHistory = async () => {
  loading.value = true
  error.value = null
  
  try {
    const data = await api.getGameHistory(route.params.id, selectedFilter.value)
    historyData.value = data
  } catch (err) {
    error.value = 'Не удалось загрузить историю игры'
    console.error('Failed to load game history:', err)
  } finally {
    loading.value = false
  }
}

const getRoleName = (roleId) => {
  return roles[roleId]?.name || roleId || 'Неизвестная роль'
}

const getEliminationText = (cause) => {
  const causes = {
    'voting': 'голосованием',
    'night': 'ночью',
    'hunter': 'охотником'
  }
  return causes[cause] || cause
}

const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 1000 / 60)
  if (minutes < 60) {
    return `${minutes} мин`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}ч ${remainingMinutes}мин`
}

// Загружаем историю при изменении фильтра
watch(selectedFilter, loadHistory)

// Загружаем историю при открытии модального окна
onMounted(loadHistory)
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content.game-history-modal {
  background: #1a1a1a;
  border-radius: 12px;
  width: 95vw;
  max-width: 1200px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
  color: white;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: #ccc;
  font-size: 24px;
  cursor: pointer;
  z-index: 10;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.modal-close:hover {
  color: #fff;
  background: #333;
}

.modal-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.history-filters {
  display: flex;
  gap: 8px;
}

.filter-btn {
  background: #333;
  color: #ccc;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #444;
  color: #fff;
}

.filter-btn.active {
  background: #4f46e5;
  color: #fff;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  font-size: 1.1rem;
}

.error {
  color: #ef4444;
}

.history-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.player-statistics h3,
.game-summary h3,
.formatted-history h3 {
  margin: 0 0 16px 0;
  color: #fbbf24;
  font-size: 1.25rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.player-stat-card {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #444;
}

.player-info {
  margin-bottom: 12px;
}

.player-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: #fff;
}

.player-role {
  font-size: 0.9rem;
  margin-top: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.role-villager, .role-seer, .role-bodyguard, .role-hunter { 
  background: #4CAF50; 
  color: white; 
}

.role-werewolf, .role-werewolf_2, .role-mystic_wolf { 
  background: #f44336; 
  color: white; 
}

.role-cthulhu, .role-doppelganger { 
  background: #9C27B0; 
  color: white; 
}

.role-tanner { 
  background: #FF9800; 
  color: white; 
}

.player-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.stat-label {
  color: #d1d5db;
}

.stat-value {
  color: #4ade80;
  font-weight: 500;
}

.stat-item.elimination .stat-value {
  color: #ef4444;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #2a2a2a;
  border-radius: 6px;
  border: 1px solid #444;
}

.summary-label {
  color: #d1d5db;
}

.summary-value {
  color: #4ade80;
  font-weight: 600;
}

.history-text {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #444;
  max-height: 400px;
  overflow-y: auto;
}

.history-text pre {
  margin: 0;
  color: #d1d5db;
  line-height: 1.6;
  white-space: pre-wrap;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .modal-content.game-history-modal {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
  
  .modal-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>