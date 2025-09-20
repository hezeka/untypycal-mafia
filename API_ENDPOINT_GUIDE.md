# Простой гайд по добавлению API эндпоинтов

Рассмотрим на примере добавления функции **"Кикнуть игрока из комнаты"**.

## Пример: Добавляем функцию "Кикнуть игрока"

### Задача
Ведущий должен иметь возможность исключить игрока из комнаты через Socket.IO и через HTTP API.

---

## Способ 1: Socket.IO событие (для real-time действий)

### Шаг 1: Добавить константу события

**Файл:** `server/utils/constants.js`  
**Где:** В секцию `SOCKET_EVENTS` (строка 33)

```javascript
export const SOCKET_EVENTS = {
  // ...
  KICK_PLAYER: 'kick-player',           // Клиент → Сервер
  PLAYER_KICKED: 'player-kicked',       // Сервер → Клиент
  // ...
}
```

### Шаг 2: Создать обработчик на сервере

**Файл:** `server/socket-server.js`  
**Где:** После функции `handleDisconnect` (примерно строка 771)

```javascript
const handleKickPlayer = (socket, data) => {
  try {
    const { targetId } = data
    
    // Проверяем что есть targetId
    if (!targetId) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, 'Не указан игрок для исключения')
    }
    
    // Получаем комнату
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    // Проверяем что отправитель - ведущий
    const sender = room.getPlayer(socket.id)
    if (!sender?.isHost) {
      return sendError(socket, ERROR_CODES.PERMISSION_DENIED, 'Только ведущий может кикать игроков')
    }
    
    // Проверяем что цель существует
    const target = room.getPlayer(targetId)
    if (!target) {
      return sendError(socket, ERROR_CODES.PLAYER_NOT_FOUND, 'Игрок не найден')
    }
    
    // Исключаем игрока
    room.removePlayer(targetId)
    
    // Уведомляем всех
    room.broadcast(SOCKET_EVENTS.PLAYER_KICKED, {
      kickedPlayer: target.name,
      kickedBy: sender.name
    })
    
    // Системное сообщение
    room.addSystemMessage(`${target.name} исключен из игры ведущим`)
    
    logger.info(`🦵 Player ${target.name} kicked by ${sender.name} in room ${room.id}`)
    
  } catch (error) {
    logger.error('Kick player error:', error)
    sendError(socket, ERROR_CODES.SERVER_ERROR, error.message)
  }
}
```

### Шаг 3: Зарегистрировать событие

**Файл:** `server/socket-server.js`  
**Где:** В секции регистрации событий (строка 778)

```javascript
io.on('connection', (socket) => {
  // ... 

  socket.on(SOCKET_EVENTS.KICK_PLAYER, (data) => handleKickPlayer(socket, data))
  
  socket.on('disconnect', () => handleDisconnect(socket))
})
```

### Шаг 4: Добавить клиентскую логику

**Файл:** `app/composables/useGame.js`  
**Где:** В `return` объект внизу функции (примерно строка 800)

```javascript
export const useGame = () => {
  // ...
  
  const kickPlayer = (playerId) => {
    if (!isConnected.value) {
      console.warn('⚠️ Socket not connected')
      return false
    }
    
    emit(SOCKET_EVENTS.KICK_PLAYER, { targetId: playerId })
  }
  
  // ДОБАВЛЯЕМ ОБРАБОТЧИК ОТВЕТА в setupSocketListeners():
  const setupSocketListeners = () => {
    // ...
    
    on(SOCKET_EVENTS.PLAYER_KICKED, (data) => {
      console.log(`✅ Player ${data.kickedPlayer} was kicked by ${data.kickedBy}`)
      // Обновится автоматически через game-updated события
    })
  }
  
  return {
    // ..., ..., ...,
    kickPlayer
  }
}
```

---

## Способ 2: HTTP API эндпоинт (для обычных запросов)

### Шаг 1: Добавить REST маршрут

**Файл:** `server/socket-server.js`  
**Где:** В секцию REST API, после существующих маршрутов (примерно строка 1570)

```javascript
// ДОБАВЛЯЕМ НОВЫЙ ЭНДПОИНТ:
app.post('/api/rooms/:roomId/kick', async (req, res) => {
  const { roomId } = req.params
  const { targetId, playerId } = req.body
  
  // Ошибка если не указана цель или если если пользователь не имеет айди
  if (!targetId || !playerId) {
    return res.status(400).json({ error: 'Укажите targetId и playerId' })
  }
  
  // Получение комнаты по айди
  const room = rooms.get(roomId)
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  // Если игрок не хост - то ошибка
  const sender = room.getPlayer(playerId)
  if (!sender?.isHost) {
    return res.status(403).json({ error: 'Только ведущий может кикать игроков' })
  }
  
  // Поиск игрока в комнате по айди
  const target = room.getPlayer(targetId)
  if (!target) {
    return res.status(404).json({ error: 'Игрок не найден' })
  }
  
  try {
    // Исключаем игрока
    room.removePlayer(targetId)
    
    // Уведомляем через Socket.IO
    room.broadcast('player-kicked', {
      kickedPlayer: target.name,
      kickedBy: sender.name
    })
    
    // Пишем в чат системное сообщение
    room.addSystemMessage(`${target.name} исключен из игры ведущим`)
    
    // Логируем действие в консоль
    logger.info(`🌐 HTTP kick: ${target.name} by ${sender.name} in ${roomId}`)
    
    res.json({
      success: true,
      message: `Игрок ${target.name} исключен`
    })
    
  } catch (error) {
    logger.error('HTTP kick error:', error)
    res.status(500).json({ error: error.message })
  }
})
```

### Шаг 2: Добавить HTTP клиент

**Файл:** `app/composables/useAPI.js`  
**Где:** В `return` объект (примерно строка 150)

```javascript
export const useAPI = () => {
  // ...
  
  return {
    // ...
    
    kickPlayer: async (roomId, targetId, playerId) => {
      return await apiCall(`/api/rooms/${roomId}/kick`, {
        method: 'POST',
        body: JSON.stringify({ targetId, playerId })
      })
    }
  }
}
```

---

## Использование в компоненте

### Вызов методов в Vue компоненте:

```javascript
<script setup>
import { useGame } from '~/composables/useGame'
import { useAPI } from '~/composables/useAPI'

const { kickPlayer } = useGame()                  // Socket.IO способ
const { kickPlayer: kickPlayerHTTP } = useAPI()   // HTTP способ

// Socket.IO - мгновенное исключение
const kickPlayerSocket = (playerId) => {
  kickPlayer(playerId)
}

// HTTP - с обработкой результата
const kickPlayerAPI = async (playerId) => {
  try {
    const result = await kickPlayerHTTP(roomId, playerId, myPlayerId)
    console.log('Игрок исключен:', result.message)
  } catch (error) {
    console.error('Ошибка исключения:', error)
  }
}
</script>
```

### Добавление слушателя Socket.IO в компоненте:

```javascript
<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useSocket } from '~/composables/useSocket'

const { on, off } = useSocket()

// Функция-обработчик события
const handlePlayerKicked = (data) => {
  console.log(`Игрок ${data.kickedPlayer} исключен ведущим ${data.kickedBy}`)
  // Здесь можно обновить интерфейс, показать уведомление и прочее
  alert(`Игрок ${data.kickedPlayer} был исключен из игры!`)
}

// Подписываемся на события при монтировании
onMounted(() => {
  on('player-kicked', handlePlayerKicked)
})

// Отписываемся при размонтировании
onUnmounted(() => {
  off('player-kicked', handlePlayerKicked)
})
</script>
```

### Альтернативный способ через useGame (проще):

В большинстве случаев **не нужно** добавлять слушатели вручную! 

```javascript
<script setup>
import { watch } from 'vue'
import { useGame } from '~/composables/useGame'

const { gameState } = useGame()

// gameState.room.players - это "реактивная" переменная
// Когда приходит событие 'player-kicked', useGame автоматически:
// 1. Получает событие через setupSocketListeners()
// 2. Обновляет gameState.room.players (убирает исключенного игрока)
// 3. Vue автоматически обновляет интерфейс

// Если нужно что-то делать при изменении списка игроков:
watch(() => gameState.room.players.length, (newCount, oldCount) => {
  if (newCount < oldCount) {
    console.log('Кто-то был исключен! Осталось игроков:', newCount)
    // Можно показать уведомление, обновить счетчик и т.д.
  }
})
</script>

<template>
  <!-- Vue автоматически обновит список когда придет событие -->
  <div>Игроков в комнате: {{ gameState.room.players.length }}</div>
  
  <div v-for="player in gameState.room.players" :key="player.id">
    {{ player.name }}
  </div>
</template>
```

**Простыми словами:**
- `useGame()` уже слушает ВСЕ Socket.IO события за вас
- Когда приходит `player-kicked`, useGame сам обновляет `gameState`  
- Vue видит что `gameState` изменился и автоматически обновляет страницу
- Вам нужно только использовать `gameState` в шаблоне - всё остальное работает автоматически!

---

## Когда использовать какой способ?

### Socket.IO - используй когда:
- Нужна мгновенная реакция
- Real-time взаимодействие
- Игровые события во время партии

### HTTP API - используй когда:
- Нужен результат операции
- Обработка ошибок важна
- Действие не требует мгновенности
- Внешние интеграции

---

## Структура файлов (куда что добавлять):

```
server/socket-server.js
├── handleKickPlayer()              # новая функция (строка ~771)
├── socket.on('kick-player')        # регистрация события (строка ~788)
└── app.post('/api/rooms/.../kick') # HTTP маршрут (строка ~1570)

server/utils/constants.js
└── SOCKET_EVENTS                   # новые события (строка ~43)

app/composables/useGame.js
├── kickPlayer()                    # Socket.IO метод (строка ~800)
└── on('player-kicked')             # обработчик ответа

app/composables/useAPI.js
└── kickPlayer()                    # HTTP метод (строка ~150)
```

Вот и всё! Теперь у тебя есть полная функция кика игрока через оба способа коммуникации.

---

## Чек-лист для любого нового API

✅ **Socket.IO событие:**
1. Константа в `server/utils/constants.js` (строка ~43)
2. Функция-обработчик в `server/socket-server.js` (после строки 771)
3. Регистрация события там же (строка ~788)
4. Клиентская функция в `app/composables/useGame.js`

✅ **HTTP API эндпоинт:**
1. Маршрут в `server/socket-server.js` (после строки 1570)
2. Клиентский метод в `app/composables/useAPI.js`

---

## Шаблоны для копирования

### Шаблон Socket.IO обработчика:

```javascript
const handleMyAction = (socket, data) => {
  try {
    const { param1 } = data
    
    if (!param1) {
      return sendError(socket, ERROR_CODES.VALIDATION_ERROR, 'Параметр обязателен')
    }
    
    const room = getPlayerRoom(socket.id)
    if (!room) {
      return sendError(socket, ERROR_CODES.ROOM_NOT_FOUND, 'Комната не найдена')
    }
    
    const player = room.getPlayer(socket.id)
    if (!player) {
      return sendError(socket, ERROR_CODES.PLAYER_NOT_FOUND, 'Игрок не найден')
    }
    
    // Основная логика здесь
    
    room.broadcast('my-response', { result: 'success' })
    logger.info(`🎮 MyAction by ${player.name} in room ${room.id}`)
    
  } catch (error) {
    logger.error('My action error:', error)
    sendError(socket, ERROR_CODES.SERVER_ERROR, error.message)
  }
}
```

### Шаблон HTTP эндпоинта:

```javascript
app.post('/api/rooms/:roomId/my-action', async (req, res) => {
  const { roomId } = req.params
  const { param1, playerId } = req.body
  
  if (!param1 || !playerId) {
    return res.status(400).json({ error: 'Укажите все параметры' })
  }
  
  const room = rooms.get(roomId)
  if (!room) {
    return res.status(404).json({ error: 'Комната не найдена' })
  }
  
  try {
    // Основная логика здесь
    
    res.json({ success: true, message: 'Действие выполнено' })
  } catch (error) {
    logger.error('HTTP action error:', error)
    res.status(500).json({ error: error.message })
  }
})
```

### Команды для тестирования:

```bash
# Запуск сервера
npm run dev

# Тест HTTP API
curl -X POST http://localhost:3001/api/rooms/ABCD/my-action \
  -H "Content-Type: application/json" \
  -d '{"param1": "test", "playerId": "socket123"}'

# Тест Socket.IO в браузере
const socket = io('http://localhost:3001')
socket.emit('my-action', { param1: 'test' })
socket.on('my-response', console.log)
```

Теперь гайд стал намного проще и практичнее! Всё на реальном примере с указанием конкретных файлов и строк.