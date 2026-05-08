<template>
    <n-layout-footer bordered class="chat-input-container">
        <div class="chat-input-section">
            <!-- 上半部分：输入框 -->
            <div class="input-area">
                <n-input :value="modelValue" @update:value="$emit('update:modelValue', $event)" type="textarea"
                    placeholder="输入消息..." @keydown="handleKeyDown" class="chat-input"
                    :autosize="{ minRows: 2, maxRows: 4 }" :bordered="false" />
            </div>

            <!-- 图片预览区域（仅在视觉模型且有上传图片时显示） -->
            <div v-if="isVisionModel && uploadedImages.length > 0" class="image-preview-area">
                <n-space size="small">
                    <div v-for="image in uploadedImages" :key="image.id" class="uploaded-image-item">
                        <div class="image-container">
                            <n-image :src="image.url" :alt="image.name" width="200" height="200" object-fit="cover" />
                            <n-button size="tiny" quaternary circle class="remove-image-btn"
                                @click="$emit('remove-image', image.id)"
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
                            <n-select :value="selectedModelId" @update:value="$emit('update:selectedModelId', $event)"
                                :options="modelOptions" placeholder="选择模型" size="small" style="width: 180px;"
                                :loading="modelsLoading" />
                            <!-- 视觉模型时显示图片上传按钮 -->
                            <n-upload v-if="isVisionModel" :custom-request="handleImageUpload" accept="image/*"
                                :show-file-list="false" multiple>
                                <n-button ghost="true" size="small" type="primary" secondary :loading="isUploading">
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
                                :disabled="(!isGenerating && !modelValue.trim()) || !selectedModelId"
                                @click="isGenerating ? $emit('stop') : $emit('send')" class="send-button">
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
</template>

<script setup>
import { NLayoutFooter, NInput, NSpace, NButton, NIcon, NSelect, NUpload, NImage } from 'naive-ui';
import { SendOutline, StopOutline, ImageOutline, CloseOutline } from '@vicons/ionicons5';

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    isVisionModel: {
        type: Boolean,
        default: false
    },
    uploadedImages: {
        type: Array,
        default: () => []
    },
    modelOptions: {
        type: Array,
        default: () => []
    },
    selectedModelId: {
        type: [String, Number],
        default: null
    },
    modelsLoading: {
        type: Boolean,
        default: false
    },
    isUploading: {
        type: Boolean,
        default: false
    },
    isGenerating: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits([
    'update:modelValue',
    'update:selectedModelId',
    'send',
    'stop',
    'upload-image',
    'remove-image'
]);

const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
        if (event.shiftKey) {
            return;
        }
        event.preventDefault();
        if (!props.isGenerating && props.modelValue.trim() && props.selectedModelId) {
            emit('send');
        }
    }
};

const handleImageUpload = (options) => {
    emit('upload-image', options);
};
</script>

<style scoped>
/* Styles are inherited from global chat.css or parent */
</style>
