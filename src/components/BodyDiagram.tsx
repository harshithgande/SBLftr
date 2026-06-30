import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { MuscleCategory, RecoveryStatus } from '../types';
import { C } from '../theme';

const BASE = '#1A1C20';
const OUTLINE = '#3C404A';
const INACTIVE = '#262930';

function rc(s?: RecoveryStatus): string {
  if (!s) return INACTIVE;
  return s === 'ready' ? C.ready : s === 'half' ? C.half : C.rest;
}

type R = Partial<Record<MuscleCategory, RecoveryStatus>>;

// Shared body silhouette — viewBox 0 0 100 248
function Silhouette() {
  return (
    <G>
      {/* Head */}
      <Circle cx={50} cy={15} r={13} fill={BASE} stroke={OUTLINE} strokeWidth={1.5} />
      {/* Neck */}
      <Path d="M43,27 Q44,32 44,36 L56,36 Q56,32 57,27 Z" fill={BASE} />
      {/* Upper torso — wide at shoulders, taper to waist */}
      <Path
        d="M43,36 C32,36 14,40 12,54 C10,62 14,68 18,80 L22,110 L78,110 L82,80 C86,68 90,62 88,54 C86,40 68,36 57,36 Z"
        fill={BASE} stroke={OUTLINE} strokeWidth={1}
      />
      {/* Lower torso / hips */}
      <Path d="M22,108 L24,122 C25,126 28,128 32,128 L68,128 C72,128 75,126 76,122 L78,108 Z" fill={BASE} />
      {/* Left upper arm */}
      <Path
        d="M12,54 C6,60 4,72 5,84 C6,96 9,106 12,110 L24,110 L18,80 C14,68 10,62 12,54 Z"
        fill={BASE} stroke={OUTLINE} strokeWidth={1}
      />
      {/* Right upper arm */}
      <Path
        d="M88,54 C94,60 96,72 95,84 C94,96 91,106 88,110 L76,110 L82,80 C86,68 90,62 88,54 Z"
        fill={BASE} stroke={OUTLINE} strokeWidth={1}
      />
      {/* Left forearm */}
      <Path
        d="M12,110 C10,118 9,128 10,138 C11,144 14,148 17,148 L22,148 C23,140 22,130 20,120 L24,110 Z"
        fill={BASE} stroke={OUTLINE} strokeWidth={1}
      />
      {/* Right forearm */}
      <Path
        d="M88,110 C90,118 91,128 90,138 C89,144 86,148 83,148 L78,148 C77,140 78,130 80,120 L76,110 Z"
        fill={BASE} stroke={OUTLINE} strokeWidth={1}
      />
      {/* Left thigh */}
      <Path
        d="M24,126 C20,132 18,144 20,158 C22,170 26,178 32,182 L46,182 C50,176 52,164 50,152 C48,140 46,130 44,126 Z"
        fill={BASE} stroke={OUTLINE} strokeWidth={1}
      />
      {/* Right thigh */}
      <Path
        d="M76,126 C80,132 82,144 80,158 C78,170 74,178 68,182 L54,182 C50,176 48,164 50,152 C52,140 54,130 56,126 Z"
        fill={BASE} stroke={OUTLINE} strokeWidth={1}
      />
      {/* Left lower leg */}
      <Path
        d="M32,182 C28,188 26,200 28,212 C30,222 34,228 38,230 L44,230 C46,226 48,214 46,206 C44,196 42,186 46,182 Z"
        fill={BASE} stroke={OUTLINE} strokeWidth={1}
      />
      {/* Right lower leg */}
      <Path
        d="M68,182 C72,188 74,200 72,212 C70,222 66,228 62,230 L56,230 C54,226 52,214 54,206 C56,196 58,186 54,182 Z"
        fill={BASE} stroke={OUTLINE} strokeWidth={1}
      />
    </G>
  );
}

// ── FRONT figure ─────────────────────────────────────────────────────────────
function Front({ r }: { r: R }) {
  const sh = rc(r.Shoulders);
  const ch = rc(r.Chest);
  const bi = rc(r.Biceps);
  const ab = rc(r.Abs);
  const qu = rc(r.Quads);
  const ca = rc(r.Calves);

  return (
    <Svg viewBox="0 0 100 248" width="100%" height="100%">
      <Silhouette />

      {/* Left deltoid — rounded cap on outer shoulder */}
      <Path d="M12,50 C8,46 10,38 18,40 C24,42 26,52 22,58 C18,64 10,62 12,54 Z" fill={sh} opacity={0.92} />
      {/* Right deltoid */}
      <Path d="M88,50 C92,46 90,38 82,40 C76,42 74,52 78,58 C82,64 90,62 88,54 Z" fill={sh} opacity={0.92} />

      {/* Left pec — fan from sternum to shoulder */}
      <Path d="M46,44 C40,44 28,50 24,62 C22,68 24,76 30,80 C38,84 46,80 48,74 Z" fill={ch} opacity={0.92} />
      {/* Right pec */}
      <Path d="M54,44 C60,44 72,50 76,62 C78,68 76,76 70,80 C62,84 54,80 52,74 Z" fill={ch} opacity={0.92} />

      {/* Left bicep — inner front of upper arm */}
      <Path d="M6,62 C4,70 4,82 6,92 C8,100 13,104 16,102 L18,86 C14,78 10,68 10,64 Z" fill={bi} opacity={0.92} />
      {/* Right bicep */}
      <Path d="M94,62 C96,70 96,82 94,92 C92,100 87,104 84,102 L82,86 C86,78 90,68 90,64 Z" fill={bi} opacity={0.92} />

      {/* Abs — 3 rows × 2 cols of rounded blocks */}
      {[0, 1, 2].map(row =>
        [0, 1].map(col => (
          <Rect
            key={`${row}-${col}`}
            x={36 + col * 14}
            y={84 + row * 12}
            width={12}
            height={9}
            rx={2.5}
            fill={ab}
            opacity={0.9}
          />
        ))
      )}

      {/* Left quad */}
      <Path d="M26,128 C22,134 20,146 22,160 C24,172 28,180 34,184 L46,184 C50,178 52,166 50,154 C48,142 46,132 44,128 Z" fill={qu} opacity={0.92} />
      {/* Right quad */}
      <Path d="M74,128 C78,134 80,146 78,160 C76,172 72,180 66,184 L54,184 C50,178 48,166 50,154 C52,142 54,132 56,128 Z" fill={qu} opacity={0.92} />

      {/* Left tibialis anterior — narrow strip on outer shin */}
      <Path d="M32,186 C30,194 30,206 32,214 C34,220 37,222 39,222 L41,222 C43,220 43,212 41,206 C39,198 37,190 33,186 Z" fill={ca} opacity={0.88} />
      {/* Right tibialis */}
      <Path d="M68,186 C70,194 70,206 68,214 C66,220 63,222 61,222 L59,222 C57,220 57,212 59,206 C61,198 63,190 67,186 Z" fill={ca} opacity={0.88} />
    </Svg>
  );
}

// ── BACK figure ──────────────────────────────────────────────────────────────
function Back({ r }: { r: R }) {
  const sh = rc(r.Shoulders);
  const ba = rc(r.Back);
  const lb = rc(r['Lower Back']);
  const tr = rc(r.Triceps);
  const ha = rc(r.Hamstrings);
  const ca = rc(r.Calves);

  return (
    <Svg viewBox="0 0 100 248" width="100%" height="100%">
      <Silhouette />

      {/* Left rear deltoid */}
      <Path d="M12,50 C8,46 10,38 18,40 C24,42 26,52 22,58 C18,64 10,62 12,54 Z" fill={sh} opacity={0.92} />
      {/* Right rear deltoid */}
      <Path d="M88,50 C92,46 90,38 82,40 C76,42 74,52 78,58 C82,64 90,62 88,54 Z" fill={sh} opacity={0.92} />
      {/* Trapezius — diamond from neck across to shoulders */}
      <Path d="M50,34 C46,36 36,42 26,50 L34,58 C40,54 46,50 50,48 C54,50 60,54 66,58 L74,50 C64,42 54,36 50,34 Z" fill={sh} opacity={0.78} />

      {/* Left lat — V-wing from armpit to waist */}
      <Path d="M18,58 C14,66 12,78 14,90 C16,100 20,106 26,108 L36,98 C30,92 26,82 24,72 C22,64 20,60 18,58 Z" fill={ba} opacity={0.92} />
      {/* Right lat */}
      <Path d="M82,58 C86,66 88,78 86,90 C84,100 80,106 74,108 L64,98 C70,92 74,82 76,72 C78,64 80,60 82,58 Z" fill={ba} opacity={0.92} />
      {/* Center upper back — rhomboids / mid-trap */}
      <Path d="M36,58 L38,76 C42,82 46,84 50,84 C54,84 58,82 62,76 L64,58 C60,54 54,50 50,48 C46,50 40,54 36,58 Z" fill={ba} opacity={0.84} />

      {/* Lower back — erector spinae columns */}
      <Path d="M38,98 C36,104 36,114 38,122 C40,128 44,130 50,130 C56,130 60,128 62,122 C64,114 64,104 62,98 C58,94 54,92 50,92 C46,92 42,94 38,98 Z" fill={lb} opacity={0.92} />

      {/* Left tricep — horseshoe at back of upper arm */}
      <Path d="M6,62 C4,70 4,84 6,94 C8,102 13,106 16,104 L18,88 C14,80 10,70 10,64 Z" fill={tr} opacity={0.92} />
      {/* Right tricep */}
      <Path d="M94,62 C96,70 96,84 94,94 C92,102 87,106 84,104 L82,88 C86,80 90,70 90,64 Z" fill={tr} opacity={0.92} />

      {/* Left hamstring */}
      <Path d="M26,128 C22,136 20,148 22,162 C24,174 28,182 34,186 L46,186 C50,180 52,168 50,156 C48,144 46,134 44,128 Z" fill={ha} opacity={0.92} />
      {/* Right hamstring */}
      <Path d="M74,128 C78,136 80,148 78,162 C76,174 72,182 66,186 L54,186 C50,180 48,168 50,156 C52,144 54,134 56,128 Z" fill={ha} opacity={0.92} />

      {/* Left gastrocnemius — wider diamond at back of calf */}
      <Path d="M30,186 C26,194 24,206 26,216 C28,224 32,230 38,232 L44,232 C46,226 48,216 46,208 C44,198 42,190 38,186 Z" fill={ca} opacity={0.92} />
      {/* Right gastrocnemius */}
      <Path d="M70,186 C74,194 76,206 74,216 C72,224 68,230 62,232 L56,232 C54,226 52,216 54,208 C56,198 58,190 62,186 Z" fill={ca} opacity={0.92} />
    </Svg>
  );
}

export default function BodyDiagram({ recovery }: { recovery: R }) {
  return (
    <View style={s.wrap}>
      <View style={s.fig}><Front r={recovery} /></View>
      <View style={s.fig}><Back r={recovery} /></View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', height: 240, paddingHorizontal: 4 },
  fig: { flex: 1 },
});
