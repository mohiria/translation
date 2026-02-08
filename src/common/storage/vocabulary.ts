import { SavedWord } from '../types'

export const getVocabulary = async (): Promise<SavedWord[]> => {
  const data = await chrome.storage.local.get('vocabulary')
  return data.vocabulary || []
}

export const addToVocabulary = async (word: SavedWord): Promise<void> => {
  const current = await getVocabulary()
  // Avoid duplicates
  if (current.some(w => w.word.toLowerCase() === word.word.toLowerCase())) {
    return
  }
  const updated = [word, ...current]
  await chrome.storage.local.set({ vocabulary: updated })
}

export const removeFromVocabulary = async (wordText: string): Promise<void> => {
  const current = await getVocabulary()
  const updated = current.filter(w => w.word.toLowerCase() !== wordText.toLowerCase())
  await chrome.storage.local.set({ vocabulary: updated })
}
