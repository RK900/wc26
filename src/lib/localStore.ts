const KEY = 'dleuworldcup:owned-brackets';

export interface OwnedBracketEntry {
  bracketId: string;
  editToken: string;
  poolName: string;
  nickname: string;
}

interface OwnedBracketsMap {
  brackets: Record<string, OwnedBracketEntry>;
}

function read(): OwnedBracketsMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { brackets: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.brackets) {
      return { brackets: {} };
    }
    return parsed as OwnedBracketsMap;
  } catch {
    return { brackets: {} };
  }
}

function write(data: OwnedBracketsMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable (private mode, etc.) — silently no-op.
  }
}

export function getOwnedBracket(poolId: string): OwnedBracketEntry | null {
  return read().brackets[poolId] ?? null;
}

export function saveOwnedBracket(poolId: string, entry: OwnedBracketEntry): void {
  const data = read();
  data.brackets[poolId] = entry;
  write(data);
}

export function removeOwnedBracket(poolId: string): void {
  const data = read();
  delete data.brackets[poolId];
  write(data);
}

export function listOwnedBrackets(): { poolId: string; entry: OwnedBracketEntry }[] {
  const data = read();
  return Object.entries(data.brackets).map(([poolId, entry]) => ({ poolId, entry }));
}
