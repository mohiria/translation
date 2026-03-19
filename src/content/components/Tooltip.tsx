import React, { useEffect, useState } from 'react'
import { WordExplanation } from '../../common/types'
import { useSettings } from '../../common/hooks/useSettings'
import { getPreferredIPA } from '../../common/utils/format'
import { VoiceIcon } from './VoiceIcon'

interface TooltipProps {
  explanation: WordExplanation
  onClose: () => void
  position: { top: number; left: number }
}

export const Tooltip: React.FC<TooltipProps> = ({ explanation, onClose, position }) => {
  const [visible, setVisible] = useState(false)
  const { settings } = useSettings()

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const ipa = getPreferredIPA(explanation, settings?.pronunciation || 'US')

  const style: React.CSSProperties = {
    position: 'fixed', top: position.top, left: position.left,
    zIndex: 2147483647, backgroundColor: 'white', borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '12px', minWidth: '200px',
    opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(5px)',
    transition: 'opacity 0.2s, transform 0.2s', border: '1px solid #eee', color: '#333',
    fontFamily: 'sans-serif'
  }

  return (
    <div style={style} onMouseLeave={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{explanation.word}</span>
        <VoiceIcon 
          word={explanation.word} 
          pronunciation={settings?.pronunciation || 'US'} 
          size={16} 
          color="#666" 
        />
      </div>
      
      {ipa && (
        <div style={{ color: '#666', fontSize: '13px', marginBottom: '8px' }}>
          <span style={{ fontWeight: 'bold', marginRight: '4px', fontSize: '11px', color: '#1a73e8' }}>
            {settings?.pronunciation === 'UK' ? 'UK' : 'US'}
          </span>
          {ipa}
          {explanation.cefr && (
            <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#e8f0fe', color: '#1a73e8', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
              {explanation.cefr.toUpperCase()}
            </span>
          )}
        </div>
      )}
      
      <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
        {!explanation.definitions?.length ? (
          <div style={{ fontWeight: 500 }}>{explanation.meaning}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {explanation.definitions.map((def, idx) => (
              <div key={idx} style={{ borderTop: idx > 0 ? '1px solid #f0f0f0' : 'none', paddingTop: idx > 0 ? '8px' : '0' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontStyle: 'italic', color: '#888', fontSize: '11px' }}>{def.type}</span>
                </div>
                <div style={{ fontWeight: 500 }}>{def.translation}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{def.definition}</div>
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
