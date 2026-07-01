import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, KeyboardAvoidingView, Platform, Alert, Image,
  ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { useApp } from '../state/AppContext';
import { BUILT_IN_WORKOUTS, SPLIT_PRESETS } from '../data';
import { C } from '../theme';
import { OPENAI_API_KEY } from '../constants';
import { WorkoutDefinition, Exercise } from '../types';

const SCREEN_W = Dimensions.get('window').width;

const STEP_NAME      = 0;
const STEP_PHYSIQUE  = 1;
const STEP_LEVEL     = 2;
const STEP_STATS     = 3;
const STEP_OBSTACLES = 4;
const STEP_DAYS      = 5;
const STEP_PHOTO     = 6;
const STEP_LOADING   = 7;
const STEP_PAYWALL   = 8;
const TOTAL_INPUT_STEPS = 7;

type Physique = 'athletic' | 'aesthetic' | 'strongman';
type PaywallStage = 'pro' | 'discount' | 'trial';
type PaywallPhase = 'plan' | 'pricing';

const PHYSIQUES: { id: Physique; name: string; icon: string; sub: string; desc: string; color: string }[] = [
  {
    id: 'athletic',
    name: 'Athletic',
    icon: '⚡',
    sub: 'Like David Goggins',
    desc: 'Lean, functional, and relentlessly conditioned. Built for performance over aesthetics.',
    color: '#FF6B35',
  },
  {
    id: 'aesthetic',
    name: 'Aesthetic',
    icon: '🔱',
    sub: 'Like David Laid',
    desc: 'Sharp lines, balanced proportions, visible muscle with low body fat. The classic physique.',
    color: '#2196F3',
  },
  {
    id: 'strongman',
    name: 'Strongman',
    icon: '🏔️',
    sub: 'Like Eddie Hall',
    desc: 'Maximum size and strength. Built to move serious weight and dominate every lift.',
    color: '#9C27B0',
  },
];

const LEVELS = [
  { id: 'beginner',     label: 'Beginner',    sub: 'Under 6 months', icon: '🌱' },
  { id: 'novice',       label: 'Novice',       sub: '6–12 months',    icon: '📈' },
  { id: 'intermediate', label: 'Intermediate', sub: '1–3 years',      icon: '⚡' },
  { id: 'advanced',     label: 'Advanced',     sub: '3+ years',       icon: '🎯' },
];

const OBSTACLES = [
  { id: 'consistency', label: 'Staying consistent',     icon: '🔄' },
  { id: 'diet',        label: 'Dialling in my diet',    icon: '🥗' },
  { id: 'motivation',  label: 'Staying motivated',      icon: '🔋' },
  { id: 'time',        label: 'Finding time to train',  icon: '⏰' },
  { id: 'knowledge',   label: "Not knowing what to do", icon: '📚' },
  { id: 'recovery',    label: 'Recovery & injury risk', icon: '🩹' },
  { id: 'plateau',     label: 'Hitting a plateau',      icon: '📊' },
  { id: 'gym',         label: 'No gym access',          icon: '🏠' },
];

const DAY_OPTIONS = [3, 4, 5, 6];

// ─── Science-based split helpers ──────────────────────────────────────────────
function getSplitIdForDays(days: number): string {
  if (days <= 3) return 'fb3';
  if (days === 4) return 'ul-fb4';
  if (days === 5) return 'ul-fb5';
  return 'ul6';
}

function getSplitLabel(days: number): { name: string; note: string } {
  if (days <= 3) return { name: 'Full Body × 3', note: 'Every other day — 3× weekly frequency per muscle' };
  if (days === 4) return { name: 'Upper / Lower / Full Body / Full Body', note: '3× weekly frequency — optimal for intermediate lifters' };
  if (days === 5) return { name: 'Upper / Lower / Full Body / Upper / Lower', note: '3× frequency on major muscle groups' };
  return { name: 'Upper / Lower × 3', note: '2× weekly frequency — high volume approach' };
}

// ─── Physique-based exercise ordering ─────────────────────────────────────────
const PHYSIQUE_PRIORITY: Record<Physique, Record<string, string[]>> = {
  athletic: {
    upper: ['Lat Pulldown', 'Kelso Shrugs', 'Incline Smith Bench', 'Smith Shoulder Press', 'High to Low Close Grip Pulldown', 'Preacher Curl'],
    lower: ['Leg Press', 'SLDL', 'Leg Curl', 'Leg Extension', 'Hip Abduction', 'Calf Raises'],
    full:  ['Lat Pulldown', 'Incline Smith Bench', 'Leg Press', 'SLDL', 'Smith Shoulder Press', 'Kelso Shrugs'],
    push:  ['Incline Smith Bench', 'Smith Shoulder Press', 'Chest Fly', 'JM Press', 'Dumbbell Lateral Raises', 'Single Arm Tricep Extension'],
    pull:  ['Lat Pulldown', 'Kelso Shrugs', 'Close Grip Chest Supported Row', 'Incline Curl', 'Preacher Curl', 'Rear Delt Fly'],
  },
  aesthetic: {
    upper: ['Chest Fly', 'Incline Smith Bench', 'Dumbbell Lateral Raises', 'Lat Pulldown', 'Preacher Curl', 'Incline Curl'],
    lower: ['Leg Press', 'Leg Extension', 'SLDL', 'Leg Curl', 'Calf Raises', 'Hip Abduction'],
    full:  ['Incline Smith Bench', 'Lat Pulldown', 'Leg Press', 'Chest Fly', 'Dumbbell Lateral Raises', 'SLDL'],
    push:  ['Chest Fly', 'Incline Smith Bench', 'Dumbbell Lateral Raises', 'Smith Shoulder Press', 'JM Press', 'Single Arm Tricep Extension'],
    pull:  ['Lat Pulldown', 'Preacher Curl', 'Incline Curl', 'Close Grip Chest Supported Row', 'Kelso Shrugs', 'Rear Delt Fly'],
  },
  strongman: {
    upper: ['Incline Smith Bench', 'Kelso Shrugs', 'JM Press', 'High to Low Close Grip Pulldown', 'Smith Shoulder Press', 'Lat Pulldown'],
    lower: ['Leg Press', 'SLDL', 'Leg Curl', 'Leg Extension', 'Calf Raises', 'Hip Abduction'],
    full:  ['Leg Press', 'Incline Smith Bench', 'Kelso Shrugs', 'SLDL', 'High to Low Close Grip Pulldown', 'Smith Shoulder Press'],
    push:  ['Incline Smith Bench', 'Smith Shoulder Press', 'JM Press', 'Chest Fly', 'Single Arm Tricep Extension', 'Dumbbell Lateral Raises'],
    pull:  ['Kelso Shrugs', 'Lat Pulldown', 'Close Grip Chest Supported Row', 'High to Low Close Grip Pulldown', 'Preacher Curl', 'Rear Delt Fly'],
  },
};

function applyPhysiqueToWorkouts(physique: Physique): Record<string, WorkoutDefinition> {
  const priorities = PHYSIQUE_PRIORITY[physique];
  function reorder(exs: Exercise[], order: string[]): Exercise[] {
    const prioritised = order.map(n => exs.find(e => e.n === n)).filter(Boolean) as Exercise[];
    const rest = exs.filter(e => !order.includes(e.n));
    return [...prioritised, ...rest];
  }
  const result = { ...BUILT_IN_WORKOUTS };
  for (const key of ['push', 'pull', 'upper', 'lower', 'full'] as const) {
    if (result[key] && priorities[key]) {
      result[key] = { ...result[key], exercises: reorder(result[key].exercises, priorities[key]) };
    }
  }
  return result;
}

// ─── GPT call ─────────────────────────────────────────────────────────────────
async function buildPlan(params: {
  name: string;
  physique: Physique;
  experience: string;
  heightFeet: number;
  heightInches: number;
  weightLbs: number;
  days: number;
  frontPhotoBase64?: string;
  backPhotoBase64?: string;
}): Promise<string> {
  const physiqueMap: Record<Physique, string> = {
    athletic:  'Athletic / Functional (like David Goggins — lean, conditioned, performance-focused)',
    aesthetic: 'Aesthetic / Physique (like David Laid — balanced proportions, muscle definition, low body fat)',
    strongman: 'Powerhouse / Size (like Eddie Hall — maximum strength and muscle mass)',
  };

  const prompt = `You are an expert strength coach writing a personalised training analysis.

CLIENT PROFILE:
- Name: ${params.name}
- Dream Physique: ${physiqueMap[params.physique]}
- Experience Level: ${params.experience}
- Stats: ${params.heightFeet}'${params.heightInches}" | ${params.weightLbs} lbs
- Training Days Available: ${params.days} days/week
${params.frontPhotoBase64 ? '- Front-facing progress photo provided.' : ''}${params.backPhotoBase64 ? '\n- Rear-facing progress photo provided.' : ''}

CRITICAL FORMATTING RULES:
- Plain text only. No asterisks, no markdown, no bold, no dashes for bullets.
- Use only the bullet character • for lists.
- Use exactly the section headers below, in all caps, on their own line.

OVERVIEW
[One sentence: state exactly what this plan will accomplish for this specific person — tie together their physique goal, experience level, and stats. Direct, personal, motivating.]

CURRENT STRENGTHS
${params.frontPhotoBase64 || params.backPhotoBase64
  ? '• [What is visually well-developed in the photos — name the specific body part and what you see, e.g. "Strong, wide back with good lat flare"]\n• [Second specific strength visible in photos]'
  : '• [What they likely have going for them based on their experience level and body type — specific to their physique goal]\n• [Second inferred strength]'}

WHAT TO FOCUS ON
• [Most critical gap between their current physique and their dream physique — name the specific body part, e.g. "Arms need more size — biceps and triceps are underdeveloped relative to the rest of the body"]
• [Second specific area to prioritise, e.g. "Shoulders need more lateral delt work to create width"]
• [Third if relevant — be honest about fat distribution or lagging muscle groups]`;

  const content: object[] = [];
  if (params.frontPhotoBase64) {
    content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${params.frontPhotoBase64}`, detail: 'low' } });
  }
  if (params.backPhotoBase64) {
    content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${params.backPhotoBase64}`, detail: 'low' } });
  }
  content.push({ type: 'text', text: prompt });

  const hasPhotos = !!(params.frontPhotoBase64 || params.backPhotoBase64);
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: hasPhotos ? 'gpt-4o' : 'gpt-4o-mini',
      max_tokens: 500,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!resp.ok) throw new Error(`API ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Plan parser ──────────────────────────────────────────────────────────────
interface ParsedPlan {
  overview: string;
  strengths: string[];
  priorities: string[];
  split: string;
  obstacle: string;
  timeline: string;
}

function parsePlan(raw: string): ParsedPlan | null {
  if (!raw.trim()) return null;
  const clean = raw.replace(/\*\*/g, '').replace(/\*/g, '').trim();

  function extract(header: string, after: string[]): string {
    const start = clean.indexOf(header);
    if (start === -1) return '';
    let end = clean.length;
    for (const h of after) {
      const pos = clean.indexOf(h, start + header.length);
      if (pos !== -1 && pos < end) end = pos;
    }
    return clean.slice(start + header.length, end).trim();
  }

  const H = ['OVERVIEW', 'CURRENT STRENGTHS', 'WHAT TO FOCUS ON', 'RECOMMENDED SPLIT', 'OBSTACLE STRATEGY', 'REALISTIC TIMELINE'];
  const overview     = extract(H[0], H.slice(1));
  const strengthsRaw = extract(H[1], H.slice(2));
  const priRaw       = extract(H[2], H.slice(3));
  const split        = extract(H[3], H.slice(4));
  const obstacle     = extract(H[4], H.slice(5));
  const timeline     = extract(H[5], []);

  function parseBullets(raw: string): string[] {
    return raw
      .split('\n')
      .filter(l => l.trim().startsWith('•') || l.trim().startsWith('-'))
      .map(l => l.replace(/^[•\-]\s*/, '').trim())
      .filter(Boolean);
  }

  const strengths  = parseBullets(strengthsRaw);
  const priorities = parseBullets(priRaw);

  return { overview, strengths, priorities, split, obstacle, timeline };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  const pct = ((step + 1) / (TOTAL_INPUT_STEPS + 1)) * 100;
  return (
    <View style={pb.wrap}>
      <View style={pb.track}><View style={[pb.fill, { width: `${pct}%` as any }]} /></View>
      <Text style={pb.label}>{step + 1} / {TOTAL_INPUT_STEPS + 1}</Text>
    </View>
  );
}
const pb = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  track: { flex: 1, height: 3, backgroundColor: C.border, borderRadius: 2 },
  fill:  { height: 3, backgroundColor: C.accent, borderRadius: 2 },
  label: { fontSize: 11, color: C.textMut, fontWeight: '600', minWidth: 36 },
});

function NavRow({ onBack, onNext, nextLabel = 'Continue →', nextDisabled = false }: {
  onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean;
}) {
  return (
    <View style={nb.row}>
      {onBack ? (
        <TouchableOpacity style={nb.back} onPress={onBack}>
          <Text style={nb.backText}>← Back</Text>
        </TouchableOpacity>
      ) : <View style={{ width: 60 }} />}
      <TouchableOpacity style={[nb.next, nextDisabled && nb.nextDisabled]} onPress={onNext} disabled={nextDisabled} activeOpacity={0.85}>
        <Text style={nb.nextText}>{nextLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
const nb = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingBottom: 20 },
  back:         { width: 60 },
  backText:     { color: C.textSec, fontSize: 15 },
  next:         { flex: 1, backgroundColor: C.accent, borderRadius: 14, padding: 16, alignItems: 'center' },
  nextDisabled: { opacity: 0.35 },
  nextText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});

function PhotoSlot({ label, hint, uri, loading, onPress, onRemove }: {
  label: string; hint: string; uri: string | null; loading?: boolean; onPress: () => void; onRemove: () => void;
}) {
  return (
    <View style={ph.wrap}>
      <TouchableOpacity
        style={[ph.slot, !!uri && ph.filled, loading && ph.slotLoading]}
        onPress={onPress}
        activeOpacity={0.75}
        disabled={loading}
      >
        {loading ? (
          <View style={ph.empty}>
            <ActivityIndicator color={C.accent} size="small" />
            <Text style={[ph.emptyLabel, { marginTop: 8, color: C.accent }]}>Opening…</Text>
          </View>
        ) : uri ? (
          <Image source={{ uri }} style={ph.img} />
        ) : (
          <View style={ph.empty}>
            <Text style={ph.emptyIcon}>📸</Text>
            <Text style={ph.emptyLabel}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={ph.hint}>{hint}</Text>
      {uri && <TouchableOpacity onPress={onRemove}><Text style={ph.remove}>Remove</Text></TouchableOpacity>}
    </View>
  );
}
const ph = StyleSheet.create({
  wrap:      { flex: 1, alignItems: 'center' },
  slot:      { width: '100%', aspectRatio: 3 / 4, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.border, overflow: 'hidden', marginBottom: 6 },
  filled:    { borderStyle: 'solid', borderColor: C.accent },
  slotLoading: { borderStyle: 'solid', borderColor: C.accent, opacity: 0.7 },
  img:       { width: '100%', height: '100%', resizeMode: 'cover' },
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  emptyIcon: { fontSize: 28 },
  emptyLabel:{ fontSize: 13, color: C.textSec, fontWeight: '700' },
  hint:      { fontSize: 11, color: C.textMut, textAlign: 'center', marginBottom: 4 },
  remove:    { fontSize: 11, color: C.error },
});

function PlanSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <View style={pl.card}>
      <View style={pl.hdr}>
        <Text style={pl.icon}>{icon}</Text>
        <Text style={pl.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const pl = StyleSheet.create({
  card:  { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  hdr:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  icon:  { fontSize: 16 },
  title: { fontSize: 11, fontWeight: '800', color: C.accent, letterSpacing: 0.5, textTransform: 'uppercase' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { dispatch } = useApp();

  const [step, setStep]             = useState(STEP_NAME);
  const [name, setName]             = useState('');
  const [physique, setPhysique]     = useState<Physique | null>(null);
  const [experience, setExperience] = useState('');
  const [hFeet, setHFeet]           = useState('');
  const [hInches, setHInches]       = useState('');
  const [wLbs, setWLbs]             = useState('');
  const [obstacles, setObstacles]   = useState<string[]>([]);
  const [days, setDays]             = useState<number | null>(null);
  const [frontUri, setFrontUri]     = useState<string | null>(null);
  const [backUri, setBackUri]       = useState<string | null>(null);
  const [planText, setPlanText]     = useState('');
  const [planError, setPlanError]   = useState(false);
  const [paywallStage, setPaywallStage] = useState<PaywallStage>('pro');
  const [pickingSide, setPickingSide]   = useState<'front' | 'back' | null>(null);
  const [paywallPhase, setPaywallPhase] = useState<PaywallPhase>('plan');

  const dotAnim = useRef(new Animated.Value(0)).current;
  const loadingMsgs = [
    'Analysing your profile…',
    'Mapping priority muscles for your physique goal…',
    'Building your split recommendation…',
    'Finalising your personalised plan…',
  ];
  const [loadMsgIdx, setLoadMsgIdx] = useState(0);

  // Pre-request photo permissions so the first tap on the photo step is instant
  useEffect(() => {
    if (step === STEP_PHOTO - 1) {
      ImagePicker.requestMediaLibraryPermissionsAsync();
    }
  }, [step]);

  // Trigger GPT when entering loading step
  useEffect(() => {
    if (step !== STEP_LOADING) return;

    const msgInterval = setInterval(() => setLoadMsgIdx(i => (i + 1) % loadingMsgs.length), 1800);

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    (async () => {
      try {
        let frontB64: string | undefined;
        let backB64: string | undefined;
        if (frontUri) frontB64 = await readAsStringAsync(frontUri, { encoding: EncodingType.Base64 });
        if (backUri)  backB64  = await readAsStringAsync(backUri,  { encoding: EncodingType.Base64 });

        const result = await buildPlan({
          name: name.trim(),
          physique: physique!,
          experience,
          heightFeet:   parseInt(hFeet)   || 0,
          heightInches: parseInt(hInches) || 0,
          weightLbs:    parseInt(wLbs)    || 0,
          days: days!,
          frontPhotoBase64: frontB64,
          backPhotoBase64:  backB64,
        });
        setPlanText(result);
      } catch {
        setPlanError(true);
      } finally {
        clearInterval(msgInterval);
        setStep(STEP_PAYWALL);
      }
    })();

    return () => clearInterval(msgInterval);
  }, [step]);

  function toggleObstacle(id: string) {
    setObstacles(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]);
  }

  async function pickPhoto(side: 'front' | 'back') {
    setPickingSide(side);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access in Settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.5,
      });
      if (!result.canceled && result.assets[0]) {
        if (side === 'front') setFrontUri(result.assets[0].uri);
        else setBackUri(result.assets[0].uri);
      }
    } finally {
      setPickingSide(null);
    }
  }

  function finishOnboarding(premium: boolean) {
    const workouts = applyPhysiqueToWorkouts(physique!);

    let preset;
    if (premium) {
      // Pro users get their science-based personalized split
      const scienceId = getSplitIdForDays(days!);
      preset = SPLIT_PRESETS.find(sp => sp.id === scienceId)!;
    } else {
      // Free users get PPL ×2 (5+ days) or UL ×2 (≤4 days) — no personalized split
      const classicId = (days ?? 3) >= 5 ? 'ppl' : 'ul';
      preset = SPLIT_PRESETS.find(sp => sp.id === classicId)!;
    }

    dispatch({ type: 'SET_USER', payload: name.trim() });
    dispatch({
      type: 'SETUP_PROFILE',
      payload: {
        physique: physique!,
        experience,
        frequency:      days!,
        heightFeet:     parseInt(hFeet)   || 0,
        heightInches:   parseInt(hInches) || 0,
        weightLbs:      parseInt(wLbs)    || 0,
        obstacles,
        onboardingPhotoUri: frontUri,
        gptPlan: planText || null,
        personalizedSplitId: premium ? preset.id : null,
      },
    });
    dispatch({ type: 'SET_SPLIT', payload: { id: preset.id, defaultSchedule: preset.defaultSchedule, workouts } });
    dispatch({ type: 'SET_PREMIUM', payload: premium });
  }

  const physiqueData  = physique ? PHYSIQUES.find(p => p.id === physique)! : null;
  const physiqueColor = physiqueData?.color ?? C.accent;
  const parsed        = parsePlan(planText);
  const splitInfo     = days ? getSplitLabel(days) : null;
  const scienceSchedule = days
    ? (SPLIT_PRESETS.find(sp => sp.id === getSplitIdForDays(days))?.defaultSchedule ?? [])
    : [];

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {step < STEP_LOADING && <Text style={s.logo}>SBLftr</Text>}
          {step <= STEP_PHOTO  && <ProgressBar step={step} />}

          {/* ── STEP 0: Name ── */}
          {step === STEP_NAME && (
            <View>
              <Text style={s.title}>What's your name?</Text>
              <Text style={s.sub}>Let's make this personal.</Text>
              <TextInput
                style={s.nameInput}
                placeholder="Your name"
                placeholderTextColor={C.textMut}
                value={name}
                onChangeText={setName}
                autoFocus
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => name.trim() && setStep(STEP_PHYSIQUE)}
              />
              <NavRow onNext={() => setStep(STEP_PHYSIQUE)} nextDisabled={!name.trim()} />
            </View>
          )}

          {/* ── STEP 1: Dream Physique ── */}
          {step === STEP_PHYSIQUE && (
            <View>
              <Text style={s.title}>What's your dream physique, {name}?</Text>
              <Text style={s.sub}>This determines your training priorities, split, and starting exercises.</Text>
              {PHYSIQUES.map(ph => (
                <TouchableOpacity
                  key={ph.id}
                  style={[s.physiqueCard, physique === ph.id && { borderColor: ph.color, backgroundColor: ph.color + '18' }]}
                  onPress={() => setPhysique(ph.id)}
                  activeOpacity={0.8}
                >
                  <Text style={s.physiqueIcon}>{ph.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[s.physiqueName, physique === ph.id && { color: ph.color }]}>{ph.name}</Text>
                      <Text style={[s.physiqueSub, physique === ph.id && { color: ph.color }]}>{ph.sub}</Text>
                    </View>
                    <Text style={s.physiqueDesc}>{ph.desc}</Text>
                  </View>
                  <View style={[s.radio, physique === ph.id && { borderColor: ph.color, backgroundColor: ph.color }]} />
                </TouchableOpacity>
              ))}
              <NavRow onBack={() => setStep(STEP_NAME)} onNext={() => setStep(STEP_LEVEL)} nextDisabled={!physique} />
            </View>
          )}

          {/* ── STEP 2: Lifting Level ── */}
          {step === STEP_LEVEL && (
            <View>
              <Text style={s.title}>How long have you been lifting?</Text>
              <Text style={s.sub}>Calibrates the intensity and progression of your plan.</Text>
              {LEVELS.map(lv => (
                <TouchableOpacity
                  key={lv.id}
                  style={[s.optionCard, experience === lv.id && s.optionCardActive]}
                  onPress={() => setExperience(lv.id)}
                  activeOpacity={0.8}
                >
                  <Text style={s.optionIcon}>{lv.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionLabel, experience === lv.id && s.optionLabelActive]}>{lv.label}</Text>
                    <Text style={s.optionSub}>{lv.sub}</Text>
                  </View>
                  <View style={[s.radio, experience === lv.id && s.radioActive]} />
                </TouchableOpacity>
              ))}
              <NavRow onBack={() => setStep(STEP_PHYSIQUE)} onNext={() => setStep(STEP_STATS)} nextDisabled={!experience} />
            </View>
          )}

          {/* ── STEP 3: Height & Weight ── */}
          {step === STEP_STATS && (
            <View>
              <Text style={s.title}>Height & Weight</Text>
              <Text style={s.sub}>Used to calibrate starting loads and track body composition over time.</Text>
              <Text style={s.fieldLabel}>HEIGHT</Text>
              <View style={s.heightRow}>
                <View style={s.heightField}>
                  <TextInput style={s.statInput} placeholder="5" placeholderTextColor={C.textMut} value={hFeet} onChangeText={setHFeet} keyboardType="number-pad" maxLength={1} />
                  <Text style={s.statUnit}>ft</Text>
                </View>
                <View style={s.heightField}>
                  <TextInput style={s.statInput} placeholder="10" placeholderTextColor={C.textMut} value={hInches} onChangeText={setHInches} keyboardType="number-pad" maxLength={2} />
                  <Text style={s.statUnit}>in</Text>
                </View>
              </View>
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>WEIGHT</Text>
              <View style={s.weightRow}>
                <TextInput style={[s.statInput, { flex: 1 }]} placeholder="175" placeholderTextColor={C.textMut} value={wLbs} onChangeText={setWLbs} keyboardType="number-pad" maxLength={3} />
                <Text style={s.statUnit}>lbs</Text>
              </View>
              <NavRow onBack={() => setStep(STEP_LEVEL)} onNext={() => setStep(STEP_OBSTACLES)} nextDisabled={!hFeet || !wLbs} />
            </View>
          )}

          {/* ── STEP 4: Obstacles ── */}
          {step === STEP_OBSTACLES && (
            <View>
              <Text style={s.title}>What's holding you back?</Text>
              <Text style={s.sub}>Select all that apply — your plan will directly address these.</Text>
              <View style={s.obstacleGrid}>
                {OBSTACLES.map(ob => {
                  const active = obstacles.includes(ob.id);
                  return (
                    <TouchableOpacity
                      key={ob.id}
                      style={[s.obstacleChip, active && s.obstacleChipActive]}
                      onPress={() => toggleObstacle(ob.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.obstacleIcon}>{ob.icon}</Text>
                      <Text style={[s.obstacleLabel, active && s.obstacleLabelActive]}>{ob.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <NavRow onBack={() => setStep(STEP_STATS)} onNext={() => setStep(STEP_DAYS)} nextDisabled={obstacles.length === 0} />
            </View>
          )}

          {/* ── STEP 5: Days per week ── */}
          {step === STEP_DAYS && (
            <View>
              <Text style={s.title}>How many days can you train?</Text>
              <Text style={s.sub}>Be realistic — 4 consistent days beats 6 irregular ones.</Text>
              <View style={s.daysRow}>
                {DAY_OPTIONS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[s.dayBtn, days === d && s.dayBtnActive]}
                    onPress={() => setDays(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.dayNum, days === d && s.dayNumActive]}>{d}</Text>
                    <Text style={[s.dayWord, days === d && { color: C.accent }]}>days</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <NavRow onBack={() => setStep(STEP_OBSTACLES)} onNext={() => setStep(STEP_PHOTO)} nextDisabled={days === null} />
            </View>
          )}

          {/* ── STEP 6: Photos ── */}
          {step === STEP_PHOTO && (
            <View>
              <Text style={s.title}>Progress photos</Text>
              <Text style={s.sub}>Optional — GPT uses both to give specific body composition feedback.</Text>

              <View style={s.instrCard}>
                <Text style={s.instrTitle}>How to take your photos</Text>
                <Text style={s.instrBody}>
                  Find a bathroom or clear wall. Set your phone on a counter or ledge and use your camera timer (3–10 sec) so your hands are free.
                </Text>
                <View style={s.instrRow}>
                  <View style={s.instrDot} />
                  <Text style={s.instrItem}>
                    <Text style={s.instrBold}>Front photo: </Text>
                    Face the camera with arms relaxed at your sides or flex both biceps overhead.
                  </Text>
                </View>
                <View style={s.instrRow}>
                  <View style={s.instrDot} />
                  <Text style={s.instrItem}>
                    <Text style={s.instrBold}>Back photo: </Text>
                    Turn around and hit a rear double bicep — pull elbows back and down, fists up. Flex your back and arms as hard as possible.
                  </Text>
                </View>
              </View>

              <View style={s.photoSlots}>
                <PhotoSlot label="Front" hint="Facing camera" uri={frontUri} loading={pickingSide === 'front'} onPress={() => !pickingSide && pickPhoto('front')} onRemove={() => setFrontUri(null)} />
                <View style={{ width: 12 }} />
                <PhotoSlot label="Back" hint="Rear double bicep" uri={backUri} loading={pickingSide === 'back'} onPress={() => !pickingSide && pickPhoto('back')} onRemove={() => setBackUri(null)} />
              </View>

              <NavRow
                onBack={() => setStep(STEP_DAYS)}
                onNext={() => setStep(STEP_LOADING)}
                nextLabel={(frontUri || backUri) ? 'Build My Plan →' : 'Skip & Build Plan →'}
              />
            </View>
          )}

          {/* ── STEP 7: Loading ── */}
          {step === STEP_LOADING && (
            <View style={s.loadingWrap}>
              <Animated.Text style={[s.loadingLogo, { opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]}>
                SBLftr
              </Animated.Text>
              <ActivityIndicator color={C.accent} size="large" style={{ marginVertical: 28 }} />
              <Text style={s.loadingMsg}>{loadingMsgs[loadMsgIdx]}</Text>
              <Text style={s.loadingHint}>
                GPT-4o{(frontUri || backUri) ? ' (with your photos)' : ''} is building your plan…
              </Text>
            </View>
          )}

          {/* ── STEP 8: Paywall ── */}
          {step === STEP_PAYWALL && (
            <View style={s.paywallWrap}>

              {/* Identity header */}
              <View style={[s.identityCard, { borderColor: physiqueColor }]}>
                <Text style={s.identityGreeting}>
                  {paywallPhase === 'plan'
                    ? `Your plan is ready, ${name}.`
                    : paywallStage === 'pro'
                      ? `Load it into the app, ${name}.`
                      : paywallStage === 'discount'
                        ? 'One more thing…'
                        : 'Start free today.'}
                </Text>
                {physiqueData && (
                  <View style={[s.physBadge, { backgroundColor: physiqueColor + '22', borderColor: physiqueColor }]}>
                    <Text style={[s.physBadgeText, { color: physiqueColor }]}>
                      {physiqueData.icon} {physiqueData.name} Build · {days} days/week
                    </Text>
                  </View>
                )}
              </View>

              {/* ── Plan Phase: show overview + combined split+priorities + Continue ── */}
              {paywallPhase === 'plan' && (
                <>
                  {parsed ? (
                    <>
                      {parsed.overview ? (
                        <PlanSection icon="🎯" title="Your profile">
                          <Text style={s.planText}>
                            {parsed.overview.replace(/^([^.!?]*[.!?])[\s\S]*$/, '$1').trim()}
                          </Text>
                        </PlanSection>
                      ) : null}

                      {parsed.strengths.length > 0 && (
                        <PlanSection icon="✅" title="Current strengths">
                          {parsed.strengths.map((str, i) => (
                            <View key={i} style={s.priorityRow}>
                              <View style={[s.priorityDot, { backgroundColor: '#4CAF50' }]} />
                              <View style={{ flex: 1 }}>
                                <Text style={s.priorityMuscle}>{str}</Text>
                              </View>
                            </View>
                          ))}
                        </PlanSection>
                      )}

                      {(scienceSchedule.length > 0 || parsed.priorities.length > 0) ? (
                        <PlanSection icon="💪" title="What to focus on">
                          {/* Schedule chips first */}
                          <View style={s.scheduleChips}>
                            {scienceSchedule.map((key, i) => (
                              <View key={i} style={[s.schedChip, key === 'rest' && s.schedChipRest]}>
                                <Text style={[s.schedChipText, key === 'rest' && s.schedChipRestText]}>
                                  {key === 'rest' ? 'Rest' : key.charAt(0).toUpperCase() + key.slice(1)}
                                </Text>
                              </View>
                            ))}
                          </View>
                          {/* Focus areas below */}
                          {parsed.priorities.length > 0 && (
                            <View style={{ marginTop: 10 }}>
                              {parsed.priorities.map((p, i) => {
                                const dashIdx = p.indexOf('—');
                                const muscle  = dashIdx > -1 ? p.slice(0, dashIdx).trim() : p;
                                const reason  = dashIdx > -1 ? p.slice(dashIdx + 1).trim() : '';
                                return (
                                  <View key={i} style={s.priorityRow}>
                                    <View style={[s.priorityDot, { backgroundColor: physiqueColor }]} />
                                    <View style={{ flex: 1 }}>
                                      <Text style={s.priorityMuscle}>{muscle}</Text>
                                      {reason ? <Text style={s.priorityReason}>{reason}</Text> : null}
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </PlanSection>
                      ) : null}
                    </>
                  ) : planError ? (
                    <View style={[pl.card, { marginBottom: 10 }]}>
                      <Text style={s.planText}>
                        Based on your {physiqueData?.name.toLowerCase()} goal and {days} training days, your personalised plan has been prepared.
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[s.ctaBtn, { backgroundColor: physiqueColor, marginTop: 12 }]}
                    onPress={() => setPaywallPhase('pricing')}
                    activeOpacity={0.85}
                  >
                    <Text style={s.ctaBtnText}>Continue →</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── Pricing Phase ── */}
              {paywallPhase === 'pricing' && (
                <>
                  {/* Pro */}
                  {paywallStage === 'pro' && (
                    <View style={s.pricingCard}>
                      <View style={s.pricingBadge}><Text style={s.pricingBadgeText}>LOAD PLAN INTO APP</Text></View>
                      <Text style={s.pricingPrice}>$9.99<Text style={s.pricingPer}>/month</Text></Text>
                      <Text style={s.pricingName}>SBLftr Pro</Text>
                      {[
                        `Your AI plan loaded immediately with ${physiqueData?.name}-optimised exercise order`,
                        `${splitInfo?.name} built directly into your weekly schedule`,
                        'Full performance recall for every exercise every session',
                        'Custom split builder — any structure, any day name',
                        'Progress photo AI analysis with monthly check-in',
                      ].map((f, i) => (
                        <View key={i} style={s.featureRow}>
                          <Text style={s.featureCheck}>✓</Text>
                          <Text style={s.featureText}>{f}</Text>
                        </View>
                      ))}
                      <TouchableOpacity style={[s.ctaBtn, { backgroundColor: physiqueColor }]} onPress={() => finishOnboarding(true)} activeOpacity={0.85}>
                        <Text style={s.ctaBtnText}>Load My Plan — $9.99/month</Text>
                        <Text style={s.ctaBtnSub}>Cancel anytime · Stripe secured</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.declineBtn} onPress={() => setPaywallStage('discount')}>
                        <Text style={s.declineBtnText}>Maybe later</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Discount */}
                  {paywallStage === 'discount' && (
                    <View style={s.pricingCard}>
                      <View style={[s.pricingBadge, { backgroundColor: '#4CAF5018', borderColor: '#4CAF50' }]}>
                        <Text style={[s.pricingBadgeText, { color: '#4CAF50' }]}>LIMITED OFFER</Text>
                      </View>
                      <Text style={s.pricingPrice}>$4.99<Text style={s.pricingPer}>/month</Text></Text>
                      <Text style={s.pricingName}>Pro — First 3 Months</Text>
                      <Text style={s.discountNote}>Then $9.99/month. Cancel anytime.</Text>
                      {[
                        'Everything in Pro at half price for 90 days',
                        'Your AI plan loaded immediately',
                        'Cancel before month 4 and pay nothing more',
                      ].map((f, i) => (
                        <View key={i} style={s.featureRow}>
                          <Text style={s.featureCheck}>✓</Text>
                          <Text style={s.featureText}>{f}</Text>
                        </View>
                      ))}
                      <TouchableOpacity style={[s.ctaBtn, { backgroundColor: '#4CAF50' }]} onPress={() => finishOnboarding(true)} activeOpacity={0.85}>
                        <Text style={s.ctaBtnText}>Get 3 Months for $4.99</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.declineBtn} onPress={() => setPaywallStage('trial')}>
                        <Text style={s.declineBtnText}>No thanks</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Free trial */}
                  {paywallStage === 'trial' && (
                    <View style={s.pricingCard}>
                      <Text style={s.freeTitle}>Your free plan</Text>
                      <Text style={s.freeSub}>
                        You'll start on the {splitInfo?.name} for your {days} training days, set up for your {physiqueData?.name.toLowerCase()} physique goal.
                      </Text>
                      <View style={s.scheduleChips}>
                        {scienceSchedule.map((key, i) => (
                          <View key={i} style={[s.schedChip, key === 'rest' && s.schedChipRest]}>
                            <Text style={[s.schedChipText, key === 'rest' && s.schedChipRestText]}>
                              {key === 'rest' ? 'Rest' : key.charAt(0).toUpperCase() + key.slice(1)}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <View style={s.proCompare}>
                        <Text style={s.proCompareTitle}>Upgrade to Pro to unlock:</Text>
                        <Text style={s.proCompareText}>
                          Performance recall for all exercises · Progress photo AI analysis · Custom split builder
                        </Text>
                      </View>
                      <TouchableOpacity style={s.ctaBtn} onPress={() => finishOnboarding(false)} activeOpacity={0.85}>
                        <Text style={s.ctaBtnText}>Start Free</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.ctaBtn, { backgroundColor: physiqueColor, marginTop: 10 }]} onPress={() => finishOnboarding(true)} activeOpacity={0.85}>
                        <Text style={s.ctaBtnText}>Actually, get Pro →</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={s.paywallFooter}>Stripe-secured payments · Cancel anytime · No hidden fees</Text>
                </>
              )}

            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 36 },
  logo:   { fontSize: 30, fontWeight: '800', color: C.accent, marginBottom: 16, letterSpacing: 1 },
  title:  { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 6, lineHeight: 32 },
  sub:    { fontSize: 14, color: C.textSec, marginBottom: 22, lineHeight: 20 },

  nameInput: {
    backgroundColor: C.surface, borderRadius: 14, padding: 18,
    fontSize: 22, color: C.text, borderWidth: 1, borderColor: C.border,
  },

  physiqueCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1.5, borderColor: C.border,
  },
  physiqueIcon: { fontSize: 26, marginTop: 2 },
  physiqueName: { fontSize: 17, fontWeight: '800', color: C.text },
  physiqueSub:  { fontSize: 12, color: C.textMut, fontWeight: '600' },
  physiqueDesc: { fontSize: 13, color: C.textSec, marginTop: 4, lineHeight: 18 },

  optionCard:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  optionCardActive:  { borderColor: C.accent, backgroundColor: C.accentDim },
  optionIcon:        { fontSize: 22, width: 28, textAlign: 'center' },
  optionLabel:       { fontSize: 16, fontWeight: '700', color: C.text },
  optionLabelActive: { color: C.accent },
  optionSub:         { fontSize: 12, color: C.textSec },
  radio:      { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.textMut },
  radioActive:{ borderColor: C.accent, backgroundColor: C.accent },

  fieldLabel:  { fontSize: 11, color: C.textSec, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  heightRow:   { flexDirection: 'row', gap: 12 },
  heightField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  weightRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statInput: {
    flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 16,
    fontSize: 22, fontWeight: '700', color: C.text,
    borderWidth: 1, borderColor: C.border, textAlign: 'center',
  },
  statUnit: { fontSize: 16, color: C.textSec, fontWeight: '600', minWidth: 24 },

  obstacleGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  obstacleChip:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border, width: (SCREEN_W - 48 - 10) / 2 },
  obstacleChipActive:  { borderColor: C.accent, backgroundColor: C.accentDim },
  obstacleIcon:        { fontSize: 16 },
  obstacleLabel:       { fontSize: 12, color: C.textSec, fontWeight: '600', flex: 1 },
  obstacleLabelActive: { color: C.accent },

  daysRow:           { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dayBtn:            { flex: 1, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  dayBtnActive:      { borderColor: C.accent, backgroundColor: C.accentDim },
  dayNum:            { fontSize: 28, fontWeight: '800', color: C.text },
  dayNumActive:      { color: C.accent },
  dayWord:           { fontSize: 11, color: C.textSec, marginTop: 2 },
  splitPreviewCard:  { backgroundColor: C.accentDim, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.accent, marginBottom: 8 },
  splitPreviewTag:   { fontSize: 10, color: C.accent, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  splitPreviewName:  { fontSize: 14, color: C.text, fontWeight: '700' },
  splitPreviewNote:  { fontSize: 12, color: C.textSec, marginTop: 2 },

  instrCard:  { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  instrTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 8 },
  instrBody:  { fontSize: 12, color: C.textSec, lineHeight: 18, marginBottom: 10 },
  instrRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  instrDot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: C.accent, marginTop: 7 },
  instrItem:  { flex: 1, fontSize: 12, color: C.textSec, lineHeight: 18 },
  instrBold:  { fontWeight: '700', color: C.text },
  photoSlots: { flexDirection: 'row', marginBottom: 4 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingLogo: { fontSize: 42, fontWeight: '800', color: C.accent, letterSpacing: 2 },
  loadingMsg:  { fontSize: 16, color: C.text, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  loadingHint: { fontSize: 12, color: C.textMut, textAlign: 'center' },

  paywallWrap: { paddingBottom: 30 },
  identityCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 18,
    marginBottom: 12, borderWidth: 1,
  },
  identityGreeting: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 },
  physBadge: {
    alignSelf: 'flex-start', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1,
  },
  physBadgeText: { fontSize: 13, fontWeight: '700' },

  planText:       { fontSize: 13, color: C.text, lineHeight: 20 },
  priorityRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  priorityDot:    { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  priorityMuscle: { fontSize: 14, fontWeight: '700', color: C.text },
  priorityReason: { fontSize: 12, color: C.textSec, lineHeight: 17, marginTop: 2 },

  scheduleChips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  schedChip:        { backgroundColor: C.accentDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.accent },
  schedChipRest:    { backgroundColor: C.surface, borderColor: C.border },
  schedChipText:    { fontSize: 11, color: C.accent, fontWeight: '700' },
  schedChipRestText:{ color: C.textMut },

  lockedCard: { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  lockedText: { fontSize: 12, color: C.accent, fontWeight: '700' },

  pricingCard:      { backgroundColor: C.surface, borderRadius: 18, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  pricingBadge:     { alignSelf: 'flex-start', backgroundColor: C.accentDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.accent, marginBottom: 12 },
  pricingBadgeText: { fontSize: 10, color: C.accent, fontWeight: '800', letterSpacing: 0.5 },
  pricingPrice:     { fontSize: 38, fontWeight: '800', color: C.text },
  pricingPer:       { fontSize: 16, color: C.textSec, fontWeight: '400' },
  pricingName:      { fontSize: 14, color: C.textSec, fontWeight: '600', marginBottom: 14 },
  discountNote:     { fontSize: 12, color: C.textMut, marginBottom: 14 },
  featureRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  featureCheck:     { fontSize: 14, color: '#4CAF50', fontWeight: '800', marginTop: 1 },
  featureText:      { flex: 1, fontSize: 13, color: C.text, lineHeight: 18 },
  ctaBtn:           { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  ctaBtnText:       { color: '#fff', fontSize: 16, fontWeight: '800' },
  ctaBtnSub:        { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 3 },
  declineBtn:       { alignItems: 'center', paddingVertical: 14 },
  declineBtnText:   { color: C.textSec, fontSize: 14 },

  freeTitle:        { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 4 },
  freeSub:          { fontSize: 13, color: C.textSec, marginBottom: 14, lineHeight: 18 },
  proCompare:       { backgroundColor: C.accentDim, borderRadius: 12, padding: 12, marginTop: 12, marginBottom: 4, borderWidth: 1, borderColor: C.accent },
  proCompareTitle:  { fontSize: 12, color: C.accent, fontWeight: '800', marginBottom: 4 },
  proCompareText:   { fontSize: 12, color: C.text, lineHeight: 18 },

  paywallFooter: { fontSize: 11, color: C.textMut, textAlign: 'center', marginTop: 8 },
});
