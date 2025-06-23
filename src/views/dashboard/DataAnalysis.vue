<template>
    <div class="data-analysis-container">
        <n-card title="数据统计分析" class="data-analysis-card">
            <!-- 数据筛选 -->
            <n-space vertical>
                <n-space>
                    <n-select v-model:value="selectedExam" :options="examOptions" placeholder="选择考试"
                        style="width: 250px" />
                    <n-select v-model:value="selectedClass" :options="classOptions" placeholder="选择班级"
                        style="width: 200px" />
                    <n-date-picker v-model:value="dateRange" type="daterange" clearable placeholder="选择日期范围" />
                    <n-button @click="refreshData">刷新数据</n-button>
                </n-space>
            </n-space>

            <!-- 数据概览卡片 -->
            <n-grid :cols="4" :x-gap="12" style="margin-top: 20px">
                <n-grid-item>
                    <n-card>
                        <template #header>
                            <n-space align="center">
                                <n-icon size="24" color="#2080f0">
                                    <people-outline />
                                </n-icon>
                                <span>参与人数</span>
                            </n-space>
                        </template>
                        <div class="stat-value">{{ statistics.totalStudents }}</div>
                        <div class="stat-desc">较上期增长 {{ statistics.studentGrowth }}%</div>
                    </n-card>
                </n-grid-item>
                <n-grid-item>
                    <n-card>
                        <template #header>
                            <n-space align="center">
                                <n-icon size="24" color="#18a058">
                                    <stats-chart-outline />
                                </n-icon>
                                <span>平均分数</span>
                            </n-space>
                        </template>
                        <div class="stat-value">{{ statistics.averageScore.toFixed(1) }}</div>
                        <div class="stat-desc">较上期{{ statistics.scoreGrowth > 0 ? '增长' : '下降' }} {{
                        Math.abs(statistics.scoreGrowth) }}%
                        </div>
                    </n-card>
                </n-grid-item>
                <n-grid-item>
                    <n-card>
                        <template #header>
                            <n-space align="center">
                                <n-icon size="24" color="#2080f0">
                                    <checkmark-circle-outline />
                                </n-icon>
                                <span>通过率</span>
                            </n-space>
                        </template>
                        <div class="stat-value">{{ (statistics.passRate * 100).toFixed(1) }}%</div>
                        <div class="stat-desc">较上期{{ statistics.passRateGrowth > 0 ? '增长' : '下降' }} {{
                        Math.abs(statistics.passRateGrowth) }}%</div>
                    </n-card>
                </n-grid-item>
                <n-grid-item>
                    <n-card>
                        <template #header>
                            <n-space align="center">
                                <n-icon size="24" color="#d03050">
                                    <time-outline />
                                </n-icon>
                                <span>平均用时</span>
                            </n-space>
                        </template>
                        <div class="stat-value">{{ statistics.averageTime }}分钟</div>
                        <div class="stat-desc">较上期{{ statistics.timeGrowth > 0 ? '增加' : '减少' }} {{
                        Math.abs(statistics.timeGrowth) }}%
                        </div>
                    </n-card>
                </n-grid-item>
            </n-grid>

            <!-- 图表区域 -->
            <n-grid :cols="2" :x-gap="12" :y-gap="12" style="margin-top: 20px">
                <n-grid-item>
                    <n-card title="成绩分布">
                        <div ref="scoreDistributionChart" class="chart-container"></div>
                    </n-card>
                </n-grid-item>
                <n-grid-item>
                    <n-card title="班级平均分对比">
                        <div ref="classComparisonChart" class="chart-container"></div>
                    </n-card>
                </n-grid-item>
                <n-grid-item>
                    <n-card title="题型正确率分析">
                        <div ref="questionTypeChart" class="chart-container"></div>
                    </n-card>
                </n-grid-item>
                <n-grid-item>
                    <n-card title="考试趋势分析">
                        <div ref="trendChart" class="chart-container"></div>
                    </n-card>
                </n-grid-item>
            </n-grid>

            <!-- 详细数据表格 -->
            <n-card title="详细数据" style="margin-top: 20px">
                <n-tabs type="line">
                    <n-tab-pane name="student" tab="学生成绩排名">
                        <n-data-table :columns="studentColumns" :data="studentRankData" :pagination="pagination"
                            :bordered="false" striped />
                    </n-tab-pane>
                    <n-tab-pane name="question" tab="试题难度分析">
                        <n-data-table :columns="questionColumns" :data="questionAnalysisData" :pagination="pagination"
                            :bordered="false" striped />
                    </n-tab-pane>
                </n-tabs>
            </n-card>

            <!-- 导出报告 -->
            <div style="margin-top: 20px; text-align: right;">
                <n-space>
                    <n-button @click="exportExcel">
                        <template #icon>
                            <n-icon><document-text-outline /></n-icon>
                        </template>
                        导出Excel
                    </n-button>
                    <n-button type="primary" @click="generateReport">
                        <template #icon>
                            <n-icon><document-outline /></n-icon>
                        </template>
                        生成分析报告
                    </n-button>
                </n-space>
            </div>
        </n-card>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { useMessage } from 'naive-ui';
import {
    NCard,
    NDataTable,
    NButton,
    NSpace,
    NGrid,
    NGridItem,
    NSelect,
    NDatePicker,
    NIcon,
    NTabs,
    NTabPane
} from 'naive-ui';
import {
    PeopleOutline,
    StatsChartOutline,
    CheckmarkCircleOutline,
    TimeOutline,
    DocumentOutline,
    DocumentTextOutline
} from '@vicons/ionicons5';

// 引入echarts
import * as echarts from 'echarts';

const message = useMessage();

// 图表引用
const scoreDistributionChart = ref(null);
const classComparisonChart = ref(null);
const questionTypeChart = ref(null);
const trendChart = ref(null);

// 考试选项
const examOptions = [
    { label: '全部考试', value: 'all' },
    { label: '人工智能基础期中考试', value: 'ai-midterm' },
    { label: '数据结构与算法期末考试', value: 'ds-final' },
    { label: '计算机网络原理测验', value: 'network-quiz' }
];

// 班级选项
const classOptions = [
    { label: '全部班级', value: 'all' },
    { label: '计算机科学与技术1班', value: 'cs1' },
    { label: '计算机科学与技术2班', value: 'cs2' },
    { label: '软件工程1班', value: 'se1' },
    { label: '软件工程2班', value: 'se2' },
    { label: '人工智能1班', value: 'ai1' },
    { label: '人工智能2班', value: 'ai2' }
];

// 筛选条件
const selectedExam = ref('all');
const selectedClass = ref('all');
const dateRange = ref(null);

// 统计数据
const statistics = reactive({
    totalStudents: 256,
    studentGrowth: 15.2,
    averageScore: 78.5,
    scoreGrowth: 3.8,
    passRate: 0.85,
    passRateGrowth: 5.2,
    averageTime: 65,
    timeGrowth: -8.5
});

// 学生排名数据
const studentRankData = ref([
    { rank: 1, name: '张三', studentId: '2023001', class: '计算机科学与技术1班', score: 98, time: 45 },
    { rank: 2, name: '李四', studentId: '2023015', class: '软件工程1班', score: 95, time: 52 },
    { rank: 3, name: '王五', studentId: '2023008', class: '计算机科学与技术2班', score: 93, time: 50 },
    { rank: 4, name: '赵六', studentId: '2023012', class: '人工智能2班', score: 82, time: 58 },
    { rank: 5, name: '钱七', studentId: '2023003', class: '软件工程2班', score: 79, time: 48 },
    { rank: 6, name: '孙八', studentId: '2023022', class: '人工智能1班', score: 76, time: 62 },
    { rank: 7, name: '周九', studentId: '2023018', class: '软件工程2班', score: 72, time: 55 },
    { rank: 8, name: '吴十', studentId: '2023007', class: '计算机科学与技术1班', score: 68, time: 60 },
    { rank: 9, name: '郑十一', studentId: '2023031', class: '人工智能2班', score: 65, time: 70 },
    { rank: 10, name: '王十二', studentId: '2023025', class: '软件工程1班', score: 60, time: 75 }
]);

// 试题分析数据
const questionAnalysisData = ref([
    { id: 1, type: '单选题', content: '人工智能的核心技术包括', correctRate: 0.85, avgTime: 35 },
    { id: 2, type: '多选题', content: '以下哪些是机器学习的应用场景', correctRate: 0.72, avgTime: 48 },
    { id: 3, type: '判断题', content: '深度学习是机器学习的一个子集', correctRate: 0.92, avgTime: 20 },
    { id: 4, type: '填空题', content: '神经网络的基本组成单元是', correctRate: 0.68, avgTime: 40 },
    { id: 5, type: '简答题', content: '简述卷积神经网络的工作原理', correctRate: 0.56, avgTime: 180 },
    { id: 6, type: '单选题', content: '以下哪种算法不属于监督学习', correctRate: 0.65, avgTime: 42 },
    { id: 7, type: '多选题', content: '强化学习的特点包括', correctRate: 0.58, avgTime: 55 },
    { id: 8, type: '判断题', content: 'K-means是一种聚类算法', correctRate: 0.88, avgTime: 25 },
    { id: 9, type: '编程题', content: '实现一个简单的线性回归算法', correctRate: 0.45, avgTime: 240 },
    { id: 10, type: '案例分析', content: '分析给定数据集并建立预测模型', correctRate: 0.52, avgTime: 300 }
]);

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

// 学生表格列定义
const studentColumns = [
    {
        title: '排名',
        key: 'rank',
        sorter: 'default'
    },
    {
        title: '姓名',
        key: 'name'
    },
    {
        title: '学号',
        key: 'studentId'
    },
    {
        title: '班级',
        key: 'class'
    },
    {
        title: '分数',
        key: 'score',
        sorter: (a, b) => a.score - b.score
    },
    {
        title: '用时(分钟)',
        key: 'time',
        sorter: (a, b) => a.time - b.time
    }
];

// 试题分析表格列定义
const questionColumns = [
    {
        title: '题号',
        key: 'id'
    },
    {
        title: '题型',
        key: 'type'
    },
    {
        title: '题目内容',
        key: 'content',
        ellipsis: {
            tooltip: true
        }
    },
    {
        title: '正确率',
        key: 'correctRate',
        render(row) {
            return `${(row.correctRate * 100).toFixed(1)}%`;
        },
        sorter: (a, b) => a.correctRate - b.correctRate
    },
    {
        title: '平均用时(秒)',
        key: 'avgTime',
        sorter: (a, b) => a.avgTime - b.avgTime
    }
];

// 初始化图表
const initCharts = () => {
    nextTick(() => {
        initScoreDistributionChart();
        initClassComparisonChart();
        initQuestionTypeChart();
        initTrendChart();
    });
};

// 成绩分布图表
const initScoreDistributionChart = () => {
    const chartDom = scoreDistributionChart.value;
    if (!chartDom) return;

    const myChart = echarts.init(chartDom);
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: [
            {
                type: 'category',
                data: ['<60分', '60-70分', '70-80分', '80-90分', '90-100分'],
                axisTick: {
                    alignWithLabel: true
                }
            }
        ],
        yAxis: [
            {
                type: 'value',
                name: '人数'
            }
        ],
        series: [
            {
                name: '学生人数',
                type: 'bar',
                barWidth: '60%',
                data: [12, 25, 35, 30, 18],
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#83bff6' },
                        { offset: 0.5, color: '#188df0' },
                        { offset: 1, color: '#188df0' }
                    ])
                }
            }
        ]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => {
        myChart.resize();
    });
};

// 班级平均分对比图表
const initClassComparisonChart = () => {
    const chartDom = classComparisonChart.value;
    if (!chartDom) return;

    const myChart = echarts.init(chartDom);
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        legend: {
            data: ['本次考试', '上次考试']
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: '平均分',
            min: 0,
            max: 100
        },
        yAxis: {
            type: 'category',
            data: ['计科1班', '计科2班', '软工1班', '软工2班', '人工智能1班', '人工智能2班']
        },
        series: [
            {
                name: '本次考试',
                type: 'bar',
                data: [82, 78, 85, 76, 80, 79],
                itemStyle: {
                    color: '#91cc75'
                }
            },
            {
                name: '上次考试',
                type: 'bar',
                data: [78, 75, 82, 74, 77, 76],
                itemStyle: {
                    color: '#5470c6'
                }
            }
        ]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => {
        myChart.resize();
    });
};

// 题型正确率分析图表
const initQuestionTypeChart = () => {
    const chartDom = questionTypeChart.value;
    if (!chartDom) return;

    const myChart = echarts.init(chartDom);
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 10,
            data: ['单选题', '多选题', '判断题', '填空题', '简答题', '编程题', '案例分析']
        },
        series: [
            {
                name: '正确率',
                type: 'pie',
                radius: ['50%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '18',
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: [
                    { value: 75, name: '单选题' },
                    { value: 65, name: '多选题' },
                    { value: 90, name: '判断题' },
                    { value: 68, name: '填空题' },
                    { value: 56, name: '简答题' },
                    { value: 45, name: '编程题' },
                    { value: 52, name: '案例分析' }
                ]
            }
        ]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => {
        myChart.resize();
    });
};

// 考试趋势分析图表
const initTrendChart = () => {
    const chartDom = trendChart.value;
    if (!chartDom) return;

    const myChart = echarts.init(chartDom);
    const option = {
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ['平均分', '及格率', '优秀率']
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: ['第一次', '第二次', '第三次', '第四次', '第五次', '第六次']
        },
        yAxis: [
            {
                type: 'value',
                name: '分数',
                min: 0,
                max: 100,
                position: 'left',
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: '#5470c6'
                    }
                },
                axisLabel: {
                    formatter: '{value}分'
                }
            },
            {
                type: 'value',
                name: '比率',
                min: 0,
                max: 100,
                position: 'right',
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: '#91cc75'
                    }
                },
                axisLabel: {
                    formatter: '{value}%'
                }
            }
        ],
        series: [
            {
                name: '平均分',
                type: 'line',
                data: [72, 75, 73, 78, 76, 79],
                yAxisIndex: 0,
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: '#5470c6'
                },
                itemStyle: {
                    color: '#5470c6'
                }
            },
            {
                name: '及格率',
                type: 'line',
                data: [75, 78, 80, 82, 85, 88],
                yAxisIndex: 1,
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: '#91cc75'
                },
                itemStyle: {
                    color: '#91cc75'
                }
            },
            {
                name: '优秀率',
                type: 'line',
                data: [20, 22, 25, 28, 30, 35],
                yAxisIndex: 1,
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: '#fac858'
                },
                itemStyle: {
                    color: '#fac858'
                }
            }
        ]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => {
        myChart.resize();
    });
};

// 刷新数据
const refreshData = () => {
    message.success('数据已刷新');
    // 实际项目中这里应该调用API获取数据
    // 模拟数据刷新
    setTimeout(() => {
        initCharts();
    }, 500);
};

// 导出Excel
const exportExcel = () => {
    message.success('Excel文件已导出');
    // 实际项目中这里应该调用导出Excel的API或使用相关库实现
};

// 生成分析报告
const generateReport = () => {
    message.success('分析报告生成中，请稍候...');
    // 实际项目中这里应该调用生成报告的API
    setTimeout(() => {
        message.success('分析报告已生成，请在消息中心查看');
    }, 2000);
};

// 组件挂载后初始化图表
onMounted(() => {
    initCharts();
});
</script>

<style scoped>
.data-analysis-container {
    padding: 20px;
}

.data-analysis-card {
    margin-bottom: 20px;
}

.chart-container {
    height: 350px;
    width: 100%;
    color: #fff;
}

.stat-value {
    font-size: 24px;
    font-weight: bold;
    margin: 10px 0;
    color: #2080f0;
}

.stat-desc {
    font-size: 14px;
    color: #909399;
}
</style>