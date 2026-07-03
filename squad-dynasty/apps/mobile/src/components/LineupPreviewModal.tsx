// Tela pré-jogo (Bloco 3): escudos + nomes dos times, escalações lado a lado
// com overall, banco de reservas — antes de "Iniciar Partida"/"Jogar Rodada".
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export interface PreviewSlot {
  position: string;
  name: string;
  overall: number;
}

export interface PreviewSide {
  crest: ReactNode;
  name: string;
  overall: number;
  slots: PreviewSlot[];
  bench: PreviewSlot[];
}

interface Props {
  visible: boolean;
  home: PreviewSide;
  away: PreviewSide;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

function Column({ side }: { side: PreviewSide }) {
  return (
    <View style={styles.column}>
      <View style={styles.columnHeader}>
        {side.crest}
        <Text style={styles.columnName} numberOfLines={1}>
          {side.name}
        </Text>
        <Text style={styles.columnOverall}>{side.overall || '—'}</Text>
      </View>
      <Text style={styles.subLabel}>Titulares</Text>
      {side.slots.map((s, i) => (
        <View key={`s${i}`} style={styles.row}>
          <Text style={styles.rowPos}>{s.position}</Text>
          <Text style={styles.rowName} numberOfLines={1}>
            {s.name}
          </Text>
          <Text style={styles.rowOverall}>{s.overall}</Text>
        </View>
      ))}
      {side.bench.length > 0 ? (
        <>
          <Text style={[styles.subLabel, { marginTop: 8 }]}>Banco</Text>
          {side.bench.map((s, i) => (
            <View key={`b${i}`} style={styles.row}>
              <Text style={styles.rowPos}>{s.position}</Text>
              <Text style={styles.rowName} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={styles.rowOverall}>{s.overall}</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

export function LineupPreviewModal({ visible, home, away, confirmLabel = 'Iniciar Partida', onConfirm, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={styles.title}>Confirme as escalações</Text>
            <View style={styles.columns}>
              <Column side={home} />
              <Column side={away} />
            </View>
          </ScrollView>
          <View style={styles.actions}>
            <Pressable style={styles.secondary} onPress={onClose}>
              <Text style={styles.secondaryText}>Voltar</Text>
            </Pressable>
            <Pressable style={styles.cta} onPress={onConfirm}>
              <Text style={styles.ctaText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    maxHeight: '88%',
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  columns: { flexDirection: 'row', gap: 8 },
  column: { flex: 1, minWidth: 0 },
  columnHeader: { alignItems: 'center', gap: 2, marginBottom: 6 },
  columnName: { color: colors.text, fontSize: 12, fontWeight: '800', maxWidth: '100%' },
  columnOverall: { color: colors.accent, fontSize: 16, fontWeight: '900' },
  subLabel: { color: colors.textDim, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3 },
  rowPos: { color: colors.textDim, fontSize: 9, fontWeight: '800', width: 20 },
  rowName: { color: colors.text, fontSize: 11, fontWeight: '700', flex: 1 },
  rowOverall: { color: colors.accent, fontSize: 11, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  secondary: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.textDim, fontWeight: '800', fontSize: 14 },
  cta: { flex: 2, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
