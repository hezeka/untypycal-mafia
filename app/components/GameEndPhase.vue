<template>
  <div class="game-end-phase">
    
    <div class="end-header">
      <h2 class="end-title">Игра завершена!</h2>
      <div class="victory-banner" :class="victoryType">
        {{ victoryMessage }}
      </div>
    </div>
    
    <div class="end-content">
      
      <!-- Результаты игры -->
      <div class="game-results">
        <div class="results-grid">
          
          <!-- Победители -->
          <div class="result-section winners">
            <h3>Победители</h3>
            <div class="players-list">
              <div 
                v-for="player in winners" 
                :key="player.id"
                class="player-item winner"
              >
                <div class="player-avatar" :style="{ backgroundColor: getPlayerColor(player) }">
                  {{ player.name.charAt(0).toUpperCase() }}
                </div>
                <div class="player-info">
                  <div class="player-name">{{ player.name }}</div>
                  <div class="player-role">{{ getPlayerRole(player) }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Проигравшие -->
          <div class="result-section losers" v-if="losers.length > 0">
            <h3>Проигравшие</h3>
            <div class="players-list">
              <div 
                v-for="player in losers" 
                :key="player.id"
                class="player-item loser"
              >
                <div class="player-avatar" :style="{ backgroundColor: getPlayerColor(player) }">
                  {{ player.name.charAt(0).toUpperCase() }}
                </div>
                <div class="player-info">
                  <div class="player-name">{{ player.name }}</div>
                  <div class="player-role">{{ getPlayerRole(player) }}</div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      <!-- Статистика игры -->
      <div class="game-statistics">
        <h3>Статистика игры</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Всего игроков:</span>
            <span class="stat-value">{{ totalPlayers }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Продолжительность:</span>
            <span class="stat-value">{{ gameDuration }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Раундов сыграно:</span>
            <span class="stat-value">{{ roundsPlayed }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Мирных жителей:</span>
            <span class="stat-value">{{ villageCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Оборотней:</span>
            <span class="stat-value">{{ werewolfCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Особых ролей:</span>
            <span class="stat-value">{{ specialCount }}</span>
          </div>
        </div>
      </div>
      
      <!-- Действия -->
      <div class="end-actions">
        <button 
          v-if="isHost"
          @click="restartGame"
          class="btn btn-primary"
        >
          Новая игра
        </button>
        
        <button 
          @click="shareResults"
          class="btn btn-secondary"
        >
          Поделиться результатами
        </button>
        
        <button 
          @click="leaveGame"
          class="btn btn-outline"
        >
          Покинуть игру
        </button>
      </div>
      
    </div>
    
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGame } from '~/composables/useGame'

const router = useRouter()
const { gameState, currentPlayer, getRole, resetGame } = useGame()

// Computed
const isHost = computed(() => currentPlayer.value?.isHost)

const gameResult = computed(() => {
  // TODO: Получать реальные результаты от сервера
  // Пока возвращаем заглушку
  return {
    type: 'village',
    message: 'Деревня побеждает!',
    winners: gameState.room.players.filter(p => getRole(p.role)?.team === 'village'),
    losers: gameState.room.players.filter(p => getRole(p.role)?.team === 'werewolf'),
    stats: {
      duration: 900000, // 15 минут
      rounds: 2
    }
  }
})

const victoryType = computed(() => gameResult.value.type)
const victoryMessage = computed(() => gameResult.value.message)
const winners = computed(() => gameResult.value.winners || [])
const losers = computed(() => gameResult.value.losers || [])

const totalPlayers = computed(() => 
  gameState.room.players.filter(p => p.role !== 'game_master').length
)

const gameDuration = computed(() => {
  const duration = gameResult.value.stats?.duration || 0
  const minutes = Math.floor(duration / 60000)
  const seconds = Math.floor((duration % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const roundsPlayed = computed(() => gameResult.value.stats?.rounds || 1)

const villageCount = computed(() => 
  gameState.room.players.filter(p => {
    const role = getRole(p.role)
    return role && role.team === 'village'
  }).length
)

const werewolfCount = computed(() => 
  gameState.room.players.filter(p => {
    const role = getRole(p.role)
    return role && role.team === 'werewolf'
  }).length
)

const specialCount = computed(() => 
  gameState.room.players.filter(p => {
    const role = getRole(p.role)
    return role && ['special', 'tanner'].includes(role.team)
  }).length
)

// Methods
const getPlayerColor = (player) => {
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

const getPlayerRole = (player) => {
  const role = getRole(player.role)
  return role ? role.name : 'Неизвестная роль'
}

const restartGame = () => {
  // TODO: Реализовать перезапуск игры
  console.log('Restarting game...')
}

const shareResults = () => {
  const text = `Игра в "Нетипичную Мафию" завершена!\n${victoryMessage.value}\nДлительность: ${gameDuration.value}`
  
  if (navigator.share) {
    navigator.share({
      title: 'Результаты игры в Мафию',
      text
    })
  } else {
    navigator.clipboard.writeText(text)
    // TODO: Показать уведомление о копировании
    console.log('Results copied to clipboard')
  }
}

const leaveGame = () => {
  resetGame()
  router.push('/')
}
</script>

<style scoped>
.game-end-phase {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.end-header {
  text-align: center;
  margin-bottom: 32px;
}

.end-title {
  font-size: 2.5rem;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #fff;
}

.victory-banner {
  font-size: 1.5rem;
  font-weight: 600;
  padding: 16px 32px;
  border-radius: 12px;
  display: inline-block;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.victory-banner.village {
  background: linear-gradient(45deg, #4ecdc4, #45b7d1);
  color: #fff;
}

.victory-banner.werewolf {
  background: linear-gradient(45deg, #ff6b6b, #ff5252);
  color: #fff;
}

.victory-banner.tanner {
  background: linear-gradient(45deg, #8b4513, #a0522d);
  color: #fff;
}

.end-content {
  display: grid;
  gap: 32px;
}

/* Результаты */
.game-results {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.result-section h3 {
  margin: 0 0 16px 0;
  font-size: 1.3rem;
}

.result-section.winners h3 {
  color: #4ade80;
}

.result-section.losers h3 {
  color: #ef4444;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.player-item.winner {
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.player-item.loser {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #fff;
  font-size: 1rem;
  flex-shrink: 0;
}

.player-info {
  flex: 1;
}

.player-name {
  font-weight: 500;
  color: #fff;
  margin-bottom: 2px;
}

.player-role {
  color: #aaa;
  font-size: 0.9rem;
}

/* Статистика */
.game-statistics {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.game-statistics h3 {
  color: #ffa500;
  margin: 0 0 20px 0;
  font-size: 1.3rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.stat-label {
  color: #ccc;
}

.stat-value {
  color: #fff;
  font-weight: 600;
}

/* Действия */
.end-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background: linear-gradient(45deg, #ff6b6b, #ffa500);
  color: #fff;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(255, 107, 107, 0.3);
}

.btn-secondary {
  background: rgba(78, 205, 196, 0.2);
  color: #4ecdc4;
  border: 1px solid #4ecdc4;
}

.btn-secondary:hover {
  background: rgba(78, 205, 196, 0.3);
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: #ddd;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .game-end-phase {
    padding: 16px;
  }
  
  .end-title {
    font-size: 2rem;
  }
  
  .victory-banner {
    font-size: 1.2rem;
    padding: 12px 24px;
  }
  
  .results-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .end-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .game-results,
  .game-statistics {
    padding: 20px;
  }
}
</style>