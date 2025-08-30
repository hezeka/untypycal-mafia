<template>
  <div class="night-actions">
    <!-- Debug info -->
    <!-- <div style="color: red; font-size: 12px;">
      DEBUG: active={{ gameState.nightAction.active }}, role={{ gameState.nightAction.role }}, phase={{ gameState.room.phase }}
    </div> -->
    
    <!-- Активная панель действий - только когда наша очередь -->
    <div v-if="gameState.nightAction.active" class="night-panel">
      <h3>{{ getRoleName(gameState.nightAction.role) }}</h3>
      <p>{{ getHint() }}</p>
      
      <!-- Центральные карты для провидца -->
      <div v-if="gameState.nightAction.role === 'seer'" class="action-buttons">
        <div class="action-group">
          <h4>Посмотреть центральные карты:</h4>
          <button @click="seerLookCenter" class="center-btn">
            Посмотреть 2 центральные карты
          </button>
        </div>
        
        <button @click="skipAction" class="skip-btn">Пропустить</button>
      </div>
      
      <!-- Пьяница: выбрать центральную карту -->
      <div v-else-if="gameState.nightAction.role === 'drunk'" class="action-buttons">
        <h4>Выберите центральную карту для обмена:</h4>
        <button v-for="index in 3" :key="index" @click="drunkSwap(index - 1)" class="center-btn">
          Карта {{ index }}
        </button>
        
        <button @click="skipAction" class="skip-btn">Пропустить</button>
      </div>
      
      
      <!-- Остальные роли - только кнопка пропуска -->
      <div v-else class="action-buttons">
        <p class="hint-text">Выберите игроков на поле или пропустите действие</p>
        <button @click="skipAction" class="skip-btn">Пропустить</button>
      </div>
      
      <div v-if="result" class="action-result">
        <p :class="result.success ? 'success' : 'error'">{{ result.message }}</p>
      </div>
    </div>
    
    <!-- Блок результатов - только когда есть результаты, но нет активных действий -->
    <div v-else-if="gameState.nightAction.result && !gameState.nightAction.active" class="result-panel">
      <h3>{{ getRoleName(gameState.nightAction.role) }}</h3>
      
      <!-- Результат от сервера -->
      <div class="server-result">
        <p class="success">{{ gameState.nightAction.result.message }}</p>
        <div v-if="gameState.nightAction.result.data.targetRole" class="role-info">
          <strong>Роль игрока:</strong> {{ getRoleName(gameState.nightAction.result.data.targetRole) }}
        </div>
        <div v-if="gameState.nightAction.result.data.centerCards" class="center-cards-info">
          <strong>Центральные карты:</strong> 
          <span v-for="(card, index) in gameState.nightAction.result.data.centerCards" :key="index">
            {{ getRoleName(card) }}<span v-if="index < gameState.nightAction.result.data.centerCards.length - 1">, </span>
          </span>
        </div>
        <div v-if="gameState.nightAction.result.data.werewolves" class="werewolves-info">
          <strong>Оборотни:</strong>
          <ul>
            <li v-for="wolf in gameState.nightAction.result.data.werewolves" :key="wolf.id">
              {{ wolf.name }} ({{ getRoleName(wolf.role) }})
            </li>
          </ul>
        </div>
        <div v-if="gameState.nightAction.result.data.newRole" class="new-role-info">
          <strong>Ваша новая роль:</strong> {{ getRoleName(gameState.nightAction.result.data.newRole) }}
        </div>
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

const getRoleName = (roleId) => roles[roleId]?.name || roleId
const getHint = () => roles[gameState.nightAction.role]?.phaseHints?.night || ''


// Действия для провидца

const seerLookCenter = async () => {
  const actionResult = await executeNightAction({ type: 'look_center', centerCards: [0, 1] })
  result.value = actionResult
}


// Действия для пьяницы
const drunkSwap = async (centerIndex) => {
  const actionResult = await executeNightAction({ centerIndex })
  result.value = actionResult
}


const skipAction = async () => {
  const actionResult = await executeNightAction({ type: 'skip' })
  result.value = actionResult
}
</script>

<style scoped>
.night-actions {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}

.night-panel, .result-panel {
  background: #1f2937;
  border-radius: 8px;
  padding: 2rem;
  border: 1px solid #374151;
}

.result-panel {
  border-color: #059669;
  background: #1e3a2e;
}

.night-panel h3 {
  color: #f9fafb;
  margin-bottom: 0.5rem;
}

.night-panel p {
  color: #d1d5db;
  margin-bottom: 1.5rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-group h4 {
  color: #f9fafb;
  margin: 0;
  font-size: 1rem;
}

.target-btn, .center-btn, .action-btn, .vote-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.vote-btn {
  background: #dc2626;
}

.vote-btn:hover {
  background: #b91c1c;
}

.target-btn:hover, .center-btn:hover, .action-btn:hover {
  background: #2563eb;
}

.target-btn:disabled, .center-btn:disabled, .action-btn:disabled {
  background: #6b7280;
  cursor: not-allowed;
}

.skip-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 1rem;
}

.skip-btn:hover {
  background: #4b5563;
}

.two-target-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.target-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.target-group label {
  color: #f9fafb;
  font-size: 0.9rem;
}

.target-group select {
  background: #374151;
  color: #f9fafb;
  border: 1px solid #4b5563;
  padding: 0.5rem;
  border-radius: 4px;
}

.action-result {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 6px;
}

.action-result .success {
  background: #059669;
  color: white;
}

.action-result .error {
  background: #dc2626;
  color: white;
}

.server-result {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #1e3a8a;
  border-radius: 6px;
  border: 1px solid #3b82f6;
}

.server-result .success {
  color: #86efac;
  font-weight: 600;
  margin-bottom: 1rem;
}

.server-result .role-info,
.server-result .center-cards-info,
.server-result .werewolves-info,
.server-result .new-role-info {
  margin-top: 0.75rem;
  color: #f9fafb;
}

.server-result strong {
  color: #fbbf24;
}

.server-result ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.server-result li {
  margin-bottom: 0.25rem;
}

.waiting-night {
  text-align: center;
  color: #9ca3af;
  padding: 2rem;
  font-style: italic;
}

.hint-text {
  color: #d1d5db;
  font-style: italic;
  text-align: center;
  margin-bottom: 1rem;
}
</style>