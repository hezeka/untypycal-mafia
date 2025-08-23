<template>
  <div class="game-setup">
    <div class="setup-header">
      <h2>Настройка игры</h2>
      <p>Комната: <strong>{{ gameState.room.id }}</strong></p>
      <p>Игроков: {{ playerCount }} / Ролей: {{ gameState.room.selectedRoles.length }}</p>
    </div>

    <div class="setup-content">
      <!-- Список игроков -->
      <div class="players-section">
        <h3>Игроки ({{ playerCount }})</h3>
        <div class="players-grid">
          <div 
            v-for="player in gameState.room.players" 
            :key="player.id"
            class="player-card"
            :class="{ 'is-host': player.isHost, 'is-me': player.isMe }"
          >
            <div class="player-name">{{ player.name }}</div>
            <div v-if="player.isHost" class="player-badge">Ведущий</div>
            <div v-if="player.role === 'game_master'" class="player-badge observer">Наблюдатель</div>
          </div>
        </div>
      </div>

      <!-- Выбор ролей (только для хоста) -->
      <div v-if="gameState.player.isHost" class="roles-section">
        <h3>Роли</h3>
        <div class="roles-grid">
          <div 
            v-for="(role, roleId) in availableRoles" 
            :key="roleId"
            class="role-card"
            :class="{ 'selected': selectedRoleCount(roleId) > 0, 'not-implemented': !role.implemented }"
            @click="toggleRole(roleId)"
          >
            <div class="role-image">
              <img :src="`/roles/compressed/${roleId}.webp`" :alt="role.name" />
            </div>
            <div class="role-info">
              <div class="role-name">{{ role.name }}</div>
              <div class="role-description">{{ role.description }}</div>
              <div v-if="selectedRoleCount(roleId) > 0" class="role-count">{{ selectedRoleCount(roleId) }}</div>
            </div>
          </div>
        </div>
        
        <div class="role-balance">
          <div class="balance-info">
            <span class="balance-item">Деревня: {{ roleBalance.village }}</span>
            <span class="balance-item">Оборотни: {{ roleBalance.werewolf }}</span>
            <span class="balance-item">Особые: {{ roleBalance.special + roleBalance.tanner }}</span>
          </div>
          <div v-if="roleBalance.warnings.length > 0" class="balance-warnings">
            <div v-for="warning in roleBalance.warnings" :key="warning" class="warning">
              ⚠️ {{ warning }}
            </div>
          </div>
        </div>
      </div>

      <!-- Центральные карты -->
      <div v-if="gameState.room.centerCards > 0" class="center-section">
        <h3>Центральные карты ({{ gameState.room.centerCards }})</h3>
        <div class="center-cards">
          <div 
            v-for="n in gameState.room.centerCards" 
            :key="n"
            class="center-card"
          >
            <img src="/roles/card-back.png" alt="Центральная карта" />
          </div>
        </div>
      </div>

      <!-- Кнопка старта -->
      <div class="start-section">
        <button 
          v-if="gameState.player.isHost"
          @click="startGame"
          :disabled="!canStartGame"
          class="start-button"
          :class="{ 'can-start': canStartGame }"
        >
          {{ canStartGame ? 'Начать игру' : 'Настройте роли' }}
        </button>
        <div v-else class="waiting-message">
          Ждем хоста для начала игры...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '~/composables/useGame'
import { getAllRoles } from '../../shared/rolesRegistry.js'

const { gameState, canStartGame, selectRole, startGame } = useGame()

// Доступные роли
const availableRoles = computed(() => getAllRoles())

// Подсчет игроков (исключая game_master)
const playerCount = computed(() => {
  return gameState.room.players.filter(p => p.role !== 'game_master').length
})

// Подсчет выбранных ролей
const selectedRoleCount = (roleId) => {
  return gameState.room.selectedRoles.filter(id => id === roleId).length
}

// Баланс ролей
const roleBalance = computed(() => {
  const roles = availableRoles.value
  const selected = gameState.room.selectedRoles
  
  const counts = { village: 0, werewolf: 0, tanner: 0, special: 0 }
  const warnings = []
  
  selected.forEach(roleId => {
    const role = roles[roleId]
    if (role) counts[role.team]++
  })
  
  const total = selected.length
  const players = playerCount.value
  
  if (total < players) warnings.push('Недостаточно ролей')
  if (counts.werewolf === 0) warnings.push('Добавьте оборотней')
  if (counts.werewolf > total / 2) warnings.push('Слишком много оборотней')
  if (counts.village === 0 && counts.special === 0) warnings.push('Добавьте роли деревни')
  
  return { ...counts, warnings }
})

// Добавление/удаление ролей
const toggleRole = (roleId) => {
  if (!gameState.player.isHost) return
  
  const role = availableRoles.value[roleId]
  if (!role.implemented) return
  
  const currentCount = selectedRoleCount(roleId)
  const maxCount = roleId.includes('werewolf') ? 3 : 1
  
  if (currentCount === 0) {
    selectRole(roleId, 'add')
  } else if (currentCount < maxCount) {
    selectRole(roleId, 'add')
  } else {
    selectRole(roleId, 'remove')
  }
}
</script>