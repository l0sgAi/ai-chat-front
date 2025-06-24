<template>
    <div class="question-bank-container">
        <n-card title="试题库管理" class="question-bank-card">
            <template #header-extra>
                <n-button type="primary" @click="openAddQuestionModal">
                    <template #icon>
                        <n-icon><add-outline /></n-icon>
                    </template>
                    添加试题
                </n-button>
            </template>

            <!-- 试题筛选 -->
            <n-space vertical>
                <n-space class="filter-margin">
                    <n-input v-model:value="searchKeyword" placeholder="搜索试题关键词">
                        <template #prefix>
                            <n-icon><search-outline /></n-icon>
                        </template>
                    </n-input>
                    <!-- <n-select v-model:value="selectedType" :options="typeOptions" placeholder="试题类型"
                        style="width: 150px" />
                    <n-select v-model:value="selectedDifficulty" :options="difficultyOptions" placeholder="难度等级"
                        style="width: 150px" /> -->
                    <n-button @click="searchQuestions">搜索</n-button>
                    <n-button @click="resetSearch">重置</n-button>
                </n-space>
            </n-space>

            <!-- 试题列表 -->
            <n-data-table :columns="columns" :data="questionData" :pagination="pagination" :loading="loading"
                :bordered="false" striped />

            <!-- 添加试题模态框 -->
            <n-modal v-model:show="showAddQuestionModal" preset="card" title="添加试题" style="width: 600px">
                <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="100">
                    <n-form-item path="title" label="试题标题">
                        <n-input v-model:value="formData.title" placeholder="请输入试题标题" />
                    </n-form-item>
                    <n-form-item path="type" label="试题类型">
                        <n-select v-model:value="formData.type" :options="typeOptions" />
                    </n-form-item>
                    <n-form-item path="level" label="难度等级">
                        <n-select v-model:value="formData.level" :options="difficultyOptions" />
                    </n-form-item>
                    <n-form-item path="content" label="试题内容">
                        <n-input v-model:value="formData.content" type="textarea" placeholder="请输入试题内容"
                            :autosize="{ minRows: 3, maxRows: 6 }" />
                    </n-form-item>

                    <!-- 正确答案选项 (选择题和判断题) -->
                    <n-form-item v-if="formData.type === 0 || formData.type === 1" path="answerOption" label="正确答案">
                        <n-select v-if="formData.type === 0" v-model:value="formData.answerOption"
                            :options="[{ label: 'A', value: 0 }, { label: 'B', value: 1 }, { label: 'C', value: 2 }, { label: 'D', value: 3 }]"
                            placeholder="请选择正确答案选项" />
                        <n-select v-else v-model:value="formData.answerOption"
                            :options="[{ label: '正确', value: 0 }, { label: '错误', value: 1 }]" placeholder="请选择正确答案" />
                    </n-form-item>

                    <!-- 正确答案文本 (仅简答题) -->
                    <n-form-item v-if="formData.type === 2" path="answer" label="正确答案">
                        <n-input v-model:value="formData.answer" type="textarea" placeholder="请输入正确答案"
                            :autosize="{ minRows: 2, maxRows: 4 }" />
                    </n-form-item>

                    <n-form-item path="explanation" label="解析">
                        <n-input v-model:value="formData.explanation" type="textarea" placeholder="请输入试题解析"
                            :autosize="{ minRows: 2, maxRows: 4 }" />
                    </n-form-item>
                </n-form>
                <template #footer>
                    <n-space justify="end">
                        <n-button @click="showAddQuestionModal = false">取消</n-button>
                        <n-button type="primary" @click="addQuestion">确认</n-button>
                    </n-space>
                </template>
            </n-modal>

            <!-- 查看试题详情模态框 -->
            <n-modal v-model:show="showQuestionDetailModal" preset="card" title="试题详情" style="width: 600px">
                <template v-if="currentQuestion">
                    <n-descriptions bordered>
                        <n-descriptions-item label="试题标题">
                            {{ currentQuestion.title }}
                        </n-descriptions-item>
                        <n-descriptions-item label="试题类型">
                            {{ getQuestionTypeName(currentQuestion.type) }}
                        </n-descriptions-item>
                        <n-descriptions-item label="难度等级">
                            {{ getDifficultyName(currentQuestion.level) }}
                        </n-descriptions-item>
                        <n-descriptions-item label="试题内容" span="3">
                            {{ currentQuestion.content }}
                        </n-descriptions-item>

                        <n-descriptions-item label="正确答案" span="3">
                            <template v-if="currentQuestion.type === 0">
                                {{ String.fromCharCode(65 + currentQuestion.answerOption) }}
                            </template>
                            <template v-else-if="currentQuestion.type === 1">
                                {{ currentQuestion.answerOption === 0 ? '正确' : '错误' }}
                            </template>
                            <template v-else-if="currentQuestion.type === 2">
                                {{ currentQuestion.answer }}
                            </template>
                        </n-descriptions-item>

                        <n-descriptions-item label="解析" span="3">
                            {{ currentQuestion.explanation }}
                        </n-descriptions-item>
                    </n-descriptions>
                </template>
            </n-modal>
        </n-card>
    </div>
</template>

<script setup>
import { h, ref, reactive, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { questionBankApi } from '../../api';
import {
    NCard,
    NDataTable,
    NButton,
    NSpace,
    NModal,
    NForm,
    NFormItem,
    NInput,
    NSelect,
    NIcon,
    NPopconfirm,
    NDynamicInput,
    NRadioGroup,
    NRadio,
    NDescriptions,
    NDescriptionsItem
} from 'naive-ui';
import {
    AddOutline,
    CreateOutline,
    TrashOutline,
    SearchOutline,
    EyeOutline
} from '@vicons/ionicons5';

const message = useMessage();

// 试题类型选项 (选择题0,判断题1,简答题2)
const typeOptions = [
    { label: '选择题', value: 0 },
    { label: '判断题', value: 1 },
    { label: '简答题', value: 2 }
];

// 难度等级选项 (易0、中等1、难2)
const difficultyOptions = [
    { label: '简单', value: 0 },
    { label: '中等', value: 1 },
    { label: '困难', value: 2 }
];

// 获取试题类型名称
const getQuestionTypeName = (type) => {
    const option = typeOptions.find(item => item.value === type);
    return option ? option.label : '未知';
};

// 获取难度等级名称
const getDifficultyName = (level) => {
    const option = difficultyOptions.find(item => item.value === level);
    return option ? option.label : '未知';
};

// 表格列定义
const createColumns = ({ view, edit, remove }) => {
    return [
        {
            title: '试题标题',
            key: 'title',
            ellipsis: {
                tooltip: true
            }
        },
        {
            title: '试题类型',
            key: 'type',
            render(row) {
                return getQuestionTypeName(row.type);
            }
        },
        {
            title: '难度等级',
            key: 'level',
            render(row) {
                return getDifficultyName(row.level);
            }
        },
        {
            title: '操作',
            key: 'actions',
            render(row) {
                return h(NSpace, {}, {
                    default: () => [
                        h(
                            NButton,
                            {
                                size: 'small',
                                onClick: () => view(row)
                            },
                            {
                                default: () => '查看',
                                icon: () => h(NIcon, null, { default: () => h(EyeOutline) })
                            }
                        ),
                        h(
                            NButton,
                            {
                                size: 'small',
                                type: 'info',
                                onClick: () => edit(row)
                            },
                            {
                                default: () => '编辑',
                                icon: () => h(NIcon, null, { default: () => h(CreateOutline) })
                            }
                        ),
                        h(
                            NPopconfirm,
                            {
                                onPositiveClick: () => remove(row),
                            },
                            {
                                default: () => '确认删除？',
                                trigger: () => h(
                                    NButton,
                                    {
                                        size: 'small',
                                        type: 'error',
                                    },
                                    {
                                        default: () => '删除',
                                        icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
                                    }
                                )
                            }
                        )
                    ]
                });
            }
        }
    ];
};

// 试题数据，从后端获取
const questionData = ref([]);
const loading = ref(false);

// 搜索相关状态
const searchKeyword = ref('');
const selectedType = ref(null);
const selectedDifficulty = ref(null);

// 获取试题列表
const fetchQuestions = async (forceRefresh = false) => {
    try {
        loading.value = true;

        const res = await questionBankApi.queryQuestions(
            searchKeyword.value,
            pagination.page,
            pagination.pageSize
        );

        if (res.code === 200) {
            questionData.value = res.data;
            pagination.itemCount = res.count || 0;
            console.log('分页数据:', { data: res.data, total: res.count, page: pagination.page });
        } else {
            message.error(res.message || '获取试题列表失败');
        }
    } catch (error) {
        console.error('获取试题列表失败:', error);
        message.error('获取试题列表失败: ' + (error.message || '未知错误'));
    } finally {
        loading.value = false;
    }
};



// 搜索试题
const searchQuestions = () => {
    pagination.page = 1; // 重置到第一页
    fetchQuestions();
};

// 重置搜索
const resetSearch = () => {
    searchKeyword.value = '';
    selectedType.value = null;
    selectedDifficulty.value = null;
    pagination.page = 1; // 重置到第一页
    fetchQuestions();
};

// 组件挂载时获取数据
onMounted(() => {
    fetchQuestions();
});

// 查看试题详情
const viewQuestionDetail = (question) => {
    currentQuestion.value = question;
    showQuestionDetailModal.value = true;
};

// 重置表单数据
const resetFormData = () => {
    formData.title = '';
    formData.type = 0;
    formData.level = 1;
    formData.content = '';
    formData.answer = '';
    formData.answerOption = null;
    formData.explanation = '';
    currentEditId.value = null;
};

// 打开添加试题模态框
const openAddQuestionModal = () => {
    resetFormData();
    showAddQuestionModal.value = true;
};

// 编辑试题
const editQuestion = (question) => {
    // 先重置表单，确保没有残留数据
    resetFormData();

    currentEditId.value = question.id;
    formData.title = question.title;
    formData.type = question.type;
    formData.level = question.level;
    formData.content = question.content;
    formData.answer = question.answer;
    formData.answerOption = question.answerOption !== null ? Number(question.answerOption) : null;
    formData.explanation = question.explanation;
    showAddQuestionModal.value = true;

    console.log("当前数据：", question.answerOption);
};

// 删除试题
const removeQuestion = async (question) => {
    try {
        const res = await questionBankApi.deleteQuestion(question.id);
        if (res.code === 200) {
            message.success(res.data || '删除成功');
            // 重新获取数据
            fetchQuestions();
        } else {
            message.error(res.message || '删除失败');
        }
    } catch (error) {
        console.error('删除失败:', error);
        message.error('删除失败: ' + (error.message || '未知错误'));
    }
};

// 表格列定义
const columns = createColumns({
    view: viewQuestionDetail,
    edit: editQuestion,
    remove: removeQuestion
});

// 分页配置
const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50, 100],
    onUpdatePage: (page) => {
        pagination.page = page;
        fetchQuestions();
    },
    onUpdatePageSize: (pageSize) => {
        pagination.pageSize = pageSize;
        pagination.page = 1; // 重置到第一页
        fetchQuestions();
    }
});

// 添加试题模态框显示状态
const showAddQuestionModal = ref(false);
// 查看试题详情模态框显示状态
const showQuestionDetailModal = ref(false);
// 当前查看的试题
const currentQuestion = ref(null);
// 当前编辑的试题ID
const currentEditId = ref(null);

// 表单数据
const formData = reactive({
    title: '',
    type: 0, // 选择题0,判断题1,简答题2
    level: 1, // 易0、中等1、难2
    content: '',
    answer: '', // 正确答案-文本
    answerOption: null, // 正确答案-选项 abcd对应0123 正确/错误 对应 0/1
    explanation: '' // 试题解析说明
});

// 表单验证规则
const rules = {
    title: {
        required: true,
        message: '请输入试题标题',
        trigger: 'blur'
    },
    content: {
        required: true,
        message: '请输入试题内容',
        trigger: 'blur'
    },
    answer: {
        required: true,
        message: '请输入正确答案',
        trigger: 'blur'
    },
    answerOption: {
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

// 表单引用
const formRef = ref(null);

// 添加试题
const addQuestion = () => {
    formRef.value?.validate(async (errors) => {
        if (!errors) {
            try {
                const questionData = {
                    title: formData.title,
                    type: formData.type,
                    level: formData.level,
                    content: formData.content,
                    explanation: formData.explanation
                };

                // 根据试题类型添加对应的答案字段
                if (formData.type === 0 || formData.type === 1) {
                    // 选择题和判断题使用answerOption
                    questionData.answerOption = formData.answerOption;
                } else if (formData.type === 2) {
                    // 简答题使用answer
                    questionData.answer = formData.answer;
                }

                let res;
                if (currentEditId.value) {
                    // 编辑现有试题
                    questionData.id = currentEditId.value;
                    res = await questionBankApi.updateQuestion(questionData);
                    if (res.code === 200) {
                        message.success(res.data || '更新成功');
                    } else {
                        message.error(res.message || '更新失败');
                        return;
                    }
                    currentEditId.value = null;
                } else {
                    // 添加新试题
                    res = await questionBankApi.addQuestion(questionData);
                    if (res.code === 200) {
                        message.success(res.data || '添加成功');
                    } else {
                        message.error(res.message || '添加失败');
                        return;
                    }
                }

                // 重新获取数据
                fetchQuestions();

                // 重置表单
                resetFormData();

                // 关闭模态框
                showAddQuestionModal.value = false;
            } catch (error) {
                console.error('操作失败:', error);
                message.error('操作失败: ' + (error.message || '未知错误'));
            }
        } else {
            message.error('请完善表单信息');
        }
    });
};
</script>

<style scoped>
.question-bank-container {
    padding: 20px;
}

.question-bank-card {
    margin-bottom: 20px;
}
</style>