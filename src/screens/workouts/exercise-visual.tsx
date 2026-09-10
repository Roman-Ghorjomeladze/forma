import { useBlobUrl } from '../../lib/hooks.js';
import type { Exercise } from '../../lib/models.js';
import { Demo } from '../../ui/demos.js';
import { IconDumbbell } from '../../ui/icons.js';

/** Shows the exercise's demo: built-in animation, uploaded GIF/image, or a placeholder. */
export function ExerciseVisual({ exercise, size = 'thumb', animated = true }: { exercise: Exercise | undefined; size?: 'thumb' | 'box' | 'large' | 'player'; animated?: boolean }) {
  const blobId = exercise?.demo.type === 'blob' ? exercise.demo.blobId : undefined;
  const url = useBlobUrl(blobId);
  const cls = size === 'thumb' ? 'demo-thumb' : size === 'player' ? 'player-demo' : `demo-box ${size === 'large' ? 'demo-box-lg' : ''}`;
  let inner: unknown;
  if (url) inner = <img src={url} alt={exercise?.name ?? ''} />;
  else if (exercise?.demo.type === 'builtin') inner = <Demo demoKey={exercise.demo.key} animated={animated} />;
  else inner = <IconDumbbell size={size === 'thumb' ? 20 : 40} />;
  return <div className={cls}>{inner as any}</div>;
}
