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
    backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    padding: '12px', zIndex: 2147483647, fontFamily: 'sans-serif', border: '1px solid #ddd',
    minWidth: '220px', color: '#333', userSelect: 'none'
  }

  if (!selection) return null

  return (
    <div style={style} onMouseDown={e => e.stopPropagation()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <BookOpen size={16} color="#4b8bf5" />
        <span style={{ fontWeight: 'bold' }}>{selection.text}</span>
        <VoiceIcon 
          word={selection.text} 
          pronunciation={settings?.pronunciation || 'US'} 
          size={16} 
        />
        {selection.explanation?.source && <span style={{ fontSize: '10px', backgroundColor: '#eee', padding: '2px 4px', borderRadius: '4px', marginLeft: 'auto' }}>{selection.explanation.source}</span>}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '10px', color: '#999' }}>Translating...</div> : selection.explanation && (
        <>
          <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}>
            {selection.explanation.ipa && <span style={{ color: '#1a73e8', marginRight: '8px', backgroundColor: '#f0f4ff', padding: '2px 6px', borderRadius: '4px' }}>{selection.explanation.ipa}</span>}
            {selection.explanation.cefr && <span style={{ fontSize: '0.75rem', backgroundColor: '#e8f0fe', color: '#1a73e8', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>{selection.explanation.cefr.toUpperCase()}</span>}
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            {selection.explanation.definitions?.length ? (
              selection.explanation.definitions.map((def, idx) => (
                <div key={idx}><span style={{ fontStyle: 'italic', color: '#888', marginRight: '8px' }}>{def.type}</span>{def.translation}</div>
              ))
            ) : <div>{selection.explanation.meaning}</div>}
          </div>
          <button onClick={onToggleVocab} style={{ width: '100%', padding: '6px', backgroundColor: selection.isSaved ? '#ff4d4f' : '#4b8bf5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            {selection.isSaved ? <><Trash2 size={14} /> Remove</> : <><Plus size={14} /> Add to Vocabulary</>}
          </button>
        </>
      )}
    </div>
  )
}
