import React, { useState } from 'react'
import { speak } from '../../common/utils/speech'

interface VoiceIconProps {
  word: string
  pronunciation: 'UK' | 'US'
  size?: number
  color?: string
}

export const VoiceIcon: React.FC<VoiceIconProps> = ({ 
  word, 
  pronunciation, 
  size = 16, 
  color = '#a1a1a1' // Muted gray by default like Youdao
}) => {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPlaying) return

    setIsPlaying(true)
    speak(word, pronunciation === 'UK' ? 'en-GB' : 'en-US')
    
    // Animate for 1.2s
    setTimeout(() => setIsPlaying(false), 1200)
  }

  const activeColor = '#4b8bf5' // Blue when playing or hover

  return (
    <span 
      className={`ll-voice-icon ${isPlaying ? 'playing' : ''}`}
      onClick={handlePlay}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: '2px',
        borderRadius: '4px',
        userSelect: 'none',
        transition: 'background-color 0.2s'
      }}
      title={`Listen (${pronunciation})`}
    >
      <svg viewBox="0 0 1024 1024" width={size} height={size}>
        {/* Sound Source - A small vertical line instead of a horn */}
        <rect x="256" y="384" width="64" height="256" rx="32" fill={isPlaying ? activeColor : color} />
        
        {/* Wave 1 (Inner) */}
        <path 
          className="wave wave-1" 
          d="M448 320c48 0 96 85.3 96 192s-48 192-96 192" 
          stroke={isPlaying ? activeColor : color} 
          strokeWidth="80" 
          fill="none" 
          strokeLinecap="round" 
        />
        
        {/* Wave 2 (Outer) */}
        <path 
          className="wave wave-2" 
          d="M608 192c80 0 160 143.3 160 320s-80 320-160 320" 
          stroke={isPlaying ? activeColor : color} 
          strokeWidth="80" 
          fill="none" 
          strokeLinecap="round" 
        />
      </svg>
      <style>{`
        .ll-voice-icon:hover rect,
        .ll-voice-icon:hover .wave {
          stroke: ${activeColor};
          fill: ${activeColor};
        }
        @keyframes voiceWaveFade {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        .ll-voice-icon.playing .wave-1 { animation: voiceWaveFade 0.6s infinite; }
        .ll-voice-icon.playing .wave-2 { animation: voiceWaveFade 0.6s infinite 0.2s; }
      `}</style>
    </span>
  )
}
