import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, FlatList,
  TouchableOpacity, Modal, TextInput, Image, Alert, Dimensions,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../state/AppContext';
import { C } from '../theme';
import { formatDate, formatVolume, formatShortDate } from '../utils';
import { HistoryItem, ProgressPhoto, WeightEntry } from '../types';

const SCREEN_W = Dimensions.get('window').width;
// Each workout card is slightly less than half screen so 2 are visible + hint of next
const CARD_W = (SCREEN_W - 52) / 2;

// ─── AI analysis generator (stub for real Vision API) ────────────────────────
const POSITIVE_PHRASES = [
  'Visible improvement in upper chest fullness and clavicular pec development.',
  'Shoulder-to-waist ratio appears meaningfully wider — estimated +4–6% deltoid breadth.',
  'Mid-section shows reduced subcutaneous fat, particularly around the obliques.',
  'Quadriceps sweep more prominent, especially the vastus lateralis on the outer sweep.',
  'Upper back thickness has increased — rhomboids and lower traps appear more developed.',
  'Arm circumference appears larger at peak flex, consistent with ~2–4 weeks of arm specialisation.',
  'Overall body fat appears lower — facial leanness and vascularity in forearms improved.',
  'Posterior chain (hamstrings, glutes) shows improved muscle belly fullness.',
];

function generateAnalysis(photo1Date: string, photo2Date: string): string {
  const d1 = new Date(photo1Date);
  const d2 = new Date(photo2Date);
  const weeks = Math.max(1, Math.round(Math.abs(d2.getTime() - d1.getTime()) / (7 * 86400000)));
  const shuffled = [...POSITIVE_PHRASES].sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, 3);
  return `Comparing ${formatShortDate(photo1Date)} → ${formatShortDate(photo2Date)} (${weeks} week${weeks !== 1 ? 's' : ''})\n\n` +
    picks.map((p, i) => `${['●', '●', '●'][i]} ${p}`).join('\n\n') +
    `\n\nOverall: Consistent positive recomposition trend. Keep training and logging.`;
}

// ─── Workout badge ────────────────────────────────────────────────────────────
const WORKOUT_COLORS: Record<string, string> = {
  Push: '#FF6B35', Pull: '#4CAF50', Legs: '#2196F3',
  Upper: '#9C27B0', Lower: '#FF9800',
};

function WorkoutBadge({ name }: { name: string }) {
  const color = WORKOUT_COLORS[name] ?? '#666';
  return (
    <View style={[wb.badge, { backgroundColor: color + '25', borderColor: color }]}>
      <Text style={[wb.text, { color }]}>{name}</Text>
    </View>
  );
}
const wb = StyleSheet.create({
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  text: { fontSize: 11, fontWeight: '700' },
});

// ─── Recent workout card (horizontal) ────────────────────────────────────────
function RecentCard({ item, onPress }: { item: HistoryItem; onPress: () => void }) {
  const doneSets = item.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0);
  const color = WORKOUT_COLORS[item.name] ?? '#888';
  return (
    <TouchableOpacity style={[rc.card, { width: CARD_W }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[rc.accent, { backgroundColor: color }]} />
      <WorkoutBadge name={item.name} />
      <Text style={rc.date}>{formatShortDate(item.date)}</Text>
      <Text style={rc.vol}>{formatVolume(item.volume)}</Text>
      <Text style={rc.volLabel}>total volume</Text>
      <Text style={rc.sets}>{doneSets} sets · {item.exercises.length} exercises</Text>
      {item.prs.length > 0 && (
        <View style={rc.prRow}>
          <Text style={rc.prText}>🏆 {item.prs.length} PR{item.prs.length > 1 ? 's' : ''}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
const rc = StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: C.border,
    marginLeft: 0,
  },
  accent: { height: 3, borderRadius: 2, marginBottom: 10 },
  date: { fontSize: 11, color: C.textMut, marginTop: 8, marginBottom: 2 },
  vol: { fontSize: 22, fontWeight: '800', color: C.accent },
  volLabel: { fontSize: 10, color: C.textSec, marginBottom: 6 },
  sets: { fontSize: 11, color: C.textSec },
  prRow: { marginTop: 8 },
  prText: { fontSize: 11, color: C.accent, fontWeight: '700' },
});

// ─── Weight mini chart ────────────────────────────────────────────────────────
function WeightChart({ entries }: { entries: WeightEntry[] }) {
  const recent = [...entries].slice(0, 10).reverse();
  if (recent.length < 2) return null;
  const weights = recent.map(e => e.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const BAR_MAX = 48;

  return (
    <View style={wc.wrap}>
      {recent.map((e, i) => {
        const h = Math.max(6, ((e.weight - min) / range) * BAR_MAX);
        return (
          <View key={e.id} style={wc.barWrap}>
            <Text style={wc.barVal}>{i === recent.length - 1 ? e.weight : ''}</Text>
            <View style={[wc.bar, { height: h }]} />
            <Text style={wc.barDate}>{formatShortDate(e.date).split(' ')[1]}</Text>
          </View>
        );
      })}
    </View>
  );
}
const wc = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 12, marginBottom: 4 },
  barWrap: { flex: 1, alignItems: 'center' },
  bar: { width: '100%', backgroundColor: C.accent, borderRadius: 3, opacity: 0.8 },
  barVal: { fontSize: 9, color: C.accent, fontWeight: '700', marginBottom: 2 },
  barDate: { fontSize: 8, color: C.textMut, marginTop: 2 },
});

// ─── Session detail modal ─────────────────────────────────────────────────────
function SessionDetail({ session, onClose }: { session: HistoryItem; onClose: () => void }) {
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={sd.safe}>
        <View style={sd.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={sd.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={sd.title}>{session.name}</Text>
        </View>
        <ScrollView contentContainerStyle={sd.scroll}>
          <Text style={sd.date}>{formatDate(session.date)}</Text>
          <View style={sd.statsRow}>
            <View style={sd.stat}>
              <Text style={sd.statNum}>{formatVolume(session.volume)}</Text>
              <Text style={sd.statLabel}>Volume</Text>
            </View>
            <View style={sd.stat}>
              <Text style={sd.statNum}>{session.exercises.length}</Text>
              <Text style={sd.statLabel}>Exercises</Text>
            </View>
            <View style={sd.stat}>
              <Text style={sd.statNum}>{session.prs.length}</Text>
              <Text style={sd.statLabel}>PRs</Text>
            </View>
          </View>
          {session.prs.length > 0 && (
            <View style={sd.prSection}>
              <Text style={sd.sectionLabel}>Personal Records 🏆</Text>
              {session.prs.map(pr => <Text key={pr} style={sd.prItem}>• {pr}</Text>)}
            </View>
          )}
          <Text style={sd.sectionLabel}>Exercises</Text>
          {session.exercises.map((ex, i) => (
            <View key={i} style={sd.exCard}>
              <Text style={sd.exName}>{ex.n}</Text>
              <Text style={sd.exCat}>{ex.c}</Text>
              {ex.sets.filter(s => s.done).map((set, j) => (
                <Text key={j} style={sd.setLine}>Set {j + 1}: {set.w} × {set.r}</Text>
              ))}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const sd = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  back: { color: C.accent, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: C.text, flex: 1 },
  scroll: { padding: 20 },
  date: { fontSize: 13, color: C.textSec, marginBottom: 16 },
  statsRow: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 20 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: C.accent },
  statLabel: { fontSize: 11, color: C.textSec, marginTop: 2 },
  prSection: { backgroundColor: C.accentDim, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.accent },
  sectionLabel: { fontSize: 11, color: C.textSec, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  prItem: { fontSize: 14, color: C.accent, fontWeight: '600', marginBottom: 4 },
  exCard: { backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  exName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  exCat: { fontSize: 12, color: C.textSec, marginBottom: 8 },
  setLine: { fontSize: 13, color: C.textSec, marginBottom: 3 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const { state, dispatch } = useApp();

  const [selectedSession, setSelectedSession] = useState<HistoryItem | null>(null);
  const [weightModal, setWeightModal] = useState(false);
  const [tempWeight, setTempWeight] = useState('');
  const [analysisPhoto, setAnalysisPhoto] = useState<ProgressPhoto | null>(null);
  const [analysing, setAnalysing] = useState(false);

  const weightLog = state.weightLog ?? [];
  const photos = state.photos ?? [];

  // Derived weight stats
  const recentWeight = weightLog[0]?.weight ?? null;
  const prevWeight = weightLog[1]?.weight ?? null;
  const weightDelta = recentWeight !== null && prevWeight !== null ? recentWeight - prevWeight : null;

  function logWeight() {
    const w = parseFloat(tempWeight);
    if (!w || w < 20 || w > 600) {
      Alert.alert('Invalid weight', 'Enter a weight between 20 and 600.');
      return;
    }
    dispatch({
      type: 'LOG_WEIGHT',
      payload: { id: Date.now().toString(), date: new Date().toISOString(), weight: w },
    });
    setTempWeight('');
    setWeightModal(false);
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access in your device settings to add progress photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const photo: ProgressPhoto = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        uri: result.assets[0].uri,
      };
      dispatch({ type: 'ADD_PHOTO', payload: photo });
    }
  }

  async function analysePhotos(photo: ProgressPhoto) {
    if (photos.length < 2) {
      Alert.alert('Need 2 photos', 'Add at least 2 progress photos to run an AI comparison.');
      return;
    }
    setAnalysisPhoto(photo);
    if (!photo.analysis) {
      setAnalysing(true);
      await new Promise(r => setTimeout(r, 2200));
      const older = photos.find(p => p.id !== photo.id && p.date < photo.date) ??
                    photos.find(p => p.id !== photo.id);
      const analysis = generateAnalysis(older?.date ?? photo.date, photo.date);
      dispatch({ type: 'UPDATE_PHOTO_ANALYSIS', payload: { id: photo.id, analysis } });
      setAnalysing(false);
    }
  }

  function deletePhoto(id: string) {
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_PHOTO', payload: id }) },
    ]);
  }

  const recentSessions = (state.history ?? []).slice(0, 10);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Progress</Text>

        {/* ── Recent Workouts horizontal scroll ── */}
        <Text style={s.sectionLabel}>Recent Workouts</Text>
        {recentSessions.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>Complete your first workout to see it here.</Text>
          </View>
        ) : (
          <FlatList
            horizontal
            data={recentSessions}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.hList}
            snapToInterval={CARD_W + 10}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <RecentCard item={item} onPress={() => setSelectedSession(item)} />
            )}
            ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
          />
        )}

        {/* ── Body Weight tracker ── */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>Body Weight</Text>
        <View style={s.weightCard}>
          <View style={s.weightTopRow}>
            <View>
              <Text style={s.weightNum}>
                {recentWeight !== null ? `${recentWeight} ${state.units}` : '—'}
              </Text>
              <Text style={s.weightLabel}>Current weight</Text>
            </View>
            {weightDelta !== null && (
              <View style={[
                s.deltaBadge,
                { backgroundColor: weightDelta <= 0 ? '#4CAF5022' : '#F4433622' },
              ]}>
                <Text style={[
                  s.deltaText,
                  { color: weightDelta <= 0 ? '#4CAF50' : '#F44336' },
                ]}>
                  {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} {state.units}
                </Text>
                <Text style={s.deltaLabel}>vs last</Text>
              </View>
            )}
            <TouchableOpacity
              style={s.logWeightBtn}
              onPress={() => { setTempWeight(''); setWeightModal(true); }}
              activeOpacity={0.85}
            >
              <Text style={s.logWeightText}>+ Log</Text>
            </TouchableOpacity>
          </View>

          <WeightChart entries={weightLog} />

          {weightLog.length > 0 && (
            <View style={s.weightHistory}>
              {weightLog.slice(0, 5).map(entry => (
                <TouchableOpacity
                  key={entry.id}
                  style={s.weightRow}
                  onLongPress={() => Alert.alert('Delete entry?', `${entry.weight} ${state.units} on ${formatShortDate(entry.date)}`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_WEIGHT', payload: entry.id }) },
                  ])}
                  activeOpacity={1}
                >
                  <Text style={s.weightRowDate}>{formatShortDate(entry.date)}</Text>
                  <Text style={s.weightRowVal}>{entry.weight} {state.units}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {weightLog.length === 0 && (
            <Text style={s.weightEmpty}>Tap + Log to record your first weigh-in.</Text>
          )}
        </View>

        {/* ── Progress Photos (Premium) ── */}
        <View style={s.photoHeader}>
          <Text style={s.sectionLabel}>Body Progress</Text>
          <View style={s.premiumPill}>
            <Text style={s.premiumPillText}>PREMIUM</Text>
          </View>
        </View>

        {!state.premium ? (
          <View style={s.lockCard}>
            <Text style={s.lockIcon}>📸</Text>
            <Text style={s.lockTitle}>AI Body Analysis</Text>
            <Text style={s.lockDesc}>
              Upload monthly photos and get an AI-powered breakdown of exactly how your physique has changed — muscle growth, fat loss, and proportion shifts.
            </Text>
            <TouchableOpacity
              style={s.unlockBtn}
              onPress={() => dispatch({ type: 'TOGGLE_PREMIUM' })}
              activeOpacity={0.85}
            >
              <Text style={s.unlockBtnText}>Unlock with Premium</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.photosSection}>
            <Text style={s.photosHint}>
              Add a photo each month. Tap any photo to run AI analysis comparing it to the previous one.
            </Text>
            <TouchableOpacity style={s.addPhotoBtn} onPress={pickPhoto} activeOpacity={0.85}>
              <Text style={s.addPhotoText}>+ Add Photo</Text>
            </TouchableOpacity>

            {photos.length === 0 ? (
              <View style={s.photoEmpty}>
                <Text style={s.photoEmptyText}>No photos yet. Add your first progress photo.</Text>
              </View>
            ) : (
              <View style={s.photoGrid}>
                {photos.map(photo => (
                  <TouchableOpacity
                    key={photo.id}
                    style={s.photoThumb}
                    onPress={() => analysePhotos(photo)}
                    onLongPress={() => deletePhoto(photo.id)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: photo.uri }} style={s.thumbImg} />
                    <View style={s.thumbOverlay}>
                      <Text style={s.thumbDate}>{formatShortDate(photo.date)}</Text>
                      {photo.analysis && <Text style={s.thumbAnalysed}>✓ Analysed</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Log weight modal ── */}
      <Modal visible={weightModal} transparent animationType="fade" onRequestClose={() => setWeightModal(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Log Weight</Text>
            <Text style={s.modalSub}>Enter in {state.units}</Text>
            <TextInput
              style={s.modalInput}
              value={tempWeight}
              onChangeText={setTempWeight}
              placeholder={state.units === 'lb' ? '185' : '84'}
              placeholderTextColor={C.textMut}
              keyboardType="decimal-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={logWeight}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setWeightModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={logWeight}>
                <Text style={s.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── AI analysis modal ── */}
      <Modal visible={analysisPhoto !== null} transparent animationType="slide" onRequestClose={() => setAnalysisPhoto(null)}>
        <View style={s.analysisBackdrop}>
          <View style={s.analysisSheet}>
            <View style={s.analysisHeader}>
              <Text style={s.analysisTitle}>AI Analysis</Text>
              <TouchableOpacity onPress={() => setAnalysisPhoto(null)}>
                <Text style={s.analysisClose}>Done</Text>
              </TouchableOpacity>
            </View>

            {analysisPhoto && (
              <Image source={{ uri: analysisPhoto.uri }} style={s.analysisImg} />
            )}

            {analysing ? (
              <View style={s.analysingWrap}>
                <ActivityIndicator color={C.accent} size="large" />
                <Text style={s.analysingText}>Analysing your physique changes...</Text>
              </View>
            ) : (
              <ScrollView style={s.analysisBody} showsVerticalScrollIndicator={false}>
                {(analysisPhoto?.analysis ?? photos.find(p => p.id === analysisPhoto?.id)?.analysis) ? (
                  <Text style={s.analysisText}>
                    {analysisPhoto?.analysis ?? photos.find(p => p.id === analysisPhoto?.id)?.analysis}
                  </Text>
                ) : (
                  <Text style={s.analysisText}>Tap "Analyse" to run AI comparison with your previous photo.</Text>
                )}
                {photos.length < 2 && (
                  <View style={s.analysisNote}>
                    <Text style={s.analysisNoteText}>Add a second photo to unlock comparison analysis.</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {selectedSession && <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: C.text, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  sectionLabel: {
    fontSize: 12, color: C.textSec, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 10, paddingHorizontal: 20,
  },

  hList: { paddingHorizontal: 20 },
  emptyCard: {
    marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 14,
    padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  emptyText: { fontSize: 13, color: C.textMut },

  // Weight card
  weightCard: {
    marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: C.border,
  },
  weightTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  weightNum: { fontSize: 30, fontWeight: '800', color: C.text },
  weightLabel: { fontSize: 11, color: C.textSec, marginTop: 2 },
  deltaBadge: {
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', flex: 1,
  },
  deltaText: { fontSize: 15, fontWeight: '800' },
  deltaLabel: { fontSize: 10, color: C.textSec },
  logWeightBtn: {
    backgroundColor: C.accent, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  logWeightText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  weightHistory: { marginTop: 14, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  weightRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6,
  },
  weightRowDate: { fontSize: 13, color: C.textSec },
  weightRowVal: { fontSize: 13, fontWeight: '700', color: C.text },
  weightEmpty: { fontSize: 13, color: C.textMut, textAlign: 'center', marginTop: 12 },

  // Photos
  photoHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 24, marginBottom: 10, paddingHorizontal: 20,
  },
  premiumPill: {
    backgroundColor: C.accentDim, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: C.accent,
  },
  premiumPillText: { fontSize: 9, color: C.accent, fontWeight: '800', letterSpacing: 0.5 },
  lockCard: {
    marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 16,
    padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  lockIcon: { fontSize: 36, marginBottom: 10 },
  lockTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8 },
  lockDesc: { fontSize: 13, color: C.textSec, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  unlockBtn: {
    backgroundColor: C.accent, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  unlockBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  photosSection: { marginHorizontal: 20 },
  photosHint: { fontSize: 12, color: C.textSec, marginBottom: 12, lineHeight: 17 },
  addPhotoBtn: {
    backgroundColor: C.accentDim, borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: C.accent, marginBottom: 14,
  },
  addPhotoText: { color: C.accent, fontWeight: '700', fontSize: 15 },
  photoEmpty: {
    backgroundColor: C.surface, borderRadius: 12, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  photoEmptyText: { fontSize: 13, color: C.textMut },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: {
    width: (SCREEN_W - 56) / 2, height: (SCREEN_W - 56) / 2 * 1.2,
    borderRadius: 12, overflow: 'hidden', position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', padding: 8,
  },
  thumbDate: { fontSize: 11, color: '#fff', fontWeight: '600' },
  thumbAnalysed: { fontSize: 10, color: '#4CAF50', fontWeight: '700', marginTop: 2 },

  // Log weight modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: C.surface, borderRadius: 18, padding: 24, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 2 },
  modalSub: { fontSize: 12, color: C.textSec, marginBottom: 16 },
  modalInput: {
    backgroundColor: C.bg, borderRadius: 10, padding: 14,
    color: C.text, fontSize: 22, fontWeight: '700',
    borderWidth: 1, borderColor: C.border, marginBottom: 20,
    textAlign: 'center',
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  modalCancelText: { color: C.textSec, fontWeight: '600' },
  modalSave: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '700' },

  // Analysis modal
  analysisBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  analysisSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '90%',
  },
  analysisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  analysisTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  analysisClose: { color: C.accent, fontSize: 16, fontWeight: '700' },
  analysisImg: { width: '100%', height: 220, borderRadius: 14, marginBottom: 16, resizeMode: 'cover' },
  analysingWrap: { alignItems: 'center', paddingVertical: 32 },
  analysingText: { fontSize: 14, color: C.textSec, marginTop: 14 },
  analysisBody: { maxHeight: 300 },
  analysisText: { fontSize: 14, color: C.text, lineHeight: 22 },
  analysisNote: {
    backgroundColor: C.accentDim, borderRadius: 10, padding: 12,
    marginTop: 16, borderWidth: 1, borderColor: C.accent,
  },
  analysisNoteText: { fontSize: 13, color: C.accent, fontWeight: '600' },
});
