<template>
  <div class="game-results">
    <div class="results-header">
      <h2>Игра завершена!</h2>
      <div class="winner-announcement">
        <div class="winner-team" :class="`team-${gameState.room.gameResult.winnerTeam}`">
          Победила команда: {{ getTeamName(gameState.room.gameResult.winnerTeam) }}
        </div>
      </div>
    </div>
    
    <div class="winners-list">
      <h3>Победители:</h3>
      <div class="winner-cards">
        <div 
          v-for="winnerId in gameState.room.gameResult.winners"
          :key="winnerId"
          class="winner-card"
        >
          <div class="winner-name">{{ getPlayerName(winnerId) }}</div>
          <div class="winner-role">{{ getPlayerRole(winnerId) }}</div>
        </div>
      </div>
    </div>
    
    <div class="results-actions">
      <button @click="$emit('new-game')" class="new-game-btn">Новая игра</button>
      <button @click="$emit('leave')" class="leave-btn">Покинуть</button>
    </div>
  </div>
</template>

<script setup>
import { useGame } from '~/composables/useGame'
import { getAllRoles } from '../../shared/rolesRegistry.js'

const emit = defineEmits(['new-game', 'leave'])
const { gameState } = useGame()
const roles = getAllRoles()

const getTeamName = (team) => {
  const teams = {
    village: 'Деревня',
    werewolf: 'Оборотни',
    tanner: 'Неудачник'
  }
  return teams[team] || team
}

const getPlayerName = (playerId) => {
  const player = gameState.room.players.find(p => p.id === playerId)
  return player?.name || 'Неизвестно'
}

const getPlayerRole = (playerId) => {
  const player = gameState.room.players.find(p => p.id === playerId)
  return roles[player?.role]?.name || player?.role || 'Неизвестно'
}
</script>