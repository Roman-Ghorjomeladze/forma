# Forma — and friends

A single personal iPhone **Progressive Web App** that hosts six apps behind one launcher: you open it in Safari
once, tap *Add to Home Screen*, and from then on it runs full-screen, offline, with your data stored on the phone.
No Apple developer account, no App Store, no Xcode. Everything is in English and Georgian (ქართული).

## Home (launcher)

The root screen lists the apps with a live one-liner each (today's workout & planned kcal, the active project's
spend vs budget, how many people are in your tree, your best flag quiz, the last note you touched, the next medicine dose), quick-add
shortcuts, and the shared Settings (name shown in the greeting, theme, language, backup/restore of *all* apps' data).

## Forma — workouts & meals (`#/forma`)

- **Today** — calories left (target − eaten + burned), macro progress, today's scheduled workout and planned meals.
- **Meals** — dish library with ingredients, cooking steps and nutrition (computed from ingredients or entered
  manually), a week planner with per-day totals, and an aggregated shopping list.
- **Workouts** — exercise library with video demos (or your own GIFs), a workout builder with exercises,
  rests and repeating rounds, a guided full-screen timer with voice + sound cues, MET-based calorie estimates,
  history and a weekly schedule. Workouts can be **shared** as `.forma-workouts.json` files and imported.

## Pocket — big expenses by project (`#/pocket`)

- **Projects** (apartment repair, car, trip…) with an optional budget, status (active/done), start date and notes.
  The list shows spent vs budget with a progress bar; a summary card shows the year's total, largest expense and
  busiest month.
- **Expenses** inside a project: amount (₾), title, category, date, note. The project screen breaks spending down
  by category (stacked bar + per-category totals, tap a category to filter), groups expenses by month, and can
  export the project as CSV through the share sheet.
- **Categories** are global, with a colour and an icon; create/rename/reorder/delete them from the Categories
  screen or add one inline from the expense form. Optional per-category limits per project.

## Family Tree — blood lines on a canvas (`#/tree`)

- Several **trees**, each a Miro-style canvas: pinch/scroll to zoom, drag to pan, drag a person to move them.
  Generations are auto-arranged top to bottom, couples joined by a ring, children hanging from the couple;
  *Auto-arrange* resets manual positions, *Fit* frames everything, a minimap shows where you are.
- **People** have first/last/maiden name, sex, birth/death dates (year, year-month or full date), birthplace,
  notes and a photo. Tap a person for a peek card; open it for the full sheet with partners (with relationship
  status and years), children, parents, siblings, and *Add relative* (parent / partner / child / sibling — new
  person or link someone already in the tree).
- On an **iPad or Mac** (≥ 900 px wide) the canvas fills the window with a persistent side panel for the selected
  person; ⌘K finds a person, F fits, +/− zoom, Esc closes.

## Flags — every flag, plus quizzes (`#/flags`)

- 197 countries with SVG flags, filtered by continent: a swipeable card deck, an A→Z grid with search, and three
  quiz modes (flag → country, country → flag, capitals). Flags you missed recently come back first; best scores
  and accuracy are kept per mode and continent.

## Notes — groups of notes, links & checklists (`#/notes`)

- **Groups** (Ideas, Links to read, Work…) with a colour and an icon; a *General* group exists from the start.
- **Notes** are plain text with a title, free-form **#tags** and a *pin to top* flag. Any line that starts with
  `[ ]` becomes a tappable checkbox in the note view (progress bar + *Uncheck all*; the editor continues a
  checklist when you press Enter). URLs are detected automatically: they are tappable inline and collected in a
  *Links* list under the note. *Paste link* drops the clipboard URL on its own line. Share sends the note as text.
- **Search** on the Notes home looks at titles, text, links, tags and group names (every word must match),
  ranks title/tag hits first, shows a snippet around the match with the words highlighted, and the query stays in
  the URL so *back* returns to the same results. Tag chips on the home and inside a group filter by tag.
- Notes are two tables in the same IndexedDB (`noteGroups`, `notes`) — so the Settings backup includes them.

## Meds — medicine courses, dose by dose (`#/meds`)

- A **medication** (medicine or supplement) has a name, strength, form (tablets, drops, ml…), colour, who it's
  for, start date, optional weekday filter, optional stock counter and notes.
- Its **schedule is a sequence of phases**: each phase lasts N days (the last one may be open-ended) and has its
  own dose times — amount, a hint (before/after meal, with food, empty stomach, before sleep, on waking, plenty
  of water, not with dairy, no alcohol, stay upright), a free note, and optionally *"N minutes after <another
  medication>"* so the Today list shows the chain. *Add next phase* copies the previous phase; *Every N hours…*
  fills a phase from a start/end time.
- **Today** shows the next dose (countdown, *Taken* / *Skip*), then the day's doses grouped by time with
  due / late / taken / skipped states; tapping the circle marks taken (again to undo). Stock counts down on each
  taken dose and warns before it runs out. While the app is open a chime + banner fires at dose time.
- **Detail**: progress through the course, the full phase schedule, 30-day adherence (percent, taken, missed,
  streak) with a 14-day strip, pause / resume / finish, and a dose history.
- **Alerts on the phone**: a web app can't ring in the background, so *Add to Calendar* exports the whole course
  as an `.ics` file — one repeating event per phase × time with an alarm — that the iPhone Calendar imports with
  *Add All*. *Share* sends the schedule as plain text (for a doctor or family).
- Tables `medications` and `doseLogs` are part of the Settings backup.

## Backup & restore

*Settings → Export backup* writes one JSON file with **every** table (Forma, Pocket, Family Tree, Flags, Notes, Meds,
your profile and preferences, dish/person photos and music as base64). *Restore from backup* reads it back —
*Replace all* wipes first, *Merge* upserts by id — and a backup made by an older version simply restores the
tables it has. `tools/verify-notes.mjs` and `tools/verify-meds.mjs` run an export → erase → import round-trip in headless Chromium and
checks every table is identical.

## Zero dependencies

The app is plain TypeScript + React 19 with **no runtime npm packages**: React is vendored in `public/vendor/`
(built once from the official package by `tools/bundle-react.mjs`), and routing, storage (IndexedDB), the
service worker, icons and animations are all in `src/`. The only dev dependency is `typescript`.
`docs/` is committed and prebuilt, so you can deploy without building at all — it's named `docs/` (not `dist/`)
specifically so GitHub Pages can serve it directly via its `/docs` folder option.

```
public/        static shell: index.html, styles.css, manifest, icons, vendored React
src/           TypeScript sources (compiled by tsc to docs/app)
  lib/         db (IndexedDB), hooks, router, dates, i18n, calories, nutrition, audio, backup, workout-share,
               pocket (totals/CSV), tree (relationships), tree-layout (generation layout), flags (quiz), notes (search), meds (phase engine, .ics)
  data/        starter exercises, dishes, sample workouts + week plan
  ui/          components, icons, animated exercise demos, dialogs
  screens/     home (launcher), today, meals/*, workouts/*, pocket/*, tree/*, flags/*, notes/*, meds/*, settings
tools/         build.mjs, dev.mjs, serve.mjs, bundle-react.mjs, icons.mjs, sw.template.js, verify-notes.mjs, verify-meds.mjs
docs/          the deployable app (generated by `npm run build`)
```

## Run it on your iPhone

### Option A — quick look over Wi-Fi (no install)

```bash
cd my-app
npm run serve          # serves docs/ and prints a http://192.168.x.x:5173 address
```

Open that address in Safari on the iPhone (same Wi-Fi). Everything works, but because it is plain `http://`
Safari will not install it as an offline app — for that use option B.

### Option B — install as an app (HTTPS host, free)

Any static host works — GitHub Pages, Netlify, Vercel, Cloudflare Pages. Upload the **contents of `docs/`**.

GitHub Pages, for example:

1. Create a repo, push this folder.
2. Settings → Pages → *Deploy from a branch* → branch `main`, folder `/docs`.
3. Open `https://<you>.github.io/<repo>/` on the iPhone in Safari.
4. Tap **Share → Add to Home Screen → Add**.

Open Forma from the Home Screen icon from now on. It works offline, keeps its own data, and picks up new
versions automatically on the next launch after you redeploy (an "Update" banner appears).

> The Home-Screen copy and the Safari-tab copy have **separate data**. Do your real usage in the installed one,
> and use *Settings → Export backup* now and then; the backup restores on any device.

## Develop

```bash
npm install            # installs typescript only
npm run dev            # tsc --watch + copies public/ + serves docs/ on the network with live rebuilds
npm run build          # production build into docs/ (also regenerates sw.js with a fresh cache version)
npm run typecheck
```

Sources import from `'react'` normally; the browser resolves that through the import map in `index.html`.
If you ever want Vite/Tailwind/Dexie instead, the code is standard React + TS — add `@types/react`, delete
`src/types/react.d.ts`, and drop the import map.

### Optional display font

The design uses *Bricolage Grotesque* for large numerals. To use it, put `BricolageGrotesque.woff2` in
`public/fonts/` and uncomment the `@font-face` block at the top of `public/styles.css`. Without it the app
falls back to the iPhone system font, which looks native.

## How the numbers work

- **Calories burned** = MET × body weight (kg) × hours. Rest steps count at MET 1.3. Rep-based steps are timed
  at *seconds per rep* × reps (editable per exercise). Sessions record only what you actually completed.
- **Dish nutrition** = sum of ingredient values ÷ servings. Ingredient values are for the amount you enter;
  ~60 common ingredients auto-fill from a per-100 g table when you type their name.
- **Daily target suggestion** uses Mifflin-St Jeor × 1.45 (light activity), −400 kcal for weight loss,
  +300 for gaining, protein at 1.8 g/kg, fat at 27% of calories.

## iOS notes

- The timer is timestamp-based: if the phone locks or you switch apps, it catches up correctly when you return.
  iOS does not run JavaScript in the background, so voice cues pause while the screen is off — the player asks
  for a screen wake lock (Settings → *Keep screen awake*) to avoid that.
- Sound needs one tap first (the Start button does this) — that is an iOS rule for all web audio.
- iOS has no vibration API; cues are beeps + voice + the big colour change.
- Storage can be evicted if the installed app is not opened for weeks (`navigator.storage.persist()` is
  requested, and backups are one tap away).
