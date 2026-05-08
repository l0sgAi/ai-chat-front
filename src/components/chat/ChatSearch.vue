<template>
    <n-config-provider :theme="darkTheme">
        <n-modal :show="show" @update:show="$emit('update:show', $event)" preset="card" class="search-modal"
            title="全局搜索" style="max-width: 60vw;">
            <div class="search-modal-content">
                <!-- 搜索输入框 -->
                <div class="search-input-section">
                    <n-input :value="keyword" @update:value="handleInput" placeholder="搜索消息内容..." clearable
                        @clear="$emit('clear')" size="medium" class="search-modal-input">
                        <template #prefix>
                            <n-icon><search-outline /></n-icon>
                        </template>
                    </n-input>
                </div>

                <!-- 搜索结果区域 -->
                <div class="search-results-section">
                    <!-- 搜索结果列表 -->
                    <div v-if="results.length > 0" class="search-results">
                        <div class="search-results-header">
                            <span>搜索结果 ({{ results.length }})</span>
                        </div>
                        <div class="search-results-list">
                            <div v-for="result in results" :key="result.id" class="search-result-item"
                                @click="$emit('jump', result)">
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
                                    <span v-if="result.modelUsed" class="search-model-name">{{
                                        getModelName(result.modelUsed) }}</span>
                                    <n-time :time="new Date(result.createTime)" format="MM-dd HH:mm" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 无搜索结果提示 -->
                    <div v-if="keyword && results.length === 0 && !loading" class="no-search-results">
                        <n-empty description="无搜索结果">
                            <template #icon>
                                <n-icon>
                                    <AlertCircleSharp />
                                </n-icon>
                            </template>
                        </n-empty>
                    </div>

                    <!-- 搜索加载状态 -->
                    <div v-if="loading" class="search-loading">
                        <n-spin size="medium" />
                        <span>搜索中...</span>
                    </div>

                    <!-- 初始状态提示 -->
                    <div v-if="!keyword && results.length === 0 && !loading" class="search-placeholder">
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
import { NConfigProvider, NModal, NInput, NIcon, NSpin, NEmpty, NTime, darkTheme } from 'naive-ui';
import { SearchOutline, PersonOutline, ChatbubbleOutline, AlertCircleSharp, FileTrayFullSharp } from '@vicons/ionicons5';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    keyword: {
        type: String,
        default: ''
    },
    results: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    modelsData: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['update:show', 'update:keyword', 'search', 'clear', 'jump']);

const handleInput = (value) => {
    emit('update:keyword', value);
    emit('search', value);
};

// 获取匹配内容的优先级和类型
const getMatchedContent = (result) => {
    if (!props.keyword.trim()) {
        return { type: 'user', content: result.userContent };
    }

    const keyword = props.keyword.trim().toLowerCase();
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
    if (!text || !props.keyword.trim()) {
        return text;
    }

    const keyword = props.keyword.trim();
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

const getModelName = (modelId) => {
    if (!modelId) return '';
    const model = props.modelsData.find(m => m.id === modelId);
    return model ? model.displayName : `模型${modelId}`;
};
</script>

<style scoped>
/* Styles are inherited from global chat.css or parent */
</style>
