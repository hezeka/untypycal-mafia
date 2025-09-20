<template>
  <div class="night-phase">
    
    <div class="phase-header">
      <h2 class="phase-title">Ночная фаза</h2>
      <p class="phase-description">
        Игроки с ночными способностями выполняют свои действия
      </p>
    </div>
    
    <div class="phase-content">
      
      <!-- Для игроков с ночными действиями -->
      <div v-if="hasNightAction" class="night-action-panel">
        <h3>Ваше ночное действие:</h3>
        
        <div class="role-action" :class="`team-${playerRole.team}`">
          <div class="action-title">{{ playerRole.name }}</div>
          <div class="action-description">{{ getNightActionDescription() }}</div>
          
          <!-- Интерфейс действия роли -->
          <component 
            :is="getRoleActionComponent()"
            v-if="getRoleActionComponent()"
            @action="handleNightAction"
          />
          
        </div>
      </div>
      
      <!-- Для остальных игроков -->
      <div v-else class="night-wait-panel">
        <div class="wait-message">
          <h3>Ночь...</h3>
          <p>Дождитесь пока игроки с ночными способностями завершат свои действия</p>
          
          <div class="night-atmosphere">
            <div class="moon">🌙</div>
            <div class="stars">
              <div class="star" v-for="i in 6" :key="i"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Информация о ночном порядке -->
      <div class="night-order-info">
        <h4>Порядок ночных действий:</h4>
        <div class="order-list">
          <div 
            v-for="role in nightRoles" 
            :key="role.id"
            class="order-item"
            :class="{ 'active': role.id === currentNightRole }"
          >
            {{ role.name }}
          </div>
        </div>
      </div>
      
    </div>
    
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '~/composables/useGame'

const { gameState, currentPlayer, getRole } = useGame()

const playerRole = computed(() => {
  if (!currentPlayer.value?.role) return null
  return getRole(currentPlayer.value.role)
})

const hasNightAction = computed(() => {
  return playerRole.value && playerRole.value.hasNightAction
})

const nightRoles = computed(() => {
  // Получаем все роли с ночными действиями в правильном порядке
  const roles = []
  
  gameState.room.players.forEach(player => {
    if (player.alive && player.role) {
      const role = getRole(player.role)
      if (role && role.hasNightAction) {
        roles.push({
          id: player.role,
          name: role.name,
          playerId: player.id
        })
      }
    }
  })
  
  // Сортируем по ночному порядку (в реальности это будет из constants)
  const nightOrder = {
    seer: 1,
    robber: 2,
    troublemaker: 3,
    werewolf: 4
  }
  
  return roles.sort((a, b) => (nightOrder[a.id] || 999) - (nightOrder[b.id] || 999))
})

const currentNightRole = computed(() => {
  // TODO: Получать текущую активную роль от сервера
  return null
})

// Методы
const getNightActionDescription = () => {
  if (!playerRole.value) return ''
  
  const descriptions = {
    seer: 'Выберите игрока для проверки роли или посмотрите карты из центра',
    robber: 'Выберите игрока для обмена ролями',
    werewolf: 'Найдите других оборотней и выберите жертву',
    troublemaker: 'Поменяйте роли двух игроков местами'
  }
  
  return descriptions[playerRole.value.id] || 'Выполните ваше ночное действие'
}

const getRoleActionComponent = () => {
  if (!playerRole.value) return null
  
  // TODO: Создать компоненты для каждой роли
  // const components = {
  //   seer: 'SeerAction',
  //   robber: 'RobberAction',
  //   werewolf: 'WerewolfAction'
  // }
  
  // return components[playerRole.value.id] || null
  
  // Пока возвращаем простой интерфейс
  return 'SimpleNightAction'
}

const handleNightAction = (action) => {
  console.log('Night action:', action)
  // TODO: Отправить действие на сервер
}
</script>

<style scoped>
.night-phase {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 16px;
  min-height: 400px;
}

.phase-header {
  text-align: center;
  margin-bottom: 32px;
}

.phase-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #fff;
}

.phase-description {
  color: #ccc;
  font-size: 1.1rem;
  margin: 0;
}

.night-action-panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.night-action-panel h3 {
  color: #ffa500;
  margin: 0 0 20px 0;
  font-size: 1.3rem;
}

.role-action {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid;
}

.action-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}

.action-description {
  color: #ddd;
  margin-bottom: 16px;
  line-height: 1.5;
}

.night-wait-panel {
  text-align: center;
  padding: 40px 20px;
}

.wait-message h3 {
  color: #fff;
  font-size: 1.5rem;
  margin: 0 0 16px 0;
}

.wait-message p {
  color: #ccc;
  font-size: 1.1rem;
  margin: 0 0 32px 0;
}

.night-atmosphere {
  position: relative;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.moon {
  font-size: 4rem;
  animation: glow 3s ease-in-out infinite alternate;
}

@keyframes glow {
  from { filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3)); }
  to { filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.6)); }
}

.stars {
  position: absolute;
  width: 100%;
  height: 100%;
}

.star {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #fff;
  border-radius: 50%;
  animation: twinkle 2s ease-in-out infinite;
}

.star:nth-child(1) { top: 20%; left: 20%; animation-delay: 0s; }
.star:nth-child(2) { top: 30%; right: 15%; animation-delay: 0.5s; }
.star:nth-child(3) { top: 10%; right: 30%; animation-delay: 1s; }
.star:nth-child(4) { bottom: 20%; left: 15%; animation-delay: 1.5s; }
.star:nth-child(5) { bottom: 30%; right: 20%; animation-delay: 2s; }
.star:nth-child(6) { top: 40%; left: 40%; animation-delay: 2.5s; }

@keyframes twinkle {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

.night-order-info {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.night-order-info h4 {
  color: #ffa500;
  margin: 0 0 12px 0;
  font-size: 1rem;
}

.order-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.order-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #ccc;
  transition: all 0.3s ease;
}

.order-item.active {
  background: #ffa500;
  color: #000;
  font-weight: 600;
}

/* Команды ролей */
.team-village {
  border-left-color: #4ecdc4;
}

.team-werewolf {
  border-left-color: #ff6b6b;
}

.team-special {
  border-left-color: #9370db;
}

.team-cthulhu {
  border-left-color: #8b4513;
}

@media (max-width: 768px) {
  .night-phase {
    padding: 16px;
    margin: 10px;
  }
  
  .phase-title {
    font-size: 1.8rem;
  }
  
  .night-action-panel {
    padding: 20px;
  }
  
  .moon {
    font-size: 3rem;
  }
  
  .order-list {
    flex-direction: column;
  }
}
</style>