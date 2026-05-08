import { createContext, useContext, type ReactNode } from 'react';
import { useBracketStore } from '@/store/bracketStore';
import type { BracketPicks } from '@/lib/types';

interface EditingState {
  picks: BracketPicks;
  editable: boolean;
}

const EditingContext = createContext<EditingState | null>(null);

// Editor mode: subscribes to the bracket store as the source of truth.
export function EditableProvider({ children }: { children: ReactNode }) {
  const picks = useBracketStore((s) => s.picks);
  return (
    <EditingContext.Provider value={{ picks, editable: true }}>
      {children}
    </EditingContext.Provider>
  );
}

// Viewer mode: explicit picks from a loaded bracket; store is left untouched
// so the current user's own bracket state is preserved.
export function ReadOnlyProvider({
  picks,
  children,
}: {
  picks: BracketPicks;
  children: ReactNode;
}) {
  return (
    <EditingContext.Provider value={{ picks, editable: false }}>
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
