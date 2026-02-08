import { UserSettings } from '../types'

const DEFAULT_SETTINGS: UserSettings = {
  enabled: true,
  proficiency: 'CET4',
  showIPA: true,
  engine: 'google',
  llm: {
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: ''
  }
}

export const getSettings = async (): Promise<UserSettings> => {
  const data = await chrome.storage.local.get('settings')
  const stored = data.settings || {}
  
  // Deep merge defaults with stored settings
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    llm: {
      ...DEFAULT_SETTINGS.llm,
      ...(stored.llm || {})
    }
  }
}

export const saveSettings = async (settings: UserSettings): Promise<void> => {
  await chrome.storage.local.set({ settings })
}