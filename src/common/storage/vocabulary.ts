import { SavedWord } from '../types'
import { initDB } from './indexed-db'

const USER_STORE = 'user_words'

export const getVocabulary = async (): Promise<SavedWord[]> => {
  const data = await chrome.storage.local.get('vocabulary')
  return data.vocabulary || []
}

export const addToVocabulary = async (word: SavedWord): Promise<void> => {
  const current = await getVocabulary()
  // Avoid duplicates in the list
  if (current.some(w => w.word.toLowerCase() === word.word.toLowerCase())) {
    return
  }
  const updated = [word, ...current]
  await chrome.storage.local.set({ vocabulary: updated })

  // Also write to IndexedDB so the scanner can find it as a "dictionary" entry
  try {
    const db = await initDB()
    const tx = db.transaction(USER_STORE, 'readwrite')
    const store = tx.objectStore(USER_STORE)
    
    // We store it using the same format as oxford_5000
    // word is the key, and it should be lowercase in the store as per indexed-db.ts logic
    await store.put({
      ...word,
      word: word.word.toLowerCase(),
      custom: true
    })
    await tx.done
    console.log(`Saved "${word.word}" to IndexedDB user dictionary.`)
  } catch (e) {
    console.error('Failed to save word to IndexedDB:', e)
  }
}

export const removeFromVocabulary = async (wordText: string): Promise<void> => {
  const current = await getVocabulary()
  const updated = current.filter(w => w.word.toLowerCase() !== wordText.toLowerCase())
  await chrome.storage.local.set({ vocabulary: updated })

  // Remove from the user_words store in IndexedDB
  try {
    const db = await initDB()
    const lower = wordText.toLowerCase()
    await db.delete(USER_STORE, lower)
    console.log(`Removed "${wordText}" from IndexedDB user dictionary.`)
  } catch (e) {
    console.error('Failed to remove word from IndexedDB:', e)
  }
}
