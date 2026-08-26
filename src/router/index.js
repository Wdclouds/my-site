import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/blog', name: 'blog', component: () => import('../views/blog/BlogHome.vue') },
  { path: '/blog/posts/:slug', name: 'blog-post', component: () => import('../views/blog/BlogPost.vue') },
  { path: '/music', name: 'music', component: () => import('../views/MusicView.vue') },
  { path: '/lab', name: 'lab', component: () => import('../views/LabView.vue') },
  { path: '/metal', name: 'metal', component: () => import('../views/status/UnderDevView.vue') }, // 待开发占位页预览
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  // 404 兜底
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
