<template>
    <n-config-provider :theme="darkTheme">
        <div class="dashboard-container">
            <!-- 侧边栏导航 -->
            <n-layout has-sider>
                <n-layout-sider bordered collapse-mode="width" :collapsed-width="64" :width="240" :collapsed="collapsed"
                    show-trigger @collapse="collapsed = true" @expand="collapsed = false" class="dashboard-sider">
                    <div class="logo-container">
                        <img src="/exam.svg" alt="Logo" class="logo" />
                        <h1 class="title" v-if="!collapsed">在线考试系统</h1>
                    </div>

                    <n-menu v-model:value="activeKey" :collapsed="collapsed" :collapsed-width="64"
                        :collapsed-icon-size="22" :options="menuOptions" @update:value="handleMenuUpdate" />

                    <div class="sider-footer">
                        <n-button quaternary circle @click="logout">
                            <template #icon>
                                <n-icon><log-out-outline /></n-icon>
                            </template>
                        </n-button>
                        <span v-if="!collapsed" class="logout-text">退出登录</span>
                    </div>
                </n-layout-sider>

                <n-layout class="dashboard-content">
                    <!-- 顶部导航栏 -->
                    <n-layout-header bordered class="dashboard-header">
                        <n-breadcrumb>
                            <n-breadcrumb-item>首页</n-breadcrumb-item>
                            <n-breadcrumb-item>{{ currentMenuTitle }}</n-breadcrumb-item>
                        </n-breadcrumb>

                        <div class="header-right">
                            <n-dropdown :options="userOptions" @select="handleUserAction">
                                <n-button quaternary>
                                    <n-avatar size="small" round>
                                        <n-icon><person-outline /></n-icon>
                                    </n-avatar>
                                    <span class="username">{{ username }}</span>
                                </n-button>
                            </n-dropdown>
                        </div>
                    </n-layout-header>

                    <!-- 主内容区域 -->
                    <n-layout-content class="dashboard-main">
                        <!-- 使用router-view显示子路由内容 -->
                        <router-view />
                    </n-layout-content>

                    <!-- 页脚 -->
                    <n-layout-footer bordered class="dashboard-footer">
                        考试系统 &copy; {{ new Date().getFullYear() }} losgai 版权所有
                    </n-layout-footer>
                </n-layout>
            </n-layout>
        </div>
    </n-config-provider>
</template>

<script setup>
import { h, ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMessage, darkTheme } from 'naive-ui';
import { userApi } from '../../api';
import {
    NConfigProvider,
    NLayout,
    NLayoutSider,
    NLayoutHeader,
    NLayoutContent,
    NLayoutFooter,
    NMenu,
    NBreadcrumb,
    NBreadcrumbItem,
    NButton,
    NAvatar,
    NIcon,
    NDropdown,
    NResult
} from 'naive-ui';
import {
    PersonOutline,
    DocumentTextOutline,
    LogOutOutline,
    TimeOutline
} from '@vicons/ionicons5';

// 引入CSS
import '../../assets/css/dashboard.css';

const router = useRouter();
const route = useRoute();
const message = useMessage();

// 用户信息
const username = ref('学生');
const collapsed = ref(false);
const activeKey = ref(null);

// 菜单选项 - 学生只有两个选项
const menuOptions = [
    {
        label: '开始考试',
        key: 'exam-list',
        icon: renderIcon(DocumentTextOutline),
        path: '/student/exam-list'
    },
    {
        label: '历史考试',
        key: 'history-exams',
        icon: renderIcon(TimeOutline),
        path: '/student/history-exams'
    }
];

// 用户下拉菜单选项
const userOptions = [
    {
        label: '个人信息',
        key: 'profile',
        icon: renderIcon(PersonOutline)
    },
    {
        label: '退出登录',
        key: 'logout',
        icon: renderIcon(LogOutOutline)
    }
];

// 渲染图标
function renderIcon(icon) {
    return () => h(NIcon, null, { default: () => h(icon) });
}

// 计算当前菜单标题
const currentMenuTitle = computed(() => {
    const currentMenu = menuOptions.find(item => item.key === activeKey.value);
    return currentMenu ? currentMenu.label : '欢迎';
});

// 处理菜单点击
const handleMenuUpdate = (key) => {
    activeKey.value = key;
    const targetMenu = menuOptions.find(item => item.key === key);
    if (targetMenu && targetMenu.path) {
        router.push(targetMenu.path);
    }
};

// 处理用户菜单操作
const handleUserAction = (key) => {
    if (key === 'logout') {
        logout();
    } else if (key === 'profile') {
        message.info('个人信息功能待实现');
    }
};

// 退出登录
const logout = async () => {
    try {
        await userApi.logout();
    } catch (error) {
        message.error(error.message || '退出登录失败');
        return;
    } finally {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('tokenName');
        localStorage.removeItem('tokenValue');
        message.success('已退出登录');
        router.push('/login');
    }
};
</script>

<style>
/* 样式已移至 assets/css/dashboard.css */
</style>