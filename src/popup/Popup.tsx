import React, { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../common/storage/settings'
import { ProficiencyLevel, UserSettings, SavedWord, LLMProvider, LLMSettings } from '../common/types'
import { getVocabulary, removeFromVocabulary } from '../common/storage/vocabulary'
import { Trash2, Settings, BookOpen, Cpu, Globe } from 'lucide-react'
import { formatIPA } from '../common/utils/format'

export const Popup = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [vocabulary, setVocabulary] = useState<SavedWord[]>([])
  const [activeTab, setActiveTab] = useState<'general' | 'llm' | 'vocab'>('general')

  useEffect(() => {
    getSettings().then(setSettings)
    getVocabulary().then(setVocabulary)
  }, [])

  const updateSettings = async (updater: (prev: UserSettings) => UserSettings) => {
    if (!settings) return
    const updated = updater(settings)
    setSettings(updated)
    await saveSettings(updated)
  }

  const handleLevelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings(prev => ({ ...prev, proficiency: e.target.value as ProficiencyLevel }))
  }

  const handleEngineChange = async (engine: 'google' | 'llm') => {
    updateSettings(prev => ({ ...prev, engine }))
  }

  const handleLLMUpdate = async (updates: Partial<LLMSettings>) => {
    updateSettings(prev => ({
      ...prev,
      llm: { ...prev.llm, ...updates }
    }))
  }

  const handleDeleteWord = async (wordText: string) => {
    await removeFromVocabulary(wordText)
    const updated = await getVocabulary()
    setVocabulary(updated)
  }

  if (!settings) return <div style={{ padding: '1rem' }}>Loading...</div>

  // --- Sub-Components for Tabs ---

  const GeneralTab = () => (
    <div style={{ animation: 'fadeIn 0.2s' }}>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: '#666' }}>
          My Proficiency Level:
        </label>
        <select 
          value={settings.proficiency} 
          onChange={handleLevelChange}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
        >
          <option value="CEFR_A1">初学 (A1 - Beginner)</option>
          <option value="CEFR_A2">基础 (A2 - Elementary)</option>
          <option value="CEFR_B1">中级 (B1 - Intermediate)</option>
          <option value="CET4">四级 (CET4) / B2</option>
          <option value="CET6">六级 (CET6) / 考研</option>
          <option value="CEFR_C1">高级 (C1) / 雅思 / 托福</option>
          <option value="CEFR_C2">精通 (C2) / GRE</option>
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', color: '#666' }}>
          Pronunciation Style:
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => updateSettings(prev => ({ ...prev, pronunciation: 'US' }))}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '6px',
              border: settings.pronunciation === 'US' ? '1px solid #4b8bf5' : '1px solid #ddd',
              backgroundColor: settings.pronunciation === 'US' ? '#f0f7ff' : 'white',
              color: settings.pronunciation === 'US' ? '#4b8bf5' : '#333',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            US (American)
          </button>
          <button
            onClick={() => updateSettings(prev => ({ ...prev, pronunciation: 'UK' }))}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '6px',
              border: settings.pronunciation === 'UK' ? '1px solid #4b8bf5' : '1px solid #ddd',
              backgroundColor: settings.pronunciation === 'UK' ? '#f0f7ff' : 'white',
              color: settings.pronunciation === 'UK' ? '#4b8bf5' : '#333',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            UK (British)
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.6rem', color: '#666' }}>
          Translation Engine:
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleEngineChange('google')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: settings.engine === 'google' ? '1px solid #4b8bf5' : '1px solid #ddd',
              backgroundColor: settings.engine === 'google' ? '#f0f7ff' : 'white',
              color: settings.engine === 'google' ? '#4b8bf5' : '#333',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.85rem'
            }}
          >
            <Globe size={14} /> Google
          </button>
          <button
            onClick={() => {
              handleEngineChange('llm')
              setActiveTab('llm')
            }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: settings.engine === 'llm' ? '1px solid #9c27b0' : '1px solid #ddd',
              backgroundColor: settings.engine === 'llm' ? '#fbf0ff' : 'white',
              color: settings.engine === 'llm' ? '#9c27b0' : '#333',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.85rem'
            }}
          >
            <Cpu size={14} /> AI / LLM
          </button>
        </div>
      </div>
    </div>
  )

  const LLM_MODELS: Record<Exclude<LLMProvider, 'custom'>, string[]> = {
    gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    claude: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-20240229'],
    deepseek: ['deepseek-chat', 'deepseek-reasoner']
  }

  const LLM_DEFAULT_URLS: Record<LLMProvider, string> = {
    gemini: 'https://generativelanguage.googleapis.com',
    openai: 'https://api.openai.com/v1',
    claude: 'https://api.anthropic.com',
    deepseek: 'https://api.deepseek.com',
    custom: 'https://api.your-proxy.com/v1'
  }

  const LLMTab = () => {
    const isCustomProvider = settings.llm.provider === 'custom'
    const providerModels = !isCustomProvider ? (LLM_MODELS[settings.llm.provider as keyof typeof LLM_MODELS] || []) : []

    return (
      <div style={{ animation: 'fadeIn 0.2s' }}>
        <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', lineHeight: '1.4' }}>
          AI provides context-aware translations but requires an API Key.
        </p>

        <div style={{ marginBottom: '0.8rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Provider</label>
          <select 
            value={settings.llm.provider} 
            onChange={(e) => {
              const newProvider = e.target.value as LLMProvider
              const updates: Partial<LLMSettings> = { provider: newProvider }
              if (newProvider !== 'custom') {
                updates.model = LLM_MODELS[newProvider as keyof typeof LLM_MODELS][0]
              } else {
                updates.model = ''
              }
              handleLLMUpdate(updates)
            }}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="claude">Anthropic Claude</option>
            <option value="deepseek">Deepseek</option>
            <option value="custom">Custom (OpenAI Compatible)</option>
          </select>
        </div>

        <div style={{ marginBottom: '0.8rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Model</label>
          {isCustomProvider ? (
            <input 
              type="text"
              value={settings.llm.model || ''} 
              onChange={(e) => handleLLMUpdate({ model: e.target.value })}
              placeholder="Enter model name (e.g. gpt-4-turbo)"
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          ) : (
            <select 
              value={settings.llm.model} 
              onChange={(e) => handleLLMUpdate({ model: e.target.value })}
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              {providerModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>

        <div style={{ marginBottom: '0.8rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem' }}>API Key <span style={{color:'red'}}>*</span></label>
          <input 
            type="password"
            value={settings.llm.apiKey} 
            onChange={(e) => handleLLMUpdate({ apiKey: e.target.value })}
            placeholder="sk-..."
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginBottom: '0.8rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Base URL (Optional)</label>
          <input 
            type="text"
            value={settings.llm.baseUrl || ''} 
            onChange={(e) => handleLLMUpdate({ baseUrl: e.target.value })}
            placeholder={LLM_DEFAULT_URLS[settings.llm.provider]}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
      </div>
    )
  }

  const VocabTab = () => (
    <div style={{ animation: 'fadeIn 0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
        <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Saved Words ({vocabulary.length})</h3>
      </div>
      
      {vocabulary.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: '#999', textAlign: 'center', margin: '2rem 0' }}>
          No words saved yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {vocabulary.slice(0, 15).map((item) => (
            <div key={item.word} style={{ 
              fontSize: '0.85rem', 
              padding: '8px', 
              backgroundColor: '#f9f9f9', 
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              border: '1px solid #eee'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: '#333' }}>{item.word}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>{formatIPA(item.ipa)} {item.meaning}</div>
              </div>
              <button 
                onClick={() => handleDeleteWord(item.word)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: '4px' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ width: '300px', padding: '12px', fontFamily: 'sans-serif', maxHeight: '500px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, color: '#2c3e50' }}>Fluency</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={async () => {
              if (!settings) return
              const updated = { ...settings, enabled: !settings.enabled }
              setSettings(updated)
              await saveSettings(updated)
            }}
            style={{
              backgroundColor: settings.enabled ? '#4caf50' : '#e0e0e0',
              color: settings.enabled ? 'white' : '#888',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}
          >
            {settings.enabled ? 'ACTIVE' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('general')}
          style={{ flex: 1, padding: '8px', background: 'none', border: 'none', borderBottom: activeTab === 'general' ? '2px solid #4b8bf5' : 'none', color: activeTab === 'general' ? '#4b8bf5' : '#888', cursor: 'pointer' }}
        >
          <Settings size={16} />
        </button>
        <button 
          onClick={() => setActiveTab('llm')}
          style={{ flex: 1, padding: '8px', background: 'none', border: 'none', borderBottom: activeTab === 'llm' ? '2px solid #9c27b0' : 'none', color: activeTab === 'llm' ? '#9c27b0' : '#888', cursor: 'pointer' }}
        >
          <Cpu size={16} />
        </button>
        <button 
          onClick={() => setActiveTab('vocab')}
          style={{ flex: 1, padding: '8px', background: 'none', border: 'none', borderBottom: activeTab === 'vocab' ? '2px solid #ff9800' : 'none', color: activeTab === 'vocab' ? '#ff9800' : '#888', cursor: 'pointer' }}
        >
          <BookOpen size={16} />
        </button>
      </div>

      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'llm' && <LLMTab />}
      {activeTab === 'vocab' && <VocabTab />}

    </div>
  )
}