export type MuscleCategory =
  | 'Shoulders' | 'Chest' | 'Triceps' | 'Biceps'
  | 'Back' | 'Lower Back' | 'Quads' | 'Hamstrings'
  | 'Calves' | 'Abs';

export type RecoveryStatus = 'ready' | 'half' | 'rest';
export type Units = 'kg' | 'lb';
export type GoalKey = 'water' | 'steps' | 'calories';

export interface Exercise {
  n: string;
  c: MuscleCategory;
  custom?: boolean;
}

export interface DropSet {
  w: number;
  r: number;
  done: boolean;
}

export interface SetData {
  w: number;
  r: number;
  done: boolean;
  drops?: DropSet[];
}

export interface ActiveExercise {
  n: string;
  c: MuscleCategory;
  custom?: boolean;
  sets: SetData[];
  supersetWith?: string;
}

export interface ActiveWorkout {
  key: string;
  name: string;
  startTime: string;
  exercises: ActiveExercise[];
  volume: number;
  prs: string[];
}

export interface HistoryExercise {
  n: string;
  c: MuscleCategory;
  sets: SetData[];
}

export interface HistoryItem {
  id: string;
  date: string;
  key: string;
  name: string;
  volume: number;
  prs: string[];
  exercises: HistoryExercise[];
}

export interface WorkoutDefinition {
  name: string;
  exercises: Exercise[];
}

export interface SplitPreset {
  id: string;
  name: string;
  defaultSchedule: string[];
}

export interface CustomSplit {
  id: string;
  name: string;
  days: string[];
  workouts: Record<string, WorkoutDefinition>;
}

export interface DailyGoals {
  water: number;   // cups consumed today
  steps: boolean;
  calories: boolean;
  date: string;
}

export interface GoalTargets {
  water: number;
  steps: number;
  calories: number;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  uri: string;
  note?: string;
  analysis?: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}

export interface ScienceCard {
  id: number;
  from: string;
  to: string;
  reason: string;
  workoutKeys: string[];
}

export interface AppState {
  user: string | null;
  goal: string | null;
  experience: string | null;
  frequency: number | null;
  sleep: string | null;
  lifestyle: string | null;
  premium: boolean;
  units: Units;
  health: boolean;
  restDefault: number;
  split: string;
  schedule: string[];
  workouts: Record<string, WorkoutDefinition>;
  customSplits: CustomSplit[];
  goals: DailyGoals;
  goalTargets: GoalTargets;
  history: HistoryItem[];
  photos: ProgressPhoto[];
  weightLog: WeightEntry[];
  scienceIdx: number;
  scienceDismissed: boolean;
  activeWorkout: ActiveWorkout | null;
  devMode: boolean;
  devOffset: number;
  devApiKey: string;
}

export type Action =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'SET_USER'; payload: string }
  | { type: 'SETUP_PROFILE'; payload: { goal: string; experience: string; frequency: number; sleep: string; lifestyle: string } }
  | { type: 'INJECT_TEST_DATA'; payload: HistoryItem[] }
  | { type: 'SET_SPLIT'; payload: { id: string; defaultSchedule: string[] } }
  | { type: 'SET_SCHEDULE'; payload: string[] }
  | { type: 'SET_UNITS'; payload: Units }
  | { type: 'SET_REST_DEFAULT'; payload: number }
  | { type: 'TOGGLE_PREMIUM' }
  | { type: 'TOGGLE_HEALTH' }
  | { type: 'START_WORKOUT'; payload: string }
  | { type: 'UPDATE_SET'; payload: { ei: number; si: number; w?: number; r?: number } }
  | { type: 'TOGGLE_SET_DONE'; payload: { ei: number; si: number } }
  | { type: 'ADD_SET'; payload: number }
  | { type: 'REMOVE_SET'; payload: { ei: number; si: number } }
  | { type: 'ADD_DROP'; payload: { ei: number; si: number } }
  | { type: 'UPDATE_DROP'; payload: { ei: number; si: number; di: number; w?: number; r?: number } }
  | { type: 'TOGGLE_DROP_DONE'; payload: { ei: number; si: number; di: number } }
  | { type: 'SWAP_EXERCISE'; payload: { ei: number; exercise: Exercise } }
  | { type: 'FINISH_WORKOUT' }
  | { type: 'CANCEL_WORKOUT' }
  | { type: 'TOGGLE_GOAL'; payload: 'steps' | 'calories' }
  | { type: 'SET_WATER'; payload: number }
  | { type: 'SET_GOAL_TARGET'; payload: { key: GoalKey; value: number } }
  | { type: 'TOGGLE_DEV_MODE' }
  | { type: 'SET_DEV_OFFSET'; payload: number }
  | { type: 'SET_DEV_API_KEY'; payload: string }
  | { type: 'DISMISS_SCIENCE' }
  | { type: 'ACCEPT_SCIENCE_REPLACE'; payload: ScienceCard }
  | { type: 'ADD_CUSTOM_SPLIT'; payload: CustomSplit }
  | { type: 'UPDATE_CUSTOM_SPLIT'; payload: CustomSplit }
  | { type: 'DELETE_CUSTOM_SPLIT'; payload: string }
  | { type: 'ADD_PHOTO'; payload: ProgressPhoto }
  | { type: 'UPDATE_PHOTO_ANALYSIS'; payload: { id: string; analysis: string } }
  | { type: 'DELETE_PHOTO'; payload: string }
  | { type: 'LOG_WEIGHT'; payload: WeightEntry }
  | { type: 'DELETE_WEIGHT'; payload: string }
  | { type: 'SET_SCHEDULE_DAY'; payload: { index: number; key: string } };

export type RootStackParams = {
  Main: undefined;
  ActiveWorkout: undefined;
  Builder: { splitId?: string };
  HistoryDetail: { sessionId: string };
  WhatsNew: undefined;
};

export type TabParams = {
  Today: undefined;
  Plan: undefined;
  Progress: undefined;
  Profile: undefined;
};
