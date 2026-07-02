// Som + haptics do jogo (M8). Efeitos WAV sintetizados em assets/sounds
// (gerados por packages/data/scripts/generate-sounds.ts — substituíveis).
// Toggle de mudo persistido. Nunca lança: som é enfeite, não pode quebrar jogo.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

interface FeedbackSettings {
  soundOn: boolean;
  hapticsOn: boolean;
  toggleSound: () => void;
  toggleHaptics: () => void;
}

export const useFeedbackSettings = create<FeedbackSettings>()(
  persist(
    (set) => ({
      soundOn: true,
      hapticsOn: true,
      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      toggleHaptics: () => set((s) => ({ hapticsOn: !s.hapticsOn })),
    }),
    { name: 'squad-dynasty/feedback', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

type SoundName = 'whistle' | 'goal' | 'card-flip' | 'rare-reveal' | 'victory';

const SOURCES: Record<SoundName, number> = {
  whistle: require('../../assets/sounds/whistle.wav'),
  goal: require('../../assets/sounds/goal.wav'),
  'card-flip': require('../../assets/sounds/card-flip.wav'),
  'rare-reveal': require('../../assets/sounds/rare-reveal.wav'),
  victory: require('../../assets/sounds/victory.wav'),
};

const players = new Map<SoundName, AudioPlayer>();

function play(name: SoundName): void {
  if (!useFeedbackSettings.getState().soundOn) return;
  try {
    let player = players.get(name);
    if (!player) {
      player = createAudioPlayer(SOURCES[name]);
      players.set(name, player);
    }
    player.seekTo(0);
    player.play();
  } catch {
    // sem áudio disponível (web sem interação, testes) — segue o jogo
  }
}

function haptic(kind: 'light' | 'medium' | 'heavy' | 'success' | 'warning'): void {
  if (!useFeedbackSettings.getState().hapticsOn) return;
  try {
    if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'warning') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else {
      const style =
        kind === 'light'
          ? Haptics.ImpactFeedbackStyle.Light
          : kind === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Heavy;
      void Haptics.impactAsync(style);
    }
  } catch {
    // dispositivos sem haptics
  }
}

export const feedback = {
  kickoff: () => {
    play('whistle');
    haptic('light');
  },
  goal: () => {
    play('goal');
    haptic('heavy');
  },
  fulltime: () => {
    play('whistle');
    haptic('medium');
  },
  victory: () => {
    play('victory');
    haptic('success');
  },
  cardFlip: () => {
    play('card-flip');
    haptic('light');
  },
  /** revelação de carta épica+ (sting + vibração forte). */
  rareReveal: () => {
    play('rare-reveal');
    haptic('heavy');
  },
  reward: () => {
    play('victory');
    haptic('success');
  },
};
