import { ref } from 'vue'

const username = ref('')

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
  
  return {
    username: readonly(username),
    setUsername
  }
}