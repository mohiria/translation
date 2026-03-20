import React, { useState } from 'react'
import { ProficiencyLevel, LLMProvider, LLMSettings } from '../common/types'
import { useSettings } from '../common/hooks/useSettings'
import { LLM_MODELS, LLM_DEFAULT_URLS } from '../common/config'
import { Cpu, Settings, Globe, Check } from 'lucide-react'

export const Options = () => {
  const { settings, updateSettings, loading } = useSettings()
  const [savedStatus, setSavedStatus] = useState(false)

  const handleUpdate = async (updates: any) => {
    await updateSettings(updates)
    setSavedStatus(true)
    setTimeout(() => setSavedStatus(false), 2000)
  }

  const handleLLMUpdate = (updates: Partial<LLMSettings>) => {
    if (!settings) return
    handleUpdate({ llm: { ...settings.llm, ...updates } })
  }

  if (loading || !settings) return <div style={{ padding: '2rem' }}>Loading settings...</div>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', color: '#333', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={32} /> In Reading Settings
        </h1>
        {savedStatus && (
          <span style={{ color: '#4caf50', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Check size={18} /> Saved
          </span>
        )}
      </header>

      <div style={{ display: 'grid', gap: '2rem' }}>
        <section style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={20} /> General
          </h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Proficiency Level</label>
            <select 
              value={settings.proficiency} 
              onChange={(e) => handleUpdate({ proficiency: e.target.value as ProficiencyLevel })}
              style={{ padding: '8px', width: '300px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="CEFR_A1">入门 (A1 - Beginner)</option>
              <option value="CEFR_A2">基础 (A2 - Elementary)</option>
              <option value="CEFR_B1">中级 (B1 - Intermediate)</option>
              <option value="CET4">四级 (CET4) / B2</option>
              <option value="CET6">六级 (CET6) / C1</option>
              <option value="CEFR_C1">高级 (C1+)</option>
              <option value="CEFR_C2">精通 (C2)</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Pronunciation Style</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {['US', 'UK'].map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="pronunciation" checked={settings.pronunciation === p} 
                    onChange={() => handleUpdate({ pronunciation: p as any })}
                  />
                  {p === 'US' ? 'American (US)' : 'British (UK)'}
                </label>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.showIPA} onChange={(e) => handleUpdate({ showIPA: e.target.checked })} />
            Show IPA Pronunciation
          </label>
        </section>

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
                  const p = e.target.value as LLMProvider
                  handleLLMUpdate({ provider: p, model: p !== 'custom' ? LLM_MODELS[p as keyof typeof LLM_MODELS][0] : '' })
                }}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="claude">Anthropic Claude</option>
                <option value="deepseek">Deepseek</option>
                <option value="moonshot">月之暗面 (Kimi)</option>
                <option value="zhipu">智谱 AI (GLM)</option>
                <option value="qwen">阿里千问 (Qwen)</option>
                <option value="custom">Custom (OpenAI Compatible)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Model</label>
              {settings.llm.provider === 'custom' ? (
                <input 
                  type="text" value={settings.llm.model || ''} 
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
                  {(LLM_MODELS[settings.llm.provider as keyof typeof LLM_MODELS] || []).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>API Key</label>
            <input 
              type="password" value={settings.llm.apiKey} 
              onChange={(e) => handleLLMUpdate({ apiKey: e.target.value })}
              placeholder="sk-..."
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Base URL (Optional)</label>
            <input 
              type="text" value={settings.llm.baseUrl || ''} 
              onChange={(e) => handleLLMUpdate({ baseUrl: e.target.value })}
              placeholder={LLM_DEFAULT_URLS[settings.llm.provider]}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
