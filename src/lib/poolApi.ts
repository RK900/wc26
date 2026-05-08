import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';
import { generateSaltB64, hashWithSalt, verifyHash } from '@/lib/hash';
import type { Pool } from '@/lib/types';

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
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    passwordHash: data.passwordHash,
    passwordSalt: data.passwordSalt,
    createdAt: data.createdAt,
  };
}

export async function verifyPoolPassword(pool: Pool, password: string): Promise<boolean> {
  return verifyHash(password, pool.passwordSalt, pool.passwordHash);
}
