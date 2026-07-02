// Loja de pacotes (SPEC tela 5): compra, abertura cinematográfica (PackOpening)
// e contador de pity visível.
import { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CONFIG, type Rarity } from '@squad-dynasty/engine';
import { PackOpening } from '../components/PackOpening';
import type { PackArt } from '../components/PackArtwork';
import { colors, rarityLabel } from '../constants/theme';
import { useEconomyStore } from '../stores/economyStore';
import { useEventsStore } from '../stores/eventsStore';
import { usePacksStore, type OpeningResult } from '../stores/packsStore';

export default function ShopScreen() {
  const { coins, gems } = useEconomyStore();
  const { pity, totalOpened, buyAndOpen } = usePacksStore();
  const events = useEventsStore();
  const event = events.currentEvent();
  const [opening, setOpening] = useState<{ result: OpeningResult; art: PackArt } | null>(null);

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
    if (result) setOpening({ result, art: type === 'basic' ? 'basic' : 'premium' });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.wallet}>
        <Text style={styles.walletText}>🪙 {coins.toLocaleString('pt-BR')}</Text>
        <Text style={styles.walletText}>💎 {gems}</Text>
      </View>

      {/* Pacote do evento da semana */}
      <View style={[styles.pack, styles.eventPack]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.packName}>
            {event.emoji} {event.name}
          </Text>
          <Text style={styles.packMeta}>
            {event.pack.cards} cartas do tema · garante {rarityLabel[event.pack.guaranteedRarity as Rarity]}+ ·
            odds épicas ×{event.pack.epicPlusBoost} · inclui os “Em Alta” da rodada
          </Text>
        </View>
        <Pressable
          style={styles.buyButton}
          onPress={() => {
            const result = events.buyEventPack();
            if (result) setOpening({ result, art: 'event' });
          }}
        >
          <Text style={styles.buyText}>
            {event.pack.costCoins > 0
              ? `🪙 ${event.pack.costCoins.toLocaleString('pt-BR')}`
              : `💎 ${event.pack.costGems}`}
          </Text>
        </Pressable>
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

      <Link href="/sbc" style={styles.sbcLink}>
        <Text style={styles.sbcLinkText}>
          🧩 Desafios de Montagem — troque cartas paradas por pacotes e prêmios →
        </Text>
      </Link>

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

      {/* Abertura cinematográfica */}
      {opening ? (
        <PackOpening
          result={opening.result}
          packArt={opening.art}
          eventEmoji={opening.art === 'event' ? event.emoji : undefined}
          onClose={() => setOpening(null)}
        />
      ) : null}
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
  eventPack: { borderColor: '#2e4a6b', backgroundColor: '#1d2a3a' },
  sbcLink: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sbcLinkText: { color: colors.text, fontWeight: '700', fontSize: 13 },
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
});
