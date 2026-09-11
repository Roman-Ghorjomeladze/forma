// Equipment categories used to tag & filter the exercise library, matching the folder
// names of the bundled video clips (see tools/gen-exercise-videos.mjs).
export interface EquipmentCategory {
  key: string;
  labelKey: string;
  match: (equipment: string[]) => boolean;
}

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  { key: 'bodyweight', labelKey: 'equipment.bodyweight', match: (eq) => eq.length === 0 },
  { key: 'barbell', labelKey: 'equipment.barbell', match: (eq) => eq.includes('barbell') },
  { key: 'dumbbell', labelKey: 'equipment.dumbbell', match: (eq) => eq.includes('dumbbell') },
  { key: 'cable-machine', labelKey: 'equipment.cableMachine', match: (eq) => eq.includes('cable machine') },
  { key: 'machine', labelKey: 'equipment.machine', match: (eq) => eq.includes('machine') },
  { key: 'smith-machine', labelKey: 'equipment.smithMachine', match: (eq) => eq.includes('smith machine') },
  { key: 'resistance-band', labelKey: 'equipment.resistanceBand', match: (eq) => eq.includes('resistance band') },
  { key: 'trx', labelKey: 'equipment.trx', match: (eq) => eq.includes('trx') },
  { key: 'stretching', labelKey: 'equipment.stretching', match: (eq) => eq.includes('stretching') },
];
