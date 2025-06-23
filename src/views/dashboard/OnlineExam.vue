<template>
    <div class="online-exam-container">
        <n-card title="在线考试" class="online-exam-card">
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
import {
    SearchOutline
} from '@vicons/ionicons5';

// 实现在线考试功能的代码
// ...
</script>