import { openDB } from 'idb';
import { Note } from '../types';

// The DBSchema and IDBPDatabase types are for TypeScript only and don't exist
// at runtime in the 'idb' module. We use `any` to avoid a module resolution error.

let dbPromise: Promise<any>;

const initDB = () => {
  if (dbPromise) return dbPromise;
  dbPromise = openDB('geonotes-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('created_at', 'created_at');
      }
      if (!db.objectStoreNames.contains('sync-queue')) {
        const syncStore = db.createObjectStore('sync-queue', { autoIncrement: true, keyPath: 'id' });
        syncStore.createIndex('id', 'id');
      }
    },
  });
  return dbPromise;
};

export const getNotesFromDB = async (page = 1, limit = 20): Promise<Note[]> => {
  const db = await initDB();
  const tx = db.transaction('notes', 'readonly');
  const store = tx.objectStore('notes');
  const index = store.index('created_at');

  // Since we want newest first, we iterate backwards.
  // IDB doesn't support "skip" natively in getAll, so we use a cursor.
  // Or we can just get all keys and slice, which is faster for small datasets but worse for large.
  // For "scale to 100", simple getAll is actually fine, but "scale to 100" implies 100 users or 100 notes? 
  // "Scale to 100" likely means supporting more notes.
  // Let's use a cursor to be somewhat efficient.

  let notes: Note[] = [];
  let cursor = await index.openCursor(null, 'prev');

  const skip = (page - 1) * limit;
  if (skip > 0 && cursor) {
    await cursor.advance(skip);
  }

  while (cursor && notes.length < limit) {
    notes.push(cursor.value);
    cursor = await cursor.continue();
  }

  return notes;
};

export const getLastSyncTime = (): string | null => {
  return localStorage.getItem('lastSyncTime');
};

export const setLastSyncTime = (isoString: string) => {
  localStorage.setItem('lastSyncTime', isoString);
};

export const saveNoteToDB = async (note: Note) => {
  const db = await initDB();
  return db.put('notes', note);
};

export const saveAllNotesToDB = async (notes: Note[]) => {
  const db = await initDB();
  const tx = db.transaction('notes', 'readwrite');
  await tx.objectStore('notes').clear();
  await Promise.all(notes.map(note => tx.objectStore('notes').put(note)));
  await tx.done;
};

export const addNotesToDB = async (notes: Note[]) => {
  const db = await initDB();
  const tx = db.transaction('notes', 'readwrite');
  await Promise.all(notes.map(note => tx.objectStore('notes').put(note)));
  await tx.done;
};


export const deleteNoteFromDB = async (id: string) => {
  const db = await initDB();
  return db.delete('notes', id);
};

export const queueUpdate = async (update: { type: 'SAVE' | 'DELETE'; payload: any }) => {
  const db = await initDB();
  // remove id if it exists, so that auto-increment works
  const { id, ...updateData } = update as any;
  return db.add('sync-queue', updateData);
};

export const getQueuedUpdates = async () => {
  const db = await initDB();
  return db.getAll('sync-queue');
};

export const clearQueuedUpdates = async () => {
  const db = await initDB();
  return db.clear('sync-queue');
};

export const deleteNoteFromQueue = async (id: number) => {
  const db = await initDB();
  return db.delete('sync-queue', id);
};

export const clearLocalData = async () => {
  const db = await initDB();
  const tx = db.transaction(['notes', 'sync-queue'], 'readwrite');
  await Promise.all([
    tx.objectStore('notes').clear(),
    tx.objectStore('sync-queue').clear()
  ]);
  await tx.done;
  console.log('Local data cleared.');
};