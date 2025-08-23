<template>
  <div class="night-actions">
    <div v-if="gameState.nightAction.active" class="night-panel">
      <h3>Ваш ход: {{ getRoleName(gameState.nightAction.role) }}</h3>
      <div class="action-hint">{{ getRoleHint() }}</div>
      
      <div class="action-buttons">
        <template v-if="gameState.nightAction.role === 'werewolf'">
          <div class="werewolf-actions">
            <h4>Выберите цель для убийства:</h4>
            <button 
              v-for="target in availableTargets"
              :key="target.id"
              @click="executeAction('vote_kill', target.id)"
              class="target-btn"
            >
              {{ target.name }}
            </button>
          </div>
        </template>
        
        <template v-else-if="gameState.nightAction.role === 'seer'">
          <div class="seer-actions">
            <button @click="actionType = 'player'" class="choice-btn">Посмотреть игрока</button>
            <button @click="actionType = 'center'" class="choice-btn">Посмотреть центр</button>
            
            <div v-if="actionType === 'player'" class="target-selection">
              <h4>Выберите игрока:</h4>
              <button 
                v-for="target in availableTargets"
                :key="target.id"
                @click="executeAction('look_player', target.id)"
                class="target-btn"
              >
                {{ target.name }}
              </button>
            </div>
            
            <div v-if="actionType === 'center'" class="center-selection">
              <h4>Выберите две карты:</h4>
              <!-- TODO: Реализовать выбор центральных карт -->
            </div>
          </div>
        </template>
        
        <!-- Добавить другие роли по аналогии -->
        
        <button @click="skipAction" class="skip-btn">Пропустить</button>
      </div>
      
      <div v-if="gameState.nightAction.data" class="action-result">
        <div v-if="gameState.nightAction.data.success" class="result-success">
          {{ gameState.nightAction.data.message }}
        </div>
        <div v-if="gameState.nightAction.data.error" class="result-error">
          {{ gameState.nightAction.data.error }}
        </div>
      </div>
    </div>
    
    <div v-else class="waiting-night">
      <div class="night-status">Ожидание других игроков...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGame } from '~/composables/useGame'
import { getAllRoles } from '../../shared/rolesRegistry.js'

const { gameState, executeNightAction } = useGame()
const actionType = ref(null)
const roles = getAllRoles()

const availableTargets = computed(() => {
  return gameState.room.players.filter(p => 
    p.alive && !p.isMe && p.role !== 'game_master'
  )
})

const getRoleName = (roleId) => roles[roleId]?.name || roleId
const getRoleHint = () => roles[gameState.nightAction.role]?.phaseHints?.night || ''

const executeAction = (type, targetId) => {
  executeNightAction({ type, targetId })
}

const skipAction = () => {
  executeNightAction({ type: 'skip' })
}
</script>