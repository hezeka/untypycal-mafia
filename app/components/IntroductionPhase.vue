<template>
  <div class="introduction-phase">
    
    <div class="phase-header">
      <h2 class="phase-title">Фаза знакомства</h2>
      <p class="phase-description">
        Представьтесь друг другу и поделитесь своими подозрениями. 
        Можете называть свои роли правдиво или ложно.
      </p>
    </div>
    
    <div class="phase-content">
      
      <div class="intro-tips">
        <h3>Советы для игроков:</h3>
        <ul class="tips-list">
          <li>Расскажите о своей роли (или солгите о ней)</li>
          <li>Выдвигайте теории о том, кто может быть оборотнем</li>
          <li>Обращайте внимание на поведение других игроков</li>
          <li>Запоминайте, что говорят игроки - потом это пригодится</li>
        </ul>
      </div>
      
      <div class="role-info" v-if="currentPlayer?.role">
        <h3>Ваша роль:</h3>
        <div class="role-card" :class="`team-${playerRole.team}`">
          <div class="role-name">{{ playerRole.name }}</div>
          <div class="role-description">{{ playerRole.description }}</div>
          <div v-if="playerRole.hasNightAction" class="role-hint">
            У вас есть ночное действие
          </div>
        </div>
      </div>
      
      <div class="phase-actions">
        <button 
          v-if="isHost"
          @click="forceNextPhase"
          class="btn btn-primary"
        >
          Пропустить знакомство
        </button>
      </div>
      
    </div>
    
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from '~/composables/useGame'

const { gameState, currentPlayer, getRole, forceNextPhase } = useGame()

const isHost = computed(() => currentPlayer.value?.isHost)

const playerRole = computed(() => {
  if (!currentPlayer.value?.role) return null
  return getRole(currentPlayer.value.role)
})
</script>

<style scoped>
.introduction-phase {
  max-width: 800px;
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
  line-height: 1.6;
  margin: 0;
}

.phase-content {
  display: grid;
  gap: 24px;
}

.intro-tips {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.intro-tips h3 {
  color: #ff6b6b;
  margin: 0 0 16px 0;
  font-size: 1.2rem;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tips-list li {
  color: #ddd;
  padding-left: 20px;
  position: relative;
}

.tips-list li:before {
  content: '•';
  color: #ff6b6b;
  position: absolute;
  left: 0;
  font-weight: bold;
}

.role-info {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.role-info h3 {
  color: #ff6b6b;
  margin: 0 0 16px 0;
  font-size: 1.2rem;
}

.role-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid;
}

.role-name {
  font-size: 1.3rem;
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
}

.phase-actions {
  text-align: center;
  padding-top: 16px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(45deg, #ff6b6b, #ffa500);
  color: #fff;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(255, 107, 107, 0.3);
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

@media (max-width: 768px) {
  .introduction-phase {
    padding: 16px;
  }
  
  .phase-title {
    font-size: 1.8rem;
  }
  
  .intro-tips,
  .role-info {
    padding: 20px;
  }
}
</style>