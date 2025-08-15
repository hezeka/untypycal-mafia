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
        :class="[message.type, { 
          'is-whisper': message.type === 'whisper',
          'is-group-whisper': message.type === 'group_whisper'
        }]"
      >
        <div class="message-header">
          <span class="message-author">
            <template v-if="message.type === 'whisper'">
              {{ message.playerName }} → {{ message.targetPlayerName }}{{ getPlayerRoleDisplay(message.playerId) }}
            </template>
            <template v-else-if="message.type === 'group_whisper'">
              {{ message.playerName }} → {{ message.targetGroupName }}{{ getPlayerRoleDisplay(message.playerId) }}
            </template>
            <template v-else>
              {{ message.playerName }}{{ getPlayerRoleDisplay(message.playerId) }}
            </template>
          </span>
          <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        </div>
        <div class="message-content">
          <span v-if="message.type === 'whisper'" class="whisper-indicator">💬 </span>
          <span v-else-if="message.type === 'group_whisper'" class="group-whisper-indicator">👥 </span>
          <span v-html="formatMessageContent(message.message)"></span>
        </div>
        
        <!-- Показываем участников группового шепота -->
        <div v-if="message.type === 'group_whisper' && message.targetMembers" class="group-members">
          <small class="text-muted">
            Участники: {{ message.targetMembers.join(', ') }}
          </small>
        </div>
      </div>
      
      <div v-if="messages.length === 0" class="no-messages">
        Сообщений пока нет
      </div>
    </div>
    
    <div class="chat-help" v-if="canSendMessage">
      <details class="help-details">
        <summary class="help-summary">💡 Команды чата</summary>
        <div class="help-content">
          <div class="help-item" @click="setMessageText(`/ш `)">
            <code>/ш &lt;игрок&gt; &lt;текст&gt;</code>
            <span>Личное сообщение игроку</span>
          </div>
          <div class="help-item" @click="setMessageText(`/ш `)">
            <code>/ш &lt;группа&gt; &lt;текст&gt;</code>
            <span>Сообщение группе игроков</span>
          </div>
          <!-- ДОБАВЛЯЕМ: Шепот ведущему (только для не-ведущих) -->
          <div v-if="!isHost" class="help-item" @click="setMessageText(`/ш ведущий `)">
            <code>/ш ведущий &lt;текст&gt;</code>
            <span>Сообщение ведущему</span>
          </div>
          <div class="help-item" @click="setMessageText(`/помощь `)">
            <code>/помощь</code>
            <span>Показать все команды</span>
          </div>
          <div class="help-groups" v-if="availableGroups.length > 0">
            <strong>Доступные группы:</strong>
            <span v-for="group in availableGroups" :key="group" class="group-tag" @click="setMessageText(`/ш ${group} `)">{{ group }}</span>
            <!-- ДОБАВЛЯЕМ: Ведущий в список целей -->
            <span v-if="!isHost" class="group-tag host-tag" @click="setMessageText(`/ш ведущий `)">ведущий</span>
          </div>
        </div>
      </details>
    </div>
    
    <!-- Показываем ошибку команды -->
    <div v-if="commandError" class="command-error">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ commandError }}</span>
      <button @click="commandError = null" class="error-close">✕</button>
    </div>
    
    <form @submit.prevent="sendMessage" class="chat-input">
      <input 
        v-model="newMessage" 
        class="input"
        :placeholder="chatPlaceholder"
        maxlength="300"
        :disabled="!canSendMessage"
        @keydown="handleKeyDown"
        ref="messageInput"
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
const { chatMessages, isInRoom, sendMessage: sendGameMessage, gameData, isHost, player } = useGame()
const { socket } = useSocket()

const newMessage = ref('')
const messagesContainer = ref(null)
const messageInput = ref(null)
const commandError = ref(null)

// Автодополнение команд
const commandSuggestions = ref([])
const showSuggestions = ref(false)

const messages = computed(() => chatMessages.value)

const getMessageText = () => {
  return newMessage.value
}

const setMessageText = (text) => {
  newMessage.value = text
  nextTick(() => {
    messageInput.value?.focus()
  })
}

// Экспортируем функции наружу
defineExpose({
  getMessageText,
  setMessageText
})
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
  
  // During night phase: werewolves can chat normally, others can only whisper to host
  if (gameState === 'night') {
    return true // All can try to send messages, server will handle restrictions
  }
  
  // During voting phase, players can whisper to host
  if (gameState === 'voting') {
    return true // Allow whispers to host
  }
  
  return false
})

const chatPlaceholder = computed(() => {
  if (!isInRoom.value) return 'Подключитесь к комнате...'
  if (isHost.value) return 'Сообщение или команда (/помощь для справки)...'
  
  const gameState = gameData.gameState
  
  if (gameState === 'setup') return 'Сообщение или команда (/помощь для справки)...'
  if (gameState === 'day') return 'Обсуждение или команда (/ш игрок текст)...'
  if (gameState === 'night') {
    if (isWerewolfRole(player.role)) {
      return 'Чат команды оборотней или шепот (/ш)...'
    }
    return 'Ночью доступен только шепот ведущему: /ш ведущий <текст>'
  }
  if (gameState === 'voting') {
    return isHost.value ? 'Сообщение всем игрокам...' : 'Шепот ведущему: /ш ведущий <текст>'
  }
  
  return 'Чат недоступен'
})

// Доступные группы для текущего игрока
const availableGroups = computed(() => {
  const groups = []
  
  if (isHost.value) {
    groups.push('оборотни', 'деревня', 'все')
  } else if (isWerewolfRole(player.role)) {
    groups.push('оборотни')
  } else if (player.role && player.role !== 'tanner') {
    groups.push('деревня')
  }
  
  return groups
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
  
  if (shouldShowRole && gameData.roles?.[gamePlayer.role]) {
    return ` (${gameData.roles[gamePlayer.role].name})`
  }
  
  return ''
}

// Форматирование содержимого сообщения (поддержка markdown)
const formatMessageContent = (content) => {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

// Обработка автодополнения команд
const handleKeyDown = (event) => {
  const input = event.target.value
  
  // Tab для автодополнения
  if (event.key === 'Tab' && input.startsWith('/')) {
    event.preventDefault()
    autoCompleteCommand()
    return
  }
  
  // Escape для скрытия ошибки
  if (event.key === 'Escape') {
    commandError.value = null
  }
}

const autoCompleteCommand = () => {
  const input = newMessage.value.toLowerCase()
  
  const commands = [
    '/ш ',
    '/помощь',
    '/whisper ',
    '/help'
  ]
  
  // Добавляем команды с группами
  availableGroups.value.forEach(group => {
    commands.push(`/ш ${group} `)
  })
  
  // Добавляем команды с именами игроков
  gameData.players
    .filter(p => p.role !== 'game_master' && p.id !== player.id)
    .forEach(p => {
      commands.push(`/ш ${p.name} `)
    })
  
  const matches = commands.filter(cmd => cmd.startsWith(input))
  
  if (matches.length === 1) {
    newMessage.value = matches[0]
    // Устанавливаем курсор в конец
    nextTick(() => {
      const inputEl = messageInput.value
      if (inputEl) {
        inputEl.focus()
        inputEl.setSelectionRange(newMessage.value.length, newMessage.value.length)
      }
    })
  }
}

// ИЗМЕНЕНИЕ: упрощенная логика - очищаем поле сразу, восстанавливаем только при ошибке
const sendMessage = () => {
  if (!newMessage.value.trim()) return
  
  // Очищаем предыдущую ошибку
  commandError.value = null
  
  // Сохраняем сообщение для возможного восстановления при ошибке
  lastSentMessage.value = newMessage.value.trim()
  
  // Отправляем сообщение
  sendGameMessage(lastSentMessage.value)
  
  // ИЗМЕНЕНИЕ: Очищаем поле сразу после отправки
  // Если будет ошибка команды - восстановим сообщение в обработчике ошибки
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

// Флаг и переменная для восстановления сообщения при ошибке
const lastSentMessage = ref('')

// Слушаем ошибки команд
onMounted(() => {
  if (socket) {
    socket.on('command-error', (data) => {
      commandError.value = data.message
      // ИЗМЕНЕНИЕ: При ошибке команды восстанавливаем последнее отправленное сообщение
      newMessage.value = lastSentMessage.value
      lastSentMessage.value = '' // Очищаем сохраненное сообщение
      
      // Автоматически скрываем ошибку через 10 секунд
      setTimeout(() => {
        commandError.value = null
      }, 10000)
    })
    
    socket.on('new-whisper', (whisperMessage) => {
      // Добавляем шепот в чат (уже обработано в useGame)
      scrollToBottom()
    })
    
    socket.on('new-message', (message) => {
      // Просто прокручиваем чат при новых сообщениях
      scrollToBottom()
    })
  }
})



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
    max-height: 600px;
    
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
          white-space: pre-line;
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
      
      &.group_whisper {
        background: rgba(243, 156, 18, 0.1);
        border-left: 3px solid #f39c12;
        border-radius: 8px 8px 8px 2px;
        
        .message-author {
          color: #f39c12;
          font-style: italic;
          font-weight: 600;
        }
        
        .message-content {
          font-style: italic;
          
          .group-whisper-indicator {
            opacity: 0.8;
            font-size: 14px;
          }
        }
        
        .group-members {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid rgba(243, 156, 18, 0.2);
          
          .text-muted {
            color: rgba(243, 156, 18, 0.7);
            font-size: 10px;
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
        
        // Стили для markdown
        :deep(strong) {
          font-weight: 600;
          color: white;
        }
        
        :deep(em) {
          font-style: italic;
          color: rgba(255, 255, 255, 0.8);
        }
        
        :deep(code) {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 11px;
          color: #f39c12;
        }
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
    
    .help-details {
      .help-summary {
        cursor: pointer;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
        padding: 4px 0;
        user-select: none;
        
        &:hover {
          color: rgba(255, 255, 255, 0.8);
        }
      }
      
      .help-content {
        margin-top: 8px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px;
        border-left: 2px solid #667eea;
        
        .help-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          font-size: 10px;
          cursor: pointer;
          
          code {
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
            color: #667eea;
            font-size: 9px;
          }
          
          span {
            color: rgba(255, 255, 255, 0.6);
            margin-left: 8px;
          }
        }
        
        .help-groups {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 10px;
          
          strong {
            color: rgba(255, 255, 255, 0.8);
            margin-right: 6px;
          }
          
          .group-tag {
            display: inline-block;
            background: rgba(102, 126, 234, 0.2);
            color: #667eea;
            padding: 2px 6px;
            border-radius: 3px;
            margin-right: 4px;
            font-size: 9px;
            cursor: pointer;
          }
          .host-tag {
            background: rgba(102, 126, 234, 0.3);
            color: #667eea;
            border: 1px solid rgba(102, 126, 234, 0.5);
          }
        }
      }
    }
  }
  
  .command-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin: 8px 0;
    background: rgba(231, 76, 60, 0.1);
    border: 1px solid rgba(231, 76, 60, 0.3);
    border-radius: 6px;
    animation: slideIn 0.3s ease;
    
    .error-icon {
      color: #e74c3c;
      font-size: 14px;
    }
    
    .error-text {
      flex: 1;
      font-size: 12px;
      color: #e74c3c;
      line-height: 1.3;
    }
    
    .error-close {
      background: none;
      border: none;
      color: rgba(231, 76, 60, 0.7);
      cursor: pointer;
      padding: 2px;
      border-radius: 3px;
      font-size: 12px;
      
      &:hover {
        background: rgba(231, 76, 60, 0.2);
        color: #e74c3c;
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

      &[disabled] {
        color: #ffffff64;
        cursor: not-allowed;
        user-select: none;
      }
      
      &:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
      }
    }
    
    .btn-small {
      padding: 8px 16px;
      font-size: 12px;
      white-space: nowrap;
    }
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Адаптивность
@media (max-width: 768px) {
  .help-item {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 2px;
  }
  
  .command-error {
    .error-text {
      font-size: 11px !important;
    }
  }
}

</style>