<template>
  <div v-if="isGameMaster" class="admin-panel">
    <div class="admin-header">
      <h3>Панель ведущего</h3>
      <button @click="collapsed = !collapsed" class="collapse-btn">
        {{ collapsed ? '▼' : '▲' }}
      </button>
    </div>
    
    <div v-show="!collapsed" class="admin-content">
      <!-- Быстрые действия -->
      <div class="admin-section">
        <h4>Управление игрой</h4>
        <div class="admin-buttons">
          <button @click="forceNextPhase" class="admin-btn phase-btn">
            Следующая фаза
          </button>
          <button @click="restartGame" class="admin-btn restart-btn">
            Перезапустить
          </button>
        </div>
      </div>
      
      <!-- Действия с игроками -->
      <div class="admin-section">
        <h4>Действия с игроками</h4>
        <div class="player-actions">
          <div 
            v-for="player in otherPlayers" 
            :key="player.id"
            class="player-action-row"
          >
            <div class="player-info">
              <span class="player-name">{{ player.name }}</span>
              <span class="player-role" :class="`role-${getRoleColor(player.role)}`">
                {{ getRoleName(player.role) }}
              </span>
              <span class="player-status" :class="{ 'dead': !player.alive }">
                {{ player.alive ? '👤' : '💀' }}
              </span>
            </div>
            
            <div class="action-buttons">
              <button 
                @click="togglePlayerLife(player)" 
                :class="player.alive ? 'kill-btn' : 'revive-btn'"
                class="admin-btn small"
              >
                {{ player.alive ? '💀' : '✨' }}
              </button>
              
              <button 
                @click="togglePlayerShield(player)" 
                :class="{ 'active': player.protected }"
                class="admin-btn small shield-btn"
              >
                🛡️
              </button>
              
              <button 
                @click="kickPlayer(player)" 
                class="admin-btn small kick-btn"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Статистика голосования -->
      <div v-if="gameState.voting.active" class="admin-section">
        <h4>Голосование</h4>
        <div class="voting-stats">
          <div v-for="[voterId, targetId] in Object.entries(gameState.room.votes)" :key="voterId" class="vote-row">
            <span class="voter">{{ getPlayerName(voterId) }}</span>
            <span class="arrow">→</span>
            <span class="target">{{ targetId ? getPlayerName(targetId) : 'Воздержался' }}</span>
          </div>
        </div>
      </div>
      
      <!-- Настройки чата -->
      <div class="admin-section">
        <h4>Настройки чата</h4>
        <div class="chat-settings">
          <label class="setting-label">
            <input 
              v-model="chatSettings.canChat" 
              type="checkbox"
              @change="updateChatSettings"
            />
            Разрешить чат
          </label>
          
          <label class="setting-label">
            <input 
              v-model="chatSettings.canWhisper" 
              type="checkbox"
              @change="updateChatSettings"
            />
            Разрешить шепот
          </label>
          
          <label class="setting-label">
            <input 
              v-model="chatSettings.werewolfChat" 
              type="checkbox"
              @change="updateChatSettings"
            />
            Чат оборотней
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useGame } from '~/composables/useGame'

const { gameState, otherPlayers, forceNextPhase, getRole } = useGame()

// Состояние панели
const collapsed = ref(false)

// Проверка, является ли текущий игрок ведущим
const isGameMaster = computed(() => {
  return gameState.player.role === 'game_master'
})

// Настройки чата (локальное состояние)
const chatSettings = reactive({
  canChat: true,
  canWhisper: true,
  werewolfChat: false
})

// Синхронизация с состоянием игры
watch(() => gameState.room.chatPermissions, (newPermissions) => {
  if (newPermissions) {
    Object.assign(chatSettings, newPermissions)
  }
}, { immediate: true })

// Методы
const getRoleName = (roleId) => {
  if (!roleId) return 'Без роли'
  const role = getRole(roleId)
  return role.name || 'Неизвестная роль'
}

const getRoleColor = (roleId) => {
  if (!roleId) return 'gray'
  const role = getRole(roleId)
  return role.color || 'gray'
}

const getPlayerName = (playerId) => {
  const player = gameState.room.players.find(p => p.id === playerId)
  return player ? player.name : 'Неизвестный игрок'
}

const togglePlayerLife = (player) => {
  const action = player.alive ? 'kill' : 'revive'
  // TODO: Отправить команду на сервер
  console.log(`Admin action: ${action} ${player.name}`)
}

const togglePlayerShield = (player) => {
  const action = player.protected ? 'unshield' : 'shield'
  // TODO: Отправить команду на сервер
  console.log(`Admin action: ${action} ${player.name}`)
}

const kickPlayer = (player) => {
  if (confirm(`Исключить игрока ${player.name}?`)) {
    // TODO: Отправить команду на сервер
    console.log(`Admin action: kick ${player.name}`)
  }
}

const restartGame = () => {
  if (confirm('Перезапустить игру? Все прогресс будет потерян.')) {
    // TODO: Отправить команду на сервер
    console.log('Admin action: restart game')
  }
}

const updateChatSettings = () => {
  // TODO: Отправить команду на сервер
  console.log('Admin action: update chat settings', chatSettings)
}
</script>

<style scoped>
.admin-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 350px;
  background: rgba(20, 20, 20, 0.95);
  border: 2px solid #ff6b6b;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  z-index: 1000;
  font-family: 'Inter', sans-serif;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(45deg, #ff6b6b, #ffa500);
  border-radius: 10px 10px 0 0;
  color: white;
}

.admin-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.collapse-btn {
  background: transparent;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
}

.admin-content {
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.admin-section {
  margin-bottom: 20px;
}

.admin-section h4 {
  margin: 0 0 12px 0;
  color: #ff6b6b;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.admin-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.admin-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-btn:hover {
  transform: translateY(-1px);
}

.admin-btn.small {
  padding: 4px 8px;
  font-size: 1rem;
}

.phase-btn {
  background: #4CAF50;
  color: white;
}

.phase-btn:hover {
  background: #45a049;
}

.restart-btn {
  background: #f44336;
  color: white;
}

.restart-btn:hover {
  background: #da190b;
}

.player-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.player-name {
  font-weight: 600;
  color: white;
  font-size: 0.9rem;
}

.player-role {
  font-size: 0.8rem;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
}

.role-blue { background: #2196F3; color: white; }
.role-red { background: #f44336; color: white; }
.role-brown { background: #795548; color: white; }
.role-purple { background: #9C27B0; color: white; }
.role-gold { background: #FFD700; color: black; }
.role-gray { background: #666; color: white; }

.player-status {
  font-size: 0.8rem;
  color: #ccc;
}

.player-status.dead {
  color: #f44336;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.kill-btn {
  background: #f44336;
  color: white;
}

.kill-btn:hover {
  background: #da190b;
}

.revive-btn {
  background: #4CAF50;
  color: white;
}

.revive-btn:hover {
  background: #45a049;
}

.shield-btn {
  background: #2196F3;
  color: white;
}

.shield-btn.active {
  background: #FFD700;
  color: black;
}

.shield-btn:hover {
  background: #1976D2;
}

.shield-btn.active:hover {
  background: #FFC107;
}

.kick-btn {
  background: #FF9800;
  color: white;
}

.kick-btn:hover {
  background: #F57C00;
}

.voting-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vote-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 0.9rem;
}

.voter {
  color: white;
  font-weight: 500;
}

.arrow {
  color: #ff6b6b;
  font-weight: bold;
}

.target {
  color: #ccc;
}

.chat-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
}

.setting-label input[type="checkbox"] {
  accent-color: #ff6b6b;
}

/* Адаптивность */
@media (max-width: 768px) {
  .admin-panel {
    position: fixed;
    top: 10px;
    right: 10px;
    left: 10px;
    width: auto;
  }
}
</style>