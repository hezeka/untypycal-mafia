# CLAUDE.md - Нетипичная Мафия

Этот файл содержит полное описание структуры проекта "Нетипичная Мафия" для упрощения работы с кодовой базой.

## Обзор проекта

**Нетипичная Мафия** - это онлайн платформа для игры в Werewolf (Мафия/Оборотни) с расширенными возможностями чата и голосовой активности.

### Основная технологическая структура:
- **Frontend**: Nuxt 4 + Vue 3 (SPA режим)
- **Backend**: Node.js + Express + Socket.IO
- **Архитектура**: Client-Server с WebSocket соединениями
- **Стейт менеджмент**: Vue Composition API + Reactive state

### Команды разработки:
```bash
# Разработка (запускает и сервер и клиент)
npm run dev

# Только сокет сервер
npm run dev:socket

# Только Nuxt клиент
npm run dev:nuxt

# Сборка
npm run build

# Продакшн
npm run start
```

## Структура директорий

```
untypycal-mafia/
├── app/                    # Nuxt 4 клиентская часть
│   ├── assets/            # CSS стили
│   ├── components/        # Vue компоненты
│   ├── composables/       # Vue Composition API функции
│   ├── layouts/           # Layouts для страниц
│   ├── pages/             # Страницы (роутинг)
│   └── plugins/           # Плагины Nuxt
├── server/                # Серверная часть
│   ├── api/              # HTTP API endpoints
│   ├── config/           # Конфигурация ролей
│   ├── models/           # Модели данных
│   ├── plugins/          # Серверные плагины
│   ├── services/         # Бизнес-логика
│   ├── utils/            # Утилиты
│   └── socket-server.js  # Основной сокет сервер
├── public/               # Статические файлы
│   ├── images/           # Изображения интерфейса
│   ├── roles/            # Изображения ролей (PNG и WebP)
│   ├── rules/            # Правила игры (Markdown)
│   └── sounds/           # Звуковые эффекты
├── middleware/           # Nuxt middleware
├── store/               # Vuex store (legacy)
├── package.json         # Зависимости и скрипты
├── nuxt.config.ts       # Конфигурация Nuxt
└── tsconfig.json        # TypeScript конфигурация
```

## Ключевые файлы для работы

### Серверная часть
- **`server/socket-server.js`** - Главный сокет сервер с бизнес-логикой игры
- **`server/models/GameRoom.js`** - Модель игровой комнаты 
- **`server/config/roles.js`** - Конфигурация всех ролей игры
- **`server/services/ChatCommandProcessor.js`** - Обработчик команд чата
- **`server/utils/gameHelpers.js`** - Игровые утилиты и хелперы

### Клиентская часть
- **`app/composables/useGame.js`** - Основной composable для игровой логики
- **`app/composables/useSocket.js`** - Socket.IO клиент
- **`app/composables/useSound.js`** - Звуковые эффекты
- **`app/composables/useVoiceActivity.js`** - Голосовая активность
- **`app/components/GameBoard.vue`** - Основной игровой интерфейс
- **`app/components/GameChat.vue`** - Компонент чата
- **`app/pages/index.vue`** - Главная страница
- **`app/pages/game/[id].vue`** - Страница игровой комнаты

## Архитектура системы

### WebSocket Events (сокет события)

#### Клиент → Сервер:
- `create-room` - Создание комнаты
- `join-room` - Присоединение к комнате
- `select-role` / `remove-role` - Управление ролями
- `start-game` - Начало игры
- `change-phase` - Смена фазы
- `send-message` - Отправка сообщения
- `vote-player` - Голосование за игрока
- `voice-activity` - Голосовая активность
- `admin-action` - Админ действия

#### Сервер → Клиент:
- `room-created` - Комната создана
- `join-success` - Успешное присоединение
- `game-updated` - Обновление данных игры
- `new-message` / `new-whisper` - Новые сообщения
- `phase-changed` - Смена фазы
- `voting-ended` - Завершение голосования
- `timer-updated` - Обновление таймера

### Игровые состояния (gameState)
1. **`setup`** - Настройка игры (выбор ролей)
2. **`day`** - Дневная фаза (обсуждение)
3. **`voting`** - Голосование
4. **`night`** - Ночная фаза
5. **`ended`** - Завершение игры

### Модель данных игрока
```javascript
{
  id: socketId,
  name: string,
  role: roleId | null,
  alive: boolean,
  protected: boolean,
  votes: number,
  connected: boolean,
  muted: boolean,
  color: string,
  survivedDays: number
}
```

### Модель игровой комнаты
```javascript
{
  id: string,
  hostId: socketId,
  isPrivate: boolean,
  players: Map<socketId, Player>,
  selectedRoles: Array<roleId>,
  gameState: string,
  currentPhase: string,
  timer: number | null,
  gameData: { centerCards, artifacts, shields },
  chat: Array<Message>,
  votes: Map<voterId, targetId>,
  votingRounds: number
}
```

## Система ролей

### Структура роли:
```javascript
{
  name: 'Отображаемое имя',
  description: 'Описание способностей',
  color: 'blue|red|brown|purple|gold',
  night: boolean,          // Есть ли ночное действие
  team: 'village|werewolf|tanner|special|neutral',
  implemented: boolean,    // Реализована ли роль
  phaseHints: {           // Подсказки по фазам
    day: 'Что делать днём',
    night: 'Что делать ночью'
  }
}
```

### Команды ролей:
- **Деревня (village)** - Мирные жители, цель: убить оборотней
- **Оборотни (werewolf)** - Злые роли, цель: остаться в живых
- **Неудачник (tanner)** - Цель: быть убитым
- **Особые (special)** - Роли с особыми механиками
- **Нейтральные (neutral)** - Ведущий

## Система чата и команд

### Типы сообщений:
- **`player`** - Обычное сообщение игрока
- **`host`** - Сообщение ведущего
- **`system`** - Системное сообщение
- **`whisper`** - Личный шепот
- **`group_whisper`** - Групповой шепот

### Команды чата:
- **`/w [игрок] [сообщение]`** - Шепот игроку
- **`/whisper [игрок] [сообщение]`** - Шепот игроку
- **`/wg [группа] [сообщение]`** - Групповой шепот
- **`/help`** - Справка по командам

### Группы для шепота:
- **оборотни/волки/wolves** - Оборотни
- **деревня/жители/village** - Жители
- **все/all** - Все игроки (только ведущий)

## Безопасность и ограничения

### Rate Limiting:
- Максимум 20 сообщений в минуту
- Throttling голосовой активности (150ms)
- Максимум 3 комнаты с одного IP

### Валидация:
- Санитизация всех пользовательских данных
- Валидация имен игроков
- Проверка прав доступа для действий

### Memory Management:
- Автоматическая очистка отключенных игроков (2 минуты)
- Удаление комнат без активных игроков
- Throttling cleanup каждые 5 минут

## Звуковая система

### Звуковые файлы (`public/sounds/`):
- `day.mp3` - Наступление дня
- `night.mp3` - Наступление ночи
- `voting.mp3` - Начало голосования
- `message.mp3` - Новое сообщение
- `whisper.mp3` - Шепот
- `notification.mp3` - Уведомления
- `game-start.mp3` - Начало игры
- `phase-change.mp3` - Смена фазы

### Управление звуком:
- `useSounds` composable для воспроизведения
- Регулируемая громкость
- Автоматические звуки для событий игры

## Голосовая активность

### Система VAD (Voice Activity Detection):
- WebRTC анализ микрофона
- Визуализация говорящих игроков
- Throttling для производительности
- Автоматическое отключение при смене фаз

## Тестирование и отладка

### Режим разработки:
- Детальные логи в консоли
- Отладочная информация о состоянии игры
- DevTools включены

### Продакшн:
- Минимальные логи
- Отключенные DevTools
- Оптимизированная сборка

## Деплой и производственные настройки

### Переменные окружения:
- `NODE_ENV=production` - Продакшн режим
- `SOCKET_PORT=3001` - Порт сокет сервера

### CORS настройки:
- Development: `localhost:3000`
- Production: `mafia.waifucards.app`

## Известные особенности

### Переподключения:
- Сохранение роли при переподключении
- Восстановление голосов
- Автоматическая синхронизация состояния

### Голосование:
- Относительное большинство
- Возможность воздержания (null голос)
- Неограниченные изменения голоса
- Детальная статистика для ведущего

### Цветовая система:
- 12 доступных цветов для игроков
- Автоматическое назначение свободных цветов
- Сохранение предпочтений в localStorage
- Ведущий без цвета

## Основные файлы конфигурации

### `nuxt.config.ts`
- SPA режим (`ssr: false`)
- Исходная директория в `app/`
- Настройки Vite для Socket.IO
- Настройки совместимости

### `package.json`
- Concurrently для одновременного запуска сервера и клиента
- Socket.IO 4.8.1
- Nuxt 4.0.1
- Vue 3.5.18

### `tsconfig.json`
- TypeScript конфигурация для Nuxt
- Поддержка ES модулей

## Паттерны кода

### Composables:
- Singleton паттерн для глобального состояния
- Reactive объекты для реактивности
- Computed properties для вычисляемых значений
- Жизненный цикл listeners

### Компоненты:
- Composition API
- Props validation
- Event emitters
- Slot usage для гибкости

### Серверная логика:
- Event-driven архитектура
- Валидация на каждом шаге
- Error handling с информативными сообщениями
- Memory leak prevention

Этот файл поможет быстро ориентироваться в структуре проекта и понимать основные принципы архитектуры при внесении изменений.