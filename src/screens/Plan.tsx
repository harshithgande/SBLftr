import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Modal, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../state/AppContext';
import { C, DAY_LABELS } from '../theme';
import { SPLIT_PRESETS, SCIENCE_CARDS } from '../data';
import { getLastPerformance, getBestLift } from '../utils';
import { RootStackParams, WorkoutDefinition } from '../types';

type Nav = NativeStackNavigationProp<RootStackParams>;

const WORKOUT_LABELS: Record<string, string> = {
  rest: 'Rest', push: 'Push', pull: 'Pull', legs: 'Legs',
  upper: 'Upper', lower: 'Lower', full: 'Full',
};

const CLASSIC_SPLIT_IDS = ['ppl', 'ul'];
const SCIENCE_SPLIT_IDS = ['fb3', 'ul-fb4', 'ul-fb5', 'ul6'];

const SPLIT_CHIP_SHORT: Record<string, string> = {
  ppl: 'P/P/L ×2',
  ul: 'U/L ×2',
};

function abbrevScienceSplit(schedule: string[]): string {
  const map: Record<string, string> = {
    upper: 'U', lower: 'L', full: 'FB', push: 'P', pull: 'Pl', legs: 'Lg',
  };
  return schedule.filter(k => k !== 'rest').map(k => map[k] ?? k.charAt(0).toUpperCase()).join('/');
}

function getColor(key: string): string {
  const map: Record<string, string> = {
    push: '#FF6B35', pull: '#4CAF50', legs: '#2196F3',
    upper: '#9C27B0', lower: '#FF9800', rest: '#444',
  };
  return map[key] ?? '#888';
}

export default function PlanScreen() {
  const { state, dispatch } = useApp();
  const navigation = useNavigation<Nav>();
  const [dayPicker, setDayPicker] = useState<number | null>(null);
  const [detailWorkout, setDetailWorkout] = useState<{ key: string; def: WorkoutDefinition } | null>(null);

  const classicPresets = SPLIT_PRESETS.filter(p => CLASSIC_SPLIT_IDS.includes(p.id));
  const personalizedPreset = state.personalizedSplitId
    ? SPLIT_PRESETS.find(p => p.id === state.personalizedSplitId) ?? null
    : null;
  const science = !state.scienceDismissed && state.scienceIdx < SCIENCE_CARDS.length
    ? SCIENCE_CARDS[state.scienceIdx]
    : null;

  // Free users can only pick from the days their current split defines.
  const splitKeys: string[] = (() => {
    const preset = SPLIT_PRESETS.find(p => p.id === state.split);
    if (preset) return [...new Set(preset.defaultSchedule)];
    const custom = state.customSplits.find(cs => cs.id === state.split);
    if (custom) return [...new Set(custom.days)];
    return ['rest'];
  })();

  const allWorkoutKeys = [
    ...Object.keys(state.workouts),
    ...state.customSplits.flatMap(cs => Object.keys(cs.workouts)),
  ];
  const allKeys = ['rest', ...new Set(allWorkoutKeys)];
  const availableKeys = state.premium ? allKeys : splitKeys;

  function selectSplit(id: string, defaultSchedule: string[]) {
    dispatch({ type: 'SET_SPLIT', payload: { id, defaultSchedule } });
  }

  function setDay(index: number, key: string) {
    dispatch({ type: 'SET_SCHEDULE_DAY', payload: { index, key } });
    setDayPicker(null);
  }

  function deleteCustomSplit(id: string, name: string) {
    Alert.alert(
      `Delete "${name}"?`,
      'This split will be removed. If it\'s your active split, you\'ll be switched to PPL.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            dispatch({ type: 'DELETE_CUSTOM_SPLIT', payload: id });
            if (state.split === id) {
              const pplPreset = SPLIT_PRESETS.find(p => p.id === 'ppl')!;
              selectSplit('ppl', pplPreset.defaultSchedule);
            }
          },
        },
      ]
    );
  }

  function handleScienceReplace() {
    if (!science) return;
    Alert.alert(
      'Replace Exercise?',
      `Replace ${science.from} with ${science.to}?\n\n"${science.reason}"`,
      [
        { text: 'Keep Current', style: 'cancel', onPress: () => dispatch({ type: 'DISMISS_SCIENCE' }) },
        { text: 'Replace', style: 'default', onPress: () => dispatch({ type: 'ACCEPT_SCIENCE_REPLACE', payload: science }) },
      ]
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Training Plan</Text>

        {/* Split selector */}
        <Text style={s.sectionLabel}>Active Split</Text>
        <View style={s.splitRow}>
          {/* Classic splits: P/P/L ×2 and U/L ×2 */}
          {classicPresets.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[s.splitChip, state.split === p.id && s.splitChipActive]}
              onPress={() => selectSplit(p.id, p.defaultSchedule)}
              activeOpacity={0.8}
            >
              <Text style={[s.splitChipText, state.split === p.id && s.splitChipTextActive]}>
                {SPLIT_CHIP_SHORT[p.id] ?? p.name}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Personalised split — visible and tappable for all users */}
          {personalizedPreset && (
            <TouchableOpacity
              style={[s.splitChip, state.split === personalizedPreset.id && s.splitChipActive, s.splitChipAI]}
              onPress={() => selectSplit(personalizedPreset.id, personalizedPreset.defaultSchedule)}
              activeOpacity={0.8}
            >
              <Text style={s.splitChipAILabel}>MY PLAN</Text>
              <Text style={[s.splitChipText, state.split === personalizedPreset.id && s.splitChipTextActive]}>
                {abbrevScienceSplit(personalizedPreset.defaultSchedule)}
              </Text>
            </TouchableOpacity>
          )}
          {/* Custom splits — Pro users */}
          {state.customSplits.map(cs => (
            <TouchableOpacity
              key={cs.id}
              style={[s.splitChip, s.splitChipCustom, state.split === cs.id && s.splitChipActive]}
              onPress={() => dispatch({ type: 'SET_SPLIT', payload: { id: cs.id, defaultSchedule: cs.days } })}
              activeOpacity={0.8}
            >
              <Text style={[s.splitChipText, state.split === cs.id && s.splitChipTextActive]}>
                {cs.name}
              </Text>
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                onPress={() => deleteCustomSplit(cs.id, cs.name)}
                activeOpacity={0.7}
              >
                <Text style={s.chipDeleteText}>×</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weekly Schedule */}
        <Text style={s.sectionLabel}>Weekly Schedule</Text>
        <Text style={s.hint}>Tap a day to change its workout.</Text>
        <View style={s.weekGrid}>
          {state.schedule.map((key, i) => (
            <TouchableOpacity
              key={i}
              style={s.dayCard}
              onPress={() => setDayPicker(i)}
              activeOpacity={0.8}
            >
              <Text style={s.dayName}>{DAY_LABELS[i]}</Text>
              <View style={[s.dayBadge, { backgroundColor: getColor(key) + '30', borderColor: getColor(key) }]}>
                <Text style={[s.dayKey, { color: getColor(key) }]} numberOfLines={1} adjustsFontSizeToFit>
                  {WORKOUT_LABELS[key] ?? key}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Workout Preview — only show workouts used in the active schedule */}
        <Text style={s.sectionLabel}>Workouts</Text>
        {Object.entries(state.workouts).filter(([k]) =>
          state.schedule.includes(k)
        ).map(([key, def]) => (
          <TouchableOpacity
            key={key}
            style={s.workoutPreview}
            onPress={() => setDetailWorkout({ key, def })}
            activeOpacity={0.8}
          >
            <View style={[s.workoutAccent, { backgroundColor: getColor(key) }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.workoutName}>{def.name}</Text>
              <Text style={s.workoutExs} numberOfLines={2}>
                {def.exercises.map(e => e.n).join(' · ')}
              </Text>
            </View>
            <Text style={s.workoutArrow}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Premium: Custom Builder CTA */}
        {state.premium ? (
          <TouchableOpacity
            style={s.buildBtn}
            onPress={() => navigation.navigate('Builder', {})}
            activeOpacity={0.85}
          >
            <Text style={s.buildBtnText}>+ Create Custom Split</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.premiumCta}>
            <Text style={s.premiumCtaTitle}>Premium</Text>
            <Text style={s.premiumCtaText}>Build custom splits, add any exercise, and access full performance recall.</Text>
          </View>
        )}

        {/* Science Card */}
        {science && (
          <View style={s.scienceCard}>
            <Text style={s.scienceLabel}>NEW RESEARCH</Text>
            <Text style={s.scienceTitle}>
              Swap <Text style={{ color: C.accent }}>{science.from}</Text> for <Text style={{ color: C.accent }}>{science.to}</Text>?
            </Text>
            <Text style={s.scienceReason}>{science.reason}</Text>
            <View style={s.scienceBtns}>
              <TouchableOpacity style={s.scienceKeep} onPress={() => dispatch({ type: 'DISMISS_SCIENCE' })}>
                <Text style={s.scienceKeepText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.scienceReplace} onPress={handleScienceReplace}>
                <Text style={s.scienceReplaceText}>Replace</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Day picker modal */}
      <Modal
        visible={dayPicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDayPicker(null)}
      >
        <TouchableOpacity style={s.modalBackdrop} onPress={() => setDayPicker(null)} activeOpacity={1}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>
              {dayPicker !== null ? DAY_LABELS[dayPicker] : ''} Workout
            </Text>
            {!state.premium && (
              <Text style={s.modalHint}>Free plan: days are limited to your active split's workout types.</Text>
            )}
            {availableKeys.map(key => (
              <TouchableOpacity
                key={key}
                style={s.modalOption}
                onPress={() => dayPicker !== null && setDay(dayPicker, key)}
              >
                <View style={[s.optionDot, { backgroundColor: getColor(key) }]} />
                <Text style={s.modalOptionText}>
                  {WORKOUT_LABELS[key] ?? key}
                </Text>
                {dayPicker !== null && state.schedule[dayPicker] === key && (
                  <Text style={{ color: C.accent, fontWeight: '700' }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Premium workout detail modal */}
      <Modal
        visible={detailWorkout !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailWorkout(null)}
      >
        <TouchableOpacity style={s.modalBackdrop} onPress={() => setDetailWorkout(null)} activeOpacity={1}>
          {/* Inner wrapper stops taps/scrolls from reaching the backdrop dismiss handler */}
          <TouchableOpacity style={s.detailSheet} onPress={() => {}} activeOpacity={1}>
            <View style={s.detailHeaderRow}>
              <Text style={s.detailTitle}>{detailWorkout?.def.name}</Text>
              <TouchableOpacity onPress={() => setDetailWorkout(null)}>
                <Text style={s.detailClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.detailSubtitle}>
              {state.premium ? 'Last session & PRs' : 'Exercises in this workout'}
            </Text>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {detailWorkout?.def.exercises.map((ex, i) => {
                const last = state.premium ? getLastPerformance(state.history, ex.n) : null;
                const best = state.premium ? getBestLift(state.history, ex.n) : 0;
                return (
                  <View key={i} style={s.detailExRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailExName}>{ex.n}</Text>
                      <Text style={s.detailCat}>{ex.c}</Text>
                      {state.premium && (
                        last ? (
                          <Text style={s.detailLast}>{last}</Text>
                        ) : (
                          <Text style={s.detailNone}>No history yet</Text>
                        )
                      )}
                    </View>
                    {state.premium && best > 0 && (
                      <View style={s.detailPR}>
                        <Text style={s.detailPRLabel}>PR</Text>
                        <Text style={s.detailPRVal}>{best}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              {!state.premium && (
                <View style={s.detailUpgrade}>
                  <Text style={s.detailUpgradeText}>Upgrade to Premium to see your last performance and PRs for each exercise.</Text>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 24 },
  sectionLabel: { fontSize: 12, color: C.textSec, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 },
  hint: { fontSize: 12, color: C.textMut, marginBottom: 10, marginTop: -6 },

  splitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  splitChip: {
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
  },
  splitChipCustom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  splitChipActive: { borderColor: C.accent, backgroundColor: C.accentDim },
  splitChipAI: { flexDirection: 'column', alignItems: 'flex-start' },
  splitChipText: { fontSize: 13, color: C.textSec, fontWeight: '600' },
  splitChipTextActive: { color: C.accent, fontSize: 13, fontWeight: '600' },
  splitChipAILabel: { fontSize: 9, color: C.accent, fontWeight: '800', letterSpacing: 1, marginBottom: 1 },
  chipDeleteText: { color: C.error, fontSize: 16, fontWeight: '700', lineHeight: 18 },

  weekGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  dayCard: { alignItems: 'center', flex: 1 },
  dayName: { fontSize: 10, color: C.textSec, marginBottom: 5, fontWeight: '600' },
  dayBadge: {
    paddingVertical: 4, paddingHorizontal: 2,
    borderRadius: 8, borderWidth: 1,
    alignItems: 'center', width: '94%', minHeight: 26,
    justifyContent: 'center',
  },
  dayKey: { fontSize: 10, fontWeight: '700' },

  workoutPreview: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  workoutAccent: { width: 4, borderRadius: 2, marginRight: 12, alignSelf: 'stretch', minHeight: 32 },
  workoutName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  workoutExs: { fontSize: 12, color: C.textSec, lineHeight: 16 },
  workoutArrow: { fontSize: 22, color: C.textMut, marginLeft: 8 },

  buildBtn: {
    backgroundColor: C.accentDim, borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 12,
    borderWidth: 1, borderColor: C.accent,
  },
  buildBtnText: { color: C.accent, fontWeight: '700', fontSize: 15 },
  premiumCta: {
    backgroundColor: C.surface, borderRadius: 12, padding: 16,
    marginTop: 12, borderWidth: 1, borderColor: C.border,
  },
  premiumCtaTitle: { fontSize: 14, fontWeight: '700', color: C.accent, marginBottom: 4 },
  premiumCtaText: { fontSize: 13, color: C.textSec, lineHeight: 18 },

  scienceCard: {
    backgroundColor: C.accentDim, borderRadius: 16, padding: 16,
    marginTop: 16, borderWidth: 1, borderColor: C.accent,
  },
  scienceLabel: { fontSize: 10, color: C.accent, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  scienceTitle: { fontSize: 15, color: C.text, fontWeight: '600', marginBottom: 6 },
  scienceReason: { fontSize: 13, color: C.textSec, lineHeight: 18, marginBottom: 14 },
  scienceBtns: { flexDirection: 'row', gap: 10 },
  scienceKeep: {
    flex: 1, padding: 10, borderRadius: 8,
    backgroundColor: C.surface, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  scienceKeepText: { color: C.textSec, fontWeight: '600' },
  scienceReplace: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center' },
  scienceReplaceText: { color: '#fff', fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 },
  modalHint: { fontSize: 12, color: C.textSec, marginBottom: 12 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  optionDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  modalOptionText: { flex: 1, fontSize: 16, color: C.text },

  detailSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40,
  },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  detailTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  detailClose: { fontSize: 20, color: C.textMut, paddingHorizontal: 4 },
  detailSubtitle: { fontSize: 12, color: C.textSec, fontWeight: '600', letterSpacing: 0.5, marginBottom: 14 },
  detailExRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  detailExName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
  detailCat: { fontSize: 11, color: C.textMut, marginBottom: 2 },
  detailLast: { fontSize: 12, color: C.textSec },
  detailNone: { fontSize: 12, color: C.textMut, fontStyle: 'italic' },
  detailUpgrade: {
    backgroundColor: C.accentDim, borderRadius: 12, padding: 14,
    marginTop: 8, borderWidth: 1, borderColor: C.accent,
  },
  detailUpgradeText: { fontSize: 13, color: C.accent, fontWeight: '600', lineHeight: 18 },
  detailPR: {
    backgroundColor: C.accentDim, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', borderWidth: 1, borderColor: C.accent,
  },
  detailPRLabel: { fontSize: 9, color: C.accent, fontWeight: '800', letterSpacing: 0.5 },
  detailPRVal: { fontSize: 15, fontWeight: '800', color: C.accent },
});
