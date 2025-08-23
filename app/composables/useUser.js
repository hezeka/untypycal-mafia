import { ref } from 'vue'

const username = ref('')

// Загружаем имя из localStorage при инициализации
if (process.client) {
  username.value = localStorage.getItem('mafia_username') || ''
}

export const useUser = () => {
  const setUsername = (newUsername) => {
    username.value = newUsername
    if (process.client) {
      localStorage.setItem('mafia_username', newUsername)
    }
  }
  
  const clearUsername = () => {
    username.value = ''
    if (process.client) {
      localStorage.removeItem('mafia_username')
    }
  }
  
  return {
    username,
    setUsername,
    clearUsername
  }
}