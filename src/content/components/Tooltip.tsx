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

  const currentPron = settings?.pronunciation || 'US'
  const mainIpa = getPreferredIPA(explanation, currentPron)

  const style: React.CSSProperties = {
    position: 'fixed', top: position.top, left: position.left,
    zIndex: 2147483647, backgroundColor: 'white', borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '12px', minWidth: '240px',
    opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(5px)',
    transition: 'opacity 0.2s, transform 0.2s', border: '1px solid #eee', color: '#333',
    fontFamily: 'sans-serif'
  }

  return (
    <div style={style} onMouseLeave={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{explanation.word}</span>
        {!explanation.entries && (
          <VoiceIcon 
            word={explanation.word} 
            pronunciation={currentPron} 
            size={18} 
            color="#1a73e8" 
          />
        )}
      </div>
      
      {/* Standard Display (Dictionary B or single entry) */}
      {!explanation.entries && mainIpa && (
        <div style={{ color: '#666', fontSize: '13px', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', marginRight: '6px', fontSize: '11px', color: '#1a73e8', border: '1px solid #1a73e8', padding: '0 3px', borderRadius: '3px' }}>
            {currentPron}
          </span>
          {mainIpa}
          {explanation.cefr && (
            <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#e8f0fe', color: '#1a73e8', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
              {(Array.isArray(explanation.cefr) ? explanation.cefr.join('/') : explanation.cefr).toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Advanced Display (Dictionary A with multiple entries) */}
      <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
        {explanation.entries ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {explanation.entries.map((entry, idx) => (
              <div key={idx} style={{ 
                borderTop: idx > 0 ? '1px solid #f0f0f0' : 'none', 
                paddingTop: idx > 0 ? '10px' : '0',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontStyle: 'italic', color: '#1a73e8', fontSize: '12px', fontWeight: 'bold' }}>
                      {entry.type}
                    </span>
                    <span style={{ fontSize: '11px', color: '#666' }}>
                      {currentPron === 'UK' ? entry.phon_br : entry.phon_n_am}
                    </span>
                    <span style={{ fontSize: '9px', backgroundColor: '#f1f3f4', color: '#5f6368', padding: '0 3px', borderRadius: '2px' }}>
                      {entry.cefr.toUpperCase()}
                    </span>
                  </div>
                  <VoiceIcon 
                    word={explanation.word} 
                    pronunciation={currentPron}
                    size={14} 
                    color="#888" 
                  />
                </div>
                <div style={{ fontWeight: 500, color: '#202124' }}>{entry.translation}</div>
                {entry.definition && (
                  <div style={{ fontSize: '12px', color: '#5f6368', lineHeight: '1.4' }}>{entry.definition}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Fallback to simple meaning or definitions array */
          !explanation.definitions?.length ? (
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
          )
        )}
      </div>
      
      {explanation.context && (
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#888', fontStyle: 'italic', borderLeft: '2px solid #1a73e8', paddingLeft: '8px', backgroundColor: '#f8f9fa', padding: '4px 8px' }}>
          "{explanation.context}"
        </div>
      )}
    </div>
  )
}
