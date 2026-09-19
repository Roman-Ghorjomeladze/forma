// Phone-sized person screen (the wide layout shows the same details in the canvas side panel).
import { useMemo } from 'react';
import { useT } from '../../lib/i18n.js';
import { navigate } from '../../lib/router.js';
import { usePersons, useTree, useUnions } from '../../lib/queries.js';
import { assignLevels, buildGraph } from '../../lib/tree.js';
import { Empty, Screen, TopBar } from '../../ui/components.js';
import { PersonDetails } from './person-details.js';

export function PersonScreen({ treeId, personId }: { treeId: string; personId: string }) {
  const t = useT();
  const tree = useTree(treeId);
  const persons = usePersons(treeId);
  const unions = useUnions(treeId);
  const g = useMemo(() => buildGraph(persons ?? [], unions ?? []), [persons, unions]);
  const levels = useMemo(() => assignLevels(g, tree?.rootPersonId), [g, tree?.rootPersonId]);
  const person = g.persons.get(personId);

  if (tree === undefined || !persons || !unions) return <Screen className="screen-no-tabs" />;
  if (!tree || !person) return <Screen className="screen-no-tabs"><TopBar backTo={`/tree/${treeId}`} title="" /><Empty title={t('tree.noMatches')} /></Screen>;

  // Levels are relative to the oldest generation in the person's component.
  const min = Math.min(...[...levels.values()]);
  const level = (levels.get(person.id) ?? 0) - min;

  return (
    <Screen className="screen-no-tabs tree">
      <PersonDetails
        person={person}
        g={g}
        tree={tree}
        level={level}
        header={<TopBar backTo={`/tree/${treeId}?p=${person.id}`} title="" />}
        onSelect={(id) => navigate(`/tree/${treeId}/person/${id}`)}
        onCenter={() => navigate(`/tree/${treeId}?p=${person.id}`)}
        onClose={() => navigate(`/tree/${treeId}`, { replace: true })}
      />
    </Screen>
  );
}
