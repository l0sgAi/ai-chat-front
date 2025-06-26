import { get, post, put, del } from '../utils/request';

// API基础URL，可以从环境变量中获取
const BASE_URL = '';

/**
 * 用户相关API
 */
export const userApi = {
  // 用户登录
  login: (data) => post(`${BASE_URL}/sys/user/auth/doLogin`, data),
  
  // 用户注册
  register: (data) => post(`${BASE_URL}/sys/user/auth/doRegister`, data),
  
  // 获取用户信息
  getUserInfo: () => get(`${BASE_URL}/sys/user/getUserInfo`),
  
  // 更新用户信息
  updateUserInfo: (data) => put(`${BASE_URL}/sys/user/info`, data),
  
  // 修改密码
  changePassword: (data) => put(`${BASE_URL}/sys/user/update`, data),
  
  // 退出登录
  logout: () => post(`${BASE_URL}/sys/user/doLogout`),
};

/**
 * 聊天相关API
 */
export const chatApi = {
  // 获取会话列表
  getConversations: () => get(`${BASE_URL}/chat/conversations`),
  
  // 创建新会话
  createConversation: (data) => post(`${BASE_URL}/chat/conversation`, data),
  
  // 获取指定会话的消息
  getMessages: (conversationId) => get(`${BASE_URL}/chat/messages`, { conversationId }),
  
  // 发送消息
  sendMessage: (data) => post(`${BASE_URL}/chat/message`, data),
  
  // 删除会话
  deleteConversation: (conversationId) => del(`${BASE_URL}/chat/conversation`, { conversationId }),
  
  // 重命名会话
  renameConversation: (conversationId, title) => put(`${BASE_URL}/chat/conversation`, { conversationId, title }),
};

/**
 * 考试相关API
 */
export const examApi = {
  // 查询考试列表
  getExams: (params) => get(`${BASE_URL}/exam/tests/query`, params),
  // 获取考试列表（管理员）
  getExamsAdmin: (params) => get(`${BASE_URL}/exam/tests/queryAdmin`, params),
  // 新增考试
  addExam: (data) => post(`${BASE_URL}/exam/tests/add`, data),
  
  // 更新考试
  updateExam: (data) => put(`${BASE_URL}/exam/tests/update`, data),
  
  // 删除考试
  deleteExam: (id) => put(`${BASE_URL}/exam/tests/delete`, null, { params: { id } }),
  
  // 查询考试列表（带状态过滤）
  queryExams: (keyWord, status, pageNum = 1, pageSize = 10) => {
    const params = { pageNum, pageSize };
    if (keyWord) params.keyWord = keyWord;
    if (status !== null && status !== undefined) params.status = status;
    return get(`${BASE_URL}/exam/tests/query`, params);
  },
  
  // 获取考试题目
  getTestQuestion: (testId) => get(`${BASE_URL}/exam/tests/getTestQuestion`,null, { params: { testId } }),
  
  // 保存考试答案
  saveAnswers: (data) => post(`${BASE_URL}/exam/tests/saveAnswers`, data),
  
  // 提交考试
  submitExam: (data) => post(`${BASE_URL}/exam/tests/submitExam`, data),
};

/**
 * 系统相关API
 */
export const systemApi = {
  // 获取系统配置
  getConfig: () => get(`${BASE_URL}/system/config`),
  
  // 获取验证码
  getCaptcha: () => get(`${BASE_URL}/system/captcha`),
};

/**
 * 学生相关API
 */
export const studentApi = {
  // 添加学生
  addStudent: (data) => post(`${BASE_URL}/exam/student/add`, data),
  
  // 查询学生列表
  queryStudents: (keyWord, pageNum = 1, pageSize = 10) => 
    get(`${BASE_URL}/exam/student/query`, { keyWord, pageNum, pageSize }),
  
  // 更新学生信息
  updateStudent: (data) => put(`${BASE_URL}/exam/student/update`, data),
  
  // 删除学生
  deleteStudent: (id) => put(`${BASE_URL}/exam/student/delete`, null, { params: { id } }),
};

/**
 * 题库相关API
 */
export const questionBankApi = {
  // 添加题目
  addQuestion: (data) => post(`${BASE_URL}/exam/questionBank/add`, data),
  
  // 查询题目列表
  queryQuestions: (keyWord, pageNum = 1, pageSize = 10) => 
    get(`${BASE_URL}/exam/questionBank/query`, { keyWord, pageNum, pageSize }),
  
  // 更新题目信息
  updateQuestion: (data) => put(`${BASE_URL}/exam/questionBank/update`, data),
  
  // 删除题目
  deleteQuestion: (id) => put(`${BASE_URL}/exam/questionBank/delete`, null, { params: { id } }),
};

/**
 * 考试结果相关API
 */
export const testResultApi = {
  // 查询考试结果历史
  queryTestHistory: (keyWord, pageNum = 1, pageSize = 10) => {
    const params = { pageNum, pageSize };
    if (keyWord) params.keyWord = keyWord;
    return get(`${BASE_URL}/exam/tetsResult/query`, params);
  },
  
  // 保存考试结果
  updateTestResult: (data) => put(`${BASE_URL}/exam/tetsResult/update`, data),
  
  // 提交考试结果
  submitTestResult: (data) => put(`${BASE_URL}/exam/tetsResult/submit`, data),
};



// 导出所有API
export default {
  userApi,
  chatApi,
  systemApi,
  studentApi,
  questionBankApi,
  examApi,
  testResultApi,
};