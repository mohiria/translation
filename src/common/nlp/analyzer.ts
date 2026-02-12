import { isDifficultyAbove, lookupWord, USER_LEVEL_RANK, TAG_LEVEL_MAP } from './dictionary'
import { ProficiencyLevel, WordExplanation } from '../types'
import { formatIPA } from '../utils/format'

export interface IdentifiedWord {
  word: string
  index: number // Start index in the original text
  length: number
  explanation: WordExplanation
}

export const analyzeText = (
  text: string, 
  userLevel: ProficiencyLevel = 'CEFR_A1', 
  vocabulary: Set<string> = new Set(),
  dynamicDict: Record<string, WordExplanation> = {},
  pronunciation: 'UK' | 'US' = 'US'
): IdentifiedWord[] => {
  const results: IdentifiedWord[] = []
  const regex = /\b[a-zA-Z]{3,}\b/g
  let match
  
  while ((match = regex.exec(text)) !== null) {
    const word = match[0]
    const lowerWord = word.toLowerCase()
    
    // Priority: Dynamic/IndexedDB Dict > Built-in (which is empty now)
    let explanation = dynamicDict[lowerWord] || lookupWord(word, pronunciation)

    if (!explanation) continue
    
    // Create a copy to avoid mutating the source dict
    explanation = { ...explanation }

    // Ensure we have the correct IPA for the current pronunciation preference
    const pref = pronunciation.toUpperCase()
    const ipa_uk = explanation.ipa_uk
    const ipa_us = explanation.ipa_us

    if (pref === 'UK' && ipa_uk) {
      explanation.ipa = formatIPA(ipa_uk)
    } else if (pref === 'US' && ipa_us) {
      explanation.ipa = formatIPA(ipa_us)
    } else if (!explanation.ipa) {
      // Fallback if regional IPA is missing but general ipa exists
      explanation.ipa = formatIPA(explanation.ipa || ipa_us || ipa_uk || '')
    }

    const isSavedWord = vocabulary.has(lowerWord)
    const isHardEnough = checkDifficulty(explanation, userLevel)
    
    if (isSavedWord || isHardEnough) {
      results.push({
        word,
        index: match.index,
        length: word.length,
        explanation
      })
    }
  }
  
  return results
}

const checkDifficulty = (entry: WordExplanation, userLevel: ProficiencyLevel): boolean => {
  if (!entry.tags || entry.tags.length === 0) return true // Default to show if no tags
  const wordRanks = entry.tags.map(t => TAG_LEVEL_MAP[t] || 3)
  const wordDifficulty = Math.min(...wordRanks)
  const userRank = USER_LEVEL_RANK[userLevel]
  return wordDifficulty >= userRank
}