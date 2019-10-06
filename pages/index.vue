<template>
  <div class="container">
    <div class="template-grid">
      <div class="roles-section">
        <role-card
          v-for="(role, id) in roles"
          :key="id"
          :role="role"
          :id="id" />
      </div>
      <div class="users-section">
        <section>
          <div class="caption">
            Добавить игроков:
            <span class="players-counter">
              ({{players.length}})
            </span>
          </div>
          <form @submit.prevent="addPlayer">
            <input placeholder="Ник игрока" class="wide-input" type="text" v-model="newPlayer">
          </form>
          <div class="users">
            <div class="user-card"
              v-for="(player, index) in players"
              :key="index"
              @click="deletePlayer(index)">
              <div class="user-name">
                {{player.name}}
              </div>
            </div>
          </div>
        </section>
        <section>
          <n-link to="{query: {modal: 'game'}}">
            Начать игру
          </n-link>
        </section>
      </div>
      <section id="roles">
        <div class="roles-caption">
          Выбрано {{selectedRoles.length}} ролей из {{players.length}}
        </div>
        <div class="selected-roles">
          <div class="role-item"
            v-for="(role, id) in selectedRoles"
            :key="id"
            :class="[roles[role].color, roles[role].active ? 'active' : '']" >
            {{roles[role].name}}
            <button class="cross" title="Удалить роль" @click="removeRole(id)"></button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import RoleCard from '~/components/role-card.vue'

export default {
  data() {
    return {
      newPlayer: ''
    }
  },
  components: {
    RoleCard
  },
  computed: {
    roles() {
      return this.$store.getters.roles
    },
    selectedRoles() {
      return this.$store.getters.selectedRoles
    },
    players() {
      return this.$store.getters.players
    }
  },
  methods: {
    removeRole(id) {
      this.$store.commit('removeRole', id)
    },
    addPlayer() {
      this.$store.commit('addPlayer', this.newPlayer)
      this.newPlayer = ''
    },
    deletePlayer(index) {
      this.$store.commit('deletePlayer', index)
    }
  },
  mounted() {
    const players = localStorage.getItem('players')
    const roles = localStorage.getItem('roles')
    this.$store.commit('push', {players, roles})
  }
}
</script>

<style lang="less">
.container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 10px;
  box-sizing: border-box;
}
.roles-section {
  font-size: 0;
  background-color: #000;
  margin: 0 -10px;
}
.role-item {
  display: inline-block;
  border: 1px solid rgba(255, 255, 255, 0.034);
  padding: 8px 25px 8px 12px;
  border-radius: 4px;
  margin: 5px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.541);
  position: relative;
  user-select: none;

  .cross {
    position: absolute;
    display: inline-block;
    top: 0;
    right: 0;
    height: 100%;
    width: 26px;
    border: none;
    outline: none;
    padding: 0;
    background-color: transparent;
    cursor: pointer;
    opacity: .3;

    &::before, &::after {
      content: '';
      position: absolute;
      left: 7px;
      width:11px;
      top: 50%;
      height: 1px;
      background-color: #fff;
      transform: rotate(45deg);
    }

    &::after {
      transform: rotate(-45deg) translate(0, -50%);
    }
  }

  &.red {
    border-color: rgba(255, 0, 0, 0.158);
    color: rgb(211, 54, 54);
  }

  &.active {
    padding-left: 26px;
    &::before {
      content: '';  
      position: absolute;
      top: 50%;
      left: 7px;
      width: 14px;
      height: 14px;
      //border-radius: 50%;
      //background-color: #fff;
      transform: translateY(-50%);
      background-image: url('/images/claws.png');
      opacity: .1;
      background-position: center center;
      background-repeat: no-repeat;
    }
  }
}

.template-grid {
  display: grid;
  grid-template-columns: 1fr 200px;
  grid-template-rows: 1fr auto;
  min-height: ~'calc(100vh - 70px)';
  grid-gap: 20px;
}

.users-section {
  padding: 10px 0;
  display: grid;
  grid-template-rows: 1fr auto;
  
  .user-card {
    padding: 10px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.034);
    font-size: 12px;
    text-transform: capitalize;
    color: rgba(248, 248, 248, 0.466);
    cursor: pointer;
  }
}

#roles {
  border-top: 1px solid rgba(255, 255, 255, 0.03);
  padding-top: 10px;

  .roles-caption {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.336);
  }

  .selected-roles {
    margin: 0 -10px;
    padding: 7px 0;
  }
}

.wide-input {
  width: 100%;
  margin-bottom: 10px;
  border-radius: 5px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.048);
  box-sizing: border-box;
  background-color: rgba(255, 255, 255, 0.027);
  outline: none;
  padding: 0 10px;
  color: rgba(255, 255, 255, 0.733);
}

.caption {
  font-size: 14px;
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.247);
  position: relative;

  .players-counter {
    position: absolute;
    right: 0;
  }
}

</style>
