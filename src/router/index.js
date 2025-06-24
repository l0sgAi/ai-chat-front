import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
  },
  // {
  //   path: "/register",
  //   name: "Register",
  //   component: () => import("../views/Register.vue"),
  // },
  {
    path: "/chat",
    name: "Chat",
    component: () => import("../views/Chat.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: () => import("../views/Dashboard.vue"),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: "",
        name: "DashboardHome",
        component: () => import("../views/dashboard/DashboardHome.vue"),
      },
      {
        path: "user-info",
        name: "UserInfo",
        component: () => import("../views/dashboard/UserInfo.vue"),
      },
      {
        path: "question-bank",
        name: "QuestionBank",
        component: () => import("../views/dashboard/QuestionBank.vue"),
      },
      {
        path: "online-exam",
        name: "OnlineExam",
        component: () => import("../views/dashboard/OnlineExam.vue"),
      },
      {
        path: "data-analysis",
        name: "DataAnalysis",
        component: () => import("../views/dashboard/DataAnalysis.vue"),
      },
    ],
  },
  {
    path: "/student",
    name: "StudentDashboard",
    component: () => import("../views/student/StudentDashboard.vue"),
    meta: { requiresAuth: true, requiresStudent: true },
    children: [
      {
        path: "",
        redirect: "/student/exam-list",
      },
      {
        path: "exam-list",
        name: "ExamList",
        component: () => import("../views/student/ExamList.vue"),
      },
      {
        path: "history-exams",
        name: "HistoryExams",
        component: () => import("../views/student/HistoryExams.vue"),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫，检查是否已登录以及用户角色
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const username = localStorage.getItem("username");

  // 检查是否需要登录
  if (to.meta.requiresAuth && !isLoggedIn) {
    next("/login");
    return;
  }
  
  // 检查是否需要管理员权限
  if (to.meta.requiresAdmin && username !== 'admin') {
    next("/student");
    return;
  }

  // 检查是否需要学生权限
  if (to.meta.requiresStudent && username === 'admin') {
    next("/dashboard");
    return;
  }
  
  next();
});

export default router;
