import React, { useEffect, useState } from 'react'
import { useSettings } from '../../common/hooks/useSettings'
import { useVocabulary } from '../../common/hooks/useVocabulary'
import { lookupWordInDB } from '../../common/storage/indexed-db'
import { WordExplanation } from '../../common/types'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { VoiceIcon } from './VoiceIcon'
import { getPreferredIPA } from '../../common/utils/format'
import confusionMap from '../../../public/dictionaries/confusion-map.json'

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
      const lowerText = text.toLowerCase()
      
      // Dictionary A (Confusion Map) is now standardized
      const confusionEntry = (confusionMap as Record<string, any>)[lowerText]
      const localExp = confusionEntry || await lookupWordInDB(text)
      
      const isSaved = vocabulary.some(v => v.word.toLowerCase() === lowerText)

      if (isSaved || localExp) {
        const baseExp = isSaved ? vocabulary.find(v => v.word.toLowerCase() === lowerText)! : localExp!
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
    padding: '14px', zIndex: 2147483647, fontFamily: 'sans-serif', border: '1px solid #ddd',
    minWidth: '240px', maxWidth: '340px', color: '#333', userSelect: 'none',
    boxSizing: 'border-box', pointerEvents: 'auto'
  }

  if (!selection) return null

  const currentPron = settings?.pronunciation || 'US'
  const exp = selection.explanation

  let showSingleHeaderIPA = false
  let headerIPA = ''
  if (exp?.entries) {
    const ipas = exp.entries.map(e => currentPron === 'UK' ? e.phon_br : e.phon_n_am)
    if (new Set(ipas).size === 1) {
      showSingleHeaderIPA = true
      headerIPA = ipas[0]
    }
  } else if (exp?.ipa) {
    showSingleHeaderIPA = true
    headerIPA = exp.ipa
  }

  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <BookOpen size={18} color="#4b8bf5" />
        <span style={{ fontWeight: 'bold', fontSize: '1.1rem', flex: 1 }}>{selection.text}</span>
        {exp?.source && (
          <span style={{ fontSize: '10px', backgroundColor: '#f5f5f5', color: '#888', padding: '2px 6px', borderRadius: '4px' }}>
            {exp.source}
          </span>
        )}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '10px', color: '#999' }}>Translating...</div> : exp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          
          {showSingleHeaderIPA && headerIPA && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <span style={{ color: '#1a73e8', fontWeight: 'bold', fontSize: '12px' }}>{currentPron}</span>
              <span style={{ color: '#5f6368', fontSize: '13px' }}>{headerIPA}</span>
              <VoiceIcon 
                word={selection.text} 
                pronunciation={currentPron} 
                size={16} 
              />
            </div>
          )}

          <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#202124' }}>
            {exp.entries ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {exp.entries.map((entry, idx) => (
                  <div key={idx} style={{ 
                    borderTop: idx > 0 ? '1px solid #f0f0f0' : 'none', 
                    paddingTop: idx > 0 ? '8px' : '0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontStyle: 'italic', color: '#1a73e8', fontSize: '12px', fontWeight: 'bold' }}>
                          {entry.type}
                        </span>
                        {!showSingleHeaderIPA && (
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {currentPron === 'UK' ? entry.phon_br : entry.phon_n_am}
                          </span>
                        )}
                      </div>
                      {!showSingleHeaderIPA && (
                        <VoiceIcon 
                          word={selection.text} 
                          pronunciation={currentPron}
                          size={14} 
                          color="#888" 
                        />
                      )}
                    </div>
                    <div style={{ fontWeight: 500 }}>{entry.translation}</div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {!showSingleHeaderIPA && exp.cefr && (
                   <span style={{ fontSize: '10px', backgroundColor: '#e6fffa', color: '#319795', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold', marginBottom: '6px', display: 'inline-block' }}>
                    {String(exp.cefr).toUpperCase()}
                  </span>
                )}
                {exp.definitions?.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {exp.definitions.map((def, idx) => (
                      <div key={idx}>
                        <span style={{ fontStyle: 'italic', color: '#888', marginRight: '8px', fontSize: '12px' }}>{def.type}</span>
                        <span>{def.translation}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>{exp.meaning}</div>
                )}
              </>
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
              gap: '6px', fontWeight: '500', fontSize: '13px'
            }}
          >
            {selection.isSaved ? <><Trash2 size={14} /> Remove</> : <><Plus size={14} /> Add to Vocabulary</>}
          </button>
        </div>
      )}
    </div>
  )
}
