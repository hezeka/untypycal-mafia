<template>
  <div class="roles-container">
    <div class="roles-grid">
      <div 
        v-for="([roleId, role]) in sortedRoles" 
        :key="roleId"
        class="role-item"
        :class="{ 
          'selected': isRoleSelected ? isRoleSelected(roleId) : false,
          'loading': loading.has(roleId),
          'readonly': readonly,
          [`team-${role.team}`]: true,
          'has-night-action': role.hasNightAction,
          'not-implemented': !role.implemented
        }"
        @click="handleRoleClick(roleId)"
      >
        <div class="role-image-container">
          <img 
            :src="`/roles/compressed/${roleId}.webp`" 
            :alt="role.name"
            @error="handleImageError($event, roleId)"
            class="role-image"
          />
          <div v-if="getRoleCount && getRoleCount(roleId) > 0" class="role-count">{{ getRoleCount(roleId) }}</div>
          
          <!-- Ночное действие -->
          <div v-if="role.hasNightAction" class="night-action-badge">
            <span class="night-icon">🌙</span>
            <span class="night-order">{{ role.nightOrder }}</span>
          </div>

          <!-- Не реализована -->
          <div v-if="!role.implemented" class="not-implemented-badge">
            ⚠
          </div>
        </div>
        
        <div class="role-info">
          <div class="role-name">{{ role.name }}</div>
          <div class="role-description">{{ role.description }}</div>
          
          <!-- Команда -->
          <div class="role-team-badge" :class="`team-${role.team}`">
            {{ getTeamName(role.team) }}
          </div>

          <!-- Подсказки по фазам -->
          <div v-if="role.phaseHints && Object.keys(role.phaseHints).length > 0" class="phase-hints">
            <div v-for="(hint, phase) in role.phaseHints" :key="phase" class="phase-hint">
              <strong>{{ getPhaseLabel(phase) }}:</strong> {{ hint }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { getAllRoles, getTeamNames } from '../../../shared/rolesRegistry.js'

const props = defineProps({
  selectedRoles: {
    type: Array,
    default: () => []
  },
  readonly: {
    type: Boolean,
    default: false
  },
  onRoleClick: {
    type: Function,
    default: null
  },
  loading: {
    type: Set,
    default: () => new Set()
  },
  showAllRoles: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['roleClick'])

const roles = getAllRoles()
const teamNames = getTeamNames()

// Сортировка ролей по команде, затем по ночной очереди, затем по названию
const sortedRoles = computed(() => {
  const teamOrder = {
    'village': 1,
    'werewolf': 2,
    'tanner': 3,
    'special': 4
  }
  
  let rolesToShow = Object.entries(roles)
  
  // Если showAllRoles false, показываем только реализованные
  if (!props.showAllRoles) {
    rolesToShow = rolesToShow.filter(([roleId, role]) => role.implemented)
  }
  
  return rolesToShow.sort(([aId, aRole], [bId, bRole]) => {
    // Сначала сортируем по команде
    const aTeamOrder = teamOrder[aRole.team] || 999
    const bTeamOrder = teamOrder[bRole.team] || 999
    
    if (aTeamOrder !== bTeamOrder) {
      return aTeamOrder - bTeamOrder
    }
    
    // Затем по ночной очереди (не указанные идут первыми)
    const aNightOrder = aRole.nightOrder || 0
    const bNightOrder = bRole.nightOrder || 0
    
    if (aNightOrder !== bNightOrder) {
      return aNightOrder - bNightOrder
    }
    
    // Затем по названию
    return aRole.name.localeCompare(bRole.name, 'ru')
  })
})

const isRoleSelected = (roleId) => props.selectedRoles.includes(roleId)
const getRoleCount = (roleId) => props.selectedRoles.filter(id => id === roleId).length
const getTeamName = (teamId) => teamNames[teamId] || teamId

const getPhaseLabel = (phase) => {
  const phaseLabels = {
    night: 'Ночью',
    day: 'Днём',
    voting: 'При голосовании'
  }
  return phaseLabels[phase] || phase
}

const handleRoleClick = (roleId) => {
  if (props.readonly) return
  
  if (props.onRoleClick) {
    props.onRoleClick(roleId)
  } else {
    emit('roleClick', roleId)
  }
}

const handleImageError = (event, roleId) => {
  // Сначала пробуем несжатую версию
  if (event.target.src.includes('compressed')) {
    event.target.src = `/roles/${roleId}.png`
  } else {
    // Если и несжатая не загрузилась, показываем card-back
    event.target.src = '/roles/card-back.png'
  }
}
</script>

<style scoped>
.roles-container {
  width: 100%;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.role-item {
  display: flex;
  flex-direction: column;
  background: #2a2a2a;
  border: 2px solid #444;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.role-item:not(.readonly):hover {
  border-color: #666;
  transform: translateY(-2px);
}

.role-item.readonly {
  cursor: default;
}

.role-item.loading {
  opacity: 0.6;
  pointer-events: none;
}

.role-item.selected {
  border-color: #4f46e5;
  background: #312e81;
}

.role-item.not-implemented {
  opacity: 0.7;
  border-style: dashed;
}

/* Команды */
.role-item.team-village {
  border-left: 4px solid #4CAF50;
}

.role-item.team-werewolf {
  border-left: 4px solid #f44336;
}

.role-item.team-special {
  border-left: 4px solid #9C27B0;
}

.role-item.team-tanner {
  border-left: 4px solid #FF9800;
}

.role-image-container {
  position: relative;
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: center;
}

.role-image {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
}

.role-count {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #4f46e5;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.night-action-badge {
  position: absolute;
  bottom: -8px;
  right: -8px;
  background: #1e40af;
  color: white;
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.not-implemented-badge {
  position: absolute;
  top: -8px;
  left: -8px;
  background: #dc2626;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.role-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.role-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: #f9fafb;
  margin-bottom: 0.25rem;
}

.role-description {
  font-size: 0.875rem;
  color: #d1d5db;
  line-height: 1.4;
  flex: 1;
}

.role-team-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  text-align: center;
  margin-top: 0.5rem;
}

.role-team-badge.team-village { 
  background: #4CAF50; 
  color: white; 
}

.role-team-badge.team-werewolf { 
  background: #f44336; 
  color: white; 
}

.role-team-badge.team-special { 
  background: #9C27B0; 
  color: white; 
}

.role-team-badge.team-tanner { 
  background: #FF9800; 
  color: white; 
}

.phase-hints {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #444;
}

.phase-hint {
  font-size: 11px;
  color: #aaa;
  margin-bottom: 2px;
  line-height: 1.3;
}

.phase-hint strong {
  color: #fff;
}
</style>