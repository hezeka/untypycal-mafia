// dev.js - Скрипт для запуска в development режиме
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('🚀 Starting Нетипичная Мафия development server...\n')

// Запуск сокет сервера
const serverProcess = spawn('node', ['server/socket-server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    SOCKET_PORT: '3001'
  }
})

// Запуск Nuxt клиента
const clientProcess = spawn('nuxt', ['dev', '--srcDir', 'app'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
})

// Обработка завершения
const cleanup = () => {
  console.log('\n🛑 Shutting down servers...')
  serverProcess.kill()
  clientProcess.kill()
  process.exit()
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`)
  cleanup()
})

clientProcess.on('exit', (code) => {
  console.log(`Client process exited with code ${code}`)
  cleanup()
})