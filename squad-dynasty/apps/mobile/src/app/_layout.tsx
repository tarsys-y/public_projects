import { useEffect } from 'react';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { colors } from '../constants/theme';
import { useCareerStore } from '../stores/careerStore';
import { useCollectionStore } from '../stores/collectionStore';
import { useMatchStore } from '../stores/matchStore';

import type { ColorValue } from 'react-native';

function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 18, color }}>{glyph}</Text>;
}

export default function RootLayout() {
  const seedDemoCollection = useCollectionStore((s) => s.seedDemoCollection);
  useEffect(() => {
    seedDemoCollection();
  }, [seedDemoCollection]);

  // Partida de carreira concluída → registra rodada na liga (uma vez).
  useEffect(
    () =>
      useMatchStore.subscribe((s) => {
        if (s.mode === 'career' && s.phase === 'finished' && !s.careerConsumed) {
          useCareerStore.getState().consumeUserResult();
        }
      }),
    [],
  );

  return (
    <ThemeProvider value={DarkTheme}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800', letterSpacing: 1 },
          tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textDim,
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'SQUAD DYNASTY',
            tabBarLabel: 'Início',
            tabBarIcon: ({ color }) => <TabIcon glyph="🏠" color={color} />,
          }}
        />
        <Tabs.Screen
          name="squad"
          options={{
            title: 'MEU TIME',
            tabBarLabel: 'Meu Time',
            tabBarIcon: ({ color }) => <TabIcon glyph="🧩" color={color} />,
          }}
        />
        <Tabs.Screen
          name="collection"
          options={{
            title: 'COLEÇÃO',
            tabBarLabel: 'Coleção',
            tabBarIcon: ({ color }) => <TabIcon glyph="🃏" color={color} />,
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: 'LOJA',
            tabBarLabel: 'Loja',
            tabBarIcon: ({ color }) => <TabIcon glyph="🛒" color={color} />,
          }}
        />
        <Tabs.Screen
          name="league"
          options={{
            title: 'LIGA',
            tabBarLabel: 'Liga',
            tabBarIcon: ({ color }) => <TabIcon glyph="🏆" color={color} />,
          }}
        />
        <Tabs.Screen
          name="match"
          options={{
            title: 'PARTIDA',
            tabBarLabel: 'Partida',
            tabBarIcon: ({ color }) => <TabIcon glyph="⚽" color={color} />,
          }}
        />
        <Tabs.Screen name="card/[id]" options={{ href: null, title: 'CARTA' }} />
      </Tabs>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
