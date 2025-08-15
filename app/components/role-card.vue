<template>
  <div 
    class="role-card" 
    :class="[role.color, { selected: selected, readonly: readonly }]"
    @click="!readonly && $emit('toggle', roleId)"
  >
    <div class="role-image">
      <img :src="`/roles/compressed/${roleId}.webp`" :alt="role.name" />
      <div v-if="selected" class="selected-overlay">
        <div class="check-icon">✓</div>
      </div>
    </div>
    
    <div class="role-info">
      <div class="role-name">{{ role.name }}</div>
      <div class="role-description">{{ role.description }}</div>
      
      <div class="role-meta">
        <span class="role-team" :class="role.color">{{ getTeamName(role.team) }}</span>
        <span v-if="role.night" class="night-badge">Ночная роль</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  role: {
    type: Object,
    required: true
  },
  roleId: {
    type: String,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle'])

const getTeamName = (team) => {
  const teams = {
    village: 'Деревня',
    werewolf: 'Оборотни',
    tanner: 'Неудачник',
    special: 'Особая'
  }
  return teams[team] || team
}
</script>

<style lang="less" scoped>
.role-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  opacity: .8;
  filter: grayscale(.8);
  transition: 0.2s;
  
  &.readonly {
    cursor: default;
    
    &:hover {
      transform: none;
      box-shadow: none;
      border-color: rgba(255, 255, 255, 0.1);
    }
    
    &.selected {
      opacity: 1;
      filter: grayscale(0);
    }
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.2);
    opacity: 1;
    filter: grayscale(0);

    .role-info {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  &.selected {
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3), 0 4px 10px rgba(102, 126, 234, 0.3);
    opacity: 1;
    filter: grayscale(0);
    
    .role-name {
      color: #667eea;
    }
  }
  
  .role-image {
    position: relative;
    width: 100%;
    overflow: hidden;
    font-size: 0;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
    }
    
    .selected-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      // background: rgba(102, 126, 234, 0.8);
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
      
      .check-icon {
        color: white;
        font-size: 24px;
        font-weight: bold;
        padding: 5px 15px;
      }
    }
  }
  
  .role-info {
    padding: 16px;
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: #00000069;
    backdrop-filter: blur(31px);
    opacity: 0;
    transition: .3s;
    transform: translateY(10%);
    user-select: none;
    pointer-events: none;
    box-shadow: inset 0 1px 0 #ffffff2e;
    
    .role-name {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      transition: color 0.3s ease;
    }
    
    .role-description {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.4;
      margin-bottom: 12px;
    }
    
    .role-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      
      .role-team {
        font-size: 13px;
        padding: 3px 9px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.1);
        box-shadow: inset 0 0 0 1px #ffffff0f;
        
        &.blue { background: rgba(52, 152, 219, 0.2); color: #3498db; }
        &.red { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
        &.brown { background: rgba(139, 69, 19, 0.2); color: #8b4513; }
        &.purple { background: rgba(155, 89, 182, 0.2); color: #9b59b6; }
      }
      
      .night-badge {
        color: #f39c12;
        background: rgba(243, 156, 18, 0.2);
        font-size: 13px;
        padding: 3px 9px;
        border-radius: 6px;
        box-shadow: inset 0 0 0 1px #ffffff0f;
      }
    }
  }
  
  // Team color borders
  &.blue {
    &.selected, &:hover {
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.3);
    }
  }
  
  &.red {
    &.selected, &:hover {
      border-color: #e74c3c;
      box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.3);
    }
  }
  
  &.brown {
    &.selected, &:hover {
      border-color: #8b4513;
      box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.3);
    }
  }
  
  &.purple {
    &.selected, &:hover {
      border-color: #9b59b6;
      box-shadow: 0 0 0 2px rgba(155, 89, 182, 0.3);
    }
  }
}
</style>