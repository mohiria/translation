import React, { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../common/storage/settings'
import { ProficiencyLevel, UserSettings, LLMProvider, LLMSettings } from '../common/types'
import { Cpu, Settings, Globe, Check } from 'lucide-react'

export const Options = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [savedStatus, setSavedStatus] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const updateSettings = async (updater: (prev: UserSettings) => UserSettings) => {
    if (!settings) return
    const updated = updater(settings)
    setSettings(updated)
    await saveSettings(updated)
    
    setSavedStatus(true)
    setTimeout(() => setSavedStatus(false), 2000)
  }

  const handleLLMUpdate = async (updates: Partial<LLMSettings>) => {
    updateSettings(prev => ({
      ...prev,
      llm: { ...prev.llm, ...updates }
    }))
  }

  if (!settings) return <div style={{ padding: '2rem' }}>Loading settings...</div>

  const LLM_MODELS: Record<Exclude<LLMProvider, 'custom'>, string[]> = {
    gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    claude: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-20240229'],
    deepseek: ['deepseek-chat', 'deepseek-reasoner']
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '2rem', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#333'
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={32} /> Fluency Settings
        </h1>
        {savedStatus && (
          <span style={{ color: '#4caf50', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Check size={18} /> Settings saved automatically
          </span>
        )}
      </header>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* General Settings */}
        <section style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={20} /> General
          </h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Proficiency Level</label>
            <select 
              value={settings.proficiency} 
              onChange={(e) => updateSettings(prev => ({ ...prev, proficiency: e.target.value as ProficiencyLevel }))}
              style={{ padding: '8px', width: '300px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="CEFR_A1">A1 - Beginner</option>
              <option value="CEFR_A2">A2 - Elementary</option>
              <option value="CEFR_B1">B1 - Intermediate</option>
              <option value="CEFR_B2">B2 - Upper Int</option>
              <option value="CET4">CET-4 (College English)</option>
              <option value="CET6">CET-6 (Advanced)</option>
              <option value="CEFR_C1">C1 - Advanced</option>
            </select>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>Words you already know at this level won't be highlighted.</p>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={settings.showIPA} 
                onChange={(e) => updateSettings(prev => ({ ...prev, showIPA: e.target.checked }))}
              />
              Show IPA Pronunciation
            </label>
          </div>
        </section>

        {/* LLM Settings */}
        <section style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} /> AI / LLM Configuration
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Provider</label>
              <select 
                value={settings.llm.provider} 
                onChange={(e) => {
                  const newProvider = e.target.value as LLMProvider
                  const updates: Partial<LLMSettings> = { provider: newProvider }
                  if (newProvider !== 'custom') {
                    updates.model = LLM_MODELS[newProvider as keyof typeof LLM_MODELS][0]
                  }
                  handleLLMUpdate(updates)
                }}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="claude">Anthropic Claude</option>
                <option value="deepseek">Deepseek</option>
                <option value="custom">Custom (OpenAI Compatible)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Model</label>
              {settings.llm.provider === 'custom' ? (
                <input 
                  type="text"
                  value={settings.llm.model || ''} 
                  onChange={(e) => handleLLMUpdate({ model: e.target.value })}
                  placeholder="e.g. gpt-4-turbo"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              ) : (
                <select 
                  value={settings.llm.model} 
                  onChange={(e) => handleLLMUpdate({ model: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  {(LLM_MODELS[settings.llm.provider as keyof typeof LLM_MODELS] || []).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>API Key</label>
            <input 
              type="password"
              value={settings.llm.apiKey} 
              onChange={(e) => handleLLMUpdate({ apiKey: e.target.value })}
              placeholder="Enter your API key"
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Base URL (Optional)</label>
            <input 
              type="text"
              value={settings.llm.baseUrl || ''} 
              onChange={(e) => handleLLMUpdate({ baseUrl: e.target.value })}
              placeholder="Default API URL"
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
            />
            <p style={{ fontSize: '0.85rem', color: '#666' }}>Useful for proxies or local models (Ollama, LM Studio).</p>
          </div>
        </section>
      </div>
    </div>
  )
}