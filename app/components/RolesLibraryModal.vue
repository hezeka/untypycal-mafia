<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content roles-library-modal">
      <button @click="$emit('close')" class="modal-close">×</button>
      
      <div class="modal-header">
        <h2 class="modal-title">Библиотека ролей</h2>
        <div class="modal-filters">
          <button 
            @click="showAll = !showAll" 
            class="filter-btn"
            :class="{ active: showAll }"
          >
            {{ showAll ? 'Скрыть нереализованные' : 'Показать все роли' }}
          </button>
        </div>
      </div>
      
      <div class="teams-tabs">
        <button 
          v-for="team in teams" 
          :key="team.id"
          @click="activeTeam = team.id"
          class="team-tab"
          :class="{ active: activeTeam === team.id }"
        >
          <span class="team-icon" :class="`team-${team.id}`">{{ team.icon }}</span>
          {{ team.name }}
          <span class="team-count">({{ getTeamRolesCount(team.id) }})</span>
        </button>
      </div>
      
      <div class="roles-content">
        <div class="roles-grid-container">
          <div class="roles-grid">
            <div 
              v-for="([roleId, role]) in filteredRoles" 
              :key="roleId"
              class="role-card"
              :class="{ 
                [`team-${role.team}`]: true,
                'not-implemented': !role.implemented
              }"
            >
              <div class="role-header">
                <div class="role-image-container">
                  <img 
                    :src="`/roles/compressed/${roleId}.webp`" 
                    :alt="role.name"
                    @error="handleImageError($event, roleId)"
                    class="role-image"
                  />
                  
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
                  <h3 class="role-name">{{ role.name }}</h3>
                  <div class="role-team-badge" :class="`team-${role.team}`">
                    {{ getTeamName(role.team) }}
                  </div>
                </div>
              </div>
              
              <div class="role-body">
                <p class="role-description">{{ role.description }}</p>
                
                <!-- Подсказки по фазам -->
                <div v-if="role.phaseHints && Object.keys(role.phaseHints).length > 0" class="phase-hints">
                  <h4>Подсказки:</h4>
                  <div v-for="(hint, phase) in role.phaseHints" :key="phase" class="phase-hint">
                    <strong>{{ getPhaseLabel(phase) }}:</strong> {{ hint }}
                  </div>
                </div>
                
                <!-- Дополнительная информация -->
                <div class="role-meta">
                  <div v-if="role.hasNightAction" class="meta-item night-action">
                    🌙 Ночное действие (порядок: {{ role.nightOrder }})
                  </div>
                  <div v-if="!role.implemented" class="meta-item not-implemented">
                    ⚠ Роль в разработке
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <div class="roles-stats">
          <span>Всего ролей: {{ totalRolesCount }}</span>
          <span>• Реализованных: {{ implementedRolesCount }}</span>
          <span v-if="showAll">• В разработке: {{ totalRolesCount - implementedRolesCount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { getAllRoles, getTeamNames } from '../../../shared/rolesRegistry.js'

const emit = defineEmits(['close'])

const roles = getAllRoles()
const teamNames = getTeamNames()
const showAll = ref(false)
const activeTeam = ref('all')

const teams = [
  { id: 'all', name: 'Все роли', icon: '🎭' },
  { id: 'village', name: 'Деревня', icon: '🏘️' },
  { id: 'werewolf', name: 'Оборотни', icon: '🐺' },
  { id: 'special', name: 'Особые', icon: '✨' },
  { id: 'tanner', name: 'Неудачник', icon: '😔' }
]

// Сортированные роли
const sortedRoles = computed(() => {
  const teamOrder = {
    'village': 1,
    'werewolf': 2,
    'tanner': 3,
    'special': 4
  }
  
  return Object.entries(roles).sort(([aId, aRole], [bId, bRole]) => {
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

// Отфильтрованные роли
const filteredRoles = computed(() => {
  let filtered = sortedRoles.value
  
  // Фильтр по реализации
  if (!showAll.value) {
    filtered = filtered.filter(([roleId, role]) => role.implemented)
  }
  
  // Фильтр по команде
  if (activeTeam.value !== 'all') {
    filtered = filtered.filter(([roleId, role]) => role.team === activeTeam.value)
  }
  
  return filtered
})

const totalRolesCount = computed(() => {
  return Object.keys(roles).length
})

const implementedRolesCount = computed(() => {
  return Object.values(roles).filter(role => role.implemented).length
})

const handleImageError = (event, roleId) => {
  // Сначала пробуем несжатую версию
  if (event.target.src.includes('compressed')) {
    event.target.src = `/roles/${roleId}.png`
  } else {
    // Если и несжатая не загрузилась, показываем card-back
    event.target.src = '/roles/card-back.png'
  }
}

const getTeamRolesCount = (teamId) => {
  if (teamId === 'all') {
    return showAll.value ? totalRolesCount.value : implementedRolesCount.value
  }
  
  const teamRoles = Object.values(roles).filter(role => role.team === teamId)
  return showAll.value ? teamRoles.length : teamRoles.filter(role => role.implemented).length
}

const getTeamName = (teamId) => teamNames[teamId] || teamId

const getPhaseLabel = (phase) => {
  const phaseLabels = {
    night: 'Ночью',
    day: 'Днём', 
    voting: 'При голосовании'
  }
  return phaseLabels[phase] || phase
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content.roles-library-modal {
  background: #1a1a1a;
  border-radius: 12px;
  width: 95vw;
  max-width: 1400px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
  color: white;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: #ccc;
  font-size: 24px;
  cursor: pointer;
  z-index: 10;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.modal-close:hover {
  color: #fff;
  background: #333;
}

.modal-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.modal-filters {
  display: flex;
  gap: 12px;
}

.filter-btn {
  background: #333;
  color: #ccc;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #444;
  color: #fff;
}

.filter-btn.active {
  background: #4f46e5;
  color: #fff;
}

.teams-tabs {
  display: flex;
  padding: 0 24px;
  border-bottom: 1px solid #333;
  gap: 4px;
}

.team-tab {
  background: none;
  border: none;
  color: #ccc;
  padding: 16px 20px;
  cursor: pointer;
  font-size: 14px;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.team-tab:hover {
  color: #fff;
  background: #222;
}

.team-tab.active {
  color: #fff;
  border-bottom-color: #4f46e5;
}

.team-icon {
  font-size: 16px;
}

.team-count {
  color: #888;
  font-size: 12px;
}

.roles-content {
  flex: 1;
  overflow: hidden;
  padding: 24px;
}

.roles-grid-container {
  height: 100%;
  overflow-y: auto;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.role-card {
  background: #2a2a2a;
  border: 2px solid #444;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
}

.role-card:hover {
  transform: translateY(-4px);
  border-color: #666;
}

.role-card.not-implemented {
  opacity: 0.8;
  border-style: dashed;
}

/* Команды */
.role-card.team-village {
  border-left: 4px solid #4CAF50;
}

.role-card.team-werewolf {
  border-left: 4px solid #f44336;
}

.role-card.team-special {
  border-left: 4px solid #9C27B0;
}

.role-card.team-tanner {
  border-left: 4px solid #FF9800;
}

.role-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.role-image-container {
  position: relative;
  flex-shrink: 0;
}

.role-image {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
}

.night-action-badge {
  position: absolute;
  bottom: -6px;
  right: -6px;
  background: #1e40af;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.not-implemented-badge {
  position: absolute;
  top: -6px;
  left: -6px;
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
}

.role-name {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  color: #fff;
}

.role-team-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  display: inline-block;
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

.role-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-description {
  margin: 0;
  color: #d1d5db;
  line-height: 1.5;
}

.phase-hints h4 {
  margin: 0 0 8px 0;
  color: #fff;
  font-size: 14px;
}

.phase-hint {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
  line-height: 1.4;
}

.phase-hint strong {
  color: #fff;
}

.role-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-item {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-item.night-action {
  color: #64B5F6;
}

.meta-item.not-implemented {
  color: #ff6b6b;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #333;
  background: #111;
  border-radius: 0 0 12px 12px;
}

.roles-stats {
  display: flex;
  gap: 12px;
  font-size: 14px;
  color: #aaa;
  justify-content: center;
}
</style>