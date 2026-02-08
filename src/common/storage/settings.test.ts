import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSettings, saveSettings } from './settings'
import { UserSettings } from '../types'

// Mock chrome API
const chromeMock = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    }
  }
}
vi.stubGlobal('chrome', chromeMock)

describe('Settings Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return default settings if nothing is stored', async () => {
    chromeMock.storage.local.get.mockResolvedValue({})
    
    const settings = await getSettings()
    expect(settings.proficiency).toBe('CET4')
    expect(settings.showIPA).toBe(true)
  })

  it('should return stored settings correctly', async () => {
    const mockData: UserSettings = { 
      enabled: true, 
      proficiency: 'CEFR_B2', 
      showIPA: false, 
      engine: 'google',
      llm: { provider: 'gemini', apiKey: '' }
    }
    chromeMock.storage.local.get.mockResolvedValue({ settings: mockData })
    
    const settings = await getSettings()
    expect(settings.proficiency).toBe('CEFR_B2')
    expect(settings.showIPA).toBe(false)
  })

  it('should call chrome.storage.set when saving settings', async () => {
    const newSettings: UserSettings = { 
      enabled: true, 
      proficiency: 'CET6', 
      showIPA: true, 
      engine: 'llm',
      llm: { provider: 'openai', apiKey: 'sk-test' }
    }
    await saveSettings(newSettings)
    
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({ settings: newSettings })
  })
})
