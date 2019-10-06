<template>
  <div>
    <header-box></header-box>
    <nuxt />
  </div>
</template>

<script>
import HeaderBox from '../components/header.vue'

export default {
  components: {
    HeaderBox
  }
}
</script>

<style>
body {
  margin: 0;
  padding: 0;
  background-color: #000;
  font-family: sans-serif;
  color: #fff;
}
</style>
