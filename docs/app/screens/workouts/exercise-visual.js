import { jsx as _jsx } from "react/jsx-runtime";
import { useBlobUrl } from '../../lib/hooks.js';
import { Demo } from '../../ui/demos.js';
import { IconDumbbell } from '../../ui/icons.js';
/** Shows the exercise's demo: built-in animation, uploaded GIF/image, or a placeholder. */
export function ExerciseVisual({ exercise, size = 'thumb', animated = true }) {
    const blobId = exercise?.demo.type === 'blob' ? exercise.demo.blobId : undefined;
    const url = useBlobUrl(blobId);
    const cls = size === 'thumb' ? 'demo-thumb' : size === 'player' ? 'player-demo' : `demo-box ${size === 'large' ? 'demo-box-lg' : ''}`;
    let inner;
    if (url)
        inner = _jsx("img", { src: url, alt: exercise?.name ?? '' });
    else if (exercise?.demo.type === 'builtin')
        inner = _jsx(Demo, { demoKey: exercise.demo.key, animated: animated });
    else
        inner = _jsx(IconDumbbell, { size: size === 'thumb' ? 20 : 40 });
    return _jsx("div", { className: cls, children: inner });
}
