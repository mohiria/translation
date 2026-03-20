import React, { useEffect, useState } from 'react'
import { ProficiencyLevel, SavedWord, LLMProvider, LLMSettings } from '../common/types'
import { useSettings } from '../common/hooks/useSettings'
import { useVocabulary } from '../common/hooks/useVocabulary'
import { LLM_MODELS, LLM_DEFAULT_URLS } from '../common/config'
import { Trash2, Settings, BookOpen, Cpu, Globe, Keyboard } from 'lucide-react'
import { formatIPA } from '../common/utils/format'

export const Popup = () => {
  const { settings, updateSettings } = useSettings()
  const { vocabulary, removeWord } = useVocabulary()
  const [activeTab, setActiveTab] = useState<'general' | 'llm' | 'vocab'>('general')
  const [tabEnabled, setTabEnabled] = useState(false)
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId) {
        setCurrentTabId(tabId)
        chrome.runtime.sendMessage({ type: 'GET_TAB_STATE', tabId }, (response) => {
          setTabEnabled(!!response?.enabled)
        })
      }
    })

    const handleMessage = (request: any) => {
      if (request.type === 'TAB_STATE_CHANGED' && request.tabId === currentTabId) {
        setTabEnabled(request.enabled)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [currentTabId])

  const toggleTabEnabled = () => {
    if (currentTabId) {
      chrome.runtime.sendMessage({ type: 'TOGGLE_TAB_STATE', tabId: currentTabId })
      setTabEnabled(!tabEnabled)
    }
  }

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ proficiency: e.target.value as ProficiencyLevel })
  }

  const handleLLMUpdate = (updates: Partial<LLMSettings>) => {
    if (!settings) return
    updateSettings({
      llm: { ...settings.llm, ...updates }
    })
  }

  if (!settings) return <div style={{ padding: '1rem' }}>Loading...</div>

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
          {['US', 'UK'].map((p) => (
            <button
              key={p}
              onClick={() => updateSettings({ pronunciation: p as 'US' | 'UK' })}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '6px',
                border: settings.pronunciation === p ? '1px solid #4b8bf5' : '1px solid #ddd',
                backgroundColor: settings.pronunciation === p ? '#f0f7ff' : 'white',
                color: settings.pronunciation === p ? '#4b8bf5' : '#333',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {p} ({p === 'US' ? 'American' : 'British'})
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.6rem', color: '#666' }}>
          Translation Engine:
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => updateSettings({ engine: 'standard' })}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: settings.engine === 'standard' ? '1px solid #4b8bf5' : '1px solid #ddd',
              backgroundColor: settings.engine === 'standard' ? '#f0f7ff' : 'white',
              color: settings.engine === 'standard' ? '#4b8bf5' : '#333',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.85rem'
            }}
          >
            <Globe size={14} /> Standard
          </button>
          <button
            onClick={() => {
              updateSettings({ engine: 'llm' })
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

  const LLMTab = () => {
    const provider = settings.llm.provider
    const isCustom = provider === 'custom'
    const models = !isCustom ? LLM_MODELS[provider as keyof typeof LLM_MODELS] : []

    const inputStyle: React.CSSProperties = {
      width: '100%',
      padding: '6px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      boxSizing: 'border-box'
    }

    return (
      <div style={{ animation: 'fadeIn 0.2s' }}>
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Provider</label>
          <select 
            value={provider} 
            onChange={(e) => {
              const p = e.target.value as LLMProvider
              handleLLMUpdate({ 
                provider: p, 
                model: p !== 'custom' ? LLM_MODELS[p as keyof typeof LLM_MODELS][0] : '' 
              })
            }}
            style={inputStyle}
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

        <div style={{ marginBottom: '0.8rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Model</label>
          {isCustom ? (
            <input 
              type="text"
              value={settings.llm.model || ''} 
              onChange={(e) => handleLLMUpdate({ model: e.target.value })}
              placeholder="e.g. gpt-4-turbo"
              style={inputStyle}
            />
          ) : (
            <select 
              value={settings.llm.model} 
              onChange={(e) => handleLLMUpdate({ model: e.target.value })}
              style={inputStyle}
            >
              {models.map(m => <option key={m} value={m}>{m}</option>)}
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
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '0.8rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Base URL (Optional)</label>
          <input 
            type="text"
            value={settings.llm.baseUrl || ''} 
            onChange={(e) => handleLLMUpdate({ baseUrl: e.target.value })}
            placeholder={LLM_DEFAULT_URLS[provider]}
            style={inputStyle}
          />
        </div>
      </div>
    )
  }

  const VocabTab = () => (
    <div style={{ animation: 'fadeIn 0.2s' }}>
      <h3 style={{ fontSize: '0.95rem', marginBottom: '0.8rem' }}>Saved Words ({vocabulary.length})</h3>
      {vocabulary.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: '#999', textAlign: 'center', margin: '2rem 0' }}>No words saved.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {vocabulary.slice(0, 20).map((item) => (
            <div key={item.word} style={{ 
              fontSize: '0.85rem', padding: '8px', backgroundColor: '#f9f9f9', 
              borderRadius: '4px', display: 'flex', justifyContent: 'space-between', border: '1px solid #eee'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{item.word}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>{formatIPA(item.ipa)} {item.meaning}</div>
              </div>
              <button onClick={() => removeWord(item.word)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ width: '300px', padding: '12px', fontFamily: 'sans-serif', maxHeight: '500px', overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0, color: '#4b8bf5' }}>In Reading</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
            <Keyboard size={18} />
          </button>
          <button onClick={toggleTabEnabled} style={{ backgroundColor: tabEnabled ? '#4caf50' : '#e0e0e0', color: tabEnabled ? 'white' : '#888', border: 'none', padding: '4px 8px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
            {tabEnabled ? 'ACTIVE' : 'OFF'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '1rem' }}>
        {[
          { id: 'general', icon: Settings },
          { id: 'llm', icon: Cpu },
          { id: 'vocab', icon: BookOpen }
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{ flex: 1, padding: '8px', background: 'none', border: 'none', borderBottom: activeTab === t.id ? '2px solid #4b8bf5' : 'none', color: activeTab === t.id ? '#4b8bf5' : '#888', cursor: 'pointer' }}>
            <t.icon size={16} style={{ margin: '0 auto' }} />
          </button>
        ))}
      </div>

      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'llm' && <LLMTab />}
      {activeTab === 'vocab' && <VocabTab />}
    </div>
  )
}
