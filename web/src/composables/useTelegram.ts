import { computed } from 'vue';

export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  const user = computed(() => tg?.initDataUnsafe?.user);

  const telegramId = computed(() => user.value?.id || 0);
  const userName = computed(() => {
    if (!user.value) return 'Guest';
    return user.value.first_name + (user.value.last_name ? ` ${user.value.last_name}` : '');
  });
  const locale = computed(() => user.value?.language_code === 'ru' ? 'ru' : 'en');

  function close() {
    tg?.close();
  }

  return { tg, user, telegramId, userName, locale, close };
}
