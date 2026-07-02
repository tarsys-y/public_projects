import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SQUAD DYNASTY</Text>
      <Text style={styles.subtitle}>Monte seu elenco. Domine a liga.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1117',
    gap: 8,
  },
  title: {
    color: '#e6edf3',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#8b949e',
    fontSize: 14,
  },
});
