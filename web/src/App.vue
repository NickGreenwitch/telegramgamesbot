<template>
  <div class="app" :style="themeStyles">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const themeStyles = computed(() => {
  const tg = window.Telegram?.WebApp?.themeParams;
  if (!tg) return {};
  return {
    '--bg-color': tg.bg_color || '#1a1a2e',
    '--text-color': tg.text_color || '#ffffff',
    '--hint-color': tg.hint_color || '#999999',
    '--button-color': tg.button_color || '#5865f2',
    '--button-text-color': tg.button_text_color || '#ffffff',
    '--secondary-bg': tg.secondary_bg_color || '#16213e',
  };
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-color, #1a1a2e);
  color: var(--text-color, #ffffff);
  min-height: 100vh;
}

.app {
  max-width: 100%;
  min-height: 100vh;
  padding: 16px;
}

button {
  border: none;
  border-radius: 12px;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  background: var(--button-color, #5865f2);
  color: var(--button-text-color, #ffffff);
  width: 100%;
  transition: opacity 0.2s;
}

button:active {
  opacity: 0.8;
}

.card {
  background: var(--secondary-bg, #16213e);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 12px;
}
</style>
