<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <nav>
    <RouterLink to="/">主页</RouterLink>
    <RouterLink to="/blog">博客</RouterLink>
    <RouterLink to="/music">音乐</RouterLink>
    <RouterLink to="/lab">实验室</RouterLink>
    <RouterLink to="/login">登录</RouterLink>
  </nav>

  <main>
    <RouterView />
  </main>
</template>
