import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Modal, Alert, Switch, Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { useApp } from '../state/AppContext';
import { C } from '../theme';
import { generatePPLTestData } from '../utils';

function Row({
  label, value, onPress, badge,
}: { label: string; value?: string; onPress?: () => void; badge?: React.ReactNode }) {
  return (
    <TouchableOpacity style={r.row} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <Text style={r.label}>{label}</Text>
      <View style={r.right}>
        {badge}
        {value !== undefined && <Text style={r.value}>{value}</Text>}
        {onPress && <Text style={r.arrow}>›</Text>}
      </View>
    </TouchableOpacity>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={r.row}>
      <Text style={r.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: C.border, true: C.accent }}
        thumbColor="#fff"
      />
    </View>
  );
}

const r = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  label: { flex: 1, fontSize: 15, color: C.text },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { fontSize: 15, color: C.textSec },
  arrow: { fontSize: 20, color: C.textMut },
});

// ─── Photo Analysis Test (dev tool) ──────────────────────────────────────────
async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Allow photo library access in Settings.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.6,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

async function uriToBase64(uri: string): Promise<string> {
  return readAsStringAsync(uri, { encoding: EncodingType.Base64 });
}

import { OPENAI_API_KEY } from '../constants';
const OPENAI_KEY = OPENAI_API_KEY;

async function callGPTVision(beforeBase64: string, afterBase64: string): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${beforeBase64}`, detail: 'high' },
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${afterBase64}`, detail: 'high' },
            },
            {
              type: 'text',
              text: `These are two fitness progress photos. The FIRST image is from approximately one month ago. The SECOND image is from now.

Analyze the visible physical changes between them. Be specific about:
- Muscle development (which groups, how much)
- Body fat / leanness changes
- Proportion or symmetry changes
- Overall progress assessment

Format your response as 4–6 concise bullet points followed by a one-sentence overall verdict. Be honest and constructive — if there is little visible change, say so.`,
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

function PhotoAnalysisTool() {
  const [beforeUri, setBeforeUri] = useState<string | null>(null);
  const [afterUri, setAfterUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  async function runAnalysis() {
    if (!beforeUri || !afterUri) {
      Alert.alert('Two photos needed', 'Pick a "Before" photo and an "After" photo first.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const [b64Before, b64After] = await Promise.all([
        uriToBase64(beforeUri),
        uriToBase64(afterUri),
      ]);
      const analysis = await callGPTVision(b64Before, b64After);
      setResult(analysis);
      setShowResult(true);
    } catch (e: any) {
      Alert.alert('Analysis failed', e.message ?? 'Unknown error. Check your network connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={pt.wrap}>
      <Text style={pt.subLabel}>PHOTO ANALYSIS TEST</Text>

      {/* Before / After pickers */}
      <View style={pt.photoRow}>
        <TouchableOpacity
          style={[pt.photoSlot, beforeUri && pt.photoSlotFilled]}
          onPress={async () => { const u = await pickImage(); if (u) setBeforeUri(u); }}
          activeOpacity={0.8}
        >
          {beforeUri ? (
            <Image source={{ uri: beforeUri }} style={pt.thumbImg} />
          ) : (
            <Text style={pt.photoPlaceholder}>+ Before{'\n'}(~1 month ago)</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[pt.photoSlot, afterUri && pt.photoSlotFilled]}
          onPress={async () => { const u = await pickImage(); if (u) setAfterUri(u); }}
          activeOpacity={0.8}
        >
          {afterUri ? (
            <Image source={{ uri: afterUri }} style={pt.thumbImg} />
          ) : (
            <Text style={pt.photoPlaceholder}>+ After{'\n'}(Now)</Text>
          )}
        </TouchableOpacity>
      </View>

      {(beforeUri || afterUri) && (
        <TouchableOpacity
          style={pt.clearBtn}
          onPress={() => { setBeforeUri(null); setAfterUri(null); setResult(null); }}
        >
          <Text style={pt.clearBtnText}>Clear photos</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[pt.analyseBtn, (!beforeUri || !afterUri || loading) && pt.analyseBtnDisabled]}
        onPress={runAnalysis}
        disabled={!beforeUri || !afterUri || loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={pt.analyseBtnText}>Analyse Changes</Text>
        )}
      </TouchableOpacity>

      {/* Result modal */}
      <Modal visible={showResult} transparent animationType="slide" onRequestClose={() => setShowResult(false)}>
        <View style={pt.resultBackdrop}>
          <View style={pt.resultSheet}>
            <View style={pt.resultHeader}>
              <Text style={pt.resultTitle}>AI Analysis</Text>
              <TouchableOpacity onPress={() => setShowResult(false)}>
                <Text style={pt.resultClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={pt.resultPhotoRow}>
              {beforeUri && <Image source={{ uri: beforeUri }} style={pt.resultThumb} />}
              <Text style={pt.resultArrow}>→</Text>
              {afterUri && <Image source={{ uri: afterUri }} style={pt.resultThumb} />}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={pt.resultText}>{result}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const pt = StyleSheet.create({
  wrap: { paddingTop: 4, paddingBottom: 8 },
  subLabel: {
    fontSize: 10, color: C.textMut, fontWeight: '700', letterSpacing: 1,
    marginBottom: 10, marginTop: 6,
  },
  photoRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  photoSlot: {
    flex: 1, height: 130, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bg, overflow: 'hidden',
  },
  photoSlotFilled: { borderStyle: 'solid', borderColor: C.accent },
  thumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { fontSize: 12, color: C.textMut, textAlign: 'center', lineHeight: 18 },
  clearBtn: { alignItems: 'center', marginBottom: 8 },
  clearBtnText: { fontSize: 12, color: C.error },
  analyseBtn: {
    backgroundColor: C.accent, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  analyseBtnDisabled: { opacity: 0.4 },
  analyseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resultBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  resultSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '85%',
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  resultTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  resultClose: { color: C.accent, fontSize: 16, fontWeight: '700' },
  resultPhotoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  resultThumb: { flex: 1, height: 140, borderRadius: 10, resizeMode: 'cover' },
  resultArrow: { fontSize: 20, color: C.textSec },
  resultText: { fontSize: 14, color: C.text, lineHeight: 22 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { state, dispatch } = useApp();
  const [nameModal, setNameModal] = useState(false);
  const [restModal, setRestModal] = useState(false);
  const [tempName, setTempName] = useState(state.user ?? '');
  const [tempRest, setTempRest] = useState(String(state.restDefault));
  const [tapCount, setTapCount] = useState(0);

  function handleVersionTap() {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 7) {
      dispatch({ type: 'TOGGLE_DEV_MODE' });
      setTapCount(0);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Profile</Text>

        {/* Account */}
        <Text style={s.sectionLabel}>Account</Text>
        <View style={s.card}>
          <Row label="Name" value={state.user ?? ''} onPress={() => { setTempName(state.user ?? ''); setNameModal(true); }} />
          <Row
            label="Units"
            value={state.units === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'}
            onPress={() => dispatch({ type: 'SET_UNITS', payload: state.units === 'kg' ? 'lb' : 'kg' })}
          />
        </View>

        {/* Workout */}
        <Text style={s.sectionLabel}>Workout</Text>
        <View style={s.card}>
          <Row
            label="Rest Timer Default"
            value={`${state.restDefault}s`}
            onPress={() => { setTempRest(String(state.restDefault)); setRestModal(true); }}
          />
          <ToggleRow label="Apple Health Sync" value={state.health} onToggle={() => dispatch({ type: 'TOGGLE_HEALTH' })} />
        </View>

        {/* Premium */}
        <Text style={s.sectionLabel}>Subscription</Text>
        <View style={s.card}>
          <View style={r.row}>
            <Text style={r.label}>{state.premium ? '⭐ Premium Active' : 'Free Tier'}</Text>
            <TouchableOpacity
              style={[s.premiumBtn, state.premium && s.premiumBtnActive]}
              onPress={() => dispatch({ type: 'TOGGLE_PREMIUM' })}
            >
              <Text style={[s.premiumBtnText, state.premium && s.premiumBtnTextActive]}>
                {state.premium ? 'Downgrade (Demo)' : 'Upgrade (Demo)'}
              </Text>
            </TouchableOpacity>
          </View>
          {!state.premium && (
            <View style={s.premiumFeatures}>
              <Text style={s.premiumFeat}>✓ Full performance recall for every exercise</Text>
              <Text style={s.premiumFeat}>✓ Custom split builder</Text>
              <Text style={s.premiumFeat}>✓ Dropsets & supersets</Text>
              <Text style={s.premiumFeat}>✓ Progress photos + AI body analysis</Text>
              <Text style={s.premiumFeat}>✓ Reschedule workouts</Text>
            </View>
          )}
        </View>

        {/* Developer Tools */}
        <Text style={s.sectionLabel}>Developer Tools</Text>
        <View style={s.card}>
          <ToggleRow
            label="Dev Mode"
            value={state.devMode}
            onToggle={() => dispatch({ type: 'TOGGLE_DEV_MODE' })}
          />
          {state.devMode && (
            <>
              {/* Date offset */}
              <View style={s.devOffsetRow}>
                <Text style={s.devOffsetLabel}>Simulated date offset</Text>
                <Text style={s.devOffsetVal}>
                  {state.devOffset === 0
                    ? 'Today (real)'
                    : `${state.devOffset > 0 ? '+' : ''}${state.devOffset} day${Math.abs(state.devOffset) !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <View style={s.devBtns}>
                <TouchableOpacity
                  style={s.devBtn}
                  onPress={() => dispatch({ type: 'SET_DEV_OFFSET', payload: state.devOffset - 1 })}
                >
                  <Text style={s.devBtnText}>◀ Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.devBtn, state.devOffset === 0 && s.devBtnMuted]}
                  onPress={() => dispatch({ type: 'SET_DEV_OFFSET', payload: 0 })}
                >
                  <Text style={[s.devBtnText, state.devOffset === 0 && { color: C.textMut }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.devBtn}
                  onPress={() => dispatch({ type: 'SET_DEV_OFFSET', payload: state.devOffset + 1 })}
                >
                  <Text style={s.devBtnText}>Next ▶</Text>
                </TouchableOpacity>
              </View>

              {/* PPL test data */}
              <TouchableOpacity
                style={s.devActionBtn}
                onPress={() => {
                  const data = generatePPLTestData();
                  dispatch({ type: 'INJECT_TEST_DATA', payload: data });
                  Alert.alert('Done', `Generated ${data.length} PPL sessions. Week 2 has ~5% higher weights to trigger PRs.`);
                }}
              >
                <Text style={s.devActionText}>Generate PPL Test Data</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.devActionBtn, { borderColor: C.error, marginTop: 8 }]}
                onPress={() => Alert.alert('Clear history?', 'Removes all workout sessions.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: () => dispatch({ type: 'INJECT_TEST_DATA', payload: [] }) },
                ])}
              >
                <Text style={[s.devActionText, { color: C.error }]}>Clear All History</Text>
              </TouchableOpacity>

              {/* Photo analysis test */}
              <View style={s.devDivider} />
              <PhotoAnalysisTool />
            </>
          )}
        </View>

        <TouchableOpacity style={s.version} onPress={handleVersionTap} activeOpacity={1}>
          <Text style={s.versionText}>SBLftr v1.0.0</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Name Modal */}
      <Modal visible={nameModal} transparent animationType="fade" onRequestClose={() => setNameModal(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Edit Name</Text>
            <TextInput
              style={s.modalInput}
              value={tempName}
              onChangeText={setTempName}
              autoFocus
              returnKeyType="done"
              placeholderTextColor={C.textMut}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setNameModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalSave}
                onPress={() => {
                  if (tempName.trim()) dispatch({ type: 'SET_USER', payload: tempName.trim() });
                  setNameModal(false);
                }}
              >
                <Text style={s.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rest Timer Modal */}
      <Modal visible={restModal} transparent animationType="fade" onRequestClose={() => setRestModal(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Rest Timer (seconds)</Text>
            <TextInput
              style={s.modalInput}
              value={tempRest}
              onChangeText={setTempRest}
              keyboardType="number-pad"
              autoFocus
              returnKeyType="done"
              placeholderTextColor={C.textMut}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setRestModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalSave}
                onPress={() => {
                  const val = parseInt(tempRest, 10);
                  if (val > 0 && val <= 600) dispatch({ type: 'SET_REST_DEFAULT', payload: val });
                  setRestModal(false);
                }}
              >
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
  scroll: { padding: 20 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 24 },
  sectionLabel: {
    fontSize: 12, color: C.textSec, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
  },
  card: {
    backgroundColor: C.surface, borderRadius: 16,
    paddingHorizontal: 16, marginBottom: 20,
    borderWidth: 1, borderColor: C.border,
  },
  premiumBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.accent,
  },
  premiumBtnActive: { backgroundColor: C.surface, borderColor: C.border },
  premiumBtnText: { color: C.accent, fontSize: 12, fontWeight: '700' },
  premiumBtnTextActive: { color: C.textSec },
  premiumFeatures: { paddingBottom: 14, paddingTop: 4 },
  premiumFeat: { fontSize: 13, color: C.textSec, marginBottom: 4 },

  // Dev tools
  devOffsetRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  devOffsetLabel: { flex: 1, fontSize: 14, color: C.textSec },
  devOffsetVal: { fontSize: 14, fontWeight: '700', color: C.warning },
  devBtns: {
    flexDirection: 'row', gap: 8,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  devBtn: {
    flex: 1, backgroundColor: C.bg, borderRadius: 8,
    padding: 8, alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  devBtnText: { color: C.text, fontSize: 12, fontWeight: '600' },
  devBtnMuted: { opacity: 0.4 },
  devActionBtn: {
    marginTop: 10, padding: 11, borderRadius: 10,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.accent, alignItems: 'center',
  },
  devActionText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  devDivider: { height: 1, backgroundColor: C.border, marginVertical: 14 },

  // Shared modals
  version: { alignItems: 'center', paddingVertical: 20 },
  versionText: { fontSize: 13, color: C.textMut },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: C.surface, borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 16 },
  modalInput: {
    backgroundColor: C.bg, borderRadius: 10, padding: 14,
    color: C.text, fontSize: 16, borderWidth: 1, borderColor: C.border, marginBottom: 20,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  modalCancelText: { color: C.textSec, fontWeight: '600' },
  modalSave: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '700' },
});
