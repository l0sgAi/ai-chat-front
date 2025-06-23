<template>
    <div class="grade-evaluation-container">
        <n-card title="成绩评估" class="grade-evaluation-card">
            <!-- 成绩筛选 -->
            <n-space vertical>
                <n-space>
                    <n-input v-model:value="searchKeyword" placeholder="搜索考试名称" style="width: 200px">
                        <template #prefix>
                            <n-icon><search-outline /></n-icon>
                        </template>
                    </n-input>
                    <n-date-picker v-model:value="selectedDate" type="date" placeholder="考试日期" clearable />
                    <n-button @click="searchGrades">搜索</n-button>
                    <n-button @click="resetSearch">重置</n-button>
                </n-space>
            </n-space>

            <!-- 成绩列表 -->
            <n-data-table :columns="columns" :data="filteredGrades" :pagination="pagination" :bordered="false"
                striped />

            <!-- 成绩详情模态框 -->
            <n-modal v-model:show="showGradeDetailModal" preset="card" title="成绩详情" style="width: 800px">
                <template v-if="currentGrade">
                    <n-descriptions bordered>
                        <n-descriptions-item label="考试名称">
                            {{ currentGrade.examTitle }}
                        </n-descriptions-item>
                        <n-descriptions-item label="考试时间">
                            {{ formatDate(currentGrade.examTime) }}
                        </n-descriptions-item>
                        <n-descriptions-item label="考试时长">
                            {{ currentGrade.duration }} 分钟
                        </n-descriptions-item>
                        <n-descriptions-item label="总分">
                            {{ currentGrade.totalScore }}
                        </n-descriptions-item>
                        <n-descriptions-item label="得分">
                            {{ currentGrade.score }}
                        </n-descriptions-item>
                        <n-descriptions-item label="状态">
                            <n-tag :type="currentGrade.score >= 60 ? 'success' : 'error'">
                                {{ currentGrade.score >= 60 ? '通过' : '未通过' }}
                            </n-tag>
                        </n-descriptions-item>
                    </n-descriptions>

                    <n-divider />

                    <h3>答题详情</h3>
                    <n-space vertical size="large" style="margin-top: 16px">
                        <div v-for="(question, index) in currentGrade.questions" :key="question.id"
                            class="question-item">
                            <div class="question-header">
                                <span class="question-number">{{ index + 1 }}.</span>
                                <span class="question-type">[{{ getQuestionTypeName(question.type) }}]</span>
                                <span class="question-score">({{ question.score }}分)</span>
                                <n-tag :type="question.isCorrect ? 'success' : 'error'" style="margin-left: 8px">
                                    {{ question.isCorrect ? '正确' : '错误' }}
                                </n-tag>
                            </div>
                            <div class="question-content">
                                {{ question.content }}
                            </div>

                            <!-- 选择题选项 -->
                            <template v-if="question.type === 'single' || question.type === 'multiple'">
                                <div class="options-list">
                                    <div v-for="option in question.options" :key="option.key" class="option-item">
                                        <span :class="{
                        'option-correct': isCorrectOption(question, option.key),
                        'option-wrong': isWrongOption(question, option.key),
                        'option-selected': isSelectedOption(question, option.key)
                    }">
                                            {{ option.key }}: {{ option.value }}
                                        </span>
                                    </div>
                                </div>
                            </template>

                            <!-- 判断题 -->
                            <template v-else-if="question.type === 'truefalse'">
                                <div class="options-list">
                                    <div class="option-item">
                                        <span :class="{
                        'option-correct': question.answer === 'true' && question.userAnswer === 'true',
                        'option-wrong': question.answer !== 'true' && question.userAnswer === 'true',
                        'option-selected': question.userAnswer === 'true'
                    }">
                                            正确
                                        </span>
                                    </div>
                                    <div class="option-item">
                                        <span :class="{
                        'option-correct': question.answer === 'false' && question.userAnswer === 'false',
                        'option-wrong': question.answer !== 'false' && question.userAnswer === 'false',
                        'option-selected': question.userAnswer === 'false'
                    }">
                                            错误
                                        </span>
                                    </div>
                                </div>
                            </template>

                            <!-- 填空题和简答题 -->
                            <template v-else>
                                <div class="answer-comparison">
                                    <div class="user-answer">
                                        <h4>您的答案:</h4>
                                        <div class="answer-content">
                                            {{ question.userAnswer || '未作答' }}
                                        </div>
                                    </div>
                                    <div class="correct-answer">
                                        <h4>正确答案:</h4>
                                        <div class="answer-content">
                                            {{ question.answer }}
                                        </div>
                                    </div>
                                </div>
                            </template>

                            <div class="question-analysis" v-if="question.analysis">
                                <h4>解析:</h4>
                                <div class="analysis-content">
                                    {{ question.analysis }}
                                </div>
                            </div>
                        </div>
                    </n-space>
                </template>
                <template #footer>
                    <n-space justify="end">
                        <n-button @click="showGradeDetailModal = false">关闭</n-button>
                        <n-button type="primary" @click="printGradeDetail">打印成绩单</n-button>
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
    NModal,
    NInput,
    NIcon,
    NDatePicker,
    NDescriptions,
    NDescriptionsItem,
    NDivider,
    NTag
} from 'naive-ui';
import {
    SearchOutline,
    EyeOutline,
    PrintOutline
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

// 获取试题类型名称
const getQuestionTypeName = (type) => {
    const option = typeOptions.find(item => item.value === type);
    return option ? option.label : type;
};

// 日期格式化
const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 表格列定义
const createColumns = ({ view }) => {
    return [
        {
            title: '考试名称',
            key: 'examTitle',
            ellipsis: {
                tooltip: true
            }
        },
        {
            title: '考试时间',
            key: 'examTime',
            render(row) {
                return formatDate(row.examTime);
            }
        },
        {
            title: '总分',
            key: 'totalScore'
        },
        {
            title: '得分',
            key: 'score'
        },
        {
            title: '状态',
            key: 'status',
            render(row) {
                return h(
                    NTag,
                    {
                        type: row.score >= 60 ? 'success' : 'error'
                    },
                    { default: () => row.score >= 60 ? '通过' : '未通过' }
                );
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
                                default: () => '查看详情',
                                icon: () => h(NIcon, null, { default: () => h(EyeOutline) })
                            }
                        )
                    ]
                });
            }
        }
    ];
};

// 模拟成绩数据
const gradeData = ref([
    {
        id: 1,
        examTitle: '人工智能基础期中考试',
        examTime: new Date('2023-10-15T09:00:00'),
        duration: 90,
        totalScore: 100,
        score: 85,
        questions: [
            {
                id: 1,
                type: 'single',
                content: '以下哪项不是机器学习的主要类型？',
                options: [
                    { key: 'A', value: '监督学习' },
                    { key: 'B', value: '无监督学习' },
                    { key: 'C', value: '强化学习' },
                    { key: 'D', value: '量子学习' }
                ],
                answer: 'D',
                userAnswer: 'D',
                score: 10,
                isCorrect: true,
                analysis: '机器学习的主要类型包括监督学习、无监督学习和强化学习。量子学习不是机器学习的主要类型。'
            },
            {
                id: 2,
                type: 'multiple',
                content: '以下哪些是深度学习常用的框架？',
                options: [
                    { key: 'A', value: 'TensorFlow' },
                    { key: 'B', value: 'PyTorch' },
                    { key: 'C', value: 'Keras' },
                    { key: 'D', value: 'Excel' }
                ],
                answer: ['A', 'B', 'C'],
                userAnswer: ['A', 'B', 'D'],
                score: 10,
                isCorrect: false,
                analysis: 'TensorFlow、PyTorch和Keras都是深度学习常用的框架，而Excel是电子表格软件，不是深度学习框架。'
            },
            {
                id: 3,
                type: 'truefalse',
                content: '深度学习是机器学习的一个子集。',
                answer: 'true',
                userAnswer: 'true',
                score: 5,
                isCorrect: true,
                analysis: '深度学习是机器学习的一个子集，它使用多层神经网络来提取高级特征。'
            }
        ]
    },
    {
        id: 2,
        examTitle: '数据结构与算法期末考试',
        examTime: new Date('2023-12-20T14:00:00'),
        duration: 120,
        totalScore: 100,
        score: 72,
        questions: []
    },
    {
        id: 3,
        examTitle: '计算机网络原理测验',
        examTime: new Date('2023-11-05T10:30:00'),
        duration: 60,
        totalScore: 50,
        score: 45,
        questions: []
    }
]);

// 搜索相关状态
const searchKeyword = ref('');
const selectedDate = ref(null);

// 过滤后的成绩列表
const filteredGrades = computed(() => {
    let result = [...gradeData.value];

    // 关键词搜索
    if (searchKeyword.value) {
        const keyword = searchKeyword.value.toLowerCase();
        result = result.filter(grade =>
            grade.examTitle.toLowerCase().includes(keyword)
        );
    }

    // 日期筛选
    if (selectedDate.value) {
        const selectedDateStr = new Date(selectedDate.value).toDateString();
        result = result.filter(grade => {
            return new Date(grade.examTime).toDateString() === selectedDateStr;
        });
    }

    return result;
});

// 搜索成绩
const searchGrades = () => {
    // 已通过计算属性实现
    message.success('搜索完成');
};

// 重置搜索
const resetSearch = () => {
    searchKeyword.value = '';
    selectedDate.value = null;
};

// 分页配置
const pagination = {
    pageSize: 10
};

// 模态框状态
const showGradeDetailModal = ref(false);
const currentGrade = ref(null);

// 表格列
const columns = createColumns({
    view: (row) => {
        currentGrade.value = row;
        showGradeDetailModal.value = true;
    }
});

// 判断选项是否正确
const isCorrectOption = (question, optionKey) => {
    if (question.type === 'single') {
        return question.answer === optionKey;
    } else if (question.type === 'multiple') {
        return question.answer.includes(optionKey);
    }
    return false;
};

// 判断选项是否错误选择
const isWrongOption = (question, optionKey) => {
    if (question.type === 'single') {
        return question.userAnswer === optionKey && question.answer !== optionKey;
    } else if (question.type === 'multiple') {
        return question.userAnswer.includes(optionKey) && !question.answer.includes(optionKey);
    }
    return false;
};

// 判断选项是否被选择
const isSelectedOption = (question, optionKey) => {
    if (question.type === 'single') {
        return question.userAnswer === optionKey;
    } else if (question.type === 'multiple') {
        return question.userAnswer.includes(optionKey);
    }
    return false;
};

// 打印成绩单
const printGradeDetail = () => {
    message.info('打印功能待实现');
    // 实际项目中可以调用浏览器打印功能或生成PDF
    // window.print();
};
</script>

<style scoped>
.grade-evaluation-container {
    padding: 20px;
}

.grade-evaluation-card {
    margin-bottom: 20px;
}

.question-item {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    background-color: #f9f9f9;
}

.question-header {
    margin-bottom: 12px;
    font-weight: bold;
}

.question-content {
    margin-bottom: 12px;
}

.options-list {
    margin-left: 20px;
}

.option-item {
    margin-bottom: 8px;
}

.option-correct {
    color: #18a058;
    font-weight: bold;
}

.option-wrong {
    color: #d03050;
    text-decoration: line-through;
}

.option-selected {
    font-weight: bold;
}

.answer-comparison {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 12px;
}

.user-answer,
.correct-answer {
    padding: 12px;
    border-radius: 4px;
}

.user-answer {
    background-color: #f0f0f0;
}

.correct-answer {
    background-color: #e8f5e9;
}

.answer-content {
    margin-top: 8px;
    white-space: pre-wrap;
}

.question-analysis {
    margin-top: 16px;
    padding: 12px;
    background-color: #fff8e1;
    border-radius: 4px;
}

.analysis-content {
    margin-top: 8px;
}
</style>