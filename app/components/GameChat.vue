<template>
  <div class="game-chat">
    
    <!-- Заголовок чата -->
    <div class="chat-header">
      <h3 class="chat-title">Игровой чат</h3>
      
      <div class="chat-controls">
        <button 
          @click="showChatHelp = !showChatHelp"
          class="help-btn"
          :class="{ 'active': showChatHelp }"
        >
          ?
        </button>
        
        <button 
          @click="clearChat"
          class="clear-btn"
          title="Очистить чат"
        >
          ×
        </button>
      </div>
    </div>
    
    <!-- Помощь по командам -->
    <div v-if="showChatHelp" class="chat-help">
      <div class="help-item">
        <code>/w [игрок] [текст]</code> - шепот игроку
      </div>
      <div class="help-item">
        <code>/w ведущий [текст]</code> - шепот ведущему
      </div>
      <div class="help-item">
        <code>/help</code> - показать команды
      </div>
    </div>
    
    <!-- Ограничения фазы -->
    <div v-if="!canChat" class="chat-restrictions">
      <div class="restriction-message">
        {{ getRestrictionMessage() }}
      </div>
    </div>
    
    <!-- Сообщения -->
    <div ref="messagesContainer" class="chat-messages">
      <div 
        v-for="message in visibleMessages" 
        :key="message.id"
        class="chat-message"
        :class="[
          `message-${message.type}`,
          { 'own-message': message.playerId === currentPlayer?.id }
        ]"
      >
        
        <!-- Системное сообщение -->
        <div v-if="message.type === 'system'" class="system-message">
          {{ message.content }}
        </div>
        
        <!-- Обычное сообщение -->
        <div v-else class="player-message">
          <div class="message-header">
            <span class="player-name" :style="{ color: getPlayerColor(message.playerId) }">
              {{ message.playerName }}
            </span>
            
            <span class="message-time">
              {{ formatTime(message.timestamp) }}
            </span>
            
            <span v-if="message.type === 'whisper'" class="whisper-badge">
              шепот
            </span>
          </div>
          
          <div class="message-content">
            {{ message.content }}
          </div>
          
          <!-- Цель шепота -->
          <div v-if="message.type === 'whisper' && message.targetName" class="whisper-target">
            → {{ message.targetName }}
          </div>
        </div>
        
      </div>
      
      <!-- Индикатор новых сообщений -->
      <div v-if="hasNewMessages" class="new-messages-indicator" @click="scrollToBottom">
        Новые сообщения ↓
      </div>
    </div>
    
    <!-- Ввод сообщения -->
    <div v-if="canChat" class="chat-input">
      <div class="input-container">
        <input 
          ref="messageInput"
          v-model="currentMessage"
          type="text"
          placeholder="Напишите сообщение..."
          maxlength="500"
          @keyup.enter="sendMessage"
          @keyup.up="navigateHistory(-1)"
          @keyup.down="navigateHistory(1)"
          @input="handleInput"
        />
        
        <button 
          @click="sendMessage"
          :disabled="!canSendMessage"
          class="send-btn"
        >
          →
        </button>
      </div>
      
      <!-- Индикатор ввода -->
      <div v-if="currentMessage.length > 0" class="input-info">
        <span class="char-count">{{ currentMessage.length }}/500</span>
        
        <span v-if="isCommand" class="command-hint">
          {{ getCommandHint() }}
        </span>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useGame } from '~/composables/useGame'

const { gameState, currentPlayer, sendMessage: sendGameMessage } = useGame()

// Refs
const messagesContainer = ref(null)
const messageInput = ref(null)
const currentMessage = ref('')
const showChatHelp = ref(false)
const hasNewMessages = ref(false)
const messageHistory = ref([])
const historyIndex = ref(-1)
const localMessages = ref([])

// Computed
const canChat = computed(() => {
  return gameState.room.chatPermissions.canChat && currentPlayer.value?.alive
})

const canSendMessage = computed(() => {
  return canChat.value && currentMessage.value.trim().length > 0
})

const visibleMessages = computed(() => {
  const allMessages = [...gameState.chat, ...localMessages.value]
  
  // Фильтрация сообщений в зависимости от фазы и разрешений
  return allMessages.filter(message => {
    // Системные сообщения видны всегда
    if (message.type === 'system') return true
    
    // Шепоты видны только участникам
    if (message.type === 'whisper') {
      return message.playerId === currentPlayer.value?.id || 
             message.targetId === currentPlayer.value?.id ||
             message.targetId === 'system'
    }
    
    // В ночной фазе оборотни видят сообщения друг друга
    if (gameState.room.phase === 'night' && gameState.room.chatPermissions.werewolfChat) {
      if (message.type === 'werewolf') {
        return isPlayerWerewolf(currentPlayer.value?.id)
      }
    }
    
    // Обычные сообщения видны если разрешено
    return gameState.room.chatPermissions.canSeeAll
  })
})

const isCommand = computed(() => {
  return currentMessage.value.startsWith('/')
})

// Методы
const sendMessage = () => {
  if (!canSendMessage.value) return
  
  const message = currentMessage.value.trim()
  
  // Добавляем в историю
  if (messageHistory.value[messageHistory.value.length - 1] !== message) {
    messageHistory.value.push(message)
    
    // Ограничиваем историю
    if (messageHistory.value.length > 50) {
      messageHistory.value = messageHistory.value.slice(-25)
    }
  }
  
  historyIndex.value = -1
  
  // Обрабатываем команды
  if (message.startsWith('/')) {
    handleCommand(message)
  } else {
    // Обычное сообщение
    sendGameMessage(message)
  }
  
  currentMessage.value = ''
  focusInput()
}

const handleCommand = (command) => {
  const parts = command.slice(1).split(' ')
  const cmd = parts[0].toLowerCase()
  
  switch (cmd) {
    case 'w':
    case 'whisper':
    case 'ш':
      handleWhisperCommand(parts.slice(1))
      break
      
    case 'help':
    case 'помощь':
      showLocalMessage('Доступные команды: /w [игрок] [текст], /help')
      break
      
    default:
      showLocalMessage(`Неизвестная команда: /${cmd}`)
  }
}

const handleWhisperCommand = (args) => {
  if (args.length < 2) {
    showLocalMessage('Использование: /w [игрок] [сообщение]')
    return
  }
  
  const target = args[0]
  const message = args.slice(1).join(' ')
  
  // Отправляем шепот
  sendGameMessage(message, 'whisper', target)
}

const showLocalMessage = (content) => {
  const message = {
    id: Date.now() + Math.random(),
    type: 'system',
    content,
    timestamp: Date.now(),
    local: true
  }
  
  localMessages.value.push(message)
  
  // Удаляем локальные сообщения через 10 секунд
  setTimeout(() => {
    const index = localMessages.value.indexOf(message)
    if (index > -1) {
      localMessages.value.splice(index, 1)
    }
  }, 10000)
}

const navigateHistory = (direction) => {
  if (messageHistory.value.length === 0) return
  
  historyIndex.value += direction
  
  if (historyIndex.value < -1) {
    historyIndex.value = -1
  } else if (historyIndex.value >= messageHistory.value.length) {
    historyIndex.value = messageHistory.value.length - 1
  }
  
  if (historyIndex.value === -1) {
    currentMessage.value = ''
  } else {
    currentMessage.value = messageHistory.value[messageHistory.value.length - 1 - historyIndex.value]
  }
}

const getCommandHint = () => {
  const msg = currentMessage.value.toLowerCase()
  
  if (msg.startsWith('/w ') || msg.startsWith('/ш ')) {
    return 'Шепот игроку: /w [имя] [сообщение]'
  }
  
  if (msg.startsWith('/help') || msg.startsWith('/помощь')) {
    return 'Показать все команды'
  }
  
  return 'Неизвестная команда'
}

const getRestrictionMessage = () => {
  const phase = gameState.room.phase
  
  if (phase === 'voting') {
    return 'Во время голосования чат отключен'
  }
  
  if (phase === 'night' && !gameState.room.chatPermissions.werewolfChat) {
    return 'Ночью могут общаться только оборотни'
  }
  
  return 'Чат недоступен в данной фазе'
}

const getPlayerColor = (playerId) => {
  // Простая генерация цвета на основе ID
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd']
  let hash = 0
  
  if (playerId) {
    for (let i = 0; i < playerId.length; i++) {
      hash = playerId.charCodeAt(i) + ((hash << 5) - hash)
    }
  }
  
  return colors[Math.abs(hash) % colors.length]
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const isPlayerWerewolf = (playerId) => {
  // TODO: Реализовать проверку роли игрока
  return false
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    hasNewMessages.value = false
  }
}

const clearChat = () => {
  localMessages.value = []
  // TODO: Очистка основного чата (только для ведущего?)
}

const focusInput = () => {
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.focus()
    }
  })
}

const handleInput = () => {
  // Сброс индикатора новых сообщений при вводе
  hasNewMessages.value = false
}

// Автоскролл при новых сообщениях
watch(() => visibleMessages.value.length, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      const container = messagesContainer.value
      const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100
      
      if (isAtBottom) {
        scrollToBottom()
      } else {
        hasNewMessages.value = true
      }
    }
  })
})

// Фокус на поле ввода при монтировании
onMounted(() => {
  focusInput()
})
</script>

<style scoped>
.game-chat {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
}

/* Заголовок */
.chat-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #fff;
}

.chat-controls {
  display: flex;
  gap: 8px;
}

.help-btn,
.clear-btn {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.help-btn:hover,
.clear-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.help-btn.active {
  background: #ff6b6b;
  border-color: #ff6b6b;
}

/* Помощь */
.chat-help {
  padding: 12px 20px;
  background: rgba(255, 107, 107, 0.1);
  border-bottom: 1px solid rgba(255, 107, 107, 0.2);
  font-size: 0.9rem;
}

.help-item {
  margin-bottom: 4px;
  color: #ddd;
}

.help-item code {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Consolas', monospace;
}

/* Ограничения */
.chat-restrictions {
  padding: 12px 20px;
  background: rgba(255, 165, 0, 0.1);
  border-bottom: 1px solid rgba(255, 165, 0, 0.2);
  text-align: center;
}

.restriction-message {
  color: #ffa500;
  font-size: 0.9rem;
  font-weight: 500;
}

/* Сообщения */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  position: relative;
}

.chat-message {
  margin-bottom: 12px;
}

.system-message {
  text-align: center;
  color: #aaa;
  font-style: italic;
  font-size: 0.9rem;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.player-message {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  border-left: 3px solid transparent;
}

.message-whisper {
  background: rgba(255, 107, 107, 0.1);
  border-left-color: #ff6b6b;
}

.own-message {
  background: rgba(255, 255, 255, 0.08);
  border-left-color: #4ecdc4;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 0.8rem;
}

.player-name {
  font-weight: 600;
}

.message-time {
  color: #888;
  font-family: 'Monaco', 'Consolas', monospace;
}

.whisper-badge {
  background: #ff6b6b;
  color: #fff;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 600;
}

.message-content {
  color: #fff;
  line-height: 1.4;
  word-wrap: break-word;
}

.whisper-target {
  margin-top: 4px;
  color: #ff6b6b;
  font-size: 0.8rem;
  font-style: italic;
}

/* Индикатор новых сообщений */
.new-messages-indicator {
  position: sticky;
  bottom: 0;
  background: #ff6b6b;
  color: #fff;
  text-align: center;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  margin-top: 8px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Ввод */
.chat-input {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.input-container {
  display: flex;
  gap: 8px;
}

.input-container input {
  flex: 1;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 0.9rem;
}

.input-container input:focus {
  outline: none;
  border-color: #ff6b6b;
  background: rgba(255, 255, 255, 0.15);
}

.input-container input::placeholder {
  color: #888;
}

.send-btn {
  width: 40px;
  height: 40px;
  background: #ff6b6b;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.send-btn:hover:not(:disabled) {
  background: #ff5252;
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-info {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 0.8rem;
}

.char-count {
  color: #888;
}

.command-hint {
  color: #4ecdc4;
  font-style: italic;
}

/* Адаптивность */
@media (max-width: 1024px) {
  .chat-messages {
    max-height: 300px;
  }
}

@media (max-width: 768px) {
  .chat-header,
  .chat-input {
    padding: 12px 16px;
  }
  
  .chat-messages {
    padding: 8px 16px;
  }
  
  .player-message {
    padding: 8px;
  }
}
</style>