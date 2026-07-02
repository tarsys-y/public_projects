// Abertura de pacotes cinematográfica (estilo Pokémon TCG Pocket):
// rasgar o pacote com o dedo → pilha de cartas → flip 3D uma a uma com
// build-up por tier (sem vazar a melhor raridade: backdrop sempre neutro)
// → resumo. As cartas já foram concedidas; aqui é só teatro.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import type { BasePlayer } from '@squad-dynasty/engine';
import { CardView } from './CardView';
import { CinematicReveal } from './CinematicReveal';
import { Confetti } from './Confetti';
import { PackArtwork, type PackArt } from './PackArtwork';
import { CARD_DIMENSIONS, cardTheme } from '../services/cardTheme';
import { buildRevealSequence, type RevealStep } from '../services/packSequence';
import { cardOverall, playerById } from '../services/catalog';
import { feedback } from '../services/feedback';
import type { OpeningResult } from '../stores/packsStore';
import { useCollectionStore } from '../stores/collectionStore';

interface Props {
  result: OpeningResult;
  packArt: PackArt;
  eventEmoji?: string;
  onClose: () => void;
}

type Phase = 'sealed' | 'revealing' | 'summary';

const PACK_WIDTH = 210;

export function PackOpening({ result, packArt, eventEmoji, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('sealed');

  const sequence = useMemo(() => {
    const owned = useCollectionStore.getState().ownedCards;
    const countByDef = (defId: string) =>
      Object.values(owned).filter((o) => o.cardDefId === defId).length;
    return buildRevealSequence(result, countByDef);
  }, [result]);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {phase === 'sealed' ? (
          <SealedPack
            packArt={packArt}
            eventEmoji={eventEmoji}
            onTorn={() => setPhase('revealing')}
          />
        ) : null}
        {phase === 'revealing' ? (
          <RevealStage steps={sequence.steps} onDone={() => setPhase('summary')} />
        ) : null}
        {phase === 'summary' ? (
          <Summary steps={sequence.steps} pity={result.pityTriggered} onClose={onClose} />
        ) : null}
      </View>
    </Modal>
  );
}

/* ---------- fase 1: pacote fechado + gesto de rasgar ---------- */

function SealedPack({
  packArt,
  eventEmoji,
  onTorn,
}: {
  packArt: PackArt;
  eventEmoji?: string;
  onTorn: () => void;
}) {
  const [tear, setTear] = useState(0); // 0..1 espelho do gesto p/ o SVG
  const [torn, setTorn] = useState(false);
  const floatY = useSharedValue(0);
  const lastHaptic = useRef(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(7, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(floatY);
  }, [floatY]);

  const updateTear = (progress: number) => {
    const p = Math.max(0, Math.min(1, progress));
    setTear((prev) => (Math.abs(p - prev) > 0.04 || p === 1 || p === 0 ? p : prev));
    const step = Math.floor(p * 5);
    if (step > lastHaptic.current) {
      lastHaptic.current = step;
      feedback.cardFlip();
    }
  };

  const finishTear = (progress: number) => {
    if (progress >= 0.85) {
      setTorn(true);
      setTear(1);
      feedback.packTear();
      setTimeout(onTorn, 450);
    } else {
      setTear(0);
      lastHaptic.current = 0;
    }
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      runOnJS(updateTear)(e.translationX / PACK_WIDTH);
    })
    .onEnd((e) => {
      runOnJS(finishTear)(e.translationX / PACK_WIDTH);
    });

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));

  return (
    <View style={styles.center}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={floatStyle}
          exiting={FadeOut.duration(300)}
          entering={ZoomIn.springify().damping(12)}
        >
          <Animated.View style={torn ? undefined : undefined}>
            <PackArtwork art={packArt} width={PACK_WIDTH} eventEmoji={eventEmoji} tearProgress={tear} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      <Text style={styles.hint}>
        {torn ? '…' : 'Arraste o dedo pela serrilha para rasgar →'}
      </Text>
    </View>
  );
}

/* ---------- fase 2: pilha + flip 3D carta a carta ---------- */

function RevealStage({ steps, onDone }: { steps: RevealStep[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const [burstKey, setBurstKey] = useState<string | null>(null);
  const rot = useSharedValue(0);
  const flash = useSharedValue(0);

  const step = steps[index];
  const player = step ? playerById.get(step.card.basePlayerId) : undefined;
  const theme = step ? cardTheme(step.card.version, step.card.rarity) : null;

  const flip = () => {
    if (!step || flipped) return;
    const tier = step.tier;
    const revealSound = () => {
      if (tier === 'normal') feedback.cardFlip();
      else if (tier === 'rare') feedback.cardFlip();
      else feedback.rareReveal();
      if (tier === 'big' || tier === 'cinematic') setBurstKey(`${step.card.id}-${index}`);
      if (tier !== 'normal') {
        flash.value = withSequence(
          withTiming(tier === 'cinematic' ? 0.9 : 0.5, { duration: 110 }),
          withTiming(0, { duration: 420 }),
        );
      }
    };
    const startFlip = () => {
      rot.value = withTiming(180, { duration: 460, easing: Easing.inOut(Easing.quad) });
      setTimeout(revealSound, 230);
      setTimeout(() => setFlipped(true), 460);
    };
    if (tier === 'cinematic') {
      // build-up: o verso pulsa em branco (não revela a cor) e abre a cinemática
      feedback.buildup();
      flash.value = withRepeat(withSequence(withTiming(0.35, { duration: 320 }), withTiming(0.05, { duration: 320 })), 2);
      setTimeout(() => setCinematic(true), 1300);
    } else {
      startFlip();
    }
  };

  const finishCinematic = () => {
    setCinematic(false);
    rot.value = 180;
    setBurstKey(`${step!.card.id}-${index}`);
    setFlipped(true);
  };

  const advance = () => {
    if (index + 1 >= steps.length) {
      onDone();
      return;
    }
    rot.value = 0;
    setFlipped(false);
    setBurstKey(null);
    setIndex(index + 1);
  };

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${rot.value}deg` }],
    opacity: rot.value < 90 ? 1 : 0,
  }));
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${rot.value - 180}deg` }],
    opacity: rot.value >= 90 ? 1 : 0,
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const invalid = !step || !player;
  useEffect(() => {
    if (invalid) onDone();
  }, [invalid, onDone]);
  if (invalid) return null;

  const md = CARD_DIMENSIONS.md;
  const scale = 1.35; // carta em destaque maior que md

  return (
    <Pressable style={styles.stage} onPress={() => (flipped ? advance() : flip())}>
      <Text style={styles.counter}>
        {Math.min(index + 1, steps.length)}/{steps.length}
      </Text>

      <View style={[styles.flipArea, { width: md.width * scale, height: md.height * scale }]}>
        {/* verso */}
        <Animated.View style={[styles.face, backStyle]}>
          <CardBack width={md.width * scale} height={md.height * scale} remaining={steps.length - index} />
        </Animated.View>
        {/* frente */}
        <Animated.View style={[styles.face, frontStyle]}>
          <View style={{ transform: [{ scale }] }}>
            <CardView
              card={step.card}
              player={player as BasePlayer}
              overall={cardOverall(step.card)}
              animateSheen
            />
          </View>
        </Animated.View>
      </View>

      {flipped ? (
        <Animated.View entering={FadeIn.duration(250)} style={styles.tagRow}>
          {step.isNew ? (
            <Text style={styles.newTag}>NOVA</Text>
          ) : (
            <Text style={styles.dupTag}>duplicata</Text>
          )}
          <Text style={styles.hint}>
            {index + 1 < steps.length ? 'Toque para a próxima' : 'Toque para o resumo'}
          </Text>
        </Animated.View>
      ) : (
        <Text style={styles.hint}>Toque para virar</Text>
      )}

      {burstKey && theme ? (
        <Confetti seed={burstKey} colors={[theme.glow, ...theme.frame.stops.map((s) => s.color)]} />
      ) : null}
      <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />

      {cinematic ? (
        <CinematicReveal
          card={step.card}
          player={player as BasePlayer}
          overall={cardOverall(step.card)}
          onDone={finishCinematic}
        />
      ) : null}
    </Pressable>
  );
}

/** Verso premium da carta (neutro — não denuncia raridade). */
function CardBack({ width, height, remaining }: { width: number; height: number; remaining: number }) {
  return (
    <View style={[styles.cardBack, { width, height }]}>
      <Svg width={width} height={height}>
        {Array.from({ length: 8 }, (_, i) => (
          <Circle
            key={i}
            cx={width / 2}
            cy={height / 2}
            r={(Math.min(width, height) / 2) * (0.28 + i * 0.14)}
            stroke="#31405c"
            strokeWidth={1}
            fill="none"
          />
        ))}
        <SvgText
          x={width / 2}
          y={height / 2 + 13}
          fontSize={36}
          fontWeight="bold"
          fill="#5b7db8"
          textAnchor="middle"
        >
          SD
        </SvgText>
      </Svg>
      {remaining > 1 ? <Text style={styles.remaining}>+{remaining - 1} na pilha</Text> : null}
    </View>
  );
}

/* ---------- fase 3: resumo ---------- */

function Summary({
  steps,
  pity,
  onClose,
}: {
  steps: RevealStep[];
  pity: OpeningResult['pityTriggered'];
  onClose: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.summary}>
      <Text style={styles.summaryTitle}>Pacote aberto!</Text>
      {pity ? (
        <Text style={styles.pity}>✨ Garantia ativada: {pity === 'icon' ? 'Ícone' : 'Lendária'}!</Text>
      ) : null}
      <ScrollView contentContainerStyle={styles.summaryGrid}>
        {steps.map((s, i) => {
          const player = playerById.get(s.card.basePlayerId);
          if (!player) return null;
          return (
            <View key={`${s.card.id}-${i}`}>
              <CardView card={s.card} player={player} overall={cardOverall(s.card)} badge={s.isNew ? 'NOVA' : undefined} />
            </View>
          );
        })}
      </ScrollView>
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeText}>Continuar</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,6,10,0.98)', // neutro SEMPRE — nada de cor de raridade
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', gap: 22 },
  hint: { color: '#8b949e', fontSize: 13, fontWeight: '600' },
  stage: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 18 },
  counter: { color: '#8b949e', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  flipArea: { alignItems: 'center', justifyContent: 'center' },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    borderRadius: 14,
    backgroundColor: '#141b2b',
    borderWidth: 2,
    borderColor: '#31405c',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  remaining: { position: 'absolute', bottom: 10, color: '#5b7db8', fontSize: 11, fontWeight: '700' },
  tagRow: { alignItems: 'center', gap: 6 },
  newTag: {
    color: '#fff',
    backgroundColor: '#2ea043',
    fontWeight: '900',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dupTag: { color: '#8b949e', fontWeight: '700', fontSize: 12 },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
  },
  summary: { flex: 1, alignSelf: 'stretch', padding: 20, paddingTop: 60, gap: 12, alignItems: 'center' },
  summaryTitle: { color: '#e6edf3', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  pity: { color: '#f0c14b', fontWeight: '900', fontSize: 14 },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  closeButton: {
    backgroundColor: '#2ea043',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  closeText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
