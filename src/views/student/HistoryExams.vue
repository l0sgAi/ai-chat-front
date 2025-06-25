<template>
    <div class="history-exams-container">
        <n-card title="历史考试记录" class="history-exams-card">
            <!-- 搜索和筛选 -->
            <n-space vertical>
                <n-space class="filter-margin">
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
            <n-spin :show="loading">
                <n-data-table :columns="columns" :data="filteredExams" :pagination="pagination" :bordered="false"
                    striped />
            </n-spin>

            <!-- 考试详情模态框 -->
            <n-modal v-model:show="showExamDetailModal" preset="card" title="考试详情" style="width: 800px">
                <n-spin :show="loadingDetail">
                    <template v-if="selectedExam">
                        <n-space vertical size="large">
                            <!-- 基本信息 -->
                            <n-descriptions bordered>
                                <n-descriptions-item label="考试名称">
                                    {{ selectedExam.name || selectedExam.title }}
                                </n-descriptions-item>
                                <n-descriptions-item label="考试时间">
                                    {{ formatDate(selectedExam.startTime || selectedExam.examTime) }}
                                </n-descriptions-item>
                                <n-descriptions-item label="考试用时">
                                    {{ Math.round((selectedExam.timeUsed || 0) / 60) }} 分钟
                                </n-descriptions-item>
                                <n-descriptions-item label="总分">
                                    {{ selectedExam.score }} / {{ selectedExam.totalScore || 100 }} 分
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
                                                {{ Math.round((selectedExam.score || 0) / (selectedExam.totalScore ||
                                                    100) * 100) }}%
                                            </n-statistic>
                                        </n-gi>
                                        <n-gi>
                                            <n-statistic label="排名">
                                                {{ selectedExam.rank || '-' }} / {{ selectedExam.totalStudents || '-' }}
                                            </n-statistic>
                                        </n-gi>
                                        <n-gi>
                                            <n-statistic label="用时百分比">
                                                {{ Math.round((selectedExam.timeUsed || 0) /
                                                    (selectedExam.durationMinutes || 1) * 100) }}%
                                            </n-statistic>
                                        </n-gi>
                                    </n-grid>
                                </n-card>
                            </div>

                            <!-- 题型分析 -->
                            <div class="question-type-analysis">
                                <h3>题型分析</h3>
                                <n-card>
                                    <n-data-table :columns="questionTypeColumns" :data="computedQuestionTypeAnalysis"
                                        :bordered="false" :pagination="false" />
                                </n-card>
                            </div>

                            <!-- 题目详情 -->
                            <div class="question-details"
                                v-if="computedAllQuestions && computedAllQuestions.length > 0">
                                <h3>题目详情</h3>
                                <n-card>
                                    <n-collapse>
                                        <n-collapse-item v-for="(question, index) in computedAllQuestions"
                                            :key="question.id || index"
                                            :title="`第${question.index}题: [${getQuestionTypeName(question.type)}] ${(question.title || question.content || '').substring(0, 50)}...`">
                                            <n-space vertical>
                                                <div class="question-content">
                                                    <strong>题目:</strong> {{ question.content }}
                                                </div>

                                                <!-- 选择题选项 -->
                                                <div v-if="(question.type === 0 || question.questionType === 0 || question.qType === 0) && question.options && Array.isArray(question.options)"
                                                    class="question-options">
                                                    <strong>选项:</strong>
                                                    <div v-for="(option, optionIndex) in question.options"
                                                        :key="optionIndex" class="option-item">
                                                        {{ ['A', 'B', 'C', 'D'][optionIndex] }}. {{ option }}
                                                    </div>
                                                </div>

                                                <n-divider />

                                                <div class="answer-details">
                                                    <n-space vertical>
                                                        <div>
                                                            <strong>您的答案:</strong>
                                                            <span :class="{
                                                                'correct-answer': question.isCorrect,
                                                                'wrong-answer': !question.isCorrect
                                                            }">
                                                                {{ formatAnswer(question.type, question, true) }}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <strong>正确答案:</strong>
                                                            <span class="correct-answer">
                                                                {{ formatAnswer(question.type, question, false) }}
                                                            </span>
                                                        </div>
                                                        <div v-if="question.explanation">
                                                            <strong>解析:</strong>
                                                            <p>{{ question.explanation }}</p>
                                                        </div>
                                                        <div>
                                                            <strong>答题状态:</strong>
                                                            <n-tag :type="question.isCorrect ? 'success' : 'error'">
                                                                {{ question.isCorrect ? '正确' : '错误' }}
                                                            </n-tag>
                                                        </div>
                                                        <div v-if="question.level !== undefined">
                                                            <strong>难度等级:</strong>
                                                            <n-tag
                                                                :type="question.level === 0 ? 'success' : question.level === 1 ? 'warning' : 'error'">
                                                                {{ question.level === 0 ? '易' : question.level === 1 ?
                                                                    '中等' : '难' }}
                                                            </n-tag>
                                                        </div>
                                                    </n-space>
                                                </div>
                                            </n-space>
                                        </n-collapse-item>
                                    </n-collapse>
                                </n-card>
                            </div>
                        </n-space>
                    </template>
                </n-spin>
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
import { h, ref, reactive, computed, onMounted } from 'vue';
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
    NCollapseItem,
    NSpin
} from 'naive-ui';
import { SearchOutline } from '@vicons/ionicons5';
import { testResultApi } from '@/api/index.js';

const message = useMessage();

// 搜索和筛选
const searchKeyword = ref('');
const dateRange = ref(null);

// 数据状态
const loading = ref(false);
const exams = ref([]);
const total = ref(0);

// 数据结构基于后端TestHistoryVo实体类
// 字段说明：
// id: 主键ID
// userId: 用户ID
// testId: 考试ID
// content: 考试结果报告内容(HTML格式)
// timeUsed: 考试用时(秒)
// score: 最终得分
// name: 考试名称
// startTime: 考试开始时间
// endTime: 考试结束时间
// durationMinutes: 考试持续时间(秒)

// 加载考试历史数据
const loadExamHistory = async () => {
    try {
        loading.value = true;
        const response = await testResultApi.queryTestHistory(
            searchKeyword.value,
            pagination.page,
            pagination.pageSize
        );

        if (response.code === 200) {
            // 直接使用后端返回的TestHistoryVo数据
            exams.value = response.data.map(item => {
                const startTime = new Date(item.startTime);
                const endTime = item.endTime ? new Date(item.endTime) : new Date(startTime.getTime() + item.durationMinutes * 1000);
                const now = new Date();
                const status = now > endTime ? '已结束' : '进行中';

                return {
                    // 保持后端字段名称
                    id: item.id,
                    userId: item.userId,
                    testId: item.testId,
                    content: item.content,
                    timeUsed: item.timeUsed, // 秒
                    score: item.score,
                    name: item.name,
                    startTime: item.startTime,
                    endTime: item.endTime,
                    durationMinutes: item.durationMinutes, // 秒

                    // 为了兼容前端显示，添加计算字段
                    title: item.name, // 兼容字段
                    examTime: startTime, // 兼容字段
                    status: status,
                    usedTime: Math.round(item.timeUsed / 60), // 转换为分钟显示
                    duration: Math.round(item.durationMinutes / 60), // 转换为分钟显示
                    totalScore: 100 // 默认总分
                };
            });

            // 移除这里的computed定义，将在组件级别定义
            total.value = response.total || 0;
            pagination.itemCount = total.value;
        } else {
            message.error(response.message || '加载考试历史失败');
            exams.value = [];
        }
    } catch (error) {
        console.error('加载考试历史失败:', error);
        message.error('加载考试历史失败，请稍后重试');
        exams.value = [];
    } finally {
        loading.value = false;
    }
};

// 表格列定义
const columns = [
    {
        title: '考试名称',
        key: 'name',
        render(row) {
            return row.name || row.title;
        }
    },
    {
        title: '考试时间',
        key: 'examTime',
        render(row) {
            return formatDate(row.startTime || row.examTime);
        }
    },
    {
        title: '用时',
        key: 'usedTime',
        render(row) {
            const usedMinutes = Math.round((row.timeUsed || 0) / 60000);
            const totalMinutes = Math.round((row.durationMinutes || 0) / 60000);
            return `${usedMinutes}/${totalMinutes} 分钟`;
        }
    },
    {
        title: '状态',
        key: 'status',
        render(row) {
            return h(
                NTag,
                {
                    type: row.status === '已结束' ? 'default' : 'success'
                },
                { default: () => row.status }
            );
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
            const rank = row.rank || '-';
            const total = row.totalStudents || '-';
            return `${rank}/${total}`;
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
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 30, 40],
    onChange: (page) => {
        pagination.page = page;
        loadExamHistory();
    },
    onUpdatePageSize: (pageSize) => {
        pagination.pageSize = pageSize;
        pagination.page = 1;
        loadExamHistory();
    }
});

// 过滤后的考试列表（现在直接使用API返回的数据）
const filteredExams = computed(() => {
    if (!dateRange.value || dateRange.value.length !== 2) {
        return exams.value;
    }

    // 只进行日期范围的本地过滤，关键字过滤由后端处理
    return exams.value.filter(exam => {
        const examDate = new Date(exam.startTime || exam.examTime);
        const startDate = new Date(dateRange.value[0]);
        const endDate = new Date(dateRange.value[1]);
        endDate.setHours(23, 59, 59, 999); // 设置为当天结束时间

        return examDate >= startDate && examDate <= endDate;
    });
});

// 计算题型分析数据
const computedQuestionTypeAnalysis = computed(() => {
    if (!selectedExam.value || !selectedExam.value.content) {
        return [];
    }

    try {
        // 解析content中的题目数据
        let questions = [];
        if (typeof selectedExam.value.content === 'string') {
            // 如果content是JSON字符串，尝试解析
            const parsedContent = JSON.parse(selectedExam.value.content);
            // 支持多种数据结构
            if (Array.isArray(parsedContent)) {
                questions = parsedContent;
            } else if (parsedContent.questions && Array.isArray(parsedContent.questions)) {
                questions = parsedContent.questions;
            } else if (parsedContent.questionList && Array.isArray(parsedContent.questionList)) {
                questions = parsedContent.questionList;
            }
        } else if (Array.isArray(selectedExam.value.content)) {
            // 如果content已经是数组
            questions = selectedExam.value.content;
        } else if (selectedExam.value.content.questions) {
            // 如果content是对象且包含questions字段
            questions = selectedExam.value.content.questions;
        } else if (selectedExam.value.content.questionList) {
            // 如果content是对象且包含questionList字段
            questions = selectedExam.value.content.questionList;
        }

        // 确保questions是数组且不为空
        if (!Array.isArray(questions) || questions.length === 0) {
            console.warn('未找到有效的题目数据');
            return [];
        }

        return analyzeQuestionTypes(questions);
    } catch (error) {
        console.error('解析题目数据失败:', error);
        return [];
    }
});

// 搜索考试
const searchExams = () => {
    pagination.page = 1; // 重置到第一页
    loadExamHistory();
};

// 重置搜索
const resetSearch = () => {
    searchKeyword.value = '';
    dateRange.value = null;
    pagination.page = 1; // 重置到第一页
    loadExamHistory();
    message.success('已重置搜索条件');
};

// 查看考试详情
const selectedExam = ref(null);
const showExamDetailModal = ref(false);
const loadingDetail = ref(false);

// 计算完整题目列表
const computedAllQuestions = computed(() => {
    if (!selectedExam.value || !selectedExam.value.content) {
        return [];
    }

    try {
        // 解析content中的题目数据（content是JSON字符串）
        let questions = [];
        if (typeof selectedExam.value.content === 'string') {
            const parsedContent = JSON.parse(selectedExam.value.content);
            if (Array.isArray(parsedContent)) {
                questions = parsedContent;
            } else if (parsedContent.questions && Array.isArray(parsedContent.questions)) {
                questions = parsedContent.questions;
            } else if (parsedContent.questionList && Array.isArray(parsedContent.questionList)) {
                questions = parsedContent.questionList;
            }
        } else if (Array.isArray(selectedExam.value.content)) {
            questions = selectedExam.value.content;
        } else if (selectedExam.value.content.questions) {
            questions = selectedExam.value.content.questions;
        } else if (selectedExam.value.content.questionList) {
            questions = selectedExam.value.content.questionList;
        }

        return questions.map((q, index) => ({
            ...q,
            index: index + 1,
            title: q.title || q.content,
            userAnswer: q.stuAnswerOption !== undefined ? q.stuAnswerOption : (q.studentAnswer !== undefined ? q.studentAnswer : q.stuAnswer),
            correctAnswer: q.answerOption !== undefined ? q.answerOption : (q.correctAnswer !== undefined ? q.correctAnswer : q.answer),
            explanation: q.explanation || q.analysis,
            isCorrect: (() => {
                const questionType = q.type !== undefined ? q.type : (q.questionType !== undefined ? q.questionType : q.qType);
                if (questionType === 0 || questionType === 1) {
                    const correctAnswer = q.answerOption !== undefined ? q.answerOption : (q.correctAnswer !== undefined ? q.correctAnswer : q.answer);
                    const studentAnswer = q.stuAnswerOption !== undefined ? q.stuAnswerOption : (q.studentAnswer !== undefined ? q.studentAnswer : q.stuAnswer);
                    return correctAnswer === studentAnswer;
                } else {
                    const correctAnswer = q.answer !== undefined ? q.answer : q.correctAnswer;
                    const studentAnswer = q.stuAnswer !== undefined ? q.stuAnswer : q.studentAnswer;
                    return correctAnswer === studentAnswer;
                }
            })()
        }));
    } catch (error) {
        console.error('解析题目数据失败:', error);
        return [];
    }
});

const viewExamDetail = async (exam) => {
    try {
        loadingDetail.value = true;
        showExamDetailModal.value = true;

        // 从现有数据中查找对应的考试记录
        const foundExam = exams.value.find(e => e.id === exam.id);
        console.log('foundExam:', foundExam);
        if (foundExam) {
            // 直接使用找到的考试数据，content字段已经是JSON字符串格式
            selectedExam.value = foundExam;
            console.log('selectedExam content:', foundExam.content);
        } else {
            message.error('未找到对应的考试记录');
            selectedExam.value = null;
        }
    } catch (error) {
        console.error('获取考试详情失败:', error);
        message.error('获取考试详情失败');
    } finally {
        loadingDetail.value = false;
    }
};

// 分析题型统计
const analyzeQuestionTypes = (questions) => {
    const typeMap = {
        0: { name: '选择题', total: 0, correct: 0 },
        1: { name: '判断题', total: 0, correct: 0 },
        2: { name: '简答题', total: 0, correct: 0 }
    };

    questions.forEach(q => {
        // 支持多种字段名称映射
        const questionType = q.type !== undefined ? q.type : (q.questionType !== undefined ? q.questionType : q.qType);

        if (typeMap[questionType] !== undefined) {
            typeMap[questionType].total++;

            let isCorrect = false;
            if (questionType === 0 || questionType === 1) { // 选择题或判断题
                // 支持多种答案字段名称
                const correctAnswer = q.answerOption !== undefined ? q.answerOption : (q.correctAnswer !== undefined ? q.correctAnswer : q.answer);
                const studentAnswer = q.stuAnswerOption !== undefined ? q.stuAnswerOption : (q.studentAnswer !== undefined ? q.studentAnswer : q.stuAnswer);
                isCorrect = correctAnswer === studentAnswer;
            } else { // 简答题
                // 支持多种答案字段名称
                const correctAnswer = q.answer !== undefined ? q.answer : q.correctAnswer;
                const studentAnswer = q.stuAnswer !== undefined ? q.stuAnswer : q.studentAnswer;
                // 简答题可能需要更复杂的比较逻辑，这里简化处理
                isCorrect = correctAnswer === studentAnswer;
            }

            if (isCorrect) {
                typeMap[questionType].correct++;
            }
        }
    });

    return Object.values(typeMap)
        .filter(type => type.total > 0)
        .map(type => ({
            type: type.name,
            total: type.total,
            correct: type.correct,
            score: type.correct, // 简化处理，实际应该根据分值计算
            totalScore: type.total
        }));
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
        0: '选择题',
        1: '判断题',
        2: '简答题'
    };
    return typeMap[type];
};

// 格式化答案显示
const formatAnswer = (type, question = null, isRight) => {
    if (!isRight) { // 显示正确答案
        const answer = question.answer;
        const answerOption = question.answerOption;
        if (!answer && !answerOption) return '无';

        // 处理新的题型编号
        if (type === 0) { // 选择题
            // 如果有题目对象且包含选项，显示选项内容
            if (answerOption) {
                const options = ['A', 'B', 'C', 'D'];
                return `${options[answerOption]}`;
            }
            return '未知';
        } else if (type === 1) { // 判断题
            return answerOption === 0 ? '正确' : answerOption === 1 ? '错误' : answerOption;
        } else if (type === 2) { // 简答题
            return answer;
        }
    } else { // 显示用户答案
        const answer = question.stuAnswer;
        const answerOption = question.stuAnswerOption;
        if (!answer && !answerOption) return '未作答';

        // 处理新的题型编号
        if (type === 0) { // 选择题
            // 如果有题目对象且包含选项，显示选项内容
            if (answerOption) {
                const options = ['A', 'B', 'C', 'D'];
                return `${options[answerOption]}`;
            }
            return '未知';
        } else if (type === 1) { // 判断题
            return answerOption === 0 ? '正确' : answerOption === 1 ? '错误' : answerOption;
        } else if (type === 2) { // 简答题
            return answer;
        }
    }
    return '未知';
};

// 组件挂载时加载数据
onMounted(() => {
    loadExamHistory();
});
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
.wrong-questions,
.all-questions {
    margin-bottom: 20px;
}

.score-analysis h3,
.question-type-analysis h3,
.wrong-questions h3,
.all-questions h3 {
    margin-bottom: 10px;
    font-size: 16px;
    font-weight: bold;
}

.question-content {
    background-color: #444444;
    color: #fff;
    padding: 12px;
    border-radius: 6px;
    border-left: 4px solid #007bff;
}

.answer-analysis {
    background-color: #444444;
    color: #fff;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #e9ecef;
}

.question-options {
    margin: 10px 0;
    padding: 10px;
    color: #fff;
    background-color: #444444;
    border-radius: 6px;
}

.option-item {
    margin: 5px 0;
    padding: 5px 10px;
    background-color: #ffffff;
    border-radius: 4px;
    border-left: 3px solid #007bff;
}
</style>