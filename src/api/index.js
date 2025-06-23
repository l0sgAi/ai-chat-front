import { get, post, put, del } from '../utils/request';

/**
 * 用户相关API
 */
export const userApi = {
  // 用户登录
  login: (data) => post(`/sys/user/auth/doLogin`, data),
  
  // 用户注册
  register: (data) => post(`/sys/user/auth/doRegister`, data),
  
  // 获取用户信息
  getUserInfo: () => get(`/sys/user/info`),
  
  // 更新用户信息
  updateUserInfo: (data) => put(`/sys/user/info`, data),
  
  // 修改密码
  changePassword: (data) => post(`/sys/user/password`, data),
  
  // 退出登录
  logout: () => post(`/sys/user/doLogout`),
};

/**
 * 聊天相关API
 */
export const chatApi = {
  // 获取会话列表
  getConversations: () => get(`/chat/conversations`),
  
  // 创建新会话
  createConversation: (data) => post(`/chat/conversation`, data),
  
  // 获取指定会话的消息
  getMessages: (conversationId) => get(`/chat/messages`, { conversationId }),
  
  // 发送消息
  sendMessage: (data) => post(`/chat/send`, data),
  
  // 删除会话
  deleteConversation: (conversationId) => del(`/chat/conversation`, { conversationId }),
  
  // 重命名会话
  renameConversation: (conversationId, title) => put(`/chat/conversation`, { conversationId, title }),
};

/**
 * 系统相关API
 */
export const systemApi = {
  // 获取系统配置
  getConfig: () => get(`/system/config`),
  
  // 获取验证码
  getCaptcha: () => get(`/system/captcha`),
};

// 导出所有API
export default {
  userApi,
  chatApi,
  systemApi,
};