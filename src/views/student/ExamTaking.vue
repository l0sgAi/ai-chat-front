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

    <!-- 提交处理中模态框 -->
    <n-modal v-model:show="showSubmittingModal" preset="card" title="正在提交考试" style="width: 500px;" :mask-closable="false" :close-on-esc="false">
      <div style="text-align: center; padding: 40px 20px;">
        <n-spin size="large">
          <template #description>
            <div style="margin-top: 16px;">
              <p style="font-size: 16px; margin-bottom: 8px;">{{ submittingMessage }}</p>
              <p style="font-size: 14px; color: #909399;">AI正在智能评分，请耐心等待...</p>
              <p style="font-size: 12px; color: #c0c4cc; margin-top: 16px;">请不要关闭页面或刷新浏览器</p>
            </div>
          </template>
        </n-spin>
      </div>
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
const showSubmittingModal = ref(false);
const showResultModal = ref(false);
const submittingMessage = ref('正在提交答案...');
const offset = (8 * 60 * 60 * 1000);
// 题目数据
const questions = reactive([]);
const userAnswers = reactive({});
const examResult = ref(null);

// 防作弊相关
const devToolsOpen = ref(false);
const devToolsTimer = ref(null);
const pageHidden = ref(false);
const pageVisibilityTimer = ref(null);

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

// 检测开发者工具是否打开（优化后的检测方法）
const detectDevTools = () => {
  // 方法1: 检测console.log的执行时间（更准确的方法）
  let start = performance.now();
  console.log('%c', 'color: transparent');
  let end = performance.now();
  const consoleTime = end - start;
  
  // 方法2: 检测debugger语句
  let debuggerDetected = false;
  try {
    const before = performance.now();
    debugger;
    const after = performance.now();
    debuggerDetected = (after - before) > 100;
  } catch (e) {
    // debugger被阻止
  }
  
  // 方法3: 检测窗口尺寸变化（提高阈值，减少误判）
  const threshold = 200; // 提高检测阈值
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;
  
  // 只有当console时间明显异常或debugger被触发时才认为是开发者工具
  return consoleTime > 5 || debuggerDetected || (widthThreshold && heightThreshold);
};

// 检测页面可见性变化（切换标签页或最小化窗口）
const handleVisibilityChange = () => {
  if (!examStarted.value || submitting.value) {
    return; // 考试未开始或正在提交时不检测
  }
  
  if (document.hidden) {
    // 页面被隐藏（切换到其他标签页或最小化）
    pageHidden.value = true;
    message.warning('检测到页面切换，考试将在5秒后自动提交！');
    
    // 给用户5秒时间切换回来
    pageVisibilityTimer.value = setTimeout(() => {
      if (document.hidden && examStarted.value && !submitting.value) {
        message.error('检测到页面切换超时，考试自动提交！');
        confirmSubmit();
      }
    }, 5000);
  } else {
    // 页面重新可见
    if (pageHidden.value && pageVisibilityTimer.value) {
      clearTimeout(pageVisibilityTimer.value);
      pageVisibilityTimer.value = null;
      pageHidden.value = false;
      message.success('欢迎回到考试页面');
    }
  }
};

// 启动防作弊检测
const startAntiCheatDetection = () => {
  if (devToolsTimer.value) {
    clearInterval(devToolsTimer.value);
  }
  
  // 每1秒检测一次开发者工具（降低检测频率）
  devToolsTimer.value = setInterval(() => {
    if (!examStarted.value || submitting.value) {
      return; // 考试未开始或正在提交时不检测
    }
    
    const isDevToolsOpen = detectDevTools();
    
    if (isDevToolsOpen && !devToolsOpen.value) {
      devToolsOpen.value = true;
      message.error('检测到开发者工具，考试将自动提交！');
      
      // 延迟1秒后自动提交，给用户看到提示信息的时间
      setTimeout(() => {
        if (examStarted.value && !submitting.value) {
          confirmSubmit();
        }
      }, 1000);
    }
  }, 1000);
  
  // 添加页面可见性检测
  document.addEventListener('visibilitychange', handleVisibilityChange);
};

// 停止防作弊检测
const stopAntiCheatDetection = () => {
  if (devToolsTimer.value) {
    clearInterval(devToolsTimer.value);
    devToolsTimer.value = null;
  }
  
  if (pageVisibilityTimer.value) {
    clearTimeout(pageVisibilityTimer.value);
    pageVisibilityTimer.value = null;
  }
  
  // 移除页面可见性检测
  document.removeEventListener('visibilitychange', handleVisibilityChange);
};

// 优化后的快捷键禁用（只禁用开发者工具相关）
const disableDevToolsShortcuts = (event) => {
  // 只禁用开发者工具相关快捷键
  
  // 禁用F12
  if (event.keyCode === 123) {
    event.preventDefault();
    message.warning('禁止使用开发者工具！');
    return false;
  }
  
  // 禁用Ctrl+Shift+I (Chrome开发者工具)
  if (event.ctrlKey && event.shiftKey && event.keyCode === 73) {
    event.preventDefault();
    message.warning('禁止使用开发者工具！');
    return false;
  }
  
  // 禁用Ctrl+Shift+C (Chrome元素选择器)
  if (event.ctrlKey && event.shiftKey && event.keyCode === 67) {
    event.preventDefault();
    message.warning('禁止使用开发者工具！');
    return false;
  }
  
  // 禁用Ctrl+Shift+J (Chrome控制台)
  if (event.ctrlKey && event.shiftKey && event.keyCode === 74) {
    event.preventDefault();
    message.warning('禁止使用开发者工具！');
    return false;
  }
  
  // 移除对Ctrl+U和Ctrl+S的禁用，允许正常的页面操作
};

// 优化后的右键菜单处理（允许在输入框中使用）
const disableContextMenu = (event) => {
  // 如果是在输入框或文本域中，允许右键菜单
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return true;
  }
  
  event.preventDefault();
  message.warning('考试期间禁止使用右键菜单！');
  return false;
};

// 禁用文本选择
const disableTextSelection = (event) => {
  if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
    event.preventDefault();
    return false;
  }
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
    showSubmittingModal.value = true;
    submittingMessage.value = '正在提交答案...';

    // 停止自动保存
    stopAutoSave();

    // 停止防作弊检测
    stopAntiCheatDetection();

    // 阶段1：准备数据
    submittingMessage.value = '正在整理答题数据...';
    await new Promise(resolve => setTimeout(resolve, 500)); // 给用户一些视觉反馈

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

    // 阶段2：提交到服务器
    submittingMessage.value = '正在上传答案到服务器...';
    await new Promise(resolve => setTimeout(resolve, 300));

    // 阶段3：AI评分处理
    submittingMessage.value = 'AI正在智能评分，请稍候...';
    
    // 调用提交考试的API
    const response = await testResultApi.submitTestResult(testResult);

    if (response.code === 200) {
      // 阶段4：处理结果
      submittingMessage.value = '正在生成考试结果...';
      await new Promise(resolve => setTimeout(resolve, 500));

      examResult.value = {
        examId: examInfo.id,
        title: examInfo.title,
        score: response.data || 0, // 后端直接返回分数整数值
        totalScore: examInfo.totalScore,
        submittedAt: new Date()
      };

      examStarted.value = false;
      showSubmittingModal.value = false;
      showResultModal.value = true;
      message.success('考试提交成功');
    } else {
      showSubmittingModal.value = false;
      message.error(response.message || '提交考试失败');
    }

  } catch (error) {
    console.error('提交考试失败:', error);
    showSubmittingModal.value = false;
    message.error('提交考试失败，请重试');
  } finally {
    submitting.value = false;
  }
};

// 自动提交考试（时间到）
const autoSubmitExam = () => {
  if (submitting.value) {
    // 如果正在提交中，不重复提交
    return;
  }
  message.warning('考试时间已到，系统自动提交');
  confirmSubmit();
};

// 返回考试列表
const goBack = () => {
  if (submitting.value) {
    message.warning('考试正在提交中，请稍候...');
    return;
  }
  
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

// 页面离开前的确认（优化提示信息）
const handleBeforeUnload = (event) => {
  if (examStarted.value || submitting.value) {
    event.preventDefault();
    if (submitting.value) {
      event.returnValue = '考试正在提交中，请不要离开页面！';
      return '考试正在提交中，请不要离开页面！';
    } else {
      // 刷新页面不会触发作弊检测，只是提醒用户
      event.returnValue = '考试正在进行中，刷新页面不会影响考试，但建议不要离开。';
      return '考试正在进行中，刷新页面不会影响考试，但建议不要离开。';
    }
  }
};

// 组件挂载
onMounted(() => {
  initExamInfo();
  loadQuestions();

  // 启动自动保存
  startAutoSave();

  // 启动防作弊检测
  startAntiCheatDetection();

  // 添加防作弊事件监听器
  document.addEventListener('keydown', disableDevToolsShortcuts);
  document.addEventListener('contextmenu', disableContextMenu);
  document.addEventListener('selectstart', disableTextSelection);
  document.addEventListener('dragstart', disableTextSelection);

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

  // 停止防作弊检测
  stopAntiCheatDetection();

  // 移除防作弊事件监听器
  document.removeEventListener('keydown', disableDevToolsShortcuts);
  document.removeEventListener('contextmenu', disableContextMenu);
  document.removeEventListener('selectstart', disableTextSelection);
  document.removeEventListener('dragstart', disableTextSelection);

  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<style scoped>
/* 防作弊样式 */
.exam-taking-container {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

/* 允许输入框和文本域选择文本 */
.exam-taking-container input,
.exam-taking-container textarea {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

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