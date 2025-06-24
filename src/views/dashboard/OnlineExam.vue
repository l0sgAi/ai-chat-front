<template>
    <div class="online-exam-container">
        <n-card title="在线考试" class="online-exam-card">
            <!-- 考试列表/考试进行中的切换 -->
            <n-tabs type="line" animated v-model:value="activeTab">
                <n-tab-pane name="exam-list" tab="考试列表">
                    <!-- 考试列表 -->
                    <n-space vertical>
                        <n-space class="filter-margin">
                            <n-input v-model:value="searchKeyword" placeholder="搜索考试名称" style="width: 200px">
                                <template #prefix>
                                    <n-icon><search-outline /></n-icon>
                                </template>
                            </n-input>
                            <n-select v-model:value="selectedStatus" :options="statusOptions" placeholder="考试状态"
                                style="width: 150px" />
                            <n-button @click="searchExams">搜索</n-button>
                            <n-button @click="resetSearch">重置</n-button>
                            <n-button type="primary" @click="showAddExamModal = true">新增考试</n-button>
                        </n-space>
                    </n-space>

                    <n-data-table :columns="columns" :data="examList" :pagination="pagination" :bordered="false" striped
                        :loading="loading" />
                </n-tab-pane>

            </n-tabs>

            <!-- 新增/编辑考试模态框 -->
            <n-modal v-model:show="showAddExamModal" preset="card" :title="editingExam ? '编辑考试' : '新增考试'"
                style="width: 600px">
                <n-form ref="examFormRef" :model="examForm" :rules="examFormRules" label-placement="left"
                    label-width="120px">
                    <n-form-item label="考试名称" path="name">
                        <n-input v-model:value="examForm.name" placeholder="请输入考试名称" />
                    </n-form-item>
                    <n-form-item label="开始时间" path="startTime">
                        <n-date-picker v-model:value="examForm.startTime" type="datetime" placeholder="请选择开始时间"
                            style="width: 100%" />
                    </n-form-item>
                    <n-form-item label="结束时间" path="endTime">
                        <n-date-picker v-model:value="examForm.endTime" type="datetime" placeholder="请选择结束时间"
                            style="width: 100%" />
                    </n-form-item>
                </n-form>
                <template #footer>
                    <n-space justify="end">
                        <n-button @click="cancelExamForm">取消</n-button>
                        <n-button type="primary" @click="submitExamForm" :loading="submitting">确定</n-button>
                    </n-space>
                </template>
            </n-modal>

            <!-- 考试详情模态框 -->
            <n-modal v-model:show="showExamDetailModal" preset="card" title="考试详情" style="width: 600px">
                <template v-if="selectedExam">
                    <n-descriptions bordered>
                        <n-descriptions-item label="考试名称">
                            {{ selectedExam.name }}
                        </n-descriptions-item>
                        <n-descriptions-item label="考试时长">
                            {{ selectedExam.durationMinutes }} 分钟
                        </n-descriptions-item>
                        <n-descriptions-item label="开始时间">
                            {{ formatDate(selectedExam.startTime) }}
                        </n-descriptions-item>
                        <n-descriptions-item label="结束时间">
                            {{ formatDate(selectedExam.endTime) }}
                        </n-descriptions-item>
                        <n-descriptions-item label="创建时间">
                            {{ formatDate(selectedExam.createdTime) }}
                        </n-descriptions-item>
                    </n-descriptions>
                </template>
                <template #footer>
                    <n-space justify="end">
                        <n-button @click="showExamDetailModal = false">关闭</n-button>
                    </n-space>
                </template>
            </n-modal>

        </n-card>
    </div>
</template>

<script setup>
import { h, ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import {
    NCard,
    NDataTable,
    NButton,
    NSpace,
    NTabs,
    NTabPane,
    NModal,
    NInput,
    NSelect,
    NIcon,
    NCountdown,
    NRadioGroup,
    NRadio,
    NCheckboxGroup,
    NCheckbox,
    NDivider,
    NDescriptions,
    NDescriptionsItem,
    NResult,
    NForm,
    NFormItem,
    NDatePicker,
    NInputNumber,
    NPopconfirm
} from 'naive-ui';
import {
    SearchOutline,
    CreateOutline,
    TrashOutline,
    EyeOutline
} from '@vicons/ionicons5';
import { examApi } from '@/api/index';

const message = useMessage();
const dialog = useDialog();

// 响应式数据
const activeTab = ref('exam-list');
const loading = ref(false);
const submitting = ref(false);
const searchKeyword = ref('');
const selectedStatus = ref(null);
const examList = ref([]);
const totalCount = ref(0);

// 模态框控制
const showAddExamModal = ref(false);
const showExamDetailModal = ref(false);
const showExamResultModal = ref(false);
const editingExam = ref(null);
const selectedExam = ref(null);

// 表单相关
const examFormRef = ref(null);
const examForm = reactive({
    id: null,
    name: '',
    startTime: null,
    endTime: null
});

// 表单验证规则
const examFormRules = {
    name: {
        required: true,
        message: '请输入考试名称',
        trigger: 'blur'
    },
    startTime: {
        required: true,
        validator: (rule, value) => {
            if (value === null || value === undefined || value === '') {
                return new Error('请选择答案选项');
            }
            return true;
        },
        trigger: 'change'
    },
    endTime: {
        required: true,
        validator: (rule, value) => {
            if (value === null || value === undefined || value === '') {
                return new Error('请选择答案选项');
            }
            return true;
        },
        trigger: 'change'
    }
};

// 状态选项
const statusOptions = [
    { label: '未开始', value: 0 },
    { label: '进行中', value: 1 },
    { label: '已结束', value: 2 }
];

// 分页配置
const pagination = reactive({
    page: 1,
    pageSize: 10,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: (page) => {
        pagination.page = page;
        loadExamList();
    },
    onUpdatePageSize: (pageSize) => {
        pagination.pageSize = pageSize;
        pagination.page = 1;
        loadExamList();
    }
});

const isDuringTest = (row) => {
    const now = new Date().getTime();
    const startTime = new Date(row.stratTime).getTime();
    const endTime = new Date(row.endTime).getTime();
    return now >= startTime && now <= endTime; // 仅在进行中时禁用
}

// 表格列配置
const columns = [
    {
        title: 'ID',
        key: 'id'
    },
    {
        title: '考试名称',
        key: 'name',
        ellipsis: {
            tooltip: true
        }
    },
    {
        title: '开始时间',
        key: 'startTime',
        render: (row) => formatDate(row.startTime)
    },
    {
        title: '结束时间',
        key: 'endTime',
        width: 180,
        render: (row) => formatDate(row.endTime)
    },
    {
        title: '考试时长',
        key: 'durationMinutes',
        render: (row) => `${Math.round(row.durationMinutes / 60000)}分钟`
    },
    {
        title: '状态',
        key: 'status',
        width: 120,
        render: (row) => {
            const now = new Date().getTime();
            const startTime = new Date(row.startTime).getTime();
            const endTime = new Date(row.endTime).getTime();
            
            let status, color;
            if (now < startTime) {
                status = '未开始';
                color = '#909399'; // 灰色
            } else if (now >= startTime && now <= endTime) {
                status = '进行中';
                color = '#67C23A'; // 绿色
            } else {
                status = '已结束';
                color = '#F56C6C'; // 红色
            }
            
            return h('div', {
                style: 'display: flex; align-items: center; gap: 6px;'
            }, [
                h('div', {
                    style: `width: 8px; height: 8px; border-radius: 50%; background-color: ${color};`
                }),
                h('span', status)
            ]);
        }
    },
    {
        title: '创建时间',
        key: 'createdTime',
        render: (row) => formatDate(row.createdTime)
    },
    {
        title: '操作',
        key: 'actions',
        width: 300,
        render: (row) => {
            return h('div', {
                class: 'action-buttons',
                style: 'display: flex; align-items: center; gap: 8px; white-space: nowrap;'
            }, [
                h(NButton, {
                    size: 'small',
                    type: 'info',
                    onClick: () => viewExamDetail(row)
                }, {
                    default: () => '查看',
                    icon: () => h(NIcon, null, { default: () => h(EyeOutline) })
                }),
                h(NButton, {
                    size: 'small',
                    type: 'primary',
                    disabled: isDuringTest(row),
                    onClick: () => editExam(row)
                }, {
                    default: () => '编辑',
                    icon: () => h(NIcon, null, { default: () => h(CreateOutline) })
                }),
                h(NPopconfirm, {
                    onPositiveClick: () => deleteExam(row.id)
                }, {
                    trigger: () => h(NButton, {
                        size: 'small',
                        type: 'error'
                    }, {
                        default: () => '删除',
                        icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
                    }),
                    default: () => '确定删除这个考试吗？'
                })
            ]);
        }
    }
];

// 使用统一的API接口

// 加载考试列表
const loadExamList = async () => {
    try {
        loading.value = true;
        const response = await examApi.queryExams(
            searchKeyword.value,
            selectedStatus.value,
            pagination.page,
            pagination.pageSize
        );

        if (response.code === 200) {
            examList.value = response.data || [];
            totalCount.value = response.total || 0;
            pagination.itemCount = totalCount.value;
        } else {
            message.error(response.message || '获取考试列表失败');
        }
    } catch (error) {
        console.error('加载考试列表失败:', error);
        message.error('获取考试列表失败');
    } finally {
        loading.value = false;
    }
};

// 搜索考试
const searchExams = () => {
    pagination.page = 1;
    loadExamList();
};

// 重置搜索
const resetSearch = () => {
    searchKeyword.value = '';
    selectedStatus.value = null;
    pagination.page = 1;
    loadExamList();
};

// 查看考试详情
const viewExamDetail = (exam) => {
    selectedExam.value = exam;
    showExamDetailModal.value = true;
};

// 编辑考试
const editExam = (exam) => {
    editingExam.value = exam;
    examForm.id = exam.id;
    examForm.name = exam.name;
    examForm.startTime = exam.startTime ? new Date(exam.startTime).getTime() : null;
    examForm.endTime = exam.endTime ? new Date(exam.endTime).getTime() : null;
    showAddExamModal.value = true;
};

// 删除考试
const deleteExam = async (id) => {
    try {
        const response = await examApi.deleteExam(id);
        if (response.code === 200) {
            message.success('删除成功');
            loadExamList();
        } else {
            message.error(response.message || '删除失败');
        }
    } catch (error) {
        console.error('删除考试失败:', error);
        message.error('删除失败');
    }
};

// 提交考试表单
const submitExamForm = async () => {
    try {
        await examFormRef.value?.validate();
        submitting.value = true;

        const formData = {
            ...examForm,
            startTime: examForm.startTime ? new Date(examForm.startTime).getTime() : null,
            endTime: examForm.endTime ? new Date(examForm.endTime).getTime() : null
        };

        let response;
        if (editingExam.value) {
            response = await examApi.updateExam(formData);
        } else {
            delete formData.id;
            response = await examApi.addExam(formData);
        }

        if (response.code === 200) {
            message.success(editingExam.value ? '更新成功' : '新增成功');
            cancelExamForm();
            loadExamList();
        } else {
            message.error(response.message || '操作失败');
        }
    } catch (error) {
        console.error('提交表单失败:', error);
        if (error.message) {
            message.error(error.message);
        }
    } finally {
        submitting.value = false;
    }
};

// 取消表单
const cancelExamForm = () => {
    showAddExamModal.value = false;
    editingExam.value = null;
    examForm.id = null;
    examForm.name = '';
    examForm.startTime = null;
    examForm.endTime = null;
};

// 格式化日期
const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

// 组件挂载时加载数据
onMounted(() => {
    loadExamList();
});
</script>

<style scoped>
.online-exam-container {
    padding: 20px;
}

.online-exam-card {
    min-height: 600px;
}

.filter-margin {
    margin-bottom: 16px;
}

.action-buttons {
    display: flex;
    align-items: center;
}

.exam-header {
    margin-bottom: 20px;
}

.exam-info {
    margin-top: 10px;
}

.question-item {
    padding: 16px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    margin-bottom: 16px;
}

.question-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    font-weight: bold;
}

.question-number {
    margin-right: 8px;
    color: #1890ff;
}

.question-type {
    margin-right: 8px;
    color: #52c41a;
}

.question-score {
    color: #fa8c16;
}

.question-content {
    margin-bottom: 12px;
    line-height: 1.6;
}
</style>