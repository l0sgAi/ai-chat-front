<template>
    <n-config-provider :theme="darkTheme">
        <div class="config-container dark-theme">
            <!-- 头部 -->
            <n-layout-header bordered class="config-header">
                <div class="header-content">
                    <n-space align="center">
                        <n-button quaternary circle @click="goBack">
                            <template #icon>
                                <n-icon><arrow-back-outline /></n-icon>
                            </template>
                        </n-button>
                        <h2>AI配置管理</h2>
                    </n-space>
                </div>
            </n-layout-header>

            <!-- 内容区域 -->
            <div class="config-content">
                <!-- 搜索栏 -->
                <div class="search-bar">
                    <n-space>
                        <n-input v-model:value="searchKeyword" placeholder="搜索配置..." clearable
                            @keyup.enter="loadConfigs" style="width: 300px;">
                            <template #prefix>
                                <n-icon><search-outline /></n-icon>
                            </template>
                        </n-input>
                        <n-button type="primary" @click="loadConfigs">
                            搜索
                        </n-button>

                        <n-button type="primary" @click="handleAddConfig">
                            <template #icon>
                                <n-icon><add-outline /></n-icon>
                            </template>
                            新增配置
                        </n-button>
                    </n-space>
                </div>

                <!-- 配置表格 -->
                <div class="table-container">
                    <n-data-table :columns="columns" :data="configs" :loading="loading" :pagination="pagination"
                        :bordered="false" size="small" class="config-table" />
                </div>
            </div>

            <!-- 新增/编辑配置模态框 -->
            <n-modal v-model:show="showAddModal" preset="dialog" title="配置信息" style="width: 800px;">
                <template #header>
                    <span>{{ editingConfig ? '编辑配置' : '新增配置' }}</span>
                </template>
                <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="left" label-width="120px"
                    require-mark-placement="right-hanging">
                    <div class="form-grid">
                        <n-form-item label="显示名称" path="displayName">
                            <n-input v-model:value="formData.displayName" placeholder="请输入显示名称" />
                        </n-form-item>
                        <n-form-item label="模型名称" path="modelName">
                            <n-input v-model:value="formData.modelName" placeholder="请输入模型名称" />
                        </n-form-item>
                        <n-form-item label="API域名" path="apiDomain" class="full-width">
                            <n-input v-model:value="formData.apiDomain" placeholder="请输入API域名" />
                        </n-form-item>
                        <n-form-item label="模型类型" path="modelType">
                            <n-select v-model:value="formData.modelType" :options="modelTypeOptions"
                                placeholder="请选择模型类型" />
                        </n-form-item>
                        <n-form-item label="模型ID" path="modelId">
                            <n-input v-model:value="formData.modelId" placeholder="请输入模型ID" />
                        </n-form-item>
                        <n-form-item label="API密钥" path="apiKey" class="full-width">
                            <n-input v-model:value="formData.apiKey" type="password" placeholder="请输入API密钥"
                                show-password-on="click" />
                        </n-form-item>
                    </div>

                    <div class="parameter-group">
                        <div class="parameter-group-title">模型参数配置</div>
                        <div class="form-grid">
                            <n-form-item label="最大上下文消息数" path="maxContextMsgs">
                                <n-input-number v-model:value="formData.maxContextMsgs" placeholder="请输入最大上下文消息数"
                                    :min="1" />
                            </n-form-item>
                            <n-form-item label="相似度TopP" path="similarityTopP">
                                <n-input-number v-model:value="formData.similarityTopP" placeholder="请输入TopP值(0-1之间)"
                                    :step="0.01" />
                            </n-form-item>
                            <n-form-item label="随机度Temperature" path="temperature">
                                <n-input-number v-model:value="formData.temperature" placeholder="请输入Temperature值"
                                    :step="0.01" />
                            </n-form-item>
                            <n-form-item label="相似度TopK" path="similarityTopK">
                                <n-input-number v-model:value="formData.similarityTopK" placeholder="请输入TopK值"
                                    :min="1" />
                            </n-form-item>
                        </div>
                    </div>

                    <div class="form-grid">
                        <n-form-item label="是否为默认模型" path="isDefault">
                            <n-select v-model:value="formData.isDefault" :options="defaultOptions"
                                placeholder="请选择是否为默认" />
                        </n-form-item>
                        <n-form-item label="是否启用" path="isEnabled">
                            <n-select v-model:value="formData.isEnabled" :options="enabledOptions"
                                placeholder="请选择是否启用" />
                        </n-form-item>
                        <n-form-item label="标签" path="caseTags" class="full-width">
                            <n-input v-model:value="formData.caseTags" placeholder="请输入标签，多个标签用逗号分隔" />
                        </n-form-item>
                        <n-form-item label="简介" path="caseBrief" class="full-width">
                            <n-input v-model:value="formData.caseBrief" type="textarea" placeholder="请输入简介"
                                :autosize="{ minRows: 2, maxRows: 4 }" />
                        </n-form-item>
                        <n-form-item label="备注" path="caseRemark" class="full-width">
                            <n-input v-model:value="formData.caseRemark" type="textarea" placeholder="请输入备注"
                                :autosize="{ minRows: 2, maxRows: 4 }" />
                        </n-form-item>
                    </div>
                </n-form>
                <template #action>
                    <n-space>
                        <n-button @click="showAddModal = false">取消</n-button>
                        <n-button type="primary" @click="handleSubmit" :loading="submitting">
                            {{ editingConfig ? '更新' : '创建' }}
                        </n-button>
                    </n-space>
                </template>
            </n-modal>
        </div>
    </n-config-provider>
</template>

<script setup>
import { ref, onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, darkTheme } from 'naive-ui';
import {
    NConfigProvider,
    NLayout,
    NLayoutHeader,
    NLayoutContent,
    NButton,
    NInput,
    NInputNumber,
    NDataTable,
    NSpace,
    NIcon,
    NModal,
    NForm,
    NFormItem,
    NSelect,
    NPopconfirm,
    NTag
} from 'naive-ui';
import {
    ArrowBackOutline,
    AddOutline,
    SearchOutline,
    CreateOutline,
    TrashOutline,
    CopyOutline
} from '@vicons/ionicons5';
import { configApi } from '../api';
import '../assets/css/config.css';

const router = useRouter();
const message = useMessage();

// 响应式数据
const configs = ref([]);
const loading = ref(false);
const searchKeyword = ref('');
const showAddModal = ref(false);
const editingConfig = ref(null);
const submitting = ref(false);
const formRef = ref(null);

// 分页配置
const pagination = ref({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page) => {
        pagination.value.page = page;
        loadConfigs();
    },
    onUpdatePageSize: (pageSize) => {
        pagination.value.pageSize = pageSize;
        pagination.value.page = 1;
        loadConfigs();
    }
});

// 表单数据
const formData = ref({
    displayName: '',
    apiDomain: '',
    modelName: '',
    modelType: 0,
    modelId: '',
    apiKey: '',
    maxContextMsgs: 10,
    similarityTopP: 0.9,
    temperature: 0.7,
    similarityTopK: 40,
    isDefault: 0,
    caseTags: '',
    caseBrief: '',
    caseRemark: '',
    isEnabled: 0
});

// 表单验证规则
const formRules = {
    displayName: {
        required: true,
        message: '请输入显示名称',
        trigger: ['input', 'blur']
    },
    apiDomain: {
        required: true,
        message: '请输入API域名',
        trigger: ['input', 'blur']
    },
    modelName: {
        required: true,
        message: '请输入模型名称',
        trigger: ['input', 'blur']
    },
    modelType: {
        required: true,
        type: 'number',
        message: '请选择模型类型',
        trigger: ['change', 'blur']
    },
    modelId: {
        required: true,
        message: '请输入模型ID',
        trigger: ['input', 'blur']
    },
    apiKey: {
        required: true,
        message: '请输入API密钥',
        trigger: ['input', 'blur']
    },
    maxContextMsgs: {
        required: true,
        type: 'number',
        message: '请输入最大上下文消息数',
        trigger: ['change', 'blur']
    },
    isDefault: {
        required: true,
        type: 'number',
        message: '请选择是否为默认模型',
        trigger: ['change', 'blur']
    },
    isEnabled: {
        required: true,
        type: 'number',
        message: '请选择是否启用',
        trigger: ['change', 'blur']
    }
};

// 模型类型选项
const modelTypeOptions = [
    { label: '大模型', value: 0 },
    { label: '文本向量', value: 1 },
    { label: '视觉模型', value: 2 }
];

// 默认模型选项
const defaultOptions = [
    { label: '是', value: 1 },
    { label: '否', value: 0 }
];

// 启用状态选项
const enabledOptions = [
    { label: '启用', value: 0 },
    { label: '禁用', value: 1 }
];

// API密钥脱敏显示
const maskApiKey = (apiKey) => {
    if (!apiKey || apiKey.length <= 6) return apiKey;
    const start = apiKey.substring(0, 3);
    const end = apiKey.substring(apiKey.length - 3);
    return `${start}******${end}`;
};

// 复制API密钥
const copyApiKey = async (apiKey) => {
    try {
        await navigator.clipboard.writeText(apiKey);
        message.success('API密钥已复制到剪贴板');
    } catch (error) {
        message.error('复制失败');
    }
};

// 获取模型类型标签
const getModelTypeTag = (type) => {
    const typeMap = {
        0: { label: '大模型', class: 'model-type-0' },
        1: { label: '文本向量', class: 'model-type-1' },
        2: { label: '视觉模型', class: 'model-type-2' }
    };
    return typeMap[type] || { label: '未知', class: 'model-type-0' };
};

// 表格列配置
const columns = [
    {
        title: 'ID',
        key: 'id',
    },
    {
        title: '显示名称',
        key: 'displayName',
        ellipsis: {
            tooltip: true
        }
    },
    {
        title: '模型名称',
        key: 'modelName',
        ellipsis: {
            tooltip: true
        }
    },
    {
        title: '模型唯一ID',
        key: 'modelId',
        width: 150,
        ellipsis: {
            tooltip: true
        }
    }
    ,
    {
        title: '模型类型',
        key: 'modelType',
        render(row) {
            const typeInfo = getModelTypeTag(row.modelType);
            return h(
                'span',
                {
                    class: `model-type-tag ${typeInfo.class}`
                },
                typeInfo.label
            );
        }
    },
    {
        title: 'API域名',
        key: 'apiDomain',
        ellipsis: {
            tooltip: true
        }
    },
    {
        title: 'API密钥',
        key: 'apiKey',
        render(row) {
            return h(
                'div',
                { class: 'api-key-display' },
                [
                    h(
                        'span',
                        { class: 'api-key-text' },
                        maskApiKey(row.apiKey)
                    ),
                    h(
                        NButton,
                        {
                            size: 'tiny',
                            type: 'primary',
                            secondary: true,
                            class: 'copy-button',
                            onClick: () => copyApiKey(row.apiKey)
                        },
                        {
                            icon: () => h(NIcon, null, { default: () => h(CopyOutline) })
                        }
                    )
                ]
            );
        }
    },
    {
        title: '是否默认',
        key: 'isDefault',
        render(row) {
            return h(
                NTag,
                {
                    type: row.isDefault === 1 ? 'success' : 'default',
                    size: 'small'
                },
                row.isDefault === 1 ? '默认' : '普通'
            );
        }
    },
    {
        title: '状态',
        key: 'isEnabled',
        render(row) {
            return h(
                NTag,
                {
                    type: row.isEnabled === 0 ? 'success' : 'error',
                    size: 'small'
                },
                row.isEnabled === 0 ? '启用' : '禁用'
            );
        }
    },
    {
        title: '创建时间',
        key: 'createTime',
        sorter: (row1, row2) => new Date(row1.createTime).getTime() - new Date(row2.createTime).getTime(),
        render(row) {
            return row.createTime ? new Date(row.createTime).toLocaleString() : '-';
        }
    },
    {
        title: '操作',
        key: 'actions',
        render(row) {
            return h(NSpace, null, {
                default: () => [
                    h(
                        NButton,
                        {
                            size: 'small',
                            type: 'primary',
                            secondary: true,
                            onClick: () => editConfig(row)
                        },
                        {
                            default: () => '编辑',
                            icon: () => h(NIcon, null, { default: () => h(CreateOutline) })
                        }
                    ),
                    h(
                        NPopconfirm,
                        {
                            onPositiveClick: () => deleteConfig(row.id),
                            positiveText: '确认',
                            negativeText: '取消'
                        },
                        {
                            trigger: () => h(
                                NButton,
                                {
                                    size: 'small',
                                    type: 'error',
                                    secondary: true
                                },
                                {
                                    default: () => '删除',
                                    icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
                                }
                            ),
                            default: () => `确定要删除配置 "${row.displayName}" 吗？此操作不可撤销。`
                        }
                    )
                ]
            });
        }
    }
];

// 加载配置列表
const loadConfigs = async () => {
    try {
        loading.value = true;
        const params = {
            keyWord: searchKeyword.value || undefined,
            pageNum: pagination.value.page,
            pageSize: pagination.value.pageSize
        };

        const response = await configApi.queryConfigs(params);
        if (response.code === 200) {
            configs.value = response.data || [];
            pagination.value.itemCount = response.total || 0;
        } else {
            message.error(`加载配置失败: ${response.message}`);
        }
    } catch (error) {
        message.error(`加载配置失败: ${error.message}`);
    } finally {
        loading.value = false;
    }
};

// 重置表单
const resetForm = () => {
    formData.value = {
        displayName: '',
        apiDomain: '',
        modelName: '',
        modelType: 0,
        modelId: '',
        apiKey: '',
        maxContextMsgs: 10,
        similarityTopP: 0.9,
        temperature: 0.7,
        similarityTopK: 40,
        isDefault: 0,
        caseTags: '',
        caseBrief: '',
        caseRemark: '',
        isEnabled: 0
    };
    editingConfig.value = null;
};

// 处理新增配置
const handleAddConfig = () => {
    resetForm();
    showAddModal.value = true;
};

// 编辑配置
const editConfig = (config) => {
    editingConfig.value = config;
    formData.value = {
        id: config.id,
        displayName: config.displayName || '',
        apiDomain: config.apiDomain || '',
        modelName: config.modelName || '',
        modelType: config.modelType || 0,
        modelId: config.modelId || '',
        apiKey: config.apiKey || '',
        maxContextMsgs: config.maxContextMsgs || 10,
        similarityTopP: config.similarityTopP || 0.9,
        temperature: config.temperature || 0.7,
        similarityTopK: config.similarityTopK || 40,
        isDefault: config.isDefault || 0,
        caseTags: config.caseTags || '',
        caseBrief: config.caseBrief || '',
        caseRemark: config.caseRemark || '',
        isEnabled: config.isEnabled || 0
    };
    showAddModal.value = true;
};

// 提交表单
const handleSubmit = async () => {
    try {
        await formRef.value?.validate();
        submitting.value = true;

        let response;
        if (editingConfig.value) {
            // 更新配置
            response = await configApi.updateConfig(formData.value);
        } else {
            // 新增配置
            response = await configApi.addConfig(formData.value);
        }

        if (response.code === 200) {
            message.success(editingConfig.value ? '更新成功' : '创建成功');
            showAddModal.value = false;
            resetForm();
            loadConfigs();
        } else {
            message.error(response.message || '操作失败');
        }
    } catch (error) {
        if (error?.errors) {
            // 表单验证错误
            return;
        }
        message.error(`操作失败: ${error.message}`);
    } finally {
        submitting.value = false;
    }
};

// 删除配置
const deleteConfig = async (id) => {
    try {
        const response = await configApi.deleteConfig(id);
        if (response.code === 200) {
            message.success('删除成功');
            loadConfigs();
        } else {
            message.error(`删除失败: ${response.message}`);
        }
    } catch (error) {
        message.error(`删除失败: ${error.message}`);
    }
};

// 返回上一页
const goBack = () => {
    router.back();
};

// 监听模态框关闭
const handleModalClose = () => {
    resetForm();
};

// 组件挂载时加载数据
onMounted(() => {
    loadConfigs();
});
</script>

<style scoped>
/* 样式已移至独立的CSS文件 */
</style>