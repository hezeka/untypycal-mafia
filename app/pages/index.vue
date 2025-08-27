<template>
  <div class="main-page">

    <div class="container">
      <header class="game-header main-header">
      
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
            
            <div class="microphone-container">
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
              
              <!-- Settings Modal on hover -->
              <SettingsModal 
                v-if="showMicSettings"
                @close="showMicSettings = false"
                @mouseenter="showMicSettings = true"
                @mouseleave="showMicSettings = false"
                class="hover-settings-modal"
              />
            </div>
            
            <div class="control-separator"></div>
            
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

    <!-- Основной контент -->
    <main class="main-content">
      
      <!-- Блок создания комнаты | Список публичных комнат + поиск по ID -->
      <div class="content-layout">
        
        <!-- Левая часть - создание комнаты -->
        <section class="create-room-section">
          <div class="create-room-card">
            <h2>Создать комнату</h2>
            
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
              class="create-room-btn"
            >
              {{ loading ? 'Создание...' : 'Создать комнату' }}
            </button>
          </div>
        </section>
        
        <!-- Правая часть - поиск и список комнат -->
        <section class="rooms-section">
          
          <!-- Поиск по ID комнаты -->
          <div class="room-search">
            <h3>Присоединиться к игре</h3>
            <div class="search-input-group">
              <input 
                v-model="joinRoomCode"
                @keypress.enter="joinRoom"
                type="text"
                placeholder="Введите код комнаты"
                maxlength="6"
                class="room-code-input"
              />
              <button 
                @click="joinRoom"
                :disabled="!canJoinRoom || loading"
                class="join-room-btn"
              >
                Войти
              </button>
            </div>
          </div>
          
          <!-- Список публичных комнат -->
          <div class="public-rooms-list">
            <h3>Публичные комнаты</h3>
            
            <div v-if="publicRooms.length === 0" class="no-rooms-message">
              Сейчас нет активных публичных игр.<br>
              Создайте свою комнату!
            </div>
            
            <div v-else class="rooms-grid">
              <div 
                v-for="room in publicRooms" 
                :key="room.id"
                @click="quickJoinRoom(room.id)"
                class="room-item"
              >
                <!-- Название комнаты | Фаза игры -->
                <div class="room-header">
                  <span class="room-name">{{ room.name || `Комната ${room.id}` }}</span>
                  <span class="room-phase" :class="`phase-${room.phase}`">
                    {{ getPhaseDisplayName(room.phase) }}
                  </span>
                </div>
                
                <!-- Ведущий: Имя ведущего -->
                <div class="room-host">
                  <span class="label">Ведущий:</span>
                  <span class="value">{{ room.hostName }}</span>
                </div>
                
                <!-- Количество живых игроков/Общее количество -->
                <div class="room-players">
                  <span class="label">Игроков:</span>
                  <span class="value">{{ room.alivePlayers }}/{{ room.totalPlayers }}</span>
                </div>
                
                <!-- Количество проведенных голосований -->
                <div class="room-rounds">
                  <span class="label">Раундов:</span>
                  <span class="value">{{ room.votingRounds || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
          
        </section>
        
      </div>
      
      <!-- Краткое представление игры и кнопка с правилами и ролями -->
      <section class="game-info-section">
        
        <div class="info-block">
          <h2>Что такое Нетипичная Мафия?</h2>
          <p class="game-description">
            Социально-дедукционная игра, основанная на One Night Ultimate Werewolf. 
            Игроки получают тайные роли и пытаются найти оборотней среди жителей деревни.
          </p>
          
          <div class="game-features">
            <div class="feature">
              <strong>3-10 игроков</strong><br>
              Оптимальное количество
            </div>
            <div class="feature">
              <strong>20-30 минут</strong><br>
              Средняя длительность игры
            </div>
            <div class="feature">
              <strong>27 уникальных ролей</strong><br>
              С особыми способностями
            </div>
            <div class="feature">
              <strong>Циклическая структура</strong><br>
              Несколько раундов до победы
            </div>
          </div>
          
          <div class="info-actions">
            <button @click="showRules = true" class="info-button">
              Как играть?
            </button>
            <button @click="showRoles = true" class="info-button">
              Список ролей
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
    
    <!-- <RolesModal 
      v-if="showRoles"
      @close="showRoles = false"
    /> -->
    
    <!-- Уведомления об ошибках -->
    <div v-if="error" @click="error = null" class="error-notification">
      {{ error }}
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGame } from '~/composables/useGame'
import { useUser } from '~/composables/useUser'

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
const publicRooms = ref([]) // TODO: Получать с сервера через API
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

// Получение списка публичных комнат (заглушка)
const fetchPublicRooms = async () => {
  // TODO: Реальный HTTP запрос к серверу
  // const response = await fetch('/api/rooms/public')
  // publicRooms.value = await response.json()
  publicRooms.value = [] // Пока пустой список
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