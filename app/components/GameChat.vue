<template>
  <div class="game-chat">
    <div class="chat-header">
      <h3>Игровой чат</h3>
      <div class="chat-status">
        <span v-if="!canChat" class="status-disabled">Чат отключен</span>
        <span v-else-if="isNightChat" class="status-night">Ночной чат оборотней</span>
        <span v-else class="status-enabled">Общий чат</span>
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
          <span class="message-sender">{{ getSenderDisplay(message) }}</span>
          <span v-if="message.senderRole && shouldShowRole(message)" class="message-role">
            {{ getRoleName(message.senderRole) }}
          </span>
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
        <span v-else-if="gameState.room.phase === 'night' && !isWerewolf">
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
          <button @click="sendMessage" :disabled="!canSendMessage" class="send-btn">
            Отправить
          </button>
          <button @click="showCommands = !showCommands" class="help-btn">
            ?
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useGame } from '~/composables/useGame'
import { getAllRoles } from '../../shared/rolesRegistry.js'

const { gameState, canChat, isWerewolf, sendMessage: sendGameMessage } = useGame()

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
    const recipient = gameState.room.players.find(p => p.id === message.recipientId)
    return `${message.senderName} → ${recipient?.name || 'Неизвестно'}`
  }
  
  return message.senderName
}

const shouldShowRole = (message) => {
  if (message.senderId === 'system') return false
  if (!message.senderRole) return false
  
  // В ночном чате оборотни видят роли друг друга
  if (isNightChat.value && isWerewolf.value) return true
  
  // game_master видит все роли
  if (gameState.player.role === 'game_master') return true
  
  return false
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
  } else if (message.type === 'game-event') {
    classes.push('message-game-event')
  }
  
  if (message.senderId === gameState.player.id) {
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
</script>