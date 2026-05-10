<template>
    <n-config-provider :theme="darkTheme">
        <div class="chat-container">
            <!-- 左侧会话列表 -->
            <n-layout-sider bordered content-style="padding: 0;" class="chat-sidebar" style="height: 100dvh;">
                <div class="chat-sidebar-header">
                    <span class="chat-sidebar-title">会话列表</span>
                    <n-space :size="4">
                        <n-button quaternary circle @click="openSearchModal">
                            <template #icon>
                                <n-icon><search-outline /></n-icon>
                            </template>
                        </n-button>
                        <n-button quaternary circle @click="prepareNewConversation">
                            <template #icon>
                                <n-icon><add-outline /></n-icon>
                            </template>
                        </n-button>
                    </n-space>
                </div>

                <!-- 会话列表 -->
                <div class="conversation-list" ref="conversationListRef">
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
                                    <n-popconfirm @positive-click="deleteConversation(conv.id)" positive-text="确认"
                                        negative-text="取消">
                                        <template #trigger>
                                            <n-button quaternary circle size="tiny" style="margin: 0;">
                                                <template #icon>
                                                    <n-icon size="12"><trash-outline /></n-icon>
                                                </template>
                                            </n-button>
                                        </template>
                                        确定要删除会话 "{{ conv.originalTitle }}" 吗？此操作不可撤销。
                                    </n-popconfirm>
                                </n-space>
                            </n-space>
                        </div>
                        
                        <!-- 加载更多提示 -->
                        <div v-if="loadingMore" class="loading-more">
                            <n-spin size="small" />
                            <span style="margin-left: 8px; font-size: 12px; color: #999;">加载更多...</span>
                        </div>
                        <div v-else-if="!hasMore" class="no-more-data">
                            <span style="font-size: 12px; color: #999;">没有更多会话了</span>
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
                    <n-space align="center">
                        <n-button @click="goToConfig" class="header-btn-config" type="primary" secondary v-if="isAdmin">
                            <template #icon>
                                <n-icon><settings-outline /></n-icon>
                            </template>
                            后台管理
                        </n-button>
                        <n-button @click="logout" class="header-btn-out" type="error" secondary>
                            <template #icon>
                                <n-icon><log-out-outline /></n-icon>
                            </template>
                            退出登录
                        </n-button>
                    </n-space>
                </n-layout-header>

                <!-- 聊天消息区域 -->
                <n-layout-content ref="chatContentRef" class="chat-messages" @click="handleImageClick">
                    <template v-if="messages.length > 0">
                        <!-- 加载更多历史消息提示 -->
                        <div v-if="loadingMessages" class="loading-more-messages">
                            <n-spin size="small" />
                            <span style="margin-left: 8px; font-size: 12px; color: #999;">加载更早的消息...</span>
                        </div>
                        <div v-else-if="!hasMoreMessages && messages.length >= 5" class="no-more-messages">
                            <span style="font-size: 12px; color: #666;">没有更多历史消息了</span>
                        </div>
                        
                        <div v-for="msg in messages" :key="msg.id"
                            :class="['message', msg.sender === username ? 'user-message' : 'ai-message']"
                            :data-message-id="msg.id">
                            <div class="message-bubble">
                                <div class="message-header">
                                    <div class="message-header-left">
                                        <span class="sender">{{ msg.sender }}</span>
                                        <span v-if="msg.modelId" class="model-name">{{ getModelName(msg.modelId) }}</span>
                                    </div>
                                    <span class="time">{{ msg.time }}</span>
                                </div>
                                <!-- 统一加载动画（在AI消息开始前显示） -->
                                <div v-if="msg.isStreaming && !msg.content" class="stream-loading">
                                    <div class="stream-loading-dots">
                                        <span></span><span></span><span></span>
                                    </div>
                                    <span class="stream-loading-text">{{ statusMessage || '建立连接中' }}</span>
                                </div>
                                <MdPreview v-if="msg.content"
                                    class="message-content"
                                    :model-value="preprocessContent(msg.content)"
                                    theme="dark"
                                    preview-theme="github"
                                    code-theme="atom-one-dark"
                                    :no-img-zoom-in="true"
                                />
                            </div>
                        </div>
                        <div class="bottom-spacer-static"></div>
                    </template>
                    <n-empty :show-icon="false" class="empty-conversations" v-else description="😊您好，请问有什么可以帮您的？" />
                </n-layout-content>

                <!-- 底部输入区域 -->
                <n-layout-footer bordered class="chat-input-container">
                    <div class="chat-input-section">
                        <!-- 上半部分：输入框 -->
                        <div class="input-area">
                            <n-input v-model:value="newMessage" type="textarea" placeholder="输入消息..."
                                @keydown="handleKeyDown" class="chat-input" :autosize="{ minRows: 2, maxRows: 4 }"
                                :bordered="false" />
                        </div>

                        <!-- 图片预览区域（仅在视觉模型且有上传图片时显示） -->
                        <div v-if="isVisionModel && uploadedImages.length > 0" class="image-preview-area">
                            <n-space size="small">
                                <div v-for="image in uploadedImages" :key="image.id" class="uploaded-image-item">
                                    <div class="image-container">
                                        <n-image :src="image.url" :alt="image.name" width="200" height="200"
                                            object-fit="cover" />
                                        <n-button size="tiny" quaternary circle class="remove-image-btn"
                                            @click="removeImage(image.id)"
                                            style="background: rgba(0,0,0,0.5); color: white;">
                                            <template #icon>
                                                <n-icon size="10"><close-outline /></n-icon>
                                            </template>
                                        </n-button>
                                    </div>
                                    <span class="image-name">{{ image.name }}</span>
                                </div>
                            </n-space>
                        </div>

                        <!-- 下半部分：操作选项 -->
                        <div class="control-area">
                            <n-space justify="space-between" align="center" style="width: 100%;">
                                <!-- 左侧：模型选择和图片上传 -->
                                <div class="model-selection">
                                    <n-space align="center" size="small">
                                        <span class="model-label">模型:</span>
                                        <n-select v-model:value="selectedModelId" :options="modelOptions"
                                            placeholder="选择模型" size="small" style="width: 180px;"
                                            :loading="modelsLoading" />
                                        <!-- 视觉模型时显示图片上传按钮 -->
                                        <n-upload v-if="isVisionModel" :custom-request="handleImageUpload"
                                            accept="image/*" :show-file-list="false" multiple>
                                            <n-button ghost="true" size="small" type="primary" secondary
                                                :loading="isUploading">
                                                <template #icon>
                                                    <n-icon><image-outline /></n-icon>
                                                </template>
                                                上传图片
                                            </n-button>
                                        </n-upload>
                                    </n-space>
                                </div>

                                <!-- 右侧：发送按钮 -->
                                <div class="send-area">
                                    <n-space align="center" size="small">
                                        <span class="shortcut-hint">Enter发送 • Shift+Enter换行</span>
                                        <n-button type="primary"
                                            :disabled="(!isGenerating && !newMessage.trim()) || !selectedModelId"
                                            @click="isGenerating ? stopGeneration() : sendMessage()"
                                            class="send-button">
                                            <template #icon>
                                                <n-icon>
                                                    <send-outline v-if="!isGenerating" />
                                                    <stop-outline v-else />
                                                </n-icon>
                                            </template>
                                            {{ isGenerating ? '停止' : '发送' }}
                                        </n-button>
                                    </n-space>
                                </div>
                            </n-space>
                        </div>
                    </div>
                </n-layout-footer>
            </n-layout>
        </div>
    </n-config-provider>

    <!-- Naive UI 图片预览 Modal -->
    <n-modal v-model:show="showImageModal" :bordered="false">
        <img :src="previewImageUrl" style="max-width: 80dvw; max-height: 80dvh; display: block;" />
    </n-modal>

    <!-- 全局搜索 Modal -->
    <n-config-provider :theme="darkTheme">
        <n-modal v-model:show="showSearchModal" preset="card" class="search-modal" title="全局搜索"
            style="max-width: 60vw;">
            <div class="search-modal-content">
                <!-- 搜索输入框 -->
                <div class="search-input-section">
                    <n-input v-model:value="searchKeyword" placeholder="搜索消息内容..." clearable @input="handleSearchInput"
                        @clear="clearSearch" size="medium" class="search-modal-input">
                        <template #prefix>
                            <n-icon><search-outline /></n-icon>
                        </template>
                    </n-input>
                </div>

                <!-- 搜索结果区域 -->
                <div class="search-results-section">
                    <!-- 搜索结果列表 -->
                    <div v-if="searchResults.length > 0" class="search-results">
                        <div class="search-results-header">
                            <span>搜索结果 ({{ searchResults.length }})</span>
                        </div>
                        <div class="search-results-list">
                            <div v-for="result in searchResults" :key="result.id" class="search-result-item"
                                @click="jumpToMessage(result)">
                                <div class="search-result-content">
                                    <!-- 根据匹配优先级显示内容 -->
                                    <template v-if="getMatchedContent(result).type === 'user'">
                                        <div class="search-result-user">
                                            <n-icon size="25" class="search-result-icon"><person-outline /></n-icon>
                                            <span class="search-result-text"
                                                v-html="highlightKeyword(getMatchedContent(result).content)"></span>
                                        </div>
                                    </template>
                                    <template v-else>
                                        <div class="search-result-ai">
                                            <n-icon size="25" class="search-result-icon"><chatbubble-outline /></n-icon>
                                            <span class="search-result-text"
                                                v-html="highlightKeyword(getMatchedContent(result).content)"></span>
                                        </div>
                                    </template>
                                </div>
                                <div class="search-result-time">
                                    <span v-if="result.modelUsed" class="search-model-name">{{ getModelName(result.modelUsed) }}</span>
                                    <n-time :time="new Date(result.createTime)" format="MM-dd HH:mm" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 无搜索结果提示 -->
                    <div v-if="searchKeyword && searchResults.length === 0 && !searchLoading" class="no-search-results">
                        <n-empty description="无搜索结果">
                            <template #icon>
                                <n-icon>
                                    <AlertCircleSharp />
                                </n-icon>
                            </template>
                        </n-empty>
                    </div>

                    <!-- 搜索加载状态 -->
                    <div v-if="searchLoading" class="search-loading">
                        <n-spin size="medium" />
                        <span>搜索中...</span>
                    </div>

                    <!-- 初始状态提示 -->
                    <div v-if="!searchKeyword && searchResults.length === 0 && !searchLoading"
                        class="search-placeholder">
                        <n-empty description="请在上方输入全文检索内容">
                            <template #icon>
                                <n-icon>
                                    <FileTrayFullSharp />
                                </n-icon>
                            </template>
                        </n-empty>
                    </div>
                </div>
            </div>
        </n-modal>
    </n-config-provider>

</template>

<script setup>
import { userApi, chatApi, sessionApi, messageApi, configApi } from '../api';
import { ref, onMounted, onBeforeUnmount, nextTick, watch, computed } from 'vue';
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
    NPopconfirm,
    NSelect,
    NUpload,
    NUploadDragger,
    NImage,
    NTag,
    NModal
} from 'naive-ui';
import {
    ChatbubbleOutline,
    AddOutline,
    SendOutline,
    LogOutOutline,
    FileTrayFullSharp,
    TrashOutline,
    CreateOutline,
    AlertCircleSharp,
    Star,
    StopOutline,
    SettingsOutline,
    ImageOutline,
    CloseOutline,
    SearchOutline,
    PersonOutline
} from '@vicons/ionicons5';

import { MdPreview } from 'md-editor-v3';

// 引入独立的CSS文件
import '../assets/css/chat.css';
import 'md-editor-v3/lib/style.css';
import 'katex/dist/katex.min.css';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const messages = ref([]);
const newMessage = ref('');
const username = ref('用户');
const activeConversationId = ref(null);
const isAdmin = ref(false);

// 消息分页相关状态
const loadingMessages = ref(false); // 加载历史消息状态
const hasMoreMessages = ref(true); // 是否还有更多历史消息
const oldestMessageId = ref(null); // 游标：最早的消息ID
const isSwitchingConversation = ref(false); // 是否正在切换会话（防止意外触发分页）

// 会话列表数据
const conversations = ref([]);
const loading = ref(false);
const loadingMore = ref(false); // 加载更多状态
const hasMore = ref(true); // 是否还有更多数据
const lastMessageTime = ref(null); // 游标：最后一条数据的时间

// 模型选择相关
const selectedModelId = ref(null);
const modelOptions = ref([]);
const modelsLoading = ref(false);
const selectedModelData = ref(null);
const modelsData = ref([]); // 保存完整的模型数据列表

// 图片上传相关
const uploadedImages = ref([]);
const isUploading = ref(false);

// AI生成状态控制
const isGenerating = ref(false);
const currentEventSource = ref(null);
const currentStreamSessionId = ref(null);
const currentStatusEventSource = ref(null); // 状态通知SSE连接
const statusMessage = ref(''); // 当前状态消息

// 图片预览相关
const showImageModal = ref(false);
const previewImageUrl = ref('');

// 全局搜索相关
const searchKeyword = ref('');
const searchResults = ref([]);
const isSearching = ref(false);
const searchLoading = ref(false);
const showSearchModal = ref(false);
let searchTimeout = null;

const chatContentRef = ref(null);
const conversationListRef = ref(null); // 会话列表容器引用

// 计算属性：判断当前选择的模型是否为视觉模型
const isVisionModel = computed(() => {
    return selectedModelData.value && selectedModelData.value.modelType === 2;
});

// 根据模型ID获取模型显示名称
const getModelName = (modelId) => {
    if (!modelId) return '';
    const model = modelsData.value.find(m => m.id === modelId);
    return model ? model.displayName : `模型${modelId}`;
};

// 将 Date 对象或时间字符串转换为数据库格式 YYYY-MM-DD HH:mm:ss
const formatToDBTime = (date) => {
    if (!date) return null;
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

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

// 加载初始会话列表
const loadConversations = async () => {
    try {
        loading.value = true;
        const response = await sessionApi.initialList();
        if (response.code === 200) {
            const sessionList = response.data.map(session => {
                const timeStr = session.lastMessageTime || session.createdTime;
                return {
                    id: session.id,
                    title: truncateTitle(session.title),
                    lastMessage: truncateSummary(session.summary),
                    time: new Date(timeStr),
                    messages: [],
                    originalTitle: session.title, // 保存原始标题用于显示完整信息
                    originalSummary: session.summary, // 保存原始摘要
                    isFavorite: session.isFavorite,
                    tags: session.tags,
                    // 确保保存的是数据库格式的字符串，如果后端返回的是ISO格式则转换
                    lastMessageTime: timeStr.includes('T') ? formatToDBTime(timeStr) : timeStr
                };
            });
            conversations.value = sessionList;
            
            // 更新游标：获取最后一条数据的 lastMessageTime
            if (sessionList.length > 0) {
                const lastSession = sessionList[sessionList.length - 1];
                lastMessageTime.value = lastSession.lastMessageTime;
            }
            
            // 如果返回的数据少于12条，说明没有更多数据了
            hasMore.value = sessionList.length >= 12;
        } else {
            message.error(`加载会话失败: ${response.message}`);
        }
    } catch (error) {
        message.error(`加载会话失败: ${error.message}`);
    } finally {
        loading.value = false;
    }
};

// 加载更多会话（游标分页）
const loadMoreConversations = async () => {
    if (loadingMore.value || !hasMore.value || !lastMessageTime.value) {
        return;
    }
    
    try {
        loadingMore.value = true;
        const response = await sessionApi.pageList(lastMessageTime.value, 12);
        if (response.code === 200) {
            const newSessions = response.data.map(session => {
                const timeStr = session.lastMessageTime || session.createdTime;
                return {
                    id: session.id,
                    title: truncateTitle(session.title),
                    lastMessage: truncateSummary(session.summary),
                    time: new Date(timeStr),
                    messages: [],
                    originalTitle: session.title,
                    originalSummary: session.summary,
                    isFavorite: session.isFavorite,
                    tags: session.tags,
                    // 确保保存的是数据库格式的字符串，如果后端返回的是ISO格式则转换
                    lastMessageTime: timeStr.includes('T') ? formatToDBTime(timeStr) : timeStr
                };
            });
            
            // 追加新数据到列表
            conversations.value = [...conversations.value, ...newSessions];
            
            // 更新游标
            if (newSessions.length > 0) {
                const lastSession = newSessions[newSessions.length - 1];
                lastMessageTime.value = lastSession.lastMessageTime;
            }
            
            // 如果返回的数据少于12条，说明没有更多数据了
            hasMore.value = newSessions.length >= 12;
        } else {
            message.error(`加载更多会话失败: ${response.message}`);
        }
    } catch (error) {
        message.error(`加载更多会话失败: ${error.message}`);
    } finally {
        loadingMore.value = false;
    }
};

// 加载模型列表
const loadModels = async () => {
    try {
        modelsLoading.value = true;
        const response = await configApi.getModels();
        if (response.code === 200) {
            // 保存完整的模型数据列表
            modelsData.value = response.data;
            modelOptions.value = response.data.map(model => ({
                label: model.displayName,
                value: model.id
            }));

            // 设置默认选中的模型（isDefault为1的模型）
            const defaultModel = response.data.find(model => model.isDefault === 1);
            if (defaultModel) {
                selectedModelId.value = defaultModel.id;
                selectedModelData.value = defaultModel;
            } else if (response.data.length > 0) {
                // 如果没有默认模型，选择第一个
                selectedModelId.value = response.data[0].id;
                selectedModelData.value = response.data[0];
            }

            // 监听模型选择变化，更新模型数据
            watch(selectedModelId, (newModelId) => {
                const selectedModel = response.data.find(model => model.id === newModelId);
                selectedModelData.value = selectedModel || null;
                // 当切换模型时，清空已上传的图片
                if (uploadedImages.value.length > 0) {
                    uploadedImages.value = [];
                }
            });
        } else {
            message.error(`加载模型列表失败: ${response.message}`);
        }
    } catch (error) {
        message.error(`加载模型列表失败: ${error.message}`);
    } finally {
        modelsLoading.value = false;
    }
};

// 自动滚动到底部
const scrollToBottom = async (instant = false) => {
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
            // console.log('Actual scroll container:', actualScrollContainer);
            if (actualScrollContainer) {
                actualScrollContainer.scrollTo({
                    top: actualScrollContainer.scrollHeight,
                    behavior: instant ? 'auto' : 'smooth' // instant为true时直接跳转，不触发滚动事件
                });
            }
        }
    }
};

// 监听消息变化，自动滚动到底部
watch(messages, () => {
    // 如果正在切换会话，不自动滚动（由switchConversation手动控制）
    // 如果正在加载历史消息，不自动滚动（由loadMoreMessages手动控制滚动位置）
    if (!isSwitchingConversation.value && !loadingMessages.value) {
        scrollToBottom();
    }
}, { deep: true });

// 会话列表滚动监听（向下滚动加载更多会话）
const handleConversationScroll = (event) => {
    const container = event.target;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // 当滚动到底部附近（距离底部50px以内）时加载更多
    if (scrollHeight - scrollTop - clientHeight < 50) {
        loadMoreConversations();
    }
};

// 消息区域滚动监听（向上滚动加载更早的消息）
const handleMessageScroll = (event) => {
    // 如果正在切换会话，不触发分页加载
    if (isSwitchingConversation.value) {
        return;
    }
    
    const container = event.target;
    const scrollTop = container.scrollTop;
    
    // 当滚动到顶部附近（距离顶部50px以内）时加载更早的消息
    if (scrollTop < 50) {
        loadMoreMessages();
    }
};

// 组件挂载时加载会话列表
onMounted(async () => {
    loadConversations();
    loadModels(); // 加载模型列表

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
    
    // 添加滚动监听
    await nextTick();
    // 会话列表滚动监听
    if (conversationListRef.value) {
        conversationListRef.value.addEventListener('scroll', handleConversationScroll);
    }
    
    // 消息区域滚动监听
    const chatContent = chatContentRef.value?.$el;
    if (chatContent) {
        const scrollContainer = chatContent.querySelector('.n-scrollbar-container') || 
                              chatContent.querySelector('.n-layout-scroll-container') ||
                              chatContent.firstElementChild;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleMessageScroll);
        }
    }
});

// 组件卸载时清理事件监听器
onBeforeUnmount(() => {
    // 清理会话列表滚动监听
    if (conversationListRef.value) {
        conversationListRef.value.removeEventListener('scroll', handleConversationScroll);
    }
    
    // 清理消息区域滚动监听
    const chatContent = chatContentRef.value?.$el;
    if (chatContent) {
        const scrollContainer = chatContent.querySelector('.n-scrollbar-container') || 
                              chatContent.querySelector('.n-layout-scroll-container') ||
                              chatContent.firstElementChild;
        if (scrollContainer) {
            scrollContainer.removeEventListener('scroll', handleMessageScroll);
        }
    }
});

// 将消息对转换为前端消息格式的辅助函数
const convertMessagePairToMessages = (msgPair) => {
    const pairMessages = [];

    // 添加用户消息
    if (msgPair.userContent) {
        pairMessages.push({
            id: `user-${msgPair.id}`,
            sender: username.value,
            content: msgPair.userContent,
            time: new Date(msgPair.createTime).toLocaleTimeString(),
            createTime: msgPair.createTime,
            pairId: msgPair.id, // 保存消息对ID
            modelId: msgPair.modelUsed // 保存使用的模型ID
        });
    }

    // 添加AI回复消息
    if (msgPair.aiContent) {
        pairMessages.push({
            id: `ai-${msgPair.id}`,
            sender: 'AI助手',
            content: msgPair.aiContent,
            time: msgPair.responseTime ? new Date(msgPair.responseTime).toLocaleTimeString() : new Date(msgPair.createTime).toLocaleTimeString(),
            createTime: msgPair.responseTime || msgPair.createTime,
            pairId: msgPair.id, // 保存消息对ID
            modelId: msgPair.modelUsed // 保存使用的模型ID
        });
    }

    return pairMessages;
};

// 切换会话（初始只加载最后5条）
const switchConversation = async (convId) => {
    // 设置切换会话标志，防止滚动时意外触发分页加载
    isSwitchingConversation.value = true;
    
    // 保存当前会话的消息
    const currentConv = conversations.value.find(conv => conv.id === activeConversationId.value);
    if (currentConv) {
        currentConv.messages = [...messages.value];
    }

    // 切换到新会话
    activeConversationId.value = convId;
    
    // 重置消息分页状态
    hasMoreMessages.value = true;
    oldestMessageId.value = null;
    messages.value = [];

    // 从数据库加载会话的初始消息（最后5条）
    try {
        const response = await messageApi.getInitialMessages(convId);

        if (response.code === 200) {
            // 检查数据是否为空
            if (!response.data || response.data.length === 0) {
                console.log('该会话暂无历史消息');
                messages.value = [];
                hasMoreMessages.value = false;
                // 重置切换标志
                isSwitchingConversation.value = false;
                return;
            }

            // 后端返回的是按id倒序的数据（最新的在前面）
            // 需要反转顺序，使其正向显示（最旧的在前面）
            const reversedData = [...response.data].reverse();

            // 将数据库中的消息转换为前端消息格式
            const historyMessages = reversedData.map(msgPair => 
                convertMessagePairToMessages(msgPair)
            ).flat();

            messages.value = historyMessages;
            
            // 设置游标：最早的消息ID（第一条数据的id）
            if (reversedData.length > 0) {
                oldestMessageId.value = reversedData[0].id;
            }
            
            // 如果返回的数据少于5条，说明没有更多历史消息了
            hasMoreMessages.value = response.data.length >= 5;
            
            // 直接跳转到底部（不使用平滑滚动，避免触发滚动事件）
            await nextTick();
            scrollToBottom(true); // 使用instant模式
            
            // 等待一小段时间后重置切换标志，确保滚动已完成
            setTimeout(() => {
                isSwitchingConversation.value = false;
            }, 100);
        } else {
            console.error('加载历史消息失败:', response.message);
            messages.value = [];
            hasMoreMessages.value = false;
            // 重置切换标志
            isSwitchingConversation.value = false;
        }
    } catch (error) {
        console.error('加载历史消息失败:', error);
        messages.value = [];
        hasMoreMessages.value = false;
        // 重置切换标志
        isSwitchingConversation.value = false;
    }
};

// 加载更多历史消息（向上滚动时触发）
const loadMoreMessages = async () => {
    if (loadingMessages.value || !hasMoreMessages.value || !oldestMessageId.value || !activeConversationId.value) {
        return;
    }
    
    try {
        loadingMessages.value = true;
        
        const response = await messageApi.getMessagesByPage(activeConversationId.value, oldestMessageId.value, 5);
        
        if (response.code === 200) {
            if (!response.data || response.data.length === 0) {
                hasMoreMessages.value = false;
                loadingMessages.value = false;
                return;
            }
            
            // 保存当前滚动位置
            const chatContent = chatContentRef.value?.$el;
            const scrollContainer = chatContent?.querySelector('.n-scrollbar-container') || 
                                  chatContent?.querySelector('.n-layout-scroll-container') ||
                                  chatContent?.firstElementChild;
            const oldScrollHeight = scrollContainer?.scrollHeight || 0;
            
            // 后端返回的是按id倒序的数据，反转后追加到前面
            const reversedData = [...response.data].reverse();
            
            // 将新加载的消息转换为前端格式
            const newMessages = reversedData.map(msgPair => 
                convertMessagePairToMessages(msgPair)
            ).flat();
            
            // 将新消息追加到列表开头
            messages.value = [...newMessages, ...messages.value];
            
            // 更新游标
            if (reversedData.length > 0) {
                oldestMessageId.value = reversedData[0].id;
            }
            
            // 如果返回的数据少于5条，说明没有更多历史消息了
            hasMoreMessages.value = response.data.length >= 5;
            
            // 等待DOM更新完成
            await nextTick();
            
            // 恢复滚动位置，避免页面跳动
            if (scrollContainer) {
                const newScrollHeight = scrollContainer.scrollHeight;
                scrollContainer.scrollTop = newScrollHeight - oldScrollHeight;
            }
            
            // 延迟重置加载状态，确保滚动位置设置完成后再允许 watch 触发
            setTimeout(() => {
                loadingMessages.value = false;
            }, 50);
        } else {
            message.error(`加载历史消息失败: ${response.message}`);
            loadingMessages.value = false;
        }
    } catch (error) {
        message.error(`加载历史消息失败: ${error.message}`);
        loadingMessages.value = false;
    }
};

// 准备新会话状态（不立即创建）
const prepareNewConversation = () => {
    // 取消当前选中的会话
    activeConversationId.value = null;
    // 清空消息列表
    messages.value = [];
    // 重置消息分页状态
    hasMoreMessages.value = true;
    oldestMessageId.value = null;
    isSwitchingConversation.value = false; // 重置切换标志
    // 不需要重置会话列表的分页状态，因为只是准备新会话，并未改变会话列表
};

// 创建新会话（实际创建）
const createNewConversation = async (firstQuestion = null) => {
    try {
        loading.value = true;
        const sessionData = {
            title: firstQuestion ? truncateTitle(firstQuestion) : `新会话 ${conversations.value.length + 1}`,
            isFavorite: 0,
            modelId: selectedModelId.value || 1, // 使用选中的模型ID，如果没有则使用默认值1
            tags: '',
            summary: ''
        };

        const response = await sessionApi.addSession(sessionData);
        if (response.code === 200) {
            const newId = response.data; // 后端返回插入的id
            const now = new Date();
            const dbTimeFormat = formatToDBTime(now); // 转换为数据库格式
            const newConversation = {
                id: newId,
                title: sessionData.title,
                lastMessage: '',
                time: now,
                messages: [],
                originalTitle: firstQuestion || sessionData.title,
                originalSummary: '',
                isFavorite: 0,
                tags: '',
                lastMessageTime: dbTimeFormat // 使用数据库格式的时间字符串
            };

            // 将新会话插入到列表顶部
            conversations.value.unshift(newConversation);
            activeConversationId.value = newId;
            message.success('已创建新会话');
            
            // 注意：新会话插入顶部后，不影响游标分页，因为游标基于最后一条的lastMessageTime
            
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
            // 从列表中移除已删除的会话
            conversations.value = conversations.value.filter(conv => conv.id !== convId);
            
            // 如果删除的是当前活动会话
            if (activeConversationId.value === convId) {
                if (conversations.value.length > 0) {
                    switchConversation(conversations.value[0].id);
                } else {
                    activeConversationId.value = null;
                    messages.value = [];
                    // 如果列表为空，重置分页状态
                    lastMessageTime.value = null;
                    hasMore.value = true;
                }
            }
            
            // 如果列表为空，重新加载初始数据
            if (conversations.value.length === 0) {
                await loadConversations();
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

// 处理键盘事件
const handleKeyDown = (event) => {
    // 如果按下的是Enter键
    if (event.key === 'Enter') {
        // 如果同时按下了Shift键，允许换行（不阻止默认行为）
        if (event.shiftKey) {
            return; // 允许默认的换行行为
        }
        // 如果只按下Enter键，阻止默认行为并发送消息
        event.preventDefault();
        if (!isGenerating.value && newMessage.value.trim() && selectedModelId.value) {
            sendMessage();
        }
    }
};

// 图片上传处理
const handleImageUpload = async ({ file, onFinish, onError }) => {
    try {
        isUploading.value = true;

        // 创建FormData
        const formData = new FormData();
        formData.append('file', file.file);

        // 调用上传API
        const response = await fetch('/api/system/file/fileUpload', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const result = await response.json();

        if (result.code === 200) {
            // 只添加当前上传的图片到列表
            const newImage = {
                id: Date.now() + Math.random(),
                url: result.data,
                name: file.name,
                size: file.size, // 添加文件大小用于去重
                status: 'success'
            };
            uploadedImages.value.push(newImage);
            message.success('图片上传成功');
            onFinish && onFinish();
        } else {
            message.error(`图片上传失败: ${result.message}`);
            onError && onError();
        }
    } catch (error) {
        console.error('图片上传失败:', error);
        message.error('图片上传失败');
        onError && onError();
    } finally {
        isUploading.value = false;
    }
};

// 移除已上传的图片
const removeImage = (imageId) => {
    uploadedImages.value = uploadedImages.value.filter(img => img.id !== imageId);
};

const sendMessage = async () => {
    if (!newMessage.value.trim()) return;

    // 检查是否已选择模型
    if (!selectedModelId.value) {
        message.error('请先选择一个模型');
        return;
    }

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

        // 立即清空输入框
        const messageContent = newMessage.value.trim();
        newMessage.value = '';

        // 构造图片 HTML（如果使用视觉模型且有图片）
        let imageHtml = '';
        if (uploadedImages.value.length > 0) {
            imageHtml = uploadedImages.value.map(img =>
                `<div style="margin-bottom: 8px;">
                        <img src="${img.url}" alt="${img.name}" 
                        class="chat-image-preview" 
                        style="max-width: 30%; 
                        border-radius: 8px;" />
                    </div>`
            ).join('');
        }
        // 构造完整消息内容
        const fullContent = imageHtml + (messageContent ? `${messageContent}` : '');

        // 添加用户消息到当前会话
        const userMsg = {
            id: `local-user-${Date.now()}`,
            sender: username.value,
            content: fullContent,
            time: new Date().toLocaleTimeString(),
            modelId: selectedModelId.value // 保存使用的模型ID
        };
        messages.value.push(userMsg);

        // 更新当前会话的最后消息和时间
        const currentConv = conversations.value.find(conv => conv.id === activeConversationId.value);
        if (currentConv) {
            currentConv.lastMessage = userMsg.content;
            currentConv.time = new Date();
            currentConv.messages = [...messages.value];
        }

        // 立即设置生成状态和加载动画，不等任何API返回
        isGenerating.value = true;
        statusMessage.value = '建立连接中';

        // 立即创建AI消息占位符
        const aiMsg = {
            id: `local-ai-${Date.now()}`,
            sender: 'AI助手',
            content: '',
            time: new Date().toLocaleTimeString(),
            isStreaming: true,
            messagePairId: null,
            modelId: selectedModelId.value
        };
        messages.value.push(aiMsg);
        scrollToBottom();

        // 准备发送的数据
        const sendData = {
            question: fullContent,
            sessionId: activeConversationId.value,
            modelId: selectedModelId.value, // 使用选中的模型ID
            conversationId: activeConversationId.value
        };

        // 如果是视觉模型且有上传的图片，添加图片URL列表
        if (isVisionModel.value && uploadedImages.value.length > 0) {
            sendData.urlList = uploadedImages.value.map(img => img.url);
        }

        // 先清空目前的上传列表
        const imagesToClear = [...uploadedImages.value];
        uploadedImages.value = [];

        // 发送消息到后端获取sessionId
        let response;
        try {
            response = await chatApi.sendMessage(sendData);
        } catch (error) {
            console.error('发送消息失败:', error);
            aiMsg.isStreaming = false;
            aiMsg.content = '发送消息失败，请检查网络或重试。';
            isGenerating.value = false;
            statusMessage.value = '';
            return;
        }

        if (response.code === 200) {
            const streamSessionId = response.data;
            currentStreamSessionId.value = streamSessionId;

            // 后台保存用户消息到数据库，不阻塞UI
            messageApi.addMessage({
                sessionId: activeConversationId.value,
                sseSessionId: streamSessionId,
                userContent: fullContent,
                aiContent: '',
                modelUsed: selectedModelId.value,
                status: 0,
                tokens: 0,
                createTime: new Date(),
                responseTime: null
            }).then(saveResponse => {
                if (saveResponse.code === 200) {
                    aiMsg.messagePairId = saveResponse.data;
                    console.log('用户消息已保存到数据库，消息对ID:', saveResponse.data);
                } else {
                    console.error('保存用户消息失败:', saveResponse.message);
                }
            }).catch(error => {
                console.error('保存用户消息失败:', error);
            });

            // 1. 先建立状态通知SSE连接（使用当前会话ID）
            console.log('准备建立状态通知SSE连接...');
            const statusEventSource = chatApi.createStatusSSEConnection(activeConversationId.value);
            currentStatusEventSource.value = statusEventSource;

            // 状态通知SSE消息处理
            statusEventSource.onmessage = (event) => {
                try {
                    const statusText = event.data;
                    if (statusText && statusText.trim()) {
                        console.log('接收到状态消息:', statusText);
                        statusMessage.value = statusText.trim();
                    }
                } catch (error) {
                    console.error('处理状态消息失败:', error);
                }
            };

            statusEventSource.onerror = (error) => {
                console.error('状态通知SSE连接错误:', error);
                statusEventSource.close();
                currentStatusEventSource.value = null;
            };

            statusEventSource.onopen = () => {
                console.log('状态通知SSE连接已建立');
            };

            // 监听状态通知流结束事件
            statusEventSource.addEventListener('close', () => {
                console.log('状态通知SSE流已结束');
                statusEventSource.close();
                currentStatusEventSource.value = null;
            });

            // 2. 建立AI回答SSE连接（使用推流sessionId）
            console.log('准备建立AI回答SSE连接...');
            const eventSource = chatApi.createSSEConnection(streamSessionId);
            currentEventSource.value = eventSource;

            eventSource.onmessage = (event) => {
                try {
                    // console.log('接收到SSE数据:', event.data); // 调试日志
                    // 后端直接发送文本内容，不是JSON格式
                    const text = event.data;
                    if (text && text.trim()) {
                        // 当开始接收到AI回答时，清空状态消息
                        if (statusMessage.value) {
                            statusMessage.value = '';
                        }
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
                console.error('AI回答SSE连接错误:', error);
                aiMsg.isStreaming = false;
                isGenerating.value = false;
                currentEventSource.value = null;
                currentStreamSessionId.value = null;
                statusMessage.value = ''; // 清空状态消息
                eventSource.close();

                // 同时关闭状态通知SSE
                if (currentStatusEventSource.value) {
                    currentStatusEventSource.value.close();
                    currentStatusEventSource.value = null;
                }

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
                console.log('AI回答SSE流已结束');
                aiMsg.isStreaming = false;
                isGenerating.value = false;
                currentEventSource.value = null;
                currentStreamSessionId.value = null;
                statusMessage.value = ''; // 清空状态消息
                eventSource.close();

                // 同时关闭状态通知SSE
                if (currentStatusEventSource.value) {
                    currentStatusEventSource.value.close();
                    currentStatusEventSource.value = null;
                }

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
                    statusMessage.value = ''; // 清空状态消息
                    aiMsg.content = '连接超时，请检查网络或重试。';
                    eventSource.close();
                    
                    // 同时关闭状态通知SSE
                    if (currentStatusEventSource.value) {
                        currentStatusEventSource.value.close();
                        currentStatusEventSource.value = null;
                    }
                    
                    message.warning('连接超时，请重试');
                }
            }, 30000); // 30秒超时

        } else {
            message.error(`发送失败: ${response.message}`);
            isGenerating.value = false;
            currentStreamSessionId.value = null;
            statusMessage.value = ''; // 清空状态消息
        }
    } catch (error) {
        message.error(`发送失败: ${error.message}`);
        isGenerating.value = false;
        currentStreamSessionId.value = null;
        statusMessage.value = ''; // 清空状态消息
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

    // 关闭前端AI回答SSE连接
    if (currentEventSource.value) {
        currentEventSource.value.close();
        currentEventSource.value = null;
    }

    // 关闭状态通知SSE连接
    if (currentStatusEventSource.value) {
        currentStatusEventSource.value.close();
        currentStatusEventSource.value = null;
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
    statusMessage.value = ''; // 清空状态消息
    message.info('已停止生成');
};



// 预处理消息内容（处理HTML转义字符）
const preprocessContent = (content) => {
    if (!content) return '';
    const contentStr = typeof content === 'string' ? content : String(content);
    return contentStr
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
};

// 处理图片点击事件
const handleImageClick = (event) => {
    // 检查点击的元素是否是图片
    if (event.target.tagName === 'IMG' && event.target.classList.contains('chat-image-preview')) {
        previewImageUrl.value = event.target.src;
        showImageModal.value = true;
    }
};

// 全局搜索相关方法
const openSearchModal = () => {
    showSearchModal.value = true;
    // 清空之前的搜索状态
    searchKeyword.value = '';
    searchResults.value = [];
    isSearching.value = false;
    searchLoading.value = false;
};

const handleSearchInput = () => {
    // 清除之前的定时器
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    // 如果搜索关键词为空，清空搜索结果
    if (!searchKeyword.value.trim()) {
        searchResults.value = [];
        searchLoading.value = false;
        return;
    }

    // 设置防抖，500ms后执行搜索
    searchTimeout = setTimeout(() => {
        performGlobalSearch();
    }, 500);
};

const performGlobalSearch = async () => {
    if (!searchKeyword.value.trim()) {
        return;
    }

    try {
        searchLoading.value = true;
        isSearching.value = true;

        const response = await messageApi.globalQuery(searchKeyword.value.trim());

        if (response.code === 200) {
            searchResults.value = response.data || [];
        } else {
            message.error(`搜索失败: ${response.message}`);
            searchResults.value = [];
        }
    } catch (error) {
        message.error(`搜索失败: ${error.message}`);
        searchResults.value = [];
    } finally {
        searchLoading.value = false;
    }
};

const clearSearch = () => {
    searchKeyword.value = '';
    searchResults.value = [];
    isSearching.value = false;
    searchLoading.value = false;
    showSearchModal.value = false;

    if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
    }
};

// 获取匹配内容的优先级和类型
const getMatchedContent = (result) => {
    if (!searchKeyword.value.trim()) {
        return { type: 'user', content: result.userContent };
    }

    const keyword = searchKeyword.value.trim().toLowerCase();
    const userContent = result.userContent || '';
    const aiContent = result.aiContent || '';

    const userMatches = userContent.toLowerCase().includes(keyword);
    const aiMatches = aiContent.toLowerCase().includes(keyword);

    // 如果用户内容匹配，显示用户内容（即使AI内容也匹配）
    if (userMatches) {
        return {
            type: 'user',
            content: userContent
        };
    }

    // 如果只有AI内容匹配
    if (aiMatches) {
        return {
            type: 'ai',
            content: aiContent
        };
    }

    // 如果都不匹配，默认显示用户内容
    return {
        type: 'user',
        content: '......' + userContent
    };
};

const highlightKeyword = (text) => {
    if (!text || !searchKeyword.value.trim()) {
        return text;
    }

    const keyword = searchKeyword.value.trim();
    const regex = new RegExp(`(${keyword})`, 'gi');

    // 限制显示长度，避免过长的文本
    let displayText = text;
    if (text.length > 100) {
        const keywordIndex = text.toLowerCase().indexOf(keyword.toLowerCase());
        if (keywordIndex !== -1) {
            const start = Math.max(0, keywordIndex - 30);
            const end = Math.min(text.length, keywordIndex + keyword.length + 30);
            displayText = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
        } else {
            displayText = text.substring(0, 100) + '...';
        }
    }

    return displayText.replace(regex, '<mark>$1</mark>');
};

const jumpToMessage = async (result) => {
    try {
        // 关闭搜索Modal
        showSearchModal.value = false;

        // 如果当前不在对应的会话中，先切换到对应会话
        if (activeConversationId.value !== result.sessionId) {
            await switchConversation(result.sessionId);
        }

        // 清空搜索状态
        searchKeyword.value = '';
        searchResults.value = [];
        isSearching.value = false;
        searchLoading.value = false;
        if (searchTimeout) {
            clearTimeout(searchTimeout);
            searchTimeout = null;
        }

        // 等待DOM更新后滚动到对应消息
        await nextTick();

        // 查找对应的用户和AI消息元素
        const userMessageId = `user-${result.id}`;
        const aiMessageId = `ai-${result.id}`;

        const userElement = document.querySelector(`[data-message-id='${userMessageId}']`);
        const aiElement = document.querySelector(`[data-message-id='${aiMessageId}']`);

        let scrolled = false;

        const highlightElement = (element) => {
            if (element) {
                // 优先滚动到用户消息，如果用户消息不存在，则滚动到AI消息
                if (!scrolled) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    scrolled = true;
                }
                element.classList.add('highlight');
                setTimeout(() => {
                    element.classList.remove('highlight');
                }, 3000); // 3秒后移除高亮提示
            }
        };

        // 高亮用户和AI消息
        highlightElement(userElement);
        highlightElement(aiElement);

        if (scrolled) {
            message.success('已跳转到相关消息');
        } else {
            message.error('未能在当前会话中找到该消息，可能已被删除或更新。');
        }
    } catch (error) {
        message.error(`跳转失败: ${error.message}`);
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