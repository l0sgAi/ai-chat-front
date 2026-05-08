<template>
    <n-layout-content ref="chatContentRef" class="chat-messages" @click="handleImageClick" @scroll="handleScroll">
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
                            <n-icon size="16" style="margin-right: 4px;">
                                <person-outline v-if="msg.sender === username" />
                                <chatbubble-outline v-else />
                            </n-icon>
                            <span class="message-sender">{{ msg.sender }}</span>
                            <span v-if="msg.modelId" class="model-tag">{{ getModelName(msg.modelId) }}</span>
                        </div>
                        <span class="message-time">{{ msg.time }}</span>
                    </div>
                    <div class="message-content markdown-body" v-html="formatMessageContent(msg.content)"></div>
                    <div v-if="msg.isStreaming" class="typing-indicator">
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
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { NLayoutContent, NSpin, NEmpty, NIcon } from 'naive-ui';
import { PersonOutline, ChatbubbleOutline } from '@vicons/ionicons5';
import { Marked } from 'marked';
import hljs from 'highlight.js';
import { markedHighlight } from "marked-highlight";
import katex from 'katex';

const props = defineProps({
    messages: {
        type: Array,
        default: () => []
    },
    loadingMessages: {
        type: Boolean,
        default: false
    },
    hasMoreMessages: {
        type: Boolean,
        default: true
    },
    username: {
        type: String,
        default: '用户'
    },
    modelsData: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['load-more', 'image-click']);

const chatContentRef = ref(null);

const handleScroll = (event) => {
    const container = event.target;
    const scrollTop = container.scrollTop;

    // 当滚动到顶部附近（距离顶部50px以内）时加载更早的消息
    if (scrollTop < 50) {
        emit('load-more');
    }
};

const handleImageClick = (event) => {
    // 检查点击的元素是否是图片
    if (event.target.tagName === 'IMG' && event.target.classList.contains('chat-image-preview')) {
        emit('image-click', event.target.src);
    }
};

const getModelName = (modelId) => {
    if (!modelId) return '';
    const model = props.modelsData.find(m => m.id === modelId);
    return model ? model.displayName : `模型${modelId}`;
};

// 渲染数学公式的辅助函数
const renderMath = (text) => {
    // 先处理块级公式 $$...$$
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
        try {
            const rendered = katex.renderToString(formula.trim(), {
                displayMode: true,
                throwOnError: false,
                strict: false
            });
            return `<div class="math-block">${rendered}</div>`;
        } catch (error) {
            console.warn('块级数学公式渲染失败:', error, formula);
            return `<div class="math-error">$$${formula}$$</div>`;
        }
    });

    // 再处理行内公式 $...$（避免与已处理的块级公式冲突）
    text = text.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (match, formula) => {
        try {
            const rendered = katex.renderToString(formula.trim(), {
                displayMode: false,
                throwOnError: false,
                strict: false
            });
            return `<span class="math-inline">${rendered}</span>`;
        } catch (error) {
            console.warn('行内数学公式渲染失败:', error, formula);
            return `<span class="math-error">$${formula}$</span>`;
        }
    });

    return text;
};

// 格式化消息内容
const formatMessageContent = (content) => {
    if (!content) return '';

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

        // 先渲染数学公式（在Markdown解析之前）
        processedContent = renderMath(processedContent);

        // 使用marked解析Markdown
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

        return html;
    } catch (error) {
        console.error('Markdown解析失败:', error, '输入内容:', contentStr);
        // 降级到简单的文本替换
        try {
            const fallbackStr = typeof content === 'string' ? content : String(content);
            let fallbackContent = fallbackStr
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

            // 即使在降级模式下也尝试渲染数学公式
            fallbackContent = renderMath(fallbackContent);
            return fallbackContent;
        } catch (fallbackError) {
            console.error('降级处理也失败:', fallbackError);
            return String(content || '');
        }
    }
};

// Expose scrollToBottom to parent
const scrollToBottom = (instant = false) => {
    const layoutInst = chatContentRef.value;
    if (layoutInst) {
        const scrollContainer = layoutInst.$el; 
        if (scrollContainer) {
            const actualScrollContainer = scrollContainer.querySelector('.n-scrollbar-container') ||
                scrollContainer.querySelector('.n-layout-scroll-container') ||
                scrollContainer.querySelector('[class*="scroll"]') ||
                scrollContainer.firstElementChild;
            if (actualScrollContainer) {
                actualScrollContainer.scrollTo({
                    top: actualScrollContainer.scrollHeight,
                    behavior: instant ? 'auto' : 'smooth'
                });
            }
        }
    }
};

defineExpose({ scrollToBottom });
</script>

<style scoped>
/* Styles are inherited from global chat.css or parent */
</style>
