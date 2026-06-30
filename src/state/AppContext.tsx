import React, { createContext, useContext, useReducer, useEffect, Dispatch } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Action, ActiveWorkout, HistoryItem, ScienceCard, Exercise, WeightEntry } from '../types';
import { BUILT_IN_WORKOUTS, SPLIT_PRESETS } from '../data';
import { isPR } from '../utils';

const STORAGE_KEY = '@sblftr_state_v1';

const initialGoals = { water: 0, steps: false, calories: false, date: '' };

export const DEFAULT_STATE: AppState = {
  user: null,
  goal: null,
  experience: null,
  frequency: null,
  sleep: null,
  lifestyle: null,
  physique: null,
  heightFeet: null,
  heightInches: null,
  weightLbs: null,
  obstacles: [],
  onboardingPhotoUri: null,
  gptPlan: null,
  personalizedSplitId: null,
  premium: false,
  units: 'lb',
  health: false,
  restDefault: 90,
  split: 'ppl',
  schedule: SPLIT_PRESETS[0].defaultSchedule,
  workouts: BUILT_IN_WORKOUTS,
  customSplits: [],
  goals: initialGoals,
  goalTargets: { water: 8, steps: 10000, calories: 2400 },
  history: [],
  photos: [],
  weightLog: [],
  scienceIdx: 0,
  scienceDismissed: false,
  activeWorkout: null,
  devMode: false,
  devOffset: 0,
  devApiKey: '',
};

function resetGoalsIfNewDay(goals: AppState['goals']): AppState['goals'] {
  const today = new Date().toDateString();
  if (goals.date !== today) {
    return { water: 0, steps: false, calories: false, date: today };
  }
  return goals;
}

function calcVolume(exercises: ActiveWorkout['exercises']): number {
  let v = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (s.done) {
        if (ex.unilateral) {
          v += (s.leftW ?? 0) * (s.leftR ?? 0) + (s.rightW ?? 0) * (s.rightR ?? 0);
        } else {
          v += s.w * s.r;
        }
      }
      if (s.drops) {
        for (const d of s.drops) {
          if (d.done) v += d.w * d.r;
        }
      }
    }
  }
  return v;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...DEFAULT_STATE, ...action.payload, activeWorkout: null };

    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'SETUP_PROFILE':
      return {
        ...state,
        physique: action.payload.physique,
        experience: action.payload.experience,
        frequency: action.payload.frequency,
        heightFeet: action.payload.heightFeet,
        heightInches: action.payload.heightInches,
        weightLbs: action.payload.weightLbs,
        obstacles: action.payload.obstacles,
        onboardingPhotoUri: action.payload.onboardingPhotoUri,
        gptPlan: action.payload.gptPlan,
        personalizedSplitId: action.payload.personalizedSplitId,
      };

    case 'SET_PREMIUM':
      return { ...state, premium: action.payload };

    case 'INJECT_TEST_DATA':
      return { ...state, history: action.payload };

    case 'SET_SPLIT': {
      const preset = SPLIT_PRESETS.find(p => p.id === action.payload.id);
      return {
        ...state,
        split: action.payload.id,
        schedule: action.payload.defaultSchedule,
        workouts: action.payload.workouts ?? (preset ? BUILT_IN_WORKOUTS : state.workouts),
      };
    }

    case 'TOGGLE_UNILATERAL': {
      if (!state.activeWorkout) return state;
      const ei = action.payload;
      const exercises = state.activeWorkout.exercises.map((ex, i) =>
        i === ei ? { ...ex, unilateral: !ex.unilateral } : ex
      );
      return { ...state, activeWorkout: { ...state.activeWorkout, exercises } };
    }

    case 'UPDATE_UNILATERAL_SET': {
      if (!state.activeWorkout) return state;
      const { ei, si, side, w, r } = action.payload;
      const exercises = state.activeWorkout.exercises.map((ex, i) => {
        if (i !== ei) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) => {
            if (j !== si) return s;
            if (side === 'left') {
              return { ...s, ...(w !== undefined ? { leftW: w } : {}), ...(r !== undefined ? { leftR: r } : {}) };
            }
            return { ...s, ...(w !== undefined ? { rightW: w } : {}), ...(r !== undefined ? { rightR: r } : {}) };
          }),
        };
      });
      return { ...state, activeWorkout: { ...state.activeWorkout, exercises } };
    }

    case 'SET_SCHEDULE':
      return { ...state, schedule: action.payload };

    case 'SET_SCHEDULE_DAY': {
      const schedule = [...state.schedule];
      schedule[action.payload.index] = action.payload.key;
      return { ...state, schedule };
    }

    case 'SET_UNITS':
      return { ...state, units: action.payload };

    case 'SET_REST_DEFAULT':
      return { ...state, restDefault: action.payload };

    case 'TOGGLE_PREMIUM':
      return { ...state, premium: !state.premium };

    case 'TOGGLE_HEALTH':
      return { ...state, health: !state.health };

    case 'TOGGLE_DEV_MODE': {
      const enabling = !state.devMode;
      return { ...state, devMode: enabling, devOffset: 0, user: enabling ? null : state.user };
    }

    case 'SET_DEV_OFFSET':
      return { ...state, devOffset: action.payload };

    case 'SET_DEV_API_KEY':
      return { ...state, devApiKey: action.payload };

    case 'START_WORKOUT': {
      const def = state.workouts[action.payload];
      if (!def) return state;
      const aw: ActiveWorkout = {
        key: action.payload,
        name: def.name,
        startTime: new Date().toISOString(),
        exercises: def.exercises.map(ex => ({
          n: ex.n,
          c: ex.c,
          custom: ex.custom,
          sets: [
            { w: 0, r: 0, done: false },
            { w: 0, r: 0, done: false },
            { w: 0, r: 0, done: false },
          ],
        })),
        volume: 0,
        prs: [],
      };
      return { ...state, activeWorkout: aw, goals: resetGoalsIfNewDay(state.goals) };
    }

    case 'UPDATE_SET': {
      if (!state.activeWorkout) return state;
      const { ei, si, w, r } = action.payload;
      const exercises = state.activeWorkout.exercises.map((ex, i) => {
        if (i !== ei) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) => {
            if (j !== si) return s;
            return { ...s, ...(w !== undefined ? { w } : {}), ...(r !== undefined ? { r } : {}) };
          }),
        };
      });
      return { ...state, activeWorkout: { ...state.activeWorkout, exercises } };
    }

    case 'TOGGLE_SET_DONE': {
      if (!state.activeWorkout) return state;
      const { ei, si } = action.payload;
      const aw = state.activeWorkout;
      const exercises = aw.exercises.map((ex, i) => {
        if (i !== ei) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) => {
            if (j !== si) return s;
            return { ...s, done: !s.done };
          }),
        };
      });
      const targetSet = exercises[ei].sets[si];
      let prs = [...aw.prs];
      if (targetSet.done && isPR(state.history, exercises[ei].n, targetSet.w)) {
        if (!prs.includes(exercises[ei].n)) prs.push(exercises[ei].n);
      } else if (!targetSet.done) {
        // re-check if still PR from other sets
        const stillPR = exercises[ei].sets.some(
          (s, j) => j !== si && s.done && isPR(state.history, exercises[ei].n, s.w)
        );
        if (!stillPR) prs = prs.filter(p => p !== exercises[ei].n);
      }
      const volume = calcVolume(exercises);
      return { ...state, activeWorkout: { ...aw, exercises, volume, prs } };
    }

    case 'ADD_SET': {
      if (!state.activeWorkout) return state;
      const ei = action.payload;
      const exercises = state.activeWorkout.exercises.map((ex, i) => {
        if (i !== ei) return ex;
        return { ...ex, sets: [...ex.sets, { w: 0, r: 0, done: false }] };
      });
      return { ...state, activeWorkout: { ...state.activeWorkout, exercises } };
    }

    case 'REMOVE_SET': {
      if (!state.activeWorkout) return state;
      const { ei, si } = action.payload;
      const exercises = state.activeWorkout.exercises.map((ex, i) => {
        if (i !== ei) return ex;
        return { ...ex, sets: ex.sets.filter((_, j) => j !== si) };
      });
      const volume = calcVolume(exercises);
      return { ...state, activeWorkout: { ...state.activeWorkout, exercises, volume } };
    }

    case 'ADD_DROP': {
      if (!state.activeWorkout) return state;
      const { ei, si } = action.payload;
      const exercises = state.activeWorkout.exercises.map((ex, i) => {
        if (i !== ei) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) => {
            if (j !== si) return s;
            const drops = [...(s.drops || []), { w: 0, r: 0, done: false }];
            return { ...s, drops };
          }),
        };
      });
      return { ...state, activeWorkout: { ...state.activeWorkout, exercises } };
    }

    case 'UPDATE_DROP': {
      if (!state.activeWorkout) return state;
      const { ei, si, di, w, r } = action.payload;
      const exercises = state.activeWorkout.exercises.map((ex, i) => {
        if (i !== ei) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) => {
            if (j !== si || !s.drops) return s;
            return {
              ...s,
              drops: s.drops.map((d, k) => {
                if (k !== di) return d;
                return { ...d, ...(w !== undefined ? { w } : {}), ...(r !== undefined ? { r } : {}) };
              }),
            };
          }),
        };
      });
      return { ...state, activeWorkout: { ...state.activeWorkout, exercises } };
    }

    case 'TOGGLE_DROP_DONE': {
      if (!state.activeWorkout) return state;
      const { ei, si, di } = action.payload;
      const exercises = state.activeWorkout.exercises.map((ex, i) => {
        if (i !== ei) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) => {
            if (j !== si || !s.drops) return s;
            return {
              ...s,
              drops: s.drops.map((d, k) => k === di ? { ...d, done: !d.done } : d),
            };
          }),
        };
      });
      const volume = calcVolume(exercises);
      return { ...state, activeWorkout: { ...state.activeWorkout, exercises, volume } };
    }

    case 'SWAP_EXERCISE': {
      if (!state.activeWorkout) return state;
      const { ei, exercise } = action.payload;
      const exercises = state.activeWorkout.exercises.map((ex, i) => {
        if (i !== ei) return ex;
        return { ...ex, n: exercise.n, c: exercise.c };
      });
      return { ...state, activeWorkout: { ...state.activeWorkout, exercises } };
    }

    case 'FINISH_WORKOUT': {
      if (!state.activeWorkout) return state;
      const aw = state.activeWorkout;
      const volume = calcVolume(aw.exercises);
      const prs = [...new Set(aw.prs)];
      const session: HistoryItem = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        key: aw.key,
        name: aw.name,
        volume,
        prs,
        exercises: aw.exercises.map(ex => ({
          n: ex.n,
          c: ex.c,
          sets: ex.sets,
        })),
      };
      return {
        ...state,
        activeWorkout: null,
        history: [session, ...state.history],
        goals: resetGoalsIfNewDay(state.goals),
      };
    }

    case 'CANCEL_WORKOUT':
      return { ...state, activeWorkout: null };

    case 'TOGGLE_GOAL': {
      const goals = resetGoalsIfNewDay(state.goals);
      const key = action.payload as 'steps' | 'calories';
      return {
        ...state,
        goals: { ...goals, [key]: !goals[key] },
      };
    }

    case 'SET_WATER': {
      const goals = resetGoalsIfNewDay(state.goals);
      const cups = Math.max(0, action.payload);
      return { ...state, goals: { ...goals, water: cups } };
    }

    case 'SET_GOAL_TARGET':
      return {
        ...state,
        goalTargets: { ...state.goalTargets, [action.payload.key]: action.payload.value },
      };

    case 'DISMISS_SCIENCE':
      return { ...state, scienceDismissed: true };

    case 'ACCEPT_SCIENCE_REPLACE': {
      const card = action.payload as ScienceCard;
      const workouts = { ...state.workouts };
      for (const key of card.workoutKeys) {
        if (workouts[key]) {
          workouts[key] = {
            ...workouts[key],
            exercises: workouts[key].exercises.map(ex =>
              ex.n === card.from
                ? { n: card.to, c: ex.c }
                : ex
            ),
          };
        }
      }
      return {
        ...state,
        workouts,
        scienceDismissed: true,
        scienceIdx: state.scienceIdx + 1,
      };
    }

    case 'ADD_CUSTOM_SPLIT':
      return { ...state, customSplits: [...state.customSplits, action.payload] };

    case 'UPDATE_CUSTOM_SPLIT':
      return {
        ...state,
        customSplits: state.customSplits.map(cs =>
          cs.id === action.payload.id ? action.payload : cs
        ),
      };

    case 'DELETE_CUSTOM_SPLIT':
      return {
        ...state,
        customSplits: state.customSplits.filter(cs => cs.id !== action.payload),
      };

    case 'ADD_PHOTO':
      return { ...state, photos: [action.payload, ...state.photos] };

    case 'UPDATE_PHOTO_ANALYSIS':
      return {
        ...state,
        photos: state.photos.map(p =>
          p.id === action.payload.id ? { ...p, analysis: action.payload.analysis } : p
        ),
      };

    case 'DELETE_PHOTO':
      return { ...state, photos: state.photos.filter(p => p.id !== action.payload) };

    case 'LOG_WEIGHT':
      return { ...state, weightLog: [action.payload, ...state.weightLog] };

    case 'DELETE_WEIGHT':
      return { ...state, weightLog: state.weightLog.filter(w => w.id !== action.payload) };

    default:
      return state;
  }
}

interface ContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const AppContext = createContext<ContextValue>({
  state: DEFAULT_STATE,
  dispatch: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const [loaded, setLoaded] = React.useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as AppState;
          dispatch({ type: 'LOAD_STATE', payload: saved });
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }
  }, [state, loaded]);

  if (!loaded) return null;

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
