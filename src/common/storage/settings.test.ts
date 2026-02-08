import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSettings, saveSettings } from './settings'
import { UserSettings } from '../types'

// Mock chrome API
const chromeMock = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    }
  }
}
vi.stubGlobal('chrome', chromeMock)

describe('Settings Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chromeMock.storage.sync.get.mockResolvedValue({})
    chromeMock.storage.local.get.mockResolvedValue({})
  })

  it('should return default settings if nothing is stored', async () => {
    const settings = await getSettings()
    expect(settings.proficiency).toBe('CET4')
    expect(settings.showIPA).toBe(true)
  })

  it('should return stored settings from sync correctly', async () => {
    const mockData = { 
      enabled: true, 
      proficiency: 'CEFR_B2', 
      showIPA: false, 
      engine: 'google',
      llm: { provider: 'gemini', apiKey: '' }
    }
    chromeMock.storage.sync.get.mockResolvedValue({ settings: mockData })
    
    const settings = await getSettings()
    expect(settings.proficiency).toBe('CEFR_B2')
    expect(settings.showIPA).toBe(false)
  })

  it('should migrate settings from local to sync if sync is empty', async () => {
    const mockData = { 
      enabled: true, 
      proficiency: 'CEFR_B2', 
      showIPA: false, 
      engine: 'google',
      llm: { provider: 'gemini', apiKey: '' }
    }
    chromeMock.storage.sync.get.mockResolvedValue({})
    chromeMock.storage.local.get.mockResolvedValue({ settings: mockData })
    
    const settings = await getSettings()
    expect(settings.proficiency).toBe('CEFR_B2')
    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({ settings: mockData })
  })

  it('should call chrome.storage.sync.set when saving settings', async () => {
    const newSettings: UserSettings = { 
      enabled: true, 
      proficiency: 'CET6', 
      showIPA: true, 
      engine: 'llm',
      llm: { provider: 'openai', apiKey: 'sk-test' }
    }
    await saveSettings(newSettings)
    
    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({ settings: newSettings })
  })
})
