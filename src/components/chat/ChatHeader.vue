<template>
    <n-layout-header bordered class="chat-header">
        <div class="chat-title">
            {{ title }}
        </div>
        <n-space align="center">
            <n-button @click="$emit('go-config')" class="header-btn-config" type="primary" secondary v-if="isAdmin">
                <template #icon>
                    <n-icon><settings-outline /></n-icon>
                </template>
                后台管理
            </n-button>
            <n-button @click="$emit('logout')" class="header-btn-out" type="error" secondary>
                <template #icon>
                    <n-icon><log-out-outline /></n-icon>
                </template>
                退出登录
            </n-button>
        </n-space>
    </n-layout-header>
</template>

<script setup>
import { NLayoutHeader, NSpace, NButton, NIcon } from 'naive-ui';
import { SettingsOutline, LogOutOutline } from '@vicons/ionicons5';

defineProps({
    title: {
        type: String,
        default: 'AI聊天'
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
});

defineEmits(['go-config', 'logout']);
</script>

<style scoped>
/* Styles are inherited from global chat.css or parent */
</style>
