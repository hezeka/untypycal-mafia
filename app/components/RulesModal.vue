<template>
  <div class="rules-modal-overlay" @click="$emit('close')">
    <div class="rules-modal" @click.stop>
      <div class="modal-header">
        <h2>Правила игры</h2>
        <button @click="$emit('close')" class="close-btn">✕</button>
      </div>
      
      <div class="modal-controls">
        <div class="rules-toggle">
          <button 
            @click="activeTab = 'players'"
            class="tab-btn"
            :class="{ active: activeTab === 'players' }"
          >
            👥 Для игроков
          </button>
          <button 
            @click="activeTab = 'gamemaster'"
            class="tab-btn"
            :class="{ active: activeTab === 'gamemaster' }"
          >
            🎭 Для ведущих
          </button>
        </div>
      </div>
      
      <div class="modal-content">
        <div class="rules-content">
          <!-- Правила для игроков -->
          <div v-if="activeTab === 'players'" class="rules-section">
            <div v-if="playersRules" v-html="renderedPlayersRules" class="markdown-content"></div>
            <div v-else class="no-rules">
              <p>Правила для игроков пока не добавлены.</p>
              <p class="hint">Администратор может добавить правила в настройках.</p>
            </div>
          </div>
          
          <!-- Правила для ведущих -->
          <div v-if="activeTab === 'gamemaster'" class="rules-section">
            <div v-if="gamemasterRules" v-html="renderedGamemasterRules" class="markdown-content"></div>
            <div v-else class="no-rules">
              <p>Правила для ведущих пока не добавлены.</p>
              <p class="hint">Администратор может добавить правила в настройках.</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Кнопка редактирования для ведущего -->
      <div v-if="isHost" class="modal-footer">
        <button @click="openEditor" class="btn btn-secondary">
          ⚙️ Редактировать правила
        </button>
      </div>
    </div>
    
    <!-- Редактор правил -->
    <div v-if="showEditor" class="rules-editor-overlay" @click="closeEditor">
      <div class="rules-editor" @click.stop>
        <div class="editor-header">
          <h3>Редактировать правила</h3>
          <button @click="closeEditor" class="close-btn">✕</button>
        </div>
        
        <div class="editor-tabs">
          <button 
            @click="editorTab = 'players'"
            class="tab-btn"
            :class="{ active: editorTab === 'players' }"
          >
            👥 Для игроков
          </button>
          <button 
            @click="editorTab = 'gamemaster'"
            class="tab-btn"
            :class="{ active: editorTab === 'gamemaster' }"
          >
            🎭 Для ведущих
          </button>
        </div>
        
        <div class="editor-content">
          <div class="editor-actions-top">
            <button @click="loadFromFile" class="btn btn-secondary btn-small">
              📁 Загрузить файл
            </button>
            <button @click="loadDefaults" class="btn btn-secondary btn-small">
              📋 Загрузить стандартные правила
            </button>
            <button @click="downloadRules" class="btn btn-secondary btn-small">
              💾 Скачать как файл
            </button>
          </div>
          
          <div class="editor-grid">
            <!-- Редактор -->
            <div class="editor-pane">
              <label class="editor-label">
                Markdown ({{ editorTab === 'players' ? 'игроки' : 'ведущие' }}):
              </label>
              <textarea 
                v-model="editingRules[editorTab]"
                class="markdown-editor"
                placeholder="Введите правила в формате Markdown..."
                @input="updatePreview"
              ></textarea>
            </div>
            
            <!-- Превью -->
            <div class="preview-pane">
              <label class="editor-label">Превью:</label>
              <div 
                class="markdown-preview markdown-content"
                v-html="currentPreview"
              ></div>
            </div>
          </div>
          
          <div class="editor-actions">
            <button @click="saveRules" class="btn btn-primary">
              💾 Сохранить
            </button>
            <button @click="resetRules" class="btn btn-secondary">
              🔄 Сбросить
            </button>
            <button @click="closeEditor" class="btn btn-secondary">
              ❌ Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Скрытый input для загрузки файлов -->
    <input 
      ref="fileInput"
      type="file"
      accept=".md,.txt"
      style="display: none"
      @change="handleFileUpload"
    >
  </div>
</template>

<script setup>
const props = defineProps({
  isHost: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const activeTab = ref('players')
const showEditor = ref(false)
const editorTab = ref('players')
const fileInput = ref(null)

// Правила (загружаем только из файлов)
const playersRules = ref('')
const gamemasterRules = ref('')

// Редактируемые правила
const editingRules = reactive({
  players: '',
  gamemaster: ''
})

// Продвинутый Markdown парсер
const parseMarkdown = (text) => {
  if (!text) return ''
  
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    
    // Заголовки
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Код блоки
    .replace(/```([^`]+)```/gims, '<pre><code>$1</code></pre>')
    
    // Жирный и курсив
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    
    // Инлайн код
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    
    // Ссылки
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    
    // Зачеркнутый текст
    .replace(/~~(.*?)~~/gim, '<del>$1</del>')
    
    // Горизонтальная линия
    .replace(/^---$/gim, '<hr>')
    .replace(/^\*\*\*$/gim, '<hr>')
    
    // Цитаты
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    
    // Списки (упорядоченные)
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    
    // Списки (неупорядоченные)
    .replace(/^[\*\-\+] (.*$)/gim, '<li>$1</li>')
    
    // Обертка для списков
    .replace(/(<li>.*<\/li>)/gims, (match) => {
      // Проверяем, есть ли цифры в начале оригинального текста для определения типа списка
      const isOrdered = /^\d+\./.test(text.substring(text.indexOf(match.replace(/<[^>]*>/g, ''))))
      return isOrdered ? `<ol>${match}</ol>` : `<ul>${match}</ul>`
    })
    
    // Таблицы (упрощенная поддержка)
    .replace(/\|(.+)\|/gim, (match, content) => {
      const cells = content.split('|').map(cell => `<td>${cell.trim()}</td>`).join('')
      return `<tr>${cells}</tr>`
    })
    .replace(/(<tr>.*<\/tr>)/gims, '<table>$1</table>')
    
    // Переносы строк и параграфы
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br>')
    
    // Обертываем в параграфы
    .replace(/^(.*)$/gims, '<p>$1</p>')
    
    // Убираем пустые параграфы
    .replace(/<p><\/p>/gim, '')
    .replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/gim, '$1')
    .replace(/<p>(<hr>)<\/p>/gim, '$1')
    .replace(/<p>(<blockquote>.*<\/blockquote>)<\/p>/gim, '$1')
    .replace(/<p>(<[ou]l>.*<\/[ou]l>)<\/p>/gim, '$1')
    .replace(/<p>(<table>.*<\/table>)<\/p>/gim, '$1')
    .replace(/<p>(<pre>.*<\/pre>)<\/p>/gim, '$1')

  return html
}

// Computed для отрендеренного контента
const renderedPlayersRules = computed(() => parseMarkdown(playersRules.value))
const renderedGamemasterRules = computed(() => parseMarkdown(gamemasterRules.value))
const currentPreview = computed(() => parseMarkdown(editingRules[editorTab.value]))

// Методы редактора
const openEditor = () => {
  editingRules.players = playersRules.value
  editingRules.gamemaster = gamemasterRules.value
  editorTab.value = activeTab.value
  showEditor.value = true
}

const closeEditor = () => {
  showEditor.value = false
}

const updatePreview = () => {
  // Реактивность уже работает через computed
}

const saveRules = () => {
  playersRules.value = editingRules.players
  gamemasterRules.value = editingRules.gamemaster
  
  showEditor.value = false
  
  // Можно добавить уведомление
  alert('Правила сохранены!')
}

const resetRules = () => {
  if (confirm('Сбросить все изменения?')) {
    editingRules.players = playersRules.value
    editingRules.gamemaster = gamemasterRules.value
  }
}

// Загрузка файла
const loadFromFile = () => {
  fileInput.value?.click()
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target.result
    editingRules[editorTab.value] = content
  }
  reader.readAsText(file)
  
  // Сбрасываем input
  event.target.value = ''
}

// Загрузка стандартных правил через fetch
const loadDefaults = async () => {
  if (!confirm('Загрузить стандартные правила? Текущий текст будет заменен.')) return
  
  try {
    const filename = editorTab.value === 'players' ? 'players.md' : 'gamemaster.md'
    const response = await fetch(`/rules/${filename}`)
    
    if (response.ok) {
      const content = await response.text()
      editingRules[editorTab.value] = content
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error('Ошибка загрузки правил:', error)
    // Fallback контент
    if (editorTab.value === 'players') {
      editingRules.players = `# Правила для игроков

## Цель игры
Найти и убить всех оборотней в городе.

## Как играть
1. Каждый игрок получает роль
2. Ночью роли с ночными способностями действуют
3. Днем все обсуждают кто может быть оборотнем
4. Голосованием убивают подозреваемого

## Победа
- **Деревня побеждает** если убили хотя бы одного оборотня
- **Оборотни побеждают** если их не убили
- **Неудачник побеждает** если его убили`
    } else {
      editingRules.gamemaster = `# Правила для ведущих

## Подготовка игры
1. Выберите роли (количество ролей = игроки + 3)
2. Раздайте роли игрокам
3. 3 карты остаются в центре

## Ведение ночной фазы
Объявляйте роли в правильном порядке:
1. Страж
2. Доппельгангер  
3. Оборотни
4. Альфа-волк
5. Мистический волк
6. И так далее...

## Важно
- Следите за перемещениями карт
- Не выдавайте информацию мимикой
- Будьте беспристрастны`
    }
  }
}

// Скачивание правил как файл
const downloadRules = () => {
  const content = editingRules[editorTab.value]
  if (!content.trim()) {
    alert('Нет контента для скачивания')
    return
  }
  
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `rules_${editorTab.value}.md`
  link.click()
  
  URL.revokeObjectURL(url)
}

// Загружаем правила при монтировании из файлов
onMounted(async () => {
  // Загружаем правила для игроков
  try {
    const response = await fetch('/rules/players.md')
    if (response.ok) {
      const content = await response.text()
      playersRules.value = content
    }
  } catch (error) {
    console.log('Ошибка загрузки правил для игроков:', error)
  }
  
  // Загружаем правила для ведущих
  try {
    const response = await fetch('/rules/gamemaster.md')
    if (response.ok) {
      const content = await response.text()
      gamemasterRules.value = content
    }
  } catch (error) {
    console.log('Ошибка загрузки правил для ведущих:', error)
  }
})
</script>

<style lang="less" scoped>
.rules-modal-overlay {
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

.rules-modal {
  background: rgba(10, 10, 10, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h2 {
    margin: 0;
    color: #ffffff;
    margin-left: 6px;
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

.modal-controls {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.rules-toggle, .editor-tabs {
  display: flex;
  gap: 8px;
  
  .tab-btn {
    padding: 8px 16px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
    
    &.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
  }
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.rules-content {
    padding: 0 32px 16px;
  .no-rules {
    text-align: center;
    padding: 40px 20px;
    color: rgba(255, 255, 255, 0.6);
    
    .hint {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 8px;
    }
  }
}

.markdown-content {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  
  h1, h2, h3 {
    color: #667eea;
    margin-top: 24px;
    margin-bottom: 16px;
    
    &:first-child {
      margin-top: 0;
    }
  }
  
  h1 { font-size: 24px; }
  h2 { font-size: 20px; }
  h3 { font-size: 18px; }
  
  p {
    margin-bottom: 16px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  ul, ol {
    margin: 16px 0;
    padding-left: 20px;
    
    li {
      margin-bottom: 8px;
      
      &::marker {
        color: #667eea;
      }
    }
  }
  
  blockquote {
    border-left: 4px solid #667eea;
    padding-left: 16px;
    margin: 16px 0;
    color: rgba(255, 255, 255, 0.8);
    font-style: italic;
  }
  
  code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    color: #f39c12;
  }
  
  pre {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
    overflow-x: auto;
    
    code {
      background: none;
      padding: 0;
      color: rgba(255, 255, 255, 0.9);
    }
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    
    td {
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 8px 12px;
    }
  }
  
  hr {
    border: none;
    height: 1px;
    background: rgba(255, 255, 255, 0.2);
    margin: 24px 0;
  }
  
  strong {
    color: white;
    font-weight: 600;
  }
  
  em {
    color: rgba(255, 255, 255, 0.8);
    font-style: italic;
  }
  
  del {
    color: rgba(255, 255, 255, 0.5);
    text-decoration: line-through;
  }
  
  a {
    color: #667eea;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

// Стили для редактора
.rules-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(5px);
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.rules-editor {
  background: rgba(15, 15, 15, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  max-width: 1200px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h3 {
    margin: 0;
    color: #667eea;
  }
}

.editor-tabs {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-actions-top {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.editor-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.editor-pane, .preview-pane {
  background: rgba(15, 15, 15, 0.98);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-label {
  padding: 12px 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.markdown-editor {
  flex: 1;
  padding: 16px;
  background: transparent;
  border: none;
  color: white;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
}

.markdown-preview {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.02);
  
  &:empty::before {
    content: 'Превью появится здесь...';
    color: rgba(255, 255, 255, 0.3);
    font-style: italic;
  }
}

.editor-actions {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s ease;
  white-space: nowrap;
  
  &.btn-small {
    padding: 6px 12px;
    font-size: 11px;
  }
  
  &.btn-primary {
    background: #667eea;
    color: white;
    
    &:hover {
      background: #5a6fd8;
    }
  }
  
  &.btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }
  }
}

@media (max-width: 768px) {
  .rules-modal {
    max-width: 95vw;
    max-height: 95vh;
  }
  
  .rules-editor {
    max-width: 95vw;
    max-height: 95vh;
  }
  
  .editor-grid {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
  
  .editor-actions, .editor-actions-top {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>