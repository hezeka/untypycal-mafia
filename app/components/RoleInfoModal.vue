<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>{{ currentUsername ? 'Сменить имя' : 'Введите имя' }}</h3>
      <input 
        v-model="newUsername"
        @keypress.enter="save"
        type="text"
        placeholder="Ваше имя"
        maxlength="16"
        ref="usernameInput"
      />
      <div class="modal-actions">
        <button @click="save" :disabled="!canSave">Сохранить</button>
        <button @click="$emit('close')">Отмена</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps(['currentUsername'])
const emit = defineEmits(['save', 'close'])

const newUsername = ref(props.currentUsername || '')
const usernameInput = ref(null)

const canSave = computed(() => {
  return newUsername.value.trim().length >= 2 && newUsername.value.trim().length <= 16
})

const save = () => {
  if (canSave.value) {
    emit('save', newUsername.value.trim())
  }
}

onMounted(() => {
  usernameInput.value?.focus()
})
</script>