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
    console.log('🎮 Starting game and assigning roles...')
    this.assignRoles()
    
    // Немедленно уведомляем игроков об их ролях после назначения
    this.broadcastRoleAssignments()
    
    // Сразу переходим к фазе знакомства - роли уже розданы
    await this.setPhase(GAME_PHASES.INTRODUCTION)
    
    // НОВОЕ: Синхронизируем статус игроков ПОСЛЕ смены фазы (чтобы роли были видны)
    this.room.syncPlayersStatus()
    
    console.log('✅ Game started successfully, roles assigned')
  }

  assignRoles() {
    // Получаем ведущего
    const host = this.room.getHost()
    
    // Если ведущий есть и у него роль game_master, значит он в режиме наблюдателя
    // Если у ведущего НЕТ роли game_master, значит он в режиме игрока
    const isHostObserver = host && host.role === 'game_master'
    
    // Включаем всех игроков, кроме ведущего-наблюдателя
    const players = Array.from(this.room.players.values()).filter(p => {
      if (isHostObserver) {
        return p.role !== 'game_master' // Исключаем ведущего-наблюдателя
      } else {
        return true // Включаем всех, включая ведущего-игрока
      }
    })
    
    console.log(`🎭 Host mode: ${isHostObserver ? 'Observer' : 'Player'}, distributing roles to ${players.length} players`)
    
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

  broadcastRoleAssignments() {
    console.log('📤 Broadcasting role assignments to players...')
    const players = Array.from(this.room.players.values()).filter(p => p.role !== 'game_master')
    
    players.forEach(player => {
      if (player.role && player.role !== 'observer') {
        // Отправляем каждому игроку его роль немедленно
        this.room.sendToPlayer(player.id, 'role-assigned', {
          playerId: player.id,
          role: player.role
        })
        console.log(`✅ Sent role ${player.role} to ${player.name} (${player.id})`)
      }
    })
    
    // ВАЖНО: Отправляем game-updated с причиной roles-assigned для синхронизации всех клиентов
    this.room.broadcast('game-updated', {
      reason: 'roles-assigned',
      room: this.room.getClientData(null) // null означает обновление для всех
    })
    
    console.log('✅ Broadcasted roles-assigned game-updated event')
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
    const oldPhase = this.currentPhase
    this.currentPhase = newPhase
    this.room.gameState = newPhase
    this.phaseStartTime = Date.now()
    
    // Очищаем голоса за пропуск фазы при каждой смене фазы
    this.room.clearPhaseSkipVotes()
    
    const phaseKey = newPhase.toUpperCase()
    const duration = PHASE_DURATIONS[phaseKey]
    const endTime = duration ? this.phaseStartTime + (duration * 1000) : null
    
    console.log('🔄 Setting phase:', newPhase, 'PhaseKey:', phaseKey, 'Duration:', duration, 'End time:', endTime ? new Date(endTime) : null)
    
    // Логируем смену фазы в историю
    if (oldPhase && oldPhase !== newPhase) {
      this.room.gameHistory.changePhase(newPhase, oldPhase)
    }
    
    // Обновляем права чата
    this.updateChatPermissions()
    
    // Запускаем таймер
    this.startPhaseTimer()
    
    // Специальная логика для фаз
    switch (newPhase) {
      case GAME_PHASES.NIGHT:
        // Сбрасываем флаги ночных действий Ктулху для новой ночи
        this.room.players.forEach(player => {
          if (player.role === 'cthulhu') {
            player.cthulhuOrderUsedTonight = false
          }
        })
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
    
    // Не отправляем game-updated для каждой смены фазы - phase-changed достаточно
    // Состояние будет синхронизовано через HTTP API при необходимости
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
    this.blockedPlayers = new Set() // Очищаем заблокированных игроков
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
      
      // Определяем время для роли (60 секунд для Ктулху, 30 для остальных)
      const timeLimit = currentRole.id === 'cthulhu' ? 60 : 30
      const timeoutMs = timeLimit * 1000
      
      // Обновляем таймер для клиента
      this.phaseStartTime = Date.now()
      const endTime = this.phaseStartTime + timeoutMs
      
      // Уведомляем игроков об их ходе
      players.forEach(player => {
        this.room.sendToPlayer(player.id, 'night-action-turn', {
          role: currentRole.id,
          timeLimit: timeLimit
        })
      })
      
      // Обновляем таймер для всех клиентов (используем отдельный event для ночных действий)
      this.room.broadcast('night-action-timer', {
        role: currentRole.id,
        timeLimit: timeLimit,
        endTime: endTime
      })
      
      // Устанавливаем таймер
      this.currentPhaseTimer = setTimeout(() => {
        console.log(`Night action timeout for role ${currentRole.id}`)
        this.nextNightAction()
      }, timeoutMs)
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
    
    // НОВОЕ: Синхронизируем статус при переходе к следующему ночному действию
    // Это важно если предыдущая роль изменила роли - порядок ходов может измениться
    this.room.syncPlayersStatus()
    
    this.processNextNightAction()
  }
  
  // Проверяем, все ли игроки текущей роли выполнили действие
  checkAllPlayersCompleted() {
    if (this.nightActionIndex >= this.nightRoles.length) return
    
    const currentRole = this.nightRoles[this.nightActionIndex]
    const players = this.getPlayersWithRole(currentRole.id)
    
    // Проверяем сколько игроков с текущей ролью завершили действие
    const completedPlayersWithCurrentRole = players.filter(p => this.completedActions.has(p.id)).length
    
    // Если все игроки с текущей ролью выполнили действие
    if (players.length > 0 && completedPlayersWithCurrentRole >= players.length) {
      console.log(`✅ All players with role ${currentRole.id} completed their actions (${completedPlayersWithCurrentRole}/${players.length})`)
      this.nextNightAction()
    }
  }

  getPlayersWithRole(roleId) {
    return Array.from(this.room.players.values())
      .filter(p => p.role === roleId && p.alive)
  }

  async _executeNightActionInternal(playerId, action) {
    const player = this.room.getPlayer(playerId)
    if (!player || !player.alive) return { error: 'Игрок не найден' }

    const currentRole = this.nightRoles[this.nightActionIndex]
    if (!currentRole || player.role !== currentRole.id) {
      return { error: 'Сейчас не ваш ход' }
    }

    // Проверяем, не выполнял ли уже этот игрок действие (включая Доппельгангеров после смены роли)
    if (this.completedActions.has(playerId)) {
      console.log(`🚫 Player ${player.name} (${player.role}) already completed action, preventing duplicate`)
      return { error: 'Вы уже выполнили своё действие' }
    }

    // Особая обработка для Ктулху (как в старом коде)
    if (player.role === 'cthulhu') {
      const { targetId } = action
      if (!targetId) {
        return { error: 'Напишите в чат /приказ имя_игрока ваш_приказ.' }
      }

      const target = this.room.getPlayer(targetId)
      if (!target || target.id === player.id || target.role === 'game_master') {
        return { error: 'Недопустимая цель' }
      }

      // Проверяем что команда еще не использовалась в эту ночь
      if (player.cthulhuOrderUsedTonight) {
        return { error: 'Вы уже дали приказ в эту ночь' }
      }

      // Автоматически заполняем чат командой приказа
      const chatCommand = `/приказ ${target.name} `

      // Отправляем событие для заполнения чата
      this.room.sendToPlayer(player.id, 'auto-fill-chat', {
        command: chatCommand
      })

      return {
        success: true,
        message: `Цель выбрана. Напишите в чат /приказ ${target.name} ваш_приказ.`,
        actionNotComplete: true, // Сообщаем клиенту что действие не завершено
        data: {
          targetId: target.id,
          targetName: target.name,
          autoFilled: true,
          actionNotComplete: true
        }
      }
    }

    try {
      const result = await executeRoleAction(this, player, action)
      
      // Если действие успешно (включая заблокированные с auto-skip), отмечаем игрока как выполнившего действие
      if (result && !result.error) {
        // Заблокированные действия уже помечаются как выполненные в executeRoleAction
        if (!result.data?.blocked && !result.data?.actionNotComplete) {
          this.completedActions.add(playerId)
          console.log(`✅ Player ${player.name} (${player.role}) completed action`)
          
          // Специальная обработка для Доппельгангера - меняем роль ПОСЛЕ завершения действия
          if (result.data?.changeRoleAfterAction && result.data?.newRole) {
            player.role = result.data.newRole
            console.log(`🔄 Doppelganger ${player.name} role changed from ${result.data.oldRole} to ${result.data.newRole}`)
            // Синхронизируем статус после смены роли
            this.room.syncPlayersStatus()
          }
          
          // Уведомляем игрока что его ход завершен (скрывает кнопки)
          this.room.sendToPlayer(playerId, 'night-turn-ended', {
            playerId: playerId
          })
          
          // Специальная обработка для Доппельгангера - сразу переходим к следующей роли
          if (result.data?.changeRoleAfterAction) {
            console.log(`⏭️ Doppelganger completed, forcing next night action`)
            this.nextNightAction()
          } else {
            // Для остальных ролей проверяем, все ли игроки завершили действие
            this.checkAllPlayersCompleted()
          }
        } else if (result.data?.actionNotComplete) {
          console.log(`⏳ Player ${player.name} (${player.role}) action partially completed, waiting for full completion`)
        }
        // Для заблокированных действий логика выполнения уже обработана в executeRoleAction
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

    // Отправляем сообщения заблокированным игрокам без ночных способностей
    this.sendBlockedMessagesToInactivePlayers()

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
          this.room.announcePlayerDeath(player, 'night')
          console.log(`💀 ${player.name} killed during night`)
        }
      })
      
      // НОВОЕ: Синхронизируем статус после убийства игроков ночью
      this.room.syncPlayersStatus()
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
    
    // Отправляем только уведомление о завершении ночи, без полных данных комнаты
    this.room.broadcast('night-results-announced', { 
      killedPlayers: this.killedPlayers,
      attackedPlayers: this.attackedPlayers 
    })
    
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

  // Отправка сообщений заблокированным игрокам без ночных способностей
  sendBlockedMessagesToInactivePlayers() {
    if (!this.blockedPlayers || this.blockedPlayers.size === 0) return

    this.blockedPlayers.forEach(playerId => {
      const player = this.room.getPlayer(playerId)
      if (!player) return

      // Проверяем, есть ли у игрока ночная способность
      const roleInfo = this.room.getRoleInfo(player.role)
      const hasNightAction = roleInfo && roleInfo.hasNightAction

      // Если у игрока НЕТ ночной способности, отправляем ему сообщение о блокировке
      if (!hasNightAction) {
        this.room.addSystemWhisper(
          'Ночью вас обольстила путана, но у вас не было ночной способности',
          playerId
        )
        console.log(`🚫 Sent blocking message to ${player.name} (${player.role}) - no night action`)
      }
    })
  }
  
  processWerewolfVotes() {
    console.log('🐺 Processing werewolf votes. Current votes:', this.werewolfVotes ? Array.from(this.werewolfVotes.entries()) : 'undefined')
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
          
          // Уведомляем о смерти с раскрытием роли
          this.room.announcePlayerDeath(player, 'voting')
          
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
      
      // НОВОЕ: Синхронизируем статус после исключения игроков голосованием
      this.room.syncPlayersStatus()
    } else {
      this.room.addSystemMessage('Никто не был исключен', MESSAGE_TYPES.SYSTEM)
    }
    
    // Обрабатываем месть охотников
    this.processHunterRetaliation(huntersKilled, result)
    
    // Обрабатываем выживание Ктулху
    this.processCthulhuSurvival(result)
    
    // Показываем результаты голосования
    this.room.broadcast('voting-ended', result)
    
    // Отправляем только результат голосования без полного состояния комнаты
    // Клиенты обновят состояние через phase-changed и другие целевые события
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
          
          // Уведомляем о смерти от охотника с раскрытием роли
          this.room.announcePlayerDeath(target, 'hunter')
          
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
        this.getTeam(p.role) === 'village' || p.role === 'minion'
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
    
    // Логируем конец игры в историю
    this.room.gameHistory.endGame(this.room.gameResult)
    
    // Устанавливаем фазу завершения игры
    this.room.gameState = GAME_PHASES.ENDED
    
    this.room.addSystemMessage(`🏆 Игра окончена! Победила команда: ${this.getTeamName(winnerTeam)}`, MESSAGE_TYPES.SYSTEM)
    
    // Раскрываем роли всех игроков
    this.revealAllRoles()
    
    // НОВОЕ: Синхронизируем статус игроков после завершения игры (все роли видны)
    this.room.syncPlayersStatus()
    
    // Отправляем специальное событие окончания игры вместо game-updated
    this.room.broadcast('game-ended', {
      result: this.room.gameResult,
      phase: GAME_PHASES.ENDED
    })
    
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

  // Публичный метод выполнения ночного действия (с логированием)
  async executeNightAction(socketId, action) {
    // Сначала выполняем настоящее ночное действие
    const result = await this._executeNightActionInternal(socketId, action)

    // Если действие выполнено успешно, логируем его
    if (result && result.success) {
      try {
        const player = this.room.getPlayer(socketId)
        const eventType = this.getNightActionEventType(player.role)
        const target = action.targetId ? this.room.getPlayer(action.targetId) : null

        if (eventType && player) {
          this.room.gameHistory.logNightAction(eventType, player, target, {
            success: true,
            action: action,
            result: result.data
          })
        }
      } catch (error) {
        console.error('Night action logging error:', error)
        // Логирование не должно влиять на результат действия
      }
    }

    return result
  }

  // Получить тип события для роли
  getNightActionEventType(roleId) {
    const eventTypes = {
      'cthulhu': 'night_cthulhu_order',
      'seer': 'night_investigate',
      'bodyguard': 'night_protect',
      'werewolf': 'night_kill',
      'mystic_wolf': 'night_investigate',
      'robber': 'night_convert',
      'troublemaker': 'night_block',
      'hunter': 'night_hunter_mark'
    }
    return eventTypes[roleId] || null
  }

  // Проверить завершили ли все игроки текущей роли действия
  checkAllPlayersCompleted() {
    if (!this.nightRoles || this.nightActionIndex >= this.nightRoles.length) {
      return
    }

    const currentRole = this.nightRoles[this.nightActionIndex]
    if (!currentRole) return

    // Получаем всех игроков с текущей ролью
    const playersWithRole = Array.from(this.room.players.values()).filter(p => 
      p.role === currentRole.id && p.role !== 'game_master'
    )

    // Проверяем завершили ли все свои действия
    const allCompleted = playersWithRole.every(player => 
      this.completedActions && this.completedActions.has(player.id)
    )

    console.log(`🔍 Checking completion for role ${currentRole.id}:`, {
      playersWithRole: playersWithRole.map(p => p.name),
      completed: this.completedActions ? Array.from(this.completedActions) : [],
      allCompleted
    })

    // Если все завершили - переходим к следующей роли
    if (allCompleted && playersWithRole.length > 0) {
      console.log(`✅ All players with role ${currentRole.id} completed actions, moving to next role`)
      this.nextNightAction()
    }
  }


  // Методы для ролей
  killPlayer(playerId) {
    if (!this.protectedPlayers.includes(playerId) && !this.killedPlayers.includes(playerId)) {
      this.killedPlayers.push(playerId)
      
      // Логируем убийство в историю
      const target = this.room.getPlayer(playerId)
      if (target) {
        this.room.gameHistory.logNightAction('night_kill', null, target, {
          protected: false,
          success: true
        })
      }
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
      
      console.log(`🔄 Swapped roles: ${player1.name} (${temp}) ↔ ${player2.name} (${player1.role})`)
      
      // НОВОЕ: Синхронизируем статус после обмена ролями
      this.room.syncPlayersStatus()
    }
  }

  swapWithCenter(playerId, centerIndex = 0) {
    const player = this.room.getPlayer(playerId)
    if (player && this.room.centerCards[centerIndex]) {
      const temp = player.role
      player.role = this.room.centerCards[centerIndex]
      this.room.centerCards[centerIndex] = temp
      
      console.log(`🔄 Swapped ${player.name} role (${temp}) with center card (${player.role})`)
      
      // НОВОЕ: Синхронизируем статус после обмена с центром
      this.room.syncPlayersStatus()
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

  // Получить прогресс ночных действий
  getNightProgress() {
    if (this.currentPhase !== GAME_PHASES.NIGHT || !this.nightRoles || this.nightRoles.length === 0) {
      return {
        currentRole: null,
        completedRoles: [],
        allRoles: [],
        progress: 0
      }
    }

    const allRoles = this.nightRoles.map((roleData, index) => {
      const roleInfo = getRoleInfo(roleData.id)
      return {
        id: roleData.id,
        name: roleInfo?.name || roleData.id,
        order: roleData.order,
        completed: index < this.nightActionIndex,
        active: index === this.nightActionIndex
      }
    })

    const currentRole = this.nightActionIndex < this.nightRoles.length ? 
      this.nightRoles[this.nightActionIndex] : null

    const currentRoleInfo = currentRole ? {
      id: currentRole.id,
      name: getRoleInfo(currentRole.id)?.name || currentRole.id,
      order: currentRole.order
    } : null

    const completedRoles = allRoles.filter(role => role.completed).map(role => ({
      id: role.id,
      name: role.name,
      order: role.order
    }))

    const progress = this.nightRoles.length > 0 ? 
      (this.nightActionIndex / this.nightRoles.length) * 100 : 0

    return {
      currentRole: currentRoleInfo,
      completedRoles,
      allRoles,
      progress: Math.round(progress)
    }
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