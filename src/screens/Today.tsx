import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, TextInput, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../state/AppContext';
import { C, DAY_LABELS } from '../theme';
import { SCIENCE_CARDS } from '../data';
import {
  getTodayKey, getRecovery, getStreak,
  formatDate, getEffectiveDate,
} from '../utils';
import { RootStackParams, MuscleCategory, GoalKey, RecoveryStatus } from '../types';
// GoalKey is used for the editGoal state type
import BodyDiagram from '../components/BodyDiagram';

type Nav = NativeStackNavigationProp<RootStackParams>;

// ─── Water cup counter ────────────────────────────────────────────────────────

function WaterCounter({
  cups, target, onDecrement, onIncrement, onEditTarget,
}: {
  cups: number; target: number;
  onDecrement: () => void; onIncrement: () => void; onEditTarget: () => void;
}) {
  const done = cups >= target;
  return (
    <View style={g.waterRow}>
      <Text style={g.waterEmoji}>💧</Text>
      <Text style={[g.waterLabel, done && g.waterLabelDone]}>Water</Text>
      <View style={g.waterCounter}>
        <TouchableOpacity style={g.counterBtn} onPress={onDecrement} activeOpacity={0.7}>
          <Text style={g.counterBtnText}>−</Text>
        </TouchableOpacity>
        <View style={g.counterDisplay}>
          <Text style={[g.counterNum, done && { color: C.success }]}>{cups}</Text>
          <Text style={g.counterSep}>/</Text>
          <TouchableOpacity onPress={onEditTarget} activeOpacity={0.7}>
            <Text style={g.counterTarget}>{target}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={g.counterBtn} onPress={onIncrement} activeOpacity={0.7}>
          <Text style={g.counterBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={[g.cupsLabel, done && { color: C.success }]}>cups</Text>
    </View>
  );
}

// ─── Boolean goal row ─────────────────────────────────────────────────────────

function GoalRow({
  label, done, target, unit, onToggle, onEditTarget,
}: {
  label: string; done: boolean; target: number; unit: string;
  onToggle: () => void; onEditTarget: () => void;
}) {
  return (
    <View style={g.row}>
      <TouchableOpacity style={[g.check, done && g.checkDone]} onPress={onToggle} activeOpacity={0.7}>
        {done && <Text style={g.checkMark}>✓</Text>}
      </TouchableOpacity>
      <Text style={[g.label, done && g.labelDone]}>{label}</Text>
      <TouchableOpacity style={g.targetBtn} onPress={onEditTarget} activeOpacity={0.7}>
        <Text style={g.targetNum}>{target.toLocaleString()}</Text>
        <Text style={g.targetUnit}>{unit}</Text>
      </TouchableOpacity>
    </View>
  );
}

const g = StyleSheet.create({
  waterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 8 },
  waterEmoji: { fontSize: 18 },
  waterLabel: { flex: 1, fontSize: 15, color: C.text },
  waterLabelDone: { color: C.success },
  waterCounter: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  counterBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: C.surface,
  },
  counterBtnText: { fontSize: 18, fontWeight: '700', color: C.accent },
  counterDisplay: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 10, gap: 3 },
  counterNum: { fontSize: 17, fontWeight: '800', color: C.accent },
  counterSep: { fontSize: 13, color: C.textMut },
  counterTarget: { fontSize: 13, color: C.textSec, fontWeight: '600' },
  cupsLabel: { fontSize: 12, color: C.textSec, fontWeight: '600' },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  check: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkDone: { backgroundColor: C.accent, borderColor: C.accent },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  label: { flex: 1, fontSize: 15, color: C.text },
  labelDone: { color: C.textSec, textDecorationLine: 'line-through' },
  targetBtn: {
    flexDirection: 'row', alignItems: 'baseline', gap: 3,
    backgroundColor: C.bg, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.border,
  },
  targetNum: { fontSize: 14, fontWeight: '700', color: C.accent },
  targetUnit: { fontSize: 11, color: C.textSec },
});

// ─── Legend dot ───────────────────────────────────────────────────────────────

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <View style={l.item}>
      <View style={[l.dot, { backgroundColor: color }]} />
      <Text style={l.text}>{label}</Text>
    </View>
  );
}

const l = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 5 },
  text: { fontSize: 12, color: C.textSec },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const { state, dispatch } = useApp();
  const navigation = useNavigation<Nav>();

  const todayKey = getTodayKey(state);
  const isRest = todayKey === 'rest';
  const workout = state.workouts[todayKey];
  const effectiveDate = getEffectiveDate(state.devOffset);
  const dayName = DAY_LABELS[effectiveDate.getDay()];
  const streak = getStreak(state.history, state.devOffset);
  const goals = state.goals;

  const science = !state.scienceDismissed && state.scienceIdx < SCIENCE_CARDS.length
    ? SCIENCE_CARDS[state.scienceIdx]
    : null;

  // Build recovery map for body diagram
  const muscleCats: MuscleCategory[] = [
    'Shoulders', 'Chest', 'Triceps', 'Biceps',
    'Back', 'Lower Back', 'Quads', 'Hamstrings', 'Calves', 'Abs',
  ];
  const recoveryMap = Object.fromEntries(
    muscleCats.map(cat => [cat, getRecovery(state.history, cat, state.devOffset)])
  ) as Record<MuscleCategory, RecoveryStatus>;

  // Goal target editor
  const [editGoal, setEditGoal] = useState<GoalKey | null>(null);
  const [editVal, setEditVal] = useState('');

  function openEditGoal(key: GoalKey) {
    setEditVal(String(state.goalTargets[key]));
    setEditGoal(key);
  }

  function saveEditGoal() {
    const val = parseInt(editVal, 10);
    if (editGoal && val > 0) {
      dispatch({ type: 'SET_GOAL_TARGET', payload: { key: editGoal, value: val } });
    }
    setEditGoal(null);
  }

  function startWorkout() {
    if (state.activeWorkout) {
      navigation.navigate('ActiveWorkout');
      return;
    }
    dispatch({ type: 'START_WORKOUT', payload: todayKey });
    navigation.navigate('ActiveWorkout');
  }

  function handleScienceAlert() {
    if (!science) return;
    Alert.alert(
      `Swap ${science.from}?`,
      science.reason,
      [
        { text: 'Keep Current', style: 'cancel', onPress: () => dispatch({ type: 'DISMISS_SCIENCE' }) },
        { text: 'Replace', onPress: () => dispatch({ type: 'ACCEPT_SCIENCE_REPLACE', payload: science }) },
      ]
    );
  }

  const BOOL_GOAL_META: Record<'steps' | 'calories', { label: string; unit: string }> = {
    steps: { label: 'Steps', unit: 'steps' },
    calories: { label: 'Calories', unit: 'kcal' },
  };

  function adjustWater(delta: number) {
    dispatch({ type: 'SET_WATER', payload: goals.water + delta });
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Dev mode banner ── */}
        {state.devMode && (
          <View style={s.devBanner}>
            <Text style={s.devBannerIcon}>🧪</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.devBannerTitle}>Dev Mode Active</Text>
              <Text style={s.devBannerSub}>
                Simulating {DAY_LABELS[effectiveDate.getDay()]}, {formatDate(effectiveDate.toISOString())}
                {state.devOffset !== 0 && ` (${state.devOffset > 0 ? '+' : ''}${state.devOffset}d)`}
              </Text>
            </View>
            <View style={s.devSchedulePreview}>
              <Text style={s.devScheduleKey}>
                {todayKey === 'rest' ? 'Rest' : (state.workouts[todayKey]?.name ?? todayKey)}
              </Text>
            </View>
          </View>
        )}

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.nameRow}>
            <Text style={s.greeting}>Hey, {state.user}</Text>
            <View style={[s.streakPill, streak === 0 && s.streakPillZero]}>
              <Text style={s.streakPillEmoji}>{streak > 0 ? '🔥' : '⚡'}</Text>
              <Text style={[s.streakPillNum, streak === 0 && s.streakPillNumZero]}>{streak}</Text>
            </View>
          </View>
          <Text style={s.date}>{dayName} · {formatDate(effectiveDate.toISOString())}</Text>
          <TouchableOpacity
            style={s.patchBtn}
            onPress={() => navigation.navigate('WhatsNew')}
            activeOpacity={0.8}
          >
            <Text style={s.patchBtnText}>What's New ›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Today strip ── */}
        <View style={s.topCard}>
          <View style={s.todayLeft}>
            <Text style={s.todayLabel}>TODAY</Text>
            <Text style={s.todayName}>{isRest ? 'Rest Day' : workout?.name ?? todayKey}</Text>
            {!isRest && (
              <Text style={s.todayExs} numberOfLines={1}>
                {workout?.exercises.map(e => e.n).join(' · ')}
              </Text>
            )}
          </View>
          <View style={s.topRight}>
            {!isRest ? (
              <TouchableOpacity style={s.startBtn} onPress={startWorkout} activeOpacity={0.85}>
                <Text style={s.startBtnText}>
                  {state.activeWorkout ? 'Resume' : 'Start'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={s.restEmoji}>🛌</Text>
            )}
          </View>
        </View>

        {/* ── Daily Goals ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Daily Goals</Text>
          <Text style={s.cardHint}>Tap a target number to edit it.</Text>
          <WaterCounter
            cups={goals.water}
            target={state.goalTargets.water}
            onDecrement={() => adjustWater(-1)}
            onIncrement={() => adjustWater(1)}
            onEditTarget={() => openEditGoal('water')}
          />
          {(['steps', 'calories'] as const).map(key => (
            <GoalRow
              key={key}
              label={BOOL_GOAL_META[key].label}
              done={goals[key]}
              target={state.goalTargets[key]}
              unit={BOOL_GOAL_META[key].unit}
              onToggle={() => dispatch({ type: 'TOGGLE_GOAL', payload: key })}
              onEditTarget={() => openEditGoal(key)}
            />
          ))}
        </View>

        {/* ── Muscle Recovery ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Muscle Recovery</Text>
          <BodyDiagram recovery={recoveryMap} />
          <View style={s.legend}>
            <LegendDot label="Ready" color={C.ready} />
            <LegendDot label="Half" color={C.half} />
            <LegendDot label="Needs Rest" color={C.rest} />
          </View>
        </View>

        {/* ── Science Card ── */}
        {science && (
          <View style={s.scienceCard}>
            <Text style={s.scienceLabel}>NEW RESEARCH</Text>
            <Text style={s.scienceTitle}>
              Consider swapping <Text style={s.scienceHL}>{science.from}</Text> for <Text style={s.scienceHL}>{science.to}</Text>
            </Text>
            <Text style={s.scienceReason}>{science.reason}</Text>
            <TouchableOpacity style={s.scienceBtn} onPress={handleScienceAlert} activeOpacity={0.8}>
              <Text style={s.scienceBtnText}>See Options</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Goal target edit modal ── */}
      <Modal visible={editGoal !== null} transparent animationType="fade" onRequestClose={() => setEditGoal(null)}>
        <TouchableOpacity style={s.modalBg} onPress={() => setEditGoal(null)} activeOpacity={1}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>
              Edit {editGoal === 'water' ? 'Water' : editGoal === 'steps' ? 'Steps' : 'Calories'} Target
            </Text>
            <View style={s.modalInputRow}>
              <TextInput
                style={s.modalInput}
                value={editVal}
                onChangeText={setEditVal}
                keyboardType="number-pad"
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={saveEditGoal}
              />
              <Text style={s.modalUnit}>
                {editGoal === 'water' ? 'cups' : editGoal === 'steps' ? 'steps' : 'kcal'}
              </Text>
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setEditGoal(null)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={saveEditGoal}>
                <Text style={s.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18 },

  devBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#2A1F00', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: C.warning,
  },
  devBannerIcon: { fontSize: 20 },
  devBannerTitle: { fontSize: 12, fontWeight: '700', color: C.warning, letterSpacing: 0.5 },
  devBannerSub: { fontSize: 11, color: '#BFA050', marginTop: 1 },
  devSchedulePreview: {
    backgroundColor: C.warning + '25', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  devScheduleKey: { fontSize: 12, fontWeight: '800', color: C.warning },

  header: { marginBottom: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  greeting: { fontSize: 22, fontWeight: '800', color: C.text },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FF6B3520', borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: '#FF6B3550',
  },
  streakPillZero: { backgroundColor: '#ffffff10', borderColor: '#ffffff20' },
  streakPillEmoji: { fontSize: 14 },
  streakPillNum: { fontSize: 14, fontWeight: '900', color: C.accent },
  streakPillNumZero: { color: C.textSec },
  date: { fontSize: 12, color: C.textSec, marginBottom: 8 },
  patchBtn: {
    alignSelf: 'flex-start',
    backgroundColor: C.surface, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: C.border,
  },
  patchBtnText: { fontSize: 11, fontWeight: '700', color: C.textSec },

  topCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    flexDirection: 'row', marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
  },
  todayLeft: { flex: 1, paddingRight: 8 },
  todayLabel: { fontSize: 10, color: C.accent, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  todayName: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4 },
  todayExs: { fontSize: 11, color: C.textSec, lineHeight: 15 },
  topRight: { alignItems: 'center', gap: 10 },
  startBtn: {
    backgroundColor: C.accent, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  restEmoji: { fontSize: 26 },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  cardTitle: {
    fontSize: 12, color: C.textSec, fontWeight: '700',
    letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 2,
  },
  cardHint: { fontSize: 11, color: C.textMut, marginBottom: 10 },

  legend: { flexDirection: 'row', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },

  scienceCard: {
    backgroundColor: C.accentDim, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.accent, marginBottom: 14,
  },
  scienceLabel: { fontSize: 10, color: C.accent, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  scienceTitle: { fontSize: 15, color: C.text, fontWeight: '600', marginBottom: 6 },
  scienceHL: { color: C.accent },
  scienceReason: { fontSize: 13, color: C.textSec, lineHeight: 18, marginBottom: 12 },
  scienceBtn: {
    backgroundColor: C.accent, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start',
  },
  scienceBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: C.surface, borderRadius: 18, padding: 24, width: '82%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 16 },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  modalInput: {
    flex: 1, backgroundColor: C.bg, borderRadius: 10, padding: 14,
    color: C.text, fontSize: 20, fontWeight: '700',
    borderWidth: 1, borderColor: C.border, textAlign: 'center',
  },
  modalUnit: { fontSize: 14, color: C.textSec, fontWeight: '600', width: 44 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, padding: 13, borderRadius: 10,
    backgroundColor: C.bg, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  modalCancelText: { color: C.textSec, fontWeight: '600' },
  modalSave: { flex: 1, padding: 13, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '700' },
});
