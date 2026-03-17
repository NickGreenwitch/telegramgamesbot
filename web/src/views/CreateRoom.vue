<template>
  <div class="create">
    <h2>{{ t('create.title') }}</h2>
    
    <div class="card">
      <div class="game-info">
        <span class="game-icon">{{ game === 'mafia' ? '🔫' : '🐉' }}</span>
        <span class="game-name">{{ game === 'mafia' ? t('create.mafia') : t('create.dnd') }}</span>
      </div>
    </div>

    <button @click="createRoom" :disabled="loading">
      {{ loading ? t('create.creating') : t('create.title') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTelegram } from '@/composables/useTelegram';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { telegramId, userName } = useTelegram();

const game = (route.query.game as string) || 'mafia';
const loading = ref(false);

async function createRoom() {
  loading.value = true;
  try {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game,
        hostTelegramId: telegramId.value,
        hostName: userName.value,
      }),
    });
    const data = await res.json();
    router.push(`/room/${data.code}`);
  } catch (err) {
    console.error('Failed to create room:', err);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.create {
  padding-top: 20px;
}

h2 {
  text-align: center;
  margin-bottom: 20px;
}

.game-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.game-icon {
  font-size: 32px;
}

.game-name {
  font-size: 20px;
  font-weight: 600;
}

button {
  margin-top: 20px;
}
</style>
