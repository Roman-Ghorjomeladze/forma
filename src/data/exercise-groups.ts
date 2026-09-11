export interface ExerciseGroupDef { key: string; labelKey: string; match: string[] }

/** Muscle-group categories shared by the exercise library list and the bundled-video picker.
 *  'custom' (user-created exercises) only makes sense in the exercise list, not the bundled
 *  video library, so callers that need it append it themselves rather than it living here. */
export const EXERCISE_GROUP_DEFS: ExerciseGroupDef[] = [
  { key: 'all', labelKey: 'exercise.group.all', match: [] },
  { key: 'cardio', labelKey: 'exercise.group.cardio', match: ['cardio'] },
  { key: 'legs', labelKey: 'exercise.group.legs', match: ['quads', 'glutes', 'hamstrings', 'calves', 'legs', 'lower body'] },
  { key: 'upper', labelKey: 'exercise.group.upper', match: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'arms', 'forearm', 'upper body'] },
  { key: 'core', labelKey: 'exercise.group.core', match: ['core', 'abs', 'obliques', 'lower back', 'hip flexors'] },
];
