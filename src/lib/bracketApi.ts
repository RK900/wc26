import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';
import { generateSaltB64, generateTokenB64, hashWithSalt, verifyHash } from '@/lib/hash';
import type { Bracket, BracketPicks, BracketSummary } from '@/lib/types';

export async function createBracket(args: {
  poolId: string;
  name: string;
  nickname: string;
  picks: BracketPicks;
}): Promise<{ bracket: Bracket; editToken: string }> {
  const { db } = getFirebase();
  const editToken = generateTokenB64();
  const ownerTokenSalt = generateSaltB64();
  const ownerTokenHash = await hashWithSalt(editToken, ownerTokenSalt);
  const updatedAt = Date.now();
  const finalizedAt = args.picks.finalizedAt;

  const ref = await addDoc(collection(db, 'pools', args.poolId, 'brackets'), {
    name: args.name,
    nickname: args.nickname,
    ownerTokenHash,
    ownerTokenSalt,
    picks: args.picks,
    updatedAt,
    finalizedAt,
  });

  return {
    bracket: {
      id: ref.id,
      poolId: args.poolId,
      name: args.name,
      nickname: args.nickname,
      ownerTokenHash,
      ownerTokenSalt,
      picks: args.picks,
      updatedAt,
      finalizedAt,
    },
    editToken,
  };
}

export async function getBracket(poolId: string, bracketId: string): Promise<Bracket | null> {
  const { db } = getFirebase();
  const snap = await getDoc(doc(db, 'pools', poolId, 'brackets', bracketId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    poolId,
    name: data.name,
    nickname: data.nickname,
    ownerTokenHash: data.ownerTokenHash,
    ownerTokenSalt: data.ownerTokenSalt,
    picks: data.picks,
    updatedAt: data.updatedAt,
    finalizedAt: data.finalizedAt ?? null,
  };
}

export async function updateBracketPicks(args: {
  bracket: Bracket;
  picks: BracketPicks;
}): Promise<void> {
  const { db } = getFirebase();
  const ref = doc(db, 'pools', args.bracket.poolId, 'brackets', args.bracket.id);
  // Rules require name/nickname/ownerTokenHash/ownerTokenSalt to be unchanged on update.
  await setDoc(ref, {
    name: args.bracket.name,
    nickname: args.bracket.nickname,
    ownerTokenHash: args.bracket.ownerTokenHash,
    ownerTokenSalt: args.bracket.ownerTokenSalt,
    picks: args.picks,
    updatedAt: Date.now(),
    finalizedAt: args.picks.finalizedAt,
  });
}

export function subscribeToPoolBrackets(
  poolId: string,
  cb: (summaries: BracketSummary[]) => void,
): Unsubscribe {
  const { db } = getFirebase();
  return onSnapshot(collection(db, 'pools', poolId, 'brackets'), (snap) => {
    const summaries: BracketSummary[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        nickname: data.nickname,
        finalizedAt: data.finalizedAt ?? null,
        updatedAt: data.updatedAt,
      };
    });
    cb(summaries);
  });
}

// Full brackets including picks. Used by the leaderboard, which needs the
// picks to compute scores. onSnapshot fetches every doc either way, so
// this costs the same reads as the summary variant.
export function subscribeToPoolBracketsFull(
  poolId: string,
  cb: (brackets: Bracket[]) => void,
): Unsubscribe {
  const { db } = getFirebase();
  return onSnapshot(collection(db, 'pools', poolId, 'brackets'), (snap) => {
    const brackets: Bracket[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        poolId,
        name: data.name,
        nickname: data.nickname,
        ownerTokenHash: data.ownerTokenHash,
        ownerTokenSalt: data.ownerTokenSalt,
        picks: data.picks,
        updatedAt: data.updatedAt,
        finalizedAt: data.finalizedAt ?? null,
      };
    });
    cb(brackets);
  });
}

export async function verifyBracketToken(bracket: Bracket, token: string): Promise<boolean> {
  return verifyHash(token, bracket.ownerTokenSalt, bracket.ownerTokenHash);
}
