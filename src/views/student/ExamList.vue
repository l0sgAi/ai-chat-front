<template>
    <div class="exam-list-container">
        <n-card title="可参加的考试" class="exam-list-card">
            <!-- 考试列表/考试进行中的切换 -->
            <n-tabs type="line" animated v-model:value="activeTab">
                <n-tab-pane name="exam-list" tab="考试列表">
                    <!-- 考试列表 -->
                    <n-space vertical>
                        <n-space>
                            <n-input v-model:value="searchKeyword" placeholder="搜索考试名称" style="width: 200px">
                                <template #prefix>
                                    <n-icon><search-outline /></n-icon>
                                </template>
                            </n-input>
                            <n-select v-model:value="selectedStatus" :options="statusOptions" placeholder="考试状态"
                                style="width: 150px" />
                            <n-button @click="searchExams">搜索</n-button>
                            <n-button @click="resetSearch">重置</n-button>
                        </n-space>
                    </n-space>

                    <n-data-table :columns="columns" :data="filteredExams" :pagination="pagination" :bordered="false"
                        striped />
                </n-tab-pane>
                <n-tab-pane name="exam-taking" tab="考试进行中" display-directive="show">
                    <!-- 考试进行中界面 -->
                    <template v-if="currentExam">
                        <div class="exam-header">
                            <h2>{{ currentExam.title }}</h2>
                            <div class="exam-info">
                                <n-space>
                                    <span>总分: {{ currentExam.totalScore }}分</span>
                                    <span>题目数: {{ currentExam.questions.length }}</span>
                                    <n-countdown :duration="currentExam.duration * 60 * 1000" :active="examStarted"
                                        :precision="1" @finish="submitExam">
                                        <template #default="{ hours, minutes, seconds }">
                                            剩余时间: {{ hours }}:{{ minutes }}:{{ seconds }}
                                        </template>
                                    </n-countdown>
                                </n-space>
                            </div>
                        </div>

                        <n-divider />

                        <div class="exam-content">
                            <n-space vertical size="large">
                                <div v-for="(question, index) in currentExam.questions" :key="question.id"
                                    class="question-item">
                                    <div class="question-header">
                                        <span class="question-number">{{ index + 1 }}.</span>
                                        <span class="question-type">[{{ getQuestionTypeName(question.type) }}]</span>
                                        <span class="question-score">({{ question.score }}分)</span>
                                    </div>
                                    <div class="question-content">
                                        {{ question.content }}
                                    </div>

                                    <!-- 选择题选项 -->
                                    <template v-if="question.type === 'single'">
                                        <n-radio-group v-model:value="userAnswers[question.id]">
                                            <n-space vertical>
                                                <n-radio v-for="option in question.options" :key="option.key"
                                                    :value="option.key">
                                                    {{ option.key }}: {{ option.value }}
                                                </n-radio>
                                            </n-space>
                                        </n-radio-group>
                                    </template>

                                    <template v-else-if="question.type === 'multiple'">
                                        <n-checkbox-group v-model:value="userAnswers[question.id]">
                                            <n-space vertical>
                                                <n-checkbox v-for="option in question.options" :key="option.key"
                                                    :value="option.key">
                                                    {{ option.key }}: {{ option.value }}
                                                </n-checkbox>
                                            </n-space>
                                        </n-checkbox-group>
                                    </template>

                                    <!-- 判断题选项 -->
                                    <template v-else-if="question.type === 'truefalse'">
                                        <n-radio-group v-model:value="userAnswers[question.id]">
                                            <n-space>
                                                <n-radio value="true">正确</n-radio>
                                                <n-radio value="false">错误</n-radio>
                                            </n-space>
                                        </n-radio-group>
                                    </template>

                                    <!-- 填空题答案 -->
                                    <template v-else-if="question.type === 'fillblank'">
                                        <n-input v-model:value="userAnswers[question.id]"
                                            placeholder="请输入答案，多个答案用逗号分隔" />
                                    </template>

                                    <!-- 简答题答案 -->
                                    <template v-else-if="question.type === 'shortanswer'">
                                        <n-input v-model:value="userAnswers[question.id]" type="textarea"
                                            placeholder="请输入答案" :autosize="{ minRows: 3, maxRows: 6 }" />
                                    </template>
                                </div>
                            </n-space>
                        </div>

                        <n-divider />

                        <div class="exam-footer">
                            <n-space justify="end">
                                <n-button @click="activeTab = 'exam-list'">返回列表</n-button>
                                <n-button type="primary" @click="submitExam">提交试卷</n-button>
                            </n-space>
                        </div>
                    </template>
                </n-tab-pane>
            </n-tabs>

            <!-- 考试详情模态框 -->
            <n-modal v-model:show="showExamDetailModal" preset="card" title="考试详情" style="width: 600px">
                <template v-if="selectedExam">
                    <n-descriptions bordered>
                        <n-descriptions-item label="考试名称">
                            {{ selectedExam.title }}
                        </n-descriptions-item>
                        <n-descriptions-item label="考试时长">
                            {{ selectedExam.duration }} 分钟
                        </n-descriptions-item>
                        <n-descriptions-item label="总分">
                            {{ selectedExam.totalScore }} 分
                        </n-descriptions-item>
                        <n-descriptions-item label="开始时间">
                            {{ formatDate(selectedExam.startTime) }}
                        </n-descriptions-item>
                        <n-descriptions-item label="结束时间">
                            {{ formatDate(selectedExam.endTime) }}
                        </n-descriptions-item>
                        <n-descriptions-item label="状态">
                            {{ getStatusName(selectedExam.status) }}
                        </n-descriptions-item>
                        <n-descriptions-item label="考试说明" span="3">
                            {{ selectedExam.description }}
                        </n-descriptions-item>
                    </n-descriptions>
                </template>
                <template #footer>
                    <n-space justify="end">
                        <n-button @click="showExamDetailModal = false">关闭</n-button>
                        <n-button v-if="selectedExam && selectedExam.status === 'ongoing'" type="primary"
                            @click="startExam">
                            开始考试
                        </n-button>
                    </n-space>
                </template>
            </n-modal>

            <!-- 考试结果模态框 -->
            <n-modal v-model:show="showExamResultModal" preset="card" title="考试结果" style="width: 600px">
                <template v-if="examResult">
                    <n-result :status="examResult.score >= 60 ? 'success' : 'error'"
                        :title="examResult.score >= 60 ? '考试通过' : '考试未通过'"
                        :description="`您的得分: ${examResult.score}分 (总分: ${examResult.totalScore}分)`">
                        <template #footer>
                            <n-button type="primary" @click="viewExamDetail">查看详情</n-button>
                        </template>
                    </n-result>
                </template>
                <template #footer>
                    <n-space justify="end">
                        <n-button @click="showExamResultModal = false">关闭</n-button>
                    </n-space>
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
    NResult
} from 'naive-ui';
import { SearchOutline } from '@vicons/ionicons5';

const message = useMessage();

// 考试列表相关
const activeTab = ref('exam-list');
const searchKeyword = ref('');
const selectedStatus = ref(null);

// 状态选项
const statusOptions = [
    { label: '全部', value: null },
    { label: '未开始', value: 'upcoming' },
    { label: '进行中', value: 'ongoing' },
    { label: '已结束', value: 'completed' }
];

// 模拟考试数据
const exams = reactive([
    {
        id: 1,
        title: '期中考试 - 数学',
        startTime: new Date('2023-11-01T09:00:00'),
        endTime: new Date('2023-11-01T11:00:00'),
        duration: 120,
        totalScore: 100,
        status: 'completed',
        description: '本次考试包含选择题、填空题和解答题，满分100分。'
    },
    {
        id: 2,
        title: '期中考试 - 英语',
        startTime: new Date('2023-11-02T14:00:00'),
        endTime: new Date('2023-11-02T16:00:00'),
        duration: 120,
        totalScore: 100,
        status: 'completed',
        description: '本次考试包含听力、阅读理解和写作，满分100分。'
    },
    {
        id: 3,
        title: '期末考试 - 数学',
        startTime: new Date('2023-12-20T09:00:00'),
        endTime: new Date('2023-12-20T11:00:00'),
        duration: 120,
        totalScore: 100,
        status: 'upcoming',
        description: '本次考试包含选择题、填空题和解答题，满分100分。'
    },
    {
        id: 4,
        title: '期末考试 - 英语',
        startTime: new Date(),  // 当前时间，表示正在进行
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),  // 2小时后
        duration: 120,
        totalScore: 100,
        status: 'ongoing',
        description: '本次考试包含听力、阅读理解和写作，满分100分。'
    }
]);

// 表格列定义
const columns = [
    {
        title: '考试名称',
        key: 'title',
    },
    {
        title: '开始时间',
        key: 'startTime',
        render(row) {
            return formatDate(row.startTime);
        }
    },
    {
        title: '结束时间',
        key: 'endTime',
        render(row) {
            return formatDate(row.endTime);
        }
    },
    {
        title: '考试时长',
        key: 'duration',
        render(row) {
            return `${row.duration} 分钟`;
        }
    },
    {
        title: '状态',
        key: 'status',
        render(row) {
            return h(
                'div',
                {
                    class: `status-tag ${row.status}`
                },
                { default: () => getStatusName(row.status) }
            );
        }
    },
    {
        title: '操作',
        key: 'actions',
        render(row) {
            return h(
                NSpace,
                {},
                {
                    default: () => [
                        h(
                            NButton,
                            {
                                size: 'small',
                                onClick: () => viewExamDetail(row)
                            },
                            { default: () => '详情' }
                        ),
                        row.status === 'ongoing' ?
                            h(
                                NButton,
                                {
                                    type: 'primary',
                                    size: 'small',
                                    onClick: () => startExam(row)
                                },
                                { default: () => '开始考试' }
                            ) : null
                    ]
                }
            );
        }
    }
];

// 分页设置
const pagination = reactive({
    page: 1,
    pageSize: 10,
    showSizePicker: true,
    pageSizes: [10, 20, 30, 40],
    onChange: (page) => {
        pagination.page = page;
    },
    onUpdatePageSize: (pageSize) => {
        pagination.pageSize = pageSize;
        pagination.page = 1;
    }
});

// 过滤后的考试列表
const filteredExams = computed(() => {
    return exams.filter(exam => {
        // 关键字过滤
        const keywordMatch = !searchKeyword.value || exam.title.toLowerCase().includes(searchKeyword.value.toLowerCase());
        // 状态过滤
        const statusMatch = !selectedStatus.value || exam.status === selectedStatus.value;
        return keywordMatch && statusMatch;
    });
});

// 搜索考试
const searchExams = () => {
    // 已通过计算属性实现
    message.success('搜索完成');
};

// 重置搜索
const resetSearch = () => {
    searchKeyword.value = '';
    selectedStatus.value = null;
    message.success('已重置搜索条件');
};

// 查看考试详情
const selectedExam = ref(null);
const showExamDetailModal = ref(false);

const viewExamDetail = (exam) => {
    selectedExam.value = exam;
    showExamDetailModal.value = true;
};

// 开始考试
const currentExam = ref(null);
const examStarted = ref(false);
const userAnswers = reactive({});

const startExam = (exam) => {
    // 关闭详情模态框
    showExamDetailModal.value = false;

    // 设置当前考试
    currentExam.value = {
        ...exam,
        questions: [
            {
                id: 1,
                type: 'single',
                content: '下列哪个选项是正确的？',
                options: [
                    { key: 'A', value: '选项A' },
                    { key: 'B', value: '选项B' },
                    { key: 'C', value: '选项C' },
                    { key: 'D', value: '选项D' }
                ],
                score: 5
            },
            {
                id: 2,
                type: 'multiple',
                content: '以下哪些选项是正确的？（多选）',
                options: [
                    { key: 'A', value: '选项A' },
                    { key: 'B', value: '选项B' },
                    { key: 'C', value: '选项C' },
                    { key: 'D', value: '选项D' }
                ],
                score: 10
            },
            {
                id: 3,
                type: 'truefalse',
                content: '这道题的答案是正确的。',
                score: 5
            },
            {
                id: 4,
                type: 'fillblank',
                content: '请填写正确答案：___',
                score: 10
            },
            {
                id: 5,
                type: 'shortanswer',
                content: '请简要说明你的观点。',
                score: 20
            }
        ]
    };

    // 初始化答案
    currentExam.value.questions.forEach(q => {
        if (q.type === 'multiple') {
            userAnswers[q.id] = [];
        } else {
            userAnswers[q.id] = '';
        }
    });

    // 切换到考试界面
    activeTab.value = 'exam-taking';
    examStarted.value = true;

    message.success('考试已开始，请认真作答');
};

// 提交考试
const examResult = ref(null);
const showExamResultModal = ref(false);

const submitExam = () => {
    // 检查是否有未完成的题目
    const unansweredQuestions = currentExam.value.questions.filter(q => {
        if (q.type === 'multiple') {
            return !userAnswers[q.id] || userAnswers[q.id].length === 0;
        }
        return !userAnswers[q.id];
    });

    if (unansweredQuestions.length > 0) {
        if (!window.confirm(`您还有 ${unansweredQuestions.length} 道题目未完成，确定要提交吗？`)) {
            return;
        }
    }

    // 模拟评分
    const totalScore = currentExam.value.totalScore;
    const score = Math.floor(Math.random() * 41) + 60; // 随机生成60-100的分数

    examResult.value = {
        examId: currentExam.value.id,
        title: currentExam.value.title,
        score,
        totalScore,
        submittedAt: new Date()
    };

    // 显示结果
    showExamResultModal.value = true;
    examStarted.value = false;

    // 重置
    setTimeout(() => {
        activeTab.value = 'exam-list';
        currentExam.value = null;
        Object.keys(userAnswers).forEach(key => delete userAnswers[key]);
    }, 500);
};

// 格式化日期
const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 获取状态名称
const getStatusName = (status) => {
    const statusMap = {
        'upcoming': '未开始',
        'ongoing': '进行中',
        'completed': '已结束'
    };
    return statusMap[status] || status;
};

// 获取题型名称
const getQuestionTypeName = (type) => {
    const typeMap = {
        'single': '单选题',
        'multiple': '多选题',
        'truefalse': '判断题',
        'fillblank': '填空题',
        'shortanswer': '简答题'
    };
    return typeMap[type] || type;
};
</script>

<style scoped>
.exam-list-container {
    padding: 20px;
}

.exam-list-card {
    min-height: 500px;
}

.status-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.status-tag.upcoming {
    background-color: #e6f7ff;
    color: #1890ff;
}

.status-tag.ongoing {
    background-color: #f6ffed;
    color: #52c41a;
}

.status-tag.completed {
    background-color: #f5f5f5;
    color: #666;
}

.question-type-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    background-color: #f5f5f5;
}
</style>