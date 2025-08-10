<template>
  <div class="game-board">
    <div class="game-header">
      <div class="phase-info">
        <h2 class="phase-title">{{ phaseTitle }}</h2>
        <p class="phase-description">{{ phaseDescription }}</p>
        <div v-if="timer" class="timer-display">
          Осталось времени: {{ timerDisplay }}
        </div>
      </div>
      
      <div class="game-controls" v-if="isHost">
        <button 
          @click="goToNextPhase"
          class="btn btn-primary next-phase-btn"
        >
          {{ getNextPhaseText() }}
        </button>
        
        <div class="phase-controls">
          <button 
            @click="changePhase('night', 'start')"
            class="btn btn-secondary"
            :class="{ active: gameState === 'night' }"
          >
            Ночь
          </button>
          <button 
            @click="changePhase('day', 'discussion')"
            class="btn btn-secondary"
            :class="{ active: gameState === 'day' }"
          >
            День
          </button>
          <button 
            @click="changePhase('voting', 'voting')"
            class="btn btn-secondary"
            :class="{ active: gameState === 'voting' }"
          >
            Голосование
          </button>
        </div>
        
        <button 
          v-if="gameState === 'voting'"
          @click="endVoting"
          class="btn btn-danger"
        >
          Завершить голосование
        </button>
      </div>
    </div>

    <div class="game-content">
      <!-- Player's Role Card -->
      <div class="player-role-section">
        <div class="card">
          <div class="card-header">Ваша роль</div>
          <div v-if="playerRole" class="role-display">
            <div class="role-card-mini" :class="roles[playerRole].color">
              <img :src="`/roles/${playerRole}.png`" :alt="roles[playerRole].name" />
              <div class="role-info">
                <h3>{{ roles[playerRole].name }}</h3>
                <p>{{ roles[playerRole].description }}</p>
                <div class="role-goal">
                  <strong>Цель команды "{{ getTeamName(roles[playerRole].team) }}":</strong>
                  {{ getTeamGoal(roles[playerRole].team) }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-role">
            {{ gameState === 'setup' ? 'Роль будет назначена после начала игры' : 'Роль не назначена' }}
          </div>
        </div>
      </div>

      <!-- Players Grid -->
      <div class="players-section">
        <div class="card">
          <div class="card-header">
            Игроки 
            <span v-if="gameState === 'voting'">(Нажмите чтобы проголосовать)</span>
          </div>
          
          <div class="players-grid">
            <div 
              v-for="player in playersToShow" 
              :key="player.id"
              class="player-card"
              :class="{ 
                voted: votedPlayer === player.id,
                dead: !player.alive,
                protected: player.protected,
                disconnected: !player.connected,
                werewolf: player.showRole && (player.role && (player.role.includes('wolf') || player.role === 'werewolf')),
                'is-self': player.isSelf
              }"
              @click="votePlayer(player.id)"
            >
              <div class="player-avatar">
                <div class="player-initial">{{ player.name[0].toUpperCase() }}</div>
                <div v-if="player.votes > 0" class="vote-count">{{ player.votes }}</div>
                <div v-if="!player.alive" class="death-marker">💀</div>
                <div v-else-if="!player.connected" class="disconnected-marker">😴</div>
                <div v-if="player.protected" class="protection-marker">🛡️</div>
              </div>
              
              <div class="player-info">
                <div class="player-name">{{ player.name }}</div>
                <div v-if="player.showRole && player.role" class="revealed-role">
                  {{ roles[player.role]?.name }}
                </div>
                <div v-else-if="gameState === 'ended' && player.role" class="revealed-role">
                  {{ roles[player.role]?.name }}
                </div>
                <div v-if="player.artifact" class="artifact-indicator">
                  Артефакт
                </div>
                
                <!-- Admin Controls -->
                <div v-if="isHost" class="admin-controls">
                  <button 
                    @click="showAdminPanel = showAdminPanel === player.id ? null : player.id"
                    class="btn btn-secondary btn-tiny"
                  >
                    ⚙️
                  </button>
                  
                  <div v-if="showAdminPanel === player.id" class="admin-panel">
                    <button @click="adminAction(player.alive ? 'kill' : 'revive', player.id)" class="btn btn-danger btn-tiny">
                      {{ player.alive ? 'Убить' : 'Воскресить' }}
                    </button>
                    <button @click="adminAction('protect', player.id)" class="btn btn-success btn-tiny">
                      {{ player.protected ? 'Снять защиту' : 'Защитить' }}
                    </button>
                    <button @click="adminAction('kick', player.id)" class="btn btn-danger btn-tiny">
                      Исключить
                    </button>
                    <select v-model="newRole" class="role-select">
                      <option value="">Выбрать роль</option>
                      <option v-for="(role, roleId) in roles" :key="roleId" :value="roleId">
                        {{ role.name }}
                      </option>
                    </select>
                    <button 
                      @click="adminAction('change_role', player.id, newRole); newRole = ''"
                      class="btn btn-primary btn-tiny"
                      :disabled="!newRole"
                    >
                      Сменить роль
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Game Chat -->
      <div class="chat-section">
        <GameChat />
      </div>

      <!-- Host Controls -->
      <div v-if="isHost" class="host-controls">
        <div class="card">
          <div class="card-header">Управление игрой</div>
          
          <div class="control-section">
            <h4>Фазы игры</h4>
            <div class="phase-buttons">
              <button 
                v-for="phase in availablePhases" 
                :key="phase.key"
                @click="changePhase(phase.state, phase.phase)"
                class="btn btn-secondary btn-small"
                :class="{ active: gameState === phase.state }"
              >
                {{ phase.name }}
              </button>
            </div>
          </div>

          <div v-if="gameState === 'night'" class="control-section">
            <h4>Ночные действия</h4>
            <div class="night-actions">
              <button 
                v-for="role in nightRoles" 
                :key="role.id"
                @click="announceRole(role.id)"
                class="btn btn-secondary btn-small"
              >
                {{ role.name }}
              </button>
            </div>
          </div>

          <div class="control-section">
            <h4>Действия</h4>
            <div class="action-buttons">
              <button @click="restartGame" class="btn btn-danger btn-small">
                Новая игра
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { 
  isHost, 
  gameData, 
  allPlayersForVoting,
  player, 
  roles,
  changePhase: changeGamePhase,
  votePlayer: voteForPlayer,
  endVoting: endGameVoting,
  sendMessage,
  adminAction,
  nextPhase: goToNextPhase,
  setTimer
} = useGame()

const votedPlayer = ref(null)
const showAdminPanel = ref(null) // ID of player for whom admin panel is shown
const newRole = ref('')
const customTimer = ref(600) // 10 minutes default

const gameState = computed(() => gameData.gameState)
const currentPhase = computed(() => gameData.currentPhase)
const playerRole = computed(() => {
  console.log('🎭 Current player role:', player.role)
  console.log('🎮 Game state:', gameState.value)
  console.log('👤 Player data:', player)
  return player.role
})
const timer = computed(() => gameData.timer)

// Timer display
const timerDisplay = computed(() => {
  if (!timer.value) return null
  const minutes = Math.floor(timer.value / 60)
  const seconds = timer.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// Check if current player can see werewolf roles
const canSeeWerewolfRoles = computed(() => {
  const role = player.role
  return role === 'game_master' || 
         (role && (role.includes('wolf') || role === 'werewolf' || role === 'minion'))
})

// Get players to display in grid (includes self for voting)
const playersToShow = computed(() => {
  return allPlayersForVoting.value.map(p => ({
    ...p,
    showRole: isHost.value || // Ведущий видит все роли
             gameState.value === 'ended' || // В конце игры все видят все роли
             (canSeeWerewolfRoles.value && 
              p.role && (p.role.includes('wolf') || p.role === 'werewolf' || p.role === 'minion')), // Оборотни видят других оборотней
    isSelf: p.id === player.id
  }))
})

const phaseClass = computed(() => '')

const phaseTitle = computed(() => {
  const titles = {
    night: 'Ночная фаза',
    day: 'Дневная фаза',
    voting: 'Голосование',
    ended: 'Игра завершена'
  }
  return titles[gameState.value] || 'Игра'
})

const phaseDescription = computed(() => {
  const descriptions = {
    night: 'Игроки с ночными способностями выполняют свои действия',
    day: 'Обсуждение и поиск оборотней. У вас есть 10 минут.',
    voting: 'Проголосуйте за игрока, которого подозреваете в том, что он оборотень',
    ended: 'Игра завершена. Результаты показаны ниже.'
  }
  return descriptions[gameState.value] || ''
})

const availablePhases = computed(() => [
  { key: 'night', name: 'Ночь', state: 'night', phase: 'start' },
  { key: 'day', name: 'День', state: 'day', phase: 'discussion' },
  { key: 'voting', name: 'Голосование', state: 'voting', phase: 'voting' }
])

const nightRoles = computed(() => {
  return gameData.selectedRoles
    .filter(roleId => roles[roleId]?.night)
    .map(roleId => ({
      id: roleId,
      name: roles[roleId].name
    }))
})

const changePhase = (gameState, currentPhase) => {
  changeGamePhase({ gameState, currentPhase })
}

const votePlayer = (playerId) => {
  if (gameState.value !== 'voting') return
  votedPlayer.value = playerId
  voteForPlayer(playerId)
}

const announceRole = (roleId) => {
  const role = roles[roleId]
  sendMessage(`${role.name}, проснись и выполни свое действие.`)
}

const getNextPhaseText = () => {
  switch (gameState.value) {
    case 'night': return 'Перейти к дню'
    case 'day': return 'Начать голосование'
    case 'voting': return 'Завершить игру'
    case 'ended': return 'Новый раунд'
    default: return 'Следующая фаза'
  }
}

const endVoting = () => {
  endGameVoting()
}

const getTeamName = (team) => {
  const teams = {
    village: 'Деревня',
    werewolf: 'Оборотни',
    tanner: 'Неудачник',
    special: 'Особая'
  }
  return teams[team] || team
}

const getTeamGoal = (team) => {
  const goals = {
    village: 'Найти и убить хотя бы одного оборотня',
    werewolf: 'Выжить и не быть убитыми',
    tanner: 'Быть убитым голосованием',
    special: 'Зависит от полученной роли'
  }
  return goals[team] || 'Неизвестно'
}
</script>

<style lang="less" scoped>
.game-board {
  min-height: 100vh;
  padding: 20px 0;
}

.timer-display {
  font-size: 18px;
  font-weight: 600;
  color: #f39c12;
  margin-top: 8px;
}

.next-phase-btn {
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
  margin-right: 16px;
}

.admin-controls {
  margin-top: 8px;
  position: relative;
  
  .btn-tiny {
    padding: 4px 8px;
    font-size: 10px;
    margin: 2px;
  }
  
  .admin-panel {
    position: absolute;
    top: 30px;
    left: 0;
    background: rgba(0, 0, 0, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 12px;
    min-width: 200px;
    z-index: 10;
    
    .role-select {
      width: 100%;
      padding: 4px;
      margin: 4px 0;
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      color: white;
      font-size: 10px;
      
      option {
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 4px;
      }
    }
  }
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  
  .phase-title {
    margin-bottom: 8px;
    font-size: 2rem;
  }
  
  .phase-description {
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
  }
  
  .game-controls {
    display: flex;
    gap: 16px;
    align-items: center;
    
    .phase-controls {
      display: flex;
      gap: 8px;
      
      .btn.active {
        background: #667eea;
        color: white;
      }
    }
  }
}

.game-content {
  display: grid;
  grid-template-columns: 350px 1fr 300px;
  grid-template-rows: auto 1fr;
  gap: 20px;
  grid-template-areas: 
    "role players chat"
    "host players chat";
}

.player-role-section {
  grid-area: role;
  
  .role-display {
    .role-card-mini {
      display: flex;
      gap: 16px;
      padding: 16px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      
      img {
        width: 60px;
        height: 60px;
        border-radius: 6px;
        object-fit: cover;
      }
      
      .role-info {
        flex: 1;
        
        h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
        }
        
        p {
          margin: 0 0 12px 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.4;
        }
        
        .role-goal {
          font-size: 11px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          border-left: 3px solid #667eea;
        }
      }
    }
  }
  
  .no-role {
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
    padding: 20px;
    font-style: italic;
  }
}

.players-section {
  grid-area: players;
  
  .players-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;
    
    .player-card {
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      
      &:hover {
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }
      
      &.voted {
        border-color: #667eea;
        background: rgba(102, 126, 234, 0.2);
      }
      
      &.dead {
        opacity: 0.5;
        filter: grayscale(100%);
      }
      
      &.protected {
        border-color: #2ecc71;
        box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.3);
      }
      
      &.disconnected {
        opacity: 0.6;
        filter: grayscale(50%);
        
        .player-name {
          color: rgba(255, 255, 255, 0.5);
        }
        
        &::before {
          content: 'Отключен';
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 10px;
          color: #f39c12;
          background: rgba(243, 156, 18, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
        }
      }
      
      &.werewolf {
        border-color: #e74c3c;
        background: rgba(231, 76, 60, 0.1);
        
        .player-name {
          color: #e74c3c;
          font-weight: 600;
        }
      }
      
      &.is-self {
        border-color: #667eea;
        background: rgba(102, 126, 234, 0.1);
        
        .player-name {
          color: #667eea;
          font-weight: 600;
        }
        
        &::after {
          content: '(Вы)';
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 10px;
          color: #667eea;
          background: rgba(102, 126, 234, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
        }
      }
      
      .player-avatar {
        position: relative;
        margin-bottom: 12px;
        
        .player-initial {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
          margin: 0 auto;
        }
        
        .vote-count {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #e74c3c;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }
        
        .death-marker, .protection-marker, .disconnected-marker {
          position: absolute;
          bottom: -5px;
          right: -5px;
          font-size: 16px;
        }
        
        .disconnected-marker {
          right: 15px; // Смещаем влево если есть другие маркеры
        }
      }
      
      .player-info {
        .player-name {
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .revealed-role {
          font-size: 12px;
          color: #667eea;
          font-weight: 500;
        }
        
        .artifact-indicator {
          font-size: 10px;
          color: #f39c12;
          background: rgba(243, 156, 18, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 4px;
        }
      }
    }
  }
}

.chat-section {
  grid-area: chat;
}

.host-controls {
  grid-area: host;
  
  .control-section {
    margin-bottom: 20px;
    
    h4 {
      margin-bottom: 8px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .phase-buttons, .night-actions, .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    
    .btn-small {
      padding: 6px 12px;
      font-size: 11px;
    }
  }
}

@media (max-width: 1024px) {
  .game-content {
    grid-template-columns: 1fr;
    grid-template-areas: 
      "role"
      "players"
      "chat"
      "host";
  }
  
  .game-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}

@media (max-width: 768px) {
  .players-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important;
  }
  
  .phase-title {
    font-size: 1.5rem !important;
  }
}
</style>