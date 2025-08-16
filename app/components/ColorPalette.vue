<template>
  <div class="color-palette">
    <div class="palette-title">Выберите цвет:</div>
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

// Палитра из 12 цветов (4 колонки, 3 ряда)
const colors = [
  'red', 'orange', 'yellow', 'green',        // Красный, Оранжевый, Желтый, Зеленый
  'blue', 'purple', 'pink', 'brown',         // Синий, Фиолетовый, Розовый, Коричневый  
  'grey', 'deep-orange', 'dark-green', 'cyan' // Серый, Темно-оранжевый, Темно-зеленый, Голубой
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

const selectColor = (color) => {
  console.log('🎨 ColorPalette: selectColor called with:', color)
  console.log('🚫 ColorPalette: disabled:', props.disabled)
  console.log('🔒 ColorPalette: isColorTaken:', isColorTaken(color))
  console.log('🎯 ColorPalette: selected color:', props.selectedColor)
  console.log('📋 ColorPalette: taken colors:', props.takenColors)
  
  if (!props.disabled && !isColorTaken(color)) {
    console.log('✅ ColorPalette: Emitting color-selected:', color)
    emit('color-selected', color)
  } else {
    console.log('❌ ColorPalette: Color selection blocked')
  }
}
</script>

<style scoped>
.color-palette {
  margin: 20px 0;
}

.palette-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
  color: #fff;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-width: 200px;
}

.color-button {
  width: 40px;
  height: 40px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
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
  font-size: 18px;
}

.taken-mark {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
}

/* Color styles */
.color-button {
  &.color-red { background-color: #e74c3c; }
  &.color-orange { background-color: #e67e22; }
  &.color-yellow { background-color: #f1c40f; }
  &.color-green { background-color: #2ecc71; }
  &.color-blue { background-color: #3498db; }
  &.color-purple { background-color: #9b59b6; }
  &.color-pink { background-color: #e91e63; }
  &.color-brown { background-color: #795548; }
  &.color-grey { background-color: #607d8b; }
  &.color-deep-orange { background-color: #ff5722; }
  &.color-dark-green { background-color: #4caf50; }
  &.color-cyan { background-color: #00bcd4; }
}
</style>