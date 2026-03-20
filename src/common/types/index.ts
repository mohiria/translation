export type ProficiencyLevel = 'CEFR_A1' | 'CEFR_A2' | 'CEFR_B1' | 'CET4' | 'CET6' | 'CEFR_C1' | 'CEFR_C2'

export type DictTag = 'zk' | 'gk' | 'cet4' | 'cet6' | 'ky' | 'ielts' | 'toefl' | 'gre' | 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2'

export type LLMProvider = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'moonshot' | 'zhipu' | 'qwen' | 'custom'

export interface LLMSettings {
  provider: LLMProvider
  apiKey: string
  baseUrl?: string
  model?: string
  
  // Backing storage for each provider's specific settings
  // UI remains unchanged, logic handles synchronization
  providerConfigs?: Record<string, {
    apiKey: string
    baseUrl?: string
    model?: string
  }>
}
export interface UserSettings {
  enabled: boolean
  proficiency: ProficiencyLevel
  showIPA: boolean
  pronunciation: 'UK' | 'US'
  engine: 'standard' | 'llm'
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
  meaning: string
  context?: string
  tags?: DictTag[]
  source?: string
  type?: string
  cefr?: string
  definitions?: WordDefinition[]
  custom?: boolean
}

export interface SavedWord extends WordExplanation {
  timestamp: number
  sourceUrl: string
}
