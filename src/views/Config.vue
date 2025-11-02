<template>
    <n-config-provider :theme="darkTheme">
        <div class="admin-container dark-theme">
            <n-layout has-sider style="height: 100dvh;">
                <!-- 左侧导航栏 -->
                <n-layout-sider
                    bordered
                    collapse-mode="width"
                    :collapsed-width="64"
                    :width="200"
                    :native-scrollbar="false"
                    show-trigger="bar"
                    content-style="padding: 24px 0; background: #18181c;"
                >
                    <div class="admin-sidebar-header">
                        <n-button quaternary circle @click="goBack" style="margin-bottom: 24px;">
                            <n-icon><arrow-back-outline /></n-icon>
                        </n-button>
                        <h3 style="margin: 0 0 24px 0; padding: 0 12px; color: #fff;">后台管理</h3>
                    </div>
                    
                    <n-menu
                        v-model:value="activeMenu"
                        :options="menuOptions"
                        :indent="24"
                    />
                </n-layout-sider>

                <!-- 右侧内容区域 -->
                <n-layout-content content-style="padding: 24px; background: #101014;">
                    <div class="admin-content-wrapper">
                        <!-- 根据选中的菜单显示对应组件 -->
                        <component :is="currentComponent" />
                    </div>
                </n-layout-content>
            </n-layout>
        </div>
    </n-config-provider>
</template>

<script setup>
import { ref, computed, h, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { darkTheme } from 'naive-ui';
import '../assets/css/admin-config.css';
import {
    NConfigProvider,
    NLayout,
    NLayoutSider,
    NLayoutContent,
    NButton,
    NIcon,
    NMenu
} from 'naive-ui';
import {
    ArrowBackOutline,
    SettingsOutline,
    LibraryOutline
} from '@vicons/ionicons5';

// 导入子组件
import ModelConfig from './admin/ModelConfig.vue';
import KnowledgeBase from './admin/KnowledgeBase.vue';

const router = useRouter();

// 当前选中的菜单（从localStorage恢复上次选择的菜单，如果没有则默认为模型配置）
const activeMenu = ref(localStorage.getItem('admin-active-menu') || 'model-config');

// 菜单选项
const menuOptions = [
    {
        label: '模型配置',
        key: 'model-config',
        icon: () => h(NIcon, null, { default: () => h(SettingsOutline) })
    },
    {
        label: '知识库管理',
        key: 'knowledge-base',
        icon: () => h(NIcon, null, { default: () => h(LibraryOutline) })
    }
];

// 根据选中的菜单动态显示组件
const currentComponent = computed(() => {
    switch (activeMenu.value) {
        case 'model-config':
            return ModelConfig;
        case 'knowledge-base':
            return KnowledgeBase;
        default:
            return ModelConfig;
    }
});

// 返回上一页
const goBack = () => {
    router.back();
};

// 监听菜单变化，保存到localStorage
watch(activeMenu, (newValue) => {
    localStorage.setItem('admin-active-menu', newValue);
});

// 组件挂载时确保样式正确应用
onMounted(() => {
    // 强制重新计算布局并清除可能的样式污染
    nextTick(() => {
        const container = document.querySelector('.admin-container');
        if (container) {
            // 清除所有可能的transform样式
            const allElements = container.querySelectorAll('*');
            allElements.forEach(el => {
                el.style.transform = 'none';
            });
            
            container.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #101014 !important;
                overflow: hidden !important;
                z-index: 200 !important;
                transform: none !important;
            `;
        }
    });
});
</script>
