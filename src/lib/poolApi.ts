import { addDoc, collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';
import { generateSaltB64, hashWithSalt, verifyHash } from '@/lib/hash';
import type { Pool } from '@/lib/types';

function toPool(id: string, data: Record<string, unknown>): Pool {
  return {
    id,
    name: data.name as string,
    passwordHash: data.passwordHash as string,
    passwordSalt: data.passwordSalt as string,
    createdAt: data.createdAt as number,
  };
}

export async function createPool(name: string, password: string): Promise<Pool> {
  const { db } = getFirebase();
  const salt = generateSaltB64();
  const hash = await hashWithSalt(password, salt);
  const createdAt = Date.now();
  const ref = await addDoc(collection(db, 'pools'), {
    name,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt,
  });
  return { id: ref.id, name, passwordHash: hash, passwordSalt: salt, createdAt };
}

export async function getPool(poolId: string): Promise<Pool | null> {
  const { db } = getFirebase();
  const snap = await getDoc(doc(db, 'pools', poolId));
  if (!snap.exists()) return null;
  return toPool(snap.id, snap.data());
}

// All pools, newest first. Used by the admin AI-bracket tool to pick which
// pools a bracket should appear in. Pool reads are open to any authed user,
// so a single collection read suffices.
export async function listPools(): Promise<Pool[]> {
  const { db } = getFirebase();
  const snap = await getDocs(collection(db, 'pools'));
  return snap.docs
    .map((d) => toPool(d.id, d.data()))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function verifyPoolPassword(pool: Pool, password: string): Promise<boolean> {
  return verifyHash(password, pool.passwordSalt, pool.passwordHash);
}
