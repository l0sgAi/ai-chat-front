<template>
    <div class="question-bank-container">
        <n-card title="试题库管理" class="question-bank-card">
            <template #header-extra>
                <n-button type="primary" @click="showAddQuestionModal = true">
                    <template #icon>
                        <n-icon><add-outline /></n-icon>
                    </template>
                    添加试题
                </n-button>
            </template>

            <!-- 试题筛选 -->
            <n-space vertical>
                <n-space>
                    <n-input v-model:value="searchKeyword" placeholder="搜索试题关键词" style="width: 200px">
                        <template #prefix>
                            <n-icon><search-outline /></n-icon>
                        </template>
                    </n-input>
                    <n-select v-model:value="selectedType" :options="typeOptions" placeholder="试题类型"
                        style="width: 150px" />
                    <n-select v-model:value="selectedDifficulty" :options="difficultyOptions" placeholder="难度等级"
                        style="width: 150px" />
                    <n-button @click="searchQuestions">搜索</n-button>
                    <n-button @click="resetSearch">重置</n-button>
                </n-space>
            </n-space>

            <!-- 试题列表 -->
            <n-data-table :columns="columns" :data="filteredQuestions" :pagination="pagination" :bordered="false"
                striped />

            <!-- 添加试题模态框 -->
            <n-modal v-model:show="showAddQuestionModal" preset="card" title="添加试题" style="width: 600px">
                <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="100">
                    <n-form-item path="title" label="试题标题">
                        <n-input v-model:value="formData.title" placeholder="请输入试题标题" />
                    </n-form-item>
                    <n-form-item path="type" label="试题类型">
                        <n-select v-model:value="formData.type" :options="typeOptions" />
                    </n-form-item>
                    <n-form-item path="difficulty" label="难度等级">
                        <n-select v-model:value="formData.difficulty" :options="difficultyOptions" />
                    </n-form-item>
                    <n-form-item path="content" label="试题内容">
                        <n-input v-model:value="formData.content" type="textarea" placeholder="请输入试题内容"
                            :autosize="{ minRows: 3, maxRows: 6 }" />
                    </n-form-item>

                    <!-- 选择题选项 -->
                    <template v-if="formData.type === 'single' || formData.type === 'multiple'">
                        <n-form-item path="options" label="选项">
                            <n-dynamic-input v-model:value="formData.options" preset="pair" key-placeholder="选项"
                                value-placeholder="内容" :min="2" :max="6" />
                        </n-form-item>
                        <n-form-item path="answer" label="正确答案">
                            <n-select v-if="formData.type === 'single'" v-model:value="formData.answer"
                                :options="formData.options.map(item => ({ label: item.key, value: item.key }))"
                                placeholder="请选择正确答案" />
                            <n-select v-else v-model:value="formData.answer" multiple
                                :options="formData.options.map(item => ({ label: item.key, value: item.key }))"
                                placeholder="请选择正确答案" />
                        </n-form-item>
                    </template>

                    <!-- 判断题答案 -->
                    <n-form-item v-if="formData.type === 'truefalse'" path="answer" label="正确答案">
                        <n-radio-group v-model:value="formData.answer">
                            <n-space>
                                <n-radio value="true">正确</n-radio>
                                <n-radio value="false">错误</n-radio>
                            </n-space>
                        </n-radio-group>
                    </n-form-item>

                    <!-- 填空题答案 -->
                    <n-form-item v-if="formData.type === 'fillblank'" path="answer" label="正确答案">
                        <n-input v-model:value="formData.answer" placeholder="请输入正确答案，多个答案用逗号分隔" />
                    </n-form-item>

                    <!-- 简答题答案 -->
                    <n-form-item v-if="formData.type === 'shortanswer'" path="answer" label="参考答案">
                        <n-input v-model:value="formData.answer" type="textarea" placeholder="请输入参考答案"
                            :autosize="{ minRows: 2, maxRows: 4 }" />
                    </n-form-item>

                    <n-form-item path="analysis" label="解析">
                        <n-input v-model:value="formData.analysis" type="textarea" placeholder="请输入试题解析"
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
                            {{ getDifficultyName(currentQuestion.difficulty) }}
                        </n-descriptions-item>
                        <n-descriptions-item label="试题内容" span="3">
                            {{ currentQuestion.content }}
                        </n-descriptions-item>

                        <!-- 选择题选项 -->
                        <template v-if="currentQuestion.type === 'single' || currentQuestion.type === 'multiple'">
                            <n-descriptions-item label="选项" span="3">
                                <n-space vertical>
                                    <div v-for="option in currentQuestion.options" :key="option.key">
                                        {{ option.key }}: {{ option.value }}
                                    </div>
                                </n-space>
                            </n-descriptions-item>
                        </template>

                        <n-descriptions-item label="正确答案" span="3">
                            <template v-if="currentQuestion.type === 'single' || currentQuestion.type === 'multiple'">
                                {{ Array.isArray(currentQuestion.answer) ? currentQuestion.answer.join(', ') :
                    currentQuestion.answer }}
                            </template>
                            <template v-else-if="currentQuestion.type === 'truefalse'">
                                {{ currentQuestion.answer === 'true' ? '正确' : '错误' }}
                            </template>
                            <template v-else>
                                {{ currentQuestion.answer }}
                            </template>
                        </n-descriptions-item>

                        <n-descriptions-item label="解析" span="3">
                            {{ currentQuestion.analysis }}
                        </n-descriptions-item>
                    </n-descriptions>
                </template>
            </n-modal>
        </n-card>
    </div>
</template>

<script setup>
import { h, ref, reactive, computed } from 'vue';
import { useMessage } from 'naive-ui';
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

// 试题类型选项
const typeOptions = [
    { label: '单选题', value: 'single' },
    { label: '多选题', value: 'multiple' },
    { label: '判断题', value: 'truefalse' },
    { label: '填空题', value: 'fillblank' },
    { label: '简答题', value: 'shortanswer' }
];

// 难度等级选项
const difficultyOptions = [
    { label: '简单', value: 'easy' },
    { label: '中等', value: 'medium' },
    { label: '困难', value: 'hard' }
];

// 获取试题类型名称
const getQuestionTypeName = (type) => {
    const option = typeOptions.find(item => item.value === type);
    return option ? option.label : type;
};

// 获取难度等级名称
const getDifficultyName = (difficulty) => {
    const option = difficultyOptions.find(item => item.value === difficulty);
    return option ? option.label : difficulty;
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
            key: 'difficulty',
            render(row) {
                return getDifficultyName(row.difficulty);
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

// 模拟试题数据
const questionData = ref([
    {
        id: 1,
        title: '什么是人工智能？',
        type: 'shortanswer',
        difficulty: 'medium',
        content: '请简要描述人工智能的定义及其主要应用领域。',
        answer: '人工智能是研究、开发用于模拟、延伸和扩展人的智能的理论、方法、技术及应用系统的一门新的技术科学。主要应用于自然语言处理、机器视觉、专家系统、机器人等领域。',
        analysis: '人工智能是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。',
        options: []
    },
    {
        id: 2,
        title: '以下哪项不是机器学习的主要类型？',
        type: 'single',
        difficulty: 'easy',
        content: '请选择一项不属于机器学习主要类型的选项。',
        options: [
            { key: 'A', value: '监督学习' },
            { key: 'B', value: '无监督学习' },
            { key: 'C', value: '强化学习' },
            { key: 'D', value: '量子学习' }
        ],
        answer: 'D',
        analysis: '机器学习的主要类型包括监督学习、无监督学习和强化学习。量子学习不是机器学习的主要类型。'
    },
    {
        id: 3,
        title: '深度学习是机器学习的一个子集',
        type: 'truefalse',
        difficulty: 'easy',
        content: '判断：深度学习是机器学习的一个子集。',
        answer: 'true',
        analysis: '深度学习是机器学习的一个子集，它使用多层神经网络来提取高级特征。',
        options: []
    }
]);

// 搜索相关状态
const searchKeyword = ref('');
const selectedType = ref(null);
const selectedDifficulty = ref(null);

// 过滤后的试题列表
const filteredQuestions = computed(() => {
    let result = [...questionData.value];

    // 关键词搜索
    if (searchKeyword.value) {
        const keyword = searchKeyword.value.toLowerCase();
        result = result.filter(q =>
            q.title.toLowerCase().includes(keyword) ||
            q.content.toLowerCase().includes(keyword)
        );
    }

    // 类型筛选
    if (selectedType.value) {
        result = result.filter(q => q.type === selectedType.value);
    }

    // 难度筛选
    if (selectedDifficulty.value) {
        result = result.filter(q => q.difficulty === selectedDifficulty.value);
    }

    return result;
});

// 搜索试题
const searchQuestions = () => {
    // 已通过计算属性实现
    message.success('搜索完成');
};

// 重置搜索
const resetSearch = () => {
    searchKeyword.value = '';
    selectedType.value = null;
    selectedDifficulty.value = null;
};

// 查看试题详情
const viewQuestionDetail = (question) => {
    currentQuestion.value = question;
    showQuestionDetailModal.value = true;
};

// 编辑试题
const editQuestion = (question) => {
    // 复制问题数据到表单
    formData.title = question.title;
    formData.type = question.type;
    formData.difficulty = question.difficulty;
    formData.content = question.content;
    formData.options = [...question.options];
    formData.answer = question.answer;
    formData.analysis = question.analysis;

    // 显示编辑模态框
    showAddQuestionModal.value = true;
    // 设置当前编辑的问题ID
    currentEditId.value = question.id;
};

// 删除试题
const removeQuestion = (question) => {
    const index = questionData.value.findIndex(q => q.id === question.id);
    if (index !== -1) {
        questionData.value.splice(index, 1);
        message.success('删除成功');
    }
};

// 表格列定义
const columns = createColumns({
    view: viewQuestionDetail,
    edit: editQuestion,
    remove: removeQuestion
});

// 分页配置
const pagination = {
    pageSize: 10
};

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
    type: 'single',
    difficulty: 'medium',
    content: '',
    options: [
        { key: 'A', value: '' },
        { key: 'B', value: '' },
        { key: 'C', value: '' },
        { key: 'D', value: '' }
    ],
    answer: '',
    analysis: ''
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
    }
};

// 表单引用
const formRef = ref(null);

// 添加试题
const addQuestion = () => {
    formRef.value?.validate((errors) => {
        if (!errors) {
            const newQuestion = {
                ...formData,
                id: currentEditId.value || Date.now()
            };

            if (currentEditId.value) {
                // 编辑现有试题
                const index = questionData.value.findIndex(q => q.id === currentEditId.value);
                if (index !== -1) {
                    questionData.value[index] = newQuestion;
                    message.success('更新成功');
                }
                currentEditId.value = null;
            } else {
                // 添加新试题
                questionData.value.push(newQuestion);
                message.success('添加成功');
            }

            // 重置表单
            formData.title = '';
            formData.content = '';
            formData.options = [
                { key: 'A', value: '' },
                { key: 'B', value: '' },
                { key: 'C', value: '' },
                { key: 'D', value: '' }
            ];
            formData.answer = '';
            formData.analysis = '';

            // 关闭模态框
            showAddQuestionModal.value = false;
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