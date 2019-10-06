<template>
    <div
    class="role-card-item"
    :class="[role.color, role.active ? 'active' : '']">
        <div class="role-card"
            @click="selectRole(id)">
            <div class="role-pic">
                    <span class="active-icon" v-show="role.active"></span>
                <!---<div class="active-role" v-show="role.active">
                    Активная роль
                </div>--->
                <img :src="`/roles/${id}.png`" :alt="id">
            </div>
            <div class="role-card-info">
                <div class="role-name">
                    {{role.name}}
                </div>
                <div class="role-desc">
                    {{role.description}}
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: ['role', 'id'],
    methods: {
        selectRole(id) {
            console.log(id)
            this.$store.commit('selectRole', id)
        }
    }
}
</script>

<style lang="less">

.active-icon {
    display: inline-block;
    width: 24px;
    height: 24px;
    background-image: url('/images/claws.png');
    background-repeat: no-repeat;
    background-position: center;
    opacity: .5;
    position: absolute;
    top: 8px;
    left: 8px;
    border-radius: 5px;
    border: 1px solid rgba(255, 255, 255, 0.178);
    background-color: rgba(34, 34, 34, 0.589);
}

.role-card-item {
    display: inline-block;
    width: ~'calc(100% / 5)';
    padding: 10px;
    font-size: 14px;
    box-sizing: border-box;
    text-align: center;
    vertical-align: top;

    .role-card {
        background-color: #000;
        border-radius: 13px;
        box-shadow: 0 4px 30px rgba(255, 255, 255, 0.04), inset 0 0 0 4px black;
        position: relative;
        overflow: hidden;
        cursor: pointer;
        transition: .4s;

        &:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 45px rgba(255, 255, 255, 0.04), inset 0 0 0 4px black;
        }
        
        .role-pic {
            .active-role {
                position: absolute;
                top: 10px;
                left: 10px;
                background-color: rgb(0, 0, 0);
                border: 1px solid rgba(250, 250, 250, 0.11);
                color: #fff;
                opacity: .7;
                font-size: 10px;
                border-radius: 3px;
                line-height: 20px;
                padding: 0 10px;
            }

            img {
                width: 100%;
                display: block;
            }
        }

        .role-card-info {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.884), black, transparent);
            color: #fff;
            border-radius: 0 0 12px 12px;
            padding: 10px 20px;
            box-sizing: border-box;
            text-align: left;

            .role-name {
                font-weight: 800;
                font-size: 18px;
                margin-bottom: 5px;
            }

            .role-desc {
                font-size: 12px;
                padding: 8px 0;
                border-top: 1px solid rgba(245, 245, 245, 0.041);
            }
        }
    }

    &.blue {
        .role-name {
            color: rgb(162, 183, 252);
        }
    }

    &.red {
        .role-name {
            color: rgb(235, 63, 63);
        }
    }

    &.green {
        .role-name {
            color: rgb(63, 235, 72);
        }
    }

    &.brown {
        .role-name {
            color: rgb(196, 173, 160);
        }
    }

    &.active {
        
    }
}
</style>