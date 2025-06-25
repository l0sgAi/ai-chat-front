<template>
    <n-config-provider :theme="darkTheme">
        <div class="dashboard-container">
            <!-- 侧边栏导航 -->
            <n-layout has-sider>
                <n-layout-sider bordered collapse-mode="width" :collapsed-width="64" :width="240" :collapsed="collapsed"
                    show-trigger @collapse="onSiderCollapse" @expand="onSiderExpand" class="dashboard-sider">
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
                        <!-- 使用router-view显示子路由内容，包括DashboardHome欢迎页面 -->
                        <router-view />
                    </n-layout-content>

                    <!-- 页脚 -->
                    <n-layout-footer bordered class="dashboard-footer">
                        考试系统 &copy; {{ new Date().getFullYear() }} losgai 版权所有
                    </n-layout-footer>
                </n-layout>
            </n-layout>

            <!-- 修改密码模态框 -->
            <n-modal v-model:show="showChangePasswordModal" preset="card" title="修改密码" style="width: 400px">
                <n-form>
                    <n-form-item label="当前密码">
                        <n-input v-model:value="changePasswordForm.oldPassword" type="password" placeholder="请输入当前密码" />
                    </n-form-item>
                    <n-form-item label="新密码">
                        <n-input v-model:value="changePasswordForm.newPassword" type="password"
                            placeholder="请输入新密码（至少6位）" />
                    </n-form-item>
                    <n-form-item label="确认新密码">
                        <n-input v-model:value="changePasswordForm.confirmPassword" type="password"
                            placeholder="请再次输入新密码" />
                    </n-form-item>
                </n-form>
                <template #footer>
                    <div style="display: flex; justify-content: flex-end; gap: 12px;">
                        <n-button @click="handleCancelChangePassword">取消</n-button>
                        <n-button type="primary" :loading="changePasswordLoading"
                            @click="handleChangePassword">确认修改</n-button>
                    </div>
                </template>
            </n-modal>
        </div>
    </n-config-provider>
</template>

<script setup>
import { h, ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMessage, darkTheme } from 'naive-ui';
import { userApi } from '../api';
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
    NResult,
    NModal,
    NForm,
    NFormItem,
    NInput
} from 'naive-ui';
import {
    PersonOutline,
    BookOutline,
    DocumentTextOutline,
    BarChartOutline,
    SettingsOutline,
    LogOutOutline,
    SchoolOutline,
    AnalyticsOutline,
    KeyOutline
} from '@vicons/ionicons5';

// 引入CSS
import '../assets/css/dashboard.css';

const router = useRouter();
const route = useRoute();
const message = useMessage();

// 用户信息
const username = ref('管理员');
const userInfo = ref(null);
const collapsed = ref(false);
const activeKey = ref(null);

// 修改密码相关
const showChangePasswordModal = ref(false);
const changePasswordForm = ref({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
});
const changePasswordLoading = ref(false);

// 菜单选项
const menuOptions = [
    {
        label: '用户信息管理',
        key: 'user-info',
        icon: renderIcon(PersonOutline),
        path: '/dashboard/user-info'
    },
    {
        label: '试题库管理',
        key: 'question-bank',
        icon: renderIcon(BookOutline),
        path: '/dashboard/question-bank'
    },
    {
        label: '在线考试管理',
        key: 'online-exam',
        icon: renderIcon(DocumentTextOutline),
        path: '/dashboard/online-exam'
    },
    {
        label: '数据统计分析',
        key: 'data-analysis',
        icon: renderIcon(AnalyticsOutline),
        path: '/dashboard/data-analysis'
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
        label: '修改密码',
        key: 'change-password',
        icon: renderIcon(KeyOutline)
    },
    // {
    //     label: '设置',
    //     key: 'settings',
    //     icon: renderIcon(SettingsOutline)
    // },
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

// 处理侧边栏收缩
const onSiderCollapse = () => {
    collapsed.value = true;
    updateHeaderPosition();
};

// 处理侧边栏展开
const onSiderExpand = () => {
    collapsed.value = false;
    updateHeaderPosition();
};

// 更新导航栏位置
const updateHeaderPosition = () => {
    const header = document.querySelector('.dashboard-header');
    if (header) {
        header.style.left = collapsed.value ? '64px' : '240px';
    }
};

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
    } else if (key === 'change-password') {
        showChangePasswordModal.value = true;
    } else if (key === 'settings') {
        router.push('/dashboard/settings');
    }
};

// 获取用户信息
const getUserInfo = async () => {
    try {
        const response = await userApi.getUserInfo();
        if (response.code === 200) {
            userInfo.value = response.data;
            username.value = response.data.username || '管理员';
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
    }
};

// 修改密码
const handleChangePassword = async () => {
    if (!changePasswordForm.value.oldPassword || !changePasswordForm.value.newPassword) {
        message.error('请填写完整的密码信息');
        return;
    }

    if (changePasswordForm.value.newPassword !== changePasswordForm.value.confirmPassword) {
        message.error('新密码和确认密码不一致');
        return;
    }

    if (changePasswordForm.value.newPassword.length < 6) {
        message.error('新密码长度不能少于6位');
        return;
    }

    try {
        changePasswordLoading.value = true;
        const response = await userApi.changePassword({
            oldPassword: changePasswordForm.value.oldPassword,
            newPassword: changePasswordForm.value.newPassword
        });

        if (response.code === 200) {
            message.success('密码修改成功');
            showChangePasswordModal.value = false;
            // 重置表单
            changePasswordForm.value = {
                oldPassword: '',
                newPassword: '',
                confirmPassword: ''
            };
        } else {
            message.error(response.message || '密码修改失败');
        }
    } catch (error) {
        message.error(error.message || '密码修改失败');
    } finally {
        changePasswordLoading.value = false;
    }
};

// 取消修改密码
const handleCancelChangePassword = () => {
    showChangePasswordModal.value = false;
    changePasswordForm.value = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    };
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

// 组件挂载时初始化导航栏位置和获取用户信息
onMounted(() => {
    updateHeaderPosition();
    getUserInfo();
});
</script>

<style scoped>
@import '../assets/css/dashboard.css';

/* 确保顶栏右侧显示 */
.dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 64px;
    background-color: #1f1f1f;
    position: fixed;
    top: 0;
    right: 0;
    left: 240px;
    z-index: 1000;
    transition: left 0.3s ease;
}

.header-right {
    display: flex;
    align-items: center;
    margin-right: 13%;
    gap: 8px;
}

.username {
    margin-left: 8px;
    color: #fff;
}

/* 侧边栏收缩时调整顶栏位置 */
.dashboard-sider.collapsed+.dashboard-content .dashboard-header {
    left: 64px;
}
</style>