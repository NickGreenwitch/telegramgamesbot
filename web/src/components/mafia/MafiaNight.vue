<template>
  <div class="night-phase">
    <div class="night-header">
      <div class="moon">🌙</div>
      <h2>{{ t('mafia.night') }} {{ day }}</h2>
      <PhaseTimer :duration-ms="30000" />
    </div>

    <!-- Dead player: just watch -->
    <div v-if="!isAlive" class="spectator card">
      <p>{{ locale === 'ru' ? '💀 Вы выбыли. Наблюдайте.' : '💀 You are eliminated. Watch.' }}</p>
    </div>

    <!-- Citizen: nothing to do -->
    <div v-else-if="myRole === 'citizen'" class="card">
      <p class="sleep-text">
        {{ locale === 'ru' ? '😴 Город засыпает...' : '😴 The city falls asleep...' }}
      </p>
    </div>

    <!-- Active role: choose target -->
    <div v-else class="card">
      <div class="role-badge">
        <span>{{ roleEmoji }} {{ t(`mafia.roles.${myRole}`) }}</span>
      </div>

      <!-- Detective check result -->
      <div v-if="detectiveResult" class="check-result" :class="detectiveResult.isMafia ? 'is-mafia' : 'is-clean'">
        <p>
          {{ getPlayerName(detectiveResult.targetId) }}:
          {{ detectiveResult.isMafia
            ? (locale === 'ru' ? '🔴 Мафия!' : '🔴 Mafia!')
            : (locale === 'ru' ? '🟢 Не мафия' : '🟢 Not mafia')
          }}
        </p>
      </div>

      <PlayerSelect
        v-if="!nightActionSent"
        :players="targets"
        :prompt="nightPrompt"
        @select="onSelect"
      />

      <div v-else class="action-sent">
        <p>{{ locale === 'ru' ? '✅ Действие выбрано. Ждём рассвета...' : '✅ Action chosen. Waiting for dawn...' }}</p>
      </div>
    </div>

    <!-- Night kills announcement -->
    <div v-if="eliminatedPlayer" class="card elimination">
      <p>
        {{ locale === 'ru' ? '☠️ Этой ночью погиб:' : '☠️ Killed tonight:' }}
        <strong>{{ getPlayerName(eliminatedPlayer) }}</strong>
        <span v-if="eliminatedRole"> ({{ t(`mafia.roles.${eliminatedRole}`) }})</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMafia } from '@/composables/useMafia';
import PhaseTimer from './PhaseTimer.vue';
import PlayerSelect from './PlayerSelect.vue';

const { t, locale } = useI18n();
const {
  myRole,
  day,
  isAlive,
  otherAlivePlayers,
  nightActionSent,
  eliminatedPlayer,
  eliminatedRole,
  isMafiaTeam,
  detectiveCheckResult,
  sendNightAction,
  getPlayerName,
} = useMafia();

const detectiveResult = computed(() => detectiveCheckResult.value);

const roleEmoji = computed(() => {
  const emojis: Record<string, string> = {
    mafia: '🔫', don: '🎩', detective: '🔍', doctor: '💊',
    maniac: '🔪', prostitute: '💋', bodyguard: '🛡️', barman: '🍸',
  };
  return emojis[myRole.value || ''] || '❓';
});

const targets = computed(() => {
  // Mafia can't target own team
  if (isMafiaTeam.value) {
    return otherAlivePlayers.value.filter((p) => {
      // We don't know other players' roles on the client side
      // Mafia team sees each other — but for targeting, they pick non-mafia
      // Server-side will handle it; client just shows all other alive players
      return true;
    });
  }
  return otherAlivePlayers.value;
});

const nightPrompt = computed(() => {
  const prompts: Record<string, Record<string, string>> = {
    ru: {
      mafia: '🔫 Кого убить?',
      don: '🎩 Кого проверить?',
      detective: '🔍 Кого проверить?',
      doctor: '💊 Кого вылечить?',
      maniac: '🔪 Кого убить?',
      prostitute: '💋 К кому пойти?',
      bodyguard: '🛡️ Кого защитить?',
      barman: '🍸 Кому налить?',
    },
    en: {
      mafia: '🔫 Who to kill?',
      don: '🎩 Who to check?',
      detective: '🔍 Who to investigate?',
      doctor: '💊 Who to heal?',
      maniac: '🔪 Who to kill?',
      prostitute: '💋 Who to visit?',
      bodyguard: '🛡️ Who to protect?',
      barman: '🍸 Who to serve?',
    },
  };
  const lang = locale.value === 'ru' ? 'ru' : 'en';
  return prompts[lang][myRole.value || ''] || t('mafia.chooseTarget');
});

function onSelect(playerId: string) {
  sendNightAction(playerId);
}
</script>

<style scoped>
.night-phase {
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.night-header {
  text-align: center;
  margin-bottom: 16px;
}

.moon {
  font-size: 48px;
  margin-bottom: 4px;
}

h2 {
  margin-bottom: 12px;
}

.spectator {
  text-align: center;
  opacity: 0.7;
}

.sleep-text {
  text-align: center;
  font-size: 18px;
  padding: 20px 0;
}

.role-badge {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.check-result {
  text-align: center;
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 12px;
  font-weight: 600;
}

.is-mafia {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

.is-clean {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
}

.action-sent {
  text-align: center;
  padding: 20px 0;
  color: var(--hint-color, #999);
}

.elimination {
  text-align: center;
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
}
</style>
