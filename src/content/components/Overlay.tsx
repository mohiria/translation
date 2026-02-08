import React, { useState, useEffect } from 'react'
import { Tooltip } from './Tooltip'
import { WordExplanation } from '../../common/types'

// Event bus to trigger tooltip from non-React scanner
export const tooltipEventBus = new EventTarget()

export const Overlay = () => {
  const [data, setData] = useState<{ explanation: WordExplanation, position: { top: number, left: number } } | null>(null)

  useEffect(() => {
    const handleShow = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setData(detail)
    }
    const handleHide = () => setData(null)

    tooltipEventBus.addEventListener('show-tooltip', handleShow)
    tooltipEventBus.addEventListener('hide-tooltip', handleHide)

    return () => {
      tooltipEventBus.removeEventListener('show-tooltip', handleShow)
      tooltipEventBus.removeEventListener('hide-tooltip', handleHide)
    }
  }, [])

  if (!data) return null

  return (
    <Tooltip 
      explanation={data.explanation} 
      onClose={() => setData(null)} 
      position={data.position} 
    />
  )
}