import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { TEAMS } from '@/data/teams';
import { TeamFlag } from '@/components/ui/TeamFlag';
import { useEditing } from '@/components/bracket/EditingContext';
import { useBracketStore } from '@/store/bracketStore';
import type { GroupDef, GroupOrder, TeamCode } from '@/lib/types';

interface Props {
  group: GroupDef;
}

// Visual "saving…" pulse duration when the user reorders teams in a
// committed group. Doesn't need to match the actual debounced save
// (1s) — it's just feedback so the action feels responsive.
const SAVE_PULSE_MS = 300;

function ordersEqual(a: GroupOrder, b: GroupOrder): boolean {
  for (let i = 0; i < 4; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function GroupCard({ group }: Props) {
  const { picks, editable } = useEditing();
  const { order, committed } = picks.groups[group.letter];
  const setGroupOrder = useBracketStore((s) => s.setGroupOrder);
  const commitGroup = useBracketStore((s) => s.commitGroup);

  const orderTeams = order.filter((t): t is TeamCode => t !== null);

  // Brief "Saving…" → "Saved" transition each time the user reorders
  // teams after the group has been committed.
  const [saving, setSaving] = useState(false);
  const prevOrder = useRef<GroupOrder>(order);
  useEffect(() => {
    if (!committed) {
      prevOrder.current = order;
      return;
    }
    if (ordersEqual(prevOrder.current, order)) return;
    prevOrder.current = order;
    setSaving(true);
    const t = setTimeout(() => setSaving(false), SAVE_PULSE_MS);
    return () => clearTimeout(t);
  }, [order, committed]);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Group {group.letter}
        </h3>
        {committed && (
          <span
            className={clsx(
              'text-[10px] font-semibold uppercase tracking-wider transition-colors',
              saving ? 'text-muted' : 'text-accent',
            )}
          >
            {saving ? 'Saving…' : 'Saved'}
          </span>
        )}
      </div>

      {editable ? (
        <SortableList
          items={orderTeams}
          onReorder={(next) => {
            const padded: GroupOrder = [
              next[0] ?? null,
              next[1] ?? null,
              next[2] ?? null,
              next[3] ?? null,
            ];
            setGroupOrder(group.letter, padded);
          }}
        />
      ) : (
        <ol className="space-y-1.5">
          {orderTeams.map((code, i) => (
            <StaticTeamRow key={code} code={code} rank={i + 1} />
          ))}
        </ol>
      )}

      {editable && (
        <button
          type="button"
          className={clsx(
            'mt-4 w-full rounded-md py-2 text-sm font-semibold transition',
            committed
              ? 'bg-surface-2 text-muted hover:bg-surface-2/80'
              : 'bg-accent text-bg hover:opacity-90',
          )}
          onClick={() => commitGroup(group.letter)}
        >
          {committed ? `Update Group ${group.letter}` : `Set Group ${group.letter} Predictions`}
        </button>
      )}
    </div>
  );
}

function SortableList({
  items,
  onReorder,
}: {
  items: TeamCode[];
  onReorder: (next: TeamCode[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.indexOf(String(active.id));
    const newIdx = items.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(items, oldIdx, newIdx) as TeamCode[]);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ol className="space-y-1.5">
          {items.map((code, i) => (
            <SortableTeamRow key={code} code={code} rank={i + 1} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableTeamRow({ code, rank }: { code: TeamCode; rank: number }) {
  const team = TEAMS[code];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: code,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={clsx(
        'flex items-center gap-3 rounded-md px-2 py-2',
        isDragging && 'z-10 opacity-90 shadow-lg',
        rank <= 2 && 'bg-surface-2',
        rank === 3 && 'mt-1.5 border-t border-border/40 pt-2.5',
      )}
      {...attributes}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="touch-none cursor-grab rounded p-1 text-muted opacity-50 hover:opacity-100 active:cursor-grabbing"
        {...listeners}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="3" cy="3" r="1.4" fill="currentColor" />
          <circle cx="3" cy="7" r="1.4" fill="currentColor" />
          <circle cx="3" cy="11" r="1.4" fill="currentColor" />
          <circle cx="11" cy="3" r="1.4" fill="currentColor" />
          <circle cx="11" cy="7" r="1.4" fill="currentColor" />
          <circle cx="11" cy="11" r="1.4" fill="currentColor" />
        </svg>
      </button>
      <RankBadge rank={rank} />
      <TeamFlag code={code} />
      <span className="text-sm">{team.name}</span>
    </li>
  );
}

function StaticTeamRow({ code, rank }: { code: TeamCode; rank: number }) {
  const team = TEAMS[code];
  return (
    <li
      className={clsx(
        'flex items-center gap-3 rounded-md px-2 py-2',
        rank <= 2 && 'bg-surface-2',
        rank === 3 && 'mt-1.5 border-t border-border/40 pt-2.5',
      )}
    >
      <RankBadge rank={rank} />
      <TeamFlag code={code} />
      <span className="text-sm">{team.name}</span>
    </li>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const base = 'inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold';
  if (rank === 1) return <span className={clsx(base, 'bg-accent text-bg')}>1</span>;
  if (rank === 2) return <span className={clsx(base, 'bg-accent-2 text-bg')}>2</span>;
  return (
    <span className={clsx(base, 'border border-border font-medium text-muted')}>{rank}</span>
  );
}
