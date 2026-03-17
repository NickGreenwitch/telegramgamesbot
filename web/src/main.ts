import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createI18n } from 'vue-i18n';
import App from './App.vue';
import { ru } from './i18n/ru';
import { en } from './i18n/en';

// Router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/Home.vue') },
    { path: '/create', component: () => import('./views/CreateRoom.vue') },
    { path: '/join', component: () => import('./views/JoinRoom.vue') },
    { path: '/room/:code', component: () => import('./views/GameRoom.vue') },
  ],
});

// i18n
const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
const locale = tgLang === 'ru' ? 'ru' : 'en';

const i18n = createI18n({
  legacy: false,
  locale,
  fallbackLocale: 'en',
  messages: { ru, en },
});

// Init Telegram WebApp
window.Telegram?.WebApp?.ready();
window.Telegram?.WebApp?.expand();

// Create app
const app = createApp(App);
app.use(router);
app.use(i18n);
app.mount('#app');
