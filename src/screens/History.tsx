import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { useApp } from '../state/AppContext';
import { C } from '../theme';
import { formatDate, formatVolume } from '../utils';
import { HistoryItem } from '../types';

function WorkoutBadge({ name }: { name: string }) {
  const colors: Record<string, string> = {
    Push: '#FF6B35', Pull: '#4CAF50', Legs: '#2196F3',
    Upper: '#9C27B0', Lower: '#FF9800',
  };
  const color = colors[name] ?? '#666';
  return (
    <View style={[hb.badge, { backgroundColor: color + '25', borderColor: color }]}>
      <Text style={[hb.text, { color }]}>{name}</Text>
    </View>
  );
}

const hb = StyleSheet.create({
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, marginRight: 6 },
  text: { fontSize: 12, fontWeight: '700' },
});

function SessionDetail({ session, onClose }: { session: HistoryItem; onClose: () => void }) {
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={sd.safe}>
        <View style={sd.header}>
          <TouchableOpacity onPress={onClose} style={sd.closeBtn}>
            <Text style={sd.closeText}>← Back</Text>
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
              {session.prs.map(pr => (
                <Text key={pr} style={sd.prItem}>• {pr}</Text>
              ))}
            </View>
          )}
          <Text style={sd.sectionLabel}>Exercises</Text>
          {session.exercises.map((ex, i) => (
            <View key={i} style={sd.exCard}>
              <Text style={sd.exName}>{ex.n}</Text>
              <Text style={sd.exCat}>{ex.c}</Text>
              {ex.sets.filter(s => s.done).map((set, j) => (
                <Text key={j} style={sd.setLine}>
                  Set {j + 1}: {set.w} × {set.r}
                </Text>
              ))}
              {ex.sets.filter(s => s.done).length === 0 && (
                <Text style={sd.setLine}>No completed sets</Text>
              )}
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  closeBtn: { marginRight: 12 },
  closeText: { color: C.accent, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: C.text, flex: 1 },
  scroll: { padding: 20 },
  date: { fontSize: 14, color: C.textSec, marginBottom: 16 },
  statsRow: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 20 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: C.accent },
  statLabel: { fontSize: 11, color: C.textSec, marginTop: 2 },
  prSection: { backgroundColor: C.accentDim, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.accent },
  sectionLabel: { fontSize: 12, color: C.textSec, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  prItem: { fontSize: 14, color: C.accent, fontWeight: '600', marginBottom: 4 },
  exCard: { backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  exName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  exCat: { fontSize: 12, color: C.textSec, marginBottom: 8 },
  setLine: { fontSize: 13, color: C.textSec, marginBottom: 3 },
});

export default function HistoryScreen() {
  const { state } = useApp();
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  if (state.history.length === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyTitle}>No sessions yet</Text>
          <Text style={s.emptyText}>Your completed workouts will appear here.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.pageTitle}>History</Text>
      <FlatList
        data={state.history}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const doneSets = item.exercises.reduce(
            (acc, ex) => acc + ex.sets.filter(s => s.done).length, 0
          );
          return (
            <TouchableOpacity style={s.card} onPress={() => setSelected(item)} activeOpacity={0.8}>
              <View style={s.cardTop}>
                <WorkoutBadge name={item.name} />
                {item.prs.length > 0 && (
                  <View style={s.prBadge}>
                    <Text style={s.prBadgeText}>🏆 {item.prs.length} PR</Text>
                  </View>
                )}
              </View>
              <Text style={s.cardDate}>{formatDate(item.date)}</Text>
              <View style={s.cardStats}>
                <Text style={s.cardStat}>{formatVolume(item.volume)} {state.units}</Text>
                <Text style={s.cardStatSep}>·</Text>
                <Text style={s.cardStat}>{item.exercises.length} exercises</Text>
                <Text style={s.cardStatSep}>·</Text>
                <Text style={s.cardStat}>{doneSets} sets</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      {selected && <SessionDetail session={selected} onClose={() => setSelected(null)} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  pageTitle: { fontSize: 28, fontWeight: '800', color: C.text, padding: 20, paddingBottom: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: C.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  prBadge: { backgroundColor: C.accentDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  prBadgeText: { color: C.accent, fontSize: 12, fontWeight: '700' },
  cardDate: { fontSize: 13, color: C.textSec, marginBottom: 8 },
  cardStats: { flexDirection: 'row', alignItems: 'center' },
  cardStat: { fontSize: 13, color: C.textSec },
  cardStatSep: { fontSize: 13, color: C.textMut, marginHorizontal: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptyText: { fontSize: 15, color: C.textSec, textAlign: 'center' },
});
