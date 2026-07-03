// Primeiro login (Bloco 1): antes de qualquer coisa, o jogador define nome do
// treinador, nome do time e escudo. Ao confirmar, semeia a coleção demo
// (Master Liga FC) e monta automaticamente o melhor 11 no rascunho.
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../constants/theme';
import { CREST_PALETTES } from '../constants/crestPalettes';
import { getCatalog } from '../services/catalog';
import { ownedCardsMap, useCollectionStore } from '../stores/collectionStore';
import { useProfileStore } from '../stores/profileStore';
import { autoFillDraft } from '../stores/squadLogic';
import { useSquadStore } from '../stores/squadStore';
import { MonogramCrest } from './ClubCrest';

const STEPS = ['coach', 'team', 'crest'] as const;

export function FirstLoginSetup() {
  const setupDone = useProfileStore((s) => s.setupDone);
  const [step, setStep] = useState(0);
  const [coachDraft, setCoachDraft] = useState('');
  const [teamDraft, setTeamDraft] = useState('');
  const [crestId, setCrestId] = useState(CREST_PALETTES[0]!.id);

  if (setupDone) return null;

  const stepKey = STEPS[step]!;
  const isLast = step === STEPS.length - 1;
  const initials = (teamDraft || '???').slice(0, 3).toUpperCase();

  const canAdvance =
    stepKey === 'coach' ? coachDraft.trim().length > 0 : stepKey === 'team' ? teamDraft.trim().length > 0 : true;

  const confirm = () => {
    const profile = useProfileStore.getState();
    profile.setCoachName(coachDraft.trim());
    profile.setTeamName(teamDraft.trim());
    profile.setTeamCrestId(crestId);
    profile.markSetupDone();

    useCollectionStore.getState().seedDemoCollection();
    const collection = ownedCardsMap(useCollectionStore.getState());
    const filled = autoFillDraft(useSquadStore.getState().draft, collection, getCatalog());
    useSquadStore.setState({ draft: filled });
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <ScrollView contentContainerStyle={styles.cardWrap}>
          <View style={styles.card}>
            <Text style={styles.emoji}>⚽</Text>
            <Text style={styles.title}>Bem-vindo ao Squad Dynasty</Text>

            {stepKey === 'coach' ? (
              <>
                <Text style={styles.question}>Como você quer ser chamado?</Text>
                <TextInput
                  style={styles.input}
                  value={coachDraft}
                  onChangeText={setCoachDraft}
                  placeholder="Nome do treinador"
                  placeholderTextColor={colors.textDim}
                  maxLength={20}
                  autoFocus
                />
              </>
            ) : null}

            {stepKey === 'team' ? (
              <>
                <Text style={styles.question}>Qual o nome do seu time?</Text>
                <TextInput
                  style={styles.input}
                  value={teamDraft}
                  onChangeText={setTeamDraft}
                  placeholder="Nome do time"
                  placeholderTextColor={colors.textDim}
                  maxLength={25}
                  autoFocus
                />
              </>
            ) : null}

            {stepKey === 'crest' ? (
              <>
                <Text style={styles.question}>Escolha o escudo do time</Text>
                <View style={styles.crestPreviewWrap}>
                  <MonogramCrest
                    width={72}
                    height={92}
                    primary={CREST_PALETTES.find((p) => p.id === crestId)!.primary}
                    secondary={CREST_PALETTES.find((p) => p.id === crestId)!.secondary}
                    initials={initials}
                  />
                </View>
                <View style={styles.crestGrid}>
                  {CREST_PALETTES.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => setCrestId(p.id)}
                      style={[styles.crestOption, crestId === p.id && styles.crestOptionSelected]}
                    >
                      <MonogramCrest width={36} height={46} primary={p.primary} secondary={p.secondary} initials={initials} />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.dots}>
              {STEPS.map((_, i) => (
                <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
              ))}
            </View>

            <Pressable
              style={[styles.cta, !canAdvance && styles.ctaDisabled]}
              disabled={!canAdvance}
              onPress={() => {
                if (isLast) {
                  confirm();
                } else {
                  setStep(step + 1);
                }
              }}
            >
              <Text style={styles.ctaText}>{isLast ? 'Confirmar' : 'Próximo →'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, width: '100%' },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 18,
    padding: 24,
    gap: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 40 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  question: { color: colors.textDim, fontSize: 14, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 16,
    width: '100%',
    backgroundColor: colors.bgCard,
  },
  crestPreviewWrap: { marginTop: 4, marginBottom: 4 },
  crestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  crestOption: {
    padding: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  crestOptionSelected: { borderColor: colors.accent },
  dots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 4,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
