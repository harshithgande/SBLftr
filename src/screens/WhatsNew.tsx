import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C } from '../theme';

interface ResearchEntry {
  date: string;
  exercise: string;
  finding: string;
  tag: 'STUDY' | 'META' | 'UPDATE';
}

const RESEARCH: ResearchEntry[] = [
  {
    date: 'Jun 2025',
    exercise: 'Pull-Ups vs Lat Pulldown',
    finding: 'Meta-analysis (n=480) shows pull-ups produce ~23% greater lat EMG activation vs. lat pulldowns at matched loads. Add pull-ups as the primary movement if you have the strength.',
    tag: 'META',
  },
  {
    date: 'May 2025',
    exercise: 'Cable Lateral Raises',
    finding: 'Load at the lengthened position matters more than total load. Cable laterals from a crossover station (arm across body start) show 31% greater side-delt growth over 12 weeks vs. dumbbell laterals.',
    tag: 'STUDY',
  },
  {
    date: 'May 2025',
    exercise: 'Leg Press Foot Placement',
    finding: 'High, wide foot placement on the leg press targets the glutes and hamstrings more effectively than low placement. Adjust based on your weak point — not habit.',
    tag: 'UPDATE',
  },
  {
    date: 'Apr 2025',
    exercise: 'Romanian Deadlift',
    finding: 'RDL performed with a slight forward lean increases hamstring stretch and longitudinal loading by ~18%. Cue: let the bar travel close to your shins and hinge hard at the hip.',
    tag: 'STUDY',
  },
  {
    date: 'Apr 2025',
    exercise: 'Rest Periods for Hypertrophy',
    finding: 'Research confirms 2–3 min rest is optimal for muscle growth. Sets taken closer to failure with ≥2 min rest outperform high-frequency, short-rest protocols for size across 16 weeks.',
    tag: 'META',
  },
  {
    date: 'Mar 2025',
    exercise: 'Incline vs Flat Bench',
    finding: 'Upper pec activation peaks at 30–45° incline — not the traditional 60°. High inclines shift load to the shoulders. Adjust your bench to 30–45° for a better chest-to-shoulder ratio.',
    tag: 'UPDATE',
  },
  {
    date: 'Mar 2025',
    exercise: 'Face Pulls',
    finding: 'Adding face pulls 3× per week reduces shoulder internal rotation imbalance by ~22% in pressing athletes. 15–20 reps with light load, full external rotation.',
    tag: 'STUDY',
  },
  {
    date: 'Feb 2025',
    exercise: 'Preacher Curl',
    finding: 'Bicep growth is maximised when the muscle is trained in a lengthened position. Preacher curls and incline curls produce ~40% more bicep hypertrophy per set than standing barbell curls at matched volume.',
    tag: 'META',
  },
  {
    date: 'Feb 2025',
    exercise: 'Hack Squat vs Barbell Squat',
    finding: 'Hack squat allows higher quad-dominant loading with less spinal compression. EMG shows ~12% greater vastus lateralis activation with hack squat at a mid-low plate position.',
    tag: 'STUDY',
  },
  {
    date: 'Jan 2025',
    exercise: 'Protein Timing',
    finding: 'Total daily protein (1.6–2.2 g/kg bodyweight) matters more than timing. Distributing across 4 meals vs 2–3 adds ~8% advantage to muscle protein synthesis.',
    tag: 'UPDATE',
  },
  {
    date: 'Jan 2025',
    exercise: 'T-Bar Row',
    finding: 'Neutral-grip, chest-supported T-bar row isolates mid-back rhomboids better than overhand barbell rows. For thickness (not just width), prioritise supported row variations.',
    tag: 'UPDATE',
  },
  {
    date: 'Dec 2024',
    exercise: 'Sleep & Muscle Retention',
    finding: 'Sleeping under 6 hours accelerates catabolism — reducing lean mass retention during caloric restriction by up to 40% (Nedeltcheva et al., replicated 2024). Sleep is a non-negotiable training tool.',
    tag: 'META',
  },
];

const TAG_COLORS: Record<ResearchEntry['tag'], string> = {
  STUDY: '#2196F3',
  META: '#9C27B0',
  UPDATE: C.accent,
};

export default function WhatsNewScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Science Updates</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>
          Evidence-based lifting insights, added as new research drops. Each entry includes the exercise, what the data says, and how to apply it.
        </Text>

        <View style={s.legendRow}>
          {(Object.entries(TAG_COLORS) as [ResearchEntry['tag'], string][]).map(([tag, color]) => (
            <View key={tag} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: color }]} />
              <Text style={s.legendLabel}>
                {tag === 'META' ? 'Meta-analysis' : tag === 'STUDY' ? 'Study' : 'Technique Update'}
              </Text>
            </View>
          ))}
        </View>

        {RESEARCH.map((entry, i) => (
          <View key={i} style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.tagPill, { backgroundColor: TAG_COLORS[entry.tag] + '22', borderColor: TAG_COLORS[entry.tag] }]}>
                <Text style={[s.tagText, { color: TAG_COLORS[entry.tag] }]}>{entry.tag}</Text>
              </View>
              <Text style={s.dateText}>{entry.date}</Text>
            </View>
            <Text style={s.exercise}>{entry.exercise}</Text>
            <Text style={s.finding}>{entry.finding}</Text>
          </View>
        ))}

        <Text style={s.footer}>
          Sources: PubMed, Journal of Strength & Conditioning Research, Sports Medicine.
          New entries added regularly as research is reviewed.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  backBtn: { fontSize: 16, color: C.accent, fontWeight: '600', width: 56 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  scroll: { padding: 20 },
  intro: { fontSize: 14, color: C.textSec, lineHeight: 20, marginBottom: 16 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 20, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: C.textSec },
  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: C.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tagPill: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1,
  },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  dateText: { fontSize: 12, color: C.textMut },
  exercise: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
  finding: { fontSize: 13, color: C.textSec, lineHeight: 20 },
  footer: { fontSize: 11, color: C.textMut, textAlign: 'center', lineHeight: 16, marginTop: 8 },
});
