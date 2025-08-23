<template>
  <div class="voting-phase">
    
    <div class="phase-header">
      <h2 class="phase-title">Голосование</h2>
      <p class="phase-description">
        Выберите игрока для исключения. Побеждает относительное большинство.
      </p>
    </div>
    
    <div class="phase-content">
      
      <!-- Статистика голосования -->
      <div class="voting-stats">
        <div class="stat-item">
          <span class="stat-label">Проголосовали:</span>
          <span class="stat-value">{{ votedCount }}/{{ aliveVotingPlayers.length }}</span>
        </div>
        <div v-if="!isGameMaster" class="stat-item">
          <span class="stat-label">Ваш голос:</span>
          <span class="stat-value">{{ currentVoteText }}</span>
        </div>
        <div v-if="isGameMaster" class="stat-item">
          <span class="stat-label">Статус:</span>
          <span class="stat-value">Наблюдатель</span>
        </div>
      </div>
      
      <!-- Список игроков для голосования -->
      <div v-if="!isGameMaster" class="voting-players">
        <h3>Выберите игрока для исключения:</h3>
        
        <div class="players-grid">
          <div 
            v-for="player in alivePlayers" 
            :key="player.id"
            class="voting-player"
            :class="{
              'selected': currentVote === player.id,
              'self': player.id === currentPlayer?.id,
              'has-votes': getPlayerVotes(player.id) > 0
            }"
            @click="voteForPlayer(player.id)"
          >
            
            <div class="player-avatar" :style="{ backgroundColor: getPlayerColor(player) }">
              {{ player.name.charAt(0).toUpperCase() }}
            </div>
            
            <div class="player-info">
              <div class="player-name">
                {{ player.name }}
                <span v-if="player.id === currentPlayer?.id" class="self-label">
                  (это вы)
                </span>
              </div>
              
              <div class="vote-count" v-if="getPlayerVotes(player.id) > 0">
                {{ getPlayerVotes(player.id) }} голосов
              </div>
            </div>
            
            <div v-if="currentVote === player.id" class="selected-indicator">
              ✓
            </div>
            
          </div>
          
          <!-- Воздержание -->
          <div 
            class="voting-player abstain"
            :class="{ 'selected': currentVote === null }"
            @click="voteForPlayer(null)"
          >
            <div class="player-avatar abstain-avatar">
              ?
            </div>
            
            <div class="player-info">
              <div class="player-name">Воздержаться</div>
              <div class="vote-count" v-if="abstainCount > 0">
                {{ abstainCount }} голосов
              </div>
            </div>
            
            <div v-if="currentVote === null" class="selected-indicator">
              ✓
            </div>
          </div>
        </div>
      </div>
      
      <!-- Результаты голосования (для ведущего) -->
      <div v-if="isGameMaster && votedCount > 0" class="voting-results">
        <h3>Текущие результаты:</h3>
        <div class="results-list">
          <div 
            v-for="[playerId, votes] in sortedVotes" 
            :key="playerId || 'abstain'"
            class="result-item"
          >
            <span class="result-player">
              {{ getPlayerName(playerId) }}
            </span>
            <span class="result-votes">{{ votes }} голосов</span>
          </div>
        </div>
      </div>
      
      <!-- Прогресс голосования -->
      <div class="voting-progress">
        <div class="progress-bar">
          <div 
            class="progress-fill"
            :style="{ width: `${votingProgress}%` }"
          ></div>
        </div>
        <div class="progress-text">
          {{ votedCount }} из {{ aliveVotingPlayers.length }} игроков проголосовали
        </div>
      </div>
      
    </div>
    
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '~/composables/useGame'

const emit = defineEmits(['vote'])

const { gameState, currentPlayer, votePlayer } = useGame()

// Computed
const alivePlayers = computed(() => {
  console.log('🗳️ All players:', gameState.room.players.map(p => `${p.name}(${p.role}, alive:${p.alive})`))
  const filtered = gameState.room.players.filter(p => p.alive && p.role !== 'game_master')
  console.log('🗳️ VotingPhase alivePlayers:', filtered.map(p => `${p.name}(${p.role})`))
  return filtered
})

const aliveVotingPlayers = computed(() => 
  gameState.room.players.filter(p => p.alive && p.role !== 'game_master')
)

const isGameMaster = computed(() => currentPlayer.value?.role === 'game_master')

const currentVote = computed(() => {
  const playerId = currentPlayer.value?.id
  return gameState.voting.votes[playerId] ?? undefined
})

const currentVoteText = computed(() => {
  if (currentVote.value === undefined) return 'Не выбран'
  if (currentVote.value === null) return 'Воздержание'
  
  const player = alivePlayers.value.find(p => p.id === currentVote.value)
  return player ? player.name : 'Неизвестно'
})

const votedCount = computed(() => {
  // Считаем только голоса игроков, которые могут голосовать
  const validVoters = Object.keys(gameState.voting.votes).filter(voterId => {
    const voter = gameState.room.players.find(p => p.id === voterId)
    return voter && voter.alive && voter.role !== 'game_master'
  })
  return validVoters.length
})

const votingProgress = computed(() => {
  return aliveVotingPlayers.value.length > 0 
    ? Math.round((votedCount.value / aliveVotingPlayers.value.length) * 100)
    : 0
})

const abstainCount = computed(() => {
  // Считаем только воздержания от игроков, которые могут голосовать
  const validAbstains = Object.entries(gameState.voting.votes).filter(([voterId, targetId]) => {
    const voter = gameState.room.players.find(p => p.id === voterId)
    return voter && voter.alive && voter.role !== 'game_master' && targetId === null
  })
  return validAbstains.length
})

const sortedVotes = computed(() => {
  const voteCounts = new Map()
  
  // Подсчитываем только голоса от игроков, которые могут голосовать
  Object.entries(gameState.voting.votes).forEach(([voterId, targetId]) => {
    const voter = gameState.room.players.find(p => p.id === voterId)
    if (voter && voter.alive && voter.role !== 'game_master') {
      const count = voteCounts.get(targetId) || 0
      voteCounts.set(targetId, count + 1)
    }
  })
  
  // Сортируем по количеству голосов (убывание)
  return Array.from(voteCounts.entries())
    .sort(([,a], [,b]) => b - a)
})

// Methods
const voteForPlayer = (playerId) => {
  // Ведущий не может голосовать
  if (isGameMaster.value) return
  
  // Нельзя голосовать за себя (кроме воздержания)
  if (playerId === currentPlayer.value?.id) return
  
  // Нельзя голосовать за ведущего
  if (playerId) {
    const targetPlayer = gameState.room.players.find(p => p.id === playerId)
    if (targetPlayer?.role === 'game_master') return
  }
  
  votePlayer(playerId)
  emit('vote', playerId)
}

const getPlayerVotes = (playerId) => {
  // Считаем только голоса от игроков, которые могут голосовать
  const validVotes = Object.entries(gameState.voting.votes).filter(([voterId, targetId]) => {
    const voter = gameState.room.players.find(p => p.id === voterId)
    return voter && voter.alive && voter.role !== 'game_master' && targetId === playerId
  })
  return validVotes.length
}

const getPlayerName = (playerId) => {
  if (playerId === null) return 'Воздержание'
  
  const player = alivePlayers.value.find(p => p.id === playerId)
  return player ? player.name : 'Неизвестный игрок'
}

const getPlayerColor = (player) => {
  // Простая генерация цвета на основе имени
  const colors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', 
    '#ffeaa7', '#dda0dd', '#98d8c8', '#f7dc6f'
  ]
  
  let hash = 0
  for (let i = 0; i < player.name.length; i++) {
    hash = player.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}
</script>

<style scoped>
.voting-phase {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.phase-header {
  text-align: center;
  margin-bottom: 32px;
}

.phase-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #fff;
}

.phase-description {
  color: #ccc;
  font-size: 1.1rem;
  margin: 0;
}

.phase-content {
  display: grid;
  gap: 24px;
}

/* Статистика */
.voting-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  color: #aaa;
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  color: #fff;
  font-size: 1.2rem;
  font-weight: 600;
}

/* Голосование */
.voting-players {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.voting-players h3 {
  color: #ff6b6b;
  margin: 0 0 20px 0;
  font-size: 1.2rem;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.voting-player {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.voting-player:hover:not(.self) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.voting-player.selected {
  background: rgba(255, 107, 107, 0.2);
  border-color: #ff6b6b;
}

.voting-player.self {
  opacity: 0.5;
  cursor: not-allowed;
}

.voting-player.abstain {
  background: rgba(255, 165, 0, 0.1);
}

.voting-player.abstain.selected {
  background: rgba(255, 165, 0, 0.2);
  border-color: #ffa500;
}

.voting-player.has-votes {
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
}

.player-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #fff;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.abstain-avatar {
  background: #666 !important;
  font-size: 1.5rem;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-weight: 500;
  color: #fff;
  margin-bottom: 4px;
}

.self-label {
  color: #aaa;
  font-size: 0.8rem;
  font-style: italic;
}

.vote-count {
  color: #ff6b6b;
  font-size: 0.9rem;
  font-weight: 500;
}

.selected-indicator {
  color: #4ade80;
  font-size: 1.5rem;
  font-weight: bold;
}

/* Результаты */
.voting-results {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.voting-results h3 {
  color: #ffa500;
  margin: 0 0 16px 0;
  font-size: 1.1rem;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.result-player {
  color: #fff;
}

.result-votes {
  color: #ff6b6b;
  font-weight: 500;
}

/* Прогресс */
.voting-progress {
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b6b, #ffa500);
  transition: width 0.3s ease;
}

.progress-text {
  color: #ccc;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .voting-phase {
    padding: 16px;
  }
  
  .phase-title {
    font-size: 1.8rem;
  }
  
  .voting-stats {
    flex-direction: column;
    gap: 16px;
  }
  
  .players-grid {
    grid-template-columns: 1fr;
  }
  
  .voting-players {
    padding: 20px;
  }
}
</style>