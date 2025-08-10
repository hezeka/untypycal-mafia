<template>
    <header class="main-header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <nuxt-link to="/" class="logo-link">
                        🐺 Нетипичная
                        <span>Мафия</span>
                    </nuxt-link>
                </div>

                <div class="header-actions">
                    <!-- Показываем информацию об игре если в игре -->
                    <div v-if="gameId" class="game-status">
                        <span class="game-id">Игра: {{ gameId }}</span>
                        <span class="phase-badge" :class="gamePhase">{{ phaseText }}</span>
                    </div>

                    <!-- Кнопки действий -->
                    <div class="action-buttons">
                        <button 
                            v-if="gameId" 
                            @click="leaveGame" 
                            class="btn-header btn-danger">
                            Покинуть игру
                        </button>
                        <button 
                            v-else 
                            @click="newGame" 
                            class="btn-header btn-primary">
                            🎮 Новая игра
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </header>
</template>

<script>
export default {
    computed: {
        gameId() {
            return this.$store.getters.gameId
        },
        
        gamePhase() {
            return this.$store.getters.gamePhase
        },
        
        phaseText() {
            const phases = {
                setup: '🎮 Подготовка',
                night: '🌙 Ночь',
                day: '☀️ День',
                voting: '🗳️ Голосование',
                ended: '🎯 Завершено'
            }
            return phases[this.gamePhase] || ''
        }
    },
    
    methods: {
        newGame() {
            // Очищаем локальное хранилище
            if (process.client) {
                localStorage.clear()
            }
            
            // Очищаем состояние через мутации
            this.$store.commit('clearGame')
            this.$store.commit('clearSelectedRoles')
            this.$store.commit('clearPlayers')
            
            // Переподключаем сокет
            if (this.$socket) {
                this.$socket.disconnect()
                this.$socket.connect()
            }
            
            // Перезагружаем страницу если не на главной
            if (this.$route.path !== '/') {
                this.$router.push('/')
            } else {
                this.$router.go(0)
            }
        },
        
        leaveGame() {
            if (confirm('Вы уверены, что хотите покинуть игру?')) {
                this.$store.commit('clearGame')
                
                if (this.$socket) {
                    this.$socket.disconnect()
                    this.$socket.connect()
                }
                
                this.$router.push('/')
            }
        }
    }
}
</script>

<style lang="less" scoped>
.main-header {
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(20, 20, 20, 0.9));
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: sticky;
    top: 0;
    z-index: 100;
    
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
    }
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 70px;
    
    @media (max-width: 768px) {
        height: 60px;
        flex-wrap: wrap;
        gap: 10px;
    }
}

.logo {
    .logo-link {
        display: flex;
        flex-direction: column;
        text-decoration: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 11px;
        line-height: 1.2;
        transition: all 0.3s ease;
        
        &:hover {
            color: rgba(255, 255, 255, 0.9);
            transform: scale(1.05);
        }
        
        span {
            font-weight: 800;
            font-size: 18px;
            text-transform: uppercase;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
    }
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 20px;
    
    @media (max-width: 768px) {
        gap: 10px;
        flex-wrap: wrap;
    }
}

.game-status {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .game-id {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        font-weight: 600;
    }
    
    .phase-badge {
        padding: 6px 12px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: 600;
        
        &.setup {
            background: rgba(108, 92, 231, 0.2);
            color: #6c5ce7;
            border: 1px solid rgba(108, 92, 231, 0.3);
        }
        
        &.night {
            background: rgba(45, 52, 54, 0.3);
            color: #ddd;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        &.day {
            background: rgba(255, 193, 7, 0.2);
            color: #ffc107;
            border: 1px solid rgba(255, 193, 7, 0.3);
        }
        
        &.voting {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
            border: 1px solid rgba(231, 76, 60, 0.3);
        }
        
        &.ended {
            background: rgba(0, 184, 148, 0.2);
            color: #00b894;
            border: 1px solid rgba(0, 184, 148, 0.3);
        }
    }
}

.action-buttons {
    display: flex;
    gap: 10px;
}

.btn-header {
    padding: 10px 20px;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    
    &:hover {
        transform: translateY(-2px);
    }
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    &:hover {
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
    }
}

.btn-danger {
    background: rgba(231, 76, 60, 0.2);
    color: #e74c3c;
    border: 1px solid rgba(231, 76, 60, 0.3);
    
    &:hover {
        background: rgba(231, 76, 60, 0.3);
        box-shadow: 0 8px 20px rgba(231, 76, 60, 0.2);
    }
}

/* Анимации */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.game-status {
    animation: fadeIn 0.5s ease-out;
}

.phase-badge {
    animation: fadeIn 0.3s ease-out;
}

/* Адаптивность */
@media (max-width: 576px) {
    .header-content {
        flex-direction: column;
        height: auto;
        padding: 10px 0;
    }
    
    .logo .logo-link span {
        font-size: 16px;
    }
    
    .game-status {
        order: 2;
        flex-direction: column;
        gap: 8px;
        text-align: center;
    }
    
    .action-buttons {
        order: 3;
    }
    
    .btn-header {
        padding: 8px 16px;
        font-size: 11px;
    }
}
</style>