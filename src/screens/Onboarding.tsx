import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useApp } from '../state/AppContext';
import { SPLIT_PRESETS } from '../data';
import { C } from '../theme';

// ─── Step data ────────────────────────────────────────────────────────────────

const GOALS = [
  { id: 'muscle',   label: 'Build Muscle',   icon: '💪', desc: 'Maximise hypertrophy and size' },
  { id: 'strength', label: 'Get Stronger',    icon: '🏋️', desc: 'Focus on progressive overload' },
  { id: 'fat',      label: 'Lose Body Fat',   icon: '🔥', desc: 'Burn fat while keeping muscle' },
  { id: 'fitness',  label: 'Stay Active',     icon: '🏃', desc: 'General health and consistency' },
];

const EXPERIENCE = [
  { id: 'beginner',     label: 'Just Starting',   icon: '🌱', desc: 'Less than 6 months of lifting' },
  { id: 'novice',       label: 'Getting Dialled', icon: '📈', desc: '6 months – 1 year of training' },
  { id: 'intermediate', label: 'Been at It',       icon: '⚡', desc: '1 – 3 years of consistent lifting' },
  { id: 'advanced',     label: 'Experienced',      icon: '🎯', desc: '3+ years, know the basics cold' },
];

const FREQUENCY = [
  { id: 3, label: '3 days', icon: '📅', desc: 'Mon / Wed / Fri' },
  { id: 4, label: '4 days', icon: '📅', desc: 'Mon / Tue / Thu / Fri' },
  { id: 5, label: '5 days', icon: '📅', desc: 'Mon – Fri' },
  { id: 6, label: '6 days', icon: '📅', desc: 'Mon – Sat' },
];

const SLEEP = [
  { id: 'under6', label: 'Under 6 hours', icon: '😴', desc: 'Recovery may be limiting your gains' },
  { id: '6to7',   label: '6 – 7 hours',   icon: '🌙', desc: 'Slightly below optimal for lifters' },
  { id: '7to8',   label: '7 – 8 hours',   icon: '⭐', desc: 'In the sweet spot for muscle repair' },
  { id: '8plus',  label: '8+ hours',       icon: '💤', desc: 'Elite recovery — keep it up' },
];

const LIFESTYLE = [
  { id: 'student', label: 'Student',         icon: '📚', desc: 'Flexible schedule, can train any time' },
  { id: 'working', label: 'Full-time work',  icon: '💼', desc: 'Structured days, mornings or evenings' },
  { id: 'busy',    label: 'Always on the go',icon: '🏃', desc: 'Need short, high-impact sessions' },
  { id: 'mixed',   label: 'It varies',       icon: '🔄', desc: 'Schedule changes week to week' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function OptionCard<T extends string | number>({
  item, selected, onSelect,
}: {
  item: { id: T; label: string; icon: string; desc: string };
  selected: boolean;
  onSelect: (id: T) => void;
}) {
  return (
    <TouchableOpacity
      style={[s.option, selected && s.optionActive]}
      onPress={() => onSelect(item.id)}
      activeOpacity={0.8}
    >
      <Text style={s.optionIcon}>{item.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.optionLabel, selected && s.optionLabelActive]}>{item.label}</Text>
        <Text style={s.optionDesc}>{item.desc}</Text>
      </View>
      <View style={[s.radio, selected && s.radioActive]} />
    </TouchableOpacity>
  );
}

const TOTAL_STEPS = 8;

function StepProgress({ step }: { step: number }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <View style={s.progressWrap}>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={s.progressText}>Step {step + 1} of {TOTAL_STEPS + 1}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { dispatch } = useApp();

  const [step, setStep]             = useState(0);
  const [name, setName]             = useState('');
  const [goal, setGoal]             = useState('');
  const [experience, setExperience] = useState('');
  const [frequency, setFrequency]   = useState<number | null>(null);
  const [sleep, setSleep]           = useState('');
  const [lifestyle, setLifestyle]   = useState('');
  const [split, setSplit]           = useState(SPLIT_PRESETS[0].id);

  const recommendedSplit = (frequency ?? 0) >= 5 ? 'ppl' : 'ul';

  function canAdvance(): boolean {
    switch (step) {
      case 0: return name.trim().length > 0;
      case 1: return goal !== '';
      case 2: return experience !== '';
      case 3: return frequency !== null;
      case 4: return true;         // health connect — always skippable
      case 5: return sleep !== '';
      case 6: return lifestyle !== '';
      case 7: return true;         // pro pitch — always skippable
      default: return true;
    }
  }

  function next() {
    if (step === 3) setSplit(recommendedSplit);
    setStep(s => s + 1);
  }

  function activatePremium() {
    dispatch({ type: 'TOGGLE_PREMIUM' });
    finishOnboarding();
  }

  function finishOnboarding() {
    const preset = SPLIT_PRESETS.find(p => p.id === split)!;
    dispatch({ type: 'SET_USER', payload: name.trim() });
    dispatch({
      type: 'SETUP_PROFILE',
      payload: { goal, experience, frequency: frequency!, sleep, lifestyle },
    });
    dispatch({ type: 'SET_SPLIT', payload: { id: preset.id, defaultSchedule: preset.defaultSchedule } });
  }

  // ── Pro pitch helpers ─────────────────────────────────────────────────────
  function proBenefits(): string[] {
    const b: string[] = [];
    if (sleep === 'under6' || sleep === '6to7') b.push('Recovery insights — know when to push and when to rest');
    if (lifestyle === 'busy') b.push('Quick session templates — effective 30-min workouts');
    if (goal === 'muscle' || goal === 'strength') b.push('Full performance recall for every exercise');
    b.push('Unlimited custom splits with any workout type');
    b.push('Dropsets, advanced volume tracking, and more');
    return b.slice(0, 4);
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.logo}>SBLftr</Text>
          <StepProgress step={step} />

          {/* ── Step 0: Name ── */}
          {step === 0 && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>What's your name?</Text>
              <Text style={s.stepSub}>We'll use this to personalise your experience.</Text>
              <TextInput
                style={s.nameInput}
                placeholder="Your name"
                placeholderTextColor={C.textMut}
                value={name}
                onChangeText={setName}
                autoFocus
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => canAdvance() && next()}
              />
            </View>
          )}

          {/* ── Step 1: Goal ── */}
          {step === 1 && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>What's your main goal, {name}?</Text>
              <Text style={s.stepSub}>This shapes your entire training plan.</Text>
              {GOALS.map(g => (
                <OptionCard key={g.id} item={g} selected={goal === g.id} onSelect={setGoal} />
              ))}
            </View>
          )}

          {/* ── Step 2: Experience ── */}
          {step === 2 && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>How long have you been lifting?</Text>
              <Text style={s.stepSub}>Helps us calibrate the starting weights and volume.</Text>
              {EXPERIENCE.map(e => (
                <OptionCard key={e.id} item={e} selected={experience === e.id} onSelect={setExperience} />
              ))}
            </View>
          )}

          {/* ── Step 3: Frequency ── */}
          {step === 3 && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>How many days a week can you train?</Text>
              <Text style={s.stepSub}>Be realistic — consistency beats intensity.</Text>
              {FREQUENCY.map(f => (
                <OptionCard key={f.id} item={{ ...f }} selected={frequency === f.id} onSelect={setFrequency} />
              ))}
            </View>
          )}

          {/* ── Step 4: Health Connect ── */}
          {step === 4 && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>Connect your health data</Text>
              <Text style={s.stepSub}>
                Auto-track steps, activity, and sleep recovery directly from your device.
              </Text>
              <View style={s.healthCard}>
                <Text style={s.healthIcon}>{Platform.OS === 'ios' ? '🍎' : '🤖'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.healthTitle}>
                    {Platform.OS === 'ios' ? 'Apple Health' : 'Google Health Connect'}
                  </Text>
                  <Text style={s.healthDesc}>Steps, sleep, heart rate, and calorie data</Text>
                </View>
                <View style={s.premiumPill}>
                  <Text style={s.premiumPillText}>Premium</Text>
                </View>
              </View>
              <TouchableOpacity style={s.connectBtn} activeOpacity={0.85}
                onPress={() => Alert.alert('Coming soon', 'Health integration launches with the next update.')}
              >
                <Text style={s.connectBtnText}>Connect {Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit'}</Text>
              </TouchableOpacity>
              <Text style={s.skipNote}>You can connect later from Profile → Health.</Text>
            </View>
          )}

          {/* ── Step 5: Sleep ── */}
          {step === 5 && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>How much sleep do you get per night?</Text>
              <Text style={s.stepSub}>Sleep is the #1 driver of muscle recovery. Honest answer = better plan.</Text>
              {SLEEP.map(sl => (
                <OptionCard key={sl.id} item={sl} selected={sleep === sl.id} onSelect={setSleep} />
              ))}
            </View>
          )}

          {/* ── Step 6: Lifestyle ── */}
          {step === 6 && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>What does your day look like?</Text>
              <Text style={s.stepSub}>Helps us find the best training windows and session lengths for you.</Text>
              {LIFESTYLE.map(ls => (
                <OptionCard key={ls.id} item={ls} selected={lifestyle === ls.id} onSelect={setLifestyle} />
              ))}
            </View>
          )}

          {/* ── Step 7: Pro Pitch ── */}
          {step === 7 && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>Your personalised plan is ready</Text>
              <Text style={s.stepSub}>
                Based on your {goal ? GOALS.find(g => g.id === goal)?.label.toLowerCase() : 'goal'} goal and {lifestyle === 'busy' ? 'busy' : 'your'} lifestyle, here's what Premium unlocks for you:
              </Text>

              <View style={s.proCard}>
                <Text style={s.proCardBadge}>PREMIUM BENEFITS FOR YOU</Text>
                {proBenefits().map((b, i) => (
                  <View key={i} style={s.proRow}>
                    <Text style={s.proCheck}>✓</Text>
                    <Text style={s.proBenefit}>{b}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={s.trialBtn}
                onPress={activatePremium}
                activeOpacity={0.85}
              >
                <Text style={s.trialBtnText}>Start Free Trial →</Text>
                <Text style={s.trialBtnSub}>No payment. Cancel anytime.</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.skipFreeBtn} onPress={next} activeOpacity={0.7}>
                <Text style={s.skipFreeBtnText}>Continue with free plan</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 8: Split ── */}
          {step === 8 && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>Your training split</Text>
              <Text style={s.stepSub}>
                Based on {frequency} days/week, we recommend {recommendedSplit === 'ppl' ? 'Push / Pull / Legs' : 'Upper / Lower'}.
                You can change this any time.
              </Text>
              {SPLIT_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset.id}
                  style={[s.option, split === preset.id && s.optionActive]}
                  onPress={() => setSplit(preset.id)}
                  activeOpacity={0.8}
                >
                  {preset.id === recommendedSplit && (
                    <View style={s.recommendedBadge}>
                      <Text style={s.recommendedText}>Recommended</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionLabel, split === preset.id && s.optionLabelActive]}>
                      {preset.name}
                    </Text>
                    <Text style={s.optionDesc}>
                      {preset.defaultSchedule
                        .map(k => k === 'rest' ? 'Rest' : k.charAt(0).toUpperCase() + k.slice(1))
                        .join(' · ')}
                    </Text>
                  </View>
                  <View style={[s.radio, split === preset.id && s.radioActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Navigation ── */}
          {/* Pro pitch step has its own buttons */}
          {step !== 7 && (
            <View style={s.navRow}>
              {step > 0 && (
                <TouchableOpacity style={s.backBtn} onPress={() => setStep(s => s - 1)}>
                  <Text style={s.backText}>← Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  s.nextBtn,
                  !canAdvance() && s.nextBtnDisabled,
                  step === 0 && { marginLeft: 0, flex: 1 },
                ]}
                onPress={step === TOTAL_STEPS ? finishOnboarding : next}
                disabled={!canAdvance()}
                activeOpacity={0.85}
              >
                <Text style={s.nextText}>
                  {step === TOTAL_STEPS ? 'Start Training 🚀' : 'Continue →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 32 },
  logo: { fontSize: 32, fontWeight: '800', color: C.accent, letterSpacing: 1, marginBottom: 16 },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  progressTrack: { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: C.accent, borderRadius: 2 },
  progressText: { fontSize: 11, color: C.textSec, fontWeight: '600', minWidth: 70 },

  stepWrap: { marginBottom: 24 },
  stepTitle: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 6, lineHeight: 30 },
  stepSub: { fontSize: 14, color: C.textSec, marginBottom: 20, lineHeight: 20 },

  nameInput: {
    backgroundColor: C.surface, borderRadius: 14,
    padding: 18, fontSize: 20, color: C.text,
    borderWidth: 1, borderColor: C.border,
  },

  option: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.border, gap: 12,
  },
  optionActive: { borderColor: C.accent, backgroundColor: C.accentDim },
  optionIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  optionLabel: { fontSize: 16, fontWeight: '700', color: C.text },
  optionLabelActive: { color: C.accent },
  optionDesc: { fontSize: 12, color: C.textSec, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.textMut },
  radioActive: { borderColor: C.accent, backgroundColor: C.accent },

  // Health connect step
  healthCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14,
    padding: 16, gap: 12, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
  },
  healthIcon: { fontSize: 28 },
  healthTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  healthDesc: { fontSize: 12, color: C.textSec, marginTop: 2 },
  premiumPill: {
    backgroundColor: C.accentDim, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: C.accent,
  },
  premiumPillText: { fontSize: 10, color: C.accent, fontWeight: '800' },
  connectBtn: {
    backgroundColor: C.accent, borderRadius: 14,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  connectBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipNote: { fontSize: 12, color: C.textMut, textAlign: 'center' },

  // Pro pitch step
  proCard: {
    backgroundColor: C.surface, borderRadius: 16,
    padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: C.accent,
  },
  proCardBadge: {
    fontSize: 10, color: C.accent, fontWeight: '800', letterSpacing: 1,
    marginBottom: 14,
  },
  proRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  proCheck: { fontSize: 15, color: C.success, fontWeight: '700', marginTop: 1 },
  proBenefit: { flex: 1, fontSize: 14, color: C.text, lineHeight: 20 },
  trialBtn: {
    backgroundColor: C.accent, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', marginBottom: 12,
  },
  trialBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  trialBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 3 },
  skipFreeBtn: { alignItems: 'center', paddingVertical: 14 },
  skipFreeBtnText: { color: C.textSec, fontSize: 15, fontWeight: '600' },

  // Split step
  recommendedBadge: {
    position: 'absolute', top: -8, right: 12,
    backgroundColor: C.accent, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  recommendedText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Nav
  navRow: { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  backBtn: { justifyContent: 'center', paddingHorizontal: 4 },
  backText: { color: C.textSec, fontSize: 16 },
  nextBtn: {
    flex: 1, backgroundColor: C.accent, borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.35 },
  nextText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
