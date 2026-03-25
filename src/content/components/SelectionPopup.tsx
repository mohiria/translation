import React, { useEffect, useState } from 'react'
import { useSettings } from '../../common/hooks/useSettings'
import { useVocabulary } from '../../common/hooks/useVocabulary'
import { lookupWordInDB } from '../../common/storage/indexed-db'
import { WordExplanation } from '../../common/types'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { VoiceIcon } from './VoiceIcon'
import { getPreferredIPA } from '../../common/utils/format'

export const SelectionPopup = () => {
  const { settings } = useSettings()
  const { vocabulary, addWord, removeWord } = useVocabulary()
  const [loading, setLoading] = useState(false)
  const [tabEnabled, setTabEnabled] = useState(false)
  const [selection, setSelection] = useState<{
    text: string
    rect: DOMRect
    explanation: WordExplanation | null
    isSaved: boolean
  } | null>(null)

  useEffect(() => {
    const checkState = () => {
      chrome.runtime.sendMessage({ type: 'GET_TAB_STATE' }, (res) => setTabEnabled(!!res?.enabled))
    }
    checkState()

    const handleMessage = (req: any) => {
      if (req.type === 'TOGGLE_TAB_ENABLED') {
        setTabEnabled(req.enabled)
        if (!req.enabled) setSelection(null)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    const interval = setInterval(checkState, 2000)
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const handleSelection = async () => {
      if (!tabEnabled) return
      
      const sel = window.getSelection()
      const text = sel?.toString().trim()
      if (!sel || sel.isCollapsed || !text || text.length > 50 || !/[a-zA-Z]/.test(text)) {
        setSelection(null)
        return
      }

      const rect = sel.getRangeAt(0).getBoundingClientRect()
      const localExp = await lookupWordInDB(text)
      const isSaved = vocabulary.some(v => v.word.toLowerCase() === text.toLowerCase())

      if (isSaved || localExp) {
        const baseExp = isSaved ? vocabulary.find(v => v.word.toLowerCase() === text.toLowerCase())! : localExp!
        const explanation = { ...baseExp, ipa: getPreferredIPA(baseExp, settings?.pronunciation || 'US') }
        setSelection({ text, rect, explanation, isSaved })
        return
      }

      setSelection({ text, rect, explanation: null, isSaved: false })
      setLoading(true)
      
      chrome.runtime.sendMessage({ 
        type: 'TRANSLATE_WORD', text, context: text, settings 
      }, (res) => {
        setLoading(false)
        if (res?.success) {
          setSelection(prev => prev ? { ...prev, explanation: res.data } : null)
        }
      })
    }

    const onMouseUp = (e: MouseEvent) => {
      if (document.getElementById('ll-extension-host')?.contains(e.target as Node)) return
      setTimeout(handleSelection, 10)
    }

    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [tabEnabled, vocabulary, settings])

  if (!selection && !loading) return null

  const onToggleVocab = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selection?.explanation) return
    if (selection.isSaved) {
      await removeWord(selection.text)
    } else {
      await addWord({ ...selection.explanation, timestamp: Date.now(), sourceUrl: window.location.href })
    }
    setTimeout(() => setSelection(null), 300)
  }

  const calculatePosition = () => {
    if (!selection) return {}
    const { rect } = selection
    let top = rect.bottom + 10
    if (window.innerHeight - rect.bottom < 150 && rect.top > 150) top = rect.top - 160
    return {
      top: Math.max(10, top),
      left: Math.max(110, Math.min(window.innerWidth - 110, rect.left + rect.width / 2)),
      transform: 'translateX(-50%)',
      position: 'fixed' as const
    }
  }

  const style: React.CSSProperties = {
    ...calculatePosition(),
    backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    padding: '12px', zIndex: 2147483647, fontFamily: 'sans-serif', border: '1px solid #ddd',
    minWidth: '220px', maxWidth: '320px', color: '#333', userSelect: 'none',
    boxSizing: 'border-box', pointerEvents: 'auto'
  }

  if (!selection) return null

  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <BookOpen size={16} color="#4b8bf5" />
          <span style={{ fontWeight: 'bold', fontSize: '1.05rem', wordBreak: 'break-word' }}>{selection.text}</span>
          <VoiceIcon 
            word={selection.text} 
            pronunciation={settings?.pronunciation || 'US'} 
            size={16} 
          />
        </div>
        {selection.explanation?.source && (
          <span style={{ fontSize: '10px', backgroundColor: '#f5f5f5', color: '#888', padding: '2px 6px', borderRadius: '4px', border: '1px solid #eee' }}>
            {selection.explanation.source}
          </span>
        )}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '10px', color: '#999' }}>Translating...</div> : selection.explanation && (
        <div style={{ wordWrap: 'break-word', wordBreak: 'normal', overflowWrap: 'anywhere' }}>
          <div style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {selection.explanation.ipa && (
              <span style={{ color: '#1a73e8', backgroundColor: '#f0f4ff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                {(settings?.pronunciation || 'US') + ' ' + selection.explanation.ipa}
              </span>
            )}
            {selection.explanation.cefr && (
              <span style={{ fontSize: '0.7rem', backgroundColor: '#e6fffa', color: '#319795', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #b2f5ea' }}>
                {selection.explanation.cefr.toUpperCase()}
              </span>
            )}
          </div>
          
          <div style={{ fontSize: '0.95rem', lineHeight: '1.5', color: '#444' }}>
            {selection.explanation.definitions?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selection.explanation.definitions.map((def, idx) => (
                  <div key={idx} style={{ borderLeft: '2px solid #eee', paddingLeft: '8px' }}>
                    <span style={{ fontStyle: 'italic', color: '#888', marginRight: '6px', fontSize: '0.8rem' }}>{def.type}</span>
                    <span style={{ color: '#333' }}>{def.translation}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ borderLeft: '2px solid #eee', paddingLeft: '8px' }}>{selection.explanation.meaning}</div>
            )}
          </div>
          
          <button 
            onClick={onToggleVocab} 
            style={{ 
              width: '100%', padding: '8px', 
              backgroundColor: selection.isSaved ? '#fff1f0' : '#4b8bf5', 
              color: selection.isSaved ? '#ff4d4f' : 'white', 
              border: selection.isSaved ? '1px solid #ffccc7' : 'none', 
              borderRadius: '6px', cursor: 'pointer', marginTop: '12px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              gap: '6px', fontWeight: '500', transition: 'all 0.2s'
            }}
          >
            {selection.isSaved ? <><Trash2 size={14} /> Remove</> : <><Plus size={14} /> Add to Vocabulary</>}
          </button>
        </div>
      )}
    </div>
  )
}
