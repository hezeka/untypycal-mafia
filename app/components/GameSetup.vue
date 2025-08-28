<template>
  <div class="game-setup">
    <div class="phase-header">
      <div class="phase-info">
        <div class="phase-icon setup"></div>
        <div class="phase-description">
          <h2>Настройка игры</h2>
          <p>Комната: <strong>{{ gameState.room.id }}</strong></p>
        </div>
      </div>
      <div class="phase-help">
        💡
        <div>Ожидайте, пока ведущий определится с ролями</div>
      </div>
    </div>

    <div class="setup-grid">
      <!-- Игроки -->
      <div class="players-section">
        <div class="players-list">
          <div 
            v-for="player in gameState.room.players" 
            :key="player.id"
            class="player-item"
            :class="{ 'is-host': player.isHost, 'is-me': player.isMe }"
          >
            <span class="player-name">{{ player.name }}</span>
            <span v-if="player.isHost" class="player-badge">Ведущий</span>
            <span v-else-if="player.isMe" class="player-badge">Вы</span>
          </div>
        </div>
        <div class="roles-counter">
          <span>{{gameState.room.selectedRoles.length}}</span>
          <span>{{ playerCount }}</span>
        </div>
        
        <div class="balance-info">
          <span>Деревня: {{ balance.village }}</span>
          <span>Оборотни: {{ balance.werewolf }}</span>
          <span>Другие: {{ balance.tanner + balance.special }}</span>
        </div>
        
        <div v-if="gameState.player.isHost" class="host-actions">
          <button 
            @click="startGame"
            :disabled="!canStart"
            class="start-button"
          >
            {{ canStart ? 'Начать игру' : 'Выберите роли' }}
          </button>
        </div>
        
        <div v-else class="waiting-host">
          <span>Ждем пока ведущий начнет игру...</span>
        </div>
      </div>

      <!-- Роли (для всех игроков) -->
      <div class="roles-section">        
        <div class="roles-container">
          <div class="roles-grid">
            <div 
              v-for="([roleId, role]) in sortedRoles" 
              :key="roleId"
              class="role-item"
              :class="{ 
                'selected': isRoleSelected(roleId),
                'loading': gameState.player.isHost && roleLoading.has(roleId),
                'readonly': !gameState.player.isHost,
                [`team-${role.team}`]: true,
                'has-night-action': role.hasNightAction
              }"
              @click="gameState.player.isHost ? toggleRole(roleId) : null"
            >
              <div class="role-image-container">
                <img 
                  :src="`/roles/compressed/${roleId}.webp`" 
                  :alt="role.name"
                  @error="handleImageError($event, roleId)"
                  class="role-image"
                />
                <div v-if="getRoleCount(roleId) > 0" class="role-count">{{ getRoleCount(roleId) }}</div>
                
                <!-- Ночное действие -->
                <div v-if="role.hasNightAction" class="night-action-badge">
                  <span class="night-icon">🌙</span>
                  <span class="night-order">{{ role.nightOrder }}</span>
                </div>
              </div>
              
              <div class="role-info">
                <div class="role-name">{{ role.name }}</div>
                <div class="role-description">{{ role.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useGame } from '~/composables/useGame'
import { getAllRoles, validateRoleBalance, getTeamNames } from '../../../shared/rolesRegistry.js'

const { gameState, selectRole, startGame: gameStart } = useGame()
const roles = getAllRoles()
const roleLoading = ref(new Set())
const teamNames = getTeamNames()

// Сортировка ролей по команде, затем по ночной очереди, затем по названию
const sortedRoles = computed(() => {
  const teamOrder = {
    'village': 1,
    'werewolf': 2,
    'tanner': 3,
    'special': 4
  }
  
  return Object.entries(roles).sort(([aId, aRole], [bId, bRole]) => {
    // Сначала сортируем по команде
    const aTeamOrder = teamOrder[aRole.team] || 999
    const bTeamOrder = teamOrder[bRole.team] || 999
    
    if (aTeamOrder !== bTeamOrder) {
      return aTeamOrder - bTeamOrder
    }
    
    // Затем по ночной очереди (не указанные идут первыми)
    const aNightOrder = aRole.nightOrder || 0
    const bNightOrder = bRole.nightOrder || 0
    
    if (aNightOrder !== bNightOrder) {
      return aNightOrder - bNightOrder
    }
    
    // Затем по названию
    return aRole.name.localeCompare(bRole.name, 'ru')
  })
})


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
const getTeamName = (teamId) => teamNames[teamId] || teamId

const handleImageError = (event, roleId) => {
  // Сначала пробуем несжатую версию
  if (event.target.src.includes('compressed')) {
    event.target.src = `/roles/${roleId}.png`
  } else {
    // Если и несжатая не загрузилась, показываем card-back
    event.target.src = '/roles/card-back.png'
  }
}

const toggleRole = async (roleId) => {
  if (roleLoading.value.has(roleId)) return
  
  roleLoading.value.add(roleId)
  const action = getRoleCount(roleId) === 0 ? 'add' : 'remove'
  
  try {
    const success = await selectRole(roleId, action)
    
    if (!success) {
      console.error('❌ Failed to toggle role:', roleId)
    }
  } finally {
    roleLoading.value.delete(roleId)
  }
}

const startGame = async () => {
  if (canStart.value) {
    const success = await gameStart()
    if (!success) {
      console.error('❌ Failed to start game')
      // Можно добавить уведомление пользователю
    }
  }
}
</script>

