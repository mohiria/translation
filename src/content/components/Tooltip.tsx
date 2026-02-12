import React, { useEffect, useState } from 'react'
import { WordExplanation, UserSettings } from '../../common/types'
import { Volume2 } from 'lucide-react'
import { getSettings } from '../../common/storage/settings'
import { speak } from '../../common/utils/speech'
import { formatIPA } from '../../common/utils/format'

interface TooltipProps {
  explanation: WordExplanation
  onClose: () => void
  position: { top: number; left: number }
}

export const Tooltip: React.FC<TooltipProps> = ({ explanation, onClose, position }) => {
  const [visible, setVisible] = useState(false)
  const [settings, setSettings] = useState<UserSettings | null>(null)

  useEffect(() => {
    // Small animation effect
    requestAnimationFrame(() => setVisible(true))
    getSettings().then(setSettings)
  }, [])

  const playAudio = () => {
    speak(explanation.word, settings?.pronunciation === 'UK' ? 'en-GB' : 'en-US')
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    top: position.top,
    left: position.left,
    zIndex: 2147483647, // Max z-index
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    padding: '12px',
    minWidth: '200px',
    fontFamily: 'sans-serif',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(5px)',
    transition: 'opacity 0.2s, transform 0.2s',
    border: '1px solid #eee',
    color: '#333'
  }

  return (
    <div style={style} onMouseLeave={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{explanation.word}</span>
        <button 
          onClick={playAudio}
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            padding: '4px',
            color: '#666',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Play pronunciation"
        >
          <Volume2 size={16} />
        </button>
      </div>
      
      {explanation.ipa && (
        <div style={{ color: '#666', fontSize: '13px', marginBottom: '8px' }}>
          <span style={{ fontWeight: 'bold', marginRight: '4px', fontSize: '11px', color: '#1a73e8' }}>
            {settings?.pronunciation === 'UK' ? 'UK' : 'US'}
          </span>
          {formatIPA(explanation.ipa)}
          {explanation.type && (!explanation.definitions || explanation.definitions.length <= 1) && (
            <span style={{ marginLeft: '8px', fontStyle: 'italic', color: '#888' }}>
              {explanation.type}
            </span>
          )}
          {explanation.cefr && (
            <span style={{ 
              marginLeft: '8px', 
              fontSize: '10px', 
              backgroundColor: '#e8f0fe', 
              color: '#1a73e8', 
              padding: '1px 4px', 
              borderRadius: '4px',
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}>
              {explanation.cefr}
            </span>
          )}
        </div>
      )}
      
      <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
        {!explanation.definitions || explanation.definitions.length === 0 ? (
          <div style={{ fontWeight: 500 }}>{explanation.meaning}</div>
        ) : explanation.definitions.length === 1 ? (
          <>
            <div style={{ fontWeight: 500 }}>{explanation.definitions[0].translation}</div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#666', lineHeight: '1.3' }}>
              {explanation.definitions[0].definition}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {explanation.definitions.map((def, idx) => (
              <div key={idx} style={{ borderBottom: idx < (explanation.definitions?.length || 0) - 1 ? '1px solid #f0f0f0' : 'none', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontStyle: 'italic', color: '#888', fontSize: '11px' }}>{def.type}</span>
                  <span style={{ fontSize: '10px', backgroundColor: '#f0f0f0', padding: '0 4px', borderRadius: '3px' }}>{def.cefr}</span>
                </div>
                <div style={{ fontWeight: 500 }}>{def.translation}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{def.definition}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {explanation.context && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#888', fontStyle: 'italic', borderLeft: '2px solid #eee', paddingLeft: '8px' }}>
          "{explanation.context}"
        </div>
      )}
    </div>
  )
}
