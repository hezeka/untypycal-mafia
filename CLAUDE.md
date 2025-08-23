# CLAUDE.md

Этот файл предоставляет руководство для Claude Code (claude.ai/code) при работе с кодом в данном репозитории.

## Обзор проекта

**Нетипичная Мафия** - это онлайн платформа для игры в Werewolf (Мафия/Оборотни) с расширенными возможностями чата и голосовой активности.

### Основная технологическая структура:
- **Frontend**: Nuxt 4 + Vue 3 (SPA режим)
- **Backend**: Node.js + Express + Socket.IO
- **Архитектура**: Client-Server с WebSocket соединениями
- **Стейт менеджмент**: Vue Composition API + Reactive state

## ⚠️ ТРЕБУЕТ ВНИМАНИЯ

### ChatCommandProcessor не интегрирован
- `server/services/ChatCommandProcessor.js` реализован (790 строк)
- НЕ подключен в `server/socket-server.js:299` в `handleSendMessage`
- Команды `/w`, `/whisper`, `/wg`, `/help` игнорируются

### Dead Code
- `server/config/roles.js` не используется (удалить)
- Используется `shared/rolesRegistry.js`

## Команды разработки

```bash
npm run dev          # Разработка (сервер + клиент)
npm run dev:server   # Только сокет сервер
npm run dev:client   # Только Nuxt клиент
npm run build        # Сборка
npm run start        # Продакшн
npm run lint         # Линтинг
npm run test         # Тесты
```

## Архитектура системы

### Структура директорий

```
untypical-mafia/
├── app/                         # Nuxt 4 клиентская часть
│   ├── assets/
│   │   └── css/
│   │       └── main.css
│   ├── components/              # Vue компоненты
│   │   ├── AdminPanel.vue       # Панель администратора
│   │   ├── ColorPalette.vue     # Цветовая палитра
│   │   ├── ConnectionStatus.vue # Статус подключения
│   │   ├── DayPhase.vue         # Дневная фаза
│   │   ├── GameChat.vue         # Компонент чата
│   │   ├── GameEndPhase.vue     # Завершение игры
│   │   ├── GameSetup.vue        # Настройка игры
│   │   ├── IntroductionPhase.vue # Фаза знакомства
│   │   ├── MicrophonePermissionModal.vue # Разрешение микрофона
│   │   ├── MicrophoneSettings.vue # Настройки микрофона
│   │   ├── NightPhase.vue       # Ночная фаза
│   │   ├── PlayerItem.vue       # Карточка игрока
│   │   ├── PlayersList.vue      # Список игроков
│   │   ├── RulesModal.vue       # Модал с правилами
│   │   ├── SettingsModal.vue    # Модал настроек
│   │   ├── UsernameModal.vue    # Модал ввода имени
│   │   ├── VoiceDebugger.vue    # Отладчик голоса
│   │   ├── VotingPhase.vue      # Фаза голосования
│   │   ├── header.vue           # Заголовок
│   │   └── role-card.vue        # Карточка роли
│   ├── composables/             # Vue Composition API
│   │   ├── useGame.js           # Основная игровая логика
│   │   ├── useSocket.js         # Socket.IO клиент
│   │   ├── useSound.js          # Звуковые эффекты
│   │   ├── useUser.js           # Пользовательские данные
│   │   └── useVoiceActivity.js  # Голосовая активность
│   ├── pages/                   # Роутинг страниц
│   │   ├── game/
│   │   │   └── [id].vue         # Страница игровой комнаты
│   │   └── index.vue            # Главная страница
│   └── plugins/
│       └── socket.client.js     # Клиентский сокет
├── server/                      # Серверная часть
│   ├── engine/                  # Игровая логика
│   │   ├── GameEngine.js
│   │   ├── PhaseManager.js
│   │   └── WinConditions.js
│   ├── models/
│   │   └── GameRoom.js          # Модель игровой комнаты
│   ├── roles/                   # Система ролей
│   │   ├── BaseRole.js
│   │   ├── abilities/
│   │   │   └── RoleAbilities.js
│   │   ├── rolesList.js
│   │   ├── special/
│   │   │   └── DoppelgangerRole.js
│   │   ├── tanner/
│   │   │   └── TannerRole.js
│   │   ├── village/
│   │   │   ├── DrunkRole.js
│   │   │   ├── RobberRole.js
│   │   │   ├── SeerRole.js
│   │   │   ├── TroublemakerRole.js
│   │   │   └── VillagerRole.js
│   │   └── werewolf/
│   │       ├── MysticWolfRole.js
│   │       └── WerewolfRole.js
│   ├── services/
│   │   └── ChatCommandProcessor.js # Обработчик команд чата
│   ├── utils/                   # Утилиты
│   │   ├── EventBus.js
│   │   ├── constants.js
│   │   └── gameHelpers.js
│   └── socket-server.js         # Главный сокет сервер
├── public/                      # Статические файлы
│   ├── icons/                   # UI иконки (20 файлов)
│   │   ├── Day.png
│   │   ├── night.png
│   │   ├── kill.png
│   │   ├── revive.png
│   │   ├── vote.png
│   │   ├── shield.png
│   │   ├── microphone.png
│   │   ├── mute.png
│   │   └── ... (другие)
│   ├── images/
│   │   └── logo.png
│   ├── roles/                   # Изображения ролей
│   │   ├── compressed/          # WebP версии (27 файлов)
│   │   └── [27 ролей].png       # PNG оригиналы
│   ├── rules/
│   │   ├── gamemaster.md
│   │   └── players.md
│   ├── sounds/                  # Звуковые эффекты
│   │   ├── day.mp3
│   │   ├── night.mp3
│   │   ├── game-start.mp3
│   │   ├── voting.mp3
│   │   ├── message.mp3
│   │   ├── whisper.mp3
│   │   ├── notification.mp3
│   │   └── phase-change.mp3
│   ├── favicon.ico
│   └── robots.txt
├── shared/
│   └── rolesRegistry.js         # Конфигурация ролей (активно используется)
├── nuxt.config.ts
├── package.json
├── tsconfig.json
├── development_guideline.md
├── game_technical_spec.md
├── Rules.md
└── README.md
```

### Ключевые файлы

**Серверная часть:**
- `server/socket-server.js` - Главный сокет сервер
- `server/models/GameRoom.js` - Модель игровой комнаты
- `server/services/ChatCommandProcessor.js` - Обработчик команд чата
- `shared/rolesRegistry.js` - Конфигурация ролей

**Клиентская часть:**
- `app/composables/useGame.js` - Основная игровая логика
- `app/composables/useSocket.js` - Socket.IO клиент
- `app/components/GameChat.vue` - Компонент чата

### WebSocket Events

**Клиент → Сервер:**
- `create-room`, `join-room`, `start-game`
- `send-message`, `vote-player`
- `voice-activity`, `admin-action`

**Сервер → Клиент:**
- `room-created`, `join-success`, `game-updated`
- `new-message`, `new-whisper`
- `phase-changed`, `voting-ended`

### Игровые состояния
1. `setup` - Настройка игры (выбор ролей)
2. `introduction` - Фаза знакомства
3. `night` - Ночная фаза
4. `day` - Дневная фаза (обсуждение)
5. `voting` - Голосование
6. `ended` - Завершение игры

## Система ролей

### Структура роли:
```javascript
{
  name: 'Отображаемое имя',
  description: 'Описание способностей',
  color: 'blue|red|brown|purple|gold',
  hasNightAction: boolean,
  team: 'village|werewolf|tanner|special|neutral',
  implemented: boolean,
  phaseHints: {
    day: 'Что делать днём',
    night: 'Что делать ночью'
  }
}
```

### Команды ролей:
- **village** - Мирные жители
- **werewolf** - Оборотни
- **tanner** - Неудачник
- **special** - Особые роли
- **neutral** - Ведущий

## Система чата

### Команды:
- `/w [игрок] [сообщение]` - Шепот игроку
- `/whisper [игрок] [сообщение]` - Шепот игроку
- `/ш [игрок] [сообщение]` - Шепот на русском
- `/wg [группа] [сообщение]` - Групповой шепот
- `/help` - Справка по командам

### Группы для шепота:
- **оборотни/волки/wolves** - Оборотни
- **деревня/жители/village** - Жители
- **все/all** - Все игроки (только ведущий)
- **ведущий/host** - Ведущему

## Конфигурация

### Environment Variables
- `NODE_ENV=production`
- `SOCKET_PORT=3001`

### Production Settings
- Development: `localhost:3000`
- Production: `mafia.waifucards.app`

## Безопасность

- Rate Limiting: 20 сообщений/минуту
- Throttling голосовой активности (150ms)
- Максимум 3 комнаты с одного IP
- Санитизация пользовательских данных
- Валидация прав доступа

## Звуковая система

### Файлы (`public/sounds/`):
- `day.mp3`, `night.mp3` - Смена фаз
- `game-start.mp3`, `voting.mp3` - События игры
- `message.mp3`, `whisper.mp3` - Чат
- `notification.mp3`, `phase-change.mp3` - Уведомления

## Голосовая активность

- WebRTC анализ микрофона
- Визуализация говорящих игроков
- Throttling для производительности
- Автоматическое отключение при смене фаз

## Паттерны кода

### Composables:
- Singleton паттерн для глобального состояния
- Reactive объекты
- Computed properties
- Жизненный цикл listeners

### Серверная логика:
- Event-driven архитектура
- Валидация на каждом шаге
- Error handling
- Memory leak prevention

## Debug и Troubleshooting

### Частые проблемы:
1. **Socket.IO не подключается** - проверить порт 3001 и CORS
2. **Роли не отображаются** - проверить `shared/rolesRegistry.js`
3. **Команды чата не работают** - интегрировать ChatCommandProcessor
4. **Компоненты не рендерятся** - проверить импорты

### Логирование:
- Сервер: префиксы `🎮`, `💬`, `🗳️`
- Клиент: префиксы `🔌`, `🔄`, `💬`

## Технические требования

- Node.js >= 18.0.0
- Socket.IO 4.8.1
- Nuxt 4.0.1
- Vue 3.5.18

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.