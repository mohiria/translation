export type ProficiencyLevel = 'CET4' | 'CET6' | 'CEFR_A1' | 'CEFR_A2' | 'CEFR_B1' | 'CEFR_B2' | 'CEFR_C1' | 'CEFR_C2'

export type DictTag = 'zk' | 'gk' | 'cet4' | 'cet6' | 'ky' | 'ielts' | 'toefl' | 'gre' | 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2'

export type LLMProvider = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'custom'

export interface LLMSettings {
  provider: LLMProvider
  apiKey: string
  baseUrl?: string
  model?: string
}

export interface UserSettings {
  enabled: boolean
  proficiency: ProficiencyLevel
  showIPA: boolean
  pronunciation: 'UK' | 'US'
  
  // Translation Engine Settings
  engine: 'google' | 'llm'
  llm: LLMSettings
}

export interface WordDefinition {
  type: string
  cefr: string
  definition: string
  example: string
  translation: string
  short_translation: string
}

export interface WordExplanation {
  word: string
  ipa?: string
  ipa_us?: string
  ipa_uk?: string
  meaning: string // Combined short translations for inline display
  context?: string // Primary example (from first entry)
  tags?: DictTag[]
  source?: string
  
  // Oxford specific
  type?: string // Combined types (e.g. "n., v.")
  cefr?: string // Highest CEFR level
  definitions?: WordDefinition[] // All definitions
}

export interface SavedWord extends WordExplanation {
  timestamp: number
  sourceUrl: string
}