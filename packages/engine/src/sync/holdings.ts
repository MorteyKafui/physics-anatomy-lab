import Dexie, { type EntityTable } from "dexie";

/**
 * Which account holds which attempt on this device, and how far each account has synced
 * (ADR 0039). Kept apart from the event store, so the lab's own data never changes shape for sync.
 *
 * An account is a string the app makes from the signed-in principal, such as "teacher:<id>" or
 * "member:<id>". Work done signed out has no holder until the person adopts it.
 */
export interface Holdings {
  holder(attemptId: string): Promise<string | undefined>;
  /** Give an attempt to an account. Refuses one another account already holds. */
  hold(attemptId: string, account: string): Promise<void>;
  /** Attempt ids the account holds. */
  heldBy(account: string): Promise<string[]>;
  /**
   * How many of the attempt's events the account has pushed, or 0. Events are only ever added,
   * so a count is a clock-free mark: devices' wall clocks disagree, counts cannot.
   */
  pushedCount(account: string, attemptId: string): Promise<number>;
  setPushedCount(account: string, attemptId: string, count: number): Promise<void>;
  /** The server's pull cursor for the account, or null before the first pull. */
  cursor(account: string): Promise<string | null>;
  setCursor(account: string, cursor: string): Promise<void>;
}

export class HeldElsewhereError extends Error {
  constructor(attemptId: string) {
    super(`attempt ${attemptId} belongs to another account on this device`);
  }
}

export function createMemoryHoldings(): Holdings {
  const holders = new Map<string, string>();
  const pushed = new Map<string, number>();
  const cursors = new Map<string, string>();
  return {
    holder: (id) => Promise.resolve(holders.get(id)),
    hold(id, account) {
      const current = holders.get(id);
      if (current !== undefined && current !== account) {
        return Promise.reject(new HeldElsewhereError(id));
      }
      holders.set(id, account);
      return Promise.resolve();
    },
    heldBy: (account) =>
      Promise.resolve([...holders].filter(([, a]) => a === account).map(([id]) => id)),
    pushedCount: (account, id) => Promise.resolve(pushed.get(`${account} ${id}`) ?? 0),
    setPushedCount(account, id, count) {
      pushed.set(`${account} ${id}`, count);
      return Promise.resolve();
    },
    cursor: (account) => Promise.resolve(cursors.get(account) ?? null),
    setCursor(account, cursor) {
      cursors.set(account, cursor);
      return Promise.resolve();
    },
  };
}

interface HolderRow {
  attemptId: string;
  account: string;
}
interface PushedRow {
  key: string;
  count: number;
}
interface CursorRow {
  account: string;
  cursor: string;
}

class SyncDatabase extends Dexie {
  holders!: EntityTable<HolderRow, "attemptId">;
  pushed!: EntityTable<PushedRow, "key">;
  cursors!: EntityTable<CursorRow, "account">;

  constructor(name: string, deps?: { indexedDB: IDBFactory; IDBKeyRange: typeof IDBKeyRange }) {
    super(name, deps);
    this.version(1).stores({
      holders: "&attemptId, account",
      pushed: "&key",
      cursors: "&account",
    });
  }
}

export interface IndexedDbHoldingsOptions {
  name?: string;
  indexedDB?: IDBFactory;
  IDBKeyRange?: typeof IDBKeyRange;
}

/** Holdings in the device's IndexedDB, in a database of their own ("physics-anatomy-sync"). */
export function createIndexedDbHoldings(
  options: IndexedDbHoldingsOptions = {},
): Holdings & { close(): void } {
  const deps =
    options.indexedDB && options.IDBKeyRange
      ? { indexedDB: options.indexedDB, IDBKeyRange: options.IDBKeyRange }
      : undefined;
  const db = new SyncDatabase(options.name ?? "physics-anatomy-sync", deps);
  return {
    holder: async (id) => (await db.holders.get(id))?.account,
    hold: (id, account) =>
      db.transaction("rw", db.holders, async () => {
        const current = await db.holders.get(id);
        if (current !== undefined && current.account !== account) {
          throw new HeldElsewhereError(id);
        }
        await db.holders.put({ attemptId: id, account });
      }),
    heldBy: async (account) =>
      (await db.holders.where("account").equals(account).toArray()).map((r) => r.attemptId),
    pushedCount: async (account, id) => (await db.pushed.get(`${account} ${id}`))?.count ?? 0,
    setPushedCount: async (account, id, count) => {
      await db.pushed.put({ key: `${account} ${id}`, count });
    },
    cursor: async (account) => (await db.cursors.get(account))?.cursor ?? null,
    setCursor: async (account, cursor) => {
      await db.cursors.put({ account, cursor });
    },
    close: () => db.close(),
  };
}
