import { localizedExerciseName } from '../../data/seed-i18n.js';
import { useBlobUrl } from '../../lib/hooks.js';
import { useLang } from '../../lib/i18n.js';
import type { Exercise } from '../../lib/models.js';
import { Demo } from '../../ui/demos.js';
import { IconDumbbell } from '../../ui/icons.js';

/** Shows the exercise's demo: bundled video clip, uploaded GIF/image, built-in animation, or a placeholder. */
export function ExerciseVisual({ exercise, size = 'thumb', animated = true }: { exercise: Exercise | undefined; size?: 'thumb' | 'box' | 'large' | 'player'; animated?: boolean }) {
  const lang = useLang();
  const blobId = exercise?.demo.type === 'blob' ? exercise.demo.blobId : undefined;
  const url = useBlobUrl(blobId);
  const name = exercise ? localizedExerciseName(exercise.id, exercise.name, lang) : '';
  const cls = size === 'thumb' ? 'demo-thumb' : size === 'player' ? 'player-demo' : `demo-box ${size === 'large' ? 'demo-box-lg' : ''}`;
  let inner: unknown;
  if (exercise?.demo.type === 'video') {
    // key forces the <video> to remount when the clip changes, so it doesn't keep playing a stale source.
    // poster shows a real frame immediately even when preload="none"/not autoplaying (small list thumbs),
    // instead of a blank black box.
    inner = (
      <video key={exercise.demo.file} src={exercise.demo.file} poster={exercise.demo.file.replace(/\.mp4$/, '.jpg')} autoPlay={animated} loop muted playsInline
        preload={size === 'thumb' ? 'none' : 'metadata'} aria-label={name} />
    );
  } else if (url) inner = <img src={url} alt={name} />;
  else if (exercise?.demo.type === 'builtin') inner = <Demo demoKey={exercise.demo.key} animated={animated} />;
  else inner = <IconDumbbell size={size === 'thumb' ? 20 : 40} />;
  return <div className={cls}>{inner as any}</div>;
}
