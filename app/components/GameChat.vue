<template>
  <div class="game-chat card">
    <div class="card-header">
      Чат
      <span class="message-count">({{ messages.length }})</span>
    </div>
    
    <div class="chat-messages" ref="messagesContainer">
      <div 
        v-for="message in messages" 
        :key="message.id"
        class="message"
        :class="[message.type, { 'is-whisper': message.type === 'whisper' }]"
      >
        <div class="message-header">
          <span class="message-author">
            <template v-if="message.type === 'whisper'">
              {{ message.playerName }} → {{ message.targetPlayerName }}{{ getPlayerRoleDisplay(message.playerId) }}
            </template>
            <template v-else>
              {{ message.playerName }}{{ getPlayerRoleDisplay(message.playerId) }}
            </template>
          </span>
          <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        </div>
        <div class="message-content">
          <span v-if="message.type === 'whisper'" class="whisper-indicator">💬 </span>{{ message.message }}
        </div>
      </div>
      
      <div v-if="messages.length === 0" class="no-messages">
        Сообщений пока нет
      </div>
    </div>
    
    <div class="chat-help" v-if="canSendMessage">
      <small class="text-muted">
        Для личного сообщения: <code>/шепот ИмяИгрока текст</code>
      </small>
    </div>
    
    <form @submit.prevent="sendMessage" class="chat-input">
      <input 
        v-model="newMessage" 
        class="input"
        :placeholder="chatPlaceholder"
        maxlength="200"
        :disabled="!canSendMessage"
      >
      <button 
        type="submit" 
        class="btn btn-primary btn-small"
        :disabled="!newMessage.trim() || !canSendMessage"
      >
        Отправить
      </button>
    </form>
  </div>
</template>

<script setup>
const { chatMessages, isInRoom, sendMessage: sendGameMessage, gameData, isHost, player, roles } = useGame()

const newMessage = ref('')
const messagesContainer = ref(null)

const messages = computed(() => chatMessages.value)

// Helper function to check if role is werewolf-related
const isWerewolfRole = (role) => {
  return role && (
    role.includes('wolf') || 
    role === 'werewolf' || 
    role === 'minion'
  )
}

// Check if current player can see werewolf roles
const canSeeWerewolfRoles = computed(() => {
  const role = player.role
  return role === 'game_master' || isWerewolfRole(role)
})

const canSendMessage = computed(() => {
  if (!isInRoom.value) return false
  
  // Host can always send messages
  if (isHost.value) return true
  
  const gameState = gameData.gameState
  
  // During setup and day phases, all players can chat
  if (gameState === 'setup' || gameState === 'day') return true
  
  // During night phase, only werewolves can chat
  if (gameState === 'night') {
    return isWerewolfRole(player.role)
  }
  
  // During voting phase, no one can chat
  return false
})

const chatPlaceholder = computed(() => {
  if (!isInRoom.value) return 'Подключитесь к комнате...'
  if (isHost.value) return 'Напишите сообщение или /шепот ИмяИгрока текст...'
  
  const gameState = gameData.gameState
  
  if (gameState === 'setup') return 'Напишите сообщение или /шепот ИмяИгрока текст...'
  if (gameState === 'day') return 'Обсуждайте подозреваемых или /шепот ИмяИгрока текст...'
  if (gameState === 'night') {
    if (isWerewolfRole(player.role)) {
      return 'Чат команды оборотней или /шепот ИмяИгрока текст...'
    }
    return 'Ночью чат недоступен'
  }
  if (gameState === 'voting') return 'Во время голосования чат отключен'
  
  return 'Чат недоступен'
})

// Helper function to get player role display (БЕЗОПАСНАЯ версия)
const getPlayerRoleDisplay = (playerId) => {
  const gamePlayer = gameData.players.find(p => p.id === playerId)
  if (!gamePlayer || !gamePlayer.role) return ''
  
  // Показываем роль только в безопасных случаях:
  // 1. Если это ведущий
  // 2. Если игра закончена
  // 3. Если это оборотень и текущий игрок может видеть роли оборотней
  let shouldShowRole = false
  
  if (isHost.value) {
    // Ведущий видит все роли
    shouldShowRole = true
  } else if (gameData.gameState === 'ended') {
    // В конце игры все видят все роли
    shouldShowRole = true
  } else if (canSeeWerewolfRoles.value && isWerewolfRole(gamePlayer.role)) {
    // Оборотни видят роли других оборотней
    shouldShowRole = true
  }
  
  if (shouldShowRole && roles[gamePlayer.role]) {
    return ` (${roles[gamePlayer.role].name})`
  }
  
  return ''
}

const sendMessage = () => {
  if (!newMessage.value.trim()) return
  
  sendGameMessage(newMessage.value.trim())
  newMessage.value = ''
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(messages, () => {
  scrollToBottom()
})

onMounted(() => {
  scrollToBottom()
})
</script>

<style lang="less" scoped>
.game-chat {
  display: flex;
  flex-direction: column;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .message-count {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }
  }
  
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    margin: 8px 0;
    max-height: 400px;
    
    &::-webkit-scrollbar {
      width: 4px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }
    
    .message {
      margin-bottom: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      
      &.host {
        background: rgba(102, 126, 234, 0.1);
        border-left: 3px solid #667eea;
        
        .message-author {
          color: #667eea;
        }
      }
      
      &.player {
        background: rgba(255, 255, 255, 0.05);
      }
      
      &.system {
        background: rgba(46, 204, 113, 0.1);
        border-left: 3px solid #2ecc71;
        
        .message-author {
          color: #2ecc71;
          font-weight: 600;
        }
        
        .message-content {
          font-weight: 500;
          white-space: pre-line; // Поддерживает переносы строк
        }
      }
      
      &.whisper {
        background: rgba(155, 89, 182, 0.1);
        border-left: 3px solid #9b59b6;
        border-radius: 8px 8px 8px 2px;
        
        .message-author {
          color: #9b59b6;
          font-style: italic;
        }
        
        .message-content {
          font-style: italic;
          
          .whisper-indicator {
            opacity: 0.7;
          }
        }
      }
      
      .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        
        .message-author {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }
        
        .message-time {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
        }
      }
      
      .message-content {
        font-size: 13px;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.9);
        word-wrap: break-word;
      }
    }
    
    .no-messages {
      text-align: center;
      color: rgba(255, 255, 255, 0.4);
      font-style: italic;
      margin-top: 20px;
    }
  }
  
  .chat-help {
    padding: 8px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    
    small {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
      
      code {
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 9px;
      }
    }
  }
  
  .chat-input {
    display: flex;
    gap: 8px;
    margin-top: auto;
    
    .input {
      flex: 1;
      font-size: 13px;
      padding: 8px 12px;
    }
    
    .btn-small {
      padding: 8px 16px;
      font-size: 12px;
      white-space: nowrap;
    }
  }
}
</style>