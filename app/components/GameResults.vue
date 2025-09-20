<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal-content game-results-modal">
      <button @click="closeModal" class="modal-close">×</button>
      
      <div class="modal-header">
        <h2 class="modal-title">Игра завершена!</h2>
      </div>
      
      <div class="modal-body">
        <!-- Объявление победителей -->
        <div class="winner-section">
          <div class="winner-announcement">
            <h3 class="winner-team">{{ getTeamName() }} побеждает!</h3>
            <div class="winner-description">{{ getWinDescription() }}</div>
          </div>
          
          <div class="winners-list">
            <h4>Победители:</h4>
            <div class="winners-grid">
              <div 
                v-for="playerId in gameState.room.gameResult.winners"
                :key="playerId"
                class="winner-card"
              >
                <div class="winner-avatar">
                  <img 
                    v-if="getPlayerRole(playerId)"
                    :src="`/roles/compressed/${getPlayerRole(playerId)}.webp`" 
                    :alt="getRoleName(getPlayerRole(playerId))"
                    @error="handleImageError($event, getPlayerRole(playerId))"
                    class="winner-role-image"
                  >
                  <div v-else class="winner-default-avatar">
                    {{ getPlayerName(playerId)[0]?.toUpperCase() }}
                  </div>
                </div>
                <div class="winner-info">
                  <div class="winner-name">{{ getPlayerName(playerId) }}</div>
                  <div class="winner-role">{{ getRoleName(getPlayerRole(playerId)) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Статистика игры из API -->
        <div class="game-history-section" v-if="historyData">
          <!-- Сводка игры -->
          <div class="game-summary" v-if="historyData.summary">
            <h4>Обзор игры</h4>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-label">Продолжительность</div>
                <div class="summary-value">{{ formatDuration(historyData.summary.duration) }}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Дней</div>
                <div class="summary-value">{{ historyData.summary.days }}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Ночей</div>
                <div class="summary-value">{{ historyData.summary.nights }}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Голосований</div>
                <div class="summary-value">{{ historyData.summary.votings }}</div>
              </div>
            </div>
          </div>

          <!-- Статистика игроков -->
          <div class="player-stats" v-if="historyData.playerStats">
            <h4>Активность игроков</h4>
            <div class="stats-list">
              <div 
                v-for="stat in historyData.playerStats" 
                :key="stat.name"
                class="player-stat"
                :class="{ 
                  'winner': gameState.room.gameResult?.winners?.includes(getPlayerIdByName(stat.name)),
                  'eliminated': stat.eliminationCause
                }"
              >
                <div class="player-info">
                  <div class="player-avatar">
                    <img 
                      v-if="stat.role"
                      :src="`/roles/compressed/${stat.role}.webp`" 
                      :alt="getRoleName(stat.role)"
                      @error="handleImageError($event, stat.role)"
                      class="player-role-image"
                    >
                  </div>
                  <div class="player-details">
                    <div class="player-name">{{ stat.name }}</div>
                    <div class="player-role" :class="`team-${getRoleTeam(stat.role)}`">{{ getRoleName(stat.role) }}</div>
                  </div>
                </div>
                <div class="player-metrics">
                  <div class="metric">
                    <span class="metric-value">{{ stat.messagesCount }}</span>
                    <span class="metric-label">сообщений</span>
                  </div>
                  <div class="metric" v-if="stat.whispersCount > 0">
                    <span class="metric-value">{{ stat.whispersCount }}</span>
                    <span class="metric-label">личных</span>
                  </div>
                  <div class="metric" v-if="stat.nightActions.length > 0">
                    <span class="metric-value">{{ stat.nightActions.length }}</span>
                    <span class="metric-label">ночных действий</span>
                  </div>
                  <div class="elimination-info" v-if="stat.eliminationCause">
                    <span class="elimination-text">{{ getEliminationText(stat.eliminationCause) }} (День {{ stat.eliminationDay }})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Ключевые события -->
          <div class="game-timeline" v-if="historyData.formattedHistory">
            <h4>События игры</h4>
            <div class="timeline-content">
              <pre class="timeline-text">{{ historyData.formattedHistory }}</pre>
            </div>
          </div>
        </div>

        <!-- Загрузка истории -->
        <div class="loading-history" v-else-if="loadingHistory">
          <div class="loading-spinner"></div>
          <div class="loading-text">Загрузка истории игры...</div>
        </div>

        <!-- Ошибка загрузки истории -->
        <div class="history-error" v-else-if="historyError">
          <div class="error-text">Не удалось загрузить историю игры</div>
          <button @click="loadGameHistory" class="retry-btn">Попробовать снова</button>
        </div>
      </div>
      
      <div class="modal-footer">
        <div class="game-actions">
          <button @click="handleNewGame" class="new-game-btn" v-if="canStartNewGame">
            Новая игра
          </button>
          <button @click="handleLeave" class="leave-btn">
            Покинуть игру
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useGame } from '~/composables/useGame'
import { useSocket } from '~/composables/useSocket'
import { useAPI } from '~/composables/useAPI'
import { useRoute, useRouter } from 'vue-router'
import { getAllRoles } from '../../../shared/rolesRegistry.js'
import { handleRoleImageErrorSimple } from '~/utils/imageUtils.js'

const emit = defineEmits(['new-game', 'leave', 'close'])
const { gameState, currentPlayer } = useGame()
const { socket } = useSocket()
const api = useAPI()
const route = useRoute()
const router = useRouter()
const roles = getAllRoles()

// История игры
const historyData = ref(null)
const loadingHistory = ref(false)
const historyError = ref(false)

const getTeamName = () => {
  const teams = {
    village: 'Деревня',
    werewolf: 'Оборотни',
    tanner: 'Неудачник',
    special: 'Особые',
    cthulhu: 'Ктулху'
  }
  return teams[gameState.room.gameResult?.winnerTeam] || 'Неизвестно'
}

const getWinDescription = () => {
  const team = gameState.room.gameResult?.winnerTeam
  const descriptions = {
    village: 'Все оборотни исключены или их действия заблокированы',
    werewolf: 'Оборотни выжили или деревня не смогла их найти',
    tanner: 'Неудачник был исключен голосованием',
    special: 'Особая победа достигнута',
    cthulhu: 'Ктулху выполнил условие победы'
  }
  return descriptions[team] || ''
}

const getPlayerName = (playerId) => {
  const player = gameState.room.players.find(p => p.id === playerId)
  return player?.name || 'Неизвестно'
}

const getPlayerRole = (playerId) => {
  const player = gameState.room.players.find(p => p.id === playerId)
  return player?.role
}

const getRoleName = (roleId) => {
  return roles[roleId]?.name || roleId || 'Неизвестно'
}

const getRoleTeam = (roleId) => {
  return roles[roleId]?.team || 'unknown'
}

const getActivePlayers = () => {
  return gameState.room.players.filter(p => p.role !== 'game_master')
}

const getGameDuration = () => {
  const start = gameState.room.gameStartTime
  const end = gameState.room.gameEndTime || Date.now()
  if (!start) return 'Неизвестно'
  
  const duration = Math.floor((end - start) / 1000 / 60) // в минутах
  if (duration < 1) return 'Менее минуты'
  if (duration < 60) return `${duration} мин`
  
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60
  return `${hours}ч ${minutes}мин`
}

const getTopChatters = () => {
  const stats = gameState.room.chatStats || {}
  return Object.entries(stats)
    .map(([playerId, data]) => ({
      id: playerId,
      name: getPlayerName(playerId),
      messageCount: data.messageCount || 0,
      whisperCount: data.whisperCount || 0
    }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 5)
}

const canStartNewGame = computed(() => {
  return currentPlayer.value?.isHost || currentPlayer.value?.role === 'game_master'
})

const closeModal = () => {
  emit('close')
}

const handleNewGame = async () => {
  if (!canStartNewGame.value) return
  
  try {
    const api = useAPI()
    await api.resetRoom(route.params.id)
    
    // Закрываем модальное окно результатов - сервер отправит событие room-reset
    emit('close')
  } catch (error) {
    console.error('Failed to start new game:', error)
  }
}

// Используем простую версию утилиты для обработки ошибок изображений
const handleImageError = handleRoleImageErrorSimple

const handleLeave = async () => {
  try {
    const api = useAPI()
    const isHost = currentPlayer.value?.isHost
    
    if (isHost) {
      // Если ведущий покидает игру - удаляем комнату
      await api.deleteRoom(route.params.id)
    } else {
      // Обычный игрок просто покидает комнату
      await api.leaveRoom(route.params.id, currentPlayer.value?.id)
    }
    
    // Отключаемся от сокета и переходим на главную
    if (socket.value) {
      socket.value.disconnect()
    }
    
    router.push('/')
  } catch (error) {
    console.error('Failed to leave game:', error)
    // Всё равно переходим на главную в случае ошибки
    router.push('/')
  }
}

// Загрузка истории игры
const loadGameHistory = async () => {
  loadingHistory.value = true
  historyError.value = false
  
  try {
    const data = await api.getGameHistory(route.params.id, 'critical')
    historyData.value = data
  } catch (error) {
    console.error('Failed to load game history:', error)
    historyError.value = true
  } finally {
    loadingHistory.value = false
  }
}

// Форматирование продолжительности
const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 1000 / 60)
  if (minutes < 60) {
    return `${minutes} мин`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}ч ${remainingMinutes}мин`
}

// Получить ID игрока по имени
const getPlayerIdByName = (playerName) => {
  const player = getActivePlayers().find(p => p.name === playerName)
  return player?.id
}

// Текст причины исключения
const getEliminationText = (cause) => {
  const causes = {
    'voting': 'исключён голосованием',
    'night': 'убит ночью',
    'hunter': 'убит охотником'
  }
  return causes[cause] || cause
}

// Загружаем историю при монтировании компонента
onMounted(() => {
  loadGameHistory()
})
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
  padding: 20px;
}

.modal-content.game-results-modal {
  background: #1a1a1a;
  border-radius: 16px;
  width: 95vw;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  color: white;
  position: relative;
  overflow: hidden;
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
  transition: all 0.2s;
}

.modal-close:hover {
  color: #fff;
  background: #333;
}

.modal-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid #333;
}

.modal-title {
  margin: 0;
  font-size: 1.75rem;
  color: #fff;
  text-align: center;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.winner-section {
  text-align: center;
}

.winner-announcement {
  margin-bottom: 24px;
}

.winner-team {
  font-size: 2rem;
  font-weight: bold;
  margin: 0 0 8px 0;
  color: #4ade80;
}

.winner-description {
  font-size: 1.1rem;
  color: #d1d5db;
  opacity: 0.9;
}

.winners-list h4 {
  color: #fbbf24;
  margin: 0 0 16px 0;
  font-size: 1.25rem;
}

.winners-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
}

.winner-card {
  background: #2a2a2a;
  border: 2px solid #4ade80;
  border-radius: 12px;
  padding: 16px;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.winner-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #333;
}

.winner-role-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.winner-default-avatar {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
}

.winner-info {
  text-align: center;
}

.winner-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: #fff;
  margin-bottom: 4px;
}

.winner-role {
  font-size: 0.9rem;
  color: #4ade80;
}

.game-stats-section h4 {
  color: #fbbf24;
  margin: 0 0 20px 0;
  font-size: 1.25rem;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-group {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 20px;
}

.stat-group h5 {
  color: #fff;
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  border-bottom: 1px solid #444;
  padding-bottom: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat-label {
  color: #d1d5db;
  font-size: 0.9rem;
}

.stat-value {
  color: #4ade80;
  font-weight: 600;
  font-size: 0.9rem;
}

.chat-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-stat-item {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.9rem;
}

.player-name {
  color: #fbbf24;
  font-weight: 600;
  min-width: 80px;
}

.message-count {
  color: #4ade80;
}

.whisper-count {
  color: #a78bfa;
  font-size: 0.8rem;
}

.roles-reveal h5 {
  color: #fff;
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  text-align: center;
  border-bottom: 1px solid #444;
  padding-bottom: 8px;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.role-reveal-card {
  background: #2a2a2a;
  border: 2px solid #444;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;
}

.role-reveal-card.winner {
  border-color: #4ade80;
  background: #1a2e1a;
}

.role-reveal-card.eliminated {
  border-color: #ef4444;
  background: #2e1a1a;
  opacity: 0.8;
}

.role-reveal-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #333;
}

.role-reveal-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.role-reveal-default {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

.role-reveal-info {
  text-align: center;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.role-reveal-name {
  font-weight: 600;
  color: #fff;
  font-size: 0.95rem;
}

.role-reveal-role {
  font-size: 0.85rem;
  font-weight: 500;
}

.role-reveal-role.team-village { color: #4ade80; }
.role-reveal-role.team-werewolf { color: #ef4444; }
.role-reveal-role.team-tanner { color: #f59e0b; }
.role-reveal-role.team-special { color: #a78bfa; }
.role-reveal-role.team-cthulhu { color: #8b4513; }

.role-reveal-status {
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 4px;
}

.status-winner {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
}

.status-eliminated {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
}

.status-alive {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #333;
  background: #111;
}

.game-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.new-game-btn,
.leave-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.new-game-btn {
  background: #4ade80;
  color: #000;
}

.new-game-btn:hover {
  background: #22c55e;
  transform: translateY(-2px);
}

.leave-btn {
  background: #6b7280;
  color: white;
}

.leave-btn:hover {
  background: #4b5563;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .modal-content.game-results-modal {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    max-height: none;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .roles-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
  
  .winners-grid {
    flex-direction: column;
    align-items: center;
  }
  
  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .player-stat {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .player-metrics {
    justify-content: center;
  }
}

/* Стили для истории игры */
.game-history-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.game-summary h4,
.player-stats h4,
.game-timeline h4 {
  margin: 0 0 16px 0;
  color: #fbbf24;
  font-size: 1.25rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.summary-card {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  border: 1px solid #444;
}

.summary-label {
  color: #d1d5db;
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.summary-value {
  color: #4ade80;
  font-size: 1.5rem;
  font-weight: 600;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.player-stat {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #444;
  transition: border-color 0.2s;
}

.player-stat.winner {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}

.player-stat.eliminated {
  opacity: 0.7;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #333;
}

.player-role-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-details {
  display: flex;
  flex-direction: column;
}

.player-name {
  font-weight: 600;
  color: #fff;
  font-size: 1.1rem;
}

.player-role {
  font-size: 0.9rem;
  margin-top: 2px;
}

.team-village { color: #4ade80; }
.team-werewolf { color: #ef4444; }
.team-special { color: #a855f7; }
.team-cthulhu { color: #8b4513; }
.team-tanner { color: #f97316; }

.player-metrics {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 60px;
}

.metric-value {
  color: #4ade80;
  font-weight: 600;
  font-size: 1.1rem;
}

.metric-label {
  color: #9ca3af;
  font-size: 0.8rem;
  margin-top: 2px;
}

.elimination-info {
  color: #ef4444;
  font-size: 0.9rem;
  font-style: italic;
}

.timeline-content {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #444;
  max-height: 400px;
  overflow-y: auto;
}

.timeline-text {
  color: #d1d5db;
  line-height: 1.6;
  white-space: pre-wrap;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  margin: 0;
}

.loading-history,
.history-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #444;
  border-top: 3px solid #4ade80;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text,
.error-text {
  color: #9ca3af;
  font-size: 1.1rem;
}

.error-text {
  color: #ef4444;
  margin-bottom: 16px;
}

.retry-btn {
  background: #4ade80;
  color: #000;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #22c55e;
}
</style>