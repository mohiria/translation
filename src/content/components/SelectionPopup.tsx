import React, { useEffect, useState } from 'react'
import { addToVocabulary, getVocabulary, removeFromVocabulary } from '../../common/storage/vocabulary'
import { getSettings } from '../../common/storage/settings'
import { lookupWordInDB } from '../../common/storage/indexed-db'
import { WordExplanation, UserSettings } from '../../common/types'
import { BookOpen, Plus, Trash2, Volume2 } from 'lucide-react'
import { speak } from '../../common/utils/speech'
import { formatIPA } from '../../common/utils/format'

export const SelectionPopup = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [selection, setSelection] = useState<{
    text: string
    rect: DOMRect
    explanation: WordExplanation | null
    isSaved: boolean
  } | null>(null)

  useEffect(() => {
    getSettings().then(setSettings)

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === 'sync' && changes.settings) {
        setSettings(changes.settings.newValue)
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

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

      const settings = await getSettings()
      const localExp = await lookupWordInDB(text)
      const vocab = await getVocabulary()
      const isSaved = vocab.some(v => v.word.toLowerCase() === text.toLowerCase())

      if (isSaved) {
        const savedItem = vocab.find(v => v.word.toLowerCase() === text.toLowerCase())
        // Update the saved item's IPA based on current preference if it has both
        const processedSavedItem = { ...savedItem! }
        
        // Try to get regional IPA from the DB if the saved item doesn't have it
        const dbEntry = localExp
        const ipa_uk = processedSavedItem.ipa_uk || dbEntry?.ipa_uk
        const ipa_us = processedSavedItem.ipa_us || dbEntry?.ipa_us

        if (settings.pronunciation === 'UK' && ipa_uk) {
          processedSavedItem.ipa = formatIPA(ipa_uk)
        } else if (settings.pronunciation === 'US' && ipa_us) {
          processedSavedItem.ipa = formatIPA(ipa_us)
        } else {
          processedSavedItem.ipa = formatIPA(processedSavedItem.ipa)
        }
        
        setSelection({ text, rect, explanation: processedSavedItem, isSaved: true })
        return
      }

      if (localExp) {
        // Apply regional IPA to the local DB result
        const finalExp = { ...localExp }
        if (settings.pronunciation === 'UK' && finalExp.ipa_uk) {
          finalExp.ipa = formatIPA(finalExp.ipa_uk)
        } else if (settings.pronunciation === 'US' && finalExp.ipa_us) {
          finalExp.ipa = formatIPA(finalExp.ipa_us)
        } else {
          finalExp.ipa = formatIPA(finalExp.ipa)
        }

        setSelection({ text, rect, explanation: finalExp, isSaved: false })
        return
      }

      setSelection({ text, rect, explanation: null, isSaved: false })
      setLoading(true)
      
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

    const onMouseUp = (e: MouseEvent) => {
      // Don't re-trigger translation if clicking inside the popup
      // When clicking inside Shadow DOM, the event target is retargeted to the host element
      const host = document.getElementById('ll-extension-host')
      if (host && (e.target === host || e.composedPath().includes(host))) {
        return
      }
      
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

  const calculatePosition = () => {
    if (!selection) return {}
    
    const { rect } = selection
    const popupHeight = 150 // Estimated max height
    const popupWidth = 220
    
    const spaceBelow = window.innerHeight - rect.bottom
    const showAbove = spaceBelow < popupHeight && rect.top > popupHeight

    let top = showAbove ? rect.top - popupHeight - 10 : rect.bottom + 10
    let left = rect.left + rect.width / 2

    // Boundary checks for horizontal
    const halfWidth = popupWidth / 2
    if (left - halfWidth < 10) left = halfWidth + 10
    if (left + halfWidth > window.innerWidth - 10) left = window.innerWidth - halfWidth - 10

    return {
      top: Math.max(10, top),
      left,
      transform: 'translateX(-50%)',
      position: 'fixed' as const
    }
  }

  const style: React.CSSProperties = {
    ...calculatePosition(),
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
    <div style={style} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <BookOpen size={16} color="#4b8bf5" />
        <span style={{ fontWeight: 'bold' }}>{selection.text}</span>
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            speak(selection.text, settings?.pronunciation === 'UK' ? 'en-GB' : 'en-US') 
          }}
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
                {settings?.pronunciation === 'UK' ? 'UK' : 'US'} {formatIPA(selection.explanation.ipa)}
              </span>
            )}
            {selection.explanation.cefr && (
              <span style={{ 
                marginRight: '8px', 
                fontSize: '0.75rem', 
                backgroundColor: '#e8f0fe', 
                color: '#1a73e8', 
                padding: '1px 4px', 
                borderRadius: '4px',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                {selection.explanation.cefr}
              </span>
            )}
          </div>

          {!selection.explanation.definitions || selection.explanation.definitions.length <= 1 ? (
            <div style={{ fontSize: '0.9rem' }}>
                          {selection.explanation.type && (!selection.explanation.definitions || selection.explanation.definitions.length <= 1) && (
                            <span style={{ fontStyle: 'italic', color: '#888', marginRight: '8px', fontSize: '0.8rem' }}>
                              {selection.explanation.type}
                            </span>
                          )}              <span style={{ fontWeight: 500 }}>{selection.explanation.meaning}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem' }}>
              {selection.explanation.definitions.map((def, idx) => (
                <div key={idx}>
                   <span style={{ fontStyle: 'italic', color: '#888', marginRight: '8px', fontSize: '0.8rem' }}>{def.type}</span>
                   <span style={{ fontWeight: 500 }}>{def.translation}</span>
                </div>
              ))}
            </div>
          )}

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
