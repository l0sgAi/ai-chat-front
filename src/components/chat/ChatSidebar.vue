<template>
    <n-layout-sider bordered content-style="padding: 0;" class="chat-sidebar" style="height: 100dvh;">
        <div class="chat-sidebar-header">
            <span class="chat-sidebar-title">会话列表</span>
            <n-space :size="4">
                <n-button quaternary circle @click="$emit('open-search')">
                    <template #icon>
                        <n-icon><search-outline /></n-icon>
                    </template>
                </n-button>
                <n-button quaternary circle @click="$emit('create-new')">
                    <template #icon>
                        <n-icon><add-outline /></n-icon>
                    </template>
                </n-button>
            </n-space>
        </div>

        <!-- 会话列表 -->
        <div class="conversation-list" ref="conversationListRef" @scroll="handleScroll">
            <template v-if="loading">
                <div class="loading-container">
                    <n-spin size="small" />
                    <span>加载中...</span>
                </div>
            </template>

            <template v-else-if="conversations.length > 0">
                <div v-for="conv in conversations" :key="conv.id"
                    :class="['conversation-item', activeConversationId === conv.id ? 'active' : '']"
                    @click="$emit('select-conversation', conv.id)">
                    <n-space justify="space-between" align="left" style="width: 100%;">
                        <div
                            style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; width: 100%;">
                            <div class="conversation-title" :title="conv.originalTitle">
                                <n-space align="left" :wrap="false" size="small" style="width: 100%; min-width: 0;">
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
                            <n-popconfirm @positive-click="$emit('delete-conversation', conv.id)" positive-text="确认"
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
</template>

<script setup>
import { ref } from 'vue';
import { NLayoutSider, NSpace, NButton, NIcon, NSpin, NPopconfirm, NTime, NEmpty } from 'naive-ui';
import { SearchOutline, AddOutline, ChatbubbleOutline, Star, TrashOutline } from '@vicons/ionicons5';

const props = defineProps({
    conversations: {
        type: Array,
        default: () => []
    },
    activeConversationId: {
        type: [String, Number],
        default: null
    },
    loading: {
        type: Boolean,
        default: false
    },
    loadingMore: {
        type: Boolean,
        default: false
    },
    hasMore: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits(['select-conversation', 'delete-conversation', 'load-more', 'create-new', 'open-search']);

const conversationListRef = ref(null);

const handleScroll = (event) => {
    const container = event.target;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // 当滚动到底部附近（距离底部50px以内）时加载更多
    if (scrollHeight - scrollTop - clientHeight < 50) {
        emit('load-more');
    }
};
</script>

<style scoped>
/* Styles are inherited from global chat.css or parent */
</style>
