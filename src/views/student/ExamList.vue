<template>
    <div class="exam-list-container">
        <n-card title="可参加的考试" class="exam-list-card">
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
                </n-space>
            </n-space>

            <n-data-table :columns="columns" :data="exams" :pagination="pagination" :bordered="false" :loading="loading"
                striped />

            <!-- 考试详情模态框 -->
            <n-modal v-model:show="showExamDetailModal" preset="card" title="考试详情" style="width: 600px">
                <template v-if="selectedExam">
                    <n-descriptions bordered>
                        <n-descriptions-item label="考试名称">
                            {{ selectedExam.title }}
                        </n-descriptions-item>
                        <n-descriptions-item label="考试时长">
                            {{ Math.round(selectedExam.durationMinutes / 60000) }} 分钟
                        </n-descriptions-item>
                        <n-descriptions-item label="总分">
                            {{ selectedExam.totalScore || '100' }} 分
                        </n-descriptions-item>
                        <n-descriptions-item label="开始时间">
                            {{ formatDate(selectedExam.startTime) }}
                        </n-descriptions-item>
                        <n-descriptions-item label="结束时间">
                            {{ formatDate(selectedExam.endTime) }}
                        </n-descriptions-item>
                        <n-descriptions-item label="状态">
                            {{ getStatusNameByExam(selectedExam) }}
                        </n-descriptions-item>
                        <n-descriptions-item label="考试说明" span="3">
                            <div style="white-space: pre-line;">
                                {{ selectedExam.description ||
                                    `系统随机抽取题库，按照题型抽取。
                                选择题10道，每题3分，3容易5中等2困难；
                                判断题10道，每题2分，3容易5中等2困难；
                                简答题5道，每题10分，1容易2中等1困难。` }}
                            </div>
                        </n-descriptions-item>
                    </n-descriptions>
                </template>
                <template #footer>
                    <n-space justify="end">
                        <n-button @click="showExamDetailModal = false">关闭</n-button>
                        <n-button v-if="selectedExam && getExamStatus(selectedExam) === 1" type="primary"
                            @click="startExam">
                            开始考试
                        </n-button>
                    </n-space>
                </template>
            </n-modal>


        </n-card>
    </div>
</template>

<script setup>
import { h, ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
    NCard,
    NDataTable,
    NButton,
    NSpace,
    NModal,
    NInput,
    NSelect,
    NIcon,
    NDescriptions,
    NDescriptionsItem,
    NResult
} from 'naive-ui';
import { SearchOutline } from '@vicons/ionicons5';
import { examApi } from '@/api/index.js';

const router = useRouter();
const message = useMessage();

// 考试列表相关
const searchKeyword = ref('');
const selectedStatus = ref(null);

// 状态选项 - 对应后端：0-未开始 1-进行中 2-已结束
const statusOptions = [
    { label: '全部', value: null },
    { label: '未开始', value: 0 },
    { label: '进行中', value: 1 },
    { label: '已结束', value: 2 }
];

// 考试数据
const exams = reactive([]);
const loading = ref(false);
const total = ref(0);

// 获取考试状态
const getExamStatus = (exam) => {
    const now = new Date().getTime();
    const startTime = new Date(exam.startTime).getTime();
    const endTime = new Date(exam.endTime).getTime();

    if (now < startTime) {
        return 0; // 未开始
    } else if (now >= startTime && now <= endTime) {
        return 1; // 进行中
    } else {
        return 2; // 已结束
    }
};

// 获取考试列表
const getExamList = async () => {
    try {
        loading.value = true;
        const params = {
            pageNum: pagination.page,
            pageSize: pagination.pageSize
        };

        if (searchKeyword.value) {
            params.keyWord = searchKeyword.value;
        }

        if (selectedStatus.value !== null) {
            params.status = selectedStatus.value;
        }

        const response = await examApi.getExams(params);

        if (response.code === 200) {
            // 清空原数据
            exams.splice(0, exams.length);
            // 添加新数据，并计算实时状态
            response.data.forEach(exam => {
                exam.status = getExamStatus(exam);
                exam.title = exam.name; // 后端字段是name，前端显示用title
                exams.push(exam);
            });
            total.value = response.total || 0;
        } else {
            message.error(response.message || '获取考试列表失败');
        }
    } catch (error) {
        console.error('获取考试列表失败:', error);
        message.error('获取考试列表失败');
    } finally {
        loading.value = false;
    }
};

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
        key: 'durationMinutes',
        render(row) {
            return `${Math.round(row.durationMinutes / 60000)} 分钟`;
        }
    },
    {
        title: '状态',
        key: 'status',
        width: 120,
        render(row) {
            const status = getExamStatus(row);
            let statusText, color;

            switch (status) {
                case 0:
                    statusText = '未开始';
                    color = '#909399';
                    break;
                case 1:
                    statusText = '进行中';
                    color = '#67C23A';
                    break;
                case 2:
                    statusText = '已结束';
                    color = '#F56C6C';
                    break;
                default:
                    statusText = '未知';
                    color = '#909399';
            }

            return h('div', {
                style: 'display: flex; align-items: center; gap: 6px;'
            }, [
                h('div', {
                    style: `width: 8px; height: 8px; border-radius: 50%; background-color: ${color};`
                }),
                h('span', statusText)
            ]);
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
                        getExamStatus(row) === 1 ?
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
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 30, 40],
    onChange: (page) => {
        pagination.page = page;
        getExamList();
    },
    onUpdatePageSize: (pageSize) => {
        pagination.pageSize = pageSize;
        pagination.page = 1;
        getExamList();
    }
});

// 监听total变化，更新分页itemCount
computed(() => {
    pagination.itemCount = total.value;
    return total.value;
});

// 搜索考试
const searchExams = () => {
    pagination.page = 1;
    getExamList();
};

// 重置搜索
const resetSearch = () => {
    searchKeyword.value = '';
    selectedStatus.value = null;
    pagination.page = 1;
    getExamList();
};

// 组件挂载时获取数据
onMounted(() => {
    getExamList();
});

// 查看考试详情
const selectedExam = ref(null);
const showExamDetailModal = ref(false);

const viewExamDetail = (exam) => {
    selectedExam.value = exam;
    showExamDetailModal.value = true;
};

// 开始考试
const startExam = (exam) => {
    showExamDetailModal.value = false;


    // 获取考试开始时间并转换为上海时区
    const originalStartTime = new Date(exam.startTime);
    const startTime = new Date(originalStartTime.getTime() + 8 * 60 * 60 * 1000); // 转换为上海时区 (UTC+8)

    // 获取考试结束时间并转换为上海时区
    const originalEndTime = new Date(exam.endTime);
    const endTime = new Date(originalEndTime.getTime() + 8 * 60 * 60 * 1000); // 转换为上海时区 (UTC+8)

    // 计算考试时长
    const duration = Math.round(exam.durationMinutes / 60000) || 120; // 分钟

    // console.log('原始结束时间:', exam.endTime);
    // console.log('上海时区结束时间:', endTime.toISOString());
    // console.log('上海时区开始时间:', startTime.toISOString());
    // console.log('考试信息:', exam);

    // 跳转到考试页面
    router.push({
        name: 'ExamTaking',
        query: {
            examId: exam.id,
            title: exam.title || exam.name,
            duration: duration,
            totalScore: exam.totalScore || 100,
            startTime: startTime.getTime(), // 传递上海时区考试开始时间(毫秒)
            endTime: endTime.getTime() // 传递上海时区考试结束时间(毫秒)
        }
    });

    message.success('正在进入考试，请稍候...');
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
        0: '未开始',
        1: '进行中',
        2: '已结束'
    };
    return statusMap[status] || '未知';
};

// 获取状态名称（基于实时计算）
const getStatusNameByExam = (exam) => {
    return getStatusName(getExamStatus(exam));
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