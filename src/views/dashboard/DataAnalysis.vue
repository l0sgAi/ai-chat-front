<template>
    <div class="data-analysis-container">
        <n-card title="数据统计分析" class="data-analysis-card">
            <!-- 数据筛选 -->
            <n-space vertical>
                <n-space class="filter-margin">
                    <n-select v-model:value="selectedExam" :options="examOptions" placeholder="选择考试"
                        style="width: 250px" @update:value="onFilterChange" />
                    <n-select v-model:value="selectedClass" :options="classOptions" placeholder="选择班级"
                        style="width: 200px" @update:value="onFilterChange" />
                    <n-date-picker v-model:value="dateRange" type="daterange" clearable placeholder="选择日期范围" @update:value="onFilterChange" />
                    <n-button @click="refreshData" :loading="loading">刷新数据</n-button>
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
                        <div class="stat-desc">考试参与总人数</div>
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
                        <div class="stat-desc">所有参与者平均得分</div>
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
                        <div class="stat-value">{{ statistics.passRate.toFixed(1) }}%</div>
                        <div class="stat-desc">60分及以上通过率</div>
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
                        <div class="stat-desc">所有参与者平均用时</div>
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
                    <n-card title="用时分布统计">
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
                    <n-tab-pane name="question" tab="考试难度分析">
                        <n-data-table :columns="questionColumns" :data="questionAnalysisData" :pagination="pagination"
                            :bordered="false" striped />
                    </n-tab-pane>
                </n-tabs>
            </n-card>

            <!-- 导出报告 -->
            <div style="margin-top: 20px; text-align: right;">
                <n-space>
                    <!-- <n-button @click="exportExcel">
                        <template #icon>
                            <n-icon><document-text-outline /></n-icon>
                        </template>
                        导出Excel
                    </n-button> -->
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
import { ref, reactive, onMounted, nextTick, h } from 'vue';
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
// 引入API
import api from '@/api/index.js';

const message = useMessage();

// 图表引用
const scoreDistributionChart = ref(null);
const classComparisonChart = ref(null);
const questionTypeChart = ref(null);
const trendChart = ref(null);

// 原始数据存储
const rawData = ref([]);
const loading = ref(false);

// 数据统计API（使用统一的API模块）
const { dataAnalysisApi } = api;

// 考试选项
const examOptions = ref([
    { label: '全部考试', value: 'all' }
]);

// 班级选项
const classOptions = ref([
    { label: '全部班级', value: 'all' }
]);

// 筛选条件
const selectedExam = ref('all');
const selectedClass = ref('all');
const dateRange = ref(null);

// 统计数据
const statistics = reactive({
    totalStudents: 0,
    averageScore: 0,
    passRate: 0,
    averageTime: 0
});

// 学生排名数据
const studentRankData = ref([]);

// 试题分析数据（暂时保留空数组，后续可根据需要扩展）
const questionAnalysisData = ref([]);

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
        key: 'username'
    },
    {
        title: '用户ID',
        key: 'userId'
    },
    {
        title: '班级',
        key: 'classname'
    },
    {
        title: '考试名称',
        key: 'testName',
        width: 150,
        render: (row) => row.testName || '未知考试'
    },
    {
        title: '分数',
        key: 'score',
        sorter: (a, b) => a.score - b.score
    },
    {
        title: '用时(秒)',
        key: 'timeUsed',
        sorter: (a, b) => a.timeUsed - b.timeUsed,
        render(row) {
            return `${Math.floor(row.timeUsed / 60)}分${row.timeUsed % 60}秒`;
        }
    }
];

// 试题分析表格列定义
const questionColumns = [
    {
        title: '考试ID',
        key: 'id',
        width: 80
    },
    {
        title: '考试名称',
        key: 'testName',
        width: 200,
        ellipsis: {
            tooltip: true
        }
    },
    {
        title: '平均分',
        key: 'averageScore',
        width: 100,
        render(row) {
            return `${row.averageScore}分`;
        },
        sorter: (a, b) => b.averageScore - a.averageScore
    },
    {
        title: '参与人数',
        key: 'totalStudents',
        width: 100,
        render(row) {
            return `${row.totalStudents}人`;
        },
        sorter: (a, b) => b.totalStudents - a.totalStudents
    },
    {
        title: '通过率',
        key: 'passRate',
        width: 100,
        render(row) {
            return `${row.passRate}%`;
        },
        sorter: (a, b) => b.passRate - a.passRate
    },
    {
        title: '难度评估',
        key: 'difficulty',
        width: 100,
        render(row) {
            const colorMap = {
                '简单': '#52c41a',
                '中等': '#faad14',
                '困难': '#ff4d4f'
            };
            return h('span', {
                style: {
                    color: colorMap[row.difficulty] || '#666',
                    fontWeight: 'bold'
                }
            }, row.difficulty);
        }
    }
];

// 获取数据
const fetchData = async () => {
    try {
        loading.value = true;
        const response = await dataAnalysisApi.getEchartDisplay();
        if (response.code === 200) {
            rawData.value = response.data || [];
            processData();
            initCharts();
        } else {
            message.error(response.message || '获取数据失败');
        }
    } catch (error) {
        console.error('获取数据失败:', error);
        message.error('获取数据失败，请稍后重试');
    } finally {
        loading.value = false;
    }
};

// 处理数据
const processData = () => {
    if (!rawData.value.length) return;
    
    // 计算统计数据
    calculateStatistics();
    
    // 处理学生排名数据
    processStudentRankData();
    
    // 处理试题难度分析数据
    processQuestionAnalysisData();
    
    // 更新筛选选项
    updateFilterOptions();
};

// 计算统计数据
const calculateStatistics = () => {
    const data = getFilteredData();
    
    statistics.totalStudents = data.length;
    statistics.averageScore = data.length > 0 ? 
        Math.round(data.reduce((sum, item) => sum + item.score, 0) / data.length * 10) / 10 : 0;
    statistics.passRate = data.length > 0 ? 
        Math.round(data.filter(item => item.score >= 60).length / data.length * 1000) / 10 : 0;
    statistics.averageTime = data.length > 0 ? 
        Math.round(data.reduce((sum, item) => sum + item.timeUsed, 0) / data.length / 60) : 0;
};

// 处理学生排名数据
const processStudentRankData = () => {
    const data = getFilteredData()
        .sort((a, b) => b.score - a.score)
        .map((item, index) => ({
            rank: index + 1,
            ...item
        }));
    
    studentRankData.value = data;
};

// 处理试题难度分析数据
const processQuestionAnalysisData = () => {
    const examMap = new Map();
    
    // 按考试分组并计算平均分
    rawData.value.forEach(item => {
        if (item.testId && item.testName) {
            if (!examMap.has(item.testId)) {
                examMap.set(item.testId, {
                    testId: item.testId,
                    testName: item.testName,
                    scores: [],
                    totalStudents: 0
                });
            }
            examMap.get(item.testId).scores.push(item.score);
            examMap.get(item.testId).totalStudents++;
        }
    });
    
    // 计算每个考试的平均分并排序
    const analysisData = Array.from(examMap.values())
        .map(exam => {
            const averageScore = exam.scores.length > 0 
                ? exam.scores.reduce((sum, score) => sum + score, 0) / exam.scores.length 
                : 0;
            const passRate = exam.scores.length > 0 
                ? exam.scores.filter(score => score >= 60).length / exam.scores.length 
                : 0;
            
            return {
                id: exam.testId,
                testName: exam.testName,
                averageScore: Math.round(averageScore * 10) / 10,
                totalStudents: exam.totalStudents,
                passRate: Math.round(passRate * 1000) / 10,
                difficulty: averageScore >= 80 ? '简单' : averageScore >= 60 ? '中等' : '困难'
            };
        })
        .sort((a, b) => b.averageScore - a.averageScore); // 按平均分倒序排列
    
    questionAnalysisData.value = analysisData;
};

// 更新筛选选项
const updateFilterOptions = () => {
    // 更新考试选项
    const examMap = new Map();
    rawData.value.forEach(item => {
        if (item.testId && item.testName) {
            examMap.set(item.testId, item.testName);
        }
    });
    examOptions.value = [
        { label: '全部考试', value: 'all' },
        ...Array.from(examMap.entries()).map(([id, name]) => ({ label: String(name), value: String(id) }))
    ];
    
    // 更新班级选项
    const classSet = new Set();
    rawData.value.forEach(item => {
        if (item.classname) {
            classSet.add(item.classname);
        }
    });
    classOptions.value = [
        { label: '全部班级', value: 'all' },
        ...Array.from(classSet).map(name => ({ label: name, value: name }))
    ];
};

// 获取筛选后的数据
const getFilteredData = () => {
    let data = rawData.value;
    
    // 按考试筛选
    if (selectedExam.value && selectedExam.value !== 'all') {
        data = data.filter(item => String(item.testId) === String(selectedExam.value));
    }
    
    // 按班级筛选
    if (selectedClass.value && selectedClass.value !== 'all') {
        data = data.filter(item => item.classname === selectedClass.value);
    }
    
    // 按日期筛选
    if (dateRange.value && dateRange.value.length === 2) {
        // 这里需要根据实际的日期字段进行筛选
        // 由于EchartDisplayVo中没有日期字段，暂时跳过
    }
    
    return data;
};

// 初始化图表
const initCharts = () => {
    nextTick(() => {
        initScoreDistributionChart();
        initClassComparisonChart();
        initTimeDistributionChart();
        initTrendChart();
    });
};

// 成绩分布图表
const initScoreDistributionChart = () => {
    const chartDom = scoreDistributionChart.value;
    if (!chartDom) return;

    const data = getFilteredData();
    
    // 计算成绩分布
    const scoreRanges = {
        '<60分': 0,
        '60-70分': 0,
        '70-80分': 0,
        '80-90分': 0,
        '90-100分': 0
    };
    
    data.forEach(item => {
        const score = item.score;
        if (score < 60) scoreRanges['<60分']++;
        else if (score < 70) scoreRanges['60-70分']++;
        else if (score < 80) scoreRanges['70-80分']++;
        else if (score < 90) scoreRanges['80-90分']++;
        else scoreRanges['90-100分']++;
    });

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
                data: Object.keys(scoreRanges),
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
                data: Object.values(scoreRanges),
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

    const data = getFilteredData();
    
    // 计算各班级平均分
    const classStats = {};
    data.forEach(item => {
        if (!classStats[item.classname]) {
            classStats[item.classname] = {
                totalScore: 0,
                count: 0
            };
        }
        classStats[item.classname].totalScore += item.score;
        classStats[item.classname].count++;
    });
    
    const classNames = Object.keys(classStats);
    const averageScores = classNames.map(className => {
        const stats = classStats[className];
        return stats.count > 0 ? Math.round(stats.totalScore / stats.count * 10) / 10 : 0;
    });

    const myChart = echarts.init(chartDom);
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: {
            left: '7%',
            right: '8%',
            bottom: '9%',
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
            data: classNames
        },
        series: [
            {
                name: '平均分',
                type: 'bar',
                data: averageScores,
                itemStyle: {
                    color: '#91cc75'
                }
            }
        ]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => {
        myChart.resize();
    });
};

// 用时分布统计图表
const initTimeDistributionChart = () => {
    const chartDom = questionTypeChart.value;
    if (!chartDom) return;

    const data = getFilteredData();
    
    // 计算用时分布（按分钟分组）
    const timeRanges = {
        '0-10分钟': 0,
        '10-20分钟': 0,
        '20-30分钟': 0,
        '30-60分钟': 0,
        '60分钟以上': 0
    };
    
    data.forEach(item => {
        const timeInMinutes = Math.floor(item.timeUsed / 60);
        if (timeInMinutes <= 10) timeRanges['0-10分钟']++;
        else if (timeInMinutes <= 20) timeRanges['10-20分钟']++;
        else if (timeInMinutes <= 30) timeRanges['20-30分钟']++;
        else if (timeInMinutes <= 60) timeRanges['30-60分钟']++;
        else timeRanges['60分钟以上']++;
    });

    const myChart = echarts.init(chartDom);
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c}人 ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 10,
            data: Object.keys(timeRanges),
            textStyle: {
                color: '#ffffff'
            }
        },
        series: [
            {
                name: '用时分布',
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
                data: Object.keys(timeRanges).map(key => ({
                    value: timeRanges[key],
                    name: key
                }))
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

    const data = getFilteredData();
    
    // 按考试分组统计
    const examStats = {};
    data.forEach(item => {
        if (!examStats[item.testName]) {
            examStats[item.testName] = {
                scores: [],
                totalScore: 0,
                passCount: 0,
                excellentCount: 0,
                count: 0
            };
        }
        const stats = examStats[item.testName];
        stats.scores.push(item.score);
        stats.totalScore += item.score;
        stats.count++;
        if (item.score >= 60) stats.passCount++;
        if (item.score >= 85) stats.excellentCount++;
    });
    
    const examNames = Object.keys(examStats);
    const averageScores = examNames.map(name => {
        const stats = examStats[name];
        return stats.count > 0 ? Math.round(stats.totalScore / stats.count * 10) / 10 : 0;
    });
    const passRates = examNames.map(name => {
        const stats = examStats[name];
        return stats.count > 0 ? Math.round(stats.passCount / stats.count * 100 * 10) / 10 : 0;
    });
    const excellentRates = examNames.map(name => {
        const stats = examStats[name];
        return stats.count > 0 ? Math.round(stats.excellentCount / stats.count * 100 * 10) / 10 : 0;
    });

    const myChart = echarts.init(chartDom);
    const option = {
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ['平均分', '及格率', '优秀率'],
            textStyle: {
                color: '#ffffff'
            }
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
            data: examNames
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
                data: averageScores,
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
                data: passRates,
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
                data: excellentRates,
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
const refreshData = async () => {
    await fetchData();
    message.success('数据已刷新');
};

// 监听筛选条件变化
const onFilterChange = () => {
    processData();
    initCharts();
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

// 组件挂载后获取数据
onMounted(() => {
    fetchData();
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