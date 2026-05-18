import { createContext, useContext, type ReactNode } from 'react';
import { useBracketStore } from '@/store/bracketStore';
import type { BracketPicks } from '@/lib/types';

interface EditingState {
  picks: BracketPicks;
  editable: boolean;
  // Live actual results (from the /results doc), or null if results have not
  // been written yet. Used by GroupCard / ThirdPlaceTable / KnockoutMatch to
  // tint each pick by correctness once results land.
  results: BracketPicks | null;
}

const EditingContext = createContext<EditingState | null>(null);

// Editor mode: subscribes to the bracket store as the source of truth.
export function EditableProvider({
  children,
  results = null,
}: {
  children: ReactNode;
  results?: BracketPicks | null;
}) {
  const picks = useBracketStore((s) => s.picks);
  return (
    <EditingContext.Provider value={{ picks, editable: true, results }}>
      {children}
    </EditingContext.Provider>
  );
}

// Viewer mode: explicit picks from a loaded bracket; store is left untouched
// so the current user's own bracket state is preserved.
export function ReadOnlyProvider({
  picks,
  children,
  results = null,
}: {
  picks: BracketPicks;
  children: ReactNode;
  results?: BracketPicks | null;
}) {
  return (
    <EditingContext.Provider value={{ picks, editable: false, results }}>
      {children}
    </EditingContext.Provider>
  );
}

export function useEditing(): EditingState {
  const v = useContext(EditingContext);
  if (!v) {
    throw new Error('useEditing requires <EditableProvider> or <ReadOnlyProvider>');
  }
  return v;
}
