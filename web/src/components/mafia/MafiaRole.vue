<template>
  <Transition name="fade">
    <div v-if="show" class="role-overlay" @click="$emit('dismiss')">
      <div class="role-card" @click.stop>
        <div class="role-emoji">{{ roleEmoji }}</div>
        <h2 class="role-name">{{ t(`mafia.roles.${role}`) }}</h2>
        <p class="role-desc">{{ roleDescription }}</p>
        <div class="role-team" :class="teamClass">{{ teamLabel }}</div>
        <button class="dismiss-btn" @click="$emit('dismiss')">
          {{ t('mafia.yourRole') }} — OK
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MafiaRole } from '@party-games/shared';

const props = defineProps<{
  role: MafiaRole;
  show: boolean;
}>();

defineEmits<{
  dismiss: [];
}>();

const { t, locale } = useI18n();

const roleEmoji = computed(() => {
  const emojis: Record<string, string> = {
    citizen: '👤',
    mafia: '🔫',
    don: '🎩',
    detective: '🔍',
    doctor: '💊',
    maniac: '🔪',
    prostitute: '💋',
    bodyguard: '🛡️',
    barman: '🍸',
  };
  return emojis[props.role] || '❓';
});

const teamClass = computed(() => {
  if (props.role === 'mafia' || props.role === 'don') return 'team-mafia';
  if (props.role === 'maniac') return 'team-maniac';
  return 'team-citizen';
});

const teamLabel = computed(() => {
  if (props.role === 'mafia' || props.role === 'don') {
    return locale.value === 'ru' ? '🔴 Команда мафии' : '🔴 Mafia Team';
  }
  if (props.role === 'maniac') {
    return locale.value === 'ru' ? '🟣 Одиночка' : '🟣 Solo';
  }
  return locale.value === 'ru' ? '🔵 Мирные жители' : '🔵 Citizens';
});

const roleDescription = computed(() => {
  const desc: Record<string, Record<string, string>> = {
    ru: {
      citizen: 'Вы мирный житель. Находите мафию днём и голосуйте за них!',
      mafia: 'Вы мафия. Ночью убивайте мирных. Днём прикидывайтесь невинным.',
      don: 'Вы Дон мафии. Лидер команды. Ночью можете проверить, комиссар ли игрок.',
      detective: 'Вы комиссар. Ночью проверяйте игроков — мафия они или нет.',
      doctor: 'Вы доктор. Ночью лечите одного игрока (нельзя одного и того же дважды подряд).',
      maniac: 'Вы маньяк. Убиваете в одиночку. Побеждаете, если останетесь с одним игроком.',
      prostitute: 'Вы путана. Ночью блокируете способность выбранного игрока.',
      bodyguard: 'Вы телохранитель. Защищаете игрока — если его атакуют, погибаете вместо него.',
      barman: 'Вы бармен. Ночью блокируете способность выбранного игрока.',
    },
    en: {
      citizen: "You're a citizen. Find the mafia during the day and vote them out!",
      mafia: "You're mafia. Kill citizens at night. Pretend to be innocent by day.",
      don: "You're the Don. Lead the mafia. At night you can check if a player is the Detective.",
      detective: "You're the Detective. Check players at night — are they mafia or not?",
      doctor: "You're the Doctor. Heal one player each night (can't heal the same one twice in a row).",
      maniac: "You're the Maniac. You kill solo. Win by being the last one standing with one player.",
      prostitute: "You're the Courtesan. Block a player's ability at night.",
      bodyguard: "You're the Bodyguard. Protect a player — if they're attacked, you die instead.",
      barman: "You're the Barman. Block a player's ability at night.",
    },
  };
  const lang = locale.value === 'ru' ? 'ru' : 'en';
  return desc[lang][props.role] || '';
});
</script>

<style scoped>
.role-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.role-card {
  background: var(--secondary-bg, #16213e);
  border-radius: 24px;
  padding: 32px 24px;
  text-align: center;
  max-width: 340px;
  width: 100%;
  animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scaleIn {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.role-emoji {
  font-size: 64px;
  margin-bottom: 12px;
}

.role-name {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
}

.role-desc {
  font-size: 14px;
  color: var(--hint-color, #999);
  line-height: 1.5;
  margin-bottom: 16px;
}

.role-team {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 20px;
}

.team-mafia {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

.team-citizen {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
}

.team-maniac {
  background: rgba(142, 68, 173, 0.2);
  color: #8e44ad;
}

.dismiss-btn {
  margin-top: 8px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
