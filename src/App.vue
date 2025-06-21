<script setup>
// 导入NaiveUI的消息提供者组件
import { NMessageProvider } from 'naive-ui';
</script>

<template>
  <!-- 使用NMessageProvider包裹router-view，提供全局消息支持 -->
  <n-message-provider>
    <router-view />
  </n-message-provider>
</template>

<style>
/* 全局样式 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  color: #333;
}
</style>
