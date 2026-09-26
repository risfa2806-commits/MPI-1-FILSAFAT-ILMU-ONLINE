import { SiakadDatabase, IndividualSubmission } from '../types';

const DB_NAME = 'SiakadMPI1_Storage';
const DB_VERSION = 1;
const STORE_NAME = 'app_cache';

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save complete SiakadDatabase to IndexedDB (safe from 5MB localStorage limits)
 */
export async function saveToIndexedDb(data: SiakadDatabase): Promise<boolean> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, 'current_db');

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('IndexedDB write error:', err);
    return false;
  }
}

/**
 * Load SiakadDatabase from IndexedDB
 */
export async function loadFromIndexedDb(): Promise<SiakadDatabase | null> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('current_db');

      req.onsuccess = () => {
        db.close();
        resolve(req.result || null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('IndexedDB read error:', err);
    return null;
  }
}

/**
 * Backup an individual presentation submission to IndexedDB immediately
 */
export async function saveIndividualSubmissionToIndexedDb(sub: IndividualSubmission): Promise<boolean> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const meetingKey = sub.meetingNumber ? `submission_${sub.studentId}_m${sub.meetingNumber}` : `submission_${sub.studentId}`;
      store.put(sub, meetingKey);
      store.put(sub, `submission_${sub.studentId}`);

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

export async function loadIndividualSubmissionFromIndexedDb(studentId: string, meetingNumber?: number): Promise<IndividualSubmission | null> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const meetingKey = meetingNumber ? `submission_${studentId}_m${meetingNumber}` : `submission_${studentId}`;
      const req = store.get(meetingKey);

      req.onsuccess = () => {
        db.close();
        resolve(req.result || null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}
