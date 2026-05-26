import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';
import type { Bracket, BracketPicks } from '@/lib/types';

// A bracket's doc ID is the owner's Google uid, so there's exactly one
// bracket per user per pool. createBracket therefore doubles as "join":
// calling it again with the same uid overwrites in place.
export async function createBracket(args: {
  poolId: string;
  poolName: string;
  ownerUid: string;
  nickname: string;
  picks: BracketPicks;
}): Promise<Bracket> {
  const { db } = getFirebase();
  const updatedAt = Date.now();
  const finalizedAt = args.picks.finalizedAt;
  const ref = doc(db, 'pools', args.poolId, 'brackets', args.ownerUid);
  await setDoc(ref, {
    ownerUid: args.ownerUid,
    nickname: args.nickname,
    poolName: args.poolName,
    picks: args.picks,
    updatedAt,
    finalizedAt,
  });
  return {
    id: args.ownerUid,
    poolId: args.poolId,
    ownerUid: args.ownerUid,
    nickname: args.nickname,
    poolName: args.poolName,
    picks: args.picks,
    updatedAt,
    finalizedAt,
  };
}

function toBracket(
  poolId: string,
  id: string,
  data: Record<string, unknown>,
): Bracket {
  return {
    id,
    poolId,
    ownerUid: data.ownerUid as string,
    nickname: data.nickname as string,
    poolName: (data.poolName as string) ?? '',
    picks: data.picks as BracketPicks,
    updatedAt: data.updatedAt as number,
    finalizedAt: (data.finalizedAt as number | null) ?? null,
  };
}

export async function getBracket(poolId: string, bracketId: string): Promise<Bracket | null> {
  const { db } = getFirebase();
  const snap = await getDoc(doc(db, 'pools', poolId, 'brackets', bracketId));
  if (!snap.exists()) return null;
  return toBracket(poolId, snap.id, snap.data());
}

export async function updateBracketPicks(args: {
  bracket: Bracket;
  picks: BracketPicks;
}): Promise<void> {
  const { db } = getFirebase();
  const ref = doc(db, 'pools', args.bracket.poolId, 'brackets', args.bracket.id);
  // Rules require ownerUid to be preserved and to equal the doc id (== auth.uid).
  await setDoc(ref, {
    ownerUid: args.bracket.ownerUid,
    nickname: args.bracket.nickname,
    poolName: args.bracket.poolName,
    picks: args.picks,
    updatedAt: Date.now(),
    finalizedAt: args.picks.finalizedAt,
  });
}

// All brackets owned by a user, across every pool. Powers the "your
// brackets" list on the home page (works on any device since it's keyed
// to the Google account, not localStorage). Needs the collection-group
// index on ownerUid in firestore.indexes.json.
export async function listBracketsForUser(uid: string): Promise<Bracket[]> {
  const { db } = getFirebase();
  const q = query(collectionGroup(db, 'brackets'), where('ownerUid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const poolId = d.ref.parent.parent?.id ?? '';
    return toBracket(poolId, d.id, d.data());
  });
}

// Full brackets including picks. Used by the leaderboard, which needs the
// picks to compute scores.
export function subscribeToPoolBracketsFull(
  poolId: string,
  cb: (brackets: Bracket[]) => void,
): Unsubscribe {
  const { db } = getFirebase();
  return onSnapshot(collection(db, 'pools', poolId, 'brackets'), (snap) => {
    cb(snap.docs.map((d) => toBracket(poolId, d.id, d.data())));
  });
}
