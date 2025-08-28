<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content roles-modal" @click.stop>
      <div class="modal-header">
        <h3>Роли в игре</h3>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>
      
      <div class="roles-container" v-if="roles.length > 0">
        <div 
          v-for="role in roles" 
          :key="role.id"
          class="role-item"
          :class="{ 'not-implemented': !role.implemented }"
        >
          <div class="role-image">
            <img 
              :src="role.image" 
              :alt="role.name"
              @error="onImageError"
              class="role-img"
            />
          </div>
          
          <div class="role-info">
            <div class="role-header">
              <h4 class="role-name">{{ role.name }}</h4>
              <span class="role-team" :class="`team-${role.team}`">
                {{ getTeamName(role.team) }}
              </span>
            </div>
            
            <p class="role-description">{{ role.description }}</p>
            
            <div class="role-meta">
              <span v-if="role.hasNightAction" class="night-action">
                🌙 Ночное действие (порядок: {{ role.nightOrder }})
              </span>
              <span v-if="!role.implemented" class="not-implemented-badge">
                ⚠ Не реализована
              </span>
            </div>
            
            <div v-if="role.phaseHints && Object.keys(role.phaseHints).length > 0" class="phase-hints">
              <div v-for="(hint, phase) in role.phaseHints" :key="phase" class="phase-hint">
                <strong>{{ getPhaseLabel(phase) }}:</strong> {{ hint }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="no-roles">
        <p>Роли не выбраны или не удалось загрузить данные</p>
      </div>
      
      <div class="modal-footer">
        <div class="roles-stats">
          <span>Всего ролей: {{ roles.length }}</span>
          <span v-if="centerCards > 0">• Центральные карты: {{ centerCards }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAPI } from '~/composables/useAPI'

const emit = defineEmits(['close'])
const route = useRoute()

const roles = ref([])
const centerCards = ref(0)
const loading = ref(true)
const error = ref(null)

const fetchRoles = async () => {
  try {
    loading.value = true
    const api = useAPI()
    const data = await api.getRoomRoles(route.params.id)
    roles.value = data.roles || []
    centerCards.value = data.centerCards || 0
  } catch (err) {
    error.value = err.message
    console.error('Error fetching roles:', err)
  } finally {
    loading.value = false
  }
}

const onImageError = (event) => {
  // Заменяем на card-back.png если роль не найдена
  event.target.src = '/roles/card-back.png'
}

const getTeamName = (team) => {
  const teamNames = {
    village: 'Деревня',
    werewolf: 'Оборотни', 
    special: 'Особые',
    tanner: 'Неудачник'
  }
  return teamNames[team] || team
}

const getPhaseLabel = (phase) => {
  const phaseLabels = {
    night: 'Ночью',
    day: 'Днём',
    voting: 'При голосовании'
  }
  return phaseLabels[phase] || phase
}

onMounted(() => {
  fetchRoles()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content.roles-modal {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 0;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  color: white;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #444;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #ccc;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #fff;
}

.roles-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.role-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #333;
  border-radius: 8px;
  border-left: 4px solid #555;
}

.role-item.not-implemented {
  opacity: 0.7;
  border-left-color: #ff6b6b;
}

.role-image {
  flex-shrink: 0;
}

.role-img {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  background: #444;
}

.role-info {
  flex: 1;
}

.role-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.role-name {
  margin: 0;
  font-size: 18px;
  color: #fff;
}

.role-team {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.team-village { background: #4CAF50; color: white; }
.team-werewolf { background: #f44336; color: white; }
.team-special { background: #9C27B0; color: white; }
.team-tanner { background: #FF9800; color: white; }

.role-description {
  margin: 0 0 12px 0;
  color: #ccc;
  line-height: 1.4;
}

.role-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.night-action {
  font-size: 12px;
  color: #64B5F6;
}

.not-implemented-badge {
  font-size: 12px;
  color: #ff6b6b;
}

.phase-hints {
  border-top: 1px solid #444;
  padding-top: 8px;
}

.phase-hint {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}

.phase-hint strong {
  color: #fff;
}

.no-roles {
  padding: 40px;
  text-align: center;
  color: #aaa;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #444;
  background: #1a1a1a;
  border-radius: 0 0 12px 12px;
}

.roles-stats {
  display: flex;
  gap: 12px;
  font-size: 14px;
  color: #aaa;
}
</style>