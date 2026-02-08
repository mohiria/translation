export type ProficiencyLevel = 'CET4' | 'CET6' | 'CEFR_A1' | 'CEFR_A2' | 'CEFR_B1' | 'CEFR_B2' | 'CEFR_C1' | 'CEFR_C2'

export type DictTag = 'zk' | 'gk' | 'cet4' | 'cet6' | 'ky' | 'ielts' | 'toefl' | 'gre'

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

export interface WordExplanation {
  word: string
  ipa?: string
  ipa_us?: string
  ipa_uk?: string
  meaning: string
  context?: string
  tags?: DictTag[]
  source?: string
}

export interface SavedWord extends WordExplanation {
  timestamp: number
  sourceUrl: string
}