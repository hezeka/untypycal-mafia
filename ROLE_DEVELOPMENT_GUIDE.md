# Руководство по добавлению ролей в Untypical Mafia

Данное руководство описывает процесс добавления новых ролей в игру Untypical Mafia.

## 📋 Структура роли

Каждая роль в игре состоит из следующих компонентов:

### Основные свойства роли:
- **id** - уникальный идентификатор роли
- **name** - отображаемое название роли (русское)
- **description** - описание способностей роли
- **team** - команда роли (`village`, `werewolf`, `tanner`, `cthulhu`, `special`)
- **color** - цветовая схема роли
- **hasNightAction** - имеет ли роль ночные действия
- **nightOrder** - порядок выполнения ночного действия (если есть)
- **implemented** - готова ли роль к использованию
- **phaseHints** - подсказки для игрока по фазам игры

## 🔧 Пошаговая инструкция добавления роли

### 1. Определение роли в реестре

**Файл:** `shared/rolesRegistry.js`

Добавьте новую роль в соответствующую секцию:

```javascript
// Для ролей деревни в секции "ДОПОЛНИТЕЛЬНЫЕ ЖИТЕЛИ"
// Для оборотней в секции "ДОПОЛНИТЕЛЬНЫЕ ОБОРОТНИ" 
// Для особых ролей в секции "ОСОБЫЕ РОЛИ"

medium: {
  id: 'medium',
  name: 'Медиум',
  description: 'Обычный житель без особых способностей.',
  team: 'village',
  color: 'blue',
  hasNightAction: false,
  nightOrder: 0,
  implemented: true,
  phaseHints: {
    day: 'Найдите оборотней по их поведению и противоречиям'
  }
},
```

### 2. Создание класса роли (для ролей с особыми способностями)

**Директория:** `server/roles/village/` (или `werewolf/`, `special/`)

Создайте файл `RoleNameRole.js`:

```javascript
import { BaseRole } from '../BaseRole.js'
import { EVENT_TYPES } from '../../models/GameHistory.js'

export class NecromancerRole extends BaseRole {
  constructor() {
    super('necromancer', {
      name: 'Некромант',
      description: 'Может воскресить одного игрока за всю игру.',
      team: 'village',
      color: 'blue',
      hasNightAction: false,
      nightOrder: 0,
      implemented: true,
      phaseHints: {
        night: 'Можете воскресить мертвого игрока',
        day: 'Можете воскресить мертвого игрока'
      }
    })
  }

  // Методы специфичных способностей роли
  async customAction(gameEngine, playerId, targetId) {
    // Логика способности роли
    return { success: true, message: 'Действие выполнено' }
  }
}
```

### 3. Добавление обработчика роли

**Файл:** `server/roles/rolesList.js`

#### 3.1 Импорт класса роли:
```javascript
import { NecromancerRole } from './village/NecromancerRole.js'
```

#### 3.2 Создание экземпляра:
```javascript
const necromancerRole = new NecromancerRole()
```

#### 3.3 Добавление в обработчики:
```javascript
const getRoleHandler = (roleId) => {
  const handlers = {
    // ... другие роли
    necromancer: handleDefault, // или специальный обработчик
    medium: handleDefault,
    // ...
  }
  return handlers[roleId] || handleDefault
}
```

### 4. Добавление событий в историю игры (если нужно)

**Файл:** `server/models/GameHistory.js`

#### 4.1 Добавить тип события:
```javascript
export const EVENT_TYPES = {
  // ... другие события
  NECROMANCER_RESURRECT: 'necromancer_resurrect',
}
```

#### 4.2 Добавить форматирование в `getFormattedHistory()`:
```javascript
case EVENT_TYPES.NECROMANCER_RESURRECT:
  formatted.push(`${data.actor.name}(${this.getRoleName(data.actor.role)}) воскрешает ${data.target.name}(${this.getRoleName(data.target.role)})`)
  break
```

### 5. Добавление серверных Socket событий (если нужно)

#### 5.1 **Файл:** `server/utils/constants.js`
```javascript
export const SOCKET_EVENTS = {
  // Клиент → Сервер
  RESURRECT_PLAYER: 'resurrect-player',
  // ...
}
```

#### 5.2 **Файл:** `server/socket-server.js`

Импорт класса роли:
```javascript
import { NecromancerRole } from './roles/village/NecromancerRole.js'
const necromancerRole = new NecromancerRole()
```

Добавление обработчика:
```javascript
socket.on(SOCKET_EVENTS.RESURRECT_PLAYER, (data) => handleResurrectPlayer(socket, data))
```

Реализация обработчика:
```javascript
const handleResurrectPlayer = async (socket, data) => {
  try {
    const room = getPlayerRoom(socket.id)
    const player = room.getPlayer(socket.id)
    
    // Проверки прав и условий
    if (player.role !== 'necromancer') {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, 'Недостаточно прав')
    }
    
    // Вызов метода роли
    const result = await necromancerRole.resurrectPlayer(room.gameEngine, socket.id, data.targetId)
    
    if (result.error) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, result.error)
    }
    
    // Обновление состояния
    room.broadcast(SOCKET_EVENTS.GAME_UPDATED, { 
      room: room.getPublicData(),
      message: result.message 
    })
    
  } catch (error) {
    logger.error('Action error:', error)
    sendError(socket, ERROR_CODES.SERVER_ERROR, 'Ошибка сервера')
  }
}
```

### 6. Фронтенд интеграция

#### 6.1 **Файл:** `app/pages/game/[id].vue`

**Добавление кнопок действий:**
```javascript
// В функции getPlayerActions()
if (myRole === 'necromancer' && currentPhase !== 'voting' && !player.alive) {
  const necromancerUsed = currentPlayer.value?.necromancerUsed
  
  actions.push({
    type: 'resurrect',
    class: 'revive',
    title: necromancerUsed ? 'Воскрешение уже использовано' : 'Воскресить игрока',
    condition: true,
    action: () => resurrectPlayer(player.id),
    extraClass: necromancerUsed ? 'off' : ''
  })
}
```

**Добавление функции действия:**
```javascript
const resurrectPlayer = (targetId) => {
  if (!socket.value) return
  
  socket.value.emit('resurrect-player', {
    targetId: targetId
  })
}
```

**Добавление логики для ночных действий (если нужно):**
```javascript
// В секции ночных действий
if (myRole === 'necromancer') {
  buttonClass = 'revive'
  title = nightActionCompleted ? 'Вы уже совершили действие' : 'Воскресить игрока'
}
```

#### 6.2 Добавление CSS стилей:

```css
.night-action-btn.revive {
  background: #22c55e !important;
}
```

### 7. Добавление поддержки команд (если новая команда)

#### 7.1 **CSS стили** во всех компонентах:
- `app/components/GameResults.vue`
- `app/components/DayPhase.vue`
- `app/components/IntroductionPhase.vue`
- `app/components/NightPhase.vue`
- `app/components/RolesGrid.vue`
- `app/components/RolesDisplayModal.vue`
- `app/components/RolesLibraryModal.vue`
- `app/assets/css/main.css`

#### 7.2 **Добавление названий команд:**
```javascript
// В компонентах с командами
const teams = {
  village: 'Деревня',
  werewolf: 'Оборотни',
  tanner: 'Неудачник',
  special: 'Особые',
  cthulhu: 'Ктулху' // новая команда
}
```

#### 7.3 **Обновление серверной логики:**
```javascript
// server/socket-server.js
const teamOrder = { village: 1, werewolf: 2, special: 3, cthulhu: 4, tanner: 5 }

// server/engine/WinConditions.js
// Добавить методы для новой команды
```

## 🎨 Типы ролей по сложности

### 1. **Пассивная роль (как Медиум)**
- Только запись в `rolesRegistry.js`
- Использует `handleDefault` в `rolesList.js`
- Не требует дополнительной логики

### 2. **Роль с ночным действием**
- Создание класса роли
- Реализация `performNightAction()` или использование стандартных обработчиков
- Добавление в список ночных ролей

### 3. **Роль с особыми способностями**
- Создание класса роли с кастомными методами
- Добавление новых Socket событий
- Фронтенд кнопки и логика
- События в истории игры

### 4. **Роль с новой командой**
- Все вышеперечисленное
- Обновление логики побед в `WinConditions.js`
- CSS стили для новой команды во всех компонентах
- Обновление сортировки и отображения

## 📁 Структура файлов проекта

```
├── shared/
│   └── rolesRegistry.js          # Определения всех ролей
├── server/
│   ├── roles/
│   │   ├── village/              # Роли деревни
│   │   ├── werewolf/             # Роли оборотней
│   │   ├── special/              # Особые роли
│   │   ├── BaseRole.js           # Базовый класс роли
│   │   └── rolesList.js          # Обработчики ролей
│   ├── models/
│   │   └── GameHistory.js        # События и история игры
│   ├── engine/
│   │   └── WinConditions.js      # Логика побед
│   ├── utils/
│   │   └── constants.js          # Socket события
│   └── socket-server.js          # Основной сервер
├── app/
│   ├── pages/game/
│   │   └── [id].vue             # Главный компонент игры
│   ├── components/              # UI компоненты
│   └── assets/css/
│       └── main.css            # Глобальные стили
└── public/roles/               # Изображения ролей
```

## ⚠️ Важные моменты

### 1. **Команды и победы**
- При создании новой команды обязательно обновите `WinConditions.js`
- Добавьте CSS стили во **все** компоненты, где используются команды
- Обновите порядок сортировки команд в `socket-server.js`

### 2. **Изображения ролей**
- Добавьте изображения в `public/roles/` и `public/roles/compressed/`
- Используйте форматы `.png` и `.webp`
- Имя файла должно совпадать с `id` роли

### 3. **Безопасность**
- Всегда проверяйте права игрока в серверных обработчиках
- Валидируйте входные данные
- Используйте соответствующие коды ошибок из `ERROR_CODES`

### 4. **Тестирование**
- Проверьте роль во всех фазах игры
- Убедитесь, что способности работают корректно
- Проверьте отображение в истории игры
- Протестируйте UI на разных разрешениях

### 5. **Производительность**
- Не создавайте экземпляры ролей в каждом запросе
- Используйте кэширование где возможно
- Минимизируйте количество socket событий

## 🔍 Примеры ролей

### Простая роль (Медиум)
```javascript
medium: {
  id: 'medium',
  name: 'Медиум', 
  team: 'village',
  hasNightAction: false,
  implemented: true
}
```

### Роль с ночным действием (Провидец)
```javascript
seer: {
  id: 'seer',
  name: 'Провидец',
  team: 'village', 
  hasNightAction: true,
  nightOrder: 2,
  implemented: true
}
```

### Роль с особыми способностями (Некромант)
```javascript
necromancer: {
  id: 'necromancer',
  name: 'Некромант',
  team: 'village',
  hasNightAction: false, // способность доступна в любое время
  implemented: true
}
```

## 📝 Заключение

Добавление роли в Untypical Mafia требует изменений в нескольких файлах и компонентах. Следуйте данному руководству пошагово, и не забывайте тестировать каждый этап разработки.

При возникновении вопросов обращайтесь к существующим ролям в качестве примеров, особенно к таким как Некромант (сложная роль с особыми способностями) или Медиум (простая пассивная роль).