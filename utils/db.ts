import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@7/+esm';
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

export const getNotesFromDB = async (): Promise<Note[]> => {
  const db = await initDB();
  return (await db.getAll('notes')).sort((a: Note, b: Note) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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