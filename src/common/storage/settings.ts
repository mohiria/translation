import { UserSettings } from '../types'

const DEFAULT_SETTINGS: UserSettings = {
  enabled: false,
  proficiency: 'CET4',
  showIPA: true,
  pronunciation: 'US',
  engine: 'standard',
  llm: {
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: ''
  }
}

export const getSettings = async (): Promise<UserSettings> => {

  // Try to get from sync storage first

  let data = await chrome.storage.sync.get('settings')

  

  // Migration logic: if not in sync, try local

  if (!data.settings) {

    const localData = await chrome.storage.local.get('settings')

    if (localData.settings) {

      data = localData

      // Save to sync for future use

      await chrome.storage.sync.set({ settings: data.settings })

    }

  }



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

  await chrome.storage.sync.set({ settings })

}
