<template>
    <div class="kb-knowledge-base-container">
        <!-- 操作栏 -->
        <div class="kb-action-bar">
            <n-space>
                <n-button type="primary" @click="showKbAddModal = true">
                        <n-icon><add-outline /></n-icon>
                    新增文档
                </n-button>
                <n-button type="info" @click="handleBatchSync" :disabled="checkedRowKeys.length === 0">
                        <n-icon><cloud-upload-outline /></n-icon>
                    批量同步 ({{ checkedRowKeys.length }})
                </n-button>
                <n-button type="error" @click="handleBatchDelete" :disabled="checkedRowKeys.length === 0">
                        <n-icon><trash-outline /></n-icon>
                    批量删除
                </n-button>
            </n-space>
        </div>

        <!-- 查询条件 -->
        <div class="kb-search-bar">
            <n-space>
                <n-input
                    v-model:value="queryParams.keyword"
                    placeholder="请输入标题或文档ID"
                    clearable
                    style="width: 300px"
                >
                    <template #prefix>
                        <n-icon><search-outline /></n-icon>
                    </template>
                </n-input>

                <n-select
                    v-model:value="queryParams.status"
                    placeholder="选择状态"
                    clearable
                    :options="statusOptions"
                    style="width: 150px;"
                    />

                <n-date-picker
                    v-model:value="queryParams.dateRange"
                    type="datetimerange"
                    clearable
                    format="yyyy-MM-dd HH:mm"
                    style="width: 380px"
                />

                <n-button type="primary" @click="handleQuery">
                        <n-icon><search-outline /></n-icon>
                    查询
                </n-button>

                <n-button @click="handleReset">
                        <n-icon><refresh-outline /></n-icon>
                    重置
                </n-button>
            </n-space>
        </div>

        <!-- 知识库表格 -->
        <div class="kb-table-container">
            <n-data-table
                :columns="columns"
                :data="tableData"
                :pagination="pagination"
                :row-key="rowKey"
                :checked-row-keys="checkedRowKeys"
                @update:checked-row-keys="handleCheck"
                :loading="tableLoading"
                :bordered="false"
                size="small"
            />
            
            <!-- 加载更多按钮 -->
            <div v-if="hasMore && tableData.length > 0" class="kb-load-more">
                <n-button 
                    @click="loadMoreData" 
                    :loading="tableLoading"
                    :disabled="tableLoading"
                    size="medium"
                >
                    加载更多
                </n-button>
            </div>
            
            <!-- 没有更多数据提示 -->
            <div v-if="!hasMore && tableData.length > 0" class="kb-no-more">
                <n-text depth="3">已加载全部数据</n-text>
            </div>
        </div>

        <!-- 新增知识库文档弹窗 -->
        <n-modal
            v-model:show="showKbAddModal"
            preset="card"
            title="新增文档"
            style="width: 800px"
            :mask-closable="false"
        >
            <n-form
                ref="kbFormRef"
                :model="formData"
                :rules="formRules"
                label-placement="left"
                label-width="120px"
            >
                <!-- 输入方式选择 -->
                <n-form-item label="输入方式" path="inputMode">
                    <n-radio-group v-model:value="formData.inputMode" @update:value="handleInputModeChange">
                        <n-space>
                            <n-radio value="manual">手动输入</n-radio>
                            <n-radio value="upload">上传文件</n-radio>
                        </n-space>
                    </n-radio-group>
                </n-form-item>

                <!-- 文件上传（仅在上传模式下显示） -->
                <n-form-item v-if="formData.inputMode === 'upload'" label="上传文件" path="file">
                    <n-upload
                        ref="uploadRef"
                        :max="1"
                        :default-upload="false"
                        accept=".txt,.md,.pdf,.doc,.docx"
                        @change="handleFileChange"
                        :file-list="fileList"
                        list-type="text"
                    >
                        <n-button>
                            <template #icon>
                                <n-icon><document-attach-outline /></n-icon>
                            </template>
                            选择文件
                        </n-button>
                    </n-upload>
                    <n-text depth="3" style="font-size: 12px; margin-top: 4px; display: block;">
                        支持格式: txt, md, pdf, doc, docx
                    </n-text>
                </n-form-item>

                <!-- <n-form-item label="文档业务ID" path="docId">
                    <n-input v-model:value="formData.docId" placeholder="选填，用于外部关联" />
                </n-form-item> -->

                <n-form-item label="文档标题" path="title">
                    <n-input v-model:value="formData.title" placeholder="请输入文档标题" />
                </n-form-item>

                <n-form-item label="文档索引名" path="indexName">
                    <n-auto-complete
                        v-model:value="formData.indexName"
                        :options="indexOptions"
                        placeholder="请输入或选择索引名"
                        :loading="loadingIndexes"
                        clearable
                        @focus="handleIndexNameFocus"
                        @update:value="handleIndexNameSearch"
                    />
                </n-form-item>

                <!-- 文档内容（仅在手动输入模式下显示） -->
                <n-form-item v-if="formData.inputMode === 'manual'" label="文档内容" path="content">
                    <n-input
                        v-model:value="formData.content"
                        type="textarea"
                        placeholder="请输入文档原始内容"
                        :rows="8"
                    />
                </n-form-item>

                <!-- 文件内容预览（仅在上传模式且有内容时显示） -->
                <n-form-item v-if="formData.inputMode === 'upload' && formData.content" label="文件内容预览">
                    <n-scrollbar style="max-height: 200px">
                        <n-text depth="3" style="white-space: pre-wrap; word-wrap: break-word;">
                            {{ formData.content }}
                        </n-text>
                    </n-scrollbar>
                </n-form-item>

                <n-form-item label="内容摘要" path="contentSummary">
                    <n-input
                        v-model:value="formData.contentSummary"
                        type="textarea"
                        placeholder="选填，文档内容摘要"
                        :rows="3"
                    />
                </n-form-item>

                <n-grid :cols="2" :x-gap="24">
                    <n-gi>
                        <n-form-item label="文档类型" path="docType">
                            <n-select
                                v-model:value="formData.docType"
                                :options="docTypeOptions"
                                placeholder="选择文档类型"
                                :disabled="formData.inputMode === 'upload'"
                            />
                        </n-form-item>
                    </n-gi>
                    <n-gi>
                        <n-form-item label="文档语言" path="language">
                            <n-select
                                v-model:value="formData.language"
                                :options="languageOptions"
                                placeholder="选择文档语言"
                            />
                        </n-form-item>
                    </n-gi>
                </n-grid>

                <!-- <n-grid :cols="2" :x-gap="24">
                    <n-gi>
                        <n-form-item label="向量模型" path="embeddingModel">
                            <n-input-number
                                v-model:value="formData.embeddingModel"
                                placeholder="向量模型ID"
                                :min="1"
                                style="width: 100%"
                            />
                        </n-form-item>
                    </n-gi>
                    <n-gi>
                        <n-form-item label="向量维度" path="vectorDimension">
                            <n-input-number
                                v-model:value="formData.vectorDimension"
                                placeholder="向量维度"
                                :min="1"
                                style="width: 100%"
                            />
                        </n-form-item>
                    </n-gi>
                </n-grid>

                <n-grid :cols="2" :x-gap="24">
                    <n-gi>
                        <n-form-item label="文档块索引" path="chunkIndex">
                            <n-input-number
                                v-model:value="formData.chunkIndex"
                                placeholder="0表示完整文档"
                                :min="0"
                                style="width: 100%"
                            />
                        </n-form-item>
                    </n-gi>
                    <n-gi>
                        <n-form-item label="总块数" path="chunkTotal">
                            <n-input-number
                                v-model:value="formData.chunkTotal"
                                placeholder="总块数"
                                :min="1"
                                style="width: 100%"
                            />
                        </n-form-item>
                    </n-gi>
                </n-grid>

                <n-form-item label="父文档ID" path="parentDocId">
                    <n-input v-model:value="formData.parentDocId" placeholder="选填，用于分块文档关联" />
                </n-form-item> -->
            </n-form>

            <template #footer>
                <n-space justify="end">
                    <n-button @click="handleCancelAdd">取消</n-button>
                    <n-button type="default" @click="handleSave(false)" :loading="submitLoading">
                        <template #icon>
                            <n-icon><save-outline /></n-icon>
                        </template>
                        暂存
                    </n-button>
                    <n-button type="primary" @click="handleSave(true)" :loading="submitLoading">
                        <template #icon>
                            <n-icon><cloud-upload-outline /></n-icon>
                        </template>
                        保存并同步
                    </n-button>
                </n-space>
            </template>
        </n-modal>

        <!-- 知识库详情弹窗 -->
        <n-modal
            v-model:show="showDetailModal"
            preset="card"
            title="文档详情"
            style="width: 900px"
        >
            <n-descriptions bordered :column="2" v-if="currentDetail">
                <n-descriptions-item label="文档ID">
                    {{ currentDetail.id }}
                </n-descriptions-item>
                <n-descriptions-item label="业务ID">
                    {{ currentDetail.docId || '-' }}
                </n-descriptions-item>
                <n-descriptions-item label="文档标题" :span="2">
                    {{ currentDetail.title }}
                </n-descriptions-item>
                <n-descriptions-item label="索引名">
                    {{ currentDetail.indexName }}
                </n-descriptions-item>
                <n-descriptions-item label="文档类型">
                    {{ currentDetail.docType }}
                </n-descriptions-item>
                <n-descriptions-item label="文档语言">
                    {{ currentDetail.language }}
                </n-descriptions-item>
                <n-descriptions-item label="文件大小">
                    {{ formatFileSize(currentDetail.fileSize) }}
                </n-descriptions-item>
                <n-descriptions-item label="向量模型">
                    {{ currentDetail.embeddingModel }}
                </n-descriptions-item>
                <n-descriptions-item label="向量维度">
                    {{ currentDetail.vectorDimension }}
                </n-descriptions-item>
                <n-descriptions-item label="文档块索引">
                    {{ currentDetail.chunkIndex }}
                </n-descriptions-item>
                <n-descriptions-item label="总块数">
                    {{ currentDetail.chunkTotal }}
                </n-descriptions-item>
                <n-descriptions-item label="父文档ID" :span="2">
                    {{ currentDetail.parentDocId || '-' }}
                </n-descriptions-item>
                <n-descriptions-item label="处理状态">
                    <n-tag :type="getStatusType(currentDetail.status)">
                        {{ getStatusText(currentDetail.status) }}
                    </n-tag>
                </n-descriptions-item>
                <n-descriptions-item label="用户ID">
                    {{ currentDetail.userId }}
                </n-descriptions-item>
                <n-descriptions-item label="创建时间">
                    {{ formatDate(currentDetail.createdTime) }}
                </n-descriptions-item>
                <n-descriptions-item label="更新时间">
                    {{ formatDate(currentDetail.updatedTime) }}
                </n-descriptions-item>
                <n-descriptions-item label="内容摘要" :span="2">
                    <n-ellipsis :line-clamp="3" expand-trigger="click">
                        {{ currentDetail.contentSummary || '-' }}
                    </n-ellipsis>
                </n-descriptions-item>
                <n-descriptions-item label="文档内容" :span="2">
                    <n-scrollbar style="max-height: 300px">
                        <pre class="kb-pre" style="white-space: pre-wrap; word-wrap: break-word;">{{ currentDetail.content }}</pre>
                    </n-scrollbar>
                </n-descriptions-item>
                <n-descriptions-item v-if="currentDetail.errorMessage" label="错误信息" :span="2">
                    <n-text type="error">{{ currentDetail.errorMessage }}</n-text>
                </n-descriptions-item>
            </n-descriptions>

            <template #footer>
                <n-space justify="end">
                    <n-button @click="showDetailModal = false">关闭</n-button>
                </n-space>
            </template>
        </n-modal>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import '../../assets/css/knowledge-base.css';
import { ragApi, fileApi } from '../../api';
import {
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
    NTag,
    NDatePicker,
    NGrid,
    NGi,
    NDescriptions,
    NDescriptionsItem,
    NScrollbar,
    NEllipsis,
    NText,
    NUpload,
    NRadioGroup,
    NRadio,
    NAutoComplete
} from 'naive-ui';
import {
    AddOutline,
    SearchOutline,
    RefreshOutline,
    TrashOutline,
    CloudUploadOutline,
    DocumentAttachOutline,
    SaveOutline
} from '@vicons/ionicons5';

const message = useMessage();
const dialog = useDialog();

// 表格数据
const tableData = ref([]);
const tableLoading = ref(false);
const checkedRowKeys = ref([]);

// 查询参数（游标分页）
const queryParams = reactive({
    keyword: '',
    status: null,
    dateRange: null,
    lastUpdateTime: null,  // 游标，使用更新时间
    pageSize: 10
});

// 分页相关
const totalCount = ref(0);        // 总数据量
const hasMore = ref(true);        // 是否有更多数据
const currentPage = ref(1);       // 当前页码（仅用于显示）

// 分页配置
const pagination = reactive({
    page: 1,
    pageSize: 10,
    showSizePicker: true,
    pageSizes: [10, 20, 50, 100],
    itemCount: 0,
    prefix: (info) => {
        return `共 ${totalCount.value} 条`;
    },
    onChange: (page) => {
        // 游标分页不支持跳页，只能加载更多
        // 这里保持原有逻辑，但实际通过"加载更多"按钮实现
        if (page > currentPage.value) {
            loadMoreData();
        } else {
            // 重新查询
            resetAndLoad();
        }
    },
    onUpdatePageSize: (pageSize) => {
        queryParams.pageSize = pageSize;
        resetAndLoad();
    }
});

// 状态选项
const statusOptions = [
    { label: '待处理', value: 0 },
    { label: '已向量化', value: 1 },
    { label: '处理失败', value: 2 }
];

// 文档类型选项
const docTypeOptions = [
    { label: 'TXT', value: 'txt' },
    { label: 'PDF', value: 'pdf' },
    { label: 'DOCX', value: 'docx' },
    { label: 'MD', value: 'md' },
    { label: 'HTML', value: 'html' },
    { label: 'JSON', value: 'json' }
];

// 语言选项
const languageOptions = [
    { label: '中文', value: 'zh' },
    { label: '英文', value: 'en' },
    { label: '未知', value: 'unknown' }
];

// 表格列定义
const columns = [
    {
        type: 'selection'
    },
    {
        title: 'ID',
        key: 'id',
        width: 80
    },
    {
        title: '文档标题',
        key: 'title',
        width: 250,
        ellipsis: {
            tooltip: true
        }
    },
    {
        title: '索引名',
        key: 'indexName',
        width: 150,
        ellipsis: {
            tooltip: true
        }
    },
    {
        title: '文档类型',
        key: 'docType',
        width: 100,
        align: 'center'
    },
    {
        title: '状态',
        key: 'status',
        width: 120,
        align: 'center',
        render(row) {
            return h(
                NTag,
                {
                    type: getStatusType(row.status),
                    size: 'small'
                },
                {
                    default: () => getStatusText(row.status)
                }
            );
        }
    },
    {
        title: '文件大小',
        key: 'fileSize',
        width: 120,
        align: 'right',
        render(row) {
            return formatFileSize(row.fileSize);
        }
    },
    {
        title: '创建时间',
        key: 'createdTime',
        width: 180,
        render(row) {
            return formatDate(row.createdTime);
        }
    },
    {
        title: '操作',
        key: 'actions',
        width: 180,
        align: 'center',
        render(row) {
            return h(
                NSpace,
                { justify: 'center' },
                {
                    default: () => [
                        h(
                            NButton,
                            {
                                size: 'small',
                                type: 'info',
                                secondary: true,
                                onClick: () => handleViewDetail(row)
                            },
                            {
                                default: () => '查看详情'
                            }
                        ),
                        h(
                            NButton,
                            {
                                size: 'small',
                                type: 'error',
                                secondary: true,
                                onClick: () => handleDelete(row)
                            },
                            {
                                default: () => '删除'
                            }
                        )
                    ]
                }
            );
        }
    }
];

// 新增弹窗
const showKbAddModal = ref(false);
const submitLoading = ref(false);
const kbFormRef = ref(null);
const uploadRef = ref(null);

// 文件上传相关
const fileList = ref([]);
const currentFile = ref(null);
const uploadedFileUrl = ref('');

// 索引列表相关
const indexList = ref([]);
const indexOptions = ref([]);
const loadingIndexes = ref(false);

// 表单数据
const formData = reactive({
    inputMode: 'manual', // 输入方式：manual-手动输入，upload-上传文件
    docId: '',
    title: '',
    indexName: '',
    content: '',
    contentSummary: '',
    embeddingModel: 2,
    vectorDimension: 1536,
    chunkIndex: 0,
    chunkTotal: 1,
    parentDocId: '',
    docType: 'txt',
    fileSize: 0,
    language: 'zh'
});

// 表单验证规则
const formRules = {
    title: [
        { required: true, message: '请输入文档标题', trigger: 'blur' },
        { max: 255, message: '标题长度不能超过255', trigger: 'blur' }
    ],
    indexName: [
        { required: true, message: '请输入文档索引名', trigger: 'blur' },
        { max: 64, message: '索引名长度不能超过64', trigger: 'blur' }
    ],
    content: [
        { 
            required: true, 
            message: '请输入文档内容或上传文件', 
            trigger: 'blur',
            validator: (rule, value) => {
                if (formData.inputMode === 'manual' && !value) {
                    return new Error('请输入文档内容');
                }
                if (formData.inputMode === 'upload' && !value && !uploadedFileUrl.value) {
                    return new Error('请上传文件');
                }
                return true;
            }
        }
    ]
};

// 详情弹窗
const showDetailModal = ref(false);
const currentDetail = ref(null);

// 行唯一标识
const rowKey = (row) => row.id;

// 加载索引列表
const loadIndexList = async () => {
    if (loadingIndexes.value) return;
    
    loadingIndexes.value = true;
    try {
        const result = await ragApi.getIndexes();
        if (result.code === 200 && result.data) {
            indexList.value = result.data;
            // 转换为 auto-complete 需要的格式
            indexOptions.value = result.data.map(index => ({
                label: index,
                value: index
            }));
        }
    } catch (error) {
        console.error('加载索引列表失败:', error);
    } finally {
        loadingIndexes.value = false;
    }
};

// 索引名获得焦点时加载列表
const handleIndexNameFocus = () => {
    if (indexList.value.length === 0) {
        loadIndexList();
    }
};

// 索引名搜索/过滤
const handleIndexNameSearch = (value) => {
    if (!value) {
        // 如果输入为空，显示所有索引
        indexOptions.value = indexList.value.map(index => ({
            label: index,
            value: index
        }));
    } else {
        // 过滤匹配的索引
        const filtered = indexList.value.filter(index => 
            index.toLowerCase().includes(value.toLowerCase())
        );
        indexOptions.value = filtered.map(index => ({
            label: index,
            value: index
        }));
    }
};

// 加载表格数据（游标分页）
const loadTableData = async (append = false) => {
    tableLoading.value = true;
    
    try {
        // 构建查询参数
        const params = {
            keyword: queryParams.keyword || undefined,
            status: queryParams.status !== null ? queryParams.status : undefined,
            lastUpdateTime: queryParams.lastUpdateTime,
            pageSize: queryParams.pageSize
        };
        
        // 处理时间范围
        if (queryParams.dateRange && queryParams.dateRange.length === 2) {
            // 将时间戳转换为日期字符串格式: "2025-11-01 18:22:51"
            params.startTime = formatDateTime(new Date(queryParams.dateRange[0]));
            params.endTime = formatDateTime(new Date(queryParams.dateRange[1]));
        }
        
        // 调用分页接口
        const result = await ragApi.pageDocuments(params);
        
        if (result.code === 200) {
            const newData = result.data || [];
            
            // 追加或替换数据
            if (append) {
                tableData.value = [...tableData.value, ...newData];
            } else {
                tableData.value = newData;
            }
            
            // 更新总数
            totalCount.value = result.total || 0;
            
            // 更新分页显示
            pagination.itemCount = totalCount.value;
            
            // 判断是否还有更多数据
            hasMore.value = newData.length >= queryParams.pageSize;
            
            // 更新游标：使用最后一条数据的 updatedTime
            if (newData.length > 0) {
                const lastItem = newData[newData.length - 1];
                queryParams.lastUpdateTime = formatDateTime(new Date(lastItem.updatedTime));
            }
            
        } else {
            message.error(result.message || '加载数据失败');
        }
    } catch (error) {
        console.error('加载表格数据失败:', error);
        message.error('加载数据失败: ' + (error.message || '未知错误'));
    } finally {
        tableLoading.value = false;
    }
};

// 重置并加载（用于查询和重置）
const resetAndLoad = () => {
    queryParams.lastUpdateTime = null;
    currentPage.value = 1;
    pagination.page = 1;
    hasMore.value = true;
    loadTableData(false);
};

// 加载更多数据
const loadMoreData = () => {
    if (!hasMore.value) {
        message.info('没有更多数据了');
        return;
    }
    currentPage.value++;
    pagination.page = currentPage.value;
    loadTableData(true);
};

// 查询
const handleQuery = () => {
    resetAndLoad();
};

// 重置
const handleReset = () => {
    queryParams.keyword = '';
    queryParams.status = null;
    queryParams.dateRange = null;
    resetAndLoad();
};

// 格式化日期时间为字符串: "2025-11-01 18:22:51"
const formatDateTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 勾选处理
const handleCheck = (keys) => {
    checkedRowKeys.value = keys;
};

// 查看详情
const handleViewDetail = (row) => {
    currentDetail.value = row;
    showDetailModal.value = true;
};

// 删除
const handleDelete = (row) => {
    dialog.warning({
        title: '确认删除',
        content: `确定要删除文档 "${row.title}" 吗？此操作不可撤销。`,
        positiveText: '确认',
        negativeText: '取消',
        onPositiveClick: () => {
            message.success('删除成功（待对接后端接口）');
            resetAndLoad();  // 重新加载数据
        }
    });
};

// 批量删除
const handleBatchDelete = () => {
    dialog.warning({
        title: '确认批量删除',
        content: `确定要删除选中的 ${checkedRowKeys.value.length} 个文档吗？此操作不可撤销。`,
        positiveText: '确认',
        negativeText: '取消',
        onPositiveClick: () => {
            message.success(`批量删除 ${checkedRowKeys.value.length} 个文档成功（待对接后端接口）`);
            checkedRowKeys.value = [];
            resetAndLoad();  // 重新加载数据
        }
    });
};

// 批量同步
const handleBatchSync = () => {
    dialog.info({
        title: '确认批量同步',
        content: `确定要将选中的 ${checkedRowKeys.value.length} 个文档同步到向量数据库吗？`,
        positiveText: '确认',
        negativeText: '取消',
        onPositiveClick: () => {
            message.loading('正在同步到向量数据库...', { duration: 2000 });
            setTimeout(() => {
                message.success(`批量同步 ${checkedRowKeys.value.length} 个文档成功（待对接后端接口）`);
                checkedRowKeys.value = [];
                resetAndLoad();  // 重新加载数据
            }, 2000);
        }
    });
};

// 处理输入方式切换
const handleInputModeChange = (value) => {
    if (value === 'manual') {
        // 切换到手动输入，清空文件相关数据
        fileList.value = [];
        currentFile.value = null;
        uploadedFileUrl.value = '';
        formData.content = '';
        formData.fileSize = 0;
    } else {
        // 切换到上传文件，清空手动输入的内容
        formData.content = '';
    }
};

// 处理文件变化
const handleFileChange = async ({ file, fileList: newFileList }) => {
    fileList.value = newFileList;
    
    if (file.status === 'removed') {
        currentFile.value = null;
        uploadedFileUrl.value = '';
        formData.content = '';
        formData.fileSize = 0;
        formData.docType = 'txt';
        return;
    }
    
    currentFile.value = file.file;
    const fileName = file.name;
    
    // 立即上传文件到服务器解析
    message.loading('正在上传并解析文件...', { duration: 0, key: 'parse' });
    
    try {
        const parseResult = await fileApi.parseDocument(file.file);
        
        message.destroyAll();
        
        if (parseResult.code === 200 && parseResult.data) {
            // 解析成功，将返回的RagStore数据回填到表单
            const ragStore = parseResult.data;
            
            // 回填表单数据
            formData.title = ragStore.title || fileName.substring(0, fileName.lastIndexOf('.'));
            formData.content = ragStore.content || '';
            formData.docType = ragStore.docType || 'txt';
            formData.fileSize = ragStore.fileSize || file.file.size;
            formData.language = ragStore.language || 'zh';
            
            // 可选字段
            if (ragStore.docId) formData.docId = ragStore.docId;
            if (ragStore.contentSummary) formData.contentSummary = ragStore.contentSummary;
            if (ragStore.embeddingModel) formData.embeddingModel = ragStore.embeddingModel;
            if (ragStore.vectorDimension) formData.vectorDimension = ragStore.vectorDimension;
            
            message.success('文件解析成功！');
        } else {
            message.error(parseResult.message || '文件解析失败');
            // 解析失败，移除文件
            fileList.value = [];
            currentFile.value = null;
        }
    } catch (error) {
        message.destroyAll();
        console.error('文件解析失败:', error);
        message.error('文件解析失败: ' + (error.message || '未知错误'));
        // 解析失败，移除文件
        fileList.value = [];
        currentFile.value = null;
    }
};

// 保存文档（支持暂存和保存并同步）
const handleSave = async (isEmbedding) => {
    kbFormRef.value?.validate(async (errors) => {
        if (!errors) {
            submitLoading.value = true;
            
            try {
                // 构建提交数据（文件已在上传时解析并回填到表单）
                const submitData = {
                    docId: formData.docId || undefined,
                    title: formData.title,
                    indexName: formData.indexName,
                    content: formData.content,
                    contentSummary: formData.contentSummary || undefined,
                    embeddingModel: formData.embeddingModel,
                    vectorDimension: formData.vectorDimension,
                    chunkIndex: formData.chunkIndex,
                    chunkTotal: formData.chunkTotal,
                    parentDocId: formData.parentDocId || undefined,
                    docType: formData.docType,
                    fileSize: formData.fileSize,
                    language: formData.language,
                    status: 0, // 0-待处理
                    deleted: 0,
                    isEmbedding: isEmbedding // true-保存并同步，false-暂存
                };
                
                // 调用后端接口保存文档
                message.loading(isEmbedding ? '正在保存并同步到向量数据库...' : '正在保存...', { duration: 0, key: 'save' });
                const result = await ragApi.addDocument(submitData);
                
                message.destroyAll();
                
                if (result.code === 200) {
                    message.success(isEmbedding ? '保存并同步成功！' : '暂存成功！');
                    showKbAddModal.value = false;
                    resetForm();
                    resetAndLoad();  // 重新加载数据
                } else {
                    message.error(result.message || '保存失败');
                }
            } catch (error) {
                message.destroyAll();
                console.error('保存文档失败:', error);
                message.error('保存失败: ' + (error.message || '未知错误'));
            } finally {
                submitLoading.value = false;
            }
        }
    });
};

// 取消新增
const handleCancelAdd = () => {
    showKbAddModal.value = false;
    resetForm();
};

// 重置表单
const resetForm = () => {
    formData.inputMode = 'manual';
    formData.docId = '';
    formData.title = '';
    formData.indexName = '';
    formData.content = '';
    formData.contentSummary = '';
    formData.embeddingModel = 2;
    formData.vectorDimension = 1536;
    formData.chunkIndex = 0;
    formData.chunkTotal = 1;
    formData.parentDocId = '';
    formData.docType = 'txt';
    formData.fileSize = 0;
    formData.language = 'zh';
    
    // 清空文件上传相关数据
    fileList.value = [];
    currentFile.value = null;
    uploadedFileUrl.value = '';
};

// 工具函数：获取状态类型
const getStatusType = (status) => {
    const typeMap = {
        0: 'warning',
        1: 'success',
        2: 'error'
    };
    return typeMap[status] || 'default';
};

// 工具函数：获取状态文本
const getStatusText = (status) => {
    const textMap = {
        0: '待处理',
        1: '已向量化',
        2: '处理失败'
    };
    return textMap[status] || '未知';
};

// 工具函数：格式化文件大小
const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
};

// 工具函数：格式化日期
const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 初始化
onMounted(() => {
    loadTableData();
});
</script>
