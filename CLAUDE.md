@AGENTS.md

# SBLftr — Science-Based Lifting Tracker

Expo + React Native app for tracking science-based workout splits. Dark-themed, GPT-4o powered onboarding and body analysis, AsyncStorage persistence.

## Stack

- **Expo SDK 54** (React Native 0.81.5, React 19.1.0) — always read versioned docs at https://docs.expo.dev/versions/v56.0.0/
- **TypeScript** strict mode — `noUnusedLocals: true`, `noUnusedParameters: true`
- **React Navigation 7**: `createNativeStackNavigator` + `createBottomTabNavigator`
- **State**: Context + `useReducer` in `src/state/AppContext.tsx`, persisted with AsyncStorage
- **Hermes JS engine** — no lookbehind regex. Use `/^([^.!?]*[.!?])[\s\S]*$/` instead of `/(?<=[.!?])\s/`
- **react-native-svg** is installed — use `Svg`, `Polyline`, `Circle`, `Text as SvgText` for charts
- **expo-image-picker** + **expo-file-system/legacy** (`readAsStringAsync`) for base64 photo encoding
- **OpenAI**: GPT-4o (with photos) or GPT-4o-mini (text-only) via REST fetch

## API Key — CRITICAL

The OpenAI API key lives ONLY in `src/constants.ts` (gitignored). Never commit it. Template at `src/constants.example.ts`.

```ts
import { OPENAI_API_KEY } from '../constants';
```

## Theme (`src/theme.ts`)

```ts
C.bg = '#0F0F0F'       // page background
C.surface = '#1A1A1A'  // cards
C.border = '#2D2D2D'
C.accent = '#FF6B35'   // orange
C.accentDim = 'rgba(255,107,53,0.15)'
C.text = '#FFFFFF'
C.textSec = '#888888'
C.textMut = '#444444'
C.success = '#4CAF50'
C.warning = '#FFC107'
C.error = '#F44336'
```

## File Map

```
src/
  types.ts              — All interfaces + AppState + Action union
  theme.ts              — C color palette, DAY_LABELS, MUSCLE_CATEGORIES
  data.ts               — BUILT_IN_WORKOUTS, SPLIT_PRESETS, EXERCISES, SCIENCE_CARDS
  utils.ts              — getTodayKey, getStreak, getRecovery, formatDate, formatShortDate, isPR, getEffectiveDate
  constants.ts          — OPENAI_API_KEY (gitignored)
  constants.example.ts  — template for constants.ts
  state/
    AppContext.tsx       — DEFAULT_STATE, reducer, useApp() hook
  screens/
    Onboarding.tsx      — 9-step onboarding: name → physique → level → stats → obstacles → days → photos → loading → paywall
    Today.tsx           — Home tab: header with streak pill, today's workout card, daily goals, muscle recovery diagram
    Plan.tsx            — Active split selector, weekly schedule grid, workout detail modal
    Progress.tsx        — Weight stats card, SVG line graph, AI body analysis (GPT-4o vision)
    Profile.tsx         — Settings, units, rest timer, premium toggle, dev mode
    ActiveWorkout.tsx   — In-session workout tracker with sets, rest timer, drop sets, unilateral
    History.tsx         — Past session list and detail view
    Builder.tsx         — Custom split builder
    WhatsNew.tsx        — Patch notes / changelog screen
  components/
    BodyDiagram.tsx     — Muscle recovery SVG diagram
```

## AppState Shape

```ts
interface AppState {
  // User profile (from onboarding)
  user: string | null
  physique: 'athletic' | 'aesthetic' | 'strongman' | null
  experience: string | null        // 'beginner' | 'novice' | 'intermediate' | 'advanced'
  frequency: number | null         // days/week chosen
  heightFeet: number | null
  heightInches: number | null
  weightLbs: number | null         // starting weight entered at onboarding
  obstacles: string[]
  onboardingPhotoUri: string | null
  gptPlan: string | null           // raw GPT response from onboarding
  personalizedSplitId: string | null  // science split set by onboarding — persists even if user switches splits

  // Subscription
  premium: boolean

  // Settings
  units: 'kg' | 'lb'
  health: boolean
  restDefault: number              // seconds

  // Active training
  split: string                    // currently active split id
  schedule: string[]               // 7-element array, e.g. ['upper','lower','rest',...]
  workouts: Record<string, WorkoutDefinition>
  customSplits: CustomSplit[]

  // Logs
  history: HistoryItem[]
  weightLog: WeightEntry[]         // newest-first; weightLog[0] = most recent
  photos: ProgressPhoto[]

  // Daily goals (reset each day)
  goals: DailyGoals                // { water: number; steps: boolean; calories: boolean; date: string }
  goalTargets: GoalTargets         // { water: number; steps: number; calories: number }

  // Science suggestions
  scienceIdx: number
  scienceDismissed: boolean

  // Active session
  activeWorkout: ActiveWorkout | null

  // Dev / testing
  devMode: boolean
  devOffset: number               // days offset for simulating dates
  devApiKey: string
}
```

## Splits

### Science-based (set by onboarding, stored in `personalizedSplitId`)

| ID | Days | Schedule |
|----|------|----------|
| `fb3` | 3 | full, rest, full, rest, full, rest, rest |
| `ul-fb4` | 4 | upper, lower, rest, full, rest, full, rest |
| `ul-fb5` | 5 | upper, lower, rest, full, rest, upper, lower |
| `ul6` | 6 | upper, lower, rest, upper, lower, upper, lower |

### Classic (user-selectable on Plan page)

| ID | Label |
|----|-------|
| `ppl` | P/P/L ×2 |
| `ul` | U/L ×2 |

### Plan page chip rules
- Classic chips (`ppl`, `ul`) are always tappable
- MY PLAN chip shows when `state.personalizedSplitId` is set — tappable for ALL users (not Pro-only)
- MY PLAN shows abbreviated schedule: upper→U, lower→L, full→FB, push→P, pull→Pl, legs→Lg joined with /
- Workout tiles on Plan page are filtered to only show workouts that appear in `state.schedule`

## Built-in Workouts

**Push**: Chest Fly, Dumbbell Lateral Raises, Single Arm Tricep Extension, Incline Smith Bench, JM Press, Smith Shoulder Press

**Pull**: Lat Pulldown, Incline Curl, Kelso Shrugs, Preacher Curl, Close Grip Chest Supported Row, Rear Delt Fly

**Legs / Lower**: Leg Extension, Leg Curl, Leg Press, SLDL, Calf Raises, Hip Abduction, Crunch Machine

**Upper**: Chest Fly, Dumbbell Lateral Raises, Incline Curl, Single Arm Tricep Extension, Lat Pulldown, Incline Smith Bench, Preacher Curl, Smith Shoulder Press, Kelso Shrugs, JM Press, High to Low Close Grip Pulldown, Cuffed Cable Reverse Curl

**Full**: UPPER_EXERCISES + LOWER_EXERCISES combined

## Onboarding Flow

Steps: Name (0) → Physique (1) → Experience Level (2) → Height & Weight (3) → Obstacles (4) → Training Days (5) → Progress Photos (6) → Loading/GPT (7) → Paywall (8)

### GPT Plan (`buildPlan` in Onboarding.tsx)
- Model: `gpt-4o` if photos provided, else `gpt-4o-mini`
- max_tokens: 500
- Prompt sections returned: `OVERVIEW`, `CURRENT STRENGTHS`, `WHAT TO FOCUS ON`
- `parsePlan` extracts these into `{ overview, strengths[], priorities[], ... }`
- First-sentence safety for OVERVIEW: `/^([^.!?]*[.!?])[\s\S]*$/` (Hermes-compatible, no lookbehind)

### Paywall phases
1. **Plan phase** (`paywallPhase === 'plan'`): shows OVERVIEW (1 sentence) + CURRENT STRENGTHS (green bullets) + WHAT TO FOCUS ON (schedule chips + orange bullets) + Continue button
2. **Pricing phase** (`paywallPhase === 'pricing'`): Pro ($9.99) → Discount ($4.99/3mo) → Free trial stages

### `finishOnboarding(premium: boolean)`
Dispatches:
1. `SET_USER`
2. `SETUP_PROFILE` (includes `personalizedSplitId: preset.id`)
3. `SET_SPLIT` (sets split + physique-ordered workouts)
4. `SET_PREMIUM`

### PHYSIQUE_PRIORITY
Exercise ordering per physique goal. Applied via `applyPhysiqueToWorkouts(physique)` for keys: `push`, `pull`, `upper`, `lower`, `full`.

## State Management

`LOAD_STATE` merge pattern in reducer:
```ts
return { ...DEFAULT_STATE, ...action.payload, activeWorkout: null }
```

Key actions: `SETUP_PROFILE`, `SET_SPLIT`, `SET_PREMIUM`, `START_WORKOUT`, `FINISH_WORKOUT`, `LOG_WEIGHT`, `DELETE_WEIGHT`, `LOG_WEIGHT` inserts at front of `weightLog` (index 0 = newest).

## Today Screen

- Header: greeting + 🔥 streak pill (inline) → date line → What's New button
- Streak pill only shown when `streak > 0`
- Today card: workout name + exercise list + Start/Resume button
- Daily Goals: water cup counter (tap +/−), steps checkbox, calories checkbox; tap target number to edit
- Muscle recovery body diagram below goals

## Progress Screen

- Stats card: Starting weight (from `state.weightLbs`) + Current weight (from `state.weightLog[0]`) + `+ Log` button
- SVG line graph: shows all logged weights chronologically; if no logs yet, shows single dot at `state.weightLbs` (starting weight from onboarding)
- Weight log history below graph (long-press to delete entry)
- AI Body Analysis: GPT-4o vision with Before/After photo picker; outputs `CURRENT STRENGTHS` + `WHAT TO FOCUS ON` + `VERDICT` sections; gated behind `state.premium`

## Profile Screen

- Settings: units toggle (kg/lb), rest timer default
- Subscription: premium toggle
- Dev mode: tap profile picture 7× to enable; allows date simulation, test data injection

## Modal scroll fix pattern

When a modal's backdrop `TouchableOpacity` wraps the content and steals scroll events:
```tsx
<TouchableOpacity style={backdrop} onPress={closeModal} activeOpacity={1}>
  <TouchableOpacity style={sheet} onPress={() => {}} activeOpacity={1}>
    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
      {/* content */}
    </ScrollView>
  </TouchableOpacity>
</TouchableOpacity>
```

## Navigation Structure

```
RootStack (NativeStack)
  ├── Main (BottomTabs)
  │     ├── Today
  │     ├── Plan
  │     ├── Progress
  │     └── Profile
  ├── ActiveWorkout
  ├── Builder  { splitId?: string }
  ├── HistoryDetail  { sessionId: string }
  └── WhatsNew
```

App shows `OnboardingScreen` when `state.user === null`, otherwise shows `RootStack`.

## Planned / Future Features

- Supabase database + auth (sign in / sign up) — currently all state is local AsyncStorage only
- Apple Health Sync — removed from Profile for now, planned as future onboarding step
- Better muscle recovery / body diagram (anatomical SVG paths)
- Custom split builder improvements (custom day name input)
- Water counter and patch notes button UI improvements
- WhatsNew screen content
