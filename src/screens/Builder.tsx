import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Modal, FlatList, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../state/AppContext';
import { C, DAY_LABELS } from '../theme';
import { EXERCISES } from '../data';
import { CustomSplit, Exercise, MuscleCategory, WorkoutDefinition } from '../types';

function ExercisePickerModal({
  visible, onClose, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (ex: Exercise) => void;
}) {
  const [cat, setCat] = useState<MuscleCategory | null>(null);
  const exercises: Exercise[] = cat
    ? EXERCISES[cat].map(n => ({ n, c: cat }))
    : Object.entries(EXERCISES).flatMap(([c, ns]) => ns.map(n => ({ n, c: c as MuscleCategory })));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={m.backdrop} onPress={onClose} activeOpacity={1}>
        <View style={m.sheet}>
          <Text style={m.title}>Pick Exercise</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <TouchableOpacity style={[m.chip, !cat && m.chipActive]} onPress={() => setCat(null)}>
              <Text style={[m.chipText, !cat && m.chipTextActive]}>All</Text>
            </TouchableOpacity>
            {(Object.keys(EXERCISES) as MuscleCategory[]).map(c => (
              <TouchableOpacity key={c} style={[m.chip, cat === c && m.chipActive]} onPress={() => setCat(c)}>
                <Text style={[m.chipText, cat === c && m.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <FlatList
            data={exercises}
            keyExtractor={item => item.n}
            style={{ maxHeight: 380 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={m.option} onPress={() => { onSelect(item); onClose(); }}>
                <Text style={m.optionName}>{item.n}</Text>
                <Text style={m.optionCat}>{item.c}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 12 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, backgroundColor: C.bg, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  chipActive: { borderColor: C.accent, backgroundColor: C.accentDim },
  chipText: { color: C.textSec, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: C.accent },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  optionName: { fontSize: 15, color: C.text },
  optionCat: { fontSize: 12, color: C.textSec, marginTop: 2 },
  customRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  customInput: {
    flex: 1, backgroundColor: C.bg, borderRadius: 10, padding: 10,
    fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border,
  },
  customBtn: {
    backgroundColor: C.accent, borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  customBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  presetLabel: {
    fontSize: 10, color: C.textMut, fontWeight: '700', letterSpacing: 1,
    marginBottom: 4, paddingTop: 2,
  },
});

const PRESET_DAY_OPTIONS = ['rest', 'Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Anterior', 'Posterior'];

export default function BuilderScreen() {
  const { state, dispatch } = useApp();
  const navigation = useNavigation();

  const [splitName, setSplitName] = useState('My Split');
  const [days, setDays] = useState(['rest', 'Push', 'Pull', 'Legs', 'Push', 'Pull', 'rest']);
  const [workoutExercises, setWorkoutExercises] = useState<Record<string, Exercise[]>>({
    Push: [], Pull: [], Legs: [], Upper: [], Lower: [],
  });
  const [dayPicker, setDayPicker] = useState<number | null>(null);
  const [customDayInput, setCustomDayInput] = useState('');
  const [exPicker, setExPicker] = useState<string | null>(null);

  const uniqueWorkouts = [...new Set(days.filter(d => d !== 'rest'))];

  function setDay(index: number, key: string) {
    const next = [...days];
    next[index] = key;
    setDays(next);
    setCustomDayInput('');
    setDayPicker(null);
  }

  function confirmCustomDay() {
    const name = customDayInput.trim();
    if (dayPicker !== null && name) setDay(dayPicker, name);
  }

  function addExercise(workoutKey: string, ex: Exercise) {
    setWorkoutExercises(prev => ({
      ...prev,
      [workoutKey]: [...(prev[workoutKey] ?? []), ex],
    }));
  }

  function removeExercise(workoutKey: string, idx: number) {
    setWorkoutExercises(prev => ({
      ...prev,
      [workoutKey]: (prev[workoutKey] ?? []).filter((_, i) => i !== idx),
    }));
  }

  function handleSave() {
    if (!splitName.trim()) {
      Alert.alert('Name required', 'Please enter a name for your split.');
      return;
    }
    const workouts: Record<string, WorkoutDefinition> = {};
    for (const key of uniqueWorkouts) {
      workouts[key.toLowerCase()] = {
        name: key,
        exercises: workoutExercises[key] ?? [],
      };
    }
    const custom: CustomSplit = {
      id: Date.now().toString(),
      name: splitName.trim(),
      days: days.map(d => d === 'rest' ? 'rest' : d.toLowerCase()),
      workouts,
    };
    dispatch({ type: 'ADD_CUSTOM_SPLIT', payload: custom });
    dispatch({ type: 'SET_SPLIT', payload: { id: custom.id, defaultSchedule: custom.days } });
    Alert.alert('Saved!', `"${custom.name}" is now your active split.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Custom Split</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={s.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Split name */}
        <Text style={s.label}>Split Name</Text>
        <TextInput
          style={s.nameInput}
          value={splitName}
          onChangeText={setSplitName}
          placeholder="My Split"
          placeholderTextColor={C.textMut}
        />

        {/* Week schedule */}
        <Text style={s.label}>Weekly Schedule</Text>
        <Text style={s.hint}>Tap a day to change.</Text>
        <View style={s.weekRow}>
          {days.map((key, i) => (
            <TouchableOpacity key={i} style={s.dayCell} onPress={() => setDayPicker(i)} activeOpacity={0.8}>
              <Text style={s.dayLabel}>{DAY_LABELS[i]}</Text>
              <Text style={[s.dayKey, key === 'rest' && { color: C.textMut }]}>
                {key === 'rest' ? 'Rest' : key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Workout exercise lists */}
        {uniqueWorkouts.map(workoutKey => (
          <View key={workoutKey} style={s.workoutSection}>
            <View style={s.workoutHeader}>
              <Text style={s.workoutName}>{workoutKey} Exercises</Text>
              <TouchableOpacity style={s.addExBtn} onPress={() => setExPicker(workoutKey)}>
                <Text style={s.addExText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {(workoutExercises[workoutKey] ?? []).length === 0 ? (
              <Text style={s.emptyExText}>No exercises yet. Tap Add to pick from the library.</Text>
            ) : (
              (workoutExercises[workoutKey] ?? []).map((ex, idx) => (
                <View key={idx} style={s.exRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.exName}>{ex.n}</Text>
                    <Text style={s.exCat}>{ex.c}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeExercise(workoutKey, idx)} style={s.removeBtn}>
                    <Text style={s.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ))}

        {uniqueWorkouts.length === 0 && (
          <Text style={s.hint}>Assign workout days above to define exercises.</Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Day picker */}
      <Modal visible={dayPicker !== null} transparent animationType="slide" onRequestClose={() => setDayPicker(null)}>
        <TouchableOpacity style={m.backdrop} onPress={() => setDayPicker(null)} activeOpacity={1}>
          <View style={m.sheet}>
            <Text style={m.title}>{dayPicker !== null ? DAY_LABELS[dayPicker] : ''}</Text>

            {/* Custom name input */}
            <View style={m.customRow}>
              <TextInput
                style={m.customInput}
                placeholder="Custom name (e.g. Full Body)"
                placeholderTextColor={C.textMut}
                value={customDayInput}
                onChangeText={setCustomDayInput}
                returnKeyType="done"
                onSubmitEditing={confirmCustomDay}
              />
              <TouchableOpacity
                style={[m.customBtn, !customDayInput.trim() && { opacity: 0.4 }]}
                onPress={confirmCustomDay}
                disabled={!customDayInput.trim()}
                activeOpacity={0.8}
              >
                <Text style={m.customBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <Text style={m.presetLabel}>PRESETS</Text>
            {PRESET_DAY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={m.option}
                onPress={() => dayPicker !== null && setDay(dayPicker, opt)}
              >
                <Text style={[m.optionName, days[dayPicker ?? 0] === opt && { color: C.accent, fontWeight: '700' }]}>
                  {opt === 'rest' ? 'Rest' : opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Exercise picker */}
      <ExercisePickerModal
        visible={exPicker !== null}
        onClose={() => setExPicker(null)}
        onSelect={ex => exPicker && addExercise(exPicker, ex)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  cancelText: { color: C.textSec, fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  saveText: { color: C.accent, fontSize: 16, fontWeight: '700' },
  scroll: { padding: 20 },
  label: { fontSize: 12, color: C.textSec, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 12 },
  hint: { fontSize: 12, color: C.textMut, marginBottom: 10, marginTop: -4 },
  nameInput: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14,
    fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dayCell: {
    flex: 1, alignItems: 'center', backgroundColor: C.surface,
    borderRadius: 10, paddingVertical: 10, marginHorizontal: 2,
    borderWidth: 1, borderColor: C.border,
  },
  dayLabel: { fontSize: 10, color: C.textSec, fontWeight: '600', marginBottom: 4 },
  dayKey: { fontSize: 11, color: C.accent, fontWeight: '700' },
  workoutSection: { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  workoutHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  workoutName: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
  addExBtn: { backgroundColor: C.accentDim, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: C.accent },
  addExText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  emptyExText: { fontSize: 13, color: C.textMut, fontStyle: 'italic' },
  exRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  exName: { fontSize: 14, color: C.text, fontWeight: '500' },
  exCat: { fontSize: 12, color: C.textSec },
  removeBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  removeText: { color: C.error, fontSize: 13, fontWeight: '600' },
});
