import { MuscleCategory, WorkoutDefinition, SplitPreset, ScienceCard } from './types';

export const EXERCISES: Record<MuscleCategory, string[]> = {
  Shoulders: [
    'Dumbbell Lateral Raises', 'Cable Lateral Raises', 'Smith Shoulder Press',
    'Machine Shoulder Press', 'Rear Delt Fly', 'Face Pulls', 'Arnold Press',
  ],
  Chest: [
    'Chest Fly', 'Incline Smith Bench', 'Flat Barbell Bench', 'Pec Deck',
    'Cable Crossover', 'Machine Chest Press', 'Incline Dumbbell Press',
  ],
  Triceps: [
    'Single Arm Tricep Extension', 'JM Press', 'V-Bar Tricep Pushdown',
    'Skullcrushers', 'Overhead Cable Extension', 'Rope Pushdown', 'Dips',
  ],
  Biceps: [
    'Incline Curl', 'Preacher Curl', 'Cuffed Cable Reverse Curl',
    'Hammer Curl', 'Barbell Curl', 'Concentration Curl', 'Spider Curl',
  ],
  Back: [
    'Lat Pulldown', 'Kelso Shrugs', 'High to Low Close Grip Pulldown',
    'Close Grip Chest Supported Row', 'Chest Supported Row',
    'T-Bar Rows', 'Single Arm Cable Lat Row', 'Seated Cable Row',
    'Pull-Ups', 'Straight Arm Pulldown',
  ],
  'Lower Back': ['Back Extension', 'Reverse Hyperextension', 'Good Mornings'],
  Quads: [
    'Leg Extension', 'Leg Press', 'Hip Abduction',
    'Hack Squat', 'Barbell Squat', 'Bulgarian Split Squat', 'Pendulum Squat',
  ],
  Hamstrings: ['Leg Curl', 'SLDL', 'Romanian Deadlift', 'Seated Leg Curl', 'Nordic Curl'],
  Calves: ['Calf Raises', 'Seated Calf Raise', 'Leg Press Calf Raise'],
  Abs: ['Crunch Machine', 'Hanging Leg Raise', 'Cable Crunch', 'Plank', 'Ab Wheel'],
};

export function getExerciseCategory(name: string): MuscleCategory | null {
  for (const [cat, list] of Object.entries(EXERCISES)) {
    if (list.includes(name)) return cat as MuscleCategory;
  }
  return null;
}

// Shared lower body exercise list (used by both 'legs' and 'lower' workouts)
const LOWER_EXERCISES: WorkoutDefinition['exercises'] = [
  { n: 'Leg Extension',  c: 'Quads' },
  { n: 'Leg Curl',       c: 'Hamstrings' },
  { n: 'Leg Press',      c: 'Quads' },
  { n: 'SLDL',           c: 'Hamstrings' },
  { n: 'Calf Raises',    c: 'Calves' },
  { n: 'Hip Abduction',  c: 'Quads' },
  { n: 'Crunch Machine', c: 'Abs' },
];

const UPPER_EXERCISES: WorkoutDefinition['exercises'] = [
  { n: 'Chest Fly',                       c: 'Chest' },
  { n: 'Dumbbell Lateral Raises',         c: 'Shoulders' },
  { n: 'Incline Curl',                    c: 'Biceps' },
  { n: 'Single Arm Tricep Extension',     c: 'Triceps' },
  { n: 'Lat Pulldown',                    c: 'Back' },
  { n: 'Incline Smith Bench',             c: 'Chest' },
  { n: 'Preacher Curl',                   c: 'Biceps' },
  { n: 'Smith Shoulder Press',            c: 'Shoulders' },
  { n: 'Kelso Shrugs',                    c: 'Back' },
  { n: 'JM Press',                        c: 'Triceps' },
  { n: 'High to Low Close Grip Pulldown', c: 'Back' },
  { n: 'Cuffed Cable Reverse Curl',       c: 'Biceps' },
];

export const BUILT_IN_WORKOUTS: Record<string, WorkoutDefinition> = {
  push: {
    name: 'Push',
    exercises: [
      { n: 'Chest Fly',                   c: 'Chest' },
      { n: 'Dumbbell Lateral Raises',     c: 'Shoulders' },
      { n: 'Single Arm Tricep Extension', c: 'Triceps' },
      { n: 'Incline Smith Bench',         c: 'Chest' },
      { n: 'JM Press',                    c: 'Triceps' },
      { n: 'Smith Shoulder Press',        c: 'Shoulders' },
    ],
  },
  pull: {
    name: 'Pull',
    exercises: [
      { n: 'Lat Pulldown',                  c: 'Back' },
      { n: 'Incline Curl',                  c: 'Biceps' },
      { n: 'Kelso Shrugs',                  c: 'Back' },
      { n: 'Preacher Curl',                 c: 'Biceps' },
      { n: 'Close Grip Chest Supported Row',c: 'Back' },
      { n: 'Rear Delt Fly',                 c: 'Shoulders' },
    ],
  },
  legs: {
    name: 'Legs',
    exercises: LOWER_EXERCISES,
  },
  upper: {
    name: 'Upper',
    exercises: UPPER_EXERCISES,
  },
  lower: {
    name: 'Lower',
    exercises: LOWER_EXERCISES,
  },
  full: {
    name: 'Full Body',
    // Upper exercises first, then lower — do 1 set each (adjust in-workout as needed)
    exercises: [...UPPER_EXERCISES, ...LOWER_EXERCISES],
  },
};

// Exercises already well-developed → 1 set only (upper & lower).
// All other exercises in those workouts → 2 sets.
// push / pull / legs → 2 sets flat. full → 1 set flat.
export const STRONG_EXERCISES: Partial<Record<string, string[]>> = {
  upper: [
    'Lat Pulldown', 'Kelso Shrugs', 'Incline Smith Bench',
    'Smith Shoulder Press', 'High to Low Close Grip Pulldown', 'Preacher Curl',
  ],
  lower: [
    'Leg Press', 'SLDL', 'Leg Curl', 'Leg Extension', 'Hip Abduction', 'Calf Raises',
  ],
  legs: [
    'Leg Press', 'SLDL', 'Leg Curl', 'Leg Extension', 'Hip Abduction', 'Calf Raises',
  ],
};

export const SPLIT_PRESETS: SplitPreset[] = [
  // Science-based presets (set by onboarding)
  {
    id: 'fb3',
    name: 'Full Body ×3',
    defaultSchedule: ['full', 'rest', 'full', 'rest', 'full', 'rest', 'rest'],
  },
  {
    id: 'ul-fb4',
    name: 'Upper / Lower / Full Body ×2',
    defaultSchedule: ['upper', 'lower', 'rest', 'full', 'rest', 'full', 'rest'],
  },
  {
    id: 'ul-fb5',
    name: 'Upper / Lower / Full Body / Upper / Lower',
    defaultSchedule: ['upper', 'lower', 'rest', 'full', 'rest', 'upper', 'lower'],
  },
  {
    id: 'ul6',
    name: 'Upper / Lower ×3',
    defaultSchedule: ['upper', 'lower', 'rest', 'upper', 'lower', 'upper', 'lower'],
  },
  // Classic presets (available in Builder)
  {
    id: 'ppl',
    name: 'Push / Pull / Legs ×2',
    defaultSchedule: ['rest', 'push', 'pull', 'legs', 'push', 'pull', 'legs'],
  },
  {
    id: 'ul',
    name: 'Upper / Lower ×2',
    defaultSchedule: ['rest', 'upper', 'lower', 'rest', 'upper', 'lower', 'rest'],
  },
];

export const SCIENCE_CARDS: ScienceCard[] = [
  {
    id: 0,
    from: 'Lat Pulldown',
    to: 'Pull-Ups',
    reason: 'Pull-ups show greater lat activation and full-body integration vs machine pulldowns, especially for intermediate lifters.',
    workoutKeys: ['pull', 'upper', 'full'],
  },
  {
    id: 1,
    from: 'Leg Curl',
    to: 'Nordic Curl',
    reason: 'Nordic curls produce significantly greater eccentric hamstring force and have strong injury prevention evidence.',
    workoutKeys: ['legs', 'lower'],
  },
  {
    id: 2,
    from: 'Chest Fly',
    to: 'Cable Crossover',
    reason: 'Cable crossovers maintain constant tension through the full ROM, improving chest stretch and contraction stimulus.',
    workoutKeys: ['push', 'upper', 'full'],
  },
  {
    id: 3,
    from: 'Smith Shoulder Press',
    to: 'Arnold Press',
    reason: 'The Arnold press recruits all three deltoid heads through rotation, increasing total shoulder development.',
    workoutKeys: ['push'],
  },
];
