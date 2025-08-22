<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <button @click="$emit('close')" class="modal-close">×</button>
      
      <h2 class="modal-title">Правила игры</h2>
      
      <div class="rules-content">
        <section class="rule-section">
          <h3>Цель игры</h3>
          <p>
            Деревня должна найти и исключить хотя бы одного оборотня. 
            Оборотни должны остаться в живых. Неудачник хочет быть убитым.
          </p>
        </section>
        
        <section class="rule-section">
          <h3>Фазы игры</h3>
          <div class="phase-list">
            <div class="phase-item">
              <strong>Знакомство (3 мин)</strong> - 
              Представьтесь и обсудите подозрения
            </div>
            <div class="phase-item">
              <strong>Ночь</strong> - 
              Роли автоматически выполняют действия
            </div>
            <div class="phase-item">
              <strong>День (5 мин)</strong> - 
              Обсуждение результатов ночи
            </div>
            <div class="phase-item">
              <strong>Голосование</strong> - 
              Исключение игрока большинством голосов
            </div>
          </div>
        </section>
        
        <section class="rule-section">
          <h3>Команды чата</h3>
          <div class="commands-list">
            <div class="command-item">
              <code>/w [игрок] [сообщение]</code> - Шепот игроку
            </div>
            <div class="command-item">
              <code>/w ведущий [сообщение]</code> - Шепот ведущему
            </div>
            <div class="command-item">
              <code>/help</code> - Показать команды
            </div>
          </div>
        </section>
        
        <section class="rule-section">
          <h3>Основные роли</h3>
          <div class="roles-list">
            <div class="role-item village">
              <strong>Житель</strong> - Ищет оборотней
            </div>
            <div class="role-item village">
              <strong>Провидец</strong> - Ночью видит роль игрока
            </div>
            <div class="role-item werewolf">
              <strong>Оборотень</strong> - Убивает жителей ночью
            </div>
            <div class="role-item tanner">
              <strong>Неудачник</strong> - Хочет быть убитым
            </div>
          </div>
        </section>
      </div>
      
    </div>
  </div>
</template>

<script setup>
defineEmits(['close'])
</script>

<style scoped>
.modal-title {
  margin-bottom: 24px;
  color: #fff;
  font-size: 1.5rem;
}

.rules-content {
  max-height: 60vh;
  overflow-y: auto;
}

.rule-section {
  margin-bottom: 24px;
}

.rule-section h3 {
  color: #ff6b6b;
  margin-bottom: 12px;
  font-size: 1.2rem;
}

.rule-section p {
  color: #ddd;
  line-height: 1.6;
  margin-bottom: 16px;
}

.phase-list,
.commands-list,
.roles-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.phase-item,
.command-item,
.role-item {
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  color: #ddd;
}

.command-item code {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  color: #4ecdc4;
}

.role-item.village {
  border-left: 3px solid #4ecdc4;
}

.role-item.werewolf {
  border-left: 3px solid #ff6b6b;
}

.role-item.tanner {
  border-left: 3px solid #8b4513;
}
</style>