# SBLftr — Science-Based Lifter

A mobile strength-tracking app built for lifters who care about the evidence, not just the effort.

## What It Does

SBLftr is a React Native (Expo) app that handles the full lifting workflow: plan your week, log every set, track body weight and progress photos, and surface science-based technique updates that actually change how you train.

### Core Features

**Workout Logging**
- Active workout screen with set/rep/weight input per exercise
- Rest timer auto-starts after each completed set
- PR detection: flags a new personal record the moment a set beats your all-time best
- Dropsets supported (Premium)

**Training Plans**
- Two built-in splits: Push / Pull / Legs ×2 and Upper / Lower ×2
- Weekly schedule grid — tap any day to reassign its workout
- Custom split builder with any day type (not just push/pull/legs)
- Tap any workout card to see the exercise list + last session weights + PRs (Premium)

**Progress Tracking**
- Recent workouts horizontal scroll on the Progress tab
- Body weight logger with mini bar chart of last 10 entries
- Progress photos with AI-powered before/after body composition analysis (Premium, powered by GPT-4o Vision)

**Science Updates**
- "Science Updates" feed (accessible from Today) with dated research entries — meta-analyses and technique changes relevant to each exercise in the app
- In-app prompt to swap an exercise for an evidence-based alternative

**Daily Goals**
- Water intake counter (cup-based, +/− buttons)
- Steps and calorie goals with custom targets
- All targets editable from the Today screen

**Onboarding**
- 8-step personalised setup: name → goal → experience → training frequency → health app connect → sleep hours → lifestyle → Pro pitch
- Personalised Premium pitch based on sleep and lifestyle answers

**Premium Tier**
- Full performance recall for every exercise
- Custom split builder
- Dropsets
- Progress photos + GPT-4o body analysis
- All history (Base tier caps at 3 exercises per recall)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 (React Native 0.81.5) |
| Language | TypeScript |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| State | React `useReducer` + Context |
| Persistence | `@react-native-async-storage/async-storage` |
| Images | `expo-image-picker` + `expo-file-system` |
| SVG | `react-native-svg` |
| AI Vision | OpenAI GPT-4o via REST API |

---

## Project Structure

```
src/
  screens/
    Today.tsx         — home, daily goals, water, science card
    Plan.tsx          — split selector, weekly schedule, workout preview
    Progress.tsx      — recent workouts, weight tracker, progress photos
    Profile.tsx       — account, premium, developer tools
    Onboarding.tsx    — 8-step first-run flow
    ActiveWorkout.tsx — live workout logging
    Builder.tsx       — custom split creator
    WhatsNew.tsx      — science-based research feed
  state/
    AppContext.tsx     — global reducer + AsyncStorage persistence
  components/
    BodyDiagram.tsx   — SVG muscle recovery diagram
  types.ts
  data.ts            — built-in workouts, exercises, science cards
  utils.ts           — date helpers, PR detection, streak, test data generator
  theme.ts           — dark colour palette
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `i` / `a` to open in a simulator.

### Developer Mode

In Profile, toggle **Dev Mode** to unlock:
- Date offset controls (simulate any day)
- Generate 2 weeks of PPL test history with escalating weights (triggers PR detection)
- Clear all history
- Photo Analysis Test — pick a before/after photo pair and get a real GPT-4o body composition analysis

---

## Roadmap

- [ ] Apple Health / Google Fit integration
- [ ] Real payment flow for Premium (RevenueCat)
- [ ] Push notifications for rest timer
- [ ] Volume and 1RM trend charts
- [ ] Expanded exercise library with video cues
- [ ] Cloud sync / multi-device support
