import { openDB, DBSchema, IDBPDatabase } from 'idb';
import pako from 'pako';
import { WordExplanation, DictTag } from '../types';

const DB_NAME = 'll_dictionary_db';
const DB_VERSION = 1;
const STORE_NAME = 'words';
const META_STORE = 'meta';

interface DictionaryDB extends DBSchema {
  [STORE_NAME]: {
    key: string; // word (lowercase)
    value: WordExplanation;
  };
  [META_STORE]: {
    key: string;
    value: { version: number; lastUpdated: number };
  };
}

let dbPromise: Promise<IDBPDatabase<DictionaryDB>> | null = null;

// Initialize Database
export const initDB = async () => {
  if (dbPromise) return dbPromise;

  dbPromise = openDB<DictionaryDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'word' }); // word is unique key, but we store by lowercase manually
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    },
  });
  return dbPromise;
};

// Check if we need to update
export const checkAndUpdateDictionary = async () => {
  const db = await initDB();
  
  // 1. Get local version
  const localMeta = await db.get(META_STORE, 'version_info');
  const localVersion = localMeta?.version || 0;

  try {
    // 2. Fetch remote version manifest
    // In production, this points to your CDN, e.g., 'https://cdn.example.com/dict/version.json'
    const versionUrl = chrome.runtime.getURL('data/version.json'); 
    const versionRes = await fetch(versionUrl);
    if (!versionRes.ok) throw new Error('Failed to check version');
    
    const versionData = await versionRes.json();
    const remoteVersion = versionData.version;

    console.log(`Dictionary Version - Local: ${localVersion}, Remote: ${remoteVersion}`);

    if (remoteVersion > localVersion) {
      await downloadAndImportDictionary(db, remoteVersion);
    } else {
      console.log('Dictionary is up to date.');
    }
  } catch (e) {
    console.error('Dictionary update check failed:', e);
  }
};

const downloadAndImportDictionary = async (db: IDBPDatabase<DictionaryDB>, newVersion: number) => {
  console.time('DictDownload');
  console.log('Starting dictionary download...');
  
  // 1. Download Gzipped JSON
  const dictUrl = chrome.runtime.getURL('data/dictionary-core.json.gz');
  const response = await fetch(dictUrl);
  const buffer = await response.arrayBuffer();
  
  console.log(`Downloaded ${buffer.byteLength} bytes. Decompressing...`);
  
  // 2. Decompress
  const jsonString = pako.inflate(new Uint8Array(buffer), { to: 'string' });
  const data: WordExplanation[] = JSON.parse(jsonString);
  
  console.log(`Decompressed. Importing ${data.length} entries into IndexedDB...`);
  console.timeEnd('DictDownload');

  // 3. Bulk Put using Transaction
  console.time('DictImport');
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  // Clear old data first? Or overwrite? 
  // Overwriting is safer for partial updates, but clearing ensures no stale data remains.
  // For a full snapshot update, clear is better.
  await store.clear();

  // Process in chunks to avoid blocking UI too much (though IDB is async)
  const CHUNK_SIZE = 2000;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(item => {
        // Ensure key is lowercase for case-insensitive lookup, 
        // but preserve original casing in the value if needed
        const key = item.word.toLowerCase();
        return store.put({ ...item, word: key }); // Overwrite key with lowercase
    }));
  }
  
  await tx.done;
  console.timeEnd('DictImport');

  // 4. Update Version
  await db.put(META_STORE, { version: newVersion, lastUpdated: Date.now() }, 'version_info');
  console.log('Dictionary update complete!');
};

// Fast Lookup
export const lookupWordInDB = async (word: string): Promise<WordExplanation | undefined> => {
  const db = await initDB();
  const lower = word.toLowerCase();
  
  // 1. Try exact match
  let result = await db.get(STORE_NAME, lower);
  
  // 2. Simple lemmatization fallbacks (naive)
  if (!result) {
     if (lower.endsWith('s')) result = await db.get(STORE_NAME, lower.slice(0, -1));
     else if (lower.endsWith('ed')) result = await db.get(STORE_NAME, lower.slice(0, -2));
     else if (lower.endsWith('ing')) result = await db.get(STORE_NAME, lower.slice(0, -3));
  }
  
  return result;
};

// Bulk Lookup for Scanner (Optimization)
export const batchLookupWords = async (words: string[]): Promise<Record<string, WordExplanation>> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  
  const results: Record<string, WordExplanation> = {};
  
  // Parallelize requests
  await Promise.all(words.map(async (w) => {
    const lower = w.toLowerCase();
    const entry = await store.get(lower);
    if (entry) {
        // Restore original casing display if needed, but for now we trust the DB entry
        results[lower] = entry; 
    }
  }));
  
  return results;
};
