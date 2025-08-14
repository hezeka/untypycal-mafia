import { ref, computed, watch, reactive } from 'vue'
import { useSocket } from './useSocket'

const storedUsername = ref(null)
const isUsernameSet = ref(false)

// Reactive validation state
const validation = reactive({
  isValid: false,
  isChecking: false,
  error: null,
  suggestions: []
})

export const useUser = () => {
  const { socket } = useSocket()
  
  // Initialize username from localStorage
  if (process.client) {
    const saved = localStorage.getItem('globalUsername')
    if (saved) {
      storedUsername.value = saved
      isUsernameSet.value = true
    }
  }

  // Computed properties
  const username = computed(() => storedUsername.value)
  const hasUsername = computed(() => isUsernameSet.value && storedUsername.value)

  // Validation helpers
  const validateUsernameFormat = (name) => {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Имя не может быть пустым' }
    }

    if (name.length > 15) {
      return { valid: false, error: 'Имя слишком длинное (максимум 15 символов)' }
    }

    if (!/^[a-zA-Zа-яА-Я0-9_-]*$/.test(name)) {
      return { valid: false, error: 'Недопустимые символы. Используйте только буквы, цифры, дефис и подчеркивание' }
    }

    if (!/^[a-zA-Zа-яА-Я]/.test(name)) {
      return { valid: false, error: 'Имя должно начинаться с буквы' }
    }

    if (name.includes('/')) {
      return { valid: false, error: 'Символ "/" запрещен в именах' }
    }

    if (name.includes(' ')) {
      return { valid: false, error: 'Пробелы запрещены в именах' }
    }

    return { valid: true, error: null }
  }

  // Check username availability globally
  const checkUsernameAvailability = (name) => {
    return new Promise((resolve) => {
      validation.isChecking = true
      
      socket.emit('check-global-username', { username: name })
      
      const onResult = (result) => {
        validation.isChecking = false
        validation.isValid = result.available
        validation.error = result.error
        validation.suggestions = result.suggestions || []
        
        socket.off('global-username-result', onResult)
        resolve(result)
      }
      
      socket.on('global-username-result', onResult)
    })
  }

  // Set username with validation
  const setUsername = async (newUsername) => {
    const trimmedName = newUsername.trim()
    
    // Format validation
    const formatCheck = validateUsernameFormat(trimmedName)
    if (!formatCheck.valid) {
      validation.error = formatCheck.error
      validation.isValid = false
      return { success: false, error: formatCheck.error }
    }

    // Availability check
    const availabilityCheck = await checkUsernameAvailability(trimmedName)
    if (!availabilityCheck.available) {
      return { 
        success: false, 
        error: availabilityCheck.error, 
        suggestions: availabilityCheck.suggestions 
      }
    }

    // Save username
    const finalUsername = availabilityCheck.formattedName || trimmedName
    
    storedUsername.value = finalUsername
    isUsernameSet.value = true
    
    if (process.client) {
      localStorage.setItem('globalUsername', storedUsername.value)
    }

    validation.isValid = true
    validation.error = null
    validation.suggestions = []

    return { success: true, username: storedUsername.value }
  }

  // Change username
  const changeUsername = async (newUsername) => {
    // Clear current username temporarily
    const oldUsername = storedUsername.value
    const result = await setUsername(newUsername)
    
    if (!result.success) {
      storedUsername.value = oldUsername // Restore on failure
      return result
    }

    return result
  }

  // Clear username
  const clearUsername = () => {
    storedUsername.value = null
    isUsernameSet.value = false
    validation.isValid = false
    validation.error = null
    validation.suggestions = []
    
    if (process.client) {
      localStorage.removeItem('globalUsername')
    }
  }

  // Initialize username setup flow
  const initializeUsername = () => {
    if (!hasUsername.value) {
      // Generate a random username suggestion
      const randomSuffix = Math.floor(Math.random() * 9999) + 1
      return `User${randomSuffix}`
    }
    return storedUsername.value
  }

  return {
    // State
    username,
    hasUsername,
    isUsernameSet,
    validation,

    // Methods
    setUsername,
    changeUsername,
    clearUsername,
    checkUsernameAvailability,
    validateUsernameFormat,
    initializeUsername
  }
}