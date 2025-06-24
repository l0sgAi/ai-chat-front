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
  getUserInfo: () => get(`${BASE_URL}/sys/user/info`),
  
  // 更新用户信息
  updateUserInfo: (data) => put(`${BASE_URL}/sys/user/info`, data),
  
  // 修改密码
  changePassword: (data) => post(`${BASE_URL}/sys/user/password`, data),
  
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

// 导出所有API
export default {
  userApi,
  chatApi,
  systemApi,
  studentApi,
};