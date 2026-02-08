import { WordExplanation, DictTag } from '../types'

interface DictEntry {
  word: string
  ipa?: string
  meaning: string
  tags?: DictTag[]
}

export const loadRemoteDictionary = async (): Promise<Record<string, WordExplanation>> => {
  try {
    const url = chrome.runtime.getURL('dictionaries/core-vocab.json')
    console.log('Fetching dictionary from:', url)
    
    const response = await fetch(url)
    const data: DictEntry[] = await response.json()
    
    // Convert array to map for fast lookup
    const dictMap: Record<string, WordExplanation> = {}
    data.forEach(entry => {
      dictMap[entry.word.toLowerCase()] = {
        word: entry.word,
        ipa: entry.ipa,
        meaning: entry.meaning,
        tags: entry.tags
      }
    })
    
    // Save to local storage for persistence
    await chrome.storage.local.set({ 'cached_dictionary': dictMap })
    console.log(`Loaded ${data.length} words into dictionary cache`)
    
    return dictMap
  } catch (e) {
    console.error('Failed to load remote dictionary:', e)
    return {}
  }
}

export const getCachedDictionary = async (): Promise<Record<string, WordExplanation>> => {
  const result = await chrome.storage.local.get('cached_dictionary')
  return result.cached_dictionary || {}
}