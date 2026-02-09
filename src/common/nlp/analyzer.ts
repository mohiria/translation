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
  
  // Simple regex to split by non-word characters but keep offsets
  const regex = /\b[a-zA-Z]{3,}\b/g
  let match
  
  while ((match = regex.exec(text)) !== null) {
    const word = match[0]
    const lowerWord = word.toLowerCase()
    
    // Check priority: Vocabulary Book > Proficiency Level
    const isSavedWord = vocabulary.has(lowerWord)
    
    // Check priority: Vocabulary Book / Dynamic Dict > Built-in dictionary
    const localEntry = lookupWord(word, pronunciation)
    let explanation = dynamicDict[lowerWord] || localEntry

    if (!explanation) continue
    
    // If it's a dynamic explanation (like from LLM/saved/remote JSON), 
    // ensure the IPA is correct for current setting.
    // We also merge with localEntry to get regional IPAs if dynamicDict is missing them.
    if (dynamicDict[lowerWord]) {
      explanation = { ...explanation }
      
      // Use regional IPAs from dynamic entry if they exist, otherwise fallback to localEntry's regional data
      const ipa_uk = explanation.ipa_uk || localEntry?.ipa_uk
      const ipa_us = explanation.ipa_us || localEntry?.ipa_us

      if (pronunciation === 'UK' && ipa_uk) {
        explanation.ipa = formatIPA(ipa_uk)
      } else if (pronunciation === 'US' && ipa_us) {
        explanation.ipa = formatIPA(ipa_us)
      } else {
        // Final fallback to whatever fixed IPA the dynamic entry had
        explanation.ipa = formatIPA(explanation.ipa)
      }
    }

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