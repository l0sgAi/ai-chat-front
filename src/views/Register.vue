<template>
    <div class="register-container">
        <div class="register-box">
            <div class="register-header">
                <h1>创建账号</h1>
                <p>请填写以下信息完成注册</p>
            </div>

            <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

            <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" @submit.prevent="register">
                <div class="form-row">
                    <n-form-item path="username" label="用户名">
                        <n-input v-model:value="formData.username" placeholder="请输入用户名">
                            <template #prefix>
                                <n-icon :component="PersonOutline" />
                            </template>
                        </n-input>
                    </n-form-item>

                    <n-form-item path="email" label="邮箱">
                        <n-input v-model:value="formData.email" placeholder="请输入邮箱">
                            <template #prefix>
                                <n-icon :component="MailOutline" />
                            </template>
                        </n-input>
                    </n-form-item>
                </div>

                <n-form-item path="phone" label="手机号码">
                    <n-input v-model:value="formData.phone" placeholder="请输入手机号码">
                        <template #prefix>
                            <n-icon :component="PhonePortraitOutline" />
                        </template>
                    </n-input>
                </n-form-item>

                <div class="form-row">
                    <n-form-item path="password" label="密码">
                        <n-input v-model:value="formData.password" type="password" placeholder="请输入密码"
                            show-password-on="click">
                            <template #prefix>
                                <n-icon :component="LockClosedOutline" />
                            </template>
                        </n-input>
                    </n-form-item>

                    <n-form-item path="confirmPassword" label="确认密码">
                        <n-input v-model:value="formData.confirmPassword" type="password" placeholder="请再次输入密码"
                            show-password-on="click">
                            <template #prefix>
                                <n-icon :component="LockClosedOutline" />
                            </template>
                        </n-input>
                    </n-form-item>
                </div>

                <n-form-item path="captcha" label="验证码">
                    <n-space align="center">
                        <n-input v-model:value="formData.captcha" placeholder="请输入验证码" style="width: 200px">
                            <template #prefix>
                                <n-icon :component="ShieldCheckmarkOutline" />
                            </template>
                        </n-input>
                        <div class="captcha-code" @click="refreshCaptcha" title="点击刷新验证码">
                            {{ randomCaptcha }}
                        </div>
                    </n-space>
                </n-form-item>

                <n-form-item path="agreeTerms">
                    <n-checkbox v-model:checked="formData.agreeTerms">我已阅读并同意<n-button text>用户协议</n-button>和<n-button
                            text>隐私政策</n-button></n-checkbox>
                </n-form-item>

                <n-button type="primary" block @click="register" style="margin-top: 12px">
                    注册
                </n-button>

                <div class="form-footer">
                    <div class="login-link">
                        <router-link to="/login">已有账号？立即登录</router-link>
                    </div>
                </div>
            </n-form>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
    NForm,
    NFormItem,
    NInput,
    NButton,
    NDivider,
    NSpace,
    NIcon,
    NCheckbox,
    NGrid,
    NGridItem
} from 'naive-ui';
import {
    PersonOutline,
    LockClosedOutline,
    ShieldCheckmarkOutline,
    MailOutline,
    SchoolOutline,
    PhonePortraitOutline
} from '@vicons/ionicons5';

// 引入API模块
import { userApi, systemApi } from '../api';

// 引入独立的CSS文件
import '../assets/css/register.css';

const router = useRouter();
const message = useMessage();

// 表单数据
const formRef = ref({});
const formData = reactive({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    captcha: '',
    agreeTerms: false
});

// 表单验证规则
const rules = {
    username: {
        required: true,
        message: '请输入用户名',
        trigger: 'blur'
    },
    password: {
        required: true,
        message: '请输入密码',
        trigger: 'blur'
    },
    confirmPassword: {
        required: true,
        message: '请再次输入密码',
        trigger: 'blur',
        validator: (rule, value) => {
            return value === formData.password ? true : new Error('两次输入的密码不一致')
        }
    },
    email: {
        required: true,
        message: '请输入邮箱',
        trigger: 'blur',
        validator: (rule, value) => {
            // 邮箱正则表达式
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            // 学号正则表达式（假设学号是纯数字且长度在5-20位之间）
            // const studentIdRegex = /^\d{5,20}$/

            if (emailRegex.test(value)) {
                return true
            } else {
                return new Error('请输入有效的邮箱')
            }
        }
    },
    captcha: {
        required: true,
        message: '请输入验证码',
        trigger: 'blur'
    },
    agreeTerms: {
        required: true,
        type: 'boolean',
        message: '请阅读并同意用户协议',
        trigger: 'change'
    }
};

const errorMessage = ref('');

// 注册处理
const register = async (e) => {
    e.preventDefault();
    // console.log('开始注册', formData, formRef.value);
    try {
        await formRef.value?.validate();  // 这是核心改动
        console.log('表单验证通过');

        if (formData.captcha.toLowerCase() !== randomCaptcha.value.toLowerCase()) {
            message.error('验证码输入错误');
            refreshCaptcha();
            return;
        }

        const response = await userApi.register({
            username: formData.username,
            password: formData.password,
            email: formData.email,
            phone: formData.phone,
            captcha: formData.captcha
        });

        // console.log(response);
        if (response.code !== 200) {
            message.error(response.message);
            refreshCaptcha();
            return;
        }

        // 保存token信息到localStorage
        if (response.data && response.data.tokenName && response.data.tokenValue) {
            localStorage.setItem('tokenName', response.data.tokenName);
            localStorage.setItem('tokenValue', response.data.tokenValue);
            localStorage.setItem('isLoggedIn', 'true');
        }

        message.success('注册成功');
        router.push('/chat');
    } catch (error) {
        // 捕获表单校验失败或注册接口异常
        if (error?.message) {
            errorMessage.value = error.message;
        } else {
            errorMessage.value = '请填写所有必填字段并确保输入正确';
        }
        console.error('注册失败:', error);
        refreshCaptcha();
    }
};


// 验证码
const randomCaptcha = ref(Math.random().toString(36).substring(2, 8).toUpperCase());

// 刷新验证码
const refreshCaptcha = async () => {
    // TODO 换成后端校验
    randomCaptcha.value = Math.random().toString(36).substring(2, 8).toUpperCase();
};
</script>

<style scoped>
/* 样式已移至独立的CSS文件: src/assets/css/register.css */
.captcha-code {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 120px;
    height: 34px;
    background-color: #e8f0fe;
    border-radius: 4px;
    font-family: "Cascadia Code";
    font-style: italic;
    font-weight: bold;
    font-size: 18px;
    color: #333;
    user-select: none;
    cursor: pointer;
}
</style>