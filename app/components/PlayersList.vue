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
      <PlayerItem
        v-for="player in displayedPlayers" 
        :key="player.id"
        :player="player"
        @vote="handleVote"
        @admin-action="handleAdminAction"
      />
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
        <span class="stat-value">{{ votedCount }}/{{ aliveVotingPlayers.length }}</span>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '~/composables/useGame'
import PlayerItem from './PlayerItem.vue'

const { gameState, votePlayer, adminAction } = useGame()

// Computed
const players = computed(() => gameState.room.players)
const displayedPlayers = computed(() => {
  // Во время голосования скрываем ведущего из списка
  if (gameState.voting.active && gameState.room.phase === 'voting') {
    return players.value.filter(p => p.role !== 'game_master')
  }
  return players.value
})
const alivePlayers = computed(() => players.value.filter(p => p.alive))
const deadPlayers = computed(() => players.value.filter(p => !p.alive))
const aliveVotingPlayers = computed(() => 
  players.value.filter(p => p.alive && p.role !== 'game_master')
)
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
const handleVote = (playerId) => {
  console.log('Voting for player:', playerId)
  votePlayer(playerId)
}

const handleAdminAction = (action) => {
  console.log('Admin action:', action)
  
  // Используем прямые админ действия
  adminAction(action.action, action.targetId, action.targetName)
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
}
</style>