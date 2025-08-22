/**
 * Простая система событий для развязки компонентов
 */

export class EventBus {
  constructor() {
    this.events = new Map()
  }
  
  /**
   * Подписка на событие
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    
    this.events.get(event).push(callback)
    
    // Возвращаем функцию для отписки
    return () => this.off(event, callback)
  }
  
  /**
   * Одноразовая подписка на событие
   */
  once(event, callback) {
    const wrapper = (...args) => {
      callback(...args)
      this.off(event, wrapper)
    }
    
    return this.on(event, wrapper)
  }
  
  /**
   * Отписка от события
   */
  off(event, callback) {
    if (!this.events.has(event)) return
    
    const callbacks = this.events.get(event)
    const index = callbacks.indexOf(callback)
    
    if (index > -1) {
      callbacks.splice(index, 1)
    }
    
    // Удаляем массив если он пустой
    if (callbacks.length === 0) {
      this.events.delete(event)
    }
  }
  
  /**
   * Вызов всех подписчиков события
   */
  emit(event, ...args) {
    if (!this.events.has(event)) return
    
    const callbacks = this.events.get(event).slice() // Копируем массив
    
    callbacks.forEach(callback => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`❌ Error in event handler for '${event}':`, error)
      }
    })
  }
  
  /**
   * Проверка есть ли подписчики на событие
   */
  hasListeners(event) {
    return this.events.has(event) && this.events.get(event).length > 0
  }
  
  /**
   * Получение количества подписчиков
   */
  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0
  }
  
  /**
   * Получение всех событий
   */
  eventNames() {
    return Array.from(this.events.keys())
  }
  
  /**
   * Удаление всех подписчиков
   */
  removeAllListeners(event = null) {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }
  
  /**
   * Отладочная информация
   */
  getDebugInfo() {
    const info = {}
    
    for (const [event, callbacks] of this.events) {
      info[event] = callbacks.length
    }
    
    return info
  }
}