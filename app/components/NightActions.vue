<template>
  <div class="night-actions">
    <div v-if="gameState.nightAction.active" class="night-panel">
      <h3>{{ getRoleName(gameState.nightAction.role) }}</h3>
      <p>{{ getHint() }}</p>
      
      <div class="action-buttons">
        <button 
          v-for="player in availableTargets"
          :key="player.id"
          @click="selectTarget(player.id)"
          class="target-btn"
        >
          {{ player.name }}
        </button>
        
        <button @click="skipAction" class="skip-btn">Пропустить</button>
      </div>
      
      <div v-if="result" class="action-result">
        <p :class="result.success ? 'success' : 'error'">{{ result.message }}</p>
      </div>
    </div>
    
    <div v-else class="waiting-night">
      Ожидание ночных действий...
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useGame } from '~/composables/useGame'
import { getAllRoles } from '../../../shared/rolesRegistry.js'

const { gameState, executeNightAction } = useGame()
const roles = getAllRoles()
const result = ref(null)

const availableTargets = computed(() => {
  return gameState.room.players.filter(p => 
    p.alive && !p.isMe && p.role !== 'game_master'
  )
})

const getRoleName = (roleId) => roles[roleId]?.name || roleId
const getHint = () => roles[gameState.nightAction.role]?.phaseHints?.night || ''

const selectTarget = async (targetId) => {
  const actionResult = await executeNightAction({ type: 'vote_kill', targetId })
  result.value = actionResult
}

const skipAction = async () => {
  const actionResult = await executeNightAction({ type: 'skip' })
  result.value = actionResult
}
</script>