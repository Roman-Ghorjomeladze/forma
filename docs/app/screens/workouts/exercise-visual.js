import { jsx as _jsx } from "react/jsx-runtime";
import { localizedExerciseName } from '../../data/seed-i18n.js';
import { useBlobUrl } from '../../lib/hooks.js';
import { useLang } from '../../lib/i18n.js';
import { Demo } from '../../ui/demos.js';
import { IconDumbbell } from '../../ui/icons.js';
/** Shows the exercise's demo: bundled video clip, uploaded GIF/image, built-in animation, or a placeholder. */
export function ExerciseVisual({ exercise, size = 'thumb', animated = true }) {
    const lang = useLang();
    const blobId = exercise?.demo.type === 'blob' ? exercise.demo.blobId : undefined;
    const url = useBlobUrl(blobId);
    const name = exercise ? localizedExerciseName(exercise.id, exercise.name, lang) : '';
    const cls = size === 'thumb' ? 'demo-thumb' : size === 'player' ? 'player-demo' : `demo-box ${size === 'large' ? 'demo-box-lg' : ''}`;
    let inner;
    if (exercise?.demo.type === 'video') {
        const poster = exercise.demo.file.replace(/\.mp4$/, '.jpg');
        // A non-animated tile only ever shows the poster frame anyway - a real <video> element buys
        // nothing there and costs a lot (media engine setup, network/parse) when hundreds are on
        // screen at once (grids/pickers). Render a plain lazy-loaded <img> in that case instead;
        // key forces the <video> to remount when the clip changes, so it doesn't keep a stale source.
        inner = animated
            ? _jsx("video", { src: exercise.demo.file, poster: poster, autoPlay: true, loop: true, muted: true, playsInline: true, preload: size === 'thumb' ? 'none' : 'metadata', "aria-label": name }, exercise.demo.file)
            : _jsx("img", { src: poster, alt: name, loading: "lazy", decoding: "async" });
    }
    else if (url)
        inner = _jsx("img", { src: url, alt: name });
    else if (exercise?.demo.type === 'builtin')
        inner = _jsx(Demo, { demoKey: exercise.demo.key, animated: animated });
    else
        inner = _jsx(IconDumbbell, { size: size === 'thumb' ? 20 : 40 });
    return _jsx("div", { className: cls, children: inner });
}
