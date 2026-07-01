import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Modal, TextInput, Image, Alert, Dimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Polyline, Circle, Text as SvgText } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { useApp } from '../state/AppContext';
import { C } from '../theme';
import { formatShortDate } from '../utils';
import { WeightEntry } from '../types';
import { OPENAI_API_KEY } from '../constants';

const SCREEN_W = Dimensions.get('window').width;

// ─── Analysis text parser ─────────────────────────────────────────────────────
function parseAnalysis(raw: string): { strengths: string[]; focus: string[]; verdict: string } {
  const clean = raw.replace(/\*\*/g, '').replace(/\*/g, '').trim();
  function extractBullets(header: string, after: string[]): string[] {
    const start = clean.indexOf(header);
    if (start === -1) return [];
    let end = clean.length;
    for (const h of after) {
      const pos = clean.indexOf(h, start + header.length);
      if (pos !== -1 && pos < end) end = pos;
    }
    return clean.slice(start + header.length, end).trim()
      .split('\n')
      .filter(l => l.trim().startsWith('•') || l.trim().startsWith('-'))
      .map(l => l.replace(/^[•\-]\s*/, '').trim())
      .filter(Boolean);
  }
  const strengthsH = 'CURRENT STRENGTHS';
  const focusH = 'WHAT TO FOCUS ON';
  const verdictH = 'VERDICT';
  const strengths = extractBullets(strengthsH, [focusH, verdictH]);
  const focus     = extractBullets(focusH, [verdictH]);
  const vStart = clean.indexOf(verdictH);
  const verdict = vStart !== -1 ? clean.slice(vStart + verdictH.length).trim().replace(/^[\n\r]+/, '') : '';
  return { strengths, focus, verdict };
}

// ─── T-chart component ────────────────────────────────────────────────────────
function AnalysisTChart({ strengths, focus }: { strengths: string[]; focus: string[] }) {
  return (
    <View style={at.wrap}>
      <View style={at.col}>
        <View style={[at.hdr, { backgroundColor: '#4CAF5018', borderColor: '#4CAF50' }]}>
          <Text style={[at.hdrText, { color: '#4CAF50' }]}>✅  Strong</Text>
        </View>
        {strengths.map((s, i) => (
          <View key={i} style={at.row}>
            <View style={[at.dot, { backgroundColor: '#4CAF50' }]} />
            <Text style={at.cell}>{s}</Text>
          </View>
        ))}
      </View>
      <View style={at.divider} />
      <View style={at.col}>
        <View style={[at.hdr, { backgroundColor: '#FF6B3518', borderColor: C.accent }]}>
          <Text style={[at.hdrText, { color: C.accent }]}>🎯  Focus</Text>
        </View>
        {focus.map((f, i) => (
          <View key={i} style={at.row}>
            <View style={[at.dot, { backgroundColor: C.accent }]} />
            <Text style={at.cell}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const at = StyleSheet.create({
  wrap:    { flexDirection: 'row', gap: 8 },
  col:     { flex: 1 },
  hdr:     { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 10, borderWidth: 1, alignItems: 'center' },
  hdrText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  divider: { width: 1, backgroundColor: '#333', marginHorizontal: 2, marginTop: 38 },
  row:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 8 },
  dot:     { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  cell:    { fontSize: 13, color: '#DDDDDD', lineHeight: 18, flex: 1 },
});

// ─── AI Vision ────────────────────────────────────────────────────────────────
async function uriToBase64(uri: string): Promise<string> {
  return readAsStringAsync(uri, { encoding: EncodingType.Base64 });
}

async function callGPTVision(beforeBase64: string, afterBase64: string): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${beforeBase64}`, detail: 'high' } },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${afterBase64}`, detail: 'high' } },
            {
              type: 'text',
              text: `You are a brutally honest physique coach looking at two progress photos. The FIRST image is "before" (~1 month ago). The SECOND is "after" (now).

Look carefully at the actual body in the photos. Identify what is visually well-developed and what needs work. Be SPECIFIC — name exact body parts and what you see (e.g. "wide back", "rounded shoulders", "weak lower chest", "fat accumulation at the hips", "underdeveloped arms", "strong quads").

Output exactly this format:

CURRENT STRENGTHS
• [Specific visible strength — e.g. "Wide, developed back with good lat width"]
• [Second specific strength — e.g. "Broad shoulders with visible delt separation"]
• [Third if visible]

WHAT TO FOCUS ON
• [Specific weak area — e.g. "Arms (biceps and triceps) lack size and definition"]
• [Second weak area — e.g. "Excess body fat visible around hips and lower abdomen"]
• [Third if relevant — e.g. "Lower chest needs more development for a full pec shape"]

VERDICT
[One direct, honest sentence summarising where they are and what the priority shift should be]

Plain text only. No markdown. Use • for bullets. Be specific — vague compliments are useless.`,
            },
          ],
        },
      ],
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `API error ${resp.status}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? 'No response received.';
}

// ─── SVG Weight Line Graph ────────────────────────────────────────────────────
function WeightLineGraph({ entries, startingWeight }: { entries: WeightEntry[]; startingWeight: number | null }) {
  const CHART_W = SCREEN_W - 80;
  const CHART_H = 100;
  const PAD = 18;

  const chronological = [...entries].reverse().slice(-12);

  // Always show at least one point: use starting weight if no logs
  const dataPoints: { weight: number; label: string }[] = chronological.length > 0
    ? chronological.map(e => ({ weight: e.weight, label: formatShortDate(e.date) }))
    : startingWeight != null
      ? [{ weight: startingWeight, label: 'Start' }]
      : [];

  if (dataPoints.length === 0) return null;

  const weights = dataPoints.map(d => d.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 5;

  const pts = dataPoints.map((d, i) => {
    const x = dataPoints.length === 1
      ? CHART_W / 2
      : PAD + (i / (dataPoints.length - 1)) * (CHART_W - PAD * 2);
    const y = CHART_H - PAD - ((d.weight - min) / range) * (CHART_H - PAD * 2.5);
    return { x, y, weight: d.weight };
  });

  const polylinePoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  const last = pts[pts.length - 1];

  return (
    <View style={{ marginTop: 12 }}>
      <Svg width={CHART_W} height={CHART_H}>
        {pts.length > 1 && (
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={C.accent}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {pts.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === pts.length - 1 ? 5 : 3}
            fill={i === pts.length - 1 ? C.accent : C.accent + '80'}
          />
        ))}
        <SvgText
          x={last.x}
          y={last.y - 10}
          fill={C.accent}
          fontSize="10"
          textAnchor={last.x > CHART_W * 0.75 ? 'end' : 'middle'}
          fontWeight="700"
        >
          {last.weight} lbs
        </SvgText>
      </Svg>
    </View>
  );
}

// ─── AI Photo Comparison ─────────────────────────────────────────────────────
function PhotoComparison() {
  const [beforeUri, setBeforeUri] = useState<string | null>(null);
  const [afterUri, setAfterUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState<'before' | 'after' | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Pre-request permission so first tap doesn't lag
  React.useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
  }, []);

  async function pickPhoto(side: 'before' | 'after') {
    setPicking(side);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access in Settings.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.6,
      });
      if (!res.canceled && res.assets[0]) {
        if (side === 'before') setBeforeUri(res.assets[0].uri);
        else setAfterUri(res.assets[0].uri);
      }
    } finally {
      setPicking(null);
    }
  }

  async function runAnalysis() {
    if (!beforeUri || !afterUri) {
      Alert.alert('Two photos needed', 'Pick a Before and an After photo first.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const [b64Before, b64After] = await Promise.all([uriToBase64(beforeUri), uriToBase64(afterUri)]);
      const analysis = await callGPTVision(b64Before, b64After);
      setResult(analysis);
      setShowResult(true);
    } catch (e: any) {
      Alert.alert('Analysis failed', e.message ?? 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={pc.wrap}>
      <View style={pc.slotRow}>
        {(['before', 'after'] as const).map(side => {
          const uri = side === 'before' ? beforeUri : afterUri;
          const isPicking = picking === side;
          return (
            <TouchableOpacity
              key={side}
              style={[pc.slot, uri && pc.slotFilled, isPicking && pc.slotPicking]}
              onPress={() => !picking && pickPhoto(side)}
              activeOpacity={0.75}
              disabled={!!picking}
            >
              {isPicking ? (
                <View style={pc.slotEmpty}>
                  <ActivityIndicator color={C.accent} size="small" />
                  <Text style={[pc.slotLabel, { marginTop: 8 }]}>Opening…</Text>
                </View>
              ) : uri ? (
                <Image source={{ uri }} style={pc.slotImg} />
              ) : (
                <View style={pc.slotEmpty}>
                  <Text style={pc.slotIcon}>📸</Text>
                  <Text style={pc.slotLabel}>{side === 'before' ? 'Before\n(~1 month ago)' : 'After\n(Now)'}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {(beforeUri || afterUri) && (
        <TouchableOpacity style={pc.clearBtn} onPress={() => { setBeforeUri(null); setAfterUri(null); setResult(null); }}>
          <Text style={pc.clearBtnText}>Clear photos</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[pc.analyseBtn, (!beforeUri || !afterUri || loading) && pc.analyseBtnDisabled]}
        onPress={runAnalysis}
        disabled={!beforeUri || !afterUri || loading}
        activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={pc.analyseBtnText}>Analyse Changes</Text>}
      </TouchableOpacity>

      <Modal visible={showResult} transparent animationType="slide" onRequestClose={() => setShowResult(false)}>
        <View style={pc.resultBackdrop}>
          <TouchableOpacity style={pc.resultSheet} onPress={() => {}} activeOpacity={1}>
            <View style={pc.resultHeader}>
              <Text style={pc.resultTitle}>Body Analysis</Text>
              <TouchableOpacity onPress={() => setShowResult(false)}>
                <Text style={pc.resultClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={pc.resultPhotoRow}>
              {beforeUri && <Image source={{ uri: beforeUri }} style={pc.resultThumb} />}
              <Text style={pc.resultArrow}>→</Text>
              {afterUri && <Image source={{ uri: afterUri }} style={pc.resultThumb} />}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {result ? (() => {
                const parsed = parseAnalysis(result);
                return (
                  <View>
                    <AnalysisTChart strengths={parsed.strengths} focus={parsed.focus} />
                    {parsed.verdict ? (
                      <View style={pc.verdictBox}>
                        <Text style={pc.verdictText}>{parsed.verdict}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })() : null}
            </ScrollView>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
const pc = StyleSheet.create({
  wrap: { marginTop: 4 },
  slotRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  slot: {
    flex: 1, aspectRatio: 3 / 4, borderRadius: 14,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.border,
    overflow: 'hidden',
  },
  slotFilled: { borderStyle: 'solid', borderColor: C.accent },
  slotPicking: { borderColor: C.accent, opacity: 0.7 },
  slotImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  slotEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  slotIcon: { fontSize: 28 },
  slotLabel: { fontSize: 12, color: C.textMut, textAlign: 'center', lineHeight: 18 },
  clearBtn: { alignItems: 'center', marginBottom: 8 },
  clearBtnText: { fontSize: 12, color: C.error },
  analyseBtn: {
    backgroundColor: C.accent, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  analyseBtnDisabled: { opacity: 0.35 },
  analyseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resultBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  resultSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '90%',
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  resultTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  resultClose: { color: C.accent, fontSize: 16, fontWeight: '700' },
  resultPhotoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  resultThumb: { flex: 1, height: 140, borderRadius: 10, resizeMode: 'cover' },
  resultArrow: { fontSize: 20, color: C.textSec },
  verdictBox: {
    marginTop: 16, padding: 12, backgroundColor: '#ffffff0A',
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
  },
  verdictText: { fontSize: 13, color: C.textSec, lineHeight: 20, fontStyle: 'italic' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const { state, dispatch } = useApp();

  const [weightModal, setWeightModal] = useState(false);
  const [tempWeight, setTempWeight] = useState('');

  const weightLog = state.weightLog ?? [];
  const currentWeight = weightLog[0]?.weight ?? null;
  const startingWeight = state.weightLbs;

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

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Progress</Text>

        {/* ── Body Stats ── */}
        <View style={s.statsCard}>
          <View style={s.statsRow}>
            {startingWeight != null && (
              <View style={s.statItem}>
                <Text style={s.statNum}>{startingWeight} lbs</Text>
                <Text style={s.statLabel}>Starting</Text>
              </View>
            )}
            <View style={s.statItem}>
              <Text style={s.statNum}>
                {currentWeight != null ? `${currentWeight} lbs` : '—'}
              </Text>
              <Text style={s.statLabel}>Current</Text>
            </View>
            <TouchableOpacity
              style={s.logBtn}
              onPress={() => { setTempWeight(''); setWeightModal(true); }}
              activeOpacity={0.85}
            >
              <Text style={s.logBtnText}>+ Log</Text>
            </TouchableOpacity>
          </View>

          <WeightLineGraph entries={weightLog} startingWeight={startingWeight} />

          {weightLog.length > 0 && (
            <View style={s.weightHistory}>
              {weightLog.slice(0, 5).map(entry => (
                <TouchableOpacity
                  key={entry.id}
                  style={s.weightRow}
                  onLongPress={() => Alert.alert('Delete entry?', `${entry.weight} lbs on ${formatShortDate(entry.date)}`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_WEIGHT', payload: entry.id }) },
                  ])}
                  activeOpacity={1}
                >
                  <Text style={s.weightDate}>{formatShortDate(entry.date)}</Text>
                  <Text style={s.weightVal}>{entry.weight} lbs</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {weightLog.length === 0 && (
            <Text style={s.weightEmpty}>Tap + Log to record your first weigh-in.</Text>
          )}
        </View>

        {/* ── AI Body Analysis ── */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>AI Body Analysis</Text>
        {state.premium ? (
          <View style={s.analysisCard}>
            <Text style={s.analysisHint}>
              Upload a Before and After photo. AI will identify your current strengths and exactly what to focus on.
            </Text>
            <PhotoComparison />
          </View>
        ) : (
          <View style={s.lockCard}>
            <Text style={s.lockIcon}>📸</Text>
            <Text style={s.lockTitle}>AI Body Analysis</Text>
            <Text style={s.lockDesc}>
              Upload monthly photos and get an AI breakdown of your current strengths and exactly what to focus on next.
            </Text>
            <TouchableOpacity
              style={s.unlockBtn}
              onPress={() => dispatch({ type: 'TOGGLE_PREMIUM' })}
              activeOpacity={0.85}
            >
              <Text style={s.unlockBtnText}>Unlock with Premium</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Log weight modal ── */}
      <Modal visible={weightModal} transparent animationType="fade" onRequestClose={() => setWeightModal(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Log Weight</Text>
            <Text style={s.modalSub}>Enter in lbs</Text>
            <TextInput
              style={s.modalInput}
              value={tempWeight}
              onChangeText={setTempWeight}
              placeholder="185"
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 40 },
  pageTitle: {
    fontSize: 28, fontWeight: '800', color: C.text,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 12, color: C.textSec, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 10, paddingHorizontal: 20,
  },

  // Stats / weight card
  statsCard: {
    marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: C.border,
  },
  statsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' },
  statItem: { alignItems: 'center', minWidth: 64 },
  statNum: { fontSize: 20, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 10, color: C.textSec, marginTop: 2, fontWeight: '600' },
  logBtn: {
    backgroundColor: C.accent, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  logBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  weightHistory: { marginTop: 14, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  weightDate: { fontSize: 13, color: C.textSec },
  weightVal: { fontSize: 13, fontWeight: '700', color: C.text },
  weightEmpty: { fontSize: 13, color: C.textMut, textAlign: 'center', marginTop: 14 },

  // AI analysis
  analysisCard: {
    marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: C.border,
  },
  analysisHint: { fontSize: 13, color: C.textSec, lineHeight: 18, marginBottom: 14 },
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
  modalCancel: {
    flex: 1, padding: 12, borderRadius: 10,
    backgroundColor: C.bg, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  modalCancelText: { color: C.textSec, fontWeight: '600' },
  modalSave: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '700' },
});
