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
        { name: 'theme-color', content: '#F38920' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/app-icons/android-icon-192x192.png' },
        { rel: 'icon', type: 'image/png', sizes: '144x144', href: '/app-icons/android-icon-144x144.png' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/app-icons/android-icon-96x96.png' },
        { rel: 'icon', type: 'image/png', sizes: '72x72', href: '/app-icons/android-icon-72x72.png' },
        { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/app-icons/android-icon-48x48.png' },
        { rel: 'icon', type: 'image/png', sizes: '36x36', href: '/app-icons/android-icon-36x36.png' },
        { rel: 'apple-touch-icon', sizes: '192x192', href: '/app-icons/android-icon-192x192.png' },
        { rel: 'apple-touch-icon', sizes: '144x144', href: '/app-icons/android-icon-144x144.png' },
        { rel: 'apple-touch-icon', sizes: '96x96', href: '/app-icons/android-icon-96x96.png' },
        { rel: 'manifest', href: '/manifest.json' },
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
      "name": "Нетипичная Мафия",
      "short_name": "Нетипичка",
      "version": "3.0.1",
      "description": "Социальная игра-дедукция на основе \"ONUW\" с многопользовательским онлайн-режимом",
      "start_url": "/?source=pwa",
      "scope": "/",
      "display": "standalone",
      "orientation": "any",
      "theme_color": "#F38920",
      "background_color": "#1a1a1a",
      "lang": "ru-RU",
      "id": "mafia.waifucards.app",
      "categories": ["games", "entertainment", "social"],
      "display_override": ["window-controls-overlay", "standalone"],
      "icons": [
        {
          "src": "/app-icons/android-icon-36x36.png",
          "sizes": "36x36",
          "type": "image/png",
          "density": "0.75"
        },
        {
          "src": "/app-icons/android-icon-48x48.png",
          "sizes": "48x48",
          "type": "image/png",
          "density": "1.0"
        },
        {
          "src": "/app-icons/android-icon-72x72.png",
          "sizes": "72x72",
          "type": "image/png",
          "density": "1.5"
        },
        {
          "src": "/app-icons/android-icon-96x96.png",
          "sizes": "96x96",
          "type": "image/png",
          "density": "2.0"
        },
        {
          "src": "/app-icons/android-icon-144x144.png",
          "sizes": "144x144",
          "type": "image/png",
          "density": "3.0"
        },
        {
          "src": "/app-icons/android-icon-192x192.png",
          "sizes": "192x192",
          "type": "image/png",
          "density": "4.0",
          "purpose": "any maskable"
        }
      ],
      "shortcuts": [
        {
          "name": "Присоединиться к игре",
          "short_name": "Войти",
          "description": "Присоединиться к существующей игровой комнате",
          "url": "/",
          "icons": [
            {
              "src": "/app-icons/android-icon-96x96.png",
              "sizes": "96x96",
              "type": "image/png"
            }
          ]
        }
      ],
      "related_applications": [{
        "platform": "webapp",
        "url": "https://mafia.waifucards.app/manifest.json"
      }],
      "prefer_related_applications": true
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
      },
      allowedHosts: ['mafia.waifucards.app']
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
  compatibilityDate: '2025-09-01',
  
  // Настройки производительности
  experimental: {
    payloadExtraction: false
  },
  
  // Настройки сборки
  nitro: {
    preset: 'node-server'
  }
})