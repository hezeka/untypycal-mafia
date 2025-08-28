import { GAME_PHASES, PHASE_DURATIONS, MESSAGE_TYPES } from '../utils/constants.js'
import { getNightRoles, executeRoleAction, getRoleInfo } from '../roles/rolesList.js'
import { getAllRoles } from '../../shared/rolesRegistry.js'

export class GameEngine {
  constructor(room) {
    this.room = room
    this.currentPhase = GAME_PHASES.SETUP
    this.phaseTimer = null
    this.phaseStartTime = null
    this.nightActionIndex = 0
    this.nightRoles = []
    this.killedPlayers = []
    this.protectedPlayers = []
  }

  async startGame() {
    this.assignRoles()
    await this.setPhase(GAME_PHASES.INTRODUCTION)
  }

  assignRoles() {
    const players = Array.from(this.room.players.values()).filter(p => p.role !== 'game_master')
    const roles = [...this.room.selectedRoles]
    
    // Разделяем роли на оборотней и остальных
    const werewolfRoles = roles.filter(role => {
      const roleData = this.getRoleData(role)
      return roleData && roleData.team === 'werewolf'
    })
    
    const otherRoles = roles.filter(role => {
      const roleData = this.getRoleData(role)
      return !roleData || roleData.team !== 'werewolf'
    })
    
    // Перемешиваем каждую категорию отдельно
    this.shuffleArray(werewolfRoles)
    this.shuffleArray(otherRoles)
    
    // Гарантируем, что хотя бы один оборотень попадёт игрокам
    const playerRoles = []
    const centerRoles = []
    
    if (werewolfRoles.length > 0 && players.length > 0) {
      // Добавляем первого оборотня в роли игроков
      playerRoles.push(werewolfRoles[0])
      
      // Распределяем оставшихся оборотней
      for (let i = 1; i < werewolfRoles.length; i++) {
        if (playerRoles.length < players.length) {
          playerRoles.push(werewolfRoles[i])
        } else {
          centerRoles.push(werewolfRoles[i])
        }
      }
    }
    
    // Добавляем остальные роли
    for (const role of otherRoles) {
      if (playerRoles.length < players.length) {
        playerRoles.push(role)
      } else {
        centerRoles.push(role)
      }
    }
    
    // Перемешиваем финальный список ролей игроков
    this.shuffleArray(playerRoles)
    
    // Назначаем роли игрокам
    players.forEach((player, index) => {
      if (index < playerRoles.length) {
        player.role = playerRoles[index]
      }
    })
    
    // Оставшиеся роли - центральные карты
    this.room.centerCards = centerRoles
  }
  
  // Вспомогательный метод для перемешивания массива
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
  }
  
  // Вспомогательный метод для получения данных роли
  getRoleData(roleId) {
    try {
      const allRoles = getAllRoles()
      return allRoles[roleId]
    } catch (error) {
      console.error('Failed to get role data:', error)
      return null
    }
  }

  async setPhase(newPhase) {
    this.currentPhase = newPhase
    this.room.gameState = newPhase
    this.phaseStartTime = Date.now()
    
    const phaseKey = newPhase.toUpperCase()
    const duration = PHASE_DURATIONS[phaseKey]
    const endTime = duration ? this.phaseStartTime + (duration * 1000) : null
    
    console.log('🔄 Setting phase:', newPhase, 'PhaseKey:', phaseKey, 'Duration:', duration, 'End time:', endTime ? new Date(endTime) : null)
    
    // Обновляем права чата
    this.updateChatPermissions()
    
    // Запускаем таймер
    this.startPhaseTimer()
    
    // Специальная логика для фаз
    switch (newPhase) {
      case GAME_PHASES.NIGHT:
        this.startNightPhase()
        break
      case GAME_PHASES.DAY:
        await this.announceNightResults()
        break
      case GAME_PHASES.VOTING:
        this.room.votes.clear()
        this.room.votingActive = true
        break
    }
    
    this.room.broadcast('phase-changed', {
      phase: newPhase,
      timer: duration || 0,
      timerEndTime: endTime
    })
    
    // Обновляем состояние комнаты (включая права чата)
    this.room.broadcast('game-updated', { room: this.room.getClientData() })
  }

  updateChatPermissions() {
    // Используем метод GameRoom для обновления прав чата
    this.room.updateChatPermissions()
  }

  startPhaseTimer() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
    }
    
    const duration = PHASE_DURATIONS[this.currentPhase]
    if (duration) {
      this.phaseTimer = setTimeout(async () => {
        await this.nextPhase()
      }, duration * 1000)
    }
  }

  async nextPhase() {
    switch (this.currentPhase) {
      case GAME_PHASES.INTRODUCTION:
        await this.setPhase(GAME_PHASES.NIGHT)
        break
      case GAME_PHASES.NIGHT:
        await this.setPhase(GAME_PHASES.DAY)
        // Проверяем условия победы после ночи (оборотни могли убить всех жителей)
        if (this.checkWinConditions()) {
          console.log('🏆 Game ended after night phase')
          return
        }
        break
      case GAME_PHASES.DAY:
        await this.setPhase(GAME_PHASES.VOTING)
        // Проверяем условия победы после дневной фазы
        if (this.checkWinConditions()) {
          console.log('🏆 Game ended after day phase')
          return
        }
        break
      case GAME_PHASES.VOTING:
        // Проверяем, не было ли голосование уже обработано досрочно
        if (this.room.votingActive) {
          this.processVoting()
          if (this.checkWinConditions()) {
            // Игра уже закончена в endGame(), ничего не делаем
            console.log('🏆 Game ended, no phase transition needed')
          } else {
            // Увеличиваем счетчик дней, пережитых игроками
            this.room.daysSurvived++
            console.log(`📅 Day ${this.room.daysSurvived} completed`)
            // Сразу обновляем статистику для клиентов
            this.room.broadcast('statistics-updated', { 
              civiliansKilled: this.room.civiliansKilled,
              daysSurvived: this.room.daysSurvived 
            })
            await this.setPhase(GAME_PHASES.NIGHT)
          }
        }
        break
    }
  }

  startNightPhase() {
    this.killedPlayers = []
    this.protectedPlayers = []
    this.nightActionIndex = 0
    this.completedActions = new Set() // Отслеживание выполненных действий
    this.currentPhaseTimer = null
    this.werewolfVotes = new Map() // Голоса оборотней
    this.pendingMessages = [] // Отложенные сообщения для отправки днём
    this.attackedPlayers = [] // Игроки, на которых было покушение (для сообщений о защите)
    
    const players = Array.from(this.room.players.values())
    const playerRoles = players.map(p => p.role).filter(r => r && r !== 'game_master')
    
    this.nightRoles = getNightRoles(playerRoles)
    this.processNextNightAction()
  }

  async processNextNightAction() {
    if (this.nightActionIndex >= this.nightRoles.length) {
      // Все действия выполнены, переходим к дню
      setTimeout(async () => await this.nextPhase(), 2000)
      return
    }

    const currentRole = this.nightRoles[this.nightActionIndex]
    const players = this.getPlayersWithRole(currentRole.id)
    
    if (players.length > 0) {
      // Очищаем список выполненных действий для новой роли
      this.completedActions.clear()
      
      // Обновляем таймер для клиента
      this.phaseStartTime = Date.now()
      const endTime = this.phaseStartTime + (30 * 1000) // 30 секунд
      
      // Уведомляем игроков об их ходе
      players.forEach(player => {
        this.room.sendToPlayer(player.id, 'night-action-turn', {
          role: currentRole.id,
          timeLimit: 30
        })
      })
      
      // Обновляем таймер для всех клиентов (используем отдельный event для ночных действий)
      this.room.broadcast('night-action-timer', {
        role: currentRole.id,
        timeLimit: 30,
        endTime: endTime
      })
      
      // Устанавливаем таймер на 30 секунд
      this.currentPhaseTimer = setTimeout(() => {
        console.log(`⏰ Night action timeout for role ${currentRole.id}`)
        this.nextNightAction()
      }, 30000)
    } else {
      // Нет игроков с этой ролью, пропускаем
      this.nextNightAction()
    }
  }
  
  // Переход к следующему ночному действию
  nextNightAction() {
    if (this.currentPhaseTimer) {
      clearTimeout(this.currentPhaseTimer)
      this.currentPhaseTimer = null
    }
    
    this.nightActionIndex++
    this.processNextNightAction()
  }
  
  // Проверяем, все ли игроки текущей роли выполнили действие
  checkAllPlayersCompleted() {
    if (this.nightActionIndex >= this.nightRoles.length) return
    
    const currentRole = this.nightRoles[this.nightActionIndex]
    const players = this.getPlayersWithRole(currentRole.id)
    
    // Если все игроки с текущей ролью выполнили действие
    if (players.length > 0 && this.completedActions.size >= players.length) {
      console.log(`✅ All players with role ${currentRole.id} completed their actions`)
      this.nextNightAction()
    }
  }

  getPlayersWithRole(roleId) {
    return Array.from(this.room.players.values())
      .filter(p => p.role === roleId && p.alive)
  }

  async executeNightAction(playerId, action) {
    const player = this.room.getPlayer(playerId)
    if (!player || !player.alive) return { error: 'Игрок не найден' }

    const currentRole = this.nightRoles[this.nightActionIndex]
    if (!currentRole || player.role !== currentRole.id) {
      return { error: 'Сейчас не ваш ход' }
    }

    // Проверяем, не выполнял ли уже этот игрок действие
    if (this.completedActions.has(playerId)) {
      return { error: 'Вы уже выполнили своё действие' }
    }

    try {
      const result = await executeRoleAction(this, player, action)
      
      // Если действие успешно, отмечаем игрока как выполнившего действие
      if (result && !result.error) {
        this.completedActions.add(playerId)
        console.log(`✅ Player ${player.name} (${player.role}) completed action`)
        
        // Проверяем, все ли игроки с этой ролью завершили действие
        this.checkAllPlayersCompleted()
      }
      
      return result
    } catch (error) {
      return { error: error.message }
    }
  }

  async announceNightResults() {
    console.log('🌅 Announcing night results...')
    const messages = []
    
    // Обрабатываем голосование оборотней
    this.processWerewolfVotes()
    
    // Отправляем отложенные личные сообщения игрокам
    this.sendPendingMessages()
    
    // Небольшая задержка перед системными сообщениями (чтобы избежать конфликтов)
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Удаляем дубликаты из списка убитых (на всякий случай)
    this.killedPlayers = [...new Set(this.killedPlayers)]
    
    // Формируем сообщения о результатах ночи
    if (this.killedPlayers.length > 0) {
      this.killedPlayers.forEach(playerId => {
        const player = this.room.getPlayer(playerId)
        if (player && player.alive) { // Проверяем, что игрок еще жив
          player.alive = false
          messages.push(`${player.name} был убит ночью`)
          console.log(`💀 ${player.name} killed during night`)
        }
      })
    } else if (this.attackedPlayers.length > 0) {
      // Были покушения, но все защищены
      this.attackedPlayers.forEach(playerId => {
        const player = this.room.getPlayer(playerId)
        if (player) {
          messages.push(`Ночью было совершено покушение на ${player.name}, но его защитил страж`)
          console.log(`🛡️ ${player.name} was attacked but protected`)
        }
      })
    } else {
      messages.push('Ночь прошла спокойно')
      console.log('😴 Peaceful night - no kills')
    }
    
    messages.forEach(msg => {
      this.room.addSystemMessage(msg, MESSAGE_TYPES.SYSTEM)
    })
    
    // Обновляем состояние комнаты для всех игроков
    this.room.broadcast('game-updated', { room: this.room.getClientData() })
    
    // Проверяем условия победы после объявления результатов ночи
    if (this.checkWinConditions()) {
      console.log('🏆 Game ended after night results announcement')
      return
    }
  }
  
  // Добавление сообщения в пул для отправки днём
  addPendingMessage(playerId, message) {
    this.pendingMessages.push({ playerId, message })
  }
  
  // Отправка всех отложенных сообщений
  sendPendingMessages() {
    this.pendingMessages.forEach(({ playerId, message }) => {
      this.room.addSystemWhisper(message, playerId)
    })
    this.pendingMessages = [] // Очищаем после отправки
  }
  
  processWerewolfVotes() {
    if (!this.werewolfVotes || this.werewolfVotes.size === 0) {
      console.log('No werewolf votes to process')
      return
    }
    
    // Подсчитываем голоса
    const voteCounts = new Map()
    for (const [voterId, targetId] of this.werewolfVotes) {
      if (targetId) {
        voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1)
      }
    }
    
    if (voteCounts.size === 0) {
      console.log('No valid werewolf votes')
      return
    }
    
    // Находим игрока(ов) с наибольшим количеством голосов
    const maxVotes = Math.max(...voteCounts.values())
    const victims = []
    
    for (const [targetId, votes] of voteCounts) {
      if (votes === maxVotes) {
        victims.push(targetId)
      }
    }
    
    // Если ничья, никто не умирает
    if (victims.length > 1) {
      console.log(`Werewolf voting tie between ${victims.length} players - no kill`)
      return
    }
    
    // Убиваем выбранного игрока (если он не защищен и еще не убит)
    if (victims.length === 1) {
      const victimId = victims[0]
      
      // Отслеживаем атакованного игрока (для сообщений о защите)
      if (!this.attackedPlayers.includes(victimId)) {
        this.attackedPlayers.push(victimId)
      }
      
      if (!this.protectedPlayers.includes(victimId) && !this.killedPlayers.includes(victimId)) {
        this.killedPlayers.push(victimId)
        const victim = this.room.getPlayer(victimId)
        console.log(`🐺 Werewolves killed ${victim?.name} (${victimId})`)
      } else if (this.protectedPlayers.includes(victimId)) {
        console.log(`🛡️ Target was protected from werewolf attack`)
      } else {
        console.log(`⚠️ Target already killed by another action`)
      }
    }
  }

  processVoting() {
    this.room.votingActive = false
    const result = this.room.getVotingResults()
    
    // Показываем детальные результаты голосования в чате
    this.announceVotingResults(result)
    
    // Исключаем игрока(ов) с наибольшим количеством голосов
    const huntersKilled = []
    if (result.eliminated.length > 0) {
      result.eliminated.forEach(playerId => {
        const player = this.room.getPlayer(playerId)
        if (player) {
          player.alive = false
          
          // Проверяем, если убили охотника
          if (player.role === 'hunter') {
            huntersKilled.push(player)
          }
          
          const roleInfo = getRoleInfo(player.role)
          const roleName = roleInfo?.name || player.role
          
          // Увеличиваем счетчик убитых мирных, если роль принадлежит деревне
          if (roleInfo && roleInfo.team === 'village') {
            this.room.civiliansKilled++
            console.log(`💀 Civilian ${player.name} (${roleName}) killed, total civilians killed: ${this.room.civiliansKilled}`)
            // Сразу обновляем статистику для клиентов
            this.room.broadcast('statistics-updated', { 
              civiliansKilled: this.room.civiliansKilled,
              daysSurvived: this.room.daysSurvived 
            })
          }
          
          this.room.addSystemMessage(`💀 ${player.name} (${roleName}) был исключен голосованием`, MESSAGE_TYPES.SYSTEM)
        }
      })
    } else {
      this.room.addSystemMessage('Никто не был исключен', MESSAGE_TYPES.SYSTEM)
    }
    
    // Обрабатываем месть охотников
    this.processHunterRetaliation(huntersKilled, result)
    
    // Обрабатываем выживание Ктулху
    this.processCthulhuSurvival(result)
    
    // Показываем результаты голосования
    this.room.broadcast('voting-ended', result)
    
    // ВАЖНО: Обновляем состояние игры для всех игроков
    this.room.broadcast('game-updated', { room: this.room.getClientData() })
  }
  
  announceVotingResults(result) {
    const { voteCounts, abstainCount, totalVotes } = result
    
    // Сортируем по количеству голосов
    const sortedVotes = Object.entries(voteCounts)
      .sort(([,a], [,b]) => b - a)
    
    // Формируем одно сообщение со всеми результатами
    let message = '📊 Результаты голосования: '
    
    const voteParts = []
    
    if (sortedVotes.length > 0) {
      sortedVotes.forEach(([playerId, votes]) => {
        const player = this.room.getPlayer(playerId)
        if (player) {
          const plural = votes === 1 ? 'голос' : votes < 5 ? 'голоса' : 'голосов'
          voteParts.push(`${player.name} - ${votes} ${plural}`)
        }
      })
    }
    
    if (abstainCount > 0) {
      const plural = abstainCount === 1 ? 'воздержался' : 'воздержались'
      voteParts.push(`Воздержались: ${abstainCount}`)
    }
    
    if (voteParts.length === 0) {
      message += 'Никто не голосовал'
    } else {
      message += voteParts.join(', ')
    }
    
    this.room.addSystemMessage(message, MESSAGE_TYPES.SYSTEM)
  }
  
  processHunterRetaliation(huntersKilled, votingResult) {
    huntersKilled.forEach(hunter => {
      // Нужно найти за кого голосовал этот охотник
      const hunterVote = this.room.votes.get(hunter.id)
      
      if (hunterVote && hunterVote !== null) {
        const target = this.room.getPlayer(hunterVote)
        if (target && target.alive) {
          target.alive = false
          const targetRoleInfo = getRoleInfo(target.role)
          const targetRoleName = targetRoleInfo?.name || target.role
          
          // Увеличиваем счетчик убитых мирных, если роль принадлежит деревне
          if (targetRoleInfo && targetRoleInfo.team === 'village') {
            this.room.civiliansKilled++
            console.log(`💀 Civilian ${target.name} (${targetRoleName}) killed by hunter, total civilians killed: ${this.room.civiliansKilled}`)
            // Сразу обновляем статистику для клиентов
            this.room.broadcast('statistics-updated', { 
              civiliansKilled: this.room.civiliansKilled,
              daysSurvived: this.room.daysSurvived 
            })
          }
          
          this.room.addSystemMessage(
            `💀 ${hunter.name} (Охотник) забирает с собой ${target.name} (${targetRoleName})!`, 
            MESSAGE_TYPES.SYSTEM
          )
        }
      } else {
        this.room.addSystemMessage(
          `💀 ${hunter.name} (Охотник) умирает, но не выбрал цель для мести`, 
          MESSAGE_TYPES.SYSTEM
        )
      }
    })
  }

  processCthulhuSurvival(votingResult) {
    const aliveCthulhuPlayers = Array.from(this.room.players.values()).filter(p => {
      if (p.role === 'game_master' || !p.alive) return false
      const role = getRoleInfo(p.role)
      return role && role.id === 'cthulhu'
    })
    
    // Проверяем каждого живого Ктулху
    aliveCthulhuPlayers.forEach(cthulhuPlayer => {
      // Если Ктулху НЕ был исключен в этом голосовании, он выжил еще одно голосование
      if (!votingResult.eliminated.includes(cthulhuPlayer.id)) {
        // Получаем экземпляр роли для увеличения счетчика
        if (!this.cthulhuSurvivalCounts) {
          this.cthulhuSurvivalCounts = new Map()
        }
        
        const currentCount = this.cthulhuSurvivalCounts.get(cthulhuPlayer.id) || 0
        const newCount = currentCount + 1
        this.cthulhuSurvivalCounts.set(cthulhuPlayer.id, newCount)
        
        console.log(`🐙 Cthulhu ${cthulhuPlayer.name} survived voting ${newCount}/3`)
        
        // Отправляем уведомление Ктулху о прогрессе
        this.room.sendToPlayer(cthulhuPlayer.id, 'cthulhu-survival', {
          survivedCount: newCount,
          totalNeeded: 3
        })
        
        if (newCount >= 3) {
          console.log(`🏆 CTHULHU WINS: ${cthulhuPlayer.name} survived 3 votings!`)
        }
      }
    })
  }

  checkWinConditions() {
    const alivePlayers = Array.from(this.room.players.values()).filter(p => p.alive)
    const deadPlayers = Array.from(this.room.players.values()).filter(p => !p.alive)
    
    console.log('🏆 Checking win conditions...')
    console.log('🏆 Alive players:', alivePlayers.map(p => `${p.name} (${p.role})`))
    console.log('🏆 Dead players:', deadPlayers.map(p => `${p.name} (${p.role})`))
    
    // 1. Проверяем победу Ктулху (приоритет над остальными)
    if (this.cthulhuSurvivalCounts) {
      for (const [playerId, survivalCount] of this.cthulhuSurvivalCounts.entries()) {
        const player = this.room.getPlayer(playerId)
        if (player && player.alive && survivalCount >= 3) {
          console.log(`🏆 WIN: Cthulhu ${player.name} survived 3 votings - Cthulhu wins!`)
          this.endGame('cthulhu', [playerId])
          return true
        }
      }
    }
    
    // 2. Неудачник убит - он побеждает
    const tannerKilled = deadPlayers.find(p => p.role === 'tanner')
    if (tannerKilled) {
      console.log('🏆 WIN: Tanner killed - Tanner wins!')
      this.endGame('tanner', [tannerKilled.id])
      return true
    }
    
    // 2. Хотя бы один оборотень убит - победа деревни
    const werewolfKilled = deadPlayers.find(p => 
      this.getTeam(p.role) === 'werewolf' && p.role !== 'minion'
    )
    if (werewolfKilled) {
      console.log(`🏆 WIN: Werewolf ${werewolfKilled.name} killed - Village wins!`)
      const villageWinners = alivePlayers.filter(p => 
        ['village', 'special'].includes(this.getTeam(p.role)) || p.role === 'minion'
      )
      this.endGame('village', villageWinners.map(p => p.id))
      return true
    }
    
    // 3. Все жители убиты - победа оборотней
    const aliveVillagers = alivePlayers.filter(p => 
      this.getTeam(p.role) === 'village' || p.role === 'tanner'
    )
    if (aliveVillagers.length === 0) {
      console.log('🏆 WIN: All villagers killed - Werewolves win!')
      const werewolfWinners = alivePlayers.filter(p => 
        this.getTeam(p.role) === 'werewolf'
      )
      this.endGame('werewolf', werewolfWinners.map(p => p.id))
      return true
    }
    
    console.log('🏆 No win condition met - game continues')
    return false
  }

  getTeam(roleId) {
    const roleInfo = getRoleInfo(roleId)
    return roleInfo?.team || 'village'
  }

  endGame(winnerTeam, winnerIds) {
    this.room.gameResult = {
      winnerTeam,
      winners: winnerIds,
      endedAt: Date.now()
    }
    
    // Устанавливаем фазу завершения игры
    this.room.gameState = GAME_PHASES.ENDED
    
    this.room.addSystemMessage(`🏆 Игра окончена! Победила команда: ${this.getTeamName(winnerTeam)}`, MESSAGE_TYPES.SYSTEM)
    
    // Раскрываем роли всех игроков
    this.revealAllRoles()
    
    // Обновляем состояние для всех игроков
    this.room.broadcast('game-updated', { room: this.room.getClientData() })
    
    // Останавливаем все таймеры
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
      this.phaseTimer = null
    }
    if (this.currentPhaseTimer) {
      clearTimeout(this.currentPhaseTimer)
      this.currentPhaseTimer = null
    }
  }

  revealAllRoles() {
    const allPlayers = Array.from(this.room.players.values()).filter(p => p.role !== 'game_master')
    
    if (allPlayers.length === 0) return
    
    const roleMessages = []
    
    allPlayers.forEach(player => {
      const roleInfo = getRoleInfo(player.role)
      const roleName = roleInfo?.name || player.role
      const statusIcon = player.alive ? '🟢' : '💀'
      roleMessages.push(`${statusIcon} ${player.name} - ${roleName}`)
    })
    
    this.room.addSystemMessage('🎭 Роли игроков:', MESSAGE_TYPES.SYSTEM)
    roleMessages.forEach(msg => {
      this.room.addSystemMessage(msg, MESSAGE_TYPES.SYSTEM)
    })
    
    // Показываем центральные карты, если они есть
    if (this.room.centerCards && this.room.centerCards.length > 0) {
      this.room.addSystemMessage('🃏 Центральные карты:', MESSAGE_TYPES.SYSTEM)
      this.room.centerCards.forEach((roleId, index) => {
        const roleInfo = getRoleInfo(roleId)
        const roleName = roleInfo?.name || roleId
        this.room.addSystemMessage(`Карта ${index + 1}: ${roleName}`, MESSAGE_TYPES.SYSTEM)
      })
    }
  }

  getTeamName(team) {
    const names = {
      village: 'Деревня',
      werewolf: 'Оборотни',
      tanner: 'Неудачник',
      cthulhu: 'Ктулху'
    }
    return names[team] || team
  }

  // Методы для ролей
  killPlayer(playerId) {
    if (!this.protectedPlayers.includes(playerId) && !this.killedPlayers.includes(playerId)) {
      this.killedPlayers.push(playerId)
    }
  }

  protectPlayer(playerId) {
    if (!this.protectedPlayers.includes(playerId)) {
      this.protectedPlayers.push(playerId)
    }
  }

  swapRoles(playerId1, playerId2) {
    const player1 = this.room.getPlayer(playerId1)
    const player2 = this.room.getPlayer(playerId2)
    
    if (player1 && player2) {
      const temp = player1.role
      player1.role = player2.role
      player2.role = temp
    }
  }

  swapWithCenter(playerId, centerIndex = 0) {
    const player = this.room.getPlayer(playerId)
    if (player && this.room.centerCards[centerIndex]) {
      const temp = player.role
      player.role = this.room.centerCards[centerIndex]
      this.room.centerCards[centerIndex] = temp
    }
  }

  extendPhase(minutes = 1) {
    if (!this.phaseTimer) {
      throw new Error('Нет активного таймера фазы')
    }
    
    const extensionMs = minutes * 60 * 1000
    const currentEndTime = this.phaseStartTime + (PHASE_DURATIONS[this.currentPhase] * 1000)
    const newEndTime = currentEndTime + extensionMs
    
    // Останавливаем текущий таймер
    clearTimeout(this.phaseTimer)
    
    // Вычисляем новое время до окончания фазы
    const remainingTime = newEndTime - Date.now()
    
    if (remainingTime > 0) {
      // Запускаем новый таймер
      this.phaseTimer = setTimeout(async () => {
        await this.nextPhase()
      }, remainingTime)
      
      console.log(`⏰ Phase ${this.currentPhase} extended by ${minutes} minute(s)`)
      
      // Уведомляем клиентов о новом времени окончания
      this.room.broadcast('phase-extended', {
        phase: this.currentPhase,
        extensionMinutes: minutes,
        newEndTime: newEndTime
      })
      
      return { 
        success: true, 
        message: `Фаза продлена на ${minutes} минут`,
        newEndTime: newEndTime
      }
    } else {
      throw new Error('Время фазы уже истекло')
    }
  }

  forceEndVoting() {
    if (this.room.gameState !== GAME_PHASES.VOTING || !this.room.votingActive) {
      throw new Error('Голосование не активно')
    }
    
    console.log('🔧 Force ending voting phase by admin')
    this.processVoting()
    
    // Проверяем условия победы и переходим к следующей фазе
    setTimeout(async () => {
      if (this.checkWinConditions()) {
        // Игра уже закончена в endGame(), ничего не делаем
        console.log('🏆 Game ended, no phase transition needed')
      } else {
        // Увеличиваем счетчик дней, пережитых игроками
        this.room.daysSurvived++
        console.log(`📅 Day ${this.room.daysSurvived} completed`)
        // Сразу обновляем статистику для клиентов
        this.room.broadcast('statistics-updated', { 
          civiliansKilled: this.room.civiliansKilled,
          daysSurvived: this.room.daysSurvived 
        })
        await this.setPhase(GAME_PHASES.NIGHT)
      }
    }, 2000)
    
    return { success: true, message: 'Голосование принудительно завершено' }
  }

  // Получить информацию о таймере для клиента
  getTimerInfo() {
    const phaseKey = this.currentPhase.toUpperCase()
    const duration = PHASE_DURATIONS[phaseKey]
    console.log('🔍 getTimerInfo - Phase:', this.currentPhase, 'PhaseKey:', phaseKey, 'Duration:', duration, 'Start time:', this.phaseStartTime)
    
    if (duration && this.phaseStartTime) {
      const endTime = this.phaseStartTime + (duration * 1000)
      const result = {
        active: true,
        duration: duration,
        endTime: endTime,
        phase: this.currentPhase
      }
      // console.log('✅ Returning timer info:', result)
      return result
    }
    
    console.log('❌ No timer info available')
    return null
  }

  destroy() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
    }
    if (this.currentPhaseTimer) {
      clearTimeout(this.currentPhaseTimer)
    }
  }
}