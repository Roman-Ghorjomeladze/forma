import { useMemo } from 'react';
import { remove } from '../../lib/db.js';
import { fmtClock, formatDateTime } from '../../lib/dates.js';
import { useSessions } from '../../lib/queries.js';
import { Empty, IconButton, Screen, Stat, TopBar } from '../../ui/components.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { IconHistory, IconTrash } from '../../ui/icons.js';

export function HistoryScreen() {
  const sessions = useSessions(500);
  const totals = useMemo(() => {
    const list = sessions ?? [];
    const since = Date.now() - 7 * 86400e3;
    const week = list.filter((s) => s.startedAt >= since);
    return { count: list.length, weekCount: week.length, weekKcal: Math.round(week.reduce((a, s) => a + s.kcal, 0)), weekMin: Math.round(week.reduce((a, s) => a + s.activeSeconds, 0) / 60) };
  }, [sessions]);

  return (
    <Screen>
      <TopBar large backTo="/workouts" title="History" eyebrow={`${totals.count} sessions`} />
      <div className="stats stats-3 mb">
        <Stat value={totals.weekCount} label="this week" />
        <Stat value={totals.weekMin} label="active min" />
        <Stat tone="workout" value={totals.weekKcal} label="kcal" />
      </div>
      {sessions && sessions.length === 0 ? (
        <Empty icon={<IconHistory size={40} />} title="No sessions yet" text="Finish a workout and it will show up here." />
      ) : (
        <div className="list">
          {(sessions ?? []).map((s) => (
            <div key={s.id} className="row">
              <div className="row-main">
                <div className="row-title">{s.workoutName}</div>
                <div className="row-sub">{formatDateTime(s.startedAt)} · {fmtClock(Math.round((s.endedAt - s.startedAt) / 1000))} · {s.completedSteps}/{s.totalSteps} steps</div>
              </div>
              <div className="row-right c-workout num">{Math.round(s.kcal)} kcal</div>
              <IconButton label="Delete" className="iconbtn-plain" onClick={async () => { if (await confirmDialog({ title: 'Delete this session?', confirmLabel: 'Delete', danger: true })) remove('sessions', s.id); }}><IconTrash size={18} /></IconButton>
            </div>
          ))}
        </div>
      )}
    </Screen>
  );
}
