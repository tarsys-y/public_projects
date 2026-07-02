// Loja de pacotes (SPEC tela 5): compra, abertura com suspense por raridade
// (brilho/cor antes de revelar) e contador de pity visível.
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FlipInYRight } from 'react-native-reanimated';
import { CONFIG, type CardDefinition, type Rarity } from '@squad-dynasty/engine';
import { CardView } from '../components/CardView';
import { colors, rarityColors, rarityLabel } from '../constants/theme';
import { cardOverall, playerById } from '../services/catalog';
import { useEconomyStore } from '../stores/economyStore';
import { usePacksStore, type OpeningResult } from '../stores/packsStore';

const RARITY_RANK: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'icon'];
const bestRarity = (cards: CardDefinition[]): Rarity =>
  cards.reduce<Rarity>(
    (best, c) => (RARITY_RANK.indexOf(c.rarity) > RARITY_RANK.indexOf(best) ? c.rarity : best),
    'common',
  );

export default function ShopScreen() {
  const { coins, gems } = useEconomyStore();
  const { pity, totalOpened, buyAndOpen } = usePacksStore();
  const [opening, setOpening] = useState<OpeningResult | null>(null);
  const [revealed, setRevealed] = useState(0); // quantas cartas já viradas

  const packTypes = useMemo(
    () =>
      (Object.keys(CONFIG.packs.types) as Array<keyof typeof CONFIG.packs.types>).map((type) => ({
        type,
        spec: CONFIG.packs.types[type],
      })),
    [],
  );

  const open = (type: keyof typeof CONFIG.packs.types) => {
    const result = buyAndOpen(type);
    if (result) {
      setOpening(result);
      setRevealed(0);
    }
  };

  const suspenseColor = opening ? rarityColors[bestRarity(opening.cards)].frame : colors.border;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.wallet}>
        <Text style={styles.walletText}>🪙 {coins.toLocaleString('pt-BR')}</Text>
        <Text style={styles.walletText}>💎 {gems}</Text>
      </View>

      {packTypes.map(({ type, spec }) => (
        <View key={type} style={styles.pack}>
          <View style={{ flex: 1 }}>
            <Text style={styles.packName}>
              {type === 'basic' ? 'Pacote Básico' : 'Pacote Premium'}
            </Text>
            <Text style={styles.packMeta}>
              {spec.cards} cartas · garante {rarityLabel[spec.guaranteedRarity as Rarity]}+
            </Text>
          </View>
          <Pressable style={styles.buyButton} onPress={() => open(type)}>
            <Text style={styles.buyText}>
              {spec.costCoins > 0 ? `🪙 ${spec.costCoins.toLocaleString('pt-BR')}` : `💎 ${spec.costGems}`}
            </Text>
          </Pressable>
        </View>
      ))}

      {/* Pity visível (SPEC 4.5) */}
      <View style={styles.pityBox}>
        <Text style={styles.pityTitle}>Garantias (pity)</Text>
        <Text style={styles.pityLine}>
          Lendária garantida em {CONFIG.packs.legendaryPity - pity.sinceLegendary} pacote(s) —{' '}
          {pity.sinceLegendary}/{CONFIG.packs.legendaryPity}
        </Text>
        <Text style={styles.pityLine}>
          Ícone garantido em {CONFIG.packs.iconPity - pity.sinceIcon} pacote(s) — {pity.sinceIcon}/
          {CONFIG.packs.iconPity}
        </Text>
        <Text style={styles.pityMeta}>Pacotes abertos: {totalOpened}</Text>
      </View>

      {/* Abertura com suspense */}
      <Modal visible={opening !== null} transparent animationType="fade">
        <View style={[styles.openBackdrop, { borderColor: suspenseColor }]}>
          <Animated.View entering={FadeIn} style={[styles.glow, { shadowColor: suspenseColor, borderColor: suspenseColor }]}>
            <Text style={[styles.suspense, { color: suspenseColor }]}>
              {opening && revealed < opening.cards.length ? 'Toque para revelar…' : 'Pacote aberto!'}
            </Text>
          </Animated.View>
          <Pressable
            style={styles.cardsArea}
            onPress={() => opening && setRevealed((r) => Math.min(r + 1, opening.cards.length))}
          >
            <View style={styles.cardsRow}>
              {opening?.cards.map((card, i) => {
                const player = playerById.get(card.basePlayerId);
                if (!player) return null;
                return i < revealed ? (
                  <Animated.View key={`${card.id}-${i}`} entering={FlipInYRight.duration(400)}>
                    <CardView card={card} player={player} overall={cardOverall(card)} size="sm" />
                  </Animated.View>
                ) : (
                  <View key={`${card.id}-${i}`} style={[styles.cardBack, { borderColor: suspenseColor }]}>
                    <Text style={{ color: suspenseColor, fontSize: 22 }}>?</Text>
                  </View>
                );
              })}
            </View>
          </Pressable>
          {opening?.pityTriggered ? (
            <Text style={styles.pityTriggered}>
              ✨ Garantia ativada: {opening.pityTriggered === 'icon' ? 'Ícone' : 'Lendária'}!
            </Text>
          ) : null}
          {opening && revealed >= opening.cards.length ? (
            <Pressable style={styles.closeButton} onPress={() => setOpening(null)}>
              <Text style={styles.buyText}>Continuar</Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  wallet: { flexDirection: 'row', gap: 16, justifyContent: 'flex-end' },
  walletText: { color: colors.text, fontWeight: '900', fontSize: 16 },
  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  packName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  packMeta: { color: colors.textDim, fontSize: 12 },
  buyButton: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  buyText: { color: '#fff', fontWeight: '800' },
  pityBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pityTitle: { color: colors.text, fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
  pityLine: { color: colors.textDim, fontSize: 12 },
  pityMeta: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  openBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,6,10,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 20,
  },
  glow: {
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 22,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  suspense: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  cardsArea: { minHeight: 140 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  cardBack: {
    width: 84,
    minHeight: 100,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pityTriggered: { color: colors.warning, fontWeight: '900', fontSize: 14 },
  closeButton: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28 },
});
