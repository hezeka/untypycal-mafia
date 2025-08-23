<template>
  <div class="main-page">
    <!-- Заголовок -->
    <header class="header">
      <div class="container">
        <h1 class="logo">
          НЕТИПИЧКА
        </h1>
        <div class="nav-actions">
          <button class="btn btn-outline" @click="showRulesModal = true">
            Правила
          </button>
          <button class="btn btn-outline" @click="showSettingsModal = true">
            Настройки
          </button>
        </div>
      </div>
    </header>

    <!-- Основной контент -->
    <main class="main-content">
      <div class="container">
        
        <!-- Приветствие -->
        <section class="welcome-section">
          <h2 class="welcome-title">
            Социально-дедуктивная игра
          </h2>
          <p class="welcome-subtitle">
            Основанная на One Night Ultimate Werewolf с циклической структурой
          </p>
        </section>

        <!-- Действия -->
        <section class="actions-section">
          
          <!-- Создание комнаты -->
          <div class="action-card">
            <div class="card-icon">Создать</div>
            <h3 class="card-title">Создать комнату</h3>
            <p class="card-description">
              Станьте ведущим и настройте игру под свой вкус
            </p>
            
            <div class="card-form">
              <div class="form-group">
                <label for="create-username">Ваше имя:</label>
                <input 
                  id="create-username"
                  v-model="createForm.username"
                  type="text"
                  class="form-input"
                  placeholder="Введите имя"
                  maxlength="20"
                  @keyup.enter="handleCreateRoom"
                />
                <div v-if="createForm.error" class="form-error">
                  {{ createForm.error }}
                </div>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input 
                    v-model="createForm.isPrivate"
                    type="checkbox"
                    class="form-checkbox"
                  />
                  <span class="checkbox-text">Приватная комната</span>
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input 
                    v-model="createForm.hostAsObserver"
                    type="checkbox"
                    class="form-checkbox"
                  />
                  <span class="checkbox-text">Ведущий-наблюдатель</span>
                </label>
                <small class="form-help">
                  Вам не будет назначена роль, но вы сможете видеть все действия и управлять игрой
                </small>
              </div>
              
              <button 
                @click="handleCreateRoom"
                :disabled="!canCreateRoom || loading"
                class="btn btn-primary"
              >
                {{ loading ? 'Создание...' : 'Создать' }}
              </button>
            </div>
          </div>

          <!-- Присоединение к комнате -->
          <div class="action-card">
            <div class="card-icon">Войти</div>
            <h3 class="card-title">Присоединиться</h3>
            <p class="card-description">
              Введите код комнаты, которую создал ваш друг
            </p>
            
            <div class="card-form">
              <div class="form-group">
                <label for="join-username">Ваше имя:</label>
                <input 
                  id="join-username"
                  v-model="joinForm.username"
                  type="text"
                  class="form-input"
                  placeholder="Введите имя"
                  maxlength="20"
                />
              </div>
              
              <div class="form-group">
                <label for="room-code">Код комнаты:</label>
                <input 
                  id="room-code"
                  v-model="joinForm.roomCode"
                  type="text"
                  class="form-input room-code-input"
                  placeholder="ABC123"
                  maxlength="6"
                  @input="formatRoomCode"
                  @keyup.enter="handleJoinRoom"
                />
                <div v-if="joinForm.error" class="form-error">
                  {{ joinForm.error }}
                </div>
              </div>
              
              <button 
                @click="handleJoinRoom"
                :disabled="!canJoinRoom || loading"
                class="btn btn-secondary"
              >
                {{ loading ? 'Подключение...' : 'Присоединиться' }}
              </button>
            </div>
          </div>

        </section>

        <!-- Информация об игре -->
        <section class="info-section">
          <div class="info-grid">
            
            <div class="info-card">
              <div class="info-icon">Знакомство</div>
              <h4 class="info-title">Фаза знакомства</h4>
              <p class="info-text">
                3 минуты на представление и обсуждение подозрений
              </p>
            </div>
            
            <div class="info-card">
              <div class="info-icon">Ночь</div>
              <h4 class="info-title">Ночные действия</h4>
              <p class="info-text">
                Роли автоматически выполняют свои способности
              </p>
            </div>
            
            <div class="info-card">
              <div class="info-icon">День</div>
              <h4 class="info-title">Дневное обсуждение</h4>
              <p class="info-text">
                5 минут на анализ и поиск оборотней
              </p>
            </div>
            
            <div class="info-card">
              <div class="info-icon">Голосование</div>
              <h4 class="info-title">Голосование</h4>
              <p class="info-text">
                Исключение подозрительного игрока большинством голосов
              </p>
            </div>
            
            <div class="info-card">
              <div class="info-icon">Циклы</div>
              <h4 class="info-title">Циклы</h4>
              <p class="info-text">
                Игра продолжается до выполнения условий победы
              </p>
            </div>
            
            <div class="info-card">
              <div class="info-icon">Победа</div>
              <h4 class="info-title">Победа</h4>
              <p class="info-text">
                Деревня, оборотни или неудачник - у каждого свои цели
              </p>
            </div>
            
          </div>
        </section>

        <!-- Статистика -->
        <section class="stats-section">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-number">{{ onlineCount }}</div>
              <div class="stat-label">Игроков онлайн</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ activeRooms }}</div>
              <div class="stat-label">Активных игр</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ availableRoles }}</div>
              <div class="stat-label">Доступных ролей</div>
            </div>
          </div>
        </section>

      </div>
    </main>

    <!-- Модалы -->
    <RulesModal 
      v-if="showRulesModal"
      @close="showRulesModal = false"
    />
    
    <SettingsModal 
      v-if="showSettingsModal"
      @close="showSettingsModal = false"
    />

    <!-- Индикатор подключения -->
    <ConnectionStatus />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGame } from '~/composables/useGame'
import { useSocket } from '~/composables/useSocket'

const router = useRouter()
const { 
  createRoom, 
  joinRoom, 
  loading, 
  error, 
  gameState, 
  initSocketListeners 
} = useGame()
const { initSocket, isConnected } = useSocket()

// Refs
const showRulesModal = ref(false)
const showSettingsModal = ref(false)

// Формы
const createForm = ref({
  username: '',
  isPrivate: false,
  hostAsObserver: false,
  error: null
})

const joinForm = ref({
  username: '',
  roomCode: '',
  error: null
})

// Статистика (заглушки)
const onlineCount = ref(42)
const activeRooms = ref(8)
const availableRoles = ref(20)

// Computed
const canCreateRoom = computed(() => {
  return createForm.value.username.trim().length >= 2 && isConnected.value
})

const canJoinRoom = computed(() => {
  return joinForm.value.username.trim().length >= 2 && 
         joinForm.value.roomCode.length === 6 && 
         isConnected.value
})

// Методы
const formatRoomCode = () => {
  joinForm.value.roomCode = joinForm.value.roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const handleCreateRoom = async () => {
  if (!canCreateRoom.value) return
  
  createForm.value.error = null
  
  try {
    createRoom(createForm.value.username, createForm.value.isPrivate, createForm.value.hostAsObserver)
  } catch (err) {
    createForm.value.error = err.message
  }
}

const handleJoinRoom = async () => {
  if (!canJoinRoom.value) return
  
  joinForm.value.error = null
  
  try {
    joinRoom(joinForm.value.roomCode, joinForm.value.username)
  } catch (err) {
    joinForm.value.error = err.message
  }
}

// Инициализация
onMounted(() => {
  initSocket()
  initSocketListeners()
})

// Переход в комнату после создания/присоединения
watch(() => gameState.room.id, (newRoomId) => {
  if (newRoomId) {
    router.push(`/game/${newRoomId}`)
  }
})

// Очистка ошибок при изменении полей
watch(() => createForm.value.username, () => {
  createForm.value.error = null
})

watch(() => [joinForm.value.username, joinForm.value.roomCode], () => {
  joinForm.value.error = null
})
</script>

<style scoped>
/* Основные стили */
.main-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  color: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Заголовок */
.header {
  padding: 20px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(45deg, #ff6b6b, #ffa500);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-actions {
  display: flex;
  gap: 12px;
}

/* Основной контент */
.main-content {
  padding: 60px 0;
}

/* Приветствие */
.welcome-section {
  text-align: center;
  margin-bottom: 60px;
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: 600;
  margin: 0 0 16px 0;
  background: linear-gradient(45deg, #ffffff, #cccccc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-subtitle {
  font-size: 1.2rem;
  color: #888;
  margin: 0;
}

/* Действия */
.actions-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
  margin-bottom: 80px;
}

.action-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.action-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.card-icon {
  font-size: 1.2rem;
  font-weight: 600;
  color: #ff6b6b;
  text-align: center;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  text-align: center;
}

.card-description {
  color: #ccc;
  text-align: center;
  margin: 0 0 32px 0;
  line-height: 1.5;
}

.card-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Формы */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #ddd;
}

.form-input {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #ff6b6b;
  background: rgba(255, 255, 255, 0.15);
}

.form-input::placeholder {
  color: #888;
}

.room-code-input {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 600;
  text-align: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.form-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #ff6b6b;
}

.form-error {
  color: #ff6b6b;
  font-size: 0.9rem;
  margin-top: 4px;
}

.form-help {
  color: #999;
  font-size: 0.8rem;
  margin-top: 4px;
  line-height: 1.3;
}

/* Кнопки */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(45deg, #ff6b6b, #ffa500);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(255, 107, 107, 0.3);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: #ddd;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Информация */
.info-section {
  margin-bottom: 60px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.info-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.3s ease;
}

.info-card:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}

.info-icon {
  font-size: 1rem;
  font-weight: 600;
  color: #ff6b6b;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.info-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.info-text {
  color: #aaa;
  margin: 0;
  line-height: 1.4;
}

/* Статистика */
.stats-section {
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 24px;
  max-width: 600px;
  margin: 0 auto;
}

.stat-item {
  padding: 20px;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: #ff6b6b;
  margin-bottom: 8px;
}

.stat-label {
  color: #ccc;
  font-size: 0.9rem;
}

/* Адаптивность */
@media (max-width: 768px) {
  .actions-section {
    grid-template-columns: 1fr;
  }
  
  .welcome-title {
    font-size: 2rem;
  }
  
  .welcome-subtitle {
    font-size: 1rem;
  }
  
  .action-card {
    padding: 24px;
  }
  
  .info-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
  
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 480px) {
  .header .container {
    flex-direction: column;
    gap: 16px;
  }
  
  .container {
    padding: 0 16px;
  }
  
  .welcome-title {
    font-size: 1.8rem;
  }
  
  .action-card {
    padding: 20px;
  }
}
</style>