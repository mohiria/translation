/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SelectionPopup } from '../../../content/components/SelectionPopup'

// Mock global chrome
const chromeMock = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() }
  },
  storage: {
    sync: { get: vi.fn(), set: vi.fn() },
    local: { get: vi.fn(), set: vi.fn() },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() }
  }
}
vi.stubGlobal('chrome', chromeMock)

// Mock confusion-map.json with NEW standardized structure
vi.mock('../../../../public/dictionaries/confusion-map.json', () => ({
  default: {
    'tear': {
      word: 'tear',
      cefr: ['a2', 'b1'], // Standardized field
      entries: [
        { type: 'noun', cefr: 'a2', phon_br: '/tɪə(r)/', phon_n_am: '/tɪr/', translation: '眼泪' },
        { type: 'verb', cefr: 'b1', phon_br: '/teə(r)/', phon_n_am: '/ter/', translation: '撕裂' }
      ],
      source: 'core-confusion'
    }
  }
}))

// Mock hooks
const mockSettings = {
  pronunciation: 'US',
  proficiency: 'CEFR_A1',
  showIPA: true
}

vi.mock('../../../common/hooks/useSettings', () => ({
  useSettings: () => ({ settings: mockSettings, loading: false })
}))

vi.mock('../../../common/hooks/useVocabulary', () => ({
  useVocabulary: () => ({ vocabulary: [], addWord: vi.fn(), removeWord: vi.fn() })
}))

vi.mock('../../../common/storage/indexed-db', () => ({
  lookupWordInDB: vi.fn().mockResolvedValue(null),
  batchLookupWords: vi.fn().mockResolvedValue({})
}))

describe('SelectionPopup Standardization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    chromeMock.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.type === 'GET_TAB_STATE') callback({ enabled: true })
    })
    
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => 'tear',
      isCollapsed: false,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 100, height: 100 })
      })
    })
  })

  it('should render full POS names from dictionary without local mapping', async () => {
    await act(async () => {
      render(<SelectionPopup />)
    })

    await act(async () => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })

    // Should find full names directly
    expect(await screen.findByText('noun')).toBeDefined()
    expect(await screen.findByText('verb')).toBeDefined()
  })
})
