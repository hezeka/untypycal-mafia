<template>
  <div class="day-phase">
    
    <div class="phase-header">
      <h2 class="phase-title">Дневная фаза</h2>
      <p class="phase-description">
        Обсудите результаты ночи и найдите оборотней
      </p>
    </div>
    
    <div class="phase-content">
      
      <!-- Результаты ночи -->
      <div v-if="nightResults.length > 0" class="night-results">
        <h3>Что произошло прошлой ночью:</h3>
        <div class="results-list">
          <div 
            v-for="result in nightResults" 
            :key="result.id"
            class="result-item"
            :class="result.type"
          >
            {{ result.message }}
          </div>
        </div>
      </div>
      
      <!-- Советы для дневной фазы -->
      <div class="day-tips">
        <h3>Рекомендации:</h3>
        <div class="tips-grid">
          <div class="tip-card">
            <div class="tip-icon">🔍</div>
            <div class="tip-text">
              <strong>Анализируйте</strong><br>
              Ищите противоречия в словах игроков
            </div>
          </div>
          
          <div class="tip-card">
            <div class="tip-icon">💭</div>
            <div class="tip-text">
              <strong>Делитесь информацией</strong><br>
              Рассказывайте что узнали ночью
            </div>
          </div>
          
          <div class="tip-card">
            <div class="tip-icon">🎭</div>
            <div class="tip-text">
              <strong>Наблюдайте</strong><br>
              Следите за поведением других
            </div>
          </div>
          
          <div class="tip-card">
            <div class="tip-icon">⚖️</div>
            <div class="tip-text">
              <strong>Готовьтесь</strong><br>
              Решите за кого будете голосовать
            </div>
          </div>
        </div>
      </div>
      
      <!-- Быстрые действия -->
      <div class="quick-actions">
        <h3>Быстрые действия:</h3>
        <div class="actions-grid">
          <button 
            v-if="isHost"
            @click="forceNextPhase"
            class="action-btn host-action"
          >
            Начать голосование
          </button>
          
          <button 
            @click="openRoleInfo"
            class="action-btn info-action"
          >
            Моя роль
          </button>
          
          <button 
            @click="openPlayerList"
            class="action-btn players-action"
          >
            Список игроков
          </button>
        </div>
      </div>
      
      <!-- Информация о роли игрока -->
      <div v-if="showRoleInfo" class="role-reminder">
        <h3>Ваша роль:</h3>
        <div class="role-card" :class="`team-${playerRole.team}`">
          <div class="role-name">{{ playerRole.name }}</div>
          <div class="role-description">{{ playerRole.description }}</div>
          <div v-if="roleHint" class="role-hint">
            <strong>Совет:</strong> {{ roleHint }}
          </div>
        </div>
        <button @click="showRoleInfo = false" class="close-btn">
          Закрыть
        </button>
      </div>
      
    </div>
    
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGame } from '~/composables/useGame'

const { gameState, currentPlayer, getRole, forceNextPhase } = useGame()

// Local state
const showRoleInfo = ref(false)

// Computed
const isHost = computed(() => currentPlayer.value?.isHost)

const playerRole = computed(() => {
  if (!currentPlayer.value?.role) return null
  return getRole(currentPlayer.value.role)
})

const nightResults = computed(() => {
  // TODO: Получать реальные результаты ночи от сервера
  // Пока возвращаем заглушку
  return [
    {
      id: 1,
      type: 'death',
      message: 'Никто не погиб прошлой ночью'
    }
  ]
})

const roleHint = computed(() => {
  if (!playerRole.value) return ''
  
  const hints = {
    villager: 'Ищите противоречия в заявлениях о ролях. Кто ведет себя подозрительно?',
    seer: 'Поделитесь информацией которую получили ночью, но будьте осторожны',
    werewolf: 'Притворяйтесь жителем. Сеяте подозрения на других игроков',
    robber: 'Помните - теперь у вас новая роль! Играйте за неё'
  }
  
  return hints[playerRole.value.id] || ''
})

// Methods
const openRoleInfo = () => {
  showRoleInfo.value = true
}

const openPlayerList = () => {
  // TODO: Открыть модал со списком игроков
  console.log('Opening player list...')
}
</script>

<style scoped>
.day-phase {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
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

.phase-content {
  display: grid;
  gap: 24px;
}

/* Результаты ночи */
.night-results {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.night-results h3 {
  color: #ffa500;
  margin: 0 0 16px 0;
  font-size: 1.2rem;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 4px solid;
}

.result-item.death {
  border-left-color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

.result-item.protection {
  border-left-color: #4ecdc4;
  background: rgba(78, 205, 196, 0.1);
}

.result-item.info {
  border-left-color: #ffa500;
  background: rgba(255, 165, 0, 0.1);
}

/* Советы */
.day-tips {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.day-tips h3 {
  color: #ff6b6b;
  margin: 0 0 20px 0;
  font-size: 1.2rem;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.tip-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: all 0.3s ease;
}

.tip-card:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.tip-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.tip-text {
  color: #ddd;
  font-size: 0.9rem;
  line-height: 1.4;
}

.tip-text strong {
  color: #fff;
}

/* Быстрые действия */
.quick-actions {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.quick-actions h3 {
  color: #ff6b6b;
  margin: 0 0 16px 0;
  font-size: 1.2rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.action-btn {
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.host-action {
  background: linear-gradient(45deg, #ff6b6b, #ffa500);
  color: #fff;
}

.info-action {
  background: rgba(78, 205, 196, 0.2);
  color: #4ecdc4;
  border: 1px solid #4ecdc4;
}

.players-action {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

/* Информация о роли */
.role-reminder {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.role-reminder h3 {
  color: #ffa500;
  margin: 0 0 16px 0;
  font-size: 1.2rem;
}

.role-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid;
  margin-bottom: 16px;
}

.role-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}

.role-description {
  color: #ddd;
  line-height: 1.5;
  margin-bottom: 8px;
}

.role-hint {
  color: #ffa500;
  font-size: 0.9rem;
  font-style: italic;
  padding: 8px;
  background: rgba(255, 165, 0, 0.1);
  border-radius: 6px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Команды ролей */
.team-village {
  border-left-color: #4ecdc4;
}

.team-werewolf {
  border-left-color: #ff6b6b;
}

.team-tanner {
  border-left-color: #8b4513;
}

.team-special {
  border-left-color: #9370db;
}

.team-cthulhu {
  border-left-color: #8b4513;
}

@media (max-width: 768px) {
  .day-phase {
    padding: 16px;
  }
  
  .phase-title {
    font-size: 1.8rem;
  }
  
  .tips-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
  
  .night-results,
  .day-tips,
  .quick-actions,
  .role-reminder {
    padding: 16px;
  }
}
</style>