<template>
  <div class="app" :style="themeStyles">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Perceived brightness (ITU-R BT.709)
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150;
}

const themeStyles = computed(() => {
  const tg = window.Telegram?.WebApp?.themeParams;
  if (!tg) return {};

  const secondaryBg = tg.secondary_bg_color || '#16213e';
  // If secondary bg is light but text color is also light, force dark text on cards
  const cardText = isLightColor(secondaryBg)
    ? (tg.text_color && !isLightColor(tg.text_color) ? tg.text_color : '#000000')
    : (tg.text_color || '#ffffff');

  return {
    '--bg-color': tg.bg_color || '#1a1a2e',
    '--text-color': tg.text_color || '#ffffff',
    '--hint-color': tg.hint_color || '#999999',
    '--button-color': tg.button_color || '#5865f2',
    '--button-text-color': tg.button_text_color || '#ffffff',
    '--secondary-bg': secondaryBg,
    '--card-text-color': cardText,
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
  color: var(--card-text-color, var(--text-color, #ffffff));
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 12px;
}
</style>
