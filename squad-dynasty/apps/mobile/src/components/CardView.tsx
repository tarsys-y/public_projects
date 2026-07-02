// Carta premium estilo Ultimate Team: fundo com gradiente/textura/moldura
// (CardBackground por tema), coluna FUT (overall/posição/escudo/bandeira),
// avatar cartunesco, painel de nome com filetes e etiqueta da versão.
// Sweep foil animado é opt-in (nunca em listas).
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BasePlayer, CardDefinition } from '@squad-dynasty/engine';
import { versionLabel } from '../constants/theme';
import { CARD_DIMENSIONS, cardTheme, type CardSize } from '../services/cardTheme';
import { flagEmoji } from '../services/flags';
import { clubById } from '../services/catalog';
import { CardBackground } from './CardBackground';
import { ClubCrest } from './ClubCrest';
import { FoilSweep } from './FoilSweep';
import { PlayerAvatar } from './PlayerAvatar';

interface Props {
  card: CardDefinition;
  player: BasePlayer;
  overall: number;
  size?: CardSize;
  badge?: string; // ex: "x2" para duplicatas
  animateSheen?: boolean; // sweep foil — ligar só fora de listas
}

export const CardView = memo(function CardView({
  card,
  player,
  overall,
  size = 'md',
  badge,
  animateSheen = false,
}: Props) {
  const theme = cardTheme(card.version, card.rarity);
  const { width, height, scale } = CARD_DIMENSIONS[size];
  const club = clubById.get(player.clubId);
  const version = card.label ?? versionLabel[card.version];
  const flag = flagEmoji(player.nationality);

  return (
    <View style={[styles.frame, { width, height, shadowColor: theme.glow }]}>
      <CardBackground theme={theme} width={width} height={height} />

      <View style={[styles.body, { padding: 8 * scale }]}>
        <View style={styles.top}>
          {/* coluna FUT: overall / posição / escudo / bandeira */}
          <View style={[styles.column, { gap: 2 * scale }]}>
            <Text style={[styles.overall, { fontSize: 25 * scale, color: theme.text.overall }]}>
              {overall}
            </Text>
            <Text style={[styles.position, { fontSize: 10 * scale, color: theme.text.secondary }]}>
              {player.positions[0]}
            </Text>
            <View style={[styles.columnRule, { backgroundColor: theme.frame.innerLine, width: 14 * scale }]} />
            <ClubCrest clubId={player.clubId} size={19 * scale} />
            {flag ? <Text style={{ fontSize: 12 * scale }}>{flag}</Text> : null}
          </View>
          <View style={styles.avatarArea}>
            <PlayerAvatar
              playerId={player.id}
              clubId={player.clubId}
              isIcon={card.version === 'icon'}
              size={76 * scale}
            />
          </View>
        </View>

        {/* painel do nome com filetes (assinatura FUT) */}
        <View
          style={[
            styles.namePanel,
            {
              borderColor: theme.frame.innerLine,
              backgroundColor: theme.text.panel,
              paddingVertical: 2.5 * scale,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.name, { fontSize: 11.5 * scale, color: theme.text.primary }]}
          >
            {player.name}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text
            numberOfLines={1}
            style={[styles.club, { fontSize: 8.5 * scale, color: theme.text.secondary }]}
          >
            {club?.shortName ?? '—'}
          </Text>
          {card.version === 'inform' ? (
            <View style={[styles.informPill, { paddingHorizontal: 5 * scale }]}>
              <Text style={[styles.informText, { fontSize: 7.5 * scale }]}>EM ALTA</Text>
            </View>
          ) : version ? (
            <Text
              numberOfLines={1}
              style={[styles.version, { fontSize: 8 * scale, color: theme.text.overall }]}
            >
              {version}
            </Text>
          ) : null}
        </View>
      </View>

      {animateSheen && theme.animatedSheen ? <FoilSweep width={width} height={height} /> : null}
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    borderRadius: 12,
    shadowOpacity: 0.55,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  body: { flex: 1 },
  top: { flex: 1, flexDirection: 'row' },
  column: { alignItems: 'center', paddingTop: 2 },
  columnRule: { height: 1 },
  overall: { fontWeight: '900', lineHeight: undefined },
  position: { fontWeight: '800' },
  avatarArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  namePanel: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  name: { fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  club: { fontWeight: '700', flexShrink: 1 },
  version: { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  informPill: {
    backgroundColor: '#dc2626',
    borderRadius: 6,
    paddingVertical: 1,
  },
  informText: { color: '#fff', fontWeight: '900', letterSpacing: 0.5 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#e05414',
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
