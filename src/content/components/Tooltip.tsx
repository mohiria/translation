import React, { useEffect, useState } from 'react'
import { WordExplanation } from '../../common/types'
import { Volume2 } from 'lucide-react'

interface TooltipProps {
  explanation: WordExplanation
  onClose: () => void
  position: { top: number; left: number }
}

export const Tooltip: React.FC<TooltipProps> = ({ explanation, onClose, position }) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Small animation effect
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const playAudio = () => {
    const utterance = new SpeechSynthesisUtterance(explanation.word)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
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
          {explanation.ipa}
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