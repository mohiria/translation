import { ProficiencyLevel, DictTag, WordExplanation } from '../types'
import { formatIPA } from '../utils/format'

// Mapping from Tags to estimated CEFR Level
export const TAG_LEVEL_MAP: Record<DictTag, number> = {
  'zk': 1,    // Zhongkao -> ~A1/A2
  'gk': 2,    // Gaokao -> ~B1
  'cet4': 3,  // CET-4 -> ~B1/B2
  'ky': 4,    // Kaoyan -> ~B2
  'cet6': 4,  // CET-6 -> ~B2+
  'ielts': 5, // IELTS -> ~C1
  'toefl': 5, // TOEFL -> ~C1
  'gre': 6,   // GRE -> ~C2
  'a1': 1,
  'a2': 1.5,
  'b1': 2,
  'b2': 3,
  'c1': 5,
  'c2': 6
}

export const USER_LEVEL_RANK: Record<ProficiencyLevel, number> = {
  'CEFR_A1': 1, 
  'CEFR_A2': 1.5,
  'CEFR_B1': 2, 
  'CET4': 3,
  'CET6': 4,
  'CEFR_C1': 5, 
  'CEFR_C2': 6
}

// ---------------------------------------------------------------------------
// Extended Dictionary Data (Moved to IndexedDB)
// ---------------------------------------------------------------------------
const DICT_DATA: Record<string, WordExplanation> = {}

export const lookupWord = (word: string, preferredPron: 'UK' | 'US' = 'US'): WordExplanation | null => {
  const lower = word.toLowerCase()
  let entry: WordExplanation | null = null

  // 1. Exact match
  if (DICT_DATA[lower]) {
    entry = { ...DICT_DATA[lower] }
  } else if (lower.endsWith('s') && DICT_DATA[lower.slice(0, -1)]) {
    // 2. Simple lemmatization (naive) - Remove 's', 'ed', 'ing'
    entry = { ...DICT_DATA[lower.slice(0, -1)] }
  } else if (lower.endsWith('ed') && DICT_DATA[lower.slice(0, -2)]) {
    entry = { ...DICT_DATA[lower.slice(0, -2)] }
  } else if (lower.endsWith('ing') && DICT_DATA[lower.slice(0, -3)]) {
    entry = { ...DICT_DATA[lower.slice(0, -3)] }
  }
  
  if (entry) {
    // Select the correct IPA based on preference
    // Create a NEW object to avoid mutating the original DICT_DATA or cached entries
    const result = { ...entry }
    if (preferredPron === 'UK' && result.ipa_uk) {
      result.ipa = formatIPA(result.ipa_uk)
    } else if (preferredPron === 'US' && result.ipa_us) {
      result.ipa = formatIPA(result.ipa_us)
    } else if (!result.ipa) {
      // Fallback if no regional IPA exists
      result.ipa = formatIPA(result.ipa_us || result.ipa_uk || '')
    } else {
      // If it already has result.ipa (like from the static dict entry directly)
      result.ipa = formatIPA(result.ipa)
    }
    return result
  }

  return null
}

export const isDifficultyAbove = (word: string, userLevel: ProficiencyLevel): boolean => {
  const entry = lookupWord(word)
  if (!entry || !entry.tags) return false
  
  const wordRanks = entry.tags.map(t => TAG_LEVEL_MAP[t] || 3) // Default to 3 if unknown
  const wordDifficulty = Math.min(...wordRanks)
  
  const userRank = USER_LEVEL_RANK[userLevel]
  
  return wordDifficulty >= userRank
}