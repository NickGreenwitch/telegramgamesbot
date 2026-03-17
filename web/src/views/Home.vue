<template>
  <div class="home">
    <h1 class="title">🎮 {{ t('home.title') }}</h1>
    <p class="subtitle">{{ t('home.subtitle') }}</p>

    <div class="games">
      <button class="game-btn mafia" @click="goCreate('mafia')">
        {{ t('home.mafia') }}
      </button>
      <button class="game-btn dnd" @click="goCreate('dnd')">
        {{ t('home.dnd') }}
      </button>
    </div>

    <div class="divider">
      <span>{{ locale === 'ru' ? 'или' : 'or' }}</span>
    </div>

    <button class="join-btn" @click="$router.push('/join')">
      {{ t('home.joinByCode') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t, locale } = useI18n();
const router = useRouter();

function goCreate(game: string) {
  router.push(`/create?game=${game}`);
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 40px;
  gap: 16px;
}

.title {
  font-size: 28px;
  margin-bottom: 4px;
}

.subtitle {
  color: var(--hint-color, #999);
  font-size: 16px;
  margin-bottom: 20px;
}

.games {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.game-btn {
  padding: 20px;
  font-size: 18px;
  border-radius: 16px;
}

.game-btn.mafia {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.game-btn.dnd {
  background: linear-gradient(135deg, #8e44ad, #6c3483);
}

.divider {
  display: flex;
  align-items: center;
  width: 100%;
  margin: 8px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--hint-color, #333);
}

.divider span {
  padding: 0 16px;
  color: var(--hint-color, #999);
  font-size: 14px;
}

.join-btn {
  background: transparent;
  border: 2px solid var(--button-color, #5865f2);
  color: var(--button-color, #5865f2);
}
</style>
