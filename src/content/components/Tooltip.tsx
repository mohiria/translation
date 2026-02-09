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
        </div>
      )}
      
      <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
        {explanation.meaning}
      </div>
      
      {explanation.context && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
          "{explanation.context}"
        </div>
      )}
    </div>
  )
}