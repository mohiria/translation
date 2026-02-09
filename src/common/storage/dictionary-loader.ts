import { WordExplanation, DictTag } from '../types'
import { checkAndUpdateDictionary, batchLookupWords, initDB } from './indexed-db'

// This interface matches the old one for compatibility, 
// but internally we now use IndexedDB
export const loadRemoteDictionary = async (): Promise<Record<string, WordExplanation>> => {
  try {
    console.log('Initializing Dictionary System (IndexedDB)...')
    
    // 1. Ensure DB is ready and trigger background update
    await initDB()
    
    // Fire and forget update check (don't block initial load)
    checkAndUpdateDictionary().catch(err => console.error('Background dict update failed', err))
    
    // For backward compatibility with the sync synchronous logic of the old scanner,
    // we return an empty object here. The new scanner MUST use batchLookupWords()
    // instead of expecting a full dictionary dump in memory.
    // 
    // Returning empty object signals "Dynamic Mode" to the new scanner.
    return {} 
    
  } catch (e) {
    console.error('Failed to init dictionary:', e)
    return {}
  }
}

// Keeping this for backward compatibility, but it's deprecated.
// Components should use batchLookupWords or lookupWordInDB
export const getCachedDictionary = async (): Promise<Record<string, WordExplanation>> => {
  return {}
}