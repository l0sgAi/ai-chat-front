<template>
    <div class="history-exams-container">
        <n-card title="历史考试记录" class="history-exams-card">
            <!-- 搜索和筛选 -->
            <n-space vertical>
                <n-space>
                    <n-input v-model:value="searchKeyword" placeholder="搜索考试名称" style="width: 200px">
                        <template #prefix>
                            <n-icon><search-outline /></n-icon>
                        </template>
                    </n-input>
                    <n-date-picker v-model:value="dateRange" type="daterange" clearable style="width: 240px"
                        placeholder="选择时间范围" />
                    <n-button @click="searchExams">搜索</n-button>
                    <n-button @click="resetSearch">重置</n-button>
                </n-space>
            </n-space>

            <!-- 历史考试列表 -->
            <n-data-table :columns="columns" :data="filteredExams" :pagination="pagination" :bordered="false"
                striped />

            <!-- 考试详情模态框 -->
            <n-modal v-model:show="showExamDetailModal" preset="card" title="考试详情" style="width: 700px">
                <template v-if="selectedExam">
                    <n-space vertical size="large">
                        <!-- 基本信息 -->
                        <n-descriptions bordered>
                            <n-descriptions-item label="考试名称">
                                {{ selectedExam.title }}
                            </n-descriptions-item>
                            <n-descriptions-item label="考试时间">
                                {{ formatDate(selectedExam.examTime) }}
                            </n-descriptions-item>
                            <n-descriptions-item label="考试用时">
                                {{ selectedExam.usedTime }} 分钟
                            </n-descriptions-item>
                            <n-descriptions-item label="总分">
                                {{ selectedExam.score }} / {{ selectedExam.totalScore }} 分
                            </n-descriptions-item>
                            <n-descriptions-item label="状态">
                                <n-tag :type="selectedExam.score >= 60 ? 'success' : 'error'">
                                    {{ selectedExam.score >= 60 ? '通过' : '未通过' }}
                                </n-tag>
                            </n-descriptions-item>
                        </n-descriptions>

                        <!-- 成绩分析 -->
                        <div class="score-analysis">
                            <h3>成绩分析</h3>
                            <n-card>
                                <n-grid :cols="3" :x-gap="12">
                                    <n-gi>
                                        <n-statistic label="正确率">
                                            {{ Math.round(selectedExam.correctRate * 100) }}%
                                        </n-statistic>
                                    </n-gi>
                                    <n-gi>
                                        <n-statistic label="排名">
                                            {{ selectedExam.rank }} / {{ selectedExam.totalStudents }}
                                        </n-statistic>
                                    </n-gi>
                                    <n-gi>
                                        <n-statistic label="用时百分比">
                                            {{ Math.round(selectedExam.usedTime / selectedExam.duration * 100) }}%
                                        </n-statistic>
                                    </n-gi>
                                </n-grid>
                            </n-card>
                        </div>

                        <!-- 题型分析 -->
                        <div class="question-type-analysis">
                            <h3>题型分析</h3>
                            <n-card>
                                <n-data-table :columns="questionTypeColumns" :data="selectedExam.questionTypeAnalysis"
                                    :bordered="false" :pagination="false" />
                            </n-card>
                        </div>

                        <!-- 错题分析 -->
                        <div class="wrong-questions" v-if="selectedExam.wrongQuestions.length > 0">
                            <h3>错题分析</h3>
                            <n-collapse>
                                <n-collapse-item v-for="(question, index) in selectedExam.wrongQuestions" :key="index"
                                    :title="`第${question.index}题: [${getQuestionTypeName(question.type)}] ${question.content.substring(0, 30)}...`">
                                    <n-space vertical>
                                        <div class="question-content">
                                            {{ question.content }}
                                        </div>

                                        <n-divider />

                                        <div class="answer-analysis">
                                            <n-space vertical>
                                                <div>
                                                    <strong>您的答案:</strong>
                                                    <span class="wrong-answer">{{ formatAnswer(question.userAnswer, question.type) }}</span>
                                                </div>
                                                <div>
                                                    <strong>正确答案:</strong>
                                                    <span class="correct-answer">{{ formatAnswer(question.correctAnswer, question.type) }}</span>
                                                </div>
                                                <div v-if="question.analysis">
                                                    <strong>解析:</strong>
                                                    <p>{{ question.analysis }}</p>
                                                </div>
                                            </n-space>
                                        </div>
                                    </n-space>
                                </n-collapse-item>
                            </n-collapse>
                        </div>
                    </n-space>
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
    NTag,
    NStatistic,
    NGrid,
    NGi,
    NDivider,
    NCollapse,
    NCollapseItem
} from 'naive-ui';
import { SearchOutline } from '@vicons/ionicons5';

const message = useMessage();

// 搜索和筛选
const searchKeyword = ref('');
const dateRange = ref(null);

// 模拟历史考试数据
const exams = reactive([
    {
        id: 1,
        title: '期中考试 - 数学',
        examTime: new Date('2023-10-15T10:00:00'),
        duration: 120,
        usedTime: 105,
        totalScore: 100,
        score: 85,
        correctRate: 0.85,
        rank: 12,
        totalStudents: 60,
        questionTypeAnalysis: [
            { type: '单选题', total: 20, correct: 18, score: 36, totalScore: 40 },
            { type: '多选题', total: 5, correct: 4, score: 16, totalScore: 20 },
            { type: '判断题', total: 10, correct: 9, score: 9, totalScore: 10 },
            { type: '填空题', total: 5, correct: 4, score: 8, totalScore: 10 },
            { type: '简答题', total: 2, correct: 1, score: 16, totalScore: 20 }
        ],
        wrongQuestions: [
            {
                index: 8,
                type: 'single',
                content: '以下哪个选项不是二次函数的性质？',
                userAnswer: 'C',
                correctAnswer: 'D',
                options: [
                    { key: 'A', value: '二次函数图像是一条抛物线' },
                    { key: 'B', value: '二次函数有最值' },
                    { key: 'C', value: '二次函数图像关于对称轴对称' },
                    { key: 'D', value: '二次函数图像必然经过坐标原点' }
                ],
                analysis: '二次函数的图像是抛物线，关于对称轴对称，有最值，但不一定经过坐标原点。'
            },
            {
                index: 22,
                type: 'fillblank',
                content: '已知函数f(x)=ax²+bx+c的图像过点(1,3)，(2,6)，(3,11)，则a=____，b=____，c=____。',
                userAnswer: '1,1,1',
                correctAnswer: '1,2,0',
                analysis: '将三个点代入函数，得到三个方程：a+b+c=3，4a+2b+c=6，9a+3b+c=11。解得a=1，b=2，c=0。'
            }
        ]
    },
    {
        id: 2,
        title: '期中考试 - 英语',
        examTime: new Date('2023-10-16T14:00:00'),
        duration: 120,
        usedTime: 110,
        totalScore: 100,
        score: 78,
        correctRate: 0.78,
        rank: 25,
        totalStudents: 60,
        questionTypeAnalysis: [
            { type: '单选题', total: 30, correct: 25, score: 50, totalScore: 60 },
            { type: '阅读理解', total: 4, correct: 3, score: 15, totalScore: 20 },
            { type: '作文', total: 1, correct: 0.65, score: 13, totalScore: 20 }
        ],
        wrongQuestions: [
            {
                index: 12,
                type: 'single',
                content: 'Which of the following is NOT a correct usage of the present perfect tense?',
                userAnswer: 'B',
                correctAnswer: 'C',
                options: [
                    { key: 'A', value: 'I have lived here for ten years.' },
                    { key: 'B', value: 'She has finished her homework.' },
                    { key: 'C', value: 'We have went to the park yesterday.' },
                    { key: 'D', value: 'They have never seen this movie.' }
                ],
                analysis: 'The correct form should be "We have gone to the park yesterday", but present perfect tense cannot be used with specific past time expressions like "yesterday".'
            }
        ]
    },
    {
        id: 3,
        title: '期中考试 - 物理',
        examTime: new Date('2023-10-18T09:00:00'),
        duration: 90,
        usedTime: 85,
        totalScore: 100,
        score: 92,
        correctRate: 0.92,
        rank: 5,
        totalStudents: 60,
        questionTypeAnalysis: [
            { type: '单选题', total: 20, correct: 19, score: 38, totalScore: 40 },
            { type: '多选题', total: 5, correct: 5, score: 20, totalScore: 20 },
            { type: '计算题', total: 4, correct: 3.5, score: 34, totalScore: 40 }
        ],
        wrongQuestions: []
    },
    {
        id: 4,
        title: '期中考试 - 化学',
        examTime: new Date('2023-10-20T09:00:00'),
        duration: 90,
        usedTime: 80,
        totalScore: 100,
        score: 65,
        correctRate: 0.65,
        rank: 40,
        totalStudents: 60,
        questionTypeAnalysis: [
            { type: '单选题', total: 20, correct: 15, score: 30, totalScore: 40 },
            { type: '多选题', total: 5, correct: 3, score: 12, totalScore: 20 },
            { type: '实验题', total: 2, correct: 1.5, score: 15, totalScore: 20 },
            { type: '计算题', total: 2, correct: 0.8, score: 8, totalScore: 20 }
        ],
        wrongQuestions: [
            {
                index: 18,
                type: 'single',
                content: '下列物质中，不能用作氧化剂的是：',
                userAnswer: 'A',
                correctAnswer: 'D',
                options: [
                    { key: 'A', value: 'KMnO₄' },
                    { key: 'B', value: 'K₂Cr₂O₇' },
                    { key: 'C', value: 'HNO₃' },
                    { key: 'D', value: 'Na₂CO₃' }
                ],
                analysis: 'Na₂CO₃不具有氧化性，不能作为氧化剂。KMnO₄、K₂Cr₂O₇和HNO₃都是常见的氧化剂。'
            }
        ]
    }
]);

// 表格列定义
const columns = [
    {
        title: '考试名称',
        key: 'title',
    },
    {
        title: '考试时间',
        key: 'examTime',
        render(row) {
            return formatDate(row.examTime);
        }
    },
    {
        title: '用时',
        key: 'usedTime',
        render(row) {
            return `${row.usedTime}/${row.duration} 分钟`;
        }
    },
    {
        title: '成绩',
        key: 'score',
        render(row) {
            return h(
                'div',
                {
                    class: `score ${row.score >= 60 ? 'pass' : 'fail'}`
                },
                { default: () => `${row.score}/${row.totalScore}` }
            );
        }
    },
    {
        title: '排名',
        key: 'rank',
        render(row) {
            return `${row.rank}/${row.totalStudents}`;
        }
    },
    {
        title: '操作',
        key: 'actions',
        render(row) {
            return h(
                NButton,
                {
                    size: 'small',
                    onClick: () => viewExamDetail(row)
                },
                { default: () => '查看详情' }
            );
        }
    }
];

// 题型分析表格列
const questionTypeColumns = [
    {
        title: '题型',
        key: 'type',
    },
    {
        title: '题目数',
        key: 'total',
    },
    {
        title: '正确数',
        key: 'correct',
        render(row) {
            // 处理小数
            return Number.isInteger(row.correct) ? row.correct : row.correct.toFixed(1);
        }
    },
    {
        title: '正确率',
        key: 'correctRate',
        render(row) {
            const rate = row.correct / row.total;
            return `${(rate * 100).toFixed(1)}%`;
        }
    },
    {
        title: '得分',
        key: 'score',
        render(row) {
            return `${row.score}/${row.totalScore}`;
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
        
        // 日期范围过滤
        let dateMatch = true;
        if (dateRange.value && dateRange.value.length === 2) {
            const examDate = new Date(exam.examTime);
            const startDate = new Date(dateRange.value[0]);
            const endDate = new Date(dateRange.value[1]);
            endDate.setHours(23, 59, 59, 999); // 设置为当天结束时间
            
            dateMatch = examDate >= startDate && examDate <= endDate;
        }
        
        return keywordMatch && dateMatch;
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
    dateRange.value = null;
    message.success('已重置搜索条件');
};

// 查看考试详情
const selectedExam = ref(null);
const showExamDetailModal = ref(false);

const viewExamDetail = (exam) => {
    selectedExam.value = exam;
    showExamDetailModal.value = true;
};

// 格式化日期
const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

// 格式化答案显示
const formatAnswer = (answer, type) => {
    if (!answer) return '未作答';
    
    if (type === 'multiple' && Array.isArray(answer)) {
        return answer.join(', ');
    }
    
    return answer;
};
</script>

<style scoped>
.history-exams-container {
    padding: 20px;
}

.history-exams-card {
    min-height: 500px;
}

.score {
    font-weight: bold;
}

.score.pass {
    color: #18a058;
}

.score.fail {
    color: #d03050;
}

.wrong-answer {
    color: #d03050;
    font-weight: bold;
}

.correct-answer {
    color: #18a058;
    font-weight: bold;
}

.question-content {
    margin-bottom: 10px;
    line-height: 1.6;
}

.score-analysis,
.question-type-analysis,
.wrong-questions {
    margin-bottom: 20px;
}

.score-analysis h3,
.question-type-analysis h3,
.wrong-questions h3 {
    margin-bottom: 10px;
    font-size: 16px;
    font-weight: bold;
}
</style>