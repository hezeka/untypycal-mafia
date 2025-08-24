<template>
  <div class="game-setup">
    <div class="setup-header">
      <h2>Настройка игры</h2>
      <p>Комната: <strong>{{ gameState.room.id }}</strong></p>
    </div>

    <div class="setup-grid">
      <!-- Игроки -->
      <div class="players-section">
        <h3>Игроки ({{ playerCount }})</h3>
        <div class="players-list">
          <div 
            v-for="player in gameState.room.players" 
            :key="player.id"
            class="player-item"
            :class="{ 'is-host': player.isHost, 'is-me': player.isMe }"
          >
            <span class="player-name">{{ player.name }}</span>
            <span v-if="player.isHost" class="player-badge">Ведущий</span>
          </div>
        </div>
      </div>

      <!-- Выбор ролей -->
      <div v-if="gameState.player.isHost" class="roles-section">
        <h3>Роли ({{ gameState.room.selectedRoles.length }})</h3>
        <div class="roles-grid">
          <div 
            v-for="(role, roleId) in roles" 
            :key="roleId"
            class="role-item"
            :class="{ 'selected': isRoleSelected(roleId) }"
            @click="toggleRole(roleId)"
          >
            <img :src="`/roles/compressed/${roleId}.webp`" :alt="role.name" />
            <div class="role-name">{{ role.name }}</div>
            <div v-if="getRoleCount(roleId) > 0" class="role-count">{{ getRoleCount(roleId) }}</div>
          </div>
        </div>
        
        <div class="balance-info">
          <span>Деревня: {{ balance.village }}</span>
          <span>Оборотни: {{ balance.werewolf }}</span>
          <span>Другие: {{ balance.tanner + balance.special }}</span>
        </div>
        
        <button 
          @click="startGame"
          :disabled="!canStart"
          class="start-button"
        >
          {{ canStart ? 'Начать игру' : 'Выберите роли' }}
        </button>
      </div>
      
      <div v-else class="waiting-host">
        Ждем пока ведущий настроит игру...
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '~/composables/useGame'
import { getAllRoles, validateRoleBalance } from '../../../shared/rolesRegistry.js'

const { gameState, selectRole, startGame: gameStart } = useGame()
const roles = getAllRoles()

const playerCount = computed(() => {
  return gameState.room.players.filter(p => p.role !== 'game_master').length
})

const balance = computed(() => {
  const result = validateRoleBalance(gameState.room.selectedRoles)
  return result.counts
})

const canStart = computed(() => {
  return gameState.room.selectedRoles.length >= playerCount.value && 
         balance.value.werewolf > 0
})

const isRoleSelected = (roleId) => gameState.room.selectedRoles.includes(roleId)
const getRoleCount = (roleId) => gameState.room.selectedRoles.filter(id => id === roleId).length

const toggleRole = (roleId) => {
  if (getRoleCount(roleId) === 0) {
    selectRole(roleId, 'add')
  } else {
    selectRole(roleId, 'remove')
  }
}

const startGame = () => {
  if (canStart.value) {
    gameStart()
  }
}
</script>