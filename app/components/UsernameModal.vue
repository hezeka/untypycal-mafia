<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>{{ currentUsername ? 'Изменить имя' : 'Введите ваше имя' }}</h3>
      
      <input 
        v-model="username"
        @keyup.enter="save"
        type="text"
        placeholder="Ваше имя"
        maxlength="16"
        ref="input"
      />
      
      <div class="modal-buttons">
        <button @click="save" :disabled="!isValid">Сохранить</button>
        <button @click="$emit('close')">Отмена</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps(['currentUsername'])
const emit = defineEmits(['save', 'close'])

const username = ref(props.currentUsername || '')
const input = ref()

const isValid = computed(() => {
  return username.value.trim().length >= 2 && username.value.trim().length <= 16
})

const save = () => {
  if (isValid.value) {
    emit('save', username.value.trim())
  }
}

onMounted(() => {
  input.value?.focus()
})
</script>