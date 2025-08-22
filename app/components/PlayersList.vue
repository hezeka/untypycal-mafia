<template>
  <div class="players-list">
    
    <div class="players-header">
      <h3 class="players-title">
        Игроки ({{ players.length }})
      </h3>
      
      <div class="phase-info">
        {{ currentPhase }}
      </div>
    </div>
    
    <div class="players-container">
      <div 
        v-for="player in players" 
        :key="player.id"
        class="player-item"
        :class="{
          'current-player': player.id === currentPlayer?.id,
          'host': player.isHost,
          'dead': !player.alive,
          'protected': player.protected,
          'disconnected': !player.connected,
          'speaking': isSpeaking(player.id)
        }"
        @click="handlePlayerClick(player)"
      >
        
        <!-- Аватар игрока -->
        <div class="player-avatar" :style="{ backgroundColor: getPlayerColor(player) }">
          {{ player.name.charAt(0).toUpperCase() }}
        </div>
        
        <!-- Информация об игроке -->
        <div class="player-info">
          <div class="player-name">
            {{ player.name }}
            <span v-if="player.isHost" class="host-badge">Ведущий</span>
          </div>
          
          <div class="player-status">
            <span v-if="!player.alive" class="status-dead">Мертв</span>
            <span v-else-if="player.protected" class="status-protected">Защищен</span>
            <span v-else-if="!player.connected" class="status-disconnected">Отключен</span>
            <span v-else class="status-alive">Жив</span>
          </div>
        </div>
        
        <!-- Роль (только для себя или после смерти) -->
        <div v-if="shouldShowRole(player)" class="player-role">
          {{ getRoleName(player.role) }}
        </div>
        
        <!-- Индикаторы -->
        <div class="player-indicators">
          <!-- Голосовая активность -->
          <div v-if="isSpeaking(player.id)" class="indicator speaking">
            <div class="sound-waves">
              <div class="wave"></div>
              <div class="wave"></div>
              <div class="wave"></div>
            </div>
          </div>
          
          <!-- Голос -->
          <div v-if="hasVoted(player.id)" class="indicator voted">
            ✓
          </div>
          
          <!-- Щит -->
          <div v-if="player.protected" class="indicator shield">
            🛡️
          </div>
        </div>
        
      </div>
    </div>
    
    <!-- Статистика внизу -->
    <div class="players-stats">
      <div class="stat">
        <span class="stat-label">Живых:</span>
        <span class="stat-value">{{ alivePlayers.length }}</span>
      </div>
      
      <div class="stat">
        <span class="stat-label">Мертвых:</span>
        <span class="stat-value">{{ deadPlayers.length }}</span>
      </div>
      
      <div v-if="gameState.voting.active" class="stat">
        <span class="stat-label">Проголосовали:</span>
        <span class="stat-value">{{ votedCount }}/{{ alivePlayers.length }}</span>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '~/composables/useGame'
import { useVoiceActivity } from '~/composables/useVoiceActivity'

const { gameState, currentPlayer, getRole } = useGame()
const { speakingPlayers } = useVoiceActivity()

// Computed
const players = computed(() => gameState.room.players)
const alivePlayers = computed(() => players.value.filter(p => p.alive))
const deadPlayers = computed(() => players.value.filter(p => !p.alive))
const currentPhase = computed(() => {
  const phases = {
    setup: 'Настройка',
    introduction: 'Знакомство', 
    night: 'Ночь',
    day: 'День',
    voting: 'Голосование',
    ended: 'Завершено'
  }
  
  return phases[gameState.room.phase] || 'Неизвестно'
})

const votedCount = computed(() => {
  return Object.keys(gameState.voting.votes).length
})

// Методы
const shouldShowRole = (player) => {
  // Показываем роль если это текущий игрок, или игрок мертв, или игра закончена
  return player.id === currentPlayer.value?.id || 
         !player.alive || 
         gameState.room.phase === 'ended'
}

const getRoleName = (roleId) => {
  if (!roleId) return 'Нет роли'
  
  const role = getRole(roleId)
  return role?.name || 'Неизвестная роль'
}

const getPlayerColor = (player) => {
  // Простая генерация цвета на основе имени
  const colors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', 
    '#ffeaa7', '#dda0dd', '#98d8c8', '#f7dc6f',
    '#bb8fce', '#85c1e9', '#f8c471', '#82e0aa'
  ]
  
  let hash = 0
  for (let i = 0; i < player.name.length; i++) {
    hash = player.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

const isSpeaking = (playerId) => {
  return speakingPlayers.value.includes(playerId)
}

const hasVoted = (playerId) => {
  return gameState.voting.votes.hasOwnProperty(playerId)
}

const handlePlayerClick = (player) => {
  // В фазе голосования - голосуем
  if (gameState.voting.active && gameState.room.phase === 'voting') {
    if (player.alive && player.id !== currentPlayer.value?.id) {
      // TODO: Реализовать голосование
      console.log('Voting for:', player.name)
    }
  }
  
  // В других фазах - показываем информацию
  // TODO: Реализовать модал с информацией об игроке
}
</script>

<style scoped>
.players-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
}

/* Заголовок */
.players-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.players-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #fff;
}

.phase-info {
  font-size: 0.9rem;
  color: #ff6b6b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Контейнер игроков */
.players-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

/* Элемент игрока */
.player-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.player-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.player-item.current-player {
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.4);
}

.player-item.dead {
  opacity: 0.5;
  filter: grayscale(1);
}

.player-item.disconnected {
  opacity: 0.7;
}

.player-item.speaking {
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
  border: 1px solid rgba(255, 107, 107, 0.5);
}

/* Аватар */
.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #fff;
  font-size: 1.1rem;
  flex-shrink: 0;
}

/* Информация */
.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-weight: 500;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.host-badge {
  background: #ffa500;
  color: #000;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.player-status {
  font-size: 0.8rem;
}

.status-alive { color: #4ade80; }
.status-dead { color: #f87171; }
.status-protected { color: #60a5fa; }
.status-disconnected { color: #a3a3a3; }

/* Роль */
.player-role {
  font-size: 0.8rem;
  color: #ccc;
  font-style: italic;
}

/* Индикаторы */
.player-indicators {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.indicator {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 0.8rem;
}

.indicator.voted {
  background: #4ade80;
  color: #000;
  font-weight: 600;
}

.indicator.shield {
  font-size: 1rem;
}

/* Анимация звуковых волн */
.sound-waves {
  display: flex;
  gap: 2px;
  align-items: center;
}

.wave {
  width: 3px;
  height: 12px;
  background: #ff6b6b;
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}

.wave:nth-child(2) { animation-delay: 0.1s; }
.wave:nth-child(3) { animation-delay: 0.2s; }

@keyframes wave {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}

/* Статистика */
.players-stats {
  padding: 12px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-label {
  font-size: 0.8rem;
  color: #aaa;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
}

/* Адаптивность */
@media (max-width: 1024px) {
  .players-list {
    order: -1;
  }
  
  .players-container {
    max-height: 200px;
  }
  
  .player-item {
    padding: 8px;
  }
  
  .player-avatar {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
  }
}
</style>