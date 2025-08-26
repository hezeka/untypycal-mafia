<template>
  <div 
    class="player-item"
    :class="{
      'current-player': player.id === currentPlayer?.id,
      'host': player.isHost,
      'game-master': player.role === 'game_master',
      'dead': !player.alive,
      'protected': player.protected,
      'disconnected': !player.connected,
      'speaking': isSpeaking(player.id),
      'whispering': isWhispering(player.id),
      'non-votable': gameState.voting.active && gameState.room.phase === 'voting' && 
                     (player.role === 'game_master' || player.id === currentPlayer?.id)
    }"
    @click="handlePlayerClick"
  >
    
    <!-- Аватар игрока -->
    <div class="player-avatar" :style="{ backgroundColor: getPlayerColor(player) }">
      {{ player.name.charAt(0).toUpperCase() }}
    </div>
    
    <!-- Информация об игроке -->
    <div class="player-info">
      <div class="player-name">
        {{ player.name }}
        <span v-if="player.isHost" class="host-badge">Ведущий</span>
      </div>
      
      <div class="player-status">
        <span v-if="!player.alive" class="status-dead">Мертв</span>
        <span v-else-if="player.protected" class="status-protected">Защищен</span>
        <span v-else-if="!player.connected" class="status-disconnected">Отключен</span>
        <span v-else class="status-alive">Жив</span>
      </div>
    </div>
    
    <!-- Роль (только для себя, ведущего или после смерти) -->
    <div v-if="shouldShowRole(player)" class="player-role">
      {{ getRoleName(player.role) }}
    </div>
    
    <!-- Индикаторы -->
    <div class="player-indicators">
      <!-- Голосовая активность -->
      <div v-if="isSpeaking(player.id)" class="indicator speaking">
        <div class="sound-waves">
          <div class="wave"></div>
          <div class="wave"></div>
          <div class="wave"></div>
        </div>
      </div>
      
      <!-- Индикатор шепота -->
      <div v-if="isWhispering(player.id)" class="indicator whispering">
        <div class="whisper-icon">💬</div>
      </div>
      
      <!-- Голос -->
      <div v-if="hasVoted(player.id)" class="indicator voted">
        ✓
      </div>
      
      <!-- Щит -->
      <div v-if="player.protected" class="indicator shield">
        🛡️
      </div>
    </div>
    
    <!-- Выпадающее меню ведущего -->
    <div v-if="isGameMaster && !player.isHost" class="admin-menu-container">
      <button 
        class="admin-menu-trigger"
        @click.stop="toggleAdminMenu"
        :class="{ 'active': showAdminMenu }"
      >
        ⚙️
      </button>
      
      <div v-if="showAdminMenu" class="admin-menu" @click.stop>
        <button 
          class="admin-menu-item"
          :class="player.alive ? 'danger' : 'success'"
          @click="togglePlayerLife"
        >
          <span class="menu-icon">{{ player.alive ? '💀' : '✨' }}</span>
          <span class="menu-text">{{ player.alive ? 'Убить' : 'Воскресить' }}</span>
        </button>
        
        <button 
          class="admin-menu-item"
          :class="player.protected ? 'warning' : 'info'"
          @click="togglePlayerShield"
        >
          <span class="menu-icon">🛡️</span>
          <span class="menu-text">{{ player.protected ? 'Снять щит' : 'Поставить щит' }}</span>
        </button>
        
        <button 
          class="admin-menu-item info"
          @click="toggleRoleMenu"
        >
          <span class="menu-icon">🎭</span>
          <span class="menu-text">Сменить роль</span>
        </button>
        
        <button 
          class="admin-menu-item danger"
          @click="kickPlayer"
        >
          <span class="menu-icon">🚪</span>
          <span class="menu-text">Исключить</span>
        </button>
      </div>
      
      <!-- Подменю выбора роли -->
      <div v-if="showRoleMenu" class="role-menu" @click.stop>
        <div class="role-menu-header">Выберите роль:</div>
        <button
          v-for="role in availableRoles"
          :key="role.id"
          class="role-menu-item"
          :class="role.id === player.role ? 'current' : ''"
          @click="changePlayerRole(role.id)"
        >
          <span class="role-icon" :style="{ color: getRoleColor(role) }">🎭</span>
          <span class="role-name">{{ role.name }}</span>
        </button>
      </div>
    </div>
    
  </div>
  
  <!-- Backdrop для закрытия меню -->
  <div 
    v-if="showAdminMenu || showRoleMenu" 
    class="admin-menu-backdrop"
    @click="closeAdminMenu"
  ></div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGame } from '~/composables/useGame'
import { useVoiceActivity } from '~/composables/useVoiceActivity'
import { useSocket } from '~/composables/useSocket'

const props = defineProps({
  player: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['vote', 'admin-action'])

const { gameState, currentPlayer, getRole } = useGame()
const { speakingPlayers } = useVoiceActivity()
const { socket } = useSocket()

// Состояние шепчущих игроков
const whisperingPlayers = ref(new Set())

// Состояние меню
const showAdminMenu = ref(false)
const showRoleMenu = ref(false)

// Computed
const isGameMaster = computed(() => {
  return currentPlayer.value?.role === 'game_master'
})

const availableRoles = computed(() => {
  const roles = [
    { id: 'villager', name: 'Житель', color: 'blue' },
    { id: 'werewolf', name: 'Оборотень', color: 'red' },
    { id: 'seer', name: 'Провидец', color: 'blue' },
    { id: 'robber', name: 'Грабитель', color: 'blue' },
    { id: 'troublemaker', name: 'Смутьян', color: 'blue' },
    { id: 'drunk', name: 'Пьяница', color: 'blue' },
    { id: 'mystic_wolf', name: 'Мистический волк', color: 'red' },
    { id: 'tanner', name: 'Неудачник', color: 'brown' },
    { id: 'doppelganger', name: 'Доппельгангер', color: 'purple' }
  ]
  return roles
})

// Методы
const shouldShowRole = (player) => {
  // Показываем роль если это текущий игрок, ведущий, игрок мертв, или игра закончена
  return player.id === currentPlayer.value?.id || 
         isGameMaster.value ||
         !player.alive || 
         gameState.room.phase === 'ended'
}

const getRoleName = (roleId) => {
  if (!roleId) return 'Нет роли'
  
  const role = getRole(roleId)
  return role?.name || 'Неизвестная роль'
}

const getPlayerColor = (player) => {
  // Простая генерация цвета на основе имени
  const colors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', 
    '#ffeaa7', '#dda0dd', '#98d8c8', '#f7dc6f',
    '#bb8fce', '#85c1e9', '#f8c471', '#82e0aa'
  ]
  
  let hash = 0
  for (let i = 0; i < player.name.length; i++) {
    hash = player.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

const isSpeaking = (playerId) => {
  return speakingPlayers.value.includes(playerId)
}

const isWhispering = (playerId) => {
  return whisperingPlayers.value.has(playerId)
}

const hasVoted = (playerId) => {
  return gameState.voting.votes.hasOwnProperty(playerId)
}

// Обработка шепота
const handleWhisperActivity = (data) => {
  console.log('💬 Whisper activity received:', data)
  if (data.playerId) {
    console.log(`💬 Adding whisper indication for player ${data.playerId} (${data.playerName})`)
    whisperingPlayers.value.add(data.playerId)
    
    // Убираем индикацию через 500ms
    setTimeout(() => {
      console.log(`💬 Removing whisper indication for player ${data.playerId}`)
      whisperingPlayers.value.delete(data.playerId)
    }, 500)
  }
}

const handlePlayerClick = () => {
  // В фазе голосования - голосуем
  if (gameState.voting.active && gameState.room.phase === 'voting') {
    // Ведущий не может голосовать
    if (currentPlayer.value?.role === 'game_master') return
    
    // Нельзя голосовать против ведущего или самого себя
    if (props.player.alive && 
        props.player.id !== currentPlayer.value?.id && 
        props.player.role !== 'game_master') {
      emit('vote', props.player.id)
    }
  }
  
  // В других фазах - показываем информацию
  // TODO: Реализовать модал с информацией об игроке
}

// Админ функции
const toggleAdminMenu = () => {
  showAdminMenu.value = !showAdminMenu.value
}

const closeAdminMenu = () => {
  showAdminMenu.value = false
  showRoleMenu.value = false
}

const toggleRoleMenu = () => {
  showRoleMenu.value = !showRoleMenu.value
  showAdminMenu.value = false
}

const getRoleColor = (role) => {
  const colorMap = {
    'blue': '#60a5fa',
    'red': '#f87171', 
    'brown': '#d97706',
    'purple': '#c084fc'
  }
  return colorMap[role.color] || '#aaa'
}

const changePlayerRole = (roleId) => {
  emit('admin-action', {
    action: 'change-role',
    targetId: props.player.id,
    targetName: props.player.name,
    newRole: roleId
  })
  showRoleMenu.value = false
}

const togglePlayerLife = () => {
  const action = props.player.alive ? 'kill' : 'revive'
  emit('admin-action', {
    action,
    targetId: props.player.id,
    targetName: props.player.name
  })
  closeAdminMenu()
}

const togglePlayerShield = () => {
  const action = props.player.protected ? 'unshield' : 'shield'
  emit('admin-action', {
    action,
    targetId: props.player.id,
    targetName: props.player.name
  })
  closeAdminMenu()
}

const kickPlayer = () => {
  if (confirm(`Исключить игрока ${props.player.name}?`)) {
    emit('admin-action', {
      action: 'kick',
      targetId: props.player.id,
      targetName: props.player.name
    })
    closeAdminMenu()
  }
}

// Закрытие меню при клике вне
const handleClickOutside = (event) => {
  if (!event.target.closest('.admin-menu-container')) {
    closeAdminMenu()
  }
}

// Слушатель для закрытия меню
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  
  // Прослушиваем события шепота
  if (socket.value) {
    socket.value.on('whisper-activity', handleWhisperActivity)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  
  // Отписываемся от событий шепота
  if (socket.value) {
    socket.value.off('whisper-activity', handleWhisperActivity)
  }
})
</script>

<style scoped>
/* Элемент игрока */
.player-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.player-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.player-item.current-player {
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.4);
}

.player-item.dead {
  opacity: 0.5;
  filter: grayscale(1);
}

.player-item.disconnected {
  opacity: 0.7;
}

.player-item.speaking {
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
  border: 1px solid rgba(255, 107, 107, 0.5);
}

.player-item.whispering {
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
  border: 1px solid rgba(168, 85, 247, 0.6);
  animation: whisper-pulse 0.5s ease-in-out;
}

@keyframes whisper-pulse {
  0% {
    box-shadow: 0 0 5px rgba(168, 85, 247, 0.2);
    border-color: rgba(168, 85, 247, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.6);
    border-color: rgba(168, 85, 247, 0.8);
  }
  100% {
    box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
    border-color: rgba(168, 85, 247, 0.6);
  }
}

.player-item.game-master {
  border: 1px solid rgba(255, 165, 0, 0.4);
  background: rgba(255, 165, 0, 0.05);
}

.player-item.non-votable {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(0.3);
}

.player-item.non-votable:hover {
  background: rgba(255, 255, 255, 0.05) !important;
  transform: none !important;
}

/* Аватар */
.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #fff;
  font-size: 1.1rem;
  flex-shrink: 0;
}

/* Информация */
.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-weight: 500;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.host-badge {
  background: #ffa500;
  color: #000;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.player-status {
  font-size: 0.8rem;
}

.status-alive { color: #4ade80; }
.status-dead { color: #f87171; }
.status-protected { color: #60a5fa; }
.status-disconnected { color: #a3a3a3; }

/* Роль */
.player-role {
  font-size: 0.8rem;
  color: #ccc;
  font-style: italic;
}

/* Индикаторы */
.player-indicators {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.indicator {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 0.8rem;
}

.indicator.voted {
  background: #4ade80;
  color: #000;
  font-weight: 600;
}

.indicator.shield {
  font-size: 1rem;
}

.indicator.whispering {
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.5);
  animation: whisper-icon-pulse 0.5s ease-in-out;
}

.whisper-icon {
  font-size: 0.9rem;
  animation: whisper-icon-bounce 0.5s ease-in-out;
}

@keyframes whisper-icon-pulse {
  0% {
    background: rgba(168, 85, 247, 0.1);
    border-color: rgba(168, 85, 247, 0.3);
    transform: scale(1);
  }
  50% {
    background: rgba(168, 85, 247, 0.3);
    border-color: rgba(168, 85, 247, 0.7);
    transform: scale(1.1);
  }
  100% {
    background: rgba(168, 85, 247, 0.2);
    border-color: rgba(168, 85, 247, 0.5);
    transform: scale(1);
  }
}

@keyframes whisper-icon-bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

/* Анимация звуковых волн */
.sound-waves {
  display: flex;
  gap: 2px;
  align-items: center;
}

.wave {
  width: 3px;
  height: 12px;
  background: #ff6b6b;
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}

.wave:nth-child(2) { animation-delay: 0.1s; }
.wave:nth-child(3) { animation-delay: 0.2s; }

@keyframes wave {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}

/* Админ меню */
.admin-menu-container {
  position: relative;
  z-index: 100;
}

.admin-menu-trigger {
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.4);
  border-radius: 6px;
  padding: 6px;
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.admin-menu-trigger:hover,
.admin-menu-trigger.active {
  background: rgba(255, 107, 107, 0.3);
  border-color: rgba(255, 107, 107, 0.6);
  transform: scale(1.1);
}

.admin-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: rgba(20, 20, 20, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  min-width: 160px;
  z-index: 1000;
}

.admin-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  margin: 2px;
}

.admin-menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.admin-menu-item.danger {
  color: #f87171;
}

.admin-menu-item.danger:hover {
  background: rgba(248, 113, 113, 0.2);
}

.admin-menu-item.success {
  color: #4ade80;
}

.admin-menu-item.success:hover {
  background: rgba(74, 222, 128, 0.2);
}

.admin-menu-item.info {
  color: #60a5fa;
}

.admin-menu-item.info:hover {
  background: rgba(96, 165, 250, 0.2);
}

.admin-menu-item.warning {
  color: #fbbf24;
}

.admin-menu-item.warning:hover {
  background: rgba(251, 191, 36, 0.2);
}

.menu-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.menu-text {
  flex: 1;
  text-align: left;
}

/* Меню выбора роли */
.role-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: rgba(20, 20, 20, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  min-width: 200px;
  z-index: 1001;
  max-height: 300px;
  overflow-y: auto;
}

.role-menu-header {
  padding: 8px 12px;
  font-size: 0.8rem;
  color: #aaa;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
}

.role-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.role-menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.role-menu-item.current {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

.role-menu-item.current:hover {
  background: rgba(96, 165, 250, 0.3);
}

.role-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.role-name {
  flex: 1;
}

.admin-menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 50;
  background: transparent;
}

/* Адаптивность */
@media (max-width: 1024px) {
  .player-item {
    padding: 8px;
  }
  
  .player-avatar {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
  }
  
  .admin-menu {
    right: -10px;
  }
}
</style>