<script setup>
// 导入NaiveUI的消息和对话框提供者组件
import { NMessageProvider, NDialogProvider } from 'naive-ui';
</script>

<template>
  <!-- 使用NMessageProvider和NDialogProvider包裹router-view，提供全局消息和对话框支持 -->
  <n-message-provider>
    <n-dialog-provider>
      <router-view />
    </n-dialog-provider>
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

#app {
  width: 100%;
  height: 100dvh;
}
</style>
