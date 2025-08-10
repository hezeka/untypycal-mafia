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
    port: 3001,
    host: 'localhost'
  },

  // Настройки сборки
  nitro: {
    experimental: {
      wasm: true
    }
  },

  // Настройки совместимости
  compatibilityDate: '2024-01-01',

  // Vite конфигурация с исправлениями для сервера
  vite: {
    define: {
      global: 'globalThis'
    },
    optimizeDeps: {
      include: ['socket.io-client']
    },
    css: {
      preprocessorOptions: {
        less: {
          // Настройки LESS если нужны
        }
      }
    },
    server: {
      hmr: {
        port: 24678
      }
    },
    // Отключаем проблемные плагины на продакшене
    plugins: process.env.NODE_ENV === 'production' ? [] : undefined
  },

  // Добавляем настройки для продакшена
  build: {
    transpile: ['socket.io-client']
  },

  // Отключаем dev tools на продакшене
  devtools: { enabled: process.env.NODE_ENV !== 'production' }
})