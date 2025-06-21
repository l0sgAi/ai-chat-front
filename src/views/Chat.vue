<template>
    <n-config-provider :theme="darkTheme">
        <div class="chat-container">
            <!-- 左侧会话列表 -->
            <n-layout-sider bordered content-style="padding: 0;" class="chat-sidebar">
                <div class="sidebar-header">
                    <span class="sidebar-title">会话列表</span>
                    <n-button quaternary circle @click="createNewConversation">
                        <template #icon>
                            <n-icon><add-outline /></n-icon>
                        </template>
                    </n-button>
                </div>

                <div class="conversation-list">
                    <template v-if="conversations.length > 0">
                        <div v-for="conv in conversations" :key="conv.id"
                            :class="['conversation-item', activeConversationId === conv.id ? 'active' : '']"
                            @click="switchConversation(conv.id)">
                            <n-space justify="space-between" align="center">
                                <n-space vertical size="small" style="width: 80%">
                                    <div class="conversation-title">
                                        <n-space align="center">
                                            <n-icon><chatbubble-outline /></n-icon>
                                            {{ conv.title }}
                                        </n-space>
                                    </div>
                                    <div class="conversation-time">
                                        <n-space align="center" size="small">
                                            <span class="conversation-preview">
                                                {{ conv.lastMessage || '无消息' }}
                                            </span>
                                            <n-time :time="conv.time" format="yyyy-MM-dd HH:mm" />
                                        </n-space>
                                    </div>
                                </n-space>

                                <n-dropdown :options="conversationOptions"
                                    @select="(key) => handleConversationAction(key, conv.id)">
                                    <n-button quaternary circle size="small">
                                        <template #icon>
                                            <n-icon><ellipsis-horizontal-outline /></n-icon>
                                        </template>
                                    </n-button>
                                </n-dropdown>
                            </n-space>
                        </div>
                    </template>
                    <n-empty v-else description="暂无会话" />
                </div>
            </n-layout-sider>

            <!-- 主聊天区域 -->
            <n-layout class="chat-main">
                <!-- 聊天头部 -->
                <n-layout-header bordered class="chat-header">
                    <div class="chat-title">
                        {{ conversations.find(conv => conv.id === activeConversationId)?.title || 'AI聊天' }}
                    </div>
                    <n-button @click="logout" type="error" secondary>
                        <template #icon>
                            <n-icon><log-out-outline /></n-icon>
                        </template>
                        退出登录
                    </n-button>
                </n-layout-header>

                <!-- 聊天消息区域 -->
                <n-layout-content class="chat-messages">
                    <template v-if="messages.length > 0">
                        <div v-for="msg in messages" :key="msg.id"
                            :class="['message', msg.sender === username ? 'user-message' : 'ai-message']">
                            <div class="message-bubble">
                                <div class="message-header">
                                    <span class="sender">{{ msg.sender }}</span>
                                    <span class="time">{{ msg.time }}</span>
                                </div>
                                <div class="message-content">{{ msg.content }}</div>
                            </div>
                        </div>
                        <div class="bottom-spacer-static"></div>
                    </template>
                    <n-empty :show-icon="false" class="empty-conversations" v-else description="😊您好，请问有什么可以帮您的？" />
                </n-layout-content>

                <!-- 底部输入区域 -->
                <n-layout-footer bordered class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <n-input v-model:value="newMessage" type="textarea" round placeholder="输入消息..."
                            @keyup.enter="sendMessage" class="chat-input" :autosize="{ minRows: 1, maxRows: 3 }" />
                        <n-button type="primary" secondary circle class="send-button" @click="sendMessage">
                            <template #icon>
                                <n-icon><send-outline /></n-icon>
                            </template>
                        </n-button>
                    </div>
                </n-layout-footer>
            </n-layout>
        </div>
    </n-config-provider>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, darkTheme } from 'naive-ui';
import { h } from 'vue';
import {
    NConfigProvider,
    NLayout,
    NLayoutSider,
    NLayoutHeader,
    NLayoutContent,
    NLayoutFooter,
    NButton,
    NInput,
    NTime,
    NSpace,
    NIcon,
    NDropdown,
    NEmpty
} from 'naive-ui';
import {
    ChatbubbleOutline,
    AddOutline,
    SendOutline,
    LogOutOutline,
    EllipsisHorizontalOutline,
    TrashOutline,
    CreateOutline
} from '@vicons/ionicons5';

// 引入独立的CSS文件
import '../assets/css/chat.css';

const router = useRouter();
const message = useMessage();
const messages = ref([]);
const newMessage = ref('');
const username = ref('用户');
const activeConversationId = ref(1);

// 模拟会话列表数据
const conversations = ref([
    { id: 1, title: '关于AI技术的讨论', lastMessage: '你好！我是AI助手，有什么可以帮到你的吗？', time: new Date(), messages: [] },
    { id: 2, title: '编程问题咨询', lastMessage: '请问如何优化这段代码？', time: new Date(Date.now() - 3600000), messages: [] },
    { id: 3, title: '旅行计划建议', lastMessage: '我想去欧洲旅行，有什么建议？', time: new Date(Date.now() - 86400000), messages: [] },
]);

// 模拟一些初始消息
onMounted(() => {
    // 为第一个会话添加消息
    conversations.value[0].messages = [
        { id: 1, sender: 'AI助手', content: '你好！我是AI助手，有什么可以帮到你的吗？', time: new Date().toLocaleTimeString() },
    ];

    // 设置当前消息列表为活跃会话的消息
    messages.value = conversations.value.find(conv => conv.id === activeConversationId.value)?.messages || [];
});

// 切换会话
const switchConversation = (convId) => {
    // 保存当前会话的消息
    const currentConv = conversations.value.find(conv => conv.id === activeConversationId.value);
    if (currentConv) {
        currentConv.messages = [...messages.value];
    }

    // 切换到新会话
    activeConversationId.value = convId;
    const newConv = conversations.value.find(conv => conv.id === convId);
    if (newConv) {
        messages.value = [...newConv.messages];
    }
};

// 创建新会话
const createNewConversation = () => {
    const newId = Date.now();
    const newConversation = {
        id: newId,
        title: `新会话 ${conversations.value.length + 1}`,
        lastMessage: '',
        time: new Date(),
        messages: []
    };

    conversations.value.unshift(newConversation);
    switchConversation(newId);
    message.success('已创建新会话');
};

// 会话操作菜单
const conversationOptions = [
    {
        label: '重命名',
        key: 'rename',
        icon: () => h(NIcon, null, { default: () => h(CreateOutline) })
    },
    {
        label: '删除',
        key: 'delete',
        icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
    }
];

// 处理会话菜单选择
const handleConversationAction = (key, convId) => {
    if (key === 'delete') {
        conversations.value = conversations.value.filter(conv => conv.id !== convId);
        if (activeConversationId.value === convId) {
            if (conversations.value.length > 0) {
                switchConversation(conversations.value[0].id);
            } else {
                messages.value = [];
            }
        }
        message.success('会话已删除');
    } else if (key === 'rename') {
        // 这里可以实现重命名功能
        message.info('重命名功能待实现');
    }
};

const sendMessage = () => {
    if (!newMessage.value.trim()) return;

    // 添加用户消息
    const userMsg = {
        id: Date.now(),
        sender: username.value,
        content: newMessage.value,
        time: new Date().toLocaleTimeString()
    };
    messages.value.push(userMsg);

    // 更新当前会话的最后消息和时间
    const currentConv = conversations.value.find(conv => conv.id === activeConversationId.value);
    if (currentConv) {
        currentConv.lastMessage = userMsg.content;
        currentConv.time = new Date();
    }

    // 模拟AI回复
    setTimeout(() => {
        const aiMsg = {
            id: Date.now() + 1,
            sender: 'AI助手',
            content: `我收到了你的消息: "${newMessage.value}"`,
            time: new Date().toLocaleTimeString()
        };
        messages.value.push(aiMsg);

        // 更新会话列表中的最后消息
        if (currentConv) {
            currentConv.lastMessage = aiMsg.content;
            currentConv.time = new Date();
        }
    }, 1000);

    // 清空输入框
    newMessage.value = '';
};

const logout = () => {
    localStorage.removeItem('isLoggedIn');
    message.success('已退出登录');
    router.push('/login');
};
</script>

<style scoped>
/* 样式已提取到 assets/css/chat.css */
</style>