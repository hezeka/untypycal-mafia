/**
 * Утилиты для работы с изображениями ролей
 */
import { getAllRoles } from '../../../shared/rolesRegistry.js'

/**
 * Обработчик ошибок загрузки изображений ролей
 * @param {Event} event - Событие ошибки изображения
 * @param {string} roleId - ID роли
 */
export const handleRoleImageError = (event, roleId) => {
  console.log(`⚠️ Image error for role ${roleId}, trying fallback...`)
  
  // Сначала пробуем несжатую версию
  if (event.target.src.includes('compressed')) {
    console.log(`📸 Trying uncompressed image for role ${roleId}`)
    event.target.src = `/roles/${roleId}.png`
  } else if (event.target.src.includes('.png')) {
    // Если PNG не загрузилась, пробуем JPG
    console.log(`📸 Trying JPG fallback for role ${roleId}`)
    event.target.src = `/roles/${roleId}.jpg`
  } else {
    // Финальная заглушка - создаем текстовую заглушку
    console.log(`📸 Creating text placeholder for role ${roleId}`)
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 100
    canvas.height = 140
    
    // Фон
    ctx.fillStyle = '#2d3748'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Рамка
    ctx.strokeStyle = '#4a5568'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, canvas.width, canvas.height)
    
    // Текст
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    const roles = getAllRoles()
    const role = roles[roleId]
    const roleName = role ? role.name : roleId
    
    // Разбиваем длинное название на строки
    const words = roleName.split(' ')
    let lines = []
    let currentLine = ''
    
    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      const metrics = ctx.measureText(testLine)
      if (metrics.width > canvas.width - 10 && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })
    if (currentLine) lines.push(currentLine)
    
    // Рисуем текст по центру
    const lineHeight = 16
    const startY = (canvas.height - (lines.length * lineHeight)) / 2 + lineHeight
    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, startY + (index * lineHeight))
    })
    
    // Устанавливаем сгенерированное изображение
    event.target.src = canvas.toDataURL()
  }
}

/**
 * Простой обработчик для случаев где достаточно fallback к card-back
 * @param {Event} event - Событие ошибки изображения
 * @param {string} roleId - ID роли
 */
export const handleRoleImageErrorSimple = (event, roleId) => {
  console.log(`⚠️ Image error for role ${roleId}, trying fallback...`)
  
  // Сначала пробуем несжатую версию
  if (event.target.src.includes('compressed')) {
    console.log(`📸 Trying uncompressed image for role ${roleId}`)
    event.target.src = `/roles/${roleId}.png`
  } else if (event.target.src.includes('.png')) {
    // Если PNG не загрузилась, пробуем JPG
    console.log(`📸 Trying JPG fallback for role ${roleId}`)
    event.target.src = `/roles/${roleId}.jpg`
  } else {
    // Финальная заглушка - используем card-back
    console.log(`📸 Using card-back fallback for role ${roleId}`)
    event.target.src = '/roles/card-back.png'
  }
}