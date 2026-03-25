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
  lookupWordInDB: vi.fn().mockResolvedValue(null)
}))

describe('SelectionPopup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    // Reset selection
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => '',
      isCollapsed: true,
      getRangeAt: () => ({ getBoundingClientRect: () => ({}) })
    })
    
    // Mock chrome.runtime.sendMessage to return enabled: true
    chromeMock.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.type === 'GET_TAB_STATE') callback({ enabled: true })
    })
  })

  it('should show US prefix when pronunciation is US', async () => {
    mockSettings.pronunciation = 'US'
    
    // Simulate selection
    const mockRect = { top: 100, bottom: 200, left: 100, right: 200, width: 100, height: 100 }
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => 'apple',
      isCollapsed: false,
      getRangeAt: () => ({ getBoundingClientRect: () => mockRect })
    })

    // Mock translation response
    chromeMock.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.type === 'GET_TAB_STATE') {
        callback({ enabled: true })
      } else if (msg.type === 'TRANSLATE_WORD') {
        callback({ success: true, data: { word: 'apple', ipa: '/ˈæp.əl/', meaning: '苹果' } })
      }
    })

    await act(async () => {
      render(<SelectionPopup />)
    })

    // Trigger mouseup
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    // Wait for translation
    const ipaElement = await screen.findByText(/ˈæp\.əl/)
    expect(ipaElement.textContent).toContain('US ')
  })

  it('should show UK prefix when pronunciation is UK', async () => {
    mockSettings.pronunciation = 'UK'
    
    // Simulate selection
    const mockRect = { top: 100, bottom: 200, left: 100, right: 200, width: 100, height: 100 }
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => 'apple',
      isCollapsed: false,
      getRangeAt: () => ({ getBoundingClientRect: () => mockRect })
    })

    // Mock translation response
    chromeMock.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (msg.type === 'GET_TAB_STATE') {
        callback({ enabled: true })
      } else if (msg.type === 'TRANSLATE_WORD') {
        callback({ success: true, data: { word: 'apple', ipa: '/ˈæp.əl/', meaning: '苹果' } })
      }
    })

    await act(async () => {
      render(<SelectionPopup />)
    })

    // Trigger mouseup
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    // Wait for translation
    const ipaElement = await screen.findByText(/ˈæp\.əl/)
    expect(ipaElement.textContent).toContain('UK ')
  })
})
