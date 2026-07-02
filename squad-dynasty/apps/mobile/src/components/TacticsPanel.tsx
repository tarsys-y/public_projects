// Painel de tática (SPEC tela 2): mentalidade, largura, linha, pressing,
// estilo de passe e foco de ataque.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tactics } from '@squad-dynasty/engine';
import { colors } from '../constants/theme';

interface Props {
  tactics: Tactics;
  onChange: (tactics: Partial<Tactics>) => void;
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.segments}>
        {options.map((option) => (
          <Pressable
            key={String(option.value)}
            onPress={() => onSelect(option.value)}
            style={[styles.segment, value === option.value && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, value === option.value && styles.segmentTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function TacticsPanel({ tactics, onChange }: Props) {
  return (
    <View style={styles.panel}>
      <Segmented
        label="Mentalidade"
        value={tactics.mentality}
        options={[1, 2, 3, 4, 5].map((v) => ({ value: v as Tactics['mentality'], label: String(v) }))}
        onSelect={(mentality) => onChange({ mentality })}
      />
      <Segmented
        label="Largura"
        value={tactics.width}
        options={[
          { value: 1 as const, label: 'Estreita' },
          { value: 2 as const, label: 'Média' },
          { value: 3 as const, label: 'Aberta' },
        ]}
        onSelect={(width) => onChange({ width })}
      />
      <Segmented
        label="Linha defensiva"
        value={tactics.defensiveLine}
        options={[
          { value: 1 as const, label: 'Baixa' },
          { value: 2 as const, label: 'Média' },
          { value: 3 as const, label: 'Alta' },
        ]}
        onSelect={(defensiveLine) => onChange({ defensiveLine })}
      />
      <Segmented
        label="Pressing"
        value={tactics.pressing}
        options={[
          { value: 1 as const, label: 'Leve' },
          { value: 2 as const, label: 'Médio' },
          { value: 3 as const, label: 'Alto' },
        ]}
        onSelect={(pressing) => onChange({ pressing })}
      />
      <Segmented
        label="Passe"
        value={tactics.passStyle}
        options={[
          { value: 'short' as const, label: 'Curto' },
          { value: 'direct' as const, label: 'Direto' },
        ]}
        onSelect={(passStyle) => onChange({ passStyle })}
      />
      <Segmented
        label="Foco de ataque"
        value={tactics.attackFocus}
        options={[
          { value: 'center' as const, label: 'Centro' },
          { value: 'flanks' as const, label: 'Flancos' },
        ]}
        onSelect={(attackFocus) => onChange({ attackFocus })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 10, backgroundColor: colors.bgElevated, borderRadius: 12, padding: 12 },
  row: { gap: 6 },
  rowLabel: { color: colors.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  segments: { flexDirection: 'row', gap: 6 },
  segment: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
  },
  segmentActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  segmentText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  segmentTextActive: { color: '#fff' },
});
