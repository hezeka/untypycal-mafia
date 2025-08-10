export default defineNuxtConfig({
  // Режим приложения
  ssr: false,

  // Мета-информация
  app: {
    head: {
      title: 'Нетипичная Мафия - Werewolf Game',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Онлайн платформа для игры в Werewolf (Оборотни)' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  // CSS файлы
  css: [
    '~/assets/css/main.css'
  ],

  // Директории
  srcDir: 'app/',

  // Настройки dev сервера
  devServer: {
    port: 3001, // Отличается от серверного порта 3000
    host: 'localhost'
  },

  // Настройки сборки
  nitro: {
    // Отключаем встроенный сервер, так как используем кастомный
    experimental: {
      wasm: true
    }
  },

  // Настройки совместимости
  compatibilityDate: '2024-01-01',

  // Vite конфигурация
  vite: {
    css: {
      preprocessorOptions: {
        less: {
          // Настройки LESS если нужны
        }
      }
    }
  }
})