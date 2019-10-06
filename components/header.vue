<template>
    <header>
        <div class="container">
            <div class="header-box">
                <div class="logo">
                    Нетипичная
                    <span>Мафия</span>
                </div>

                <button class="mini-button" @click="newGame()">Новая игра</button>
            </div>
        </div>
    </header>
</template>

<script>
export default {
    methods: {
        newGame() {
            localStorage.clear()
            this.$store.commit('push')
            location.reload()
        }
    }
}
</script>

<style lang="less">
.header-box {
    border-bottom: 1px solid rgba(255, 255, 255, 0.027);
    height: 70px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-sizing: border-box;
    
    .logo {
        font-size: 11px;
        opacity: .3;
        
        span {
            display: block;
            font-weight: 700;
            font-size: 18px;
            opacity: .3;
        }
    }
}

.mini-button {
    border: none;
    outline: none;
    box-shadow: none;
    background-color: rgba(126, 208, 255, 0.103);
    min-width: 40px;
    height: 40px;
    border-radius: 50px;
    padding: 0 20px 0 45px;
    background-image: url('/images/start.svg');
    background-size: 17px;
    background-repeat: no-repeat;
    background-position: 15px 12px;
    opacity: .4;
    cursor: pointer;
    transition: .2s;
    color: rgb(140, 186, 255);
    white-space: nowrap;
    font-size: 12px;

    &:hover {
        opacity: .6;
    }
}
</style>