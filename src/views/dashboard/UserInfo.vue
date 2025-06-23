<template>
    <div class="user-info-container">
        <n-card title="用户信息管理" class="user-info-card">
            <template #header-extra>
                <n-button type="primary" @click="showAddUserModal = true">
                    <template #icon>
                        <n-icon><add-outline /></n-icon>
                    </template>
                    添加用户
                </n-button>
            </template>

            <!-- 用户筛选 -->
            <n-space vertical>
                <n-space>
                    <n-input v-model:value="searchKeyword" placeholder="搜索用户名/学号" style="width: 200px">
                        <template #prefix>
                            <n-icon><search-outline /></n-icon>
                        </template>
                    </n-input>
                    <n-select v-model:value="selectedRole" :options="roleOptions" placeholder="用户角色"
                        style="width: 150px" />
                    <n-select v-model:value="selectedClass" :options="classOptions" placeholder="班级"
                        style="width: 150px" />
                    <n-button @click="searchUsers">搜索</n-button>
                    <n-button @click="resetSearch">重置</n-button>
                </n-space>
            </n-space>

            <!-- 用户列表 -->
            <n-data-table :columns="columns" :data="filteredUsers" :pagination="pagination" :bordered="false" striped />

            <!-- 添加用户模态框 -->
            <n-modal v-model:show="showAddUserModal" preset="card" title="添加用户" style="width: 600px">
                <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="100">
                    <n-form-item path="username" label="用户名">
                        <n-input v-model:value="formData.username" placeholder="请输入用户名" />
                    </n-form-item>
                    <n-form-item path="realName" label="姓名">
                        <n-input v-model:value="formData.realName" placeholder="请输入姓名" />
                    </n-form-item>
                    <n-form-item path="studentId" label="学号">
                        <n-input v-model:value="formData.studentId" placeholder="请输入学号" />
                    </n-form-item>
                    <n-form-item path="role" label="角色">
                        <n-select v-model:value="formData.role" :options="roleOptions" />
                    </n-form-item>
                    <n-form-item path="class" label="班级">
                        <n-select v-model:value="formData.class" :options="classOptions" />
                    </n-form-item>
                    <n-form-item path="password" label="密码">
                        <n-input v-model:value="formData.password" type="password" placeholder="请输入密码"
                            show-password-on="click" />
                    </n-form-item>
                    <n-form-item path="confirmPassword" label="确认密码">
                        <n-input v-model:value="formData.confirmPassword" type="password" placeholder="请再次输入密码"
                            show-password-on="click" />
                    </n-form-item>
                    <n-form-item path="email" label="邮箱">
                        <n-input v-model:value="formData.email" placeholder="请输入邮箱" />
                    </n-form-item>
                    <n-form-item path="phone" label="手机号">
                        <n-input v-model:value="formData.phone" placeholder="请输入手机号" />
                    </n-form-item>
                </n-form>
                <template #footer>
                    <n-space justify="end">
                        <n-button @click="showAddUserModal = false">取消</n-button>
                        <n-button type="primary" @click="addUser">确认</n-button>
                    </n-space>
                </template>
            </n-modal>

            <!-- 编辑用户模态框 -->
            <n-modal v-model:show="showEditUserModal" preset="card" title="编辑用户" style="width: 600px">
                <n-form ref="editFormRef" :model="editFormData" :rules="rules" label-placement="left" label-width="100">
                    <n-form-item path="username" label="用户名">
                        <n-input v-model:value="editFormData.username" placeholder="请输入用户名" />
                    </n-form-item>
                    <n-form-item path="realName" label="姓名">
                        <n-input v-model:value="editFormData.realName" placeholder="请输入姓名" />
                    </n-form-item>
                    <n-form-item path="studentId" label="学号">
                        <n-input v-model:value="editFormData.studentId" placeholder="请输入学号" />
                    </n-form-item>
                    <n-form-item path="role" label="角色">
                        <n-select v-model:value="editFormData.role" :options="roleOptions" />
                    </n-form-item>
                    <n-form-item path="class" label="班级">
                        <n-select v-model:value="editFormData.class" :options="classOptions" />
                    </n-form-item>
                    <n-form-item path="email" label="邮箱">
                        <n-input v-model:value="editFormData.email" placeholder="请输入邮箱" />
                    </n-form-item>
                    <n-form-item path="phone" label="手机号">
                        <n-input v-model:value="editFormData.phone" placeholder="请输入手机号" />
                    </n-form-item>
                </n-form>
                <template #footer>
                    <n-space justify="end">
                        <n-button @click="showEditUserModal = false">取消</n-button>
                        <n-button type="primary" @click="updateUser">确认</n-button>
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
    NModal,
    NForm,
    NFormItem,
    NInput,
    NSelect,
    NIcon,
    NPopconfirm
} from 'naive-ui';
import {
    AddOutline,
    CreateOutline,
    TrashOutline,
    SearchOutline
} from '@vicons/ionicons5';

const message = useMessage();

// 角色选项
const roleOptions = [
    { label: '学生', value: 'student' },
    { label: '教师', value: 'teacher' },
    { label: '管理员', value: 'admin' }
];

// 班级选项
const classOptions = [
    { label: '计算机科学与技术1班', value: 'cs1' },
    { label: '计算机科学与技术2班', value: 'cs2' },
    { label: '软件工程1班', value: 'se1' },
    { label: '软件工程2班', value: 'se2' },
    { label: '人工智能1班', value: 'ai1' },
    { label: '人工智能2班', value: 'ai2' }
];

// 获取角色名称
const getRoleName = (role) => {
    const option = roleOptions.find(item => item.value === role);
    return option ? option.label : role;
};

// 获取班级名称
const getClassName = (className) => {
    const option = classOptions.find(item => item.value === className);
    return option ? option.label : className;
};

// 表格列定义
const createColumns = ({ edit, remove }) => {
    return [
        {
            title: '用户名',
            key: 'username'
        },
        {
            title: '姓名',
            key: 'realName'
        },
        {
            title: '学号',
            key: 'studentId'
        },
        {
            title: '角色',
            key: 'role',
            render(row) {
                return getRoleName(row.role);
            }
        },
        {
            title: '班级',
            key: 'class',
            render(row) {
                return getClassName(row.class);
            }
        },
        {
            title: '邮箱',
            key: 'email'
        },
        {
            title: '手机号',
            key: 'phone'
        },
        {
            title: '操作',
            key: 'actions',
            render(row) {
                return h(NSpace, {}, {
                    default: () => [
                        h(
                            NButton,
                            {
                                size: 'small',
                                type: 'info',
                                onClick: () => edit(row)
                            },
                            {
                                default: () => '编辑',
                                icon: () => h(NIcon, null, { default: () => h(CreateOutline) })
                            }
                        ),
                        h(
                            NPopconfirm,
                            {
                                onPositiveClick: () => remove(row),
                            },
                            {
                                default: () => '确认删除？',
                                trigger: () => h(
                                    NButton,
                                    {
                                        size: 'small',
                                        type: 'error',
                                    },
                                    {
                                        default: () => '删除',
                                        icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
                                    }
                                )
                            }
                        )
                    ]
                });
            }
        }
    ];
};

// 模拟用户数据
const userData = ref([
    {
        id: 1,
        username: 'student1',
        realName: '张三',
        studentId: '2023001',
        role: 'student',
        class: 'cs1',
        email: 'student1@example.com',
        phone: '13800138001'
    },
    {
        id: 2,
        username: 'student2',
        realName: '李四',
        studentId: '2023002',
        role: 'student',
        class: 'cs2',
        email: 'student2@example.com',
        phone: '13800138002'
    },
    {
        id: 3,
        username: 'teacher1',
        realName: '王老师',
        studentId: 'T2023001',
        role: 'teacher',
        class: '',
        email: 'teacher1@example.com',
        phone: '13900139001'
    },
    {
        id: 4,
        username: 'admin',
        realName: '管理员',
        studentId: 'A2023001',
        role: 'admin',
        class: '',
        email: 'admin@example.com',
        phone: '13900139999'
    }
]);

// 搜索相关状态
const searchKeyword = ref('');
const selectedRole = ref(null);
const selectedClass = ref(null);

// 过滤后的用户列表
const filteredUsers = computed(() => {
    let result = [...userData.value];

    // 关键词搜索
    if (searchKeyword.value) {
        const keyword = searchKeyword.value.toLowerCase();
        result = result.filter(user =>
            user.username.toLowerCase().includes(keyword) ||
            user.realName.toLowerCase().includes(keyword) ||
            user.studentId.toLowerCase().includes(keyword)
        );
    }

    // 角色筛选
    if (selectedRole.value) {
        result = result.filter(user => user.role === selectedRole.value);
    }

    // 班级筛选
    if (selectedClass.value) {
        result = result.filter(user => user.class === selectedClass.value);
    }

    return result;
});

// 搜索用户
const searchUsers = () => {
    // 已通过计算属性实现
    message.success('搜索完成');
};

// 重置搜索
const resetSearch = () => {
    searchKeyword.value = '';
    selectedRole.value = null;
    selectedClass.value = null;
};

// 分页配置
const pagination = {
    pageSize: 10
};

// 表单数据
const formRef = ref(null);
const formData = reactive({
    username: '',
    realName: '',
    studentId: '',
    role: 'student',
    class: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: ''
});

// 编辑表单数据
const editFormRef = ref(null);
const editFormData = reactive({
    id: null,
    username: '',
    realName: '',
    studentId: '',
    role: '',
    class: '',
    email: '',
    phone: ''
});

// 表单验证规则
const rules = {
    username: {
        required: true,
        message: '请输入用户名',
        trigger: 'blur'
    },
    realName: {
        required: true,
        message: '请输入姓名',
        trigger: 'blur'
    },
    studentId: {
        required: true,
        message: '请输入学号',
        trigger: 'blur'
    },
    role: {
        required: true,
        message: '请选择角色',
        trigger: 'change'
    },
    password: {
        required: true,
        message: '请输入密码',
        trigger: 'blur'
    },
    confirmPassword: {
        required: true,
        message: '请确认密码',
        trigger: 'blur',
        validator: (rule, value) => {
            return value === formData.password ? true : new Error('两次输入的密码不一致');
        }
    },
    email: {
        required: true,
        message: '请输入邮箱',
        trigger: 'blur',
        validator: (rule, value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value) ? true : new Error('请输入有效的邮箱地址');
        }
    },
    phone: {
        required: true,
        message: '请输入手机号',
        trigger: 'blur',
        validator: (rule, value) => {
            const phoneRegex = /^1[3-9]\d{9}$/;
            return phoneRegex.test(value) ? true : new Error('请输入有效的手机号');
        }
    }
};

// 模态框状态
const showAddUserModal = ref(false);
const showEditUserModal = ref(false);

// 表格列
const columns = createColumns({
    edit: (row) => {
        showEditUserModal.value = true;
        Object.assign(editFormData, row);
    },
    remove: (row) => {
        userData.value = userData.value.filter(item => item.id !== row.id);
        message.success('用户已删除');
    }
});

// 添加用户
const addUser = () => {
    formRef.value?.validate((errors) => {
        if (!errors) {
            const newUser = {
                id: Date.now(),
                username: formData.username,
                realName: formData.realName,
                studentId: formData.studentId,
                role: formData.role,
                class: formData.class,
                email: formData.email,
                phone: formData.phone
            };

            userData.value.push(newUser);
            message.success('用户添加成功');
            showAddUserModal.value = false;

            // 重置表单
            formData.username = '';
            formData.realName = '';
            formData.studentId = '';
            formData.role = 'student';
            formData.class = '';
            formData.password = '';
            formData.confirmPassword = '';
            formData.email = '';
            formData.phone = '';
        } else {
            message.error('请完善表单信息');
        }
    });
};

// 更新用户
const updateUser = () => {
    editFormRef.value?.validate((errors) => {
        if (!errors) {
            const index = userData.value.findIndex(item => item.id === editFormData.id);
            if (index !== -1) {
                userData.value[index] = { ...editFormData };
                message.success('用户信息更新成功');
                showEditUserModal.value = false;
            }
        } else {
            message.error('请完善表单信息');
        }
    });
};
</script>

<style scoped>
.user-info-container {
    padding: 20px;
}

.user-info-card {
    margin-bottom: 20px;
}
</style>