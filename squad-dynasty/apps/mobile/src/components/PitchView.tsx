// Campo 2D vertical com os slots da formação (SPEC tela 2 e 4).
// Interação por toque (tap-to-select): mais confiável que drag & drop em
// listas pequenas — ver DECISIONS.md.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { FORMATIONS } from '@squad-dynasty/engine';
import { colors } from '../constants/theme';

export interface PitchSlotView {
  label: string; // nome curto ou posição
  overall?: number;
  chemistry?: number; // 0–100
  filled: boolean;
  highlight?: string; // cor extra (ex: nota ao vivo no M4)
  detail?: string; // linha extra (ex: nota)
}

export interface ChemistryLink {
  from: number;
  to: number;
  strength: 'strong' | 'medium' | 'weak';
}

const LINK_COLORS: Record<ChemistryLink['strength'], string> = {
  strong: '#2ea043',
  medium: '#d29922',
  weak: '#da3633',
};

interface Props {
  formationId: string;
  slots: PitchSlotView[];
  selectedIndex?: number | null;
  onPressSlot?: (index: number) => void;
  height?: number;
  links?: ChemistryLink[];
}

export function PitchView({ formationId, slots, selectedIndex, onPressSlot, height = 420, links }: Props) {
  const formation = FORMATIONS[formationId];
  if (!formation) return null;
  const width = height * 0.72;

  return (
    <View style={[styles.wrapper, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height} rx={12} fill={colors.pitch} />
        <Rect
          x={2}
          y={2}
          width={width - 4}
          height={height - 4}
          rx={10}
          stroke={colors.pitchLines}
          strokeWidth={2}
          fill="none"
        />
        <Line x1={2} y1={height / 2} x2={width - 2} y2={height / 2} stroke={colors.pitchLines} strokeWidth={2} />
        <Circle cx={width / 2} cy={height / 2} r={height * 0.09} stroke={colors.pitchLines} strokeWidth={2} fill="none" />
        {/* áreas */}
        <Rect x={width * 0.25} y={2} width={width * 0.5} height={height * 0.11} stroke={colors.pitchLines} strokeWidth={2} fill="none" />
        <Rect x={width * 0.25} y={height - height * 0.11 - 2} width={width * 0.5} height={height * 0.11} stroke={colors.pitchLines} strokeWidth={2} fill="none" />
        {links?.map((link, li) => {
          const fromSlot = formation.slots[link.from];
          const toSlot = formation.slots[link.to];
          if (!fromSlot || !toSlot) return null;
          const x1 = fromSlot.x * width;
          const y1 = (1 - fromSlot.y) * (height - 64) + 6 + 26;
          const x2 = toSlot.x * width;
          const y2 = (1 - toSlot.y) * (height - 64) + 6 + 26;
          return (
            <Line
              key={`link-${li}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={LINK_COLORS[link.strength]}
              strokeWidth={2}
              opacity={0.7}
            />
          );
        })}
      </Svg>
      {formation.slots.map((slot, i) => {
        const view = slots[i];
        const left = slot.x * width - 26;
        const top = (1 - slot.y) * (height - 64) + 6;
        const selected = selectedIndex === i;
        const chem = view?.chemistry;
        const chemColor =
          chem === undefined ? colors.textDim : chem >= 60 ? colors.accent : chem >= 30 ? colors.warning : colors.danger;
        return (
          <Pressable
            key={i}
            onPress={() => onPressSlot?.(i)}
            style={[
              styles.slot,
              { left, top },
              view?.filled ? styles.slotFilled : styles.slotEmpty,
              selected && styles.slotSelected,
              view?.highlight ? { borderColor: view.highlight } : null,
            ]}
          >
            {view?.filled && view.overall !== undefined ? (
              <Text style={styles.overall}>{view.overall}</Text>
            ) : (
              <Text style={styles.position}>{slot.position}</Text>
            )}
            <Text numberOfLines={1} style={styles.label}>
              {view?.label ?? slot.position}
            </Text>
            {view?.detail ? <Text style={styles.detail}>{view.detail}</Text> : null}
            {chem !== undefined && view?.filled ? (
              <View style={[styles.chemDot, { backgroundColor: chemColor }]} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'center', marginVertical: 8 },
  slot: {
    position: 'absolute',
    width: 52,
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  slotFilled: { backgroundColor: colors.bgCard, borderColor: colors.border },
  slotEmpty: { backgroundColor: 'rgba(13,17,23,0.55)', borderColor: colors.pitchLines, borderStyle: 'dashed' },
  slotSelected: { borderColor: colors.accent, borderWidth: 2.5 },
  overall: { color: colors.text, fontSize: 16, fontWeight: '900' },
  position: { color: colors.textDim, fontSize: 12, fontWeight: '800' },
  label: { color: colors.textDim, fontSize: 8.5, fontWeight: '700', maxWidth: 48 },
  detail: { color: colors.warning, fontSize: 9, fontWeight: '800' },
  chemDot: { position: 'absolute', top: 3, right: 3, width: 8, height: 8, borderRadius: 4 },
});
