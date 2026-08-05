/* ─────────────────────────────────────────────
   Image Store — IndexedDB wrapper for card art.

   WHY IndexedDB and not localStorage:
   localStorage has a hard quota (~5MB). A single 744×1038
   card image as base64 can weigh 1-5MB, so persisting images
   inside the cards array blows the quota. IndexedDB has a
   practical limit of gigabytes, which is what blobs need.

   This module is the ONLY place that touches IndexedDB, so
   tests (jsdom has no IndexedDB) and SSR simply no-op.
   ───────────────────────────────────────────── */

const DB_NAME = 'epic-tgc-images'
const STORE = 'card-images'

/** In-memory cache: avoids repeated IndexedDB reads during renders */
const cache = new Map<string, string>()

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
  return dbPromise
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | undefined,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    let result: unknown
    // Capture the request result: oncomplete fires AFTER the request succeeded,
    // but resolve() must carry the value (e.g. s.get() / s.getAll()).
    t.oncomplete = () => resolve(result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
    try {
      const req = fn(t.objectStore(STORE))
      if (req) {
        req.onsuccess = () => {
          result = req.result
        }
      }
    } catch (err) {
      reject(err)
    }
  })
}

/** Persist a card image (dataUrl) keyed by card id */
export async function saveCardImage(
  cardId: string,
  dataUrl: string,
): Promise<void> {
  cache.set(cardId, dataUrl)
  const db = await openDb()
  if (!db) return
  try {
    await tx(db, 'readwrite', (s) => s.put({ id: cardId, dataUrl }))
  } catch {
    /* no-op: image stays in cache, next save retries */
  }
}

/** Get a card image by card id (cache-first) */
export async function getCardImage(cardId: string): Promise<string | undefined> {
  if (cache.has(cardId)) return cache.get(cardId)
  const db = await openDb()
  if (!db) return undefined
  try {
    const result = (await tx(db, 'readonly', (s) => s.get(cardId))) as
      | { dataUrl: string }
      | undefined
    const dataUrl = result?.dataUrl
    if (dataUrl) cache.set(cardId, dataUrl)
    return dataUrl
  } catch {
    return undefined
  }
}

/** Remove a card image */
export async function deleteCardImage(cardId: string): Promise<void> {
  cache.delete(cardId)
  const db = await openDb()
  if (!db) return
  try {
    await tx(db, 'readwrite', (s) => s.delete(cardId))
  } catch {
    /* no-op */
  }
}

/** Remove ALL card images (used by "Limpiar colección") */
export async function clearCardImages(): Promise<void> {
  cache.clear()
  const db = await openDb()
  if (!db) return
  try {
    await tx(db, 'readwrite', (s) => s.clear())
  } catch {
    /* no-op */
  }
}

/** List every stored image (used by JSON export to embed art) */
export async function getAllCardImages(): Promise<
  { id: string; dataUrl: string }[]
> {
  const db = await openDb()
  if (!db) return [...cache.entries()].map(([id, dataUrl]) => ({ id, dataUrl }))
  try {
    const rows = (await tx(db, 'readonly', (s) => s.getAll())) as
      | { id: string; dataUrl: string }[]
      | undefined
    const result = rows ?? []
    for (const { id, dataUrl } of result) cache.set(id, dataUrl)
    return result
  } catch {
    return [...cache.entries()].map(([id, dataUrl]) => ({ id, dataUrl }))
  }
}
