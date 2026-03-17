<template>
  <div class="join">
    <h2>{{ t('join.title') }}</h2>

    <div class="card">
      <input
        v-model="code"
        :placeholder="t('join.placeholder')"
        maxlength="6"
        class="code-input"
        @input="code = code.toUpperCase()"
      />
    </div>

    <p v-if="error" class="error">{{ t('join.notFound') }}</p>

    <button @click="joinRoom" :disabled="code.length < 6">
      {{ t('join.button') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const code = ref('');
const error = ref(false);

onMounted(() => {
  if (route.query.code) {
    code.value = (route.query.code as string).toUpperCase();
    joinRoom();
  }
});

async function joinRoom() {
  error.value = false;
  try {
    const res = await fetch(`/api/rooms/${code.value}`);
    if (res.ok) {
      router.push(`/room/${code.value}`);
    } else {
      error.value = true;
    }
  } catch {
    error.value = true;
  }
}
</script>

<style scoped>
.join {
  padding-top: 20px;
}

h2 {
  text-align: center;
  margin-bottom: 20px;
}

.code-input {
  width: 100%;
  padding: 16px;
  font-size: 24px;
  text-align: center;
  letter-spacing: 8px;
  font-weight: 700;
  background: transparent;
  border: 2px solid var(--hint-color, #333);
  border-radius: 12px;
  color: var(--text-color, #fff);
  outline: none;
  text-transform: uppercase;
}

.code-input:focus {
  border-color: var(--button-color, #5865f2);
}

.error {
  color: #e74c3c;
  text-align: center;
  margin-top: 8px;
}

button {
  margin-top: 20px;
}
</style>
