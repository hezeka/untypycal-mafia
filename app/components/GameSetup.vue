<template>
  <div class="game-setup">
    
    <!-- Заголовок -->
    <div class="setup-header">
      <h2 class="setup-title">Настройка игры</h2>
      <p class="setup-subtitle">
        Выберите роли и начните игру
      </p>
    </div>

    <!-- Статистика ролей -->
    <div class="roles-stats">
      <div class="stat-item">
        <span class="stat-label">Выбрано ролей:</span>
        <span class="stat-value">{{ selectedRoles.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Игроков:</span>
        <span class="stat-value">{{ playerCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Нужно минимум:</span>
        <span class="stat-value">{{ playerCount + 3 }}</span>
      </div>
    </div>

    <!-- Выбор ролей -->
    <div class="roles-section">
      <h3 class="section-title">Доступные роли</h3>
      
      <div class="roles-grid">
        <div 
          v-for="[roleId, role] in Object.entries(availableRoles)" 
          :key="roleId"
          class="role-card"
          :class="{ 
            'selected': isRoleSelected(roleId),
            'disabled': !role.implemented,
            [`team-${role.team}`]: true
          }"
          @click="toggleRole(roleId)"
        >
          <div class="role-header">
            <h4 class="role-name">{{ role.name }}</h4>
            <div class="role-team" :class="`team-${role.team}`">
              {{ getTeamName(role.team) }}
            </div>
          </div>
          
          <p class="role-description">
            {{ role.description }}
          </p>
          
          <div class="role-footer">
            <div v-if="role.hasNightAction" class="role-badge night">
              Ночное действие
            </div>
            <div v-if="!role.implemented" class="role-badge disabled">
              В разработке
            </div>
            <div class="role-count">
              {{ getRoleCount(roleId) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Выбранные роли -->
    <div v-if="selectedRoles.length > 0" class="selected-roles">
      <h3 class="section-title">Роли в игре</h3>
      
      <div class="selected-list">
        <div 
          v-for="roleId in selectedRoles" 
          :key="roleId"
          class="selected-role"
          @click="removeRole(roleId)"
        >
          <span class="selected-name">{{ availableRoles[roleId]?.name || 'Неизвестная роль' }}</span>
          <span class="remove-btn">×</span>
        </div>
      </div>
    </div>

    <!-- Кнопка запуска -->
    <div class="start-section">
      <div v-if="!canStart" class="start-warning">
        <div v-if="playerCount < 3" class="warning-item">
          Нужно минимум 3 игрока
        </div>
        <div v-if="selectedRoles.length < playerCount + 3" class="warning-item">
          Выберите {{ playerCount + 3 - selectedRoles.length }} дополнительных ролей
        </div>
        <div v-if="!hasBalancedTeams" class="warning-item">
          Рекомендуется добавить оборотней для баланса
        </div>
      </div>
      
      <button 
        @click="$emit('start-game')"
        :disabled="!canStart"
        class="start-btn"
        :class="{ 'ready': canStart }"
      >
        {{ canStart ? 'Начать игру' : 'Настройте роли' }}
      </button>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useGame } from '~/composables/useGame'
import { getImplementedRoles, getTeamNames } from '../../shared/rolesRegistry.js'

const emit = defineEmits(['start-game'])

const { gameState, selectRole, removeRole } = useGame()

// Роли загружаются из централизованного реестра
const availableRoles = ref({})

// Computed
const selectedRoles = computed(() => gameState.room.selectedRoles)
const playerCount = computed(() => 
  gameState.room.players.filter(p => p.role !== 'game_master').length
)

const canStart = computed(() => {
  return gameState.player.isHost && 
         playerCount.value >= 3 && 
         selectedRoles.value.length >= playerCount.value + 3
})

const hasBalancedTeams = computed(() => {
  const werewolfCount = selectedRoles.value.filter(roleId => {
    const role = availableRoles.value[roleId]
    return role && role.team === 'werewolf'
  }).length
  
  return werewolfCount >= Math.max(1, Math.floor(selectedRoles.value.length / 4))
})

// Методы
const isRoleSelected = (roleId) => {
  return selectedRoles.value.includes(roleId)
}

const getRoleCount = (roleId) => {
  return selectedRoles.value.filter(id => id === roleId).length
}

const getTeamName = (team) => {
  const teamNames = getTeamNames()
  return teamNames[team] || team
}

const toggleRole = (roleId) => {
  if (!gameState.player.isHost) return
  
  const role = availableRoles.value[roleId]
  if (!role || !role.implemented) return
  
  if (isRoleSelected(roleId)) {
    removeRole(roleId)
  } else {
    selectRole(roleId)
  }
}

// Загрузка ролей из централизованного реестра
const loadAvailableRoles = () => {
  availableRoles.value = getImplementedRoles()
}

onMounted(() => {
  loadAvailableRoles()
})
</script>

<style scoped>
.game-setup {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

/* Заголовок */
.setup-header {
  text-align: center;
  margin-bottom: 32px;
}

.setup-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #fff;
}

.setup-subtitle {
  color: #ccc;
  margin: 0;
  font-size: 1.1rem;
}

/* Статистика */
.roles-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 32px;
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
  font-size: 1.5rem;
  font-weight: 600;
}

/* Секции */
.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: #fff;
}

.roles-section {
  margin-bottom: 32px;
}

/* Сетка ролей */
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.role-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

</style>