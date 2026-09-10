// Built-in animated exercise demos: stick figures animated with SMIL (works in Safari & Chrome, no JS).
// Each demo is a list of poses with identical path structure so the `d` attributes can be interpolated.

interface Pose { head: [number, number]; torso: string; arms: string; legs: string }
interface DemoDef { poses: Pose[]; dur: number; props?: string[]; floor?: boolean }

const stand: Pose = { head: [60, 22], torso: 'M60 32 L60 70', arms: 'M60 42 L52 64 L50 82 M60 42 L68 64 L70 82', legs: 'M60 70 L52 88 L52 105 M60 70 L68 88 L68 105' };

export const DEMOS: Record<string, DemoDef> = {
  'jumping-jack': {
    dur: 1.1, floor: true,
    poses: [
      { head: [60, 24], torso: 'M60 34 L60 70', arms: 'M60 44 L52 64 L50 82 M60 44 L68 64 L70 82', legs: 'M60 70 L56 88 L56 105 M60 70 L64 88 L64 105' },
      { head: [60, 18], torso: 'M60 28 L60 66', arms: 'M60 38 L44 26 L40 6 M60 38 L76 26 L80 6', legs: 'M60 66 L46 84 L40 101 M60 66 L74 84 L80 101' },
    ],
  },
  'high-knees': {
    dur: 0.9, floor: true,
    poses: [
      { head: [60, 20], torso: 'M60 30 L60 68', arms: 'M60 40 L50 52 L60 46 M60 40 L70 52 L64 66', legs: 'M60 68 L48 70 L54 84 M60 68 L64 88 L64 105' },
      { head: [60, 20], torso: 'M60 30 L60 68', arms: 'M60 40 L50 52 L56 66 M60 40 L70 52 L60 46', legs: 'M60 68 L56 88 L56 105 M60 68 L72 70 L66 84' },
    ],
  },
  'jump-rope': {
    dur: 0.7, floor: true,
    props: ['<path d="M34 60 Q60 118 86 60" fill="none"><animate attributeName="d" values="M34 60 Q60 118 86 60;M34 60 Q60 2 86 60;M34 60 Q60 118 86 60" dur="0.7s" repeatCount="indefinite"/></path>'],
    poses: [
      { head: [60, 24], torso: 'M60 34 L60 70', arms: 'M60 44 L48 60 L38 62 M60 44 L72 60 L82 62', legs: 'M60 70 L55 88 L55 105 M60 70 L65 88 L65 105' },
      { head: [60, 16], torso: 'M60 26 L60 62', arms: 'M60 36 L48 52 L38 54 M60 36 L72 52 L82 54', legs: 'M60 62 L56 80 L56 96 M60 62 L64 80 L64 96' },
    ],
  },
  burpee: {
    dur: 2.4, floor: true,
    poses: [
      stand,
      { head: [60, 42], torso: 'M60 52 L58 80', arms: 'M60 60 L44 84 L40 104 M60 60 L76 84 L80 104', legs: 'M58 80 L40 92 L44 105 M58 80 L76 92 L72 105' },
      { head: [60, 60], torso: 'M60 70 L58 90', arms: 'M60 74 L42 92 L40 104 M60 74 L78 92 L80 104', legs: 'M58 90 L40 100 L34 105 M58 90 L76 100 L82 105' },
      { head: [60, 42], torso: 'M60 52 L58 80', arms: 'M60 60 L44 84 L40 104 M60 60 L76 84 L80 104', legs: 'M58 80 L40 92 L44 105 M58 80 L76 92 L72 105' },
      { head: [60, 12], torso: 'M60 22 L60 58', arms: 'M60 30 L46 14 L42 0 M60 30 L74 14 L78 0', legs: 'M60 58 L52 76 L50 92 M60 58 L68 76 L70 92' },
      stand,
    ],
  },
  'mountain-climber': {
    dur: 0.8, floor: true,
    poses: [
      { head: [100, 50], torso: 'M92 54 L42 76', arms: 'M90 56 L92 78 L92 100 M90 56 L92 78 L92 100', legs: 'M42 76 L24 88 L8 100 M42 76 L64 84 L60 100' },
      { head: [100, 50], torso: 'M92 54 L42 76', arms: 'M90 56 L92 78 L92 100 M90 56 L92 78 L92 100', legs: 'M42 76 L64 84 L60 100 M42 76 L24 88 L8 100' },
    ],
  },
  squat: {
    dur: 2, floor: true,
    poses: [
      stand,
      { head: [60, 40], torso: 'M60 50 L58 78', arms: 'M60 58 L40 58 L22 56 M60 58 L80 58 L98 56', legs: 'M58 78 L36 88 L40 105 M58 78 L80 88 L76 105' },
      stand,
    ],
  },
  'jump-squat': {
    dur: 1.4, floor: true,
    poses: [
      { head: [60, 40], torso: 'M60 50 L58 78', arms: 'M60 58 L40 64 L30 76 M60 58 L80 64 L90 76', legs: 'M58 78 L36 88 L40 105 M58 78 L80 88 L76 105' },
      { head: [60, 10], torso: 'M60 20 L60 56', arms: 'M60 28 L46 12 L42 0 M60 28 L74 12 L78 0', legs: 'M60 56 L54 74 L52 90 M60 56 L66 74 L68 90' },
      { head: [60, 40], torso: 'M60 50 L58 78', arms: 'M60 58 L40 64 L30 76 M60 58 L80 64 L90 76', legs: 'M58 78 L36 88 L40 105 M58 78 L80 88 L76 105' },
    ],
  },
  lunge: {
    dur: 2, floor: true,
    poses: [
      { head: [60, 22], torso: 'M60 32 L60 70', arms: 'M60 42 L58 62 L58 80 M60 42 L62 62 L62 80', legs: 'M60 70 L58 88 L58 105 M60 70 L62 88 L62 105' },
      { head: [60, 38], torso: 'M60 48 L60 80', arms: 'M60 58 L58 74 L58 90 M60 58 L62 74 L62 90', legs: 'M60 80 L84 82 L86 105 M60 80 L44 98 L30 104' },
      { head: [60, 22], torso: 'M60 32 L60 70', arms: 'M60 42 L58 62 L58 80 M60 42 L62 62 L62 80', legs: 'M60 70 L58 88 L58 105 M60 70 L62 88 L62 105' },
    ],
  },
  'glute-bridge': {
    dur: 2, floor: true,
    poses: [
      { head: [14, 92], torso: 'M23 92 L64 92', arms: 'M26 94 L44 98 L60 100 M26 94 L44 98 L60 100', legs: 'M64 92 L80 74 L88 100 M64 92 L80 74 L88 100' },
      { head: [14, 92], torso: 'M23 92 L64 66', arms: 'M26 94 L44 98 L60 100 M26 94 L44 98 L60 100', legs: 'M64 66 L82 70 L88 100 M64 66 L82 70 L88 100' },
      { head: [14, 92], torso: 'M23 92 L64 92', arms: 'M26 94 L44 98 L60 100 M26 94 L44 98 L60 100', legs: 'M64 92 L80 74 L88 100 M64 92 L80 74 L88 100' },
    ],
  },
  'wall-sit': {
    dur: 3, floor: true,
    props: ['<path d="M22 0 L22 104" stroke-width="3" opacity="0.4"/>'],
    poses: [
      { head: [34, 40], torso: 'M34 50 L36 76', arms: 'M34 58 L48 66 L60 72 M34 58 L48 66 L60 72', legs: 'M36 76 L68 76 L68 105 M36 76 L68 76 L68 105' },
      { head: [34, 41], torso: 'M34 51 L36 76', arms: 'M34 59 L48 67 L60 73 M34 59 L48 67 L60 73', legs: 'M36 76 L68 76 L68 105 M36 76 L68 76 L68 105' },
      { head: [34, 40], torso: 'M34 50 L36 76', arms: 'M34 58 L48 66 L60 72 M34 58 L48 66 L60 72', legs: 'M36 76 L68 76 L68 105 M36 76 L68 76 L68 105' },
    ],
  },
  'push-up': {
    dur: 2, floor: true,
    poses: [
      { head: [100, 52], torso: 'M92 56 L42 78', arms: 'M90 58 L90 80 L90 100 M90 58 L90 80 L90 100', legs: 'M42 78 L24 88 L8 100 M42 78 L24 88 L8 100' },
      { head: [98, 74], torso: 'M90 78 L40 88', arms: 'M88 80 L104 90 L92 100 M88 80 L104 90 L92 100', legs: 'M40 88 L22 94 L8 100 M40 88 L22 94 L8 100' },
      { head: [100, 52], torso: 'M92 56 L42 78', arms: 'M90 58 L90 80 L90 100 M90 58 L90 80 L90 100', legs: 'M42 78 L24 88 L8 100 M42 78 L24 88 L8 100' },
    ],
  },
  dip: {
    dur: 2, floor: true,
    props: ['<path d="M74 80 L110 80 M110 80 L110 104 M78 80 L78 104" stroke-width="3" opacity="0.4"/>'],
    poses: [
      { head: [56, 40], torso: 'M58 50 L60 80', arms: 'M58 54 L76 68 L78 80 M58 54 L76 68 L78 80', legs: 'M60 80 L34 90 L20 104 M60 80 L34 90 L20 104' },
      { head: [56, 54], torso: 'M58 64 L60 90', arms: 'M58 66 L84 70 L78 80 M58 66 L84 70 L78 80', legs: 'M60 90 L34 94 L20 104 M60 90 L34 94 L20 104' },
      { head: [56, 40], torso: 'M58 50 L60 80', arms: 'M58 54 L76 68 L78 80 M58 54 L76 68 L78 80', legs: 'M60 80 L34 90 L20 104 M60 80 L34 90 L20 104' },
    ],
  },
  'pull-up': {
    dur: 2.2,
    props: ['<path d="M30 8 L90 8" stroke-width="4" opacity="0.5"/>'],
    poses: [
      { head: [60, 38], torso: 'M60 48 L60 82', arms: 'M60 54 L50 30 L50 10 M60 54 L70 30 L70 10', legs: 'M60 82 L56 96 L64 108 M60 82 L64 96 L70 108' },
      { head: [60, 16], torso: 'M60 26 L60 60', arms: 'M60 32 L48 22 L50 10 M60 32 L72 22 L70 10', legs: 'M60 60 L54 74 L62 86 M60 60 L66 74 L72 86' },
      { head: [60, 38], torso: 'M60 48 L60 82', arms: 'M60 54 L50 30 L50 10 M60 54 L70 30 L70 10', legs: 'M60 82 L56 96 L64 108 M60 82 L64 96 L70 108' },
    ],
  },
  row: {
    dur: 1.8, floor: true,
    poses: [
      { head: [78, 34], torso: 'M70 42 L46 68', arms: 'M68 46 L70 66 L70 86 M68 46 L70 66 L70 86', legs: 'M46 68 L44 86 L46 105 M46 68 L44 86 L46 105' },
      { head: [78, 34], torso: 'M70 42 L46 68', arms: 'M68 46 L78 60 L64 58 M68 46 L78 60 L64 58', legs: 'M46 68 L44 86 L46 105 M46 68 L44 86 L46 105' },
      { head: [78, 34], torso: 'M70 42 L46 68', arms: 'M68 46 L70 66 L70 86 M68 46 L70 66 L70 86', legs: 'M46 68 L44 86 L46 105 M46 68 L44 86 L46 105' },
    ],
  },
  press: {
    dur: 1.8, floor: true,
    poses: [
      { head: [60, 22], torso: 'M60 32 L60 70', arms: 'M60 42 L46 50 L46 34 M60 42 L74 50 L74 34', legs: 'M60 70 L52 88 L52 105 M60 70 L68 88 L68 105' },
      { head: [60, 22], torso: 'M60 32 L60 70', arms: 'M60 42 L48 24 L48 6 M60 42 L72 24 L72 6', legs: 'M60 70 L52 88 L52 105 M60 70 L68 88 L68 105' },
      { head: [60, 22], torso: 'M60 32 L60 70', arms: 'M60 42 L46 50 L46 34 M60 42 L74 50 L74 34', legs: 'M60 70 L52 88 L52 105 M60 70 L68 88 L68 105' },
    ],
  },
  curl: {
    dur: 1.8, floor: true,
    poses: [
      { head: [60, 22], torso: 'M60 32 L60 70', arms: 'M60 42 L54 62 L54 82 M60 42 L66 62 L66 82', legs: 'M60 70 L52 88 L52 105 M60 70 L68 88 L68 105' },
      { head: [60, 22], torso: 'M60 32 L60 70', arms: 'M60 42 L54 62 L44 46 M60 42 L66 62 L76 46', legs: 'M60 70 L52 88 L52 105 M60 70 L68 88 L68 105' },
      { head: [60, 22], torso: 'M60 32 L60 70', arms: 'M60 42 L54 62 L54 82 M60 42 L66 62 L66 82', legs: 'M60 70 L52 88 L52 105 M60 70 L68 88 L68 105' },
    ],
  },
  deadlift: {
    dur: 2.2, floor: true,
    poses: [
      { head: [60, 22], torso: 'M60 32 L60 70', arms: 'M60 42 L62 62 L62 84 M60 42 L62 62 L62 84', legs: 'M60 70 L58 88 L58 105 M60 70 L58 88 L58 105' },
      { head: [24, 42], torso: 'M32 48 L62 70', arms: 'M34 52 L36 72 L38 92 M34 52 L36 72 L38 92', legs: 'M62 70 L56 88 L56 105 M62 70 L56 88 L56 105' },
      { head: [60, 22], torso: 'M60 32 L60 70', arms: 'M60 42 L62 62 L62 84 M60 42 L62 62 L62 84', legs: 'M60 70 L58 88 L58 105 M60 70 L58 88 L58 105' },
    ],
  },
  plank: {
    dur: 3, floor: true,
    poses: [
      { head: [100, 58], torso: 'M92 62 L42 80', arms: 'M90 64 L86 88 L70 100 M90 64 L86 88 L70 100', legs: 'M42 80 L24 90 L8 100 M42 80 L24 90 L8 100' },
      { head: [100, 60], torso: 'M92 64 L42 81', arms: 'M90 66 L86 88 L70 100 M90 66 L86 88 L70 100', legs: 'M42 81 L24 90 L8 100 M42 81 L24 90 L8 100' },
      { head: [100, 58], torso: 'M92 62 L42 80', arms: 'M90 64 L86 88 L70 100 M90 64 L86 88 L70 100', legs: 'M42 80 L24 90 L8 100 M42 80 L24 90 L8 100' },
    ],
  },
  'side-plank': {
    dur: 3, floor: true,
    poses: [
      { head: [98, 42], torso: 'M92 50 L32 86', arms: 'M90 52 L88 76 L82 100 M90 52 L96 30 L100 8', legs: 'M32 86 L20 92 L8 100 M32 86 L20 92 L8 100' },
      { head: [98, 46], torso: 'M92 54 L32 88', arms: 'M90 56 L88 78 L82 100 M90 56 L96 34 L100 12', legs: 'M32 88 L20 93 L8 100 M32 88 L20 93 L8 100' },
      { head: [98, 42], torso: 'M92 50 L32 86', arms: 'M90 52 L88 76 L82 100 M90 52 L96 30 L100 8', legs: 'M32 86 L20 92 L8 100 M32 86 L20 92 L8 100' },
    ],
  },
  crunch: {
    dur: 1.8, floor: true,
    poses: [
      { head: [14, 90], torso: 'M23 90 L64 92', arms: 'M26 88 L18 78 L10 82 M26 88 L18 78 L10 82', legs: 'M64 92 L82 74 L96 100 M64 92 L82 74 L96 100' },
      { head: [28, 72], torso: 'M34 78 L64 92', arms: 'M36 78 L30 62 L22 68 M36 78 L30 62 L22 68', legs: 'M64 92 L82 74 L96 100 M64 92 L82 74 L96 100' },
      { head: [14, 90], torso: 'M23 90 L64 92', arms: 'M26 88 L18 78 L10 82 M26 88 L18 78 L10 82', legs: 'M64 92 L82 74 L96 100 M64 92 L82 74 L96 100' },
    ],
  },
  bicycle: {
    dur: 1.4, floor: true,
    poses: [
      { head: [22, 76], torso: 'M30 80 L64 92', arms: 'M32 80 L26 64 L18 70 M32 80 L26 64 L18 70', legs: 'M64 92 L52 72 L40 74 M64 92 L86 84 L106 78' },
      { head: [22, 76], torso: 'M30 80 L64 92', arms: 'M32 80 L26 64 L18 70 M32 80 L26 64 L18 70', legs: 'M64 92 L86 84 L106 78 M64 92 L52 72 L40 74' },
    ],
  },
  'leg-raise': {
    dur: 2.2, floor: true,
    poses: [
      { head: [14, 92], torso: 'M23 92 L64 92', arms: 'M26 94 L44 98 L60 100 M26 94 L44 98 L60 100', legs: 'M64 92 L84 92 L104 92 M64 92 L84 92 L104 92' },
      { head: [14, 92], torso: 'M23 92 L64 92', arms: 'M26 94 L44 98 L60 100 M26 94 L44 98 L60 100', legs: 'M64 92 L68 64 L72 38 M64 92 L68 64 L72 38' },
      { head: [14, 92], torso: 'M23 92 L64 92', arms: 'M26 94 L44 98 L60 100 M26 94 L44 98 L60 100', legs: 'M64 92 L84 92 L104 92 M64 92 L84 92 L104 92' },
    ],
  },
  superman: {
    dur: 2.4, floor: true,
    poses: [
      { head: [20, 90], torso: 'M28 92 L68 92', arms: 'M28 90 L14 92 L0 94 M28 90 L14 92 L0 94', legs: 'M68 92 L86 92 L106 94 M68 92 L86 92 L106 94' },
      { head: [16, 78], torso: 'M26 84 L68 92', arms: 'M26 82 L12 74 L0 66 M26 82 L12 74 L0 66', legs: 'M68 92 L86 86 L106 78 M68 92 L86 86 L106 78' },
      { head: [20, 90], torso: 'M28 92 L68 92', arms: 'M28 90 L14 92 L0 94 M28 90 L14 92 L0 94', legs: 'M68 92 L86 92 L106 94 M68 92 L86 92 L106 94' },
    ],
  },
  'bird-dog': {
    dur: 2.6, floor: true,
    poses: [
      { head: [98, 56], torso: 'M90 62 L44 64', arms: 'M88 64 L88 82 L88 100 M88 64 L88 82 L88 100', legs: 'M44 64 L44 82 L40 100 M44 64 L44 82 L40 100' },
      { head: [98, 54], torso: 'M90 60 L44 62', arms: 'M88 62 L88 82 L88 100 M88 60 L104 48 L120 38', legs: 'M44 62 L44 82 L40 100 M44 62 L26 58 L6 54' },
      { head: [98, 56], torso: 'M90 62 L44 64', arms: 'M88 64 L88 82 L88 100 M88 64 L88 82 L88 100', legs: 'M44 64 L44 82 L40 100 M44 64 L44 82 L40 100' },
    ],
  },
  stretch: {
    dur: 3.6, floor: true,
    poses: [
      { head: [48, 24], torso: 'M50 34 L60 70', arms: 'M50 42 L40 24 L34 6 M50 42 L60 30 L60 8', legs: 'M60 70 L50 88 L48 105 M60 70 L70 88 L72 105' },
      { head: [72, 24], torso: 'M70 34 L60 70', arms: 'M70 42 L60 30 L60 8 M70 42 L80 24 L86 6', legs: 'M60 70 L50 88 L48 105 M60 70 L70 88 L72 105' },
      { head: [48, 24], torso: 'M50 34 L60 70', arms: 'M50 42 L40 24 L34 6 M50 42 L60 30 L60 8', legs: 'M60 70 L50 88 L48 105 M60 70 L70 88 L72 105' },
    ],
  },
};

export const DEMO_KEYS = Object.keys(DEMOS);

function animate(attr: string, values: (string | number)[], dur: number): string {
  const vals = values.join(';');
  if (values.length === 2) {
    return `<animate attributeName="${attr}" values="${vals};${values[0]}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>`;
  }
  const n = values.length;
  const keyTimes = values.map((_, i) => (i / (n - 1)).toFixed(3)).join(';');
  const splines = Array.from({ length: n - 1 }, () => '0.4 0 0.6 1').join(';');
  return `<animate attributeName="${attr}" values="${vals}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keyTimes="${keyTimes}" keySplines="${splines}"/>`;
}

/** Returns the inner SVG markup for a demo key (used via dangerouslySetInnerHTML for SMIL). */
export function demoMarkup(key: string, animated = true): string {
  const d = DEMOS[key] ?? DEMOS.squat;
  const p = d.poses;
  const first = p[0];
  const anim = (attr: string, vals: (string | number)[]) => (animated && p.length > 1 ? animate(attr, vals, d.dur) : '');
  return [
    d.floor ? '<path d="M0 105 L120 105" stroke-width="2.5" opacity="0.25"/>' : '',
    ...(d.props ?? []),
    `<circle cx="${first.head[0]}" cy="${first.head[1]}" r="9">${anim('cx', p.map((x) => x.head[0]))}${anim('cy', p.map((x) => x.head[1]))}</circle>`,
    `<path d="${first.torso}">${anim('d', p.map((x) => x.torso))}</path>`,
    `<path d="${first.arms}">${anim('d', p.map((x) => x.arms))}</path>`,
    `<path d="${first.legs}">${anim('d', p.map((x) => x.legs))}</path>`,
  ].join('');
}

export function Demo({ demoKey, size = 120, animated = true, className }: { demoKey: string; size?: number | string; animated?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="-2 -2 124 112"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: demoMarkup(demoKey, animated) }}
    />
  );
}
