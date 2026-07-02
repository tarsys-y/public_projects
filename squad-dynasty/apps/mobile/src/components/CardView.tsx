import { StyleSheet, Text, View } from 'react-native';
import type { BasePlayer, CardDefinition } from '@squad-dynasty/engine';
import { colors, rarityColors, versionLabel } from '../constants/theme';
import { clubById } from '../services/catalog';
import { ClubCrest } from './ClubCrest';
import { PlayerAvatar } from './PlayerAvatar';

interface Props {
  card: CardDefinition;
  player: BasePlayer;
  overall: number;
  size?: 'sm' | 'md';
  badge?: string; // ex: "x2" para duplicatas
}

export function CardView({ card, player, overall, size = 'md', badge }: Props) {
  const rarity = rarityColors[card.rarity];
  const club = clubById.get(player.clubId);
  const small = size === 'sm';
  const version = versionLabel[card.version];

  return (
    <View
      style={[
        styles.frame,
        small ? styles.frameSm : styles.frameMd,
        { borderColor: rarity.frame, shadowColor: rarity.glow },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.overall, { color: rarity.frame }]}>{overall}</Text>
        <Text style={styles.position}>{player.positions[0]}</Text>
      </View>
      <View style={styles.avatarWrap}>
        <PlayerAvatar
          playerId={player.id}
          clubId={player.clubId}
          isIcon={card.version === 'icon'}
          size={small ? 44 : 56}
        />
      </View>
      <Text numberOfLines={1} style={[styles.name, small && styles.nameSm]}>
        {player.name}
      </Text>
      <View style={styles.footer}>
        <View style={styles.clubRow}>
          <ClubCrest clubId={player.clubId} size={small ? 14 : 16} />
          <Text style={styles.club}>{club?.shortName ?? '—'}</Text>
        </View>
        <Text style={styles.nation}>{player.nationality}</Text>
      </View>
      {version ? (
        <Text style={[styles.version, { color: rarity.frame }]} numberOfLines={1}>
          {card.label ?? version}
        </Text>
      ) : null}
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.bgCard,
    borderWidth: 2,
    borderRadius: 10,
    padding: 8,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  frameMd: { width: 104, minHeight: 172 },
  frameSm: { width: 84, minHeight: 142 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  avatarWrap: { alignItems: 'center', marginTop: 2 },
  overall: { fontSize: 24, fontWeight: '900' },
  position: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  name: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 4 },
  nameSm: { fontSize: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  club: { color: colors.textDim, fontSize: 10, fontWeight: '600' },
  nation: { color: colors.textDim, fontSize: 10 },
  version: { fontSize: 9, fontWeight: '800', marginTop: 2, textTransform: 'uppercase' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.accent,
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
