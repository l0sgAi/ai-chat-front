<template>
    <n-config-provider :theme="darkTheme">
        <div class="chat-container">
            <!-- 左侧会话列表 -->
            <n-layout-sider bordered content-style="padding: 0;" class="chat-sidebar" style="height: 100dvh;">
                <div class="sidebar-header">
                    <span class="sidebar-title">会话列表</span>
                    <n-button quaternary circle @click="prepareNewConversation">
                        <template #icon>
                            <n-icon><add-outline /></n-icon>
                        </template>
                    </n-button>
                </div>

                <div class="conversation-list">
                    <template v-if="loading">
                        <div class="loading-container">
                            <n-spin size="small" />
                            <span>加载中...</span>
                        </div>
                    </template>

                    <template v-else-if="conversations.length > 0">
                        <div v-for="conv in conversations" :key="conv.id"
                            :class="['conversation-item', activeConversationId === conv.id ? 'active' : '']"
                            @click="switchConversation(conv.id)">
                            <n-space justify="space-between" align="left" style="width: 100%;">
                                <div
                                    style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; width: 100%;">
                                    <div class="conversation-title" :title="conv.originalTitle">
                                        <n-space align="left" :wrap="false" size="small"
                                            style="width: 100%; min-width: 0;">
                                            <n-icon style="flex-shrink: 0;"><chatbubble-outline /></n-icon>
                                            <n-icon v-if="conv.isFavorite" color="#f39c12" style="flex-shrink: 0;">
                                                <star />
                                            </n-icon>
                                            <span
                                                style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;">{{
                                                    conv.title }}</span>
                                        </n-space>
                                    </div>
                                    <div class="conversation-time">
                                        <n-time :time="conv.time" format="MM-dd HH:mm" />
                                    </div>
                                </div>

                                <n-space :size="0" :wrap="false">
                                    <n-popconfirm @positive-click="deleteConversation(conv.id)" positive-text="确认" negative-text="取消">
                                        <template #trigger>
                                            <n-button quaternary circle size="tiny" style="margin: 0;">
                                                <template #icon>
                                                    <n-icon size="12"><trash-outline/></n-icon>
                                                </template>
                                            </n-button>
                                        </template>
                                        确定要删除会话 "{{ conv.originalTitle }}" 吗？此操作不可撤销。
                                    </n-popconfirm>
                                    <!-- <n-dropdown :options="conversationOptions"
                                        @select="(key) => handleConversationAction(key, conv.id)">
                                        <n-button quaternary circle size="small">
                                            <template #icon>
                                                <n-icon><ellipsis-horizontal-outline /></n-icon>
                                            </template>
                                        </n-button>
                                    </n-dropdown> -->
                                </n-space>
                            </n-space>
                        </div>
                    </template>
                    <n-empty :show-icon="false" v-else description="暂无会话" />
                </div>
            </n-layout-sider>

            <!-- 主聊天区域 -->
            <n-layout class="chat-main">
                <!-- 聊天头部 -->
                <n-layout-header bordered class="chat-header">
                    <div class="chat-title">
                        {{activeConversationId ? conversations.find(conv => conv.id === activeConversationId)?.title ||
                            'AI聊天' :
                            'AI聊天'}}
                    </div>
                    <n-space>
                        <n-button @click="goToConfig" type="primary" secondary v-if="isAdmin">
                            <template #icon>
                                <n-icon><settings-outline /></n-icon>
                            </template>
                            设置
                        </n-button>
                        <n-button @click="logout" type="error" secondary>
                            <template #icon>
                                <n-icon><log-out-outline /></n-icon>
                            </template>
                            退出登录
                        </n-button>
                    </n-space>
                </n-layout-header>

                <!-- 聊天消息区域 -->
                <n-layout-content ref="chatContentRef" class="chat-messages">
                    <template v-if="messages.length > 0">
                        <div v-for="msg in messages" :key="msg.id"
                            :class="['message', msg.sender === username ? 'user-message' : 'ai-message']">
                            <div class="message-bubble">
                                <div class="message-header">
                                    <span class="sender">{{ msg.sender }}</span>
                                    <span class="time">{{ msg.time }}</span>

                                </div>
                                <div class="message-content markdown-body" v-html="formatMessageContent(msg.content)">
                                </div>
                                <div v-if="msg.isStreaming && !msg.content" class="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
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
                            @keyup.enter="!isGenerating ? sendMessage() : null" class="chat-input" :autosize="{ minRows: 1, maxRows: 3 }" />
                        <n-button type="primary" secondary circle class="send-button" 
                                  @click="isGenerating ? stopGeneration() : sendMessage()">
                            <template #icon>
                                <n-icon>
                                    <send-outline v-if="!isGenerating" />
                                    <stop-outline v-else />
                                </n-icon>
                            </template>
                        </n-button>
                    </div>
                </n-layout-footer>
            </n-layout>
        </div>
    </n-config-provider>
</template>

<script setup>
import { userApi, chatApi, sessionApi, messageApi, configApi } from '../api';
import { ref, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, useDialog, darkTheme } from 'naive-ui';
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
    NEmpty,
    NSpin,
    NPopconfirm
} from 'naive-ui';
import {
    ChatbubbleOutline,
    AddOutline,
    SendOutline,
    LogOutOutline,
    EllipsisHorizontalOutline,
    TrashOutline,
    CreateOutline,
    Star,
    StopOutline,
    SettingsOutline
} from '@vicons/ionicons5';

import { Marked } from 'marked';
import hljs from 'highlight.js';
import { markedHighlight } from "marked-highlight";

// 引入独立的CSS文件
import '../assets/css/chat.css';
import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/monokai-sublime.css';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const messages = ref([]);
const newMessage = ref('');
const username = ref('用户');
const activeConversationId = ref(null);
const isAdmin = ref(false);

// 会话列表数据
const conversations = ref([]);
const loading = ref(false);

// AI生成状态控制
const isGenerating = ref(false);
const currentEventSource = ref(null);
const currentStreamSessionId = ref(null);

const chatContentRef = ref(null);
// 截断标题到最长11个字符
const truncateTitle = (title) => {
    if (!title) return '新会话';
    return title.length > 10 ? title.substring(0, 10) + '...' : title;
};

// 截断摘要到最长20个字符
const truncateSummary = (summary) => {
    if (!summary) return '无消息';
    return summary.length > 20 ? summary.substring(0, 20) + '...' : summary;
};

// 加载会话列表
const loadConversations = async () => {
    try {
        loading.value = true;
        const response = await sessionApi.selectSessions();
        if (response.code === 200) {
            conversations.value = response.data.map(session => ({
                id: session.id,
                title: truncateTitle(session.title),
                lastMessage: truncateSummary(session.summary),
                time: new Date(session.lastMessageTime || session.createdTime),
                messages: [],
                originalTitle: session.title, // 保存原始标题用于显示完整信息
                originalSummary: session.summary, // 保存原始摘要
                isFavorite: session.isFavorite,
                tags: session.tags
            }));
        } else {
            message.error(`加载会话失败: ${response.message}`);
        }
    } catch (error) {
        message.error(`加载会话失败: ${error.message}`);
    } finally {
        loading.value = false;
    }
};

// 自动滚动到底部
const scrollToBottom = async () => {
    await nextTick(); // 等待DOM更新完成
    const layoutInst = chatContentRef.value;
    if (layoutInst) {
        const scrollContainer = layoutInst.$el; // .n-layout-scroll-container
        if (scrollContainer) {
            // 查找实际的滚动子容器
            const actualScrollContainer = scrollContainer.querySelector('.n-scrollbar-container') ||
                scrollContainer.querySelector('.n-layout-scroll-container') ||
                scrollContainer.querySelector('[class*="scroll"]') ||
                scrollContainer.firstElementChild;
            console.log('Actual scroll container:', actualScrollContainer);
            if (actualScrollContainer) {
                actualScrollContainer.scrollTo({
                    top: actualScrollContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }
};

// 监听消息变化，自动滚动到底部
watch(messages, () => {
    scrollToBottom();
}, { deep: true });

// 组件挂载时加载会话列表
onMounted(async () => {
    // 配置marked使用highlight.js进行代码高亮
    loadConversations();
    
    // 获取用户信息，检查是否为管理员
    try {
        const response = await userApi.getUserInfo();
        if (response.code === 200) {
            username.value = response.data.username || '用户';
            isAdmin.value = response.data.role === 1; // role=1为管理员
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
    }
});

// 切换会话
const switchConversation = async (convId) => {
    // 保存当前会话的消息
    const currentConv = conversations.value.find(conv => conv.id === activeConversationId.value);
    if (currentConv) {
        currentConv.messages = [...messages.value];
    }

    // 切换到新会话
    activeConversationId.value = convId;

    // 从数据库加载会话的历史消息
    try {
        // console.log('正在加载会话历史消息，会话ID:', convId);
        const response = await messageApi.getMessagesBySessionId(convId);
        // console.log('历史消息API响应:', response);

        if (response.code === 200) {
            // console.log('历史消息数据:', response.data);

            // 检查数据是否为空
            if (!response.data || response.data.length === 0) {
                console.log('该会话暂无历史消息');
                messages.value = [];
                return;
            }

            // 先按创建时间排序消息对
            const sortedData = response.data.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));

            // 将数据库中的消息转换为前端消息格式
            const historyMessages = sortedData.map(msgPair => {
                // console.log('处理消息对:', msgPair);
                const messages = [];

                // 添加用户消息
                if (msgPair.userContent) {
                    messages.push({
                        id: `user_${msgPair.id}`,
                        sender: username.value,
                        content: msgPair.userContent,
                        time: new Date(msgPair.createTime).toLocaleTimeString(),
                        createTime: msgPair.createTime // 保存原始时间用于排序
                    });
                }

                // 添加AI回复消息
                if (msgPair.aiContent) {
                    messages.push({
                        id: `ai_${msgPair.id}`,
                        sender: 'AI助手',
                        content: msgPair.aiContent,
                        time: msgPair.responseTime ? new Date(msgPair.responseTime).toLocaleTimeString() : new Date(msgPair.createTime).toLocaleTimeString(),
                        createTime: msgPair.responseTime || msgPair.createTime // 保存原始时间用于排序
                    });
                }

                return messages;
            }).flat();

            // console.log('转换后的历史消息:', historyMessages);
            messages.value = historyMessages;
        } else {
            console.error('加载历史消息失败:', response.message);
            messages.value = [];
        }
    } catch (error) {
        console.error('加载历史消息失败:', error);
        messages.value = [];
    }
};

// 准备新会话状态（不立即创建）
const prepareNewConversation = () => {
    // 取消当前选中的会话
    activeConversationId.value = null;
    // 清空消息列表
    messages.value = [];
};

// 创建新会话（实际创建）
const createNewConversation = async (firstQuestion = null) => {
    try {
        loading.value = true;
        const sessionData = {
            title: firstQuestion ? truncateTitle(firstQuestion) : `新会话 ${conversations.value.length + 1}`,
            isFavorite: 0,
            modelId: 1, // 默认模型ID
            tags: '',
            summary: ''
        };

        const response = await sessionApi.addSession(sessionData);
        if (response.code === 200) {
            const newId = response.data; // 后端返回插入的id
            const newConversation = {
                id: newId,
                title: sessionData.title,
                lastMessage: '',
                time: new Date(),
                messages: [],
                originalTitle: firstQuestion || sessionData.title,
                originalSummary: '',
                isFavorite: 0,
                tags: ''
            };

            conversations.value.unshift(newConversation);
            activeConversationId.value = newId;
            message.success('已创建新会话');
            return newId;
        } else {
            message.error(`创建会话失败: ${response.message}`);
            return null;
        }
    } catch (error) {
        message.error(`创建会话失败: ${error.message}`);
        return null;
    } finally {
        loading.value = false;
    }
};

// 会话操作菜单
const conversationOptions = [
    {
        label: '重命名',
        key: 'rename',
        icon: () => h(NIcon, null, { default: () => h(CreateOutline) })
    }
];

// 删除会话
const deleteConversation = async (convId) => {
    try {
        loading.value = true;

        // 删除会话
        const response = await sessionApi.deleteSession(convId);
        if (response.code === 200) {
            conversations.value = conversations.value.filter(conv => conv.id !== convId);
            if (activeConversationId.value === convId) {
                if (conversations.value.length > 0) {
                    switchConversation(conversations.value[0].id);
                } else {
                    activeConversationId.value = null;
                    messages.value = [];
                }
            }
            message.success('会话及相关消息已删除');
        } else {
            message.error(`删除会话失败: ${response.message}`);
        }
    } catch (error) {
        message.error(`删除会话失败: ${error.message}`);
    } finally {
        loading.value = false;
    }
};

// 处理会话菜单选择
const handleConversationAction = (key, convId) => {
    if (key === 'rename') {
        // 这里可以实现重命名功能
        message.info('重命名功能待实现');
    }
};

const sendMessage = async () => {
    if (!newMessage.value.trim()) return;

    try {
        // 如果没有选择会话，先创建新会话
        if (!activeConversationId.value) {
            const newSessionId = await createNewConversation(newMessage.value.trim());
            // 等待会话创建完成后再发送消息
            if (!newSessionId) {
                message.error('创建会话失败，无法发送消息');
                return;
            }
        }

        // 添加用户消息到当前会话
        const userMsg = {
            id: Date.now(),
            sender: username.value,
            content: newMessage.value.trim(),
            time: new Date().toLocaleTimeString()
        };
        messages.value.push(userMsg);

        // 立即清空输入框
        const messageContent = newMessage.value.trim();
        newMessage.value = '';

        // 更新当前会话的最后消息和时间
        const currentConv = conversations.value.find(conv => conv.id === activeConversationId.value);
        if (currentConv) {
            currentConv.lastMessage = userMsg.content;
            currentConv.time = new Date();
            currentConv.messages = [...messages.value];
        }

        // 发送消息到后端获取sessionId
        const response = await chatApi.sendMessage({
            question: messageContent,
            sessionId: activeConversationId.value,
            modelId: 1, // TODO:添加默认模型ID，后续修改为可选择
            conversationId: activeConversationId.value
        });

        console.log('发送消息API响应:', response); // 添加调试日志

        if (response.code === 200) {
            const streamSessionId = response.data; // 后端返回的sessionId
            console.log('获取到streamSessionId:', streamSessionId); // 调试日志

            // 保存用户消息到数据库
            let messagePairId = null;
            try {
                const messageData = {
                    sessionId: activeConversationId.value,
                    sseSessionId: streamSessionId, // 使用获取到的SSE会话ID
                    userContent: messageContent,
                    aiContent: '', // AI回复内容暂时为空
                    modelUsed: 1, // 默认模型ID
                    status: 0, // 0-生成中
                    tokens: 0, // 暂时为0
                    createTime: new Date(),
                    responseTime: null
                };

                const saveResponse = await messageApi.addMessage(messageData);
                if (saveResponse.code === 200) {
                    messagePairId = saveResponse.data; // 保存消息对ID
                    console.log('用户消息已保存到数据库，消息对ID:', messagePairId);
                } else {
                    console.error('保存用户消息失败:', saveResponse.message);
                }
            } catch (error) {
                console.error('保存用户消息失败:', error);
            }

            // 创建AI消息占位符
            const aiMsg = {
                id: Date.now() + 1,
                sender: 'AI助手',
                content: '',
                time: new Date().toLocaleTimeString(),
                isStreaming: true
            };
            messages.value.push(aiMsg);

            // 设置生成状态
            isGenerating.value = true;
            currentStreamSessionId.value = streamSessionId;
            
            // 建立SSE连接获取流式响应
            console.log('准备建立SSE连接...'); // 调试日志
            const eventSource = chatApi.createSSEConnection(streamSessionId);
            currentEventSource.value = eventSource;

            eventSource.onmessage = (event) => {
                try {
                    // console.log('接收到SSE数据:', event.data); // 调试日志
                    // 后端直接发送文本内容，不是JSON格式
                    const text = event.data;
                    if (text && text.trim()) {
                        // console.log('处理文本内容:', text); // 调试日志
                        // 确保aiMsg.content是字符串类型，然后累加内容
                        aiMsg.content = (aiMsg.content || '') + text;
                        // 触发响应式更新
                        messages.value = [...messages.value];
                        // 每次接收到新内容时滚动到底部
                        scrollToBottom();
                    }
                } catch (error) {
                    console.error('处理SSE数据失败:', error, event);
                }
            };

            eventSource.onerror = (error) => {
                console.error('SSE连接错误:', error);
                aiMsg.isStreaming = false;
                isGenerating.value = false;
                currentEventSource.value = null;
                currentStreamSessionId.value = null;
                eventSource.close();

                // 如果没有接收到任何内容，显示错误信息
                if (!aiMsg.content) {
                    aiMsg.content = '抱歉，接收消息时出现错误，请重试。';
                }
                // message.error('接收消息流失败');
            };

            // 监听连接打开事件
            eventSource.onopen = () => {
                console.log('SSE连接已建立');
            };

            // 监听流结束事件
            eventSource.addEventListener('close', () => {
                console.log('SSE流已结束');
                aiMsg.isStreaming = false;
                isGenerating.value = false;
                currentEventSource.value = null;
                currentStreamSessionId.value = null;
                eventSource.close();

                // 更新会话列表中的最后消息
                if (currentConv && aiMsg.content) {
                    currentConv.lastMessage = aiMsg.content.substring(0, 20) + (aiMsg.content.length > 20 ? '...' : '');
                    currentConv.time = new Date();
                    currentConv.messages = [...messages.value];
                }

                console.log('AI回复完成，后端会自动更新数据库中的AI回复内容');
            });

            // 设置超时处理
            setTimeout(() => {
                if (aiMsg.isStreaming && !aiMsg.content) {
                    console.warn('SSE连接超时，未接收到数据');
                    aiMsg.isStreaming = false;
                    isGenerating.value = false;
                    currentEventSource.value = null;
                    currentStreamSessionId.value = null;
                    aiMsg.content = '连接超时，请检查网络或重试。';
                    eventSource.close();
                    message.warning('连接超时，请重试');
                }
            }, 30000); // 30秒超时

        } else {
            message.error(`发送失败: ${response.message}`);
            isGenerating.value = false;
            currentStreamSessionId.value = null;
        }
    } catch (error) {
        message.error(`发送失败: ${error.message}`);
        isGenerating.value = false;
        currentStreamSessionId.value = null;
    }

    // 清空输入框
    newMessage.value = '';
};

// 停止AI生成
const stopGeneration = async () => {
    if (!currentStreamSessionId.value) {
        console.warn('没有找到当前的SSE会话ID');
        return;
    }
    
    try {
        // 调用后端停止接口
        const response = await chatApi.stopGeneration(currentStreamSessionId.value);
        if (response.code === 200) {
            console.log('停止生成成功:', response.message);
        } else {
            console.error('停止生成失败:', response.message);
            message.error(`停止生成失败: ${response.message}`);
        }
    } catch (error) {
        console.error('调用停止接口失败:', error);
        message.error(`停止生成失败: ${error.message}`);
    }
    
    // 关闭前端SSE连接
    if (currentEventSource.value) {
        currentEventSource.value.close();
        currentEventSource.value = null;
    }
    
    // 找到正在生成的AI消息并停止流式状态
    const lastMessage = messages.value[messages.value.length - 1];
    if (lastMessage && lastMessage.sender === 'AI助手' && lastMessage.isStreaming) {
        lastMessage.isStreaming = false;
        if (!lastMessage.content) {
            lastMessage.content = '生成已停止。';
        }
    }
    
    // 重置状态
    isGenerating.value = false;
    currentStreamSessionId.value = null;
    message.info('已停止生成');
};



// 格式化消息内容
const formatMessageContent = (content) => {
    if (!content) return '';

    // 详细的类型检查和调试信息
    // console.log('formatMessageContent 输入类型:', typeof content, '值:', content);

    // 确保content是字符串类型
    let contentStr;
    try {
        contentStr = typeof content === 'string' ? content : String(content);
    } catch (stringifyError) {
        console.error('字符串转换失败:', stringifyError);
        return '';
    }

    try {
        // 处理后端返回的HTML转义字符，转换为Markdown可识别的格式
        let processedContent = contentStr
            // 先处理换行符：将<br>转换为真正的换行符
            .replace(/<br\s*\/?>/gi, '\n')
            // 处理非断行空格：在代码块中保留，在普通文本中转换为普通空格
            .replace(/&nbsp;/g, ' ')
            // 处理其他HTML转义字符
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        // 使用marked解析Markdown
        // console.log('格式化消息内容:', processedContent);
        const marked = new Marked(
            markedHighlight({
                emptyLangClass: 'hljs',
                langPrefix: 'hljs language-',
                highlight(code, lang, info) {
                    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                    return hljs.highlight(code, { language }).value;
                }
            })
        );
        const html = marked.parse(processedContent);
        // console.log('解析后消息内容:', html);

        // 检查是否包含代码块
        if (html.includes('<pre><code')) {
            console.log('检测到代码块，应用highlight.js样式');
        }

        return html;
    } catch (error) {
        console.error('Markdown解析失败:', error, '输入内容:', contentStr);
        // 降级到简单的文本替换
        try {
            const fallbackStr = typeof content === 'string' ? content : String(content);
            return fallbackStr
                .replace(/<br\s*\/?>/gi, '<br>')
                .replace(/&nbsp;/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>');
        } catch (fallbackError) {
            console.error('降级处理也失败:', fallbackError);
            return String(content || '');
        }
    }
};

// 跳转到配置页面
const goToConfig = () => {
    router.push('/config');
};

const logout = async () => {
    try {
        await userApi.logout();
        localStorage.removeItem('isLoggedIn');
        message.success('已退出登录');
        router.push('/login');
    } catch (error) {
        message.error(`错误:${error.message}`);
        return;
    }
};
</script>

<style scoped>
/* 样式已提取到 assets/css/chat.css */
</style>