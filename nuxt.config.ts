// nuxt.config.ts
export default defineNuxtConfig({
  // Источник приложения
  srcDir: 'app/',
  
  // SPA режим для real-time игры
  ssr: false,
  
  // Настройки разработки
  devtools: { enabled: true },
  
  // CSS фреймворк
  css: [
    '~/assets/css/main.css'
  ],
  
  // Компоненты
  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],
  
  // Модули
  modules: [
    
  ],
  
  // Настройки приложения
  app: {
    head: {
      title: 'Нетипичная Мафия',
      meta: [
        { name: 'description', content: 'Социально-дедукционная игра основанная на One Night Ultimate Werewolf' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#1a1a1a' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }
      ]
    }
  },
  
  // PWA настройки
  pwa: {
    registerType: 'autoUpdate',
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    manifest: {
      name: 'Нетипичная Мафия',
      short_name: 'Мафия',
      description: 'Социально-дедукционная игра',
      theme_color: '#1a1a1a',
      background_color: '#000000',
      display: 'standalone',
      orientation: 'portrait'
    }
  },
  
  // Vite настройки
  vite: {
    // Настройки для Socket.IO
    define: {
      global: 'globalThis'
    },
    server: {
      hmr: {
        port: 3001
      }
    }
  },
  
  // Настройки runtime
  runtimeConfig: {
    // Серверные переменные
    socketPort: process.env.SOCKET_PORT || 3001,
    
    // Публичные переменные
    public: {
      socketUrl: process.env.NODE_ENV === 'production' 
        ? 'https://mafia.waifucards.app'
        : 'http://localhost:3001'
    }
  },
  
  // Совместимость
  compatibilityDate: '2024-01-01',
  
  // Настройки производительности
  experimental: {
    payloadExtraction: false
  },
  
  // Настройки сборки
  nitro: {
    preset: 'node-server'
  }
})