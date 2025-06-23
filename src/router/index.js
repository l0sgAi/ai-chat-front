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
    meta: { requiresAuth: true },
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
        path: "grade-evaluation",
        name: "GradeEvaluation",
        component: () => import("../views/dashboard/GradeEvaluation.vue"),
      },
      {
        path: "data-analysis",
        name: "DataAnalysis",
        component: () => import("../views/dashboard/DataAnalysis.vue"),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 简单的路由守卫，检查是否已登录
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn");

  if (to.meta.requiresAuth && !isLoggedIn) {
    next("/login");
  } else {
    next();
  }
});

export default router;
