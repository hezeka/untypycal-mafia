<template>
  <div class="main-page">
    
    <!-- Заголовок -->
    <header class="main-header">
      <div class="header-content">
        <div class="logo">
          <img src="/images/logo.png" alt="Нетипичка" />
          <h1>НЕТИПИЧКА</h1>
        </div>
        
        <nav class="nav-links">
          <button @click="showRules = true" class="nav-btn">Правила</button>
          <button @click="showRoles = true" class="nav-btn">Роли</button>
        </nav>
        
        <div class="user-panel">
          <div class="username-display">
            <span>{{ username || 'Гость' }}</span>
            <button @click="showUsernameModal = true" class="change-btn">
              {{ username ? 'Сменить' : 'Установить' }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Основной контент -->
    <main class="main-content">
      
      <!-- Блоки создания и поиска комнат -->
      <div class="room-actions">
        
        <!-- Создание комнаты -->
        <div class="action-card create-room">
          <h2>Создать игру</h2>
          <div class="create-form">
            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  v-model="createOptions.isPrivate"
                />
                Приватная комната
              </label>
            </div>
            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  v-model="createOptions.hostAsObserver"
                />
                Ведущий-наблюдатель
              </label>
            </div>
            <button 
              @click="createRoom"
              :disabled="!canCreateRoom"
              class="create-btn"
            >
              {{ loading ? 'Создание...' : 'Создать комнату' }}
            </button>
          </div>
        </div>
        
        <!-- Присоединение к комнате -->
        <div class="action-card join-room">
          <h2>Присоединиться</h2>
          <div class="join-form">
            <div class="form-group">
              <input 
                v-model="joinRoomCode"
                @keypress.enter="joinRoom"
                type="text"
                placeholder="Код комнаты"
                maxlength="6"
                class="room-code-input"
              />
            </div>
            <button 
              @click="joinRoom"
              :disabled="!canJoinRoom"
              class="join-btn"
            >
              {{ loading ? 'Подключение...' : 'Войти' }}
            </button>
          </div>
        </div>
        
      </div>
      
      <!-- Список публичных комнат -->
      <div class="public-rooms">
        <h2>Публичные комнаты</h2>
        <div v-if="publicRooms.length === 0" class="no-rooms">
          Публичных комнат пока нет. Создайте первую!
        </div>
        <div v-else class="rooms-list">
          <div 
            v-for="room in publicRooms" 
            :key="room.id"
            class="room-card"
            @click="joinRoomById(room.id)"
          >
            <div class="room-info">
              <div class="room-name">Комната {{ room.id }}</div>
              <div class="room-phase">{{ getPhaseDisplayName(room.phase) }}</div>
              <div class="room-host">Ведущий: {{ room.hostName }}</div>
              <div class="room-players">
                Игроков: {{ room.alivePlayers }}/{{ room.totalPlayers }}
              </div>
              <div class="room-rounds">Раундов: {{ room.rounds }}</div>
            </div>
            <div class="room-status">
              <span class="status-indicator" :class="`status-${room.phase}`"></span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Информация об игре -->
      <div class="game-info">
        <div class="info-card">
          <h3>Что такое Нетипичная Мафия?</h3>
          <p>
            Социально-дедукционная игра, основанная на One Night Ultimate Werewolf. 
            Игроки получают секретные роли и пытаются найти оборотней среди себя.
          </p>
          <ul>
            <li><strong>3-10 игроков</strong> - оптимальное количество участников</li>
            <li><strong>20-30 минут</strong> - средняя длительность игры</li>
            <li><strong>27 уникальных ролей</strong> - с особыми способностями</li>
            <li><strong>Циклическая структура</strong> - несколько раундов до победы</li>
          </ul>
        </div>
        
        <div class="info-card">
          <h3>Как играть?</h3>
          <ol>
            <li><strong>Знакомство</strong> - представьтесь и обсудите стратегии</li>
            <li><strong>Ночь</strong> - роли выполняют свои действия</li>
            <li><strong>День</strong> - ищите подозрительное поведение</li>
            <li><strong>Голосование</strong> - исключите подозреваемого</li>
            <li><strong>Повтор</strong> - пока одна из команд не победит</li>
          </ol>
        </div>
      </div>
      
    </main>

    <!-- Футер -->
    <footer class="main-footer">
      <p>
        Проект некоммерческий, разработан в 2025 году. 
        Основан на игре One Night Ultimate Werewolf.
      </p>
    </footer>

    <!-- Модалы -->
    <UsernameModal 
      v-if="showUsernameModal"
      :current-username="username"
      @save="setUsername"
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
    
    <!-- Уведомления -->
    <div v-if="error" class="error-notification" @click="error = null">
      {{ error }}
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGame } from '~/composables/useGame'
import { useUser } from '~/composables/useUser'

const router = useRouter()
const { createRoom: createGameRoom, joinRoom: joinGameRoom, loading, gameState } = useGame()
const { username, setUsername: saveUsername } = useUser()

// Reactive state
const createOptions = ref({
  isPrivate: false,
  hostAsObserver: false
})
const joinRoomCode = ref('')
const publicRooms = ref([]) // TODO: Получать с сервера
const error = ref(null)
const showUsernameModal = ref(false)
const showRules = ref(false)
const showRoles = ref(false)

// Computed
const canCreateRoom = computed(() => {
  return username.value && username.value.trim().length >= 2 && !loading.value
})

const canJoinRoom = computed(() => {
  return username.value && joinRoomCode.value.length === 6 && !loading.value
})

// Методы
const createRoom = async () => {
  if (!canCreateRoom.value) {
    if (!username.value) {
      showUsernameModal.value = true
      return
    }
    return
  }
  
  try {
    await createGameRoom(
      username.value.trim(),
      createOptions.value.isPrivate,
      createOptions.value.hostAsObserver
    )
    
    // Переход на игровую страницу произойдет автоматически после создания комнаты
    router.push(`/game/${gameState.room.id}`)
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
    await joinGameRoom(joinRoomCode.value.toUpperCase(), username.value.trim())
    router.push(`/game/${joinRoomCode.value.toUpperCase()}`)
  } catch (err) {
    error.value = err.message || 'Ошибка подключения к комнате'
  }
}

const joinRoomById = (roomId) => {
  joinRoomCode.value = roomId
  joinRoom()
}

const setUsername = (newUsername) => {
  saveUsername(newUsername)
  showUsernameModal.value = false
}

const getPhaseDisplayName = (phase) => {
  const phases = {
    setup: 'Подбор',
    introduction: 'Знакомство',
    night: 'Ночь',
    day: 'День',
    voting: 'Голосование',
    ended: 'Завершено'
  }
  return phases[phase] || phase
}

// Получение публичных комнат (заглушка)
const fetchPublicRooms = () => {
  // TODO: Реальный запрос к серверу
  publicRooms.value = []
}

onMounted(() => {
  fetchPublicRooms()
  
  // Обновляем список каждые 30 секунд
  const interval = setInterval(fetchPublicRooms, 30000)
  
  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script>