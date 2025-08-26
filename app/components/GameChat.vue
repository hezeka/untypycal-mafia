<template>
  <div class="game-chat" :class="{ 'chat-disabled': !canChat }">
    <div class="chat-header">
        Игровой чат
        <div class="chat-status" :class="!canChat ? 'status-disabled' : isNightChat ? 'status-night' : ''">
        </div>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div 
        v-for="message in gameState.chat" 
        :key="message.id"
        class="message"
        :class="getMessageClass(message)"
      >
        <div class="message-header">
          <div class="message-top">
            <span class="message-sender">{{ getSenderDisplay(message) }}</span>
            <span v-if="message.senderRole" class="message-role">
                {{ getRoleName(message.senderRole) }}
            </span>
            <span v-else-if="message.type == 'whisper'" class="message-role">Шепот</span>
            <span v-else-if="message.type == 'error'" class="message-role">Ошибка</span>
            <span v-else-if="message.isOwn == true" class="message-role">(Вы)</span>
            <span v-else-if="message.type == 'system'" class="message-role">Оповещение</span>
          </div>
          <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        </div>
        <div class="message-text">{{ message.text }}</div>
      </div>
    </div>

    <div class="chat-input">
      <div v-if="!canChat" class="input-disabled">
        <span v-if="gameState.room.phase === 'voting'">
          Во время голосования можно только шептать ведущему: /ш ведущий текст
        </span>
        <span v-else-if="gameState.room.phase === 'night'">
          В ночную фазу могут писать только оборотни
        </span>
        <span v-else>
          Чат временно отключен
        </span>
      </div>
      
      <div v-else class="input-active">
        <div v-if="showCommands" class="chat-commands">
          <div class="commands-help">
            <strong>Команды чата:</strong><br>
            /ш [игрок] [текст] - личное сообщение<br>
            /ш ведущий [текст] - шепот ведущему<br>
            /help - показать команды
          </div>
        </div>

        <div class="help-list" @click="showCommands = !showCommands"><span style="opacity: .4;">{{ showCommands ? '▴' : '▸' }}</span> Подсказки по командам</div>
        
        <div class="input-row">
            <input 
                v-model="messageText"
                @keypress.enter="sendMessage"
                @focus="showCommands = false"
                type="text"
                placeholder="Введите сообщение..."
                maxlength="200"
                :disabled="!canChat"
            />
            <button @click="sendMessage" :disabled="!canChat" class="send-btn"></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useGame } from '~/composables/useGame'
import { getAllRoles } from '../../shared/rolesRegistry.js'

const { gameState, canChat, sendMessage: sendGameMessage } = useGame()

// Функция для установки текста в инпут (для команд шепота)
const setInputText = (text) => {
  messageText.value = text
}

const messageText = ref('')
const messagesContainer = ref(null)
const showCommands = ref(false)

const roles = getAllRoles()

// Computed
const isNightChat = computed(() => {
  return gameState.room.phase === 'night' && gameState.room.chatPermissions.werewolfChat
})

const canSendMessage = computed(() => {
  return canChat.value && messageText.value.trim().length > 0
})

// Методы
const sendMessage = () => {
  if (!canSendMessage.value) return
  
  const success = sendGameMessage(messageText.value.trim())
  if (success) {
    messageText.value = ''
  }
}

const getSenderDisplay = (message) => {
  if (message.senderId === 'system') {
    return 'Система'
  }
  
  if (message.type === 'whisper') {
    // Сначала пробуем использовать enriched данные из API
    const recipientName = message.recipientName || 
      // Fallback: ищем в текущих игроках
      gameState.room.players.find(p => p.id === message.recipientId)?.name ||
      'Неизвестно'
      
    return `${message.senderName} → ${recipientName}`
  }
  
  return message.senderName
}


const getRoleName = (roleId) => {
  return roles[roleId]?.name || roleId
}

const getMessageClass = (message) => {
  const classes = []
  
  if (message.type === 'whisper') {
    classes.push('message-whisper')
  } else if (message.type === 'system') {
    classes.push('message-system')
  } else if (message.type === 'error') {
    classes.push('message-error')
  } else if (message.type === 'game_event') {
    classes.push('message-game-event')
  }
  
  // Проверяем принадлежность сообщения: по флагу API, по ID или по имени
  const isOwn = message.isOwn || 
                message.senderId === gameState.player.id ||
                (message.senderName === gameState.player.name && message.senderId !== 'system')
  
  
  // Используем enriched данные из API или fallback к сравнению имени
  if (isOwn) {
    classes.push('message-own')
  }
  
  return classes
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Автопрокрутка к новым сообщениям
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Отслеживаем новые сообщения
watch(() => gameState.chat.length, scrollToBottom)

// Дополнительно отслеживаем появление ошибок для немедленной прокрутки
watch(() => gameState.chat.filter(msg => msg.type === 'error'), scrollToBottom, { deep: true })

// Экспортируем функции для использования родительским компонентом
defineExpose({
  setInputText,
  messageText
})
</script>