import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { MATCHES } from '@/data/bracket';
import { GROUP_LETTERS } from '@/data/groups';
import { getFirebase } from '@/lib/firebase';
import type { BracketPicks, ResultsDoc } from '@/lib/types';

const RESULTS_DOC_ID = 'wc2026';

export function emptyResultsPicks(): BracketPicks {
  const groups = {} as BracketPicks['groups'];
  for (const letter of GROUP_LETTERS) {
    groups[letter] = { order: [null, null, null, null], committed: true };
  }
  const knockout: BracketPicks['knockout'] = {};
  for (const m of MATCHES) {
    knockout[m.id] = { winner: null };
  }
  return {
    groups,
    thirdPlace: { advancingGroups: [] },
    knockout,
    finalizedAt: null,
    finalGoalsGuess: null,
  };
}

function resultsRef() {
  const { db } = getFirebase();
  return doc(db, 'results', RESULTS_DOC_ID);
}

export async function readResults(): Promise<ResultsDoc | null> {
  const snap = await getDoc(resultsRef());
  if (!snap.exists()) return null;
  return snap.data() as ResultsDoc;
}

// `manualOverrides` pins sections the admin set by hand (keys like 'groups.A'
// or 'thirdPlace') so the ESPN poller won't overwrite them. setDoc replaces
// the whole doc, so the admin must pass the full override set every time —
// omitting a key un-pins it (hands that section back to the poller).
export async function writeResults(
  picks: BracketPicks,
  manualOverrides?: Record<string, true>,
): Promise<void> {
  const payload: ResultsDoc = {
    picks,
    lastUpdated: Date.now(),
    lastUpdatedBy: 'admin',
    ...(manualOverrides && Object.keys(manualOverrides).length
      ? { manualOverrides }
      : {}),
  };
  await setDoc(resultsRef(), payload);
}

export function subscribeResults(
  onChange: (results: ResultsDoc | null) => void,
): Unsubscribe {
  return onSnapshot(resultsRef(), (snap) => {
    onChange(snap.exists() ? (snap.data() as ResultsDoc) : null);
  });
}
