<template>
  <div class="game-page">
    
    <!-- Заголовок игры -->
    <header class="game-header">
      <div class="header-left">
        <h1 class="game-title">НЕТИПИЧКА</h1>
        <div class="room-info">
          <span class="room-code" @click="copyRoomCode">{{ gameState.room.id }}</span>
          <span class="phase-indicator" :class="`phase-${gameState.room.phase}`">
            {{ phaseInfo.name }}
          </span>
        </div>
      </div>
      
      <div class="header-right">
        <div v-if="gameState.timer.active" class="timer">
          {{ formatTime(gameState.timer.remaining) }}
        </div>
        
        <div class="connection-status" :class="{ 'connected': gameState.connected }">
          <span class="status-dot"></span>
        </div>
        
        <button @click="leaveGame" class="leave-btn">
          Покинуть
        </button>
      </div>
    </header>

    <!-- Основная игровая область -->
    <main class="game-main">
      
      <!-- Фаза настройки -->
      <GameSetup v-if="gameState.room.phase === 'setup'" />
      
      <!-- Игровые фазы -->
      <div v-else class="game-area">
        
        <!-- Информация о фазе и подсказки -->
        <div class="phase-info">
          <div class="phase-description">
            {{ phaseInfo.description }}
          </div>
          <div v-if="currentPlayer.role" class="role-hint">
            {{ getRoleHint() }}
          </div>
        </div>
        
        <!-- Центральные карты -->
        <div v-if="gameState.room.centerCards > 0" class="center-cards">
          <h4>Центральные карты</h4>
          <div class="center-grid">
            <div v-for="n in gameState.room.centerCards" :key="n" class="center-card">
              <img src="/roles/card-back.png" alt="Центральная карта" />
            </div>
          </div>
        </div>
        
        <!-- Сетка игроков -->
        <div class="players-area">
          <div class="players-grid" :class="getPlayersGridClass()">
            <div 
              v-for="player in gameState.room.players" 
              :key="player.id"
              class="player-card"
              :class="getPlayerCardClass(player)"
            >
              <!-- Аватар / роль -->
              <div class="player-avatar">
                <img 
                  v-if="player.role && shouldShowRole(player)"
                  :src="`/roles/compressed/${player.role}.webp`"
                  :alt="getRoleName(player.role)"
                  class="role-image"
                />
                <div v-else class="default-avatar">
                  {{ player.name[0]?.toUpperCase() }}
                </div>
                <div v-if="isWerewolfRole(player.role)" class="werewolf-claws">
                  <img src="/icons/claws.png" alt="Оборотень" />
                </div>
              </div>
              
              <!-- Информация об игроке -->
              <div class="player-info">
                <div class="player-name">{{ player.name }}</div>
                <div v-if="player.role && shouldShowRole(player)" class="player-role">
                  {{ getRoleName(player.role) }}
                </div>
                <div class="player-status">
                  <span v-if="!player.alive" class="status-dead">Мертв</span>
                  <span v-if="!player.connected" class="status-offline">Оффлайн</span>
                  <span v-if="player.isHost" class="status-host">Ведущий</span>
                </div>
              </div>
              
              <!-- Кнопки управления -->
              <div class="player-actions">
                <template v-if="player.isMe">
                  <button @click="showRoleInfo = true" class="action-btn role-btn">
                    О вашей роли
                  </button>
                </template>
                <template v-else>
                  <button @click="whisperTo(player)" class="action-btn whisper-btn">
                    ЛС
                  </button>
                  
                  <!-- Кнопки ведущего -->
                  <template v-if="canAdminControl">
                    <button @click="adminAction('protect', player.id)" class="action-btn admin-btn">
                      Защитить
                    </button>
                    <button 
                      @click="adminAction(player.alive ? 'kill' : 'revive', player.id)" 
                      class="action-btn admin-btn"
                    >
                      {{ player.alive ? 'Убить' : 'Воскресить' }}
                    </button>
                    <button @click="adminAction('kick', player.id)" class="action-btn admin-btn danger">
                      Выгнать
                    </button>
                  </template>
                  
                  <!-- Кнопки оборотня -->
                  <template v-if="isWerewolf && gameState.room.phase === 'night'">
                    <button 
                      v-if="canKillPlayer(player)"
                      @click="nightAction('vote_kill', player.id)" 
                      class="action-btn werewolf-btn"
                    >
                      ☠️
                    </button>
                    <button 
                      v-if="canLookAtPlayer(player)"
                      @click="nightAction('look_player', player.id)" 
                      class="action-btn werewolf-btn"
                    >
                      👁️
                    </button>
                  </template>
                  
                  <!-- Кнопка голосования -->
                  <template v-if="gameState.room.phase === 'voting' && canVoteFor(player)">
                    <button 
                      @click="votePlayer(player.id)" 
                      class="action-btn vote-btn"
                      :class="{ 'voted': gameState.voting.myVote === player.id }"
                    >
                      {{ gameState.voting.myVote === player.id ? '✓' : 'Голос' }}
                    </button>
                  </template>
                </template>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Ночные действия -->
        <NightActions v-if="gameState.room.phase === 'night'" />
        
        <!-- Результаты игры -->
        <GameResults v-if="gameState.room.phase === 'ended'" />
        
      </div>
    </main>

    <!-- Боковая панель чата -->
    <aside class="game-sidebar">
      <GameChat />
    </aside>

    <!-- Модалы -->
    <RoleInfoModal 
      v-if="showRoleInfo && currentPlayer.role"
      :role="currentPlayer.role"
      @close="showRoleInfo = false"
    />
    
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '~/composables/useGame'
import { getAllRoles } from '../../../shared/rolesRegistry.js'

const route = useRoute()
const router = useRouter()
const { 
  gameState, 
  currentPlayer,
  formatTime, 
  getPhaseInfo,
  initSocketListeners,
  votePlayer,
  adminAction,
  executeNightAction,
  cleanup
} = useGame()

const showRoleInfo = ref(false)
const roles = getAllRoles()

// Computed
const phaseInfo = computed(() => getPhaseInfo())

const canAdminControl = computed(() => {
  return currentPlayer.value.role === 'game_master' || currentPlayer.value.isHost
})

const isWerewolf = computed(() => {
  const role = currentPlayer.value.role
  return role && (role.includes('werewolf') || role === 'mystic_wolf') && role !== 'minion'
})

// Методы
const copyRoomCode = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    // TODO: Показать уведомление
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const leaveGame = () => {
  if (confirm('Вы уверены, что хотите покинуть игру?')) {
    router.push('/')
  }
}

const shouldShowRole = (player) => {
  // Свою роль видишь всегда
  if (player.isMe) return true
  
  // game_master видит все роли
  if (currentPlayer.value.role === 'game_master') return true
  
  // Оборотни видят других оборотней (кроме фазы setup)
  if (isWerewolf.value && isWerewolfRole(player.role) && gameState.room.phase !== 'setup') {
    return true
  }
  
  return false
}

const isWerewolfRole = (role) => {
  if (!role) return false
  const roleInfo = roles[role]
  return roleInfo?.team === 'werewolf' && role !== 'minion'
}

const getRoleName = (roleId) => {
  return roles[roleId]?.name || roleId
}

const getRoleHint = () => {
  const role = roles[currentPlayer.value.role]
  if (!role?.phaseHints) return ''
  
  const phase = gameState.room.phase
  return role.phaseHints[phase] || role.phaseHints.day || ''
}

const getPlayersGridClass = () => {
  const count = gameState.room.players.length
  if (count <= 4) return 'grid-2x2'
  if (count <= 6) return 'grid-3x2'
  return 'grid-3x3'
}

const getPlayerCardClass = (player) => {
  const classes = []
  
  if (player.isMe) classes.push('is-me')
  if (!player.alive) classes.push('is-dead')
  if (!player.connected) classes.push('is-offline')
  if (player.role === 'game_master') classes.push('is-gamemaster')
  if (isWerewolfRole(player.role)) classes.push('is-werewolf')
  
  return classes
}

const canVoteFor = (player) => {
  return player.alive && !player.isMe && player.role !== 'game_master'
}

const canKillPlayer = (player) => {
  return player.alive && !isWerewolfRole(player.role) && player.role !== 'game_master'
}

const canLookAtPlayer = (player) => {
  return player.alive && !player.isMe && player.role !== 'game_master'
}

const whisperTo = (player) => {
  // TODO: Открыть модал личных сообщений или добавить в инпут чата
  console.log('Whisper to:', player.name)
}

const nightAction = (type, targetId) => {
  executeNightAction({ type, targetId })
}

// Инициализация
onMounted(() => {
  initSocketListeners()
  
  // Если нет активной игры - перенаправляем на главную
  if (!gameState.room.id) {
    router.push('/')
  }
})

onUnmounted(() => {
  cleanup()
})
</script>