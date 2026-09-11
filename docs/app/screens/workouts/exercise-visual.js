import { jsx as _jsx } from "react/jsx-runtime";
import { useBlobUrl } from '../../lib/hooks.js';
import { Demo } from '../../ui/demos.js';
import { IconDumbbell } from '../../ui/icons.js';
/** Shows the exercise's demo: bundled video clip, uploaded GIF/image, built-in animation, or a placeholder. */
export function ExerciseVisual({ exercise, size = 'thumb', animated = true }) {
    const blobId = exercise?.demo.type === 'blob' ? exercise.demo.blobId : undefined;
    const url = useBlobUrl(blobId);
    const cls = size === 'thumb' ? 'demo-thumb' : size === 'player' ? 'player-demo' : `demo-box ${size === 'large' ? 'demo-box-lg' : ''}`;
    let inner;
    if (exercise?.demo.type === 'video') {
        // key forces the <video> to remount when the clip changes, so it doesn't keep playing a stale source.
        inner = (_jsx("video", { src: exercise.demo.file, autoPlay: animated, loop: true, muted: true, playsInline: true, preload: size === 'thumb' ? 'none' : 'metadata', "aria-label": exercise.name }, exercise.demo.file));
    }
    else if (url)
        inner = _jsx("img", { src: url, alt: exercise?.name ?? '' });
    else if (exercise?.demo.type === 'builtin')
        inner = _jsx(Demo, { demoKey: exercise.demo.key, animated: animated });
    else
        inner = _jsx(IconDumbbell, { size: size === 'thumb' ? 20 : 40 });
    return _jsx("div", { className: cls, children: inner });
}
