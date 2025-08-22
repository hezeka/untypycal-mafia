<template>
  <div 
    class="connection-indicator"
    :class="{ 
      'connected': isConnected, 
      'reconnecting': isReconnecting 
    }"
  >
    <span class="status-dot"></span>
    <span class="status-text">
      {{ statusText }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSocket } from '~/composables/useSocket'

const { isConnected, connectionError } = useSocket()

const isReconnecting = computed(() => !isConnected.value && !connectionError.value)

const statusText = computed(() => {
  if (isConnected.value) return 'Подключено'
  if (isReconnecting.value) return 'Переподключение...'
  return 'Отключено'
})
</script>

<style scoped>
.connection-indicator {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 999;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  transition: background 0.3s ease;
}

.connection-indicator.connected .status-dot {
  background: #4ade80;
}

.connection-indicator.reconnecting .status-dot {
  background: #ffa500;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 768px) {
  .connection-indicator {
    bottom: 10px;
    left: 10px;
  }
}
</style>