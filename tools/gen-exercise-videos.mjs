// Builds src/data/exercise-video-library.ts and tools/.video-jobs.tsv (source->output pairs)
// from workout-animations/. Compression itself runs separately (see tools/compress-batch.sh)
// because it's long-running and this script must return quickly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'workout-animations');
const OUT_VIDEOS = path.join(root, 'public', 'exercise-videos');
const OUT_TS = path.join(root, 'src', 'data', 'exercise-video-library.ts');
const JOBS_TSV = path.join(root, 'tools', '.video-jobs.tsv');

const CATEGORIES = {
  'Barbell': { slug: 'barbell', label: 'Barbell', equipment: ['barbell'], met: 5.5 },
  'Bodyweight': { slug: 'bodyweight', label: 'Bodyweight', equipment: [], met: 4 },
  'Cable Machine': { slug: 'cable-machine', label: 'Cable Machine', equipment: ['cable machine'], met: 4 },
  'Dumbbell': { slug: 'dumbbell', label: 'Dumbbell', equipment: ['dumbbell'], met: 4.5 },
  'Gym Machine': { slug: 'machine', label: 'Machine', equipment: ['machine'], met: 4 },
  'Resistance Band': { slug: 'resistance-band', label: 'Resistance Band', equipment: ['resistance band'], met: 3.5 },
  'Smith Machine': { slug: 'smith-machine', label: 'Smith Machine', equipment: ['smith machine'], met: 5 },
  'Stretching': { slug: 'stretching', label: 'Stretching', equipment: ['stretching'], met: 2.3 },
  'TRX Suspension': { slug: 'trx', label: 'TRX', equipment: ['trx'], met: 4.5 },
};

const MUSCLES = {
  'Arm': { slug: 'arms', label: 'Arms', muscles: ['arms'] },
  'Arm and Shoulders': { slug: 'arms-shoulders', label: 'Arms & Shoulders', muscles: ['arms', 'shoulders'] },
  'Arms': { slug: 'arms', label: 'Arms', muscles: ['arms'] },
  'ABS': { slug: 'abs', label: 'Abs', muscles: ['abs'] },
  'Back': { slug: 'back', label: 'Back', muscles: ['back'] },
  'Bicep': { slug: 'biceps', label: 'Biceps', muscles: ['biceps'] },
  'Tricep': { slug: 'triceps', label: 'Triceps', muscles: ['triceps'] },
  'Chest': { slug: 'chest', label: 'Chest', muscles: ['chest'] },
  'Legs': { slug: 'legs', label: 'Legs', muscles: ['legs'] },
  'Shoulders': { slug: 'shoulders', label: 'Shoulders', muscles: ['shoulders'] },
  'Forearm': { slug: 'forearm', label: 'Forearm', muscles: ['forearm'] },
  'Cardio': { slug: 'cardio', label: 'Cardio', muscles: ['cardio'] },
  'Lower Body': { slug: 'lower-body', label: 'Lower Body', muscles: ['legs', 'lower body'] },
  'Upper Body': { slug: 'upper-body', label: 'Upper Body', muscles: ['upper body'] },
};

function slugify(s) {
  return s.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function cleanName(base) {
  return base.replace(/_s\b/g, "'s").replace(/\s+/g, ' ').trim();
}

const RESERVED = new Set([
  'Bodyweight/Cardio/Jumping Jack.mp4', 'Bodyweight/Cardio/High Knee Taps.mp4', 'Bodyweight/Cardio/Jump Rope.mp4',
  'Bodyweight/Cardio/Burpee.mp4', 'TRX Suspension/ABS/TRX Mountain Climber.mp4', 'Bodyweight/Legs/Air Squat.mp4',
  'Bodyweight/Legs/Split Squat.mp4', 'Bodyweight/Legs/Hip Thrust.mp4', 'Bodyweight/Chest/Regular Push Up.mp4',
  'Bodyweight/Chest/Chest Dip.mp4', 'Bodyweight/Back/Regular Pull Up.mp4', 'Dumbbell/Back/Dumbbell Bent Over Row.mp4',
  'Dumbbell/Shoulders/Dumbbell Seated Shoulders Press.mp4', 'Dumbbell/Bicep/Alternating Bicep Curl.mp4',
  'Dumbbell/Legs/Dumbbell Romanian Deadlift.mp4', 'Bodyweight/Arm and Shoulders/Plank Shoulder Tap.mp4',
  'Bodyweight/ABS/Crunch.mp4', 'Bodyweight/ABS/Bicycle Crunch.mp4', 'Bodyweight/ABS/Reverse Crunch.mp4',
  'Bodyweight/ABS/Side Crunch.mp4', 'Bodyweight/Back/Alternating Superman.mp4', 'Stretching/Upper Body/Cat Cow Stretch.mp4',
]);

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

const categories = fs.readdirSync(SRC, { withFileTypes: true }).filter((e) => e.isDirectory());
const jobs = [];
const manifest = [];
const seenIds = new Set();

for (const catDir of categories) {
  const catMeta = CATEGORIES[catDir.name] ?? { slug: slugify(catDir.name), label: catDir.name, equipment: [slugify(catDir.name)], met: 4 };
  const catPath = path.join(SRC, catDir.name);
  const muscleDirs = fs.readdirSync(catPath, { withFileTypes: true }).filter((e) => e.isDirectory());
  for (const mDir of muscleDirs) {
    const mMeta = MUSCLES[mDir.name] ?? { slug: slugify(mDir.name), label: mDir.name, muscles: [slugify(mDir.name).replace(/-/g, ' ')] };
    const mPath = path.join(catPath, mDir.name);
    const files = fs.readdirSync(mPath, { withFileTypes: true }).filter((e) => e.isFile() && /\.mp4$/i.test(e.name));
    for (const f of files) {
      const rel = `${catDir.name}/${mDir.name}/${f.name}`;
      const srcFile = path.join(mPath, f.name);
      const base = cleanName(f.name.replace(/\.mp4$/i, ''));
      let id = `exv_${catMeta.slug}-${mMeta.slug}-${slugify(base)}`;
      if (seenIds.has(id)) id = `${id}-${seenIds.size}`;
      seenIds.add(id);
      const outDir = path.join(OUT_VIDEOS, catMeta.slug);
      const outFile = path.join(outDir, `${mMeta.slug}-${slugify(base)}.mp4`);
      const publicPath = `exercise-videos/${catMeta.slug}/${mMeta.slug}-${slugify(base)}.mp4`;

      const isCardioLike = catMeta.slug === 'stretching' || mMeta.slug === 'cardio';
      const kind = isCardioLike ? 'time' : 'reps';
      const defaultAmount = isCardioLike ? 30 : 12;
      const secPerRep = isCardioLike ? 1 : 3;
      const met = catMeta.slug === 'stretching' ? 2.3 : (mMeta.slug === 'cardio' ? 8 : catMeta.met);

      if (!RESERVED.has(rel)) {
        manifest.push({ id, name: base, muscles: mMeta.muscles, equipment: catMeta.equipment, kind, met, secPerRep, defaultAmount, demo: { type: 'video', file: publicPath }, cues: [] });
      }
      ensureDir(outDir);
      jobs.push(`${srcFile}\t${outFile}`);
    }
  }
}

ensureDir(path.dirname(OUT_TS));
const header = `// AUTO-GENERATED by tools/gen-exercise-videos.mjs from workout-animations/. Do not hand-edit.\n// Re-run \`node tools/gen-exercise-videos.mjs\` after adding/removing clips in that folder,\n// then tools/compress-batch.sh in a loop until it reports done.\nimport type { Exercise } from '../lib/models.js';\n\ntype Seed = Omit<Exercise, 'isCustom' | 'createdAt' | 'updatedAt'>;\n\nexport const videoLibrary: Seed[] = ${JSON.stringify(manifest, null, 2)};\n\nexport function seedVideoLibrary(now = Date.now()): Exercise[] {\n  return videoLibrary.map((s) => ({ ...s, isCustom: false, createdAt: now, updatedAt: now }));\n}\n`;
fs.writeFileSync(OUT_TS, header);
fs.writeFileSync(JOBS_TSV, jobs.join('\n') + '\n');
console.log(`manifest: ${manifest.length} library exercises; jobs: ${jobs.length} clips to compress`);
