import { isDifficultyAbove, lookupWord } from './dictionary'
import { ProficiencyLevel, WordExplanation } from '../types'

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
    let explanation = dynamicDict[lowerWord] || lookupWord(word, pronunciation)

    if (!explanation) continue
    
    // If it's a dynamic explanation (like from LLM/saved), ensure the IPA is correct for current setting
    if (dynamicDict[lowerWord]) {
      explanation = { ...explanation }
      if (pronunciation === 'UK' && explanation.ipa_uk) {
        explanation.ipa = explanation.ipa_uk
      } else if (pronunciation === 'US' && explanation.ipa_us) {
        explanation.ipa = explanation.ipa_us
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

// Re-implementing logic here to avoid circular dependency or API change in dictionary.ts for now
// Ideally, dictionary.ts should export this helper
import { DictTag } from '../types'
const TAG_LEVEL_MAP: Record<DictTag, number> = {
  'zk': 1, 'gk': 2, 'cet4': 3, 'ky': 4, 'cet6': 4, 'ielts': 5, 'toefl': 5, 'gre': 6
}
const USER_LEVEL_RANK: Record<ProficiencyLevel, number> = {
  'CEFR_A1': 1, 'CEFR_A2': 1.5, 'CEFR_B1': 2, 'CEFR_B2': 3,
  'CET4': 3, 'CET6': 4, 'CEFR_C1': 5, 'CEFR_C2': 6
}

const checkDifficulty = (entry: WordExplanation, userLevel: ProficiencyLevel): boolean => {
  if (!entry.tags || entry.tags.length === 0) return true // Default to show if no tags
  const wordRanks = entry.tags.map(t => TAG_LEVEL_MAP[t] || 3)
  const wordDifficulty = Math.min(...wordRanks)
  const userRank = USER_LEVEL_RANK[userLevel]
  return wordDifficulty >= userRank
}