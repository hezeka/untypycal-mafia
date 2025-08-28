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
                    @error="$event.target.src = `/roles/${getPlayerRole(playerId)}.png`"
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
        
        <!-- Статистика игры -->
        <div class="game-stats-section">
          <h4>Статистика игры</h4>
          
          <div class="stats-grid">
            <!-- Общая статистика -->
            <div class="stat-group">
              <h5>Общее</h5>
              <div class="stat-item">
                <span class="stat-label">Продолжительность:</span>
                <span class="stat-value">{{ getGameDuration() }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Дней пережито:</span>
                <span class="stat-value">{{ gameState.room.daysSurvived || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Всего игроков:</span>
                <span class="stat-value">{{ getActivePlayers().length }}</span>
              </div>
            </div>
            
            <!-- Статистика чата -->
            <div class="stat-group">
              <h5>Активность в чате</h5>
              <div class="chat-stats">
                <div 
                  v-for="player in getTopChatters()" 
                  :key="player.id"
                  class="chat-stat-item"
                >
                  <span class="player-name">{{ player.name }}:</span>
                  <span class="message-count">{{ player.messageCount }} сообщений</span>
                  <span class="whisper-count">({{ player.whisperCount }} личных)</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Роли всех игроков -->
          <div class="roles-reveal">
            <h5>Роли игроков</h5>
            <div class="roles-grid">
              <div 
                v-for="player in getActivePlayers()"
                :key="player.id"
                class="role-reveal-card"
                :class="{ 
                  'winner': gameState.room.gameResult?.winners?.includes(player.id),
                  'eliminated': !player.alive
                }"
              >
                <div class="role-reveal-avatar">
                  <img 
                    v-if="player.role"
                    :src="`/roles/compressed/${player.role}.webp`" 
                    :alt="getRoleName(player.role)"
                    @error="$event.target.src = `/roles/${player.role}.png`"
                    class="role-reveal-image"
                  >
                  <div v-else class="role-reveal-default">
                    {{ player.name[0]?.toUpperCase() }}
                  </div>
                </div>
                <div class="role-reveal-info">
                  <div class="role-reveal-name">{{ player.name }}</div>
                  <div class="role-reveal-role" :class="`team-${getRoleTeam(player.role)}`">
                    {{ getRoleName(player.role) }}
                  </div>
                  <div class="role-reveal-status">
                    <span v-if="gameState.room.gameResult?.winners?.includes(player.id)" class="status-winner">Победитель</span>
                    <span v-else-if="!player.alive" class="status-eliminated">Исключен</span>
                    <span v-else class="status-alive">Проиграл</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
import { computed } from 'vue'
import { useGame } from '~/composables/useGame'
import { useSocket } from '~/composables/useSocket'
import { useAPI } from '~/composables/useAPI'
import { useRoute, useRouter } from 'vue-router'
import { getAllRoles } from '../../../shared/rolesRegistry.js'

const emit = defineEmits(['new-game', 'leave', 'close'])
const { gameState, currentPlayer } = useGame()
const { socket } = useSocket()
const route = useRoute()
const router = useRouter()
const roles = getAllRoles()

const getTeamName = () => {
  const teams = {
    village: 'Деревня',
    werewolf: 'Оборотни',
    tanner: 'Неудачник',
    special: 'Особые'
  }
  return teams[gameState.room.gameResult?.winnerTeam] || 'Неизвестно'
}

const getWinDescription = () => {
  const team = gameState.room.gameResult?.winnerTeam
  const descriptions = {
    village: 'Все оборотни исключены или их действия заблокированы',
    werewolf: 'Оборотни выжили или деревня не смогла их найти',
    tanner: 'Неудачник был исключен голосованием',
    special: 'Особая победа достигнута'
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
    
    // Перезагружаем страницу чтобы вернуться к настройке ролей
    window.location.reload()
  } catch (error) {
    console.error('Failed to start new game:', error)
  }
}

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
}
</style>