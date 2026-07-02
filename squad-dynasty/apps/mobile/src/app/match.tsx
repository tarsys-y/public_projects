// Partida ao Vivo (SPEC tela 4) — implementada no M4.
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export default function MatchScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Partida ao Vivo</Text>
      <Text style={styles.subtitle}>Em construção (M4): amistoso contra a IA.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 6 },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: colors.textDim, fontSize: 13 },
});
