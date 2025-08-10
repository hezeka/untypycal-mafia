<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="container">
        <div class="header-content">
          <div class="navigation">
            <div class="logo">
              <h1>Нетипичная Мафия</h1>
            </div>
            <div class="vr"></div>
            <a @click="showRolesGuide = true" class="nav-link">
              Роли
            </a>
            <a @click="showRules = true" class="nav-link">
              Правила
            </a>
          </div>
          
          <div class="header-actions" v-if="isInRoom">            
            <div class="room-info">
              <span class="room-id">Комната: {{ roomId }}</span>
              <span class="connection-status" :class="{ connected: isConnected }">
                {{ isConnected ? 'Подключено' : 'Отключено' }}
              </span>
            </div>
            
            <button @click="leaveRoom" class="btn btn-secondary btn-small">
              Покинуть комнату
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="app-main">
      <slot />
    </main>

    <footer class="app-footer" v-if="!isInRoom">
      <div class="container">
        <div class="footer-content">
          <div class="footer-section">
            <h4>О игре</h4>
            <p>Werewolf (Оборотни) - это социальная игра на дедукцию, где жители должны найти оборотней среди них.</p>
          </div>
          
          <div class="footer-section">
            <h4>Как играть</h4>
            <ul>
              <li>Создайте комнату или присоединитесь к существующей</li>
              <li>Ведущий выбирает роли для игры</li>
              <li>Следуйте инструкциям для вашей роли</li>
              <li>Найдите оборотней через обсуждение и голосование</li>
            </ul>
          </div>
          
          <div class="footer-section">
            <h4>Поддержка</h4>
            <p>Если у вас возникли проблемы с игрой, попробуйте обновить страницу или создать новую комнату.</p>
          </div>
        </div>
        
        <div class="footer-bottom">
          <p>&copy; 2024 Нетипичная Мафия. Основано на игре One Night Ultimate Werewolf.</p>
        </div>
      </div>
    </footer>

    <!-- Connection Status Indicator -->
    <div v-if="isInRoom && !isConnected" class="connection-alert">
      <div class="alert-content">
        <span class="alert-icon">⚠️</span>
        <span class="alert-text">Соединение потеряно. Попытка переподключения...</span>
      </div>
    </div>
    
    <!-- Rules Modal -->
    <RulesModal 
      v-if="showRules"
      :is-host="isHost"
      @close="showRules = false"
    />
    
    <!-- Roles Guide Modal -->
    <RolesGuide 
      v-if="showRolesGuide && isInRoom"
      :game-roles="gameRoles"
      :player-role="playerRole"
      @close="showRolesGuide = false"
    />
  </div>
</template>

<script setup>
const { isInRoom, room, gameData, player, isHost } = useGame()
const { isConnected } = useSocket()

const showRules = ref(false)
const showRolesGuide = ref(false)

const roomId = computed(() => room.id)
const gameRoles = computed(() => gameData.selectedRoles)
const playerRole = computed(() => player.role)

const leaveRoom = () => {
  if (confirm('Вы уверены, что хотите покинуть комнату?')) {
    showRolesGuide.value = false
    showRules.value = false
    clearRoom()
    location.reload()
  }
}

const { clearRoom } = useGame()

// Обработка клавиши Escape для закрытия модальных окон
onMounted(() => {
  const handleEscape = (event) => {
    if (event.key === 'Escape') {
      if (showRules.value) {
        showRules.value = false
      } else if (showRolesGuide.value) {
        showRolesGuide.value = false
      }
    }
  }
  
  window.addEventListener('keydown', handleEscape)
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleEscape)
  })
})
</script>

<style lang="less" scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    
    .logo h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      padding-bottom: 6px;
    }

    .navigation {
      display: flex;
      align-items: center;
      justify-content: start;
      gap: 16px;
    }

    .nav-link {
      cursor: pointer;

      &:hover {
        opacity: 1;
        text-decoration: underline;
      }
    }


    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .header-btn {
        white-space: nowrap;
      }
      
      .room-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        font-size: 12px;
        margin: 0 8px;
        
        .room-id {
          font-weight: 500;
          color: #667eea;
        }
        
        .connection-status {
          color: #e74c3c;
          
          &.connected {
            color: #2ecc71;
          }
        }
      }
      
      .btn-small {
        padding: 8px 16px;
        font-size: 12px;
      }
    }
  }
}

.app-main {
  flex: 1;
}

.app-footer {
  background: rgba(0, 0, 0, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 40px 0 20px;
  margin-top: 40px;
  
  .footer-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 30px;
    margin-bottom: 30px;
    
    .footer-section {
      h4 {
        color: #667eea;
        margin-bottom: 12px;
        font-size: 16px;
      }
      
      p, li {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        line-height: 1.5;
      }
      
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        
        li {
          margin-bottom: 8px;
          padding-left: 16px;
          position: relative;
          
          &::before {
            content: '▸';
            position: absolute;
            left: 0;
            color: #667eea;
          }
        }
      }
    }
  }
  
  .footer-bottom {
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
    
    p {
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
      margin: 0;
    }
  }
}

.connection-alert {
  position: fixed;
  top: 80px;
  right: 20px;
  background: rgba(231, 76, 60, 0.9);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: slideIn 0.3s ease;
  
  .alert-content {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .alert-icon {
      font-size: 16px;
    }
    
    .alert-text {
      font-size: 14px;
      font-weight: 500;
    }
  }
}

.btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    transform: translateY(-1px);
  }
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .header-actions {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px !important;
  }
  
  .room-info {
    align-items: center !important;
    text-align: center;
  }
  
  .footer-content {
    grid-template-columns: 1fr !important;
  }
  
  .connection-alert {
    right: 10px;
    left: 10px;
    top: 120px;
  }
  
  .header-btn {
    font-size: 11px !important;
    padding: 6px 12px !important;
  }
}
</style>