<template>
  <div class="color-palette">
    <div class="color-selector" ref="paletteRef">
      <div 
        ref="selectedColorRef"
        class="selected-color"
        :class="[selectedColor ? `color-${selectedColor}` : 'no-color']"
        @click="togglePalette"
        :title="selectedColor ? getColorTitle(selectedColor) : 'Выберите цвет'"
      >
        <span v-if="!selectedColor" class="placeholder">?</span>
      </div>
      
      <div v-if="showPalette" class="color-dropdown">
        <div class="color-grid">
          <button
            v-for="color in colors"
            :key="color"
            class="color-button"
            :class="{ 
              selected: selectedColor === color,
              disabled: isColorTaken(color),
              [`color-${color}`]: true
            }"
            :disabled="isColorTaken(color)"
            @click="selectColor(color)"
            :title="getColorTitle(color)"
          >
            <span v-if="selectedColor === color" class="checkmark">✓</span>
            <span v-else-if="isColorTaken(color)" class="taken-mark">✗</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  selectedColor: {
    type: String,
    default: null
  },
  takenColors: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['color-selected'])

import { ref, onMounted, onUnmounted } from 'vue'
const showPalette = ref(false)
const paletteRef = ref(null)
const selectedColorRef = ref(null)

// Палитра цветов, отсортированная по спектру
const colors = [
  'red', 'deep-orange', 'orange', 'yellow',    // Красные и оранжевые тона
  'green', 'dark-green', 'cyan', 'blue',       // Зеленые и синие тона  
  'purple', 'pink', 'brown', 'grey'            // Фиолетовые и нейтральные тона
]

const colorNames = {
  'red': 'Красный',
  'orange': 'Оранжевый', 
  'yellow': 'Желтый',
  'green': 'Зеленый',
  'blue': 'Синий',
  'purple': 'Фиолетовый',
  'pink': 'Розовый',
  'brown': 'Коричневый',
  'grey': 'Серый',
  'deep-orange': 'Темно-оранжевый',
  'dark-green': 'Темно-зеленый',
  'cyan': 'Голубой'
}

const isColorTaken = (color) => {
  return props.takenColors.includes(color)
}

const getColorTitle = (color) => {
  const name = colorNames[color] || color
  if (isColorTaken(color)) {
    return `${name} (занят)`
  }
  return name
}

const positionPalette = () => {
  // Упрощенное позиционирование - просто показываем под кнопкой
}

const togglePalette = (event) => {
  if (!props.disabled) {
    event.stopPropagation()
    showPalette.value = !showPalette.value
  }
}

const handleClickOutside = (event) => {
  if (paletteRef.value && !paletteRef.value.contains(event.target)) {
    showPalette.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const selectColor = (color) => {
  console.log('🎨 ColorPalette: selectColor called with:', color)
  console.log('🚫 ColorPalette: disabled:', props.disabled)
  console.log('🔒 ColorPalette: isColorTaken:', isColorTaken(color))
  console.log('🎯 ColorPalette: selected color:', props.selectedColor)
  console.log('📋 ColorPalette: taken colors:', props.takenColors)
  
  if (!props.disabled && !isColorTaken(color)) {
    console.log('✅ ColorPalette: Emitting color-selected:', color)
    emit('color-selected', color)
    showPalette.value = false
  } else {
    console.log('❌ ColorPalette: Color selection blocked')
  }
}
</script>

<style scoped>
.color-palette {
  display: flex;
  align-items: center;
}

.color-selector {
  position: relative;
  display: inline-block;
}

.selected-color {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
}

.selected-color:hover {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.6);
}

.selected-color.no-color {
  background-color: #666;
  border-color: #999;
}

.placeholder {
  font-size: 10px;
  color: #ccc;
}

.color-dropdown {
  position: absolute;
  top: 30px;
  right: -12px;
  /* transform: translateX(-50%); */
  background: rgba(33, 33, 33, 0.9);
  border: none;
  border-radius: 12px;
  padding: 12px;
  z-index: 9999;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 15px 24px rgba(0, 0, 0, 0.5);
  min-width: max-content;
  white-space: nowrap;
  backdrop-filter: blur(10px);
  user-select: none;
}

/* Если палитра выходит за правый край экрана */
@media (max-width: 300px) {
  .color-dropdown {
    left: 0;
    transform: none;
    right: auto;
  }
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-width: 200px;
}

.color-button {
  width: 35px;
  height: 35px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
}

.color-button:hover:not(:disabled) {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.5);
}

.color-button.selected {
  border-color: #fff;
  transform: scale(1.1);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.color-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkmark {
  font-size: 16px;
}

.taken-mark {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

/* Color styles */
.selected-color, .color-button {
  &.color-red { background-color: #ff3520; }
  &.color-orange { background-color: #ff8d00; }
  &.color-yellow { background-color: #ffcc00; }
  &.color-green { background-color: #0ab352; }
  &.color-blue { background-color: #0069eb; }
  &.color-purple { background-color: #7640df; }
  &.color-pink { background-color: #ff6b9b; }
  &.color-brown { background-color: #93472b; }
  &.color-grey { background-color: #89959b; }
  &.color-deep-orange { background-color: #ff5722; }
  &.color-dark-green { background-color: #19c585; }
  &.color-cyan { background-color: #00bcd4; }
}
</style>