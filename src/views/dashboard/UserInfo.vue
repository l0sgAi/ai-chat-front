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
            <n-space vertical class="filter-margin">
                <n-space>
                    <n-input v-model:value="searchKeyword" placeholder="搜索用户名/学号" style="width: 200px">
                        <template #prefix>
                            <n-icon><search-outline /></n-icon>
                        </template>
                    </n-input>
                    <!-- <n-select v-model:value="selectedRole" :options="roleOptions" placeholder="用户角色"
                        style="width: 150px" />
                    <n-select v-model:value="selectedClass" :options="classOptions" placeholder="班级"
                        style="width: 150px" /> -->
                    <n-button @click="searchUsers">搜索</n-button>
                    <n-button @click="resetSearch">重置</n-button>
                </n-space>
            </n-space>

            <!-- 用户列表 -->
            <n-data-table :columns="columns" :data="userData" :pagination="pagination" :bordered="false"
                :loading="loading" striped />

            <!-- 添加用户模态框 -->
            <n-modal v-model:show="showAddUserModal" preset="card" title="添加用户" style="width: 600px">
                <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="100">
                    <n-form-item path="username" label="姓名">
                        <n-input v-model:value="formData.username" placeholder="请输入姓名" />
                    </n-form-item>
                    <n-form-item path="email" label="学号">
                        <n-input v-model:value="formData.email" placeholder="请输入学号" />
                    </n-form-item>
                    <n-form-item path="nickname" label="班级">
                        <n-input v-model:value="formData.nickname" placeholder="请输入班级" />
                    </n-form-item>
                    <n-form-item path="gender" label="性别">
                        <n-select v-model:value="formData.gender" :options="genderOptions" />
                    </n-form-item>
                    <n-form-item path="birthdate" label="生日">
                        <n-date-picker v-model:value="formData.birthdate" type="date" />
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
                    <n-form-item path="username" label="姓名">
                        <n-input v-model:value="editFormData.username" placeholder="请输入姓名" />
                    </n-form-item>
                    <n-form-item path="email" label="学号">
                        <n-input v-model:value="editFormData.email" placeholder="请输入学号" />
                    </n-form-item>
                    <n-form-item path="nickname" label="班级">
                        <n-input v-model:value="editFormData.nickname" placeholder="请输入班级" />
                    </n-form-item>
                    <n-form-item path="gender" label="性别">
                        <n-select v-model:value="editFormData.gender" :options="genderOptions" />
                    </n-form-item>
                    <n-form-item path="birthdate" label="生日">
                        <n-date-picker v-model:value="editFormData.birthdate" type="date" />
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
import { h, ref, reactive, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { studentApi } from '../../api';
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
    NPopconfirm,
    NDatePicker
} from 'naive-ui';
import {
    AddOutline,
    CreateOutline,
    TrashOutline,
    SearchOutline
} from '@vicons/ionicons5';

const message = useMessage();

// 角色选项 (0=学生，1=管理员)
const roleOptions = [
    { label: '学生', value: 0 },
    { label: '管理员', value: 1 }
];

// 获取角色名称
const getRoleName = (role) => {
    const option = roleOptions.find(item => item.value === role);
    return option ? option.label : '未知';
};

// 性别选项 (0=未知，1=男，2=女)
const genderOptions = [
    { label: '未知', value: 0 },
    { label: '男', value: 1 },
    { label: '女', value: 2 }
];

// 获取性别名称
const getGenderName = (gender) => {
    const option = genderOptions.find(item => item.value === gender);
    return option ? option.label : '未知';
};

// 表格列定义
const createColumns = ({ edit, remove }) => {
    return [
        {
            title: '姓名',
            key: 'username'
        },
        {
            title: '学号',
            key: 'email'
        },
        {
            title: '班级',
            key: 'nickname',
        },
        {
            title: '角色',
            key: 'role',
            render(row) {
                return getRoleName(row.role);
            }
        },
        {
            title: '性别',
            key: 'gender',
            render(row) {
                return getGenderName(row.gender);
            }
        },
        {
            title: '生日',
            key: 'birthdate'
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

// 用户数据，从后端获取
const userData = ref([]);
const loading = ref(false);

// 获取学生列表
const fetchStudents = async () => {
    try {
        loading.value = true;
        console.log('请求参数:', {
            keyWord: searchKeyword.value,
            pageNum: pagination.page,
            pageSize: pagination.pageSize
        });
        const res = await studentApi.queryStudents(
            searchKeyword.value,
            pagination.page, // pageNum
            pagination.pageSize // pageSize
        );

        if (res.code === 200) {
            userData.value = res.data;
            // 后端使用Result.page()返回，total字段在res中
            pagination.itemCount = res.count || 0;
            console.log('分页数据:', { data: res.data, total: res.count, currentPage: pagination.page });
        } else {
            message.error(res.message || '获取学生列表失败');
        }
    } catch (error) {
        console.error('获取学生列表失败:', error);
        message.error('获取学生列表失败: ' + (error.message || '未知错误'));
    } finally {
        loading.value = false;
    }
};

// 组件挂载时获取数据
onMounted(() => {
    fetchStudents();
});

// 搜索相关状态
const searchKeyword = ref('');
const selectedRole = ref(null);
const selectedClass = ref(null);

// 搜索用户
const searchUsers = () => {
    pagination.page = 1; // 重置到第一页
    fetchStudents();
};

// 重置搜索
const resetSearch = () => {
    searchKeyword.value = '';
    selectedRole.value = null;
    selectedClass.value = null;
    pagination.page = 1; // 重置到第一页
    fetchStudents();
};

// 分页配置
const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50, 100],
    onUpdatePage: (page) => {
        pagination.page = page;
        fetchStudents();
    },
    onUpdatePageSize: (pageSize) => {
        pagination.pageSize = pageSize;
        pagination.page = 1; // 重置到第一页
        fetchStudents();
    }
});

// 表单数据
const formRef = ref(null);
const formData = reactive({
    username: '',
    role: 0,
    nickname: '',
    email: '',
    gender: 0,
    birthdate: null
});

// 编辑表单数据
const editFormRef = ref(null);
const editFormData = reactive({
    id: null,
    username: '',
    nickname: '',
    email: '',
    gender: 0,
    birthdate: null
});

// 表单验证规则
const rules = {
    username: {
        required: true,
        message: '请输入姓名',
        trigger: 'blur'
    },
    email: {
        required: true,
        message: '请输入学号',
        trigger: 'blur'
    },
    birthdate: {
        required: true,
        validator: (rule, value) => {
            if (value === null || value === undefined || value === '') {
                return new Error('请选择生日');
            }
            return true;
        },
        trigger: 'change'
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
    remove: async (row) => {
        try {
            const res = await studentApi.deleteStudent(row.id);

            if (res.code === 200) {
                message.success(res.data || '用户已删除');
                // 重新获取用户列表
                fetchStudents();
            } else {
                message.error(res.message || '删除用户失败');
            }
        } catch (error) {
            console.error('删除用户失败:', error);
            message.error('删除用户失败: ' + (error.message || '未知错误'));
        }
    }
});

// 添加用户
const addUser = () => {
    // 处理日期格式，确保birthdate是字符串格式
    if (typeof formData.birthdate === 'number') {
        // 如果是时间戳，转换为YYYY-MM-DD格式的字符串
        const date = new Date(formData.birthdate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formData.birthdate = `${year}-${month}-${day}`;
    }
    console.log('新增用户:', formData);
    formRef.value?.validate(async (errors) => {
        if (!errors) {
            try {
                const newUser = {
                    username: formData.username,
                    role: formData.role,
                    nickname: formData.nickname,
                    email: formData.email,
                    gender: formData.gender,
                    birthdate: formData.birthdate
                };

                const res = await studentApi.addStudent(newUser);

                if (res.code === 200) {
                    message.success(res.data || '用户添加成功');
                    showAddUserModal.value = false;

                    // 重新获取用户列表
                    fetchStudents();

                    // 重置表单
                    formData.username = '';
                    formData.role = 0;
                    formData.nickname = '';
                    formData.password = '';
                    formData.confirmPassword = '';
                    formData.email = '';
                    formData.gender = 0;
                    formData.birthdate = null;
                } else {
                    message.error(res.message || '用户添加失败');
                }
            } catch (error) {
                console.error('添加用户失败:', error);
                message.error('添加用户失败: ' + (error.message || '未知错误'));
            }
        } else {
            message.error('请完善表单信息');
        }
    });
};

// 更新用户
const updateUser = () => {
    console.log('更新用户:', editFormData);
    // 处理日期格式，确保birthdate是字符串格式
    if (typeof editFormData.birthdate === 'number') {
        // 如果是时间戳，转换为YYYY-MM-DD格式的字符串
        const date = new Date(editFormData.birthdate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        editFormData.birthdate = `${year}-${month}-${day}`;
    }

    editFormRef.value?.validate(async (errors) => {
        if (!errors) {
            try {
                const updatedUser = {
                    id: editFormData.id,
                    username: editFormData.username,
                    nickname: editFormData.nickname,
                    email: editFormData.email,
                    gender: editFormData.gender,
                    birthdate: editFormData.birthdate
                };

                const res = await studentApi.updateStudent(updatedUser);

                if (res.code === 200) {
                    message.success(res.data || '用户信息更新成功');
                    showEditUserModal.value = false;

                    // 重新获取用户列表
                    fetchStudents();
                } else {
                    message.error(res.message || '用户信息更新失败');
                }
            } catch (error) {
                console.error('更新用户失败:', error);
                message.error('更新用户失败: ' + (error.message || '未知错误'));
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