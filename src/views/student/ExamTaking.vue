<template>
  <div class="exam-taking-container">
    <n-card class="exam-card">
      <!-- 考试头部信息 -->
      <div class="exam-header">
        <div class="exam-title">
          <h2>{{ examInfo.title || '考试进行中' }}</h2>
          <n-tag type="info">{{ examInfo.description || '系统随机抽题' }}</n-tag>
        </div>
        <div class="exam-info">
          <n-space>
            <span>总分: {{ examInfo.totalScore || 100 }}分</span>
            <span>题目数: {{ questions.length }}</span>
            <n-tag type="info" size="small" v-if="examStarted">
              <n-icon style="margin-right: 4px;">
                <svg viewBox="0 0 24 24" width="12" height="12">
                  <path fill="currentColor"
                    d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
                </svg>
              </n-icon>
              自动保存中
            </n-tag>
            <n-countdown :duration="remainingTime" :active="examStarted" :precision="1" @finish="autoSubmitExam">
              <template #default="{ hours, minutes, seconds }">
                <n-tag type="warning" size="large">
                  剩余时间: {{ hours }}:{{ minutes }}:{{ seconds }}
                </n-tag>
              </template>
            </n-countdown>
          </n-space>
        </div>
      </div>

      <n-divider />

      <!-- 考试内容 -->
      <div class="exam-content" v-if="questions.length > 0">
        <n-space vertical size="large">
          <div v-for="(question, index) in questions" :key="question.id" class="question-item">
            <div class="question-header">
              <span class="question-number">{{ index + 1 }}.</span>
              <span class="question-type">[{{ getQuestionTypeName(question.type) }}]</span>
              <span class="question-score">({{ getQuestionScore(question.type) }}分)</span>
            </div>
            <div class="question-content">
              {{ question.content }}
            </div>
            <!-- <div class="question-detail" v-if="question.content">
              {{ question.content }}
            </div> -->

            <!-- 选择题选项 -->
            <template v-if="question.type === 0">
              <n-radio-group v-model:value="userAnswers[question.id]">
                <n-space vertical>
                  <n-radio value="0">A: {{ getOptionText(question.content, 0) }}</n-radio>
                  <n-radio value="1">B: {{ getOptionText(question.content, 1) }}</n-radio>
                  <n-radio value="2">C: {{ getOptionText(question.content, 2) }}</n-radio>
                  <n-radio value="3">D: {{ getOptionText(question.content, 3) }}</n-radio>
                </n-space>
              </n-radio-group>
            </template>

            <!-- 判断题选项 -->
            <template v-else-if="question.type === 1">
              <n-radio-group v-model:value="userAnswers[question.id]">
                <n-space>
                  <n-radio value="0">正确</n-radio>
                  <n-radio value="1">错误</n-radio>
                </n-space>
              </n-radio-group>
            </template>

            <!-- 简答题答案 -->
            <template v-else-if="question.type === 2">
              <n-input v-model:value="userAnswers[question.id]" type="textarea" placeholder="请输入答案"
                :autosize="{ minRows: 3, maxRows: 8 }" />
            </template>
          </div>
        </n-space>
      </div>

      <!-- 加载状态 -->
      <div v-else-if="loading" class="loading-container">
        <n-spin size="large">
          <template #description>正在加载考试题目...</template>
        </n-spin>
      </div>

      <!-- 错误状态 -->
      <div v-else class="error-container">
        <n-result status="error" title="加载失败" description="无法获取考试题目，请重试">
          <template #footer>
            <n-button @click="loadQuestions">重新加载</n-button>
            <n-button @click="goBack">返回列表</n-button>
          </template>
        </n-result>
      </div>

      <n-divider v-if="questions.length > 0" />

      <!-- 考试操作按钮 -->
      <div class="exam-footer" v-if="questions.length > 0">
        <n-space justify="space-between">
          <div>
            <n-button @click="goBack" :disabled="submitting">返回列表</n-button>
          </div>
          <div>
            <n-space>
              <n-button @click="saveAnswers" :loading="saving">保存答案</n-button>
              <n-button type="primary" @click="submitExam" :loading="submitting">
                提交试卷
              </n-button>
            </n-space>
          </div>
        </n-space>
      </div>
    </n-card>

    <!-- 提交确认模态框 -->
    <n-modal v-model:show="showSubmitModal" preset="dialog" title="确认提交">
      <div>
        <p>您确定要提交试卷吗？</p>
        <p v-if="unansweredCount > 0" style="color: #f56c6c;">
          还有 {{ unansweredCount }} 道题目未完成
        </p>
        <p style="color: #909399; font-size: 12px;">
          提交后将无法修改答案
        </p>
      </div>
      <template #action>
        <n-space>
          <n-button @click="showSubmitModal = false">取消</n-button>
          <n-button type="primary" @click="confirmSubmit" :loading="submitting">
            确认提交
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 考试结果模态框 -->
    <n-modal v-model:show="showResultModal" preset="card" title="考试结果" style="width: 600px;" :mask-closable="false">
      <template v-if="examResult">
        <n-result :status="examResult.score >= 60 ? 'success' : 'error'"
          :title="examResult.score >= 60 ? '考试通过' : '考试未通过'"
          :description="`您的得分: ${examResult.score}分 (总分: ${examResult.totalScore}分)`">
          <template #footer>
            <n-space justify="center">
              <n-button type="primary" @click="goBackToList">返回考试列表</n-button>
            </n-space>
          </template>
        </n-result>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
  NCard,
  NButton,
  NSpace,
  NCountdown,
  NRadioGroup,
  NRadio,
  NInput,
  NDivider,
  NTag,
  NSpin,
  NResult,
  NModal,
  NIcon
} from 'naive-ui';
import { examApi, testResultApi } from '@/api/index.js';

const router = useRouter();
const route = useRoute();
const message = useMessage();

// 考试基本信息
const examInfo = reactive({
  id: null,
  title: '',
  description: '',
  totalScore: 100,
  duration: 120, // 分钟
  startTime: null, // 考试开始时间
  endTime: null // 考试结束时间
});

// 考试状态
const examStarted = ref(true);
const loading = ref(true);
const saving = ref(false);
const submitting = ref(false);
const showSubmitModal = ref(false);
const showResultModal = ref(false);
const offset = (8 * 60 * 60 * 1000);
// 题目数据
const questions = reactive([]);
const userAnswers = reactive({});
const examResult = ref(null);

// 计时相关
const startTime = ref(Date.now());
const remainingTime = ref(120 * 60 * 1000); // 默认120分钟
const countdownTimer = ref(null); // 倒计时定时器
const autoSaveTimer = ref(null); // 自动保存定时器
const autoSaveInterval = 30000; // 自动保存间隔，30秒

// 从路由参数获取考试信息
const initExamInfo = () => {
  const { examId, title, duration, startTime: examStartTime, endTime: examEndTime } = route.query;
  if (examId) {
    examInfo.id = examId;
    examInfo.title = title || '考试进行中';
    examInfo.duration = parseInt(duration) || 120;

    // 设置考试开始时间
    if (examStartTime) {
      examInfo.startTime = new Date(parseInt(examStartTime));
    } else {
      examInfo.startTime = new Date();
    }

    // 设置考试结束时间
    if (examEndTime) {
      // 优先使用传入的结束时间
      examInfo.endTime = new Date(parseInt(examEndTime));
    } else {
      // 如果没有传入结束时间，则根据开始时间和时长计算
      examInfo.endTime = new Date(examInfo.startTime.getTime() + examInfo.duration * 60 * 1000);
    }

    // 计算当前剩余时间
    const now = new Date();
    const timeLeft = examInfo.endTime.getTime() - now.getTime() - offset;
    // console.log('结束时间:', examInfo.endTime);

    if (timeLeft > 0) {
      remainingTime.value = timeLeft;
      examStarted.value = true;
      // 启动倒计时
      startCountdown();
    } else {
      // 考试时间已过
      remainingTime.value = 0;
      examStarted.value = false;
      message.warning('考试时间已结束');
      autoSubmitExam();
    }
  }
};

// 启动倒计时
const startCountdown = () => {
  // 清除之前的定时器
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value);
  }

  // 立即更新一次倒计时
  updateRemainingTime();

  // 每秒更新倒计时
  countdownTimer.value = setInterval(() => {
    updateRemainingTime();
  }, 1000);
};

// 更新剩余时间
const updateRemainingTime = () => {
  if (!examInfo.endTime) return;

  const now = new Date();
  const timeLeft = examInfo.endTime.getTime() - now.getTime() - offset;
  // console.log('update当前剩余时间:', timeLeft);

  if (timeLeft <= 0) {
    // 时间到了
    remainingTime.value = 0;
    examStarted.value = false; // 停止倒计时
    if (countdownTimer.value) {
      clearInterval(countdownTimer.value);
      countdownTimer.value = null;
    }
    // 自动提交考试
    autoSubmitExam();
  } else {
    remainingTime.value = timeLeft;
    examStarted.value = true; // 确保倒计时处于活动状态
  }
};

// 获取考试题目
const loadQuestions = async () => {
  try {
    loading.value = true;

    // 确保有考试ID
    if (!examInfo.id) {
      message.error('考试ID不能为空');
      return;
    }

    const response = await examApi.getTestQuestion(examInfo.id);

    if (response.code === 200 && response.data) {
      // 清空原数据
      questions.splice(0, questions.length);
      // 添加新数据
      console.log('题目数据:', response.data, userAnswers);
      response.data.forEach(question => {
        questions.push(question);
        // 初始化答案
        if (question.type === 0 || question.type === 1) {
          // 选择题和判断题需要将数字转换为字符串以匹配n-radio的value类型
          userAnswers[question.id] = question.stuAnswerOption !== null && question.stuAnswerOption !== undefined 
            ? String(question.stuAnswerOption) : null;
        } else {
          userAnswers[question.id] = question.stuAnswer || '';
        }
      });

      message.success('题目加载成功');
    } else {
      message.error(response.message || '获取考试题目失败');
    }
  } catch (error) {
    console.error('获取考试题目失败:', error);
    message.error('获取考试题目失败');
  } finally {
    loading.value = false;
  }
};

// 获取题目类型名称
const getQuestionTypeName = (type) => {
  const typeMap = {
    0: '选择题',
    1: '判断题',
    2: '简答题'
  };
  return typeMap[type] || '未知类型';
};

// 获取题目分数
const getQuestionScore = (type) => {
  const scoreMap = {
    0: 3, // 选择题3分
    1: 2, // 判断题2分
    2: 10 // 简答题10分
  };
  return scoreMap[type] || 0;
};

// 解析选择题选项文本
const getOptionText = (answerText, optionIndex) => {
  if (!answerText) return `选项${String.fromCharCode(65 + optionIndex)}`;

  // 解析格式为 "A. 选项内容\nB. 选项内容\nC. 选项内容\nD. 选项内容" 的文本
  const lines = answerText.split('\n').filter(line => line.trim());
  const optionLetter = String.fromCharCode(65 + optionIndex); // A, B, C, D

  for (const line of lines) {
    const trimmedLine = line.trim();
    // 匹配格式：大写字母 + 点号 + 空格 + 内容
    const match = trimmedLine.match(/^([A-Z])\s*\.\s*(.+)$/);
    if (match && match[1] === optionLetter) {
      return match[2].trim();
    }
  }

  // 如果没有找到匹配的选项，返回默认值
  return `选项${optionLetter}`;
};

// 计算未完成题目数量
const unansweredCount = computed(() => {
  return questions.filter(q => {
    const answer = userAnswers[q.id];
    return answer === null || answer === undefined || answer === '';
  }).length;
});

// 启动自动保存
const startAutoSave = () => {
  // 清除之前的定时器
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value);
  }

  // 设置自动保存定时器
  autoSaveTimer.value = setInterval(() => {
    autoSaveAnswers();
  }, autoSaveInterval);
};

// 停止自动保存
const stopAutoSave = () => {
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value);
    autoSaveTimer.value = null;
  }
};

// 自动保存答案（静默保存，不显示成功消息）
const autoSaveAnswers = async () => {
  try {
    // 检查是否有答案需要保存
    const hasAnswers = Object.values(userAnswers).some(answer =>
      answer !== null && answer !== undefined && answer !== ''
    );

    if (!hasAnswers || !examStarted.value) {
      return; // 没有答案或考试已结束，不需要保存
    }

    // 构建符合后端TestResult格式的数据
    const answerData = questions.map(question => ({
      id: question.id,
      title: question.title,
      type: question.type,
      level: question.level,
      content: question.content,
      answer: question.answer,
      answerOption: question.answerOption,
      explanation: question.explanation,
      // 学生答案
      stuAnswer: question.type === 2 ? userAnswers[question.id] || '' : null,
      stuAnswerOption: (question.type === 0 || question.type === 1) ?
        (userAnswers[question.id] !== null ? parseInt(userAnswers[question.id]) : null) : null
    }));

    const testResult = {
      testId: examInfo.id,
      studentId: null, // 从用户信息中获取，这里暂时为null
      status: 0, // 0表示进行中，1表示已提交
      startTime: examInfo.startTime?.toISOString(),
      endTime: null, // 保存时还未结束
      score: null, // 保存时还未评分
      content: JSON.stringify(answerData) // 将答题情况转换为JSON字符串
    };

    await testResultApi.updateTestResult(testResult);
    console.log('自动保存成功');
  } catch (error) {
    console.error('自动保存失败:', error);
  }
};

// 手动保存答案
const saveAnswers = async () => {
  try {
    saving.value = true;

    // 构建符合后端TestResult格式的数据
    const answerData = questions.map(question => ({
      id: question.id,
      title: question.title,
      type: question.type,
      level: question.level,
      content: question.content,
      answer: question.answer,
      answerOption: question.answerOption,
      explanation: question.explanation,
      // 学生答案
      stuAnswer: question.type === 2 ? userAnswers[question.id] || '' : null,
      stuAnswerOption: (question.type === 0 || question.type === 1) ?
        (userAnswers[question.id] !== null ? parseInt(userAnswers[question.id]) : null) : null
    }));

    const testResult = {
      testId: examInfo.id,
      studentId: null, // 从用户信息中获取，这里暂时为null
      status: 0, // 0表示进行中，1表示已提交
      startTime: examInfo.startTime?.toISOString(),
      endTime: null, // 保存时还未结束
      score: null, // 保存时还未评分
      content: JSON.stringify(answerData) // 将答题情况转换为JSON字符串
    };

    const response = await testResultApi.updateTestResult(testResult);

    if (response.code === 200) {
      message.success('答案已保存');
    } else {
      message.error(response.message || '保存答案失败');
    }
  } catch (error) {
    console.error('保存答案失败:', error);
    message.error('保存答案失败');
  } finally {
    saving.value = false;
  }
};

// 提交考试
const submitExam = () => {
  showSubmitModal.value = true;
};

// 确认提交
const confirmSubmit = async () => {
  try {
    submitting.value = true;
    showSubmitModal.value = false;

    // 停止自动保存
    stopAutoSave();

    // 构建符合后端TestResult格式的提交数据
    const answerData = questions.map(question => ({
      id: question.id,
      title: question.title,
      type: question.type,
      level: question.level,
      content: question.content,
      answer: question.answer,
      answerOption: question.answerOption,
      explanation: question.explanation,
      // 学生答案
      stuAnswer: question.type === 2 ? userAnswers[question.id] || '' : null,
      stuAnswerOption: (question.type === 0 || question.type === 1) ?
        (userAnswers[question.id] !== null ? parseInt(userAnswers[question.id]) : null) : null
    }));

    const testResult = {
      testId: examInfo.id,
      studentId: null, // 从用户信息中获取，这里暂时为null
      status: 1, // 1表示已提交
      startTime: examInfo.startTime?.toISOString(),
      endTime: new Date().toISOString(), // 提交时的结束时间
      score: null, // 提交时还未评分，由后端计算
      content: JSON.stringify(answerData) // 将答题情况转换为JSON字符串
    };

    // 调用提交考试的API
    const response = await testResultApi.submitTestResult(testResult);

    if (response.code === 200) {
      examResult.value = {
        examId: examInfo.id,
        title: examInfo.title,
        score: response.data || 0, // 后端直接返回分数整数值
        totalScore: examInfo.totalScore,
        submittedAt: new Date()
      };

      examStarted.value = false;
      showResultModal.value = true;
      message.success('考试提交成功');
    } else {
      message.error(response.message || '提交考试失败');
    }

  } catch (error) {
    console.error('提交考试失败:', error);
    message.error('提交考试失败');
  } finally {
    submitting.value = false;
  }
};

// 自动提交考试（时间到）
const autoSubmitExam = () => {
  message.warning('考试时间已到，系统自动提交');
  confirmSubmit();
};

// 返回考试列表
const goBack = () => {
  if (examStarted.value) {
    if (window.confirm('考试正在进行中，确定要离开吗？离开后考试将继续计时。')) {
      router.push('/student/exam-list');
    }
  } else {
    router.push('/student/exam-list');
  }
};

// 返回考试列表（考试结束后）
const goBackToList = () => {
  showResultModal.value = false;
  router.push('/student/exam-list');
};

// 页面离开前的确认
const handleBeforeUnload = (event) => {
  if (examStarted.value) {
    event.preventDefault();
    event.returnValue = '考试正在进行中，确定要离开吗？';
    return '考试正在进行中，确定要离开吗？';
  }
};

// 组件挂载
onMounted(() => {
  initExamInfo();
  loadQuestions();

  // 启动自动保存
  startAutoSave();

  // 添加页面离开前的确认
  window.addEventListener('beforeunload', handleBeforeUnload);
});

// 组件卸载
onBeforeUnmount(() => {
  // 清理定时器
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value);
    countdownTimer.value = null;
  }

  // 停止自动保存
  stopAutoSave();

  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<style scoped>
/* 深色模式样式 */
.exam-taking-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  background-color: #1a1a1a;
  color: #e0e0e0;
  min-height: 100vh;
}

.exam-card {
  min-height: 80vh;
  background-color: #2d2d2d;
  border: 1px solid #404040;
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 20px;
  background-color: #333333;
  border-radius: 8px;
  border: 1px solid #404040;
}

.exam-title h2 {
  margin: 0 0 8px 0;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.exam-info {
  text-align: right;
  color: #b0b0b0;
}

.exam-content {
  margin: 20px 0;
  padding: 0 20px;
}

.question-item {
  padding: 20px;
  border: 1px solid #404040;
  border-radius: 8px;
  background: #2a2a2a;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.question-item:hover {
  background: #333333;
  border-color: #505050;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #404040;
}

.question-number {
  font-weight: bold;
  color: #4a9eff;
  font-size: 16px;
}

.question-type {
  background: #404040;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #b0b0b0;
}

.question-score {
  color: #52c41a;
  font-weight: bold;
}

.question-content {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 16px;
  color: #e0e0e0;
}

.question-detail {
  font-size: 14px;
  color: #b0b0b0;
  margin-bottom: 16px;
  padding: 8px;
  background: #1f1f1f;
  border-radius: 4px;
  border: 1px solid #404040;
}

.exam-footer {
  margin-top: 20px;
  padding: 20px;
  background-color: #333333;
  border-radius: 8px;
  border: 1px solid #404040;
}

.loading-container,
.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  background-color: #2d2d2d;
  color: #e0e0e0;
}

/* 深色模式下的表单元素样式 */
:deep(.n-radio) {
  color: #e0e0e0;
}

:deep(.n-radio .n-radio__label) {
  color: #e0e0e0;
}

:deep(.n-checkbox) {
  color: #e0e0e0;
}

:deep(.n-checkbox .n-checkbox__label) {
  color: #e0e0e0;
}

:deep(.n-input) {
  background-color: #1f1f1f;
  border-color: #404040;
  color: #e0e0e0;
}

:deep(.n-input:focus) {
  border-color: #4a9eff;
}

:deep(.n-input__input-el) {
  color: #e0e0e0;
}

:deep(.n-input__placeholder) {
  color: #808080;
}

:deep(.n-button) {
  background-color: #404040;
  border-color: #505050;
  color: #e0e0e0;
}

:deep(.n-button:hover) {
  background-color: #505050;
  border-color: #606060;
}

:deep(.n-button--primary-type) {
  background-color: #4a9eff;
  border-color: #4a9eff;
}

:deep(.n-button--primary-type:hover) {
  background-color: #6bb0ff;
  border-color: #6bb0ff;
}

:deep(.n-card) {
  background-color: #2d2d2d;
  border-color: #404040;
  color: #e0e0e0;
}

:deep(.n-modal) {
  background-color: #2d2d2d;
}

:deep(.n-modal .n-card) {
  background-color: #2d2d2d;
  color: #e0e0e0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .exam-taking-container {
    padding: 10px;
  }

  .exam-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .exam-info {
    text-align: left;
  }

  .question-item {
    padding: 16px;
  }

  .exam-content {
    padding: 0 10px;
  }

  .exam-footer {
    padding: 16px;
  }
}
</style>