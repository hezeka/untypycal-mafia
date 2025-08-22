<template>
  <div class="game-page">
    
    <!-- Заголовок игры -->
    <header class="game-header">
      <div class="header-left">
        <h1 class="game-title">
          НЕТИПИЧКА
        </h1>
        <div class="room-info">
          <span class="room-code">{{ gameState.room.id }}</span>
          <span class="phase-indicator">{{ currentPhase }}</span>
        </div>
      </div>
      
      <div class="header-right">
        <div v-if="gameState.timer.active" class="timer">
          {{ formatTime(gameState.timer.remaining) }}
        </div>
        
        <div class="connection-status" :class="{ 'connected': isConnected }">
          <span class="status-dot"></span>
        </div>
        
        <button @click="showGameMenu = true" class="menu-btn">
          Меню
        </button>
      </div>
    </header>

    <!-- Основная игровая область -->
    <main class="game-main">
      
      <!-- Фаза настройки -->
      <GameSetup 
        v-if="gameState.room.phase === 'setup'"
        @start-game="startGame"
      />
      
      <!-- Фаза знакомства -->
      <IntroductionPhase 
        v-else-if="gameState.room.phase === 'introduction'"
      />
      
      <!-- Ночная фаза -->
      <NightPhase 
        v-else-if="gameState.room.phase === 'night'"
      />
      
      <!-- Дневная фаза -->
      <DayPhase 
        v-else-if="gameState.room.phase === 'day'"
      />
      
      <!-- Фаза голосования -->
      <VotingPhase 
        v-else-if="gameState.room.phase === 'voting'"
        @vote="handleVote"
      />
      
      <!-- Завершение игры -->
      <GameEndPhase 
        v-else-if="gameState.room.phase === 'ended'"
      />
      
    </main>

    <!-- Боковая панель -->
    <aside class="game-sidebar">
      
      <!-- Список игроков -->
      <PlayersList />
      
      <!-- Чат -->
      <GameChat />
      
    </aside>

    <!-- Модалы (TODO: добавить при необходимости) -->
    
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '~/composables/useGame'
import { useSocket } from '~/composables/useSocket'

const route = useRoute()
const router = useRouter()
const { 
  gameState, 
  startGame, 
  votePlayer, 
  formatTime, 
  initSocketListeners 
} = useGame()
const { isConnected } = useSocket()

// Computed
const currentPhase = computed(() => {
  const phases = {
    setup: 'Настройка',
    introduction: 'Знакомство',
    night: 'Ночь',
    day: 'День',
    voting: 'Голосование',
    ended: 'Завершено'
  }
  
  return phases[gameState.room.phase] || 'Неизвестно'
})

// Методы
const handleVote = (targetId) => {
  votePlayer(targetId)
}

// Инициализация
onMounted(() => {
  initSocketListeners()
  
  // Если нет активной игры - перенаправляем на главную
  if (!gameState.room.id) {
    router.push('/')
  }
})
</script>

<style scoped>
.game-page {
  height: 100vh;
  display: grid;
  grid-template-columns: 1fr 400px;
  grid-template-rows: auto 1fr;
  grid-template-areas: 
    "header header"
    "main sidebar";
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  color: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Заголовок */
.game-header {
  grid-area: header;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.game-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(45deg, #ff6b6b, #ffa500);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.room-code {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 1.1rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 12px;
  border-radius: 6px;
  letter-spacing: 2px;
}

.phase-indicator {
  font-size: 0.9rem;
  color: #ff6b6b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.timer {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffa500;
  background: rgba(255, 165, 0, 0.1);
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 165, 0, 0.3);
}

.connection-status {
  display: flex;
  align-items: center;
  padding: 6px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff4444;
  transition: background 0.3s ease;
}

.connection-status.connected .status-dot {
  background: #44ff44;
}

.menu-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.menu-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Основная область */
.game-main {
  grid-area: main;
  padding: 24px;
  overflow-y: auto;
}

/* Боковая панель */
.game-sidebar {
  grid-area: sidebar;
  background: rgba(255, 255, 255, 0.03);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
}

/* Адаптивность */
@media (max-width: 1024px) {
  .game-page {
    grid-template-columns: 1fr;
    grid-template-areas: 
      "header"
      "main"
      "sidebar";
  }
  
  .game-sidebar {
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
}

@media (max-width: 768px) {
  .game-header {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }
  
  .header-left,
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .room-info {
    gap: 12px;
  }
  
  .game-main {
    padding: 16px;
  }
}
</style>