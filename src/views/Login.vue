<template>
    <div class="login-container">
        <div class="login-box">
            <div class="login-header">
                <h1>欢迎登录</h1>
                <p>请输入您的账号信息</p>
            </div>

            <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

            <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" @submit.prevent="login">
                <n-form-item path="username" label="用户名">
                    <n-input class="dark-color" v-model:value="formData.username" placeholder="请输入邮箱/手机号">
                        <template #prefix>
                            <n-icon :component="PersonOutline" />
                        </template>
                    </n-input>
                </n-form-item>

                <n-form-item path="password" label="密码">
                    <n-input v-model:value="formData.password" class="dark-color" type="password" placeholder="请输入密码"
                        show-password-on="click">
                        <template #prefix>
                            <n-icon :component="LockClosedOutline" />
                        </template>
                    </n-input>
                </n-form-item>

                <n-form-item path="captcha" label="验证码">
                    <n-space align="center">
                        <n-input v-model:value="formData.captcha" class="dark-color" placeholder="请输入验证码"
                            style="width: 200px">
                            <template #prefix>
                                <n-icon :component="ShieldCheckmarkOutline" />
                            </template>
                        </n-input>
                        <div class="captcha-code" @click="refreshCaptcha" title="点击刷新验证码">
                            {{ randomCaptcha }}
                        </div>
                    </n-space>
                </n-form-item>

                <n-form-item class="dark-color-remember">
                    <n-checkbox v-model:checked="formData.rememberMe"></n-checkbox>
                    <p style="color: black;">记住我</p>
                </n-form-item>

                <n-button type="primary" block @click="login" style="margin-top: 12px">
                    登录
                </n-button>

                <div class="form-footer">
                    <n-button class="dark-color" text>忘记密码？</n-button>
                    <div class="register-link">
                        <router-link to="/register">没有账号？立即注册</router-link>
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
    NCheckbox
} from 'naive-ui';
import { PersonOutline, LockClosedOutline, ShieldCheckmarkOutline } from '@vicons/ionicons5';

// 引入API模块
import { userApi, systemApi } from '../api';

// 引入独立的CSS文件
import '../assets/css/login.css';

const router = useRouter();
const message = useMessage();

// 表单数据
const formRef = ref(null);
const formData = reactive({
    username: '',
    password: '',
    captcha: '',
    rememberMe: false
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
    captcha: {
        required: true,
        message: '请输入验证码',
        trigger: 'blur'
    }
};

const errorMessage = ref('');

// 登录处理
const login = (e) => {
    e.preventDefault();
    formRef.value?.validate(async (errors) => {
        if (!errors) {
            try {
                // 调用登录API
                await userApi.login({
                    userName: formData.username,
                    password: formData.password,
                    captcha: formData.captcha,
                    rememberMe: formData.rememberMe
                }).then((res) => {
                    if (res.code !== 200) {
                        message.error(res.message);
                        refreshCaptcha();
                        return;
                    }

                    // 保存token信息到localStorage
                    if (res.data && res.data.tokenName && res.data.tokenValue) {
                        localStorage.setItem('tokenName', res.data.tokenName);
                        localStorage.setItem('tokenValue', res.data.tokenValue);
                        localStorage.setItem('isLoggedIn', 'true');
                        console.log('保存token信息完成:', res.data);
                    }

                    message.success('登录成功');
                    router.push('/chat');
                })
            } catch (error) {
                // 处理登录失败
                errorMessage.value = error.message || '登录失败，请检查用户名和密码';
                console.error('登录失败:', error);
                // 刷新验证码
                refreshCaptcha();
            }
        } else {
            errorMessage.value = '请填写所有必填字段';
        }
    });
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
/* 样式已移至独立的CSS文件: src/assets/css/login.css */
.captcha-code {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 120px;
    height: 34px;
    background-color: #4a4a4a;
    border-radius: 4px;
    font-family: "Cascadia Code";
    font-style: italic;
    font-weight: bold;
    font-size: 18px;
    color: #ffffff;
    user-select: none;
    cursor: pointer;
}
</style>