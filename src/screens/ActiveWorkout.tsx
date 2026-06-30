import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, Modal, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../state/AppContext';
import { C } from '../theme';
import { EXERCISES } from '../data';
import { getLastPerformance, isPR, formatDuration } from '../utils';
import { SetData, MuscleCategory, Exercise } from '../types';

const RECALL_FREE_LIMIT = 3;

function SetRow({
  setNum, set, unilateral, onWeightChange, onRepsChange, onToggle, onRemove, isPRSet,
  onAddDrop, onDropWeightChange, onDropRepsChange, onToggleDrop,
  onUnilateralChange, premium,
}: {
  setNum: number;
  set: SetData;
  unilateral: boolean;
  onWeightChange: (v: string) => void;
  onRepsChange: (v: string) => void;
  onToggle: () => void;
  onRemove: () => void;
  isPRSet: boolean;
  onAddDrop?: () => void;
  onDropWeightChange: (di: number, v: string) => void;
  onDropRepsChange: (di: number, v: string) => void;
  onToggleDrop: (di: number) => void;
  onUnilateralChange: (side: 'left' | 'right', field: 'w' | 'r', v: string) => void;
  premium: boolean;
}) {
  return (
    <View>
      {unilateral ? (
        // Unilateral (single-arm) layout
        <View style={[sr.uniWrap, set.done && sr.rowDone]}>
          <Text style={sr.num}>{setNum}</Text>
          <View style={sr.uniSides}>
            <View style={sr.uniSide}>
              <Text style={sr.uniLabel}>L</Text>
              <TextInput
                style={[sr.uniInput, set.done && sr.inputDone]}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={C.textMut}
                value={set.leftW && set.leftW > 0 ? String(set.leftW) : ''}
                onChangeText={v => onUnilateralChange('left', 'w', v)}
                editable={!set.done}
              />
              <Text style={sr.uniX}>×</Text>
              <TextInput
                style={[sr.uniInput, set.done && sr.inputDone]}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={C.textMut}
                value={set.leftR && set.leftR > 0 ? String(set.leftR) : ''}
                onChangeText={v => onUnilateralChange('left', 'r', v)}
                editable={!set.done}
              />
            </View>
            <View style={sr.uniDivider} />
            <View style={sr.uniSide}>
              <Text style={sr.uniLabel}>R</Text>
              <TextInput
                style={[sr.uniInput, set.done && sr.inputDone]}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={C.textMut}
                value={set.rightW && set.rightW > 0 ? String(set.rightW) : ''}
                onChangeText={v => onUnilateralChange('right', 'w', v)}
                editable={!set.done}
              />
              <Text style={sr.uniX}>×</Text>
              <TextInput
                style={[sr.uniInput, set.done && sr.inputDone]}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={C.textMut}
                value={set.rightR && set.rightR > 0 ? String(set.rightR) : ''}
                onChangeText={v => onUnilateralChange('right', 'r', v)}
                editable={!set.done}
              />
            </View>
          </View>
          <TouchableOpacity style={[sr.doneBtn, set.done && sr.doneBtnActive]} onPress={onToggle} activeOpacity={0.8}>
            {set.done ? <Text style={sr.doneMark}>✓</Text> : <Text style={sr.doneEmpty}>✓</Text>}
          </TouchableOpacity>
          {!set.done && (
            <TouchableOpacity onPress={onRemove} style={sr.removeBtn}>
              <Text style={sr.removeText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        // Standard bilateral layout
        <View style={[sr.row, set.done && sr.rowDone]}>
          <Text style={sr.num}>{setNum}</Text>
          <TextInput
            style={[sr.input, set.done && sr.inputDone]}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={C.textMut}
            value={set.w > 0 ? String(set.w) : ''}
            onChangeText={onWeightChange}
            editable={!set.done}
          />
          <Text style={sr.x}>×</Text>
          <TextInput
            style={[sr.input, set.done && sr.inputDone]}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={C.textMut}
            value={set.r > 0 ? String(set.r) : ''}
            onChangeText={onRepsChange}
            editable={!set.done}
          />
          <TouchableOpacity style={[sr.doneBtn, set.done && sr.doneBtnActive]} onPress={onToggle} activeOpacity={0.8}>
            {set.done ? (
              <Text style={sr.doneMark}>✓{isPRSet ? ' PR' : ''}</Text>
            ) : (
              <Text style={sr.doneEmpty}>✓</Text>
            )}
          </TouchableOpacity>
          {!set.done && (
            <TouchableOpacity onPress={onRemove} style={sr.removeBtn}>
              <Text style={sr.removeText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {/* Drop sets (premium) */}
      {premium && set.drops?.map((drop, di) => (
        <View key={di} style={[sr.dropRow, drop.done && sr.rowDone]}>
          <Text style={sr.dropLabel}>Drop</Text>
          <TextInput
            style={[sr.input, drop.done && sr.inputDone]}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={C.textMut}
            value={drop.w > 0 ? String(drop.w) : ''}
            onChangeText={v => onDropWeightChange(di, v)}
            editable={!drop.done}
          />
          <Text style={sr.x}>×</Text>
          <TextInput
            style={[sr.input, drop.done && sr.inputDone]}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={C.textMut}
            value={drop.r > 0 ? String(drop.r) : ''}
            onChangeText={v => onDropRepsChange(di, v)}
            editable={!drop.done}
          />
          <TouchableOpacity style={[sr.doneBtn, drop.done && sr.doneBtnActive]} onPress={() => onToggleDrop(di)}>
            <Text style={drop.done ? sr.doneMark : sr.doneEmpty}>✓</Text>
          </TouchableOpacity>
        </View>
      ))}
      {premium && set.done && (
        <TouchableOpacity style={sr.addDropBtn} onPress={onAddDrop}>
          <Text style={sr.addDropText}>+ Drop Set</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ActiveWorkoutScreen() {
  const { state, dispatch } = useApp();
  const navigation = useNavigation();
  const aw = state.activeWorkout;

  const [timer, setTimer] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState('0:00');
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [swapPicker, setSwapPicker] = useState<number | null>(null);
  const [swapCategory, setSwapCategory] = useState<MuscleCategory | null>(null);

  // Elapsed time counter
  useEffect(() => {
    if (!aw) return;
    elapsedRef.current = setInterval(() => {
      setElapsed(formatDuration(aw.startTime));
    }, 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [aw?.startTime]);

  // Rest timer
  function startRestTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const duration = state.restDefault;
    setTimer(duration);
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          if (prev !== null && prev <= 1) {
            Alert.alert('Rest Complete', 'Time to hit the next set! 💪');
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  const toggleSetDone = useCallback((ei: number, si: number) => {
    dispatch({ type: 'TOGGLE_SET_DONE', payload: { ei, si } });
    // Start timer if marking done
    const set = aw?.exercises[ei]?.sets[si];
    if (set && !set.done) startRestTimer();
  }, [aw, dispatch]);

  if (!aw) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.textSec }}>No active workout.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: C.accent }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function handleFinish() {
    Alert.alert('Finish Workout?', `Volume: ${aw!.volume} ${state.units}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: () => {
          dispatch({ type: 'FINISH_WORKOUT' });
          navigation.goBack();
        },
      },
    ]);
  }

  function handleCancel() {
    Alert.alert('Cancel Workout?', 'Progress will be lost.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Cancel Workout',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'CANCEL_WORKOUT' });
          navigation.goBack();
        },
      },
    ]);
  }

  function canShowRecall(ei: number): boolean {
    return state.premium || ei < RECALL_FREE_LIMIT;
  }

  // Flatten exercise list for picking swaps
  const swapExercises: Exercise[] = swapCategory
    ? EXERCISES[swapCategory].map(n => ({ n, c: swapCategory }))
    : Object.entries(EXERCISES).flatMap(([cat, names]) =>
        names.map(n => ({ n, c: cat as MuscleCategory }))
      );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleCancel} style={s.cancelBtn}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.workoutTitle}>{aw.name}</Text>
          <Text style={s.elapsed}>{elapsed}</Text>
        </View>
        <TouchableOpacity onPress={handleFinish} style={s.finishBtn}>
          <Text style={s.finishText}>Finish</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {aw.exercises.map((ex, ei) => {
          const lastPerf = getLastPerformance(state.history, ex.n);
          const showRecall = canShowRecall(ei);
          const prExercise = aw.prs.includes(ex.n);

          return (
            <View key={ei} style={s.exerciseCard}>
              {/* Exercise header */}
              <View style={s.exHeader}>
                <View style={{ flex: 1 }}>
                  <View style={s.exNameRow}>
                    <Text style={s.exName}>{ex.n}</Text>
                    {prExercise && <View style={s.prBadge}><Text style={s.prText}>PR</Text></View>}
                    {ex.unilateral && <View style={s.uniBadge}><Text style={s.uniText}>L/R</Text></View>}
                  </View>
                  <Text style={s.exCategory}>{ex.c}</Text>
                </View>
                <TouchableOpacity
                  style={[s.swapBtn, ex.unilateral && s.swapBtnActive]}
                  onPress={() => dispatch({ type: 'TOGGLE_UNILATERAL', payload: ei })}
                >
                  <Text style={[s.swapText, ex.unilateral && { color: C.accent }]}>Single Arm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.swapBtn, { marginLeft: 6 }]}
                  onPress={() => {
                    setSwapPicker(ei);
                    setSwapCategory(null);
                  }}
                >
                  <Text style={s.swapText}>Swap</Text>
                </TouchableOpacity>
              </View>

              {/* Past performance */}
              {showRecall && lastPerf ? (
                <View style={s.recallRow}>
                  <Text style={s.recallLabel}>Last: </Text>
                  <Text style={s.recallValue}>{lastPerf}</Text>
                </View>
              ) : !showRecall ? (
                <View style={s.recallRow}>
                  <Text style={s.lockedText}>🔒 Upgrade to see past performance</Text>
                </View>
              ) : (
                <View style={s.recallRow}>
                  <Text style={s.recallLabel}>First time — set your baseline!</Text>
                </View>
              )}

              {/* Set header */}
              {!ex.unilateral && (
                <View style={s.setHeader}>
                  <Text style={[s.setHeaderText, { width: 24 }]}>#</Text>
                  <Text style={[s.setHeaderText, { flex: 1 }]}>Weight ({state.units})</Text>
                  <Text style={s.setHeaderX} />
                  <Text style={[s.setHeaderText, { flex: 1 }]}>Reps</Text>
                  <Text style={[s.setHeaderText, { width: 60 }]}>Done</Text>
                </View>
              )}
              {ex.unilateral && (
                <View style={s.setHeader}>
                  <Text style={[s.setHeaderText, { width: 24 }]}>#</Text>
                  <Text style={[s.setHeaderText, { flex: 1, textAlign: 'center' }]}>Left · wt × reps</Text>
                  <Text style={[s.setHeaderText, { flex: 1, textAlign: 'center' }]}>Right · wt × reps</Text>
                  <Text style={[s.setHeaderText, { width: 52 }]}>Done</Text>
                </View>
              )}

              {/* Sets */}
              {ex.sets.map((set, si) => (
                <SetRow
                  key={si}
                  setNum={si + 1}
                  set={set}
                  unilateral={!!ex.unilateral}
                  isPRSet={set.done && set.w > 0 && isPR(state.history, ex.n, set.w)}
                  premium={state.premium}
                  onWeightChange={v => dispatch({ type: 'UPDATE_SET', payload: { ei, si, w: parseFloat(v) || 0 } })}
                  onRepsChange={v => dispatch({ type: 'UPDATE_SET', payload: { ei, si, r: parseInt(v, 10) || 0 } })}
                  onToggle={() => toggleSetDone(ei, si)}
                  onRemove={() => dispatch({ type: 'REMOVE_SET', payload: { ei, si } })}
                  onAddDrop={() => dispatch({ type: 'ADD_DROP', payload: { ei, si } })}
                  onDropWeightChange={(di, v) => dispatch({ type: 'UPDATE_DROP', payload: { ei, si, di, w: parseFloat(v) || 0 } })}
                  onDropRepsChange={(di, v) => dispatch({ type: 'UPDATE_DROP', payload: { ei, si, di, r: parseInt(v, 10) || 0 } })}
                  onToggleDrop={di => dispatch({ type: 'TOGGLE_DROP_DONE', payload: { ei, si, di } })}
                  onUnilateralChange={(side, field, v) => {
                    const val = parseFloat(v) || 0;
                    dispatch({
                      type: 'UPDATE_UNILATERAL_SET',
                      payload: field === 'w' ? { ei, si, side, w: val } : { ei, si, side, r: val },
                    });
                  }}
                />
              ))}

              <TouchableOpacity
                style={s.addSetBtn}
                onPress={() => dispatch({ type: 'ADD_SET', payload: ei })}
              >
                <Text style={s.addSetText}>+ Add Set</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={{ height: timer !== null ? 120 : 60 }} />
      </ScrollView>

      {/* Volume bar */}
      <View style={s.volumeBar}>
        <Text style={s.volumeLabel}>Volume</Text>
        <Text style={s.volumeVal}>{aw.volume.toLocaleString()} {state.units}</Text>
        {aw.prs.length > 0 && (
          <View style={s.prPill}>
            <Text style={s.prPillText}>{aw.prs.length} PR{aw.prs.length > 1 ? 's' : ''} 🏆</Text>
          </View>
        )}
      </View>

      {/* Rest Timer */}
      {timer !== null && (
        <View style={s.timerBar}>
          <TouchableOpacity onPress={() => { if (intervalRef.current) clearInterval(intervalRef.current); setTimer(null); }}>
            <Text style={s.timerSkip}>Skip</Text>
          </TouchableOpacity>
          <Text style={s.timerCount}>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</Text>
          <TouchableOpacity onPress={() => setTimer(t => t !== null ? t + 15 : null)}>
            <Text style={s.timerAdd}>+15s</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Swap Exercise Modal */}
      <Modal
        visible={swapPicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSwapPicker(null)}
      >
        <TouchableOpacity style={s.modalBackdrop} onPress={() => setSwapPicker(null)} activeOpacity={1}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Swap Exercise</Text>
            {/* Category filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={[s.catChip, !swapCategory && s.catChipActive]}
                onPress={() => setSwapCategory(null)}
              >
                <Text style={[s.catChipText, !swapCategory && s.catChipTextActive]}>All</Text>
              </TouchableOpacity>
              {Object.keys(EXERCISES).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[s.catChip, swapCategory === cat && s.catChipActive]}
                  onPress={() => setSwapCategory(cat as MuscleCategory)}
                >
                  <Text style={[s.catChipText, swapCategory === cat && s.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <FlatList
              data={swapExercises}
              keyExtractor={item => item.n}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.swapOption}
                  onPress={() => {
                    if (swapPicker !== null) {
                      dispatch({ type: 'SWAP_EXERCISE', payload: { ei: swapPicker, exercise: item } });
                      setSwapPicker(null);
                      setSwapCategory(null);
                    }
                  }}
                >
                  <View>
                    <Text style={s.swapOptionName}>{item.n}</Text>
                    <Text style={s.swapOptionCat}>{item.c}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowDone: { opacity: 0.6 },
  num: { width: 24, fontSize: 13, color: C.textSec, fontWeight: '600' },
  input: {
    flex: 1, backgroundColor: C.bg, borderRadius: 8, padding: 10,
    color: C.text, fontSize: 16, textAlign: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  inputDone: { borderColor: C.success + '60' },
  x: { marginHorizontal: 6, color: C.textSec, fontSize: 14 },
  doneBtn: {
    width: 56, height: 38, borderRadius: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  doneBtnActive: { backgroundColor: C.success, borderColor: C.success },
  doneMark: { color: '#fff', fontWeight: '700', fontSize: 12 },
  doneEmpty: { color: C.textMut, fontSize: 14 },
  removeBtn: { marginLeft: 8, padding: 4 },
  removeText: { color: C.textMut, fontSize: 18 },
  dropRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingLeft: 24 },
  dropLabel: { width: 36, fontSize: 11, color: C.warning, fontWeight: '700' },
  addDropBtn: { paddingLeft: 24, paddingVertical: 6 },
  addDropText: { color: C.warning, fontSize: 13, fontWeight: '600' },
  // Unilateral
  uniWrap:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 4 },
  uniSides:   { flex: 1, flexDirection: 'row', alignItems: 'center' },
  uniSide:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  uniDivider: { width: 1, height: 28, backgroundColor: C.border, marginHorizontal: 6 },
  uniLabel:   { fontSize: 12, fontWeight: '800', color: C.accent, width: 14 },
  uniInput:   { flex: 1, backgroundColor: C.bg, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 4, color: C.text, fontSize: 13, textAlign: 'center', borderWidth: 1, borderColor: C.border },
  uniX:       { fontSize: 11, color: C.textSec, marginHorizontal: 1 },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4, width: 64 },
  cancelText: { color: C.textSec, fontSize: 15 },
  headerCenter: { flex: 1, alignItems: 'center' },
  workoutTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  elapsed: { fontSize: 12, color: C.textSec, marginTop: 2 },
  finishBtn: {
    backgroundColor: C.accent, borderRadius: 8,
    paddingVertical: 5, paddingHorizontal: 10, minWidth: 60, alignItems: 'center',
  },
  finishText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  uniBadge:     { backgroundColor: '#2196F322', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: '#2196F3' },
  uniText:      { color: '#2196F3', fontSize: 10, fontWeight: '800' },
  swapBtnActive:{ borderColor: C.accent, backgroundColor: C.accentDim },
  scroll: { padding: 16 },
  exerciseCard: {
    backgroundColor: C.surface, borderRadius: 14,
    padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
  },
  exHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  exNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exName: { fontSize: 16, fontWeight: '700', color: C.text },
  exCategory: { fontSize: 12, color: C.textSec, marginTop: 2 },
  prBadge: { backgroundColor: C.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  prText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  swapBtn: {
    backgroundColor: C.bg, borderRadius: 8,
    paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, borderColor: C.border,
  },
  swapText: { color: C.textSec, fontSize: 12, fontWeight: '600' },
  recallRow: { flexDirection: 'row', marginBottom: 10, backgroundColor: C.bg, borderRadius: 8, padding: 8 },
  recallLabel: { fontSize: 12, color: C.textSec, fontWeight: '600' },
  recallValue: { fontSize: 12, color: C.accent, flex: 1 },
  lockedText: { fontSize: 12, color: C.textMut },
  setHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  setHeaderText: { fontSize: 11, color: C.textSec, fontWeight: '600', textAlign: 'center' },
  setHeaderX: { width: 20 },
  addSetBtn: { marginTop: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 8, borderStyle: 'dashed' },
  addSetText: { color: C.textSec, fontSize: 13, fontWeight: '600' },
  volumeBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    paddingHorizontal: 20, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  volumeLabel: { fontSize: 12, color: C.textSec, fontWeight: '600', marginRight: 8 },
  volumeVal: { fontSize: 16, fontWeight: '700', color: C.text, flex: 1 },
  prPill: { backgroundColor: C.accentDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  prPillText: { color: C.accent, fontSize: 12, fontWeight: '700' },
  timerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card,
    paddingHorizontal: 28, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  timerSkip: { color: C.textSec, fontSize: 15, fontWeight: '600' },
  timerCount: { fontSize: 28, fontWeight: '800', color: C.accent },
  timerAdd: { color: C.accent, fontSize: 15, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 12 },
  catChip: {
    paddingVertical: 6, paddingHorizontal: 12, marginRight: 8,
    backgroundColor: C.bg, borderRadius: 20, borderWidth: 1, borderColor: C.border,
  },
  catChipActive: { borderColor: C.accent, backgroundColor: C.accentDim },
  catChipText: { color: C.textSec, fontSize: 12, fontWeight: '600' },
  catChipTextActive: { color: C.accent },
  swapOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  swapOptionName: { fontSize: 15, color: C.text, fontWeight: '500' },
  swapOptionCat: { fontSize: 12, color: C.textSec, marginTop: 2 },
});
