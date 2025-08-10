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
        :class="message.type"
      >
        <div class="message-header">
          <span class="message-author">
            {{ message.playerName }}{{ getPlayerRoleDisplay(message.playerId) }}
          </span>
          <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        </div>
        <div class="message-content">{{ message.message }}</div>
      </div>
      
      <div v-if="messages.length === 0" class="no-messages">
        Сообщений пока нет
      </div>
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

// Check if current player can see werewolf roles
const canSeeWerewolfRoles = computed(() => {
  const role = player.role
  return role === 'game_master' || 
         (role && (role.includes('wolf') || role === 'werewolf' || role === 'minion'))
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
    const role = player.role
    return role && (role.includes('wolf') || role === 'werewolf' || role === 'minion')
  }
  
  // During voting phase, no one can chat
  return false
})

const chatPlaceholder = computed(() => {
  if (!isInRoom.value) return 'Подключитесь к комнате...'
  if (isHost.value) return 'Напишите сообщение...'
  
  const gameState = gameData.gameState
  
  if (gameState === 'setup') return 'Напишите сообщение...'
  if (gameState === 'day') return 'Обсуждайте подозреваемых...'
  if (gameState === 'night') {
    const role = player.role
    if (role && (role.includes('wolf') || role === 'werewolf' || role === 'minion')) {
      return 'Чат команды оборотней...'
    }
    return 'Ночью чат недоступен'
  }
  if (gameState === 'voting') return 'Во время голосования чат отключен'
  
  return 'Чат недоступен'
})

// Helper function to get player role display
const getPlayerRoleDisplay = (playerId) => {
  const gamePlayer = gameData.players.find(p => p.id === playerId)
  if (!gamePlayer || !gamePlayer.role) return ''
  
  // Show role if admin or if can see werewolf roles and it's a werewolf or if game ended
  if (isHost.value) {
    // Ведущий видит все роли
    return ` (${roles[gamePlayer.role]?.name || gamePlayer.role})`
  } else if (gameData.gameState === 'ended') {
    // В конце игры все видят все роли
    return ` (${roles[gamePlayer.role]?.name || gamePlayer.role})`
  } else if (canSeeWerewolfRoles.value && 
             (gamePlayer.role.includes('wolf') || gamePlayer.role === 'werewolf' || gamePlayer.role === 'minion')) {
    // Оборотни видят роли других оборотней
    return ` (${roles[gamePlayer.role]?.name || gamePlayer.role})`
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
  // height: 300px;
  
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