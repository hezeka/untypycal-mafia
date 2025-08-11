<template>
  <div class="roles-guide-overlay" @click="$emit('close')">
    <div class="roles-guide-modal" @click.stop>
      <div class="modal-header">
        <h2>Справочник ролей</h2>
        <button @click="$emit('close')" class="close-btn">✕</button>
      </div>
      
      <div class="modal-content">
        <div class="roles-grid">
          <RoleCard
            v-for="(role, roleId) in roles"
            :key="roleId"
            :role="role"
            :role-id="roleId"
            :selected="isRoleInGame(roleId)"
            :class="{ 
              'current-player-role': isCurrentPlayerRole(roleId),
              'guide-mode': true
            }"
            class="role-guide-item"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  gameRoles: {
    type: Array,
    default: () => []
  },
  playerRole: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close'])

const { roles } = useGame()

const isRoleInGame = (roleId) => {
  return props.gameRoles.includes(roleId)
}

const isCurrentPlayerRole = (roleId) => {
  return props.playerRole === roleId
}

const getTeamName = (team) => {
  const teams = {
    village: 'Деревня',
    werewolf: 'Оборотни',
    tanner: 'Неудачник',
    special: 'Особая',
    neutral: 'Нейтральная'
  }
  return teams[team] || team
}
</script>

<style lang="less" scoped>
.roles-guide-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.roles-guide-modal {
  background: rgba(10, 10, 10, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h2 {
    margin: 0;
    color: #667eea;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 24px;
    cursor: pointer;
    padding: 5px;
    
    &:hover {
      color: white;
    }
  }
}

.modal-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.role-guide-item {
  // pointer-events:all; // Делаем некликабельными
  
  &.current-player-role {
    border-color: #2ecc71 !important;
    box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.5) !important;
    
    &::after {
      content: 'Ваша роль';
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(46, 204, 113, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      z-index: 2;
    }
  }
  
  // Стиль для ролей в игре (selected)
  &.guide-mode.selected {
    &::before {
      content: 'В игре';
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(102, 126, 234, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      z-index: 2;
    }
  }
}

@media (max-width: 768px) {
  .roles-grid {
    grid-template-columns: 1fr;
  }
  
  .roles-guide-modal {
    max-width: 95vw;
    max-height: 95vh;
  }
}
</style>