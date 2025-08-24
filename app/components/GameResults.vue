<template>
  <div class="game-results">
    <h2>Игра завершена!</h2>
    
    <div class="winner-announcement">
      <h3 class="winner-team">{{ getTeamName() }} побеждает!</h3>
    </div>
    
    <div class="winners-list">
      <div 
        v-for="playerId in gameState.room.gameResult.winners"
        :key="playerId"
        class="winner"
      >
        {{ getPlayerName(playerId) }}
      </div>
    </div>
    
    <div class="game-actions">
      <button @click="$emit('new-game')" class="new-game-btn">Новая игра</button>
      <button @click="$emit('leave')" class="leave-btn">Покинуть</button>
    </div>
  </div>
</template>

<script setup>
import { useGame } from '~/composables/useGame'

const emit = defineEmits(['new-game', 'leave'])
const { gameState } = useGame()

const getTeamName = () => {
  const teams = {
    village: 'Деревня',
    werewolf: 'Оборотни',
    tanner: 'Неудачник'
  }
  return teams[gameState.room.gameResult?.winnerTeam] || 'Неизвестно'
}

const getPlayerName = (playerId) => {
  const player = gameState.room.players.find(p => p.id === playerId)
  return player?.name || 'Неизвестно'
}
</script>