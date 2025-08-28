<template>
  <div class="main-page">
    <div style="border-bottom: 1px solid rgba(131, 131, 131, 0.06);">
      <div class="container">
        <header class="game-header main-header" style="border: none; flex-direction: row !important;">
        
          <!-- Левая часть: логотип + навигация -->
          <div class="header-left">
            <a href="/" class="logo-section">
              <img src="/images/logo.png" alt="Нетипичка" class="logo-img" />
              <h1 class="logo-text">НЕТИПИЧКА</h1>
            </a>
            
            <nav class="header-nav">
              <a @click="showRoles = true" class="nav-button">Роли</a>
              <a @click="showRules = true" class="nav-button">Правила</a>
            </nav>
          </div>
          
          <!-- Правая часть: [Мьют звука | Мьют микро | разделитель | статус + код | Покинуть] -->
          <div class="header-right">
            <div class="game-controls">
              <!-- Аудио контроли -->
              <button @click="toggleSound" class="control-btn sound" :class="{ active: soundEnabled }">
              </button>
              
              <!-- <div class="microphone-container">
                <button 
                  @click="toggleMicrophone" 
                  @mouseenter="showMicSettings = true"
                  @mouseleave="showMicSettings = false"
                  class="control-btn microphone" 
                  :class="{ 
                    active: vadEnabled && isListening, 
                    detecting: isDetecting && vadEnabled && isListening 
                  }"
                >
                  <div v-if="isDetecting && vadEnabled && isListening" class="voice-indicator">
                    <div class="voice-waves">
                      <div class="voice-wave"></div>
                      <div class="voice-wave"></div>
                      <div class="voice-wave"></div>
                    </div>
                  </div>
                </button>
                
                <SettingsModal 
                  v-if="showMicSettings"
                  @close="showMicSettings = false"
                  @mouseenter="showMicSettings = true"
                  @mouseleave="showMicSettings = false"
                  class="hover-settings-modal"
                />
              </div>
              
              <div class="control-separator"></div> -->
              
              <div class="user-panel">
                <div class="user-info">
                  <span class="username">{{ username || 'Гость' }}</span>
                  <button @click="showUsernameModal = true" class="change-username-btn">
                    {{ username ? 'Сменить' : 'Установить' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
        </header>
      </div>
    </div>
    

    <!-- Основной контент -->
    <main class="main-content">
      
      <!-- Hero секция -->
      <section class="hero-section">
        <div class="hero-content">
          <h1 class="hero-title">Нетипичная Мафия</h1>
          <p class="hero-subtitle">
            Социально-дедукционная игра для 3-10 игроков. Найдите оборотней среди жителей деревни или обманите всех, скрывая свою истинную сущность.
          </p>
          <div class="hero-stats">
            <div class="stat-item">
              <span class="stat-number">3-10</span>
              <span class="stat-label">игроков</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">10-20</span>
              <span class="stat-label">минут</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">20+</span>
              <span class="stat-label">ролей</span>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Основные действия -->
      <section class="actions-section">
        <div class="actions-grid">
          
          <!-- Создание комнаты -->
          <div class="action-card create-card">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <h3>Создать игру</h3>
            <p>Станьте ведущим и настройте игру по своему вкусу</p>
            
            <div class="room-options">
              <label class="checkbox-label">
                <input type="checkbox" v-model="createOptions.isPrivate" />
                <span class="checkmark"></span>
                Приватная комната
              </label>
              
              <label class="checkbox-label">
                <input type="checkbox" v-model="createOptions.hostAsObserver" />
                <span class="checkmark"></span>
                Ведущий-наблюдатель
              </label>
            </div>
            
            <button 
              @click="createRoom"
              :disabled="!canCreateRoom || loading"
              class="action-button primary"
            >
              {{ loading ? 'Создание...' : 'Создать комнату' }}
            </button>
          </div>
          
          <!-- Присоединение к игре -->
          <div class="action-card join-card">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M20 8V14M23 11H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3>Присоединиться</h3>
            <p>Введите код комнаты, чтобы подключиться к игре</p>
            
            <div class="join-input-group">
              <input 
                v-model="joinRoomCode"
                @keypress.enter="joinRoom"
                type="text"
                placeholder="Код комнаты (6 символов)"
                maxlength="6"
                class="room-code-input"
              />
              <button 
                @click="joinRoom"
                :disabled="!canJoinRoom || loading"
                class="action-button secondary"
              >
                Войти
              </button>
            </div>
          </div>
          
        </div>
      </section>
      
      <!-- Публичные комнаты -->
      <section class="public-rooms-section">
        <div class="section-header">
          <h2>Публичные игры</h2>
          <button @click="refreshPublicRooms" class="refresh-button" :disabled="refreshing">
            <svg class="refresh-icon" :class="{ spinning: refreshing }" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M23 4V10H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M1 20V14H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20.49 9C19.9828 7.56678 19.1209 6.28392 17.9845 5.27304C16.8482 4.26216 15.4745 3.55682 13.9917 3.21873C12.5089 2.88063 10.9652 2.92142 9.5045 3.33674C8.04375 3.75206 6.71573 4.52637 5.64 5.59L1 10M23 14L18.36 18.41C17.2843 19.4836 15.9563 20.2579 14.4955 20.6733C13.0348 21.0886 11.4911 21.1294 10.0083 20.7913C8.52547 20.4532 7.1518 19.7478 6.01547 18.737C4.87913 17.7261 4.01717 16.4432 3.51 15.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Обновить
          </button>
        </div>
        
        <div v-if="publicRooms.length === 0" class="no-rooms-state">
          <div class="no-rooms-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3>Нет активных игр</h3>
          <p>Сейчас нет открытых публичных комнат. Создайте свою игру первым!</p>
        </div>
        
        <div v-else class="rooms-grid">
          <div 
            v-for="room in publicRooms" 
            :key="room.id"
            @click="quickJoinRoom(room.id)"
            class="room-card"
          >
            <div class="room-header">
              <div class="room-title">
                <h4>{{ room.id }}</h4>
                <!-- <span class="room-code">{{ room.id }}</span> -->
              </div>
              <span class="room-phase" :class="`phase-${room.phase}`">
                {{ getPhaseDisplayName(room.phase) }}
                <span v-if="room.phase !== 'setup' && room.phase !== 'ended' && room.daysSurvived" class="days-counter">
                  (день {{ room.daysSurvived }})
                </span>
              </span>
            </div>
            
            <div class="room-info">
              <div class="info-row">
                <span class="info-label">Ведущий:</span>
                <span class="info-value">{{ room.hostName }}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">Игроков:</span>
                <span class="info-value players-count">
                  <span class="alive-count">{{ room.alivePlayers }}</span>
                  /
                  <span class="total-count">{{ room.totalPlayers }}</span>
                </span>
              </div>
            </div>
            
            <div class="room-footer">
              <button class="join-room-card-btn">
                Присоединиться
              </button>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Информация об игре -->
      <section class="game-info-section">
        <div class="info-content">
          <h2>О чём эта игра?</h2>
          <p>
            Нетипичная Мафия смесь популярной настольной игры One Night Ultimate Werewolf и обычной мафии. Игра использует тех же персонажей, но в отличии от ONUW игроки знают свои роли, а фазы цикличны.
          </p>
          
          <div class="info-actions">
            <button @click="showRules = true" class="info-button primary">
              Правила игры
            </button>
            <button @click="showRoles = true" class="info-button secondary">
              Библиотека ролей
            </button>
          </div>
        </div>
      </section>
      
    </main>

    <!-- Футер -->
    <footer class="main-footer">
      <p>
        Проект некоммерческий, разработан в 2025 году. 
        Основан на настольной игре One Night Ultimate Werewolf.
      </p>
    </footer>

    <!-- Модальные окна -->
    <UsernameModal 
      v-if="showUsernameModal"
      :current-username="username"
      @save="handleUsernameSave"
      @close="showUsernameModal = false"
    />
    
    <RulesModal 
      v-if="showRules"
      @close="showRules = false"
    />
    
    <RolesLibraryModal 
      v-if="showRoles"
      @close="showRoles = false"
    />
    
    <!-- Уведомления об ошибках -->
    <div v-if="error" @click="error = null" class="error-notification">
      {{ error }}
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from '#app'
import { useGame } from '~/composables/useGame'
import { useUser } from '~/composables/useUser'
import { useAPI } from '~/composables/useAPI'
import RolesLibraryModal from '~/components/RolesLibraryModal.vue'

const router = useRouter()
const { 
  createRoom: createGameRoom, 
  joinRoom: joinGameRoom, 
  loading, 
  gameState,
  initSocketListeners
} = useGame()

const { username, setUsername } = useUser()

// Reactive state
const createOptions = ref({
  isPrivate: false,
  hostAsObserver: false
})

const joinRoomCode = ref('')
const publicRooms = ref([])
const refreshing = ref(false)
const error = ref(null)

// Modal state
const showUsernameModal = ref(false)
const showRules = ref(false)
const showRoles = ref(false)

// Computed properties
const canCreateRoom = computed(() => {
  return username.value && username.value.trim().length >= 2 && !loading.value
})

const canJoinRoom = computed(() => {
  return username.value && joinRoomCode.value.trim().length === 6 && !loading.value
})

// Methods
const createRoom = async () => {
  if (!canCreateRoom.value) {
    if (!username.value) {
      showUsernameModal.value = true
      return
    }
    return
  }
  
  try {
    error.value = null
    await createGameRoom(
      username.value.trim(),
      createOptions.value.isPrivate,
      createOptions.value.hostAsObserver
    )
    
    // Переход будет выполнен автоматически через socket listener
  } catch (err) {
    error.value = err.message || 'Ошибка создания комнаты'
  }
}

const joinRoom = async () => {
  if (!canJoinRoom.value) {
    if (!username.value) {
      showUsernameModal.value = true
      return
    }
    return
  }
  
  try {
    error.value = null
    const roomCode = joinRoomCode.value.toUpperCase().trim()
    await joinGameRoom(roomCode, username.value.trim())
    
    // Выполняем переход на игровую страницу
    router.push(`/game/${roomCode}`)
  } catch (err) {
    error.value = err.message || 'Ошибка подключения к комнате'
  }
}

const quickJoinRoom = (roomId) => {
  joinRoomCode.value = roomId
  joinRoom()
}

const handleUsernameSave = (newUsername) => {
  setUsername(newUsername)
  showUsernameModal.value = false
}

const getPhaseDisplayName = (phase) => {
  const phases = {
    setup: 'Подбор',
    introduction: 'Знакомство',
    night: 'Ночь',
    day: 'День',
    voting: 'Голосование',
    ended: 'Завершена'
  }
  return phases[phase] || phase
}

// Socket listeners для автоматического перехода на игровую страницу
const handleRoomCreated = (data) => {
  router.push(`/game/${data.room.id}`)
}

const handleJoinSuccess = (data) => {
  router.push(`/game/${data.room.id}`)
}

// Получение списка публичных комнат
const fetchPublicRooms = async () => {
  try {
    refreshing.value = true
    const api = useAPI()
    const rooms = await api.getPublicRooms()
    publicRooms.value = rooms
  } catch (err) {
    console.error('Error fetching public rooms:', err)
    error.value = 'Не удалось загрузить список комнат'
  } finally {
    refreshing.value = false
  }
}

// Обновление списка публичных комнат вручную
const refreshPublicRooms = async () => {
  await fetchPublicRooms()
}

// Lifecycle
onMounted(() => {
  initSocketListeners()
  
  // Подписываемся на события создания/подключения к комнате
  // TODO: Добавить эти события в useGame
  
  fetchPublicRooms()
  
  // Обновляем список каждые 30 секунд
  const interval = setInterval(fetchPublicRooms, 30000)
  
  onUnmounted(() => {
    clearInterval(interval)
  })
})

// Если игрок не ввел имя - показываем модал при загрузке
onMounted(() => {
  if (!username.value) {
    showUsernameModal.value = true
  }
})
</script>

<style scoped>
.main-page {
  min-height: 100vh;
  /* background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%); */
  color: #ffffff;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Hero Section */
.hero-section {
  padding: 80px 0 60px;
  text-align: center;
  background: radial-gradient(circle at center, rgb(205 113 78 / 10%) 0%, transparent 70%);
  border-bottom: 1px solid #ffae9514;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #cd674e 0%, #a07344 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.25rem;
  line-height: 1.6;
  color: #a0a0a0;
  margin-bottom: 40px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 800;
  color: #4ecdc4;
  margin-bottom: 4px;
  color: #cda14e;
}

.stat-label {
  font-size: 0.9rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Actions Section */
.actions-section {
  padding: 60px 0;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 32px;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
}

.action-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.action-card:hover {
  transform: translateY(-4px);
  border-color: rgba(231, 161, 41, 0.3);
  box-shadow: 0 20px 40px rgba(214, 203, 52, 0.1);
}

.card-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #ffb43c26 0%, #bf581c0b 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffb33c;
}

.card-icon svg {
  width: 32px;
  height: 32px;
}

.action-card h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: #ffffff;
}

.action-card p {
  color: #a0a0a0;
  margin-bottom: 24px;
  line-height: 1.5;
}

.room-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
  text-align: left;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 0.95rem;
  color: #d0d0d0;
}

.checkbox-label input[type="checkbox"] {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  position: relative;
  transition: all 0.2s ease;
}

.checkbox-label:hover .checkmark {
  border-color: #ba4400;
}

.checkbox-label input:checked ~ .checkmark {
  background: #ba4400;
  border-color: #ba4400;
}

.checkbox-label input:checked ~ .checkmark::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.join-input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.room-code-input {
  flex: 1;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #ffffff;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-align: center;
}

.room-code-input::placeholder {
  color: #666;
}

.room-code-input:focus {
  outline: none;
  border-color: #4ecdc4;
  box-shadow: 0 0 0 2px rgba(78, 205, 196, 0.2);
}

.action-button {
  padding: 14px 28px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.action-button.primary {
  background: linear-gradient(135deg, #ffb300 0%, #f55b00 100%);
  color: white;
}

.action-button.primary:hover:not(:disabled) {
  box-shadow: 0 3px 20px rgba(244, 150, 0, 0.2);
}

.action-button.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-button.secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: #cda74e;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Public Rooms Section */
.public-rooms-section {
  padding-bottom: 56px;
  /* background: rgba(0, 0, 0, 0.2); */
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 0 20px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.section-header h2 {
  font-size: 2rem;
  font-weight: 800;
  color: #ffffff;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 149, 44, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #a0a0a0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.031);
  border-color: #be701653;
  color: #fac532;
}

.refresh-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.6s ease;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.no-rooms-state {
  text-align: center;
  padding: 80px 20px;
  max-width: 600px;
  margin: 0 auto;
}

.no-rooms-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  opacity: 0.3;
}

.no-rooms-state h3 {
  font-size: 1.5rem;
  color: #ffffff;
  margin-bottom: 12px;
}

.no-rooms-state p {
  color: #888;
  line-height: 1.6;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  padding: 0 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.room-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.room-card:hover {
  transform: translateY(-2px);
  border-color: rgba(224, 112, 0, 0.3);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.room-title h4 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 4px 0;
}

.room-code {
  font-size: 0.85rem;
  color: #888;
  font-family: monospace;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}

.room-phase {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.room-phase.phase-setup { background: rgba(156, 163, 175, 0.2); color: #9CA3AF; }
.room-phase.phase-introduction { background: rgba(59, 130, 246, 0.2); color: #3B82F6; }
.room-phase.phase-night { background: rgba(99, 102, 241, 0.2); color: #6366F1; }
.room-phase.phase-day { background: rgba(245, 158, 11, 0.2); color: #F59E0B; }
.room-phase.phase-voting { background: rgba(239, 68, 68, 0.2); color: #EF4444; }
.room-phase.phase-ended { background: rgba(34, 197, 94, 0.2); color: #22C55E; }

.days-counter {
  opacity: 0.7;
  font-weight: normal;
}

.room-info {
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.info-label {
  color: #888;
  font-size: 0.9rem;
}

.info-value {
  color: #ffffff;
  font-weight: 500;
  font-size: 0.9rem;
}

.players-count .alive-count {
  color: #4CAF50;
}

.players-count .total-count {
  color: #888;
}

.room-footer {
  text-align: center;
}

.join-room-card-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, transparent 0%, #8e32131e 100%);
  background-color: #f0a0270f;
  border: none;
  border-radius: 8px;
  color: rgb(255, 160, 27);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.join-room-card-btn:hover {
  /* transform: translateY(-1px); */
  background-color: #ee91061e;
}

/* Game Info Section */
.game-info-section {
  padding: 60px 0;
  background: rgba(255, 255, 255, 0.02);
}

.info-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
  text-align: center;
}

.info-content h2 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: #ffffff;
}

.info-content p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #a0a0a0;
  margin-bottom: 32px;
}

.info-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.info-button {
  padding: 14px 28px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.info-button.primary {
  background: linear-gradient(135deg, #fcb441 0%, #b7290d 100%);
  color: white;
}

.info-button.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(213, 148, 16, 0.3);
}

.info-button.secondary {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.info-button.secondary:hover {
  background: rgba(148, 96, 44, 0.1);
  border-color: #cda14e;
}

/* Footer */
.main-footer {
  padding: 40px 0;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: #666;
}

/* Error notification */
.error-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #ef4444;
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  cursor: pointer;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Responsive */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-stats {
    gap: 20px;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .rooms-grid {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .join-input-group {
    flex-direction: column;
  }
  
  .info-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>