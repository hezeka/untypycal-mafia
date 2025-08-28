<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content rules-modal">
      <button @click="$emit('close')" class="modal-close">×</button>
      
      <h2 class="modal-title">🎭 Правила игры "Нетипичная Мафия"</h2>
      
      <div class="rules-content">
        <section class="rule-section intro-section">
          <div class="game-intro">
            <p class="intro-text">
              <strong>Нетипичная Мафия</strong> — это социальная игра на дедукцию, основанная на популярной игре 
              <em>"One Night Ultimate Werewolf"</em>. Каждая игра длится всего одну ночь и один день, 
              но за это время вам предстоит раскрыть тайны, обмануть противников или выжить любой ценой!
            </p>
          </div>
        </section>

        <section class="rule-section">
          <h3>🎯 Цели команд</h3>
          <div class="teams-goals">
            <div class="goal-item village">
              <div class="goal-icon">🏘️</div>
              <div class="goal-content">
                <strong>Деревня</strong>
                <p>Найти и исключить <strong>хотя бы одного оборотня</strong> голосованием. Если это удастся — деревня побеждает!</p>
              </div>
            </div>
            <div class="goal-item werewolf">
              <div class="goal-icon">🐺</div>
              <div class="goal-content">
                <strong>Оборотни</strong>
                <p>Остаться в живых и не быть исключенными. Если ни один оборотень не будет убит — оборотни побеждают!</p>
              </div>
            </div>
            <div class="goal-item tanner">
              <div class="goal-icon">😔</div>
              <div class="goal-content">
                <strong>Неудачник</strong>
                <p>Быть исключенным голосованием. Если неудачника убьют — он побеждает, а все остальные проигрывают!</p>
              </div>
            </div>
          </div>
        </section>
        
        <section class="rule-section">
          <h3>⏰ Фазы игры</h3>
          <div class="phases-timeline">
            <div class="phase-item setup">
              <div class="phase-header">
                <span class="phase-icon">⚙️</span>
                <strong>Настройка</strong>
              </div>
              <p>Ведущий выбирает роли для игры. Игроков должно быть от {{ minPlayers }} до {{ maxPlayers }}.</p>
            </div>
            
            <div class="phase-item introduction">
              <div class="phase-header">
                <span class="phase-icon">👋</span>
                <strong>Знакомство ({{ formatTime(phaseDurations.introduction) }})</strong>
              </div>
              <p>Представьтесь, расскажите о себе и обсудите первые подозрения. Используйте это время, чтобы понять, кому можно доверять.</p>
            </div>
            
            <div class="phase-item night">
              <div class="phase-header">
                <span class="phase-icon">🌙</span>
                <strong>Ночь ({{ nightActionTime }} сек на действие)</strong>
              </div>
              <p>Роли автоматически выполняют свои ночные действия в определенном порядке. Оборотни выбирают жертву, провидцы получают информацию, грабители меняют роли.</p>
            </div>
            
            <div class="phase-item day">
              <div class="phase-header">
                <span class="phase-icon">☀️</span>
                <strong>День ({{ formatTime(phaseDurations.day) }})</strong>
              </div>
              <p>Обсуждение результатов ночи. Делитесь информацией, анализируйте поведение игроков и решайте, за кого голосовать.</p>
            </div>
            
            <div class="phase-item voting">
              <div class="phase-header">
                <span class="phase-icon">🗳️</span>
                <strong>Голосование ({{ formatTime(phaseDurations.voting) }})</strong>
              </div>
              <p>Каждый игрок выбирает, кого исключить. Можно воздержаться. Игрок с наибольшим количеством голосов исключается.</p>
            </div>
          </div>
        </section>

        <section class="rule-section">
          <h3>🎮 Механика игры</h3>
          <div class="mechanics-list">
            <div class="mechanic-item">
              <div class="mechanic-icon">🎲</div>
              <div class="mechanic-content">
                <strong>Распределение ролей</strong>
                <p>Роли раздаются случайно. На {{ maxPlayers }} игроков может быть до {{ maxPlayers + 3 }} ролей — {{ centerCards }} остаются в центре как "центральные карты".</p>
              </div>
            </div>
            
            <div class="mechanic-item">
              <div class="mechanic-icon">🔄</div>
              <div class="mechanic-content">
                <strong>Смена ролей</strong>
                <p>Некоторые роли (Грабитель, Смутьян) могут менять роли местами ночью. Ваша изначальная роль может измениться!</p>
              </div>
            </div>
            
            <div class="mechanic-item">
              <div class="mechanic-icon">💬</div>
              <div class="mechanic-content">
                <strong>Ограничения чата</strong>
                <p>Ночью говорить могут только оборотни между собой. В фазу голосования чат отключается полностью.</p>
              </div>
            </div>

            <div class="mechanic-item">
              <div class="mechanic-icon">🎯</div>
              <div class="mechanic-content">
                <strong>Голосование</strong>
                <p>При ничьей голосов никто не исключается. Если все воздержались — тоже никого не исключают.</p>
              </div>
            </div>
          </div>
        </section>
        
        <section class="rule-section">
          <h3>💬 Команды чата</h3>
          <div class="commands-list">
            <div class="command-item">
              <code>/w [игрок] [сообщение]</code>
              <span class="command-desc">Отправить личное сообщение игроку</span>
            </div>
            <div class="command-item">
              <code>/w ведущий [сообщение]</code>
              <span class="command-desc">Написать ведущему (всегда доступно)</span>
            </div>
            <div class="command-item">
              <code>/help</code>
              <span class="command-desc">Показать список всех команд</span>
            </div>
          </div>
          <p class="commands-note">
            <strong>Важно:</strong> Ведущий видит все личные сообщения и может помочь в спорных ситуациях.
          </p>
        </section>

        <section class="rule-section">
          <h3>🎭 Популярные роли</h3>
          <div class="roles-showcase">
            <div class="role-card village">
              <div class="role-header">
                <span class="role-icon">👤</span>
                <strong>Житель</strong>
                <span class="role-team">Деревня</span>
              </div>
              <p>Обычный житель без особых способностей. Должен найти оборотней по поведению и логике.</p>
            </div>
            
            <div class="role-card village">
              <div class="role-header">
                <span class="role-icon">🔮</span>
                <strong>Провидец</strong>
                <span class="role-team">Деревня</span>
              </div>
              <p>Ночью может посмотреть роль одного игрока ИЛИ две центральные карты. Получает важную информацию.</p>
            </div>
            
            <div class="role-card werewolf">
              <div class="role-header">
                <span class="role-icon">🐺</span>
                <strong>Оборотень</strong>
                <span class="role-team">Оборотни</span>
              </div>
              <p>Знает других оборотней. Ночью оборотни голосуют за жертву. Должен скрывать свою сущность.</p>
            </div>
            
            <div class="role-card village">
              <div class="role-header">
                <span class="role-icon">🔄</span>
                <strong>Грабитель</strong>
                <span class="role-team">Деревня</span>
              </div>
              <p>Ночью может поменяться ролями с любым игроком и узнать свою новую роль.</p>
            </div>
          </div>
        </section>

        <section class="rule-section">
          <h3>💡 Советы новичкам</h3>
          <div class="tips-list">
            <div class="tip-item">
              <span class="tip-icon">🕵️</span>
              <strong>Слушайте внимательно</strong> — каждое слово может быть ключом к разгадке
            </div>
            <div class="tip-item">
              <span class="tip-icon">🤔</span>
              <strong>Задавайте вопросы</strong> — это поможет выявить противоречия
            </div>
            <div class="tip-item">
              <span class="tip-icon">😎</span>
              <strong>Блефуйте осторожно</strong> — опытные игроки быстро вычисляют обман
            </div>
            <div class="tip-item">
              <span class="tip-icon">⏱️</span>
              <strong>Следите за временем</strong> — важные обсуждения лучше провести в начале фазы
            </div>
          </div>
        </section>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineEmits(['close'])

// Импортируем константы из конфигов
const PHASE_DURATIONS = {
  INTRODUCTION: 180,    // 3 минуты
  NIGHT: 30,           // 30 секунд на действие
  DAY: 300,            // 5 минут
  VOTING: 20          // 20 секунд
}

const LIMITS = {
  MAX_PLAYERS_PER_ROOM: 10,
  MIN_PLAYERS_TO_START: 3
}

// Вычисляемые значения из реальных конфигов
const minPlayers = LIMITS.MIN_PLAYERS_TO_START
const maxPlayers = LIMITS.MAX_PLAYERS_PER_ROOM
const nightActionTime = PHASE_DURATIONS.NIGHT
const centerCards = 3 // Стандартно 3 центральные карты

const phaseDurations = {
  introduction: PHASE_DURATIONS.INTRODUCTION,
  day: PHASE_DURATIONS.DAY,
  voting: PHASE_DURATIONS.VOTING
}

// Функция форматирования времени
const formatTime = (seconds) => {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (remainingSeconds > 0) {
      return `${minutes} мин ${remainingSeconds} сек`
    }
    return `${minutes} мин`
  }
  return `${seconds} сек`
}
</script>

<style scoped>
.modal-content.rules-modal {
  max-width: 900px;
  width: 90vw;
  max-height: 90vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
}

.modal-title {
  margin-bottom: 24px;
  color: #fff;
  font-size: 1.75rem;
  text-align: center;
  /* background: linear-gradient(45deg, #ff6b6b, #4ecdc4); */
  /* -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text; */
  font-weight: 800;
}

.rules-content {
  max-height: 70vh;
  overflow-y: auto;
  padding: 0 4px;
}

.rules-content::-webkit-scrollbar {
  width: 6px;
}

.rules-content::-webkit-scrollbar-track {
  background: #333;
  border-radius: 3px;
}

.rules-content::-webkit-scrollbar-thumb {
  background: #666;
  border-radius: 3px;
}

.rule-section {
  margin-bottom: 32px;
}

.rule-section h3 {
  color: #4ecdc4;
  margin-bottom: 16px;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 2px solid rgba(78, 205, 196, 0.3);
  padding-bottom: 8px;
}

/* Введение */
.intro-section {
  text-align: center;
  margin-bottom: 40px;
}

.intro-text {
  font-size: 1.1rem;
  line-height: 1.7;
  color: #e0e0e0;
  background: rgba(78, 205, 196, 0.1);
  padding: 24px;
  border-radius: 12px;
  border-left: 4px solid #4ecdc4;
}

/* Цели команд */
.teams-goals {
  display: grid;
  gap: 16px;
}

.goal-item {
  display: flex;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 4px solid;
}

.goal-item.village { border-left-color: #4CAF50; }
.goal-item.werewolf { border-left-color: #f44336; }
.goal-item.tanner { border-left-color: #FF9800; }

.goal-icon {
  font-size: 2rem;
  display: flex;
  align-items: center;
}

.goal-content strong {
  font-size: 1.2rem;
  color: #fff;
  display: block;
  margin-bottom: 8px;
}

.goal-content p {
  color: #ddd;
  line-height: 1.6;
  margin: 0;
}

/* Фазы игры */
.phases-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.phase-item {
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border-left: 4px solid #4ecdc4;
  transition: all 0.3s ease;
}

.phase-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}

.phase-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.phase-icon {
  font-size: 1.5rem;
}

.phase-header strong {
  color: #fff;
  font-size: 1.1rem;
}

.phase-item p {
  color: #ddd;
  line-height: 1.6;
  margin: 0;
}

/* Механика игры */
.mechanics-list {
  display: grid;
  gap: 16px;
}

.mechanic-item {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.mechanic-icon {
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background: rgba(78, 205, 196, 0.2);
  border-radius: 50%;
}

.mechanic-content strong {
  color: #fff;
  display: block;
  margin-bottom: 8px;
  font-size: 1.1rem;
}

.mechanic-content p {
  color: #ddd;
  line-height: 1.6;
  margin: 0;
}

/* Команды чата */
.commands-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.command-item {
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-left: 3px solid #4ecdc4;
}

.command-item code {
  background: rgba(78, 205, 196, 0.2);
  padding: 6px 12px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  color: #4ecdc4;
  font-weight: 600;
  font-size: 0.9rem;
  min-width: 200px;
}

.command-desc {
  color: #ddd;
  line-height: 1.5;
}

.commands-note {
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 183, 77, 0.1);
  border-radius: 8px;
  border-left: 3px solid #ffb74d;
  color: #ddd;
  line-height: 1.5;
}

/* Роли */
.roles-showcase {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.role-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border-left: 4px solid;
  transition: all 0.3s ease;
}

.role-card:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.role-card.village { border-left-color: #4CAF50; }
.role-card.werewolf { border-left-color: #f44336; }

.role-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.role-header .role-icon {
  font-size: 1.5rem;
}

.role-header strong {
  color: #fff;
  font-size: 1.1rem;
}

.role-team {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.role-card.village .role-team {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.role-card.werewolf .role-team {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.role-card p {
  color: #ddd;
  line-height: 1.6;
  margin: 0;
}

/* Советы */
.tips-list {
  display: grid;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border-left: 3px solid #ffb74d;
}

.tip-icon {
  font-size: 1.5rem;
}

.tip-item strong {
  color: #fff;
}

/* Адаптивность */
@media (max-width: 768px) {
  .modal-content.rules-modal {
    width: 95vw;
    max-height: 95vh;
  }
  
  .roles-showcase {
    grid-template-columns: 1fr;
  }
  
  .goal-item,
  .mechanic-item {
    flex-direction: column;
    text-align: center;
  }
  
  .goal-icon,
  .mechanic-icon {
    align-self: center;
  }
}
</style>