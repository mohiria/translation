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
  dynamicDict: Record<string, WordExplanation> = {}
): IdentifiedWord[] => {
  const results: IdentifiedWord[] = []
  
  // Simple regex to split by non-word characters but keep offsets
  // This is a naive tokenizer. In production, use `Intl.Segmenter` or a proper NLP lib.
  const regex = /\b[a-zA-Z]{3,}\b/g
  let match
  
  while ((match = regex.exec(text)) !== null) {
    const word = match[0]
    const lowerWord = word.toLowerCase()
    
    // Check priority: Vocabulary Book > Proficiency Level
    const isSavedWord = vocabulary.has(lowerWord)
    
    // Check priority: Vocabulary Book / Dynamic Dict > Built-in dictionary
    let explanation = dynamicDict[lowerWord] || lookupWord(word)

    if (!explanation) continue

    // Check difficulty logic
    // We need to pass the tags from the explanation to the check logic
    // Since isDifficultyAbove currently does a lookup inside, we need to adapt it
    // Or simpler: we replicate the logic here if we have the explanation object
    
    // Helper to check difficulty if we already have the explanation object
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