import React, { useEffect, useState } from 'react'
import { addToVocabulary, getVocabulary, removeFromVocabulary } from '../../common/storage/vocabulary'
import { getSettings } from '../../common/storage/settings'
import { lookupWord } from '../../common/nlp/dictionary'
import { WordExplanation } from '../../common/types'
import { BookOpen, Plus, Trash2, Volume2 } from 'lucide-react'
import { speak } from '../../common/utils/speech'

export const SelectionPopup = () => {
  const [loading, setLoading] = useState(false)
  const [selection, setSelection] = useState<{
    text: string
    rect: DOMRect
    explanation: WordExplanation | null
    isSaved: boolean
  } | null>(null)

  useEffect(() => {
    const handleSelection = async () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) {
        setSelection(null)
        return
      }

      const text = sel.toString().trim()
      if (!text || text.length > 50 || !/[a-zA-Z]/.test(text)) {
        setSelection(null)
        return
      }

      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      
      let contextSentence = text
      if (sel.anchorNode && sel.anchorNode.textContent) {
        const fullText = sel.anchorNode.textContent
        const start = Math.max(0, fullText.lastIndexOf('.', sel.anchorOffset) + 1)
        const end = fullText.indexOf('.', sel.focusOffset)
        contextSentence = fullText.substring(start, end === -1 ? undefined : end + 1).trim()
      }

      const localExp = lookupWord(text)
      const vocab = await getVocabulary()
      const isSaved = vocab.some(v => v.word.toLowerCase() === text.toLowerCase())

      if (isSaved) {
        const savedItem = vocab.find(v => v.word.toLowerCase() === text.toLowerCase())
        setSelection({ text, rect, explanation: savedItem!, isSaved: true })
        return
      }

      if (localExp) {
        setSelection({ text, rect, explanation: localExp, isSaved: false })
        return
      }

      setSelection({ text, rect, explanation: null, isSaved: false })
      setLoading(true)
      
      const settings = await getSettings()
      
      chrome.runtime.sendMessage({ 
        type: 'TRANSLATE_WORD', 
        text, 
        context: contextSentence,
        settings 
      }, (response) => {
        setLoading(false)
        if (response && response.success) {
          setSelection(prev => prev ? {
            ...prev,
            explanation: response.data
          } : null)
        } else {
           setSelection(prev => prev ? {
             ...prev,
             explanation: { word: text, meaning: 'Error: ' + (response?.error || 'Unknown'), ipa: '', source: 'Error' }
           } : null)
        }
      })
    }

    const onMouseUp = () => {
      setTimeout(handleSelection, 10)
    }

    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [])

  if (!selection) return null

  const handleToggleVocab = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (selection.isSaved) {
      await removeFromVocabulary(selection.text)
    } else {
      await addToVocabulary({
        ...selection.explanation!,
        timestamp: Date.now(),
        sourceUrl: window.location.href
      })
    }
    const vocab = await getVocabulary()
    const isSaved = vocab.some(v => v.word.toLowerCase() === selection.text.toLowerCase())
    setSelection(prev => prev ? { ...prev, isSaved } : null)
    setTimeout(() => setSelection(null), 300)
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    top: selection.rect.bottom + 10, 
    left: selection.rect.left + selection.rect.width / 2,
    transform: 'translateX(-50%)',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    padding: '12px',
    zIndex: 2147483647,
    fontFamily: 'sans-serif',
    border: '1px solid #ddd',
    minWidth: '220px',
    pointerEvents: 'auto',
    color: '#333',
    userSelect: 'none'
  }

  return (
    <div style={style} onMouseDown={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <BookOpen size={16} color="#4b8bf5" />
        <span style={{ fontWeight: 'bold' }}>{selection.text}</span>
        <button 
          onClick={(e) => { e.stopPropagation(); speak(selection.text) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666', padding: '2px' }}
          title="Listen"
        >
          <Volume2 size={14} />
        </button>
        {selection.explanation?.source && (
          <span style={{ fontSize: '10px', backgroundColor: '#eee', padding: '2px 4px', borderRadius: '4px', color: '#999', marginLeft: 'auto' }}>
            {selection.explanation.source}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: '0.85rem', color: '#999', textAlign: 'center', padding: '10px' }}>
          Translating...
        </div>
      ) : selection.explanation ? (
        <>
          <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}>
            {selection.explanation.ipa && (
              <span style={{ 
                color: '#1a73e8', 
                marginRight: '8px', 
                backgroundColor: '#f0f4ff', 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontSize: '0.8rem'
              }}>
                {selection.explanation.ipa}
              </span>
            )}
            <span style={{ fontWeight: 500 }}>{selection.explanation.meaning}</span>
          </div>
          <button
            onClick={handleToggleVocab}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              width: '100%',
              padding: '6px',
              backgroundColor: selection.isSaved ? '#ff4d4f' : '#4b8bf5',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              marginTop: '8px',
              transition: 'background-color 0.2s'
            }}
          >
            {selection.isSaved ? (
              <>
                <Trash2 size={14} /> Remove from Vocabulary
              </>
            ) : (
              <>
                <Plus size={14} /> Add to Vocabulary
              </>
            )}
          </button>
        </>
      ) : (
        <div style={{ fontSize: '0.85rem', color: '#888', textAlign: 'center' }}>
          Translation failed.
        </div>
      )}
    </div>
  )
}
