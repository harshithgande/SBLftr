import { MuscleCategory, WorkoutDefinition, SplitPreset, ScienceCard } from './types';

export const EXERCISES: Record<MuscleCategory, string[]> = {
  Shoulders: [
    'Cable Lateral Raises', 'Dumbbell Lateral Raises', 'Smith Shoulder Press',
    'Machine Shoulder Press', 'Rear Delt Fly', 'Face Pulls', 'Arnold Press',
  ],
  Chest: [
    'Chest Fly', 'Incline Smith Bench', 'Flat Barbell Bench', 'Pec Deck',
    'Cable Crossover', 'Machine Chest Press', 'Incline Dumbbell Press',
  ],
  Triceps: [
    'Single Arm Tricep Extension', 'V-Bar Tricep Pushdown', 'JM Press',
    'Skullcrushers', 'Overhead Cable Extension', 'Rope Pushdown', 'Dips',
  ],
  Biceps: [
    'Incline Curl', 'Preacher Curl', 'Cuffed Cable Reverse Curl',
    'Hammer Curl', 'Barbell Curl', 'Concentration Curl', 'Spider Curl',
  ],
  Back: [
    'Lat Pulldown', 'T-Bar Rows', 'Single Arm Cable Lat Row', 'Seated Cable Row',
    'Pull-Ups', 'Chest Supported Row', 'Straight Arm Pulldown',
  ],
  'Lower Back': ['Back Extension', 'Reverse Hyperextension', 'Good Mornings'],
  Quads: [
    'Leg Extension', 'Hack Squat', 'Leg Press', 'Barbell Squat',
    'Bulgarian Split Squat', 'Pendulum Squat',
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

export const BUILT_IN_WORKOUTS: Record<string, WorkoutDefinition> = {
  push: {
    name: 'Push',
    exercises: [
      { n: 'Cable Lateral Raises', c: 'Shoulders' },
      { n: 'Chest Fly', c: 'Chest' },
      { n: 'Single Arm Tricep Extension', c: 'Triceps' },
      { n: 'Incline Smith Bench', c: 'Chest' },
      { n: 'Smith Shoulder Press', c: 'Shoulders' },
      { n: 'JM Press', c: 'Triceps' },
    ],
  },
  pull: {
    name: 'Pull',
    exercises: [
      { n: 'Incline Curl', c: 'Biceps' },
      { n: 'Lat Pulldown', c: 'Back' },
      { n: 'Preacher Curl', c: 'Biceps' },
      { n: 'T-Bar Rows', c: 'Back' },
      { n: 'Cuffed Cable Reverse Curl', c: 'Biceps' },
      { n: 'Single Arm Cable Lat Row', c: 'Back' },
      { n: 'Back Extension', c: 'Lower Back' },
    ],
  },
  legs: {
    name: 'Legs',
    exercises: [
      { n: 'Leg Extension', c: 'Quads' },
      { n: 'Leg Curl', c: 'Hamstrings' },
      { n: 'Hack Squat', c: 'Quads' },
      { n: 'SLDL', c: 'Hamstrings' },
      { n: 'Calf Raises', c: 'Calves' },
      { n: 'Crunch Machine', c: 'Abs' },
    ],
  },
  upper: {
    name: 'Upper',
    exercises: [
      { n: 'Cable Lateral Raises', c: 'Shoulders' },
      { n: 'Chest Fly', c: 'Chest' },
      { n: 'V-Bar Tricep Pushdown', c: 'Triceps' },
      { n: 'Incline Smith Bench', c: 'Chest' },
      { n: 'Lat Pulldown', c: 'Back' },
      { n: 'Preacher Curl', c: 'Biceps' },
      { n: 'T-Bar Rows', c: 'Back' },
      { n: 'Cuffed Cable Reverse Curl', c: 'Biceps' },
    ],
  },
  lower: {
    name: 'Lower',
    exercises: [
      { n: 'Leg Extension', c: 'Quads' },
      { n: 'Leg Curl', c: 'Hamstrings' },
      { n: 'Hack Squat', c: 'Quads' },
      { n: 'SLDL', c: 'Hamstrings' },
      { n: 'Calf Raises', c: 'Calves' },
      { n: 'Crunch Machine', c: 'Abs' },
    ],
  },
};

export const SPLIT_PRESETS: SplitPreset[] = [
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
    workoutKeys: ['pull', 'upper'],
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
    workoutKeys: ['push', 'upper'],
  },
  {
    id: 3,
    from: 'Smith Shoulder Press',
    to: 'Arnold Press',
    reason: 'The Arnold press recruits all three deltoid heads through rotation, increasing total shoulder development.',
    workoutKeys: ['push'],
  },
];
