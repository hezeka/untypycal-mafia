<template>
  <div class="game-setup">
    <div class="setup-header">
      <h2>Настройка игры</h2>
      <p>Комната: <strong>{{ gameState.room.id }}</strong></p>
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
          <div 
            v-for="(teamRoles, teamId) in rolesByTeam" 
            :key="teamId"
            class="team-group"
          >
            <div class="team-header">
              <h4 class="team-name" :class="`team-${teamId}`">
                {{ getTeamName(teamId) }}
              </h4>
            </div>
            
            <div class="roles-grid">
              <div 
                v-for="([roleId, role]) in teamRoles" 
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
                    @error="$event.target.src = `/roles/${roleId}.png`"
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

// Сортировка ролей по команде, затем по названию
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
    
    // Затем по названию
    return aRole.name.localeCompare(bRole.name, 'ru')
  })
})

// Группировка ролей по командам для отображения
const rolesByTeam = computed(() => {
  const groups = {}
  
  sortedRoles.value.forEach(([roleId, role]) => {
    if (!groups[role.team]) {
      groups[role.team] = []
    }
    groups[role.team].push([roleId, role])
  })
  
  return groups
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

<style scoped>
.roles-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.team-group {
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 1rem;
  background: #1f2937;
}

.team-header {
  margin-bottom: 1rem;
}

.team-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  display: inline-block;
}

.team-name.team-village {
  background: #065f46;
  color: #86efac;
}

.team-name.team-werewolf {
  background: #7f1d1d;
  color: #fca5a5;
}

.team-name.team-tanner {
  background: #78350f;
  color: #fbbf24;
}

.team-name.team-special {
  background: #312e81;
  color: #c7d2fe;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.role-item {
  background: #374151;
  border: 2px solid #4b5563;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.role-item:hover {
  border-color: #6b7280;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.role-item.selected {
  border-color: #3b82f6;
  background: #1e3a8a;
}

.role-item.readonly {
  cursor: default;
  opacity: 0.8;
}

.role-item.loading {
  opacity: 0.6;
}

.role-image-container {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.role-count {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
}

.night-action-badge {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: #fbbf24;
  color: #1f2937;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
  border: 2px solid #374151;
  font-weight: 600;
}

.night-icon {
  font-size: 0.7rem;
}

.night-order {
  font-weight: 600;
}

.role-info {
  text-align: center;
}

.role-name {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #f9fafb;
}

.role-description {
  font-size: 0.85rem;
  color: #d1d5db;
  line-height: 1.4;
  hyphens: auto;
}
</style>