import { AppState, HistoryItem, MuscleCategory, RecoveryStatus, SetData } from './types';
import { BUILT_IN_WORKOUTS } from './data';

export function getEffectiveDate(devOffset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + devOffset);
  return d;
}

export function getTodayKey(state: AppState): string {
  const d = getEffectiveDate(state.devOffset);
  return state.schedule[d.getDay()];
}

export function getAllWorkouts(state: AppState) {
  const base = { ...state.workouts };
  for (const cs of state.customSplits) {
    Object.assign(base, cs.workouts);
  }
  return base;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDuration(startIso: string): string {
  const ms = Date.now() - new Date(startIso).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function daysSince(iso: string, devOffset = 0): number {
  const now = getEffectiveDate(devOffset);
  now.setHours(0, 0, 0, 0);
  const past = new Date(iso);
  past.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - past.getTime()) / 86400000);
}

export function isSameDay(iso: string, devOffset = 0): boolean {
  return daysSince(iso, devOffset) === 0;
}

export function getRecovery(
  history: HistoryItem[],
  category: MuscleCategory,
  devOffset = 0,
): RecoveryStatus {
  let latest: string | null = null;
  for (const session of history) {
    for (const ex of session.exercises) {
      if (ex.c === category) {
        if (!latest || session.date > latest) latest = session.date;
        break;
      }
    }
  }
  if (!latest) return 'ready';
  const days = daysSince(latest, devOffset);
  if (days <= 1) return 'rest';
  if (days === 2) return 'half';
  return 'ready';
}

export function getStreak(history: HistoryItem[], devOffset = 0): number {
  if (!history.length) return 0;
  const dates = new Set(history.map(h => {
    const d = new Date(h.date);
    d.setHours(0, 0, 0, 0);
    return d.toDateString();
  }));
  let streak = 0;
  const check = getEffectiveDate(devOffset);
  check.setHours(0, 0, 0, 0);
  // if today not worked out yet, start checking from yesterday
  if (!dates.has(check.toDateString())) {
    check.setDate(check.getDate() - 1);
  }
  while (dates.has(check.toDateString())) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

export function getWeekSessions(history: HistoryItem[], devOffset = 0): number {
  const today = getEffectiveDate(devOffset);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return history.filter(h => new Date(h.date) >= weekStart).length;
}

export function getLastPerformance(
  history: HistoryItem[],
  exerciseName: string,
): string | null {
  for (const session of history) {
    const ex = session.exercises.find(e => e.n === exerciseName);
    if (ex) {
      const doneSets = ex.sets.filter(s => s.done && s.w > 0);
      if (doneSets.length === 0) continue;
      return doneSets.map(s => `${s.w}×${s.r}`).join(' · ');
    }
  }
  return null;
}

export function getBestLift(history: HistoryItem[], exerciseName: string): number {
  let best = 0;
  for (const session of history) {
    const ex = session.exercises.find(e => e.n === exerciseName);
    if (ex) {
      for (const set of ex.sets) {
        if (set.done && set.w > best) best = set.w;
      }
    }
  }
  return best;
}

export function isPR(
  history: HistoryItem[],
  exerciseName: string,
  weight: number,
): boolean {
  if (weight <= 0) return false;
  return weight > getBestLift(history, exerciseName);
}

export function formatVolume(vol: number): string {
  return vol >= 1000 ? `${(vol / 1000).toFixed(1)}k` : `${vol}`;
}

// ── PPL baseline weights (realistic starting points per exercise) ──────────────
const BASE_WEIGHTS: Record<string, number> = {
  'Cable Lateral Raises': 25, 'Chest Fly': 40, 'Single Arm Tricep Extension': 30,
  'Incline Smith Bench': 95, 'Smith Shoulder Press': 85, 'JM Press': 65,
  'Incline Curl': 30, 'Lat Pulldown': 110, 'Preacher Curl': 50,
  'T-Bar Rows': 90, 'Cuffed Cable Reverse Curl': 35, 'Single Arm Cable Lat Row': 55,
  'Back Extension': 45, 'Leg Extension': 90, 'Leg Curl': 75, 'Hack Squat': 135,
  'SLDL': 115, 'Calf Raises': 100, 'Crunch Machine': 60,
};

function baseWeight(name: string): number {
  return BASE_WEIGHTS[name] ?? 50;
}

function jitter(base: number, pct: number): number {
  // ±pct% random variation, rounded to nearest 5
  const delta = base * pct * (Math.random() * 2 - 1);
  return Math.max(5, Math.round((base + delta) / 5) * 5);
}

function makeSets(w: number, reps: number[]): SetData[] {
  return reps.map(r => ({ w, r, done: true }));
}

export function generatePPLTestData(): HistoryItem[] {
  const now = Date.now();
  const DAY_MS = 86400000;

  // PPL × 2: push Mon+Thu, pull Tue+Fri, legs Wed+Sat — across 2 weeks (14 days)
  const schedule: Array<{ key: 'push' | 'pull' | 'legs'; daysAgo: number }> = [
    { key: 'push', daysAgo: 13 }, { key: 'pull', daysAgo: 12 }, { key: 'legs', daysAgo: 11 },
    { key: 'push', daysAgo: 10 }, { key: 'pull', daysAgo: 9 },  { key: 'legs', daysAgo: 8 },
    { key: 'push', daysAgo: 6 },  { key: 'pull', daysAgo: 5 },  { key: 'legs', daysAgo: 4 },
    { key: 'push', daysAgo: 3 },  { key: 'pull', daysAgo: 2 },  { key: 'legs', daysAgo: 1 },
  ];

  return schedule.map(({ key, daysAgo }, idx) => {
    const wkDef = BUILT_IN_WORKOUTS[key];
    const isWeek2 = daysAgo <= 7;
    const multiplier = isWeek2 ? 1.05 : 1.0;

    const exercises = wkDef.exercises.map(ex => {
      const base = Math.round(baseWeight(ex.n) * multiplier / 5) * 5;
      const w1 = jitter(base, 0.04);
      const w2 = jitter(base, 0.04);
      const w3 = jitter(base * 0.95, 0.04);
      return {
        n: ex.n,
        c: ex.c,
        sets: makeSets(w1, [12, 10, 8]).map((s, si) => ({
          ...s,
          w: [w1, w2, w3][si],
          r: [12, 10, 8][si],
        })),
      };
    });

    const volume = exercises.reduce((acc, ex) =>
      acc + ex.sets.reduce((a, s) => a + s.w * s.r, 0), 0);

    const prs: string[] = isWeek2 ? exercises.slice(0, 2).map(e => e.n) : [];

    return {
      id: `devtest_${idx}`,
      date: new Date(now - daysAgo * DAY_MS).toISOString(),
      key,
      name: wkDef.name,
      volume,
      prs,
      exercises,
    };
  });
}
