import { v4 as uuidv4 } from 'uuid'

export class GameRoom {
  constructor(id, hostId, roles) {
    this.id = id
    this.hostId = hostId
    this.players = new Map()
    this.selectedRoles = []
    this.gameState = 'setup' // setup, night, day, voting, ended
    this.currentPhase = null
    this.timer = null // Timer in seconds
    this.gameData = {
      centerCards: [],
      artifacts: [],
      shields: []
    }
    this.chat = []
    this.votes = new Map() // Хранение голосов: voterId -> targetId (null = воздержался)
    this.roles = roles // Ссылка на объект ролей
  }

  addPlayer(socketId, name) {
    const player = {
      id: socketId,
      name: name,
      role: null,
      alive: true,
      protected: false,
      artifact: null,
      votes: 0,
      connected: true
    }
    
    // If this is the host, assign game_master role
    if (socketId === this.hostId) {
      player.role = 'game_master'
    }
    
    this.players.set(socketId, player)
  }

  removePlayer(socketId) {
    this.players.delete(socketId)
    this.votes.delete(socketId) // Удаляем голос при отключении
  }

  isHost(socketId) {
    return this.hostId === socketId
  }

  // БЕЗОПАСНАЯ версия getGameData - скрывает роли от обычных игроков
  getGameData(requestingSocketId = null) {
    const isHostRequesting = this.isHost(requestingSocketId)
    const gameEnded = this.gameState === 'ended'
    
    // Базовые данные игры
    const baseData = {
      id: this.id,
      hostId: this.hostId,
      selectedRoles: this.selectedRoles,
      gameState: this.gameState,
      currentPhase: this.currentPhase,
      timer: this.timer,
      gameData: this.gameData,
      chat: this.chat
    }
    
    // Безопасная версия игроков - ИСКЛЮЧАЕМ ВЕДУЩЕГО ИЗ СПИСКА для обычных игроков
    const allPlayers = Array.from(this.players.values())
    let playersToShow = allPlayers
    
    // Если запрос НЕ от ведущего, исключаем ведущего из списка
    if (!isHostRequesting) {
      playersToShow = allPlayers.filter(player => player.role !== 'game_master')
    }
    
    const safePlayers = playersToShow.map(player => {
      const requestingPlayer = this.players.get(requestingSocketId)
      
      // Показываем роль если:
      // 1. Это ведущий
      // 2. Игра закончена
      // 3. Это сам игрок
      // 4. Это оборотень и показываем роли других оборотней
      let shouldShowRole = false
      
      if (isHostRequesting || gameEnded) {
        shouldShowRole = true
      } else if (requestingSocketId === player.id) {
        shouldShowRole = true
      } else if (requestingPlayer && this.canSeeWerewolfRoles(requestingPlayer.role)) {
        shouldShowRole = this.isWerewolfRole(player.role)
      }
      
      return {
        id: player.id,
        name: player.name,
        role: shouldShowRole ? player.role : null,
        alive: player.alive,
        protected: player.protected,
        artifact: player.artifact,
        votes: player.votes,
        connected: player.connected
      }
    })
    
    // Добавляем информацию о голосовании
    const votingData = {
      total: this.getEligibleVoters().length,
      submitted: this.votes.size,
      hasVoted: this.votes.has(requestingSocketId),
      votedFor: this.votes.get(requestingSocketId) || null
    }
    
    return {
      ...baseData,
      players: safePlayers,
      voting: votingData
    }
  }

  // Получить игроков, которые могут голосовать (живые, не ведущий)
  getEligibleVoters() {
    return Array.from(this.players.values()).filter(p => 
      p.role !== 'game_master' && p.alive && p.connected
    )
  }

  // Получить игроков, за которых можно голосовать (живые, не ведущий)
  getEligibleTargets() {
    return Array.from(this.players.values()).filter(p => 
      p.role !== 'game_master' && p.alive
    )
  }

  // Проверяет, может ли роль видеть роли оборотней
  canSeeWerewolfRoles(role) {
    return role && (
      role.includes('wolf') || 
      role === 'werewolf' || 
      role === 'minion' ||
      role === 'game_master'
    )
  }

  // Проверяет, является ли роль ролью оборотня
  isWerewolfRole(role) {
    return role && (
      role.includes('wolf') || 
      role === 'werewolf' || 
      role === 'minion'
    )
  }

  addChatMessage(playerId, message, type = 'player') {
    const player = playerId ? this.players.get(playerId) : null
    this.chat.push({
      id: uuidv4(),
      playerId: playerId,
      playerName: player ? player.name : (type === 'system' ? 'Система' : 'Ведущий'),
      message,
      type,
      timestamp: Date.now()
    })
  }

  distributeRoles() {
    const allPlayers = Array.from(this.players.values())
    const nonHostPlayers = allPlayers.filter(player => player.id !== this.hostId)
    const shuffledRoles = [...this.selectedRoles].sort(() => Math.random() - 0.5)
    
    console.log(`Distributing roles to ${nonHostPlayers.length} players (excluding host)`)
    console.log(`Available roles:`, shuffledRoles)
    
    // Distribute roles only to non-host players
    nonHostPlayers.forEach((player, index) => {
      if (index < shuffledRoles.length) {
        player.role = shuffledRoles[index]
        console.log(`Player ${player.name} got role: ${player.role}`)
      }
    })

    // Put remaining cards in center
    this.gameData.centerCards = shuffledRoles.slice(nonHostPlayers.length)
    console.log(`Center cards:`, this.gameData.centerCards)
    
    // Ensure host has the game_master role
    const hostPlayer = this.players.get(this.hostId)
    if (hostPlayer) {
      hostPlayer.role = 'game_master'
      console.log(`Host ${hostPlayer.name} has role: game_master`)
    }
  }

  // Методы для работы с группами
  getWerewolfPlayers() {
    return Array.from(this.players.values()).filter(p => 
      this.isWerewolfRole(p.role) && p.connected
    )
  }

  getVillagerPlayers() {
    return Array.from(this.players.values()).filter(p => 
      !this.isWerewolfRole(p.role) && 
      p.role !== 'tanner' && 
      p.role !== 'game_master' && 
      p.connected
    )
  }

  getAllPlayers() {
    return Array.from(this.players.values()).filter(p => 
      p.role !== 'game_master' && p.connected
    )
  }

  canPlayerMessageGroup(player, groupName) {
    const normalizedGroup = groupName.toLowerCase()
    
    switch (normalizedGroup) {
      case 'оборотни':
      case 'волки':
      case 'wolves':
      case 'werewolves':
        return this.canSeeWerewolfRoles(player.role) || this.isHost(player.id)
      
      case 'деревня':
      case 'жители':
      case 'village':
      case 'villagers':
        return !this.isWerewolfRole(player.role) || this.isHost(player.id)
      
      case 'все':
      case 'all':
      case 'everyone':
        return this.isHost(player.id)
      
      default:
        return false
    }
  }

  getGroupMembers(groupName) {
    const normalizedGroup = groupName.toLowerCase()
    
    switch (normalizedGroup) {
      case 'оборотни':
      case 'волки':
      case 'wolves':
      case 'werewolves':
        return this.getWerewolfPlayers()
      
      case 'деревня':
      case 'жители':
      case 'village':
      case 'villagers':
        return this.getVillagerPlayers()
      
      case 'все':
      case 'all':
      case 'everyone':
        return this.getAllPlayers()
      
      default:
        return []
    }
  }

  getGroupDisplayName(groupName) {
    const normalizedGroup = groupName.toLowerCase()
    
    const names = {
      'оборотни': 'Оборотни',
      'волки': 'Оборотни',
      'wolves': 'Оборотни',
      'werewolves': 'Оборотни',
      'деревня': 'Деревня',
      'жители': 'Деревня',
      'village': 'Деревня',
      'villagers': 'Деревня',
      'все': 'Все игроки',
      'all': 'Все игроки',
      'everyone': 'Все игроки'
    }
    return names[normalizedGroup] || groupName
  }

  // Подсчет голосов и определение результата
  processVoting() {
    // Сбрасываем счетчики голосов
    this.players.forEach(player => {
      player.votes = 0
    })

    // Подсчитываем голоса
    const voteCounts = new Map()
    let abstainCount = 0

    this.votes.forEach((targetId, voterId) => {
      if (targetId === null) {
        abstainCount++
      } else {
        const currentCount = voteCounts.get(targetId) || 0
        voteCounts.set(targetId, currentCount + 1)
      }
    })

    // Обновляем счетчики на игроках для отображения
    voteCounts.forEach((count, playerId) => {
      const player = this.players.get(playerId)
      if (player) {
        player.votes = count
      }
    })

    const totalVoters = this.getEligibleVoters().length
    const majority = Math.ceil(totalVoters / 2)

    console.log(`Voting results:`)
    console.log(`Total voters: ${totalVoters}, Majority needed: ${majority}`)
    console.log(`Abstain count: ${abstainCount}`)
    console.log(`Vote counts:`, Array.from(voteCounts.entries()))

    // Формируем сообщение о результатах голосования в чат
    let votingMessage = `🗳️ **Результаты голосования:**\n`
    
    if (voteCounts.size === 0 && abstainCount === totalVoters) {
      votingMessage += `Все игроки воздержались от голосования.`
    } else {
      const voteResults = []
      voteCounts.forEach((count, playerId) => {
        const player = this.players.get(playerId)
        if (player && count > 0) {
          voteResults.push(`${player.name}: ${count} голос${count === 1 ? '' : count < 5 ? 'а' : 'ов'}`)
        }
      })
      
      if (voteResults.length > 0) {
        votingMessage += voteResults.join(', ')
      }
      
      if (abstainCount > 0) {
        votingMessage += `${voteResults.length > 0 ? ', ' : ''}Воздержались: ${abstainCount}`
      }
    }

    // Находим максимальное количество голосов
    let maxVotes = 0
    let playersWithMaxVotes = []

    for (const [playerId, voteCount] of voteCounts) {
      if (voteCount > maxVotes) {
        maxVotes = voteCount
        playersWithMaxVotes = [playerId]
      } else if (voteCount === maxVotes && voteCount > 0) {
        playersWithMaxVotes.push(playerId)
      }
    }

    console.log(`Max votes: ${maxVotes}, Players with max votes: ${playersWithMaxVotes.length}`)

    let resultMessage = ""
    let eliminated = []

    if (maxVotes >= majority && playersWithMaxVotes.length === 1) {
      const eliminatedPlayer = this.players.get(playersWithMaxVotes[0])
      console.log(`${eliminatedPlayer.name} eliminated with ${maxVotes} votes`)
      eliminatedPlayer.alive = false
      eliminated = [eliminatedPlayer.id]
      resultMessage = `${eliminatedPlayer.name} получил большинство голосов и был убит.`
    } else if (maxVotes < majority) {
      console.log('No one eliminated - majority not reached')
      resultMessage = totalVoters === 0 ? 'Никто не голосовал.' : `Большинство не достигнуто. Никто не убит.`
    } else {
      const tiedPlayerNames = playersWithMaxVotes.map(id => this.players.get(id)?.name).join(', ')
      console.log(`Tie detected - ${playersWithMaxVotes.length} players with ${maxVotes} votes each`)
      resultMessage = `Ничья между ${tiedPlayerNames}. Никто не убит.`
    }

    // Добавляем результат в чат
    this.addChatMessage(null, `${votingMessage}\n\n${resultMessage}`, 'system')

    return {
      eliminated,
      reason: resultMessage,
      votingDetails: votingMessage
    }
  }

  // Проверка условий победы
  checkWinConditions() {
    const alivePlayers = Array.from(this.players.values()).filter(p => 
      p.alive && p.role !== 'game_master'
    )
    
    const aliveWerewolves = alivePlayers.filter(p => this.isWerewolfRole(p.role))
    const aliveVillagers = alivePlayers.filter(p => !this.isWerewolfRole(p.role) && p.role !== 'tanner')
    const aliveTanner = alivePlayers.find(p => p.role === 'tanner')
    
    // Проверяем, был ли убит неудачник
    const deadPlayers = Array.from(this.players.values()).filter(p => 
      !p.alive && p.role !== 'game_master'
    )
    const killedTanner = deadPlayers.find(p => p.role === 'tanner')
    
    console.log(`Win check: ${aliveWerewolves.length} werewolves, ${aliveVillagers.length} villagers alive`)
    console.log(`Killed tanner: ${!!killedTanner}, Alive tanner: ${!!aliveTanner}`)
    console.log(`Alive werewolves:`, aliveWerewolves.map(p => `${p.name} (${p.role})`))
    console.log(`Alive villagers:`, aliveVillagers.map(p => `${p.name} (${p.role})`))

    // 1. НЕУДАЧНИК ПОБЕЖДАЕТ - если его убили голосованием
    if (killedTanner) {
      return {
        winner: 'tanner',
        message: `🎯 Неудачник (${killedTanner.name}) победил! Он был убит и достиг своей цели.`,
        gameEnded: true
      }
    }
    
    // 2. ОБОРОТНИ ПОБЕЖДАЮТ - если все жители мертвы (кроме неудачника)
    if (aliveVillagers.length === 0 && aliveWerewolves.length > 0) {
      return {
        winner: 'werewolves',
        message: `🐺 Оборотни победили! Все жители убиты.`,
        gameEnded: true
      }
    }
    
    // 3. ДЕРЕВНЯ ПОБЕЖДАЕТ - если убит хотя бы один оборотень
    const deadWerewolves = deadPlayers.filter(p => this.isWerewolfRole(p.role))
    if (deadWerewolves.length > 0) {
      return {
        winner: 'village',
        message: `🏘️ Деревня победила! Убит оборотень: ${deadWerewolves.map(p => p.name).join(', ')}.`,
        gameEnded: true
      }
    }
    
    // 4. ОБОРОТНИ ПОБЕЖДАЮТ - если ни одного оборотня не убили
    if (deadWerewolves.length === 0 && aliveWerewolves.length > 0) {
      return {
        winner: 'werewolves',
        message: `🐺 Оборотни победили! Ни один оборотень не был убит.`,
        gameEnded: true
      }
    }
    
    // 5. ДЕРЕВНЯ ПОБЕЖДАЕТ - если нет живых оборотней вообще
    if (aliveWerewolves.length === 0) {
      return {
        winner: 'village',
        message: `🏘️ Деревня победила! Все оборотни мертвы.`,
        gameEnded: true
      }
    }

    // Игра продолжается (редкий случай)
    return {
      winner: null,
      message: `Игра продолжается. Живы: ${aliveWerewolves.length} оборотней, ${aliveVillagers.length} жителей.`,
      gameEnded: false
    }
  }

  // Сброс голосования
  resetVoting() {
    this.votes.clear()
    this.players.forEach(player => {
      player.votes = 0
    })
  }

  // Безопасное логирование игроков (без ролей)
  logPlayersSecurely() {
    const players = Array.from(this.players.values())
    return players.map(p => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      hasRole: !!p.role
    }))
  }
}