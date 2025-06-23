<template>
    <div class="welcome-content">
        <n-result status="success" title="欢迎使用AI考试系统" description="请从左侧菜单选择功能">
            <template #footer>
                <n-button type="primary" @click="goToUserInfo">开始使用</n-button>
            </template>
        </n-result>
    </div>
</template>

<script setup>
import { NResult, NButton } from 'naive-ui';
import { useRouter } from 'vue-router';

const router = useRouter();

const goToUserInfo = () => {
    router.push('/dashboard/user-info');
};
</script>