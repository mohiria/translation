import React from 'react'
import ReactDOM from 'react-dom/client'
import { scanAndHighlight, clearHighlights } from './engine/scanner'
import { getSettings } from '../common/storage/settings'
import { getVocabulary } from '../common/storage/vocabulary'
import { initDictionaryService } from '../common/storage/dictionary-service'
import { batchLookupWords } from '../common/storage/indexed-db'
import { Overlay } from './components/Overlay'
import { SelectionPopup } from './components/SelectionPopup'

/**
 * Shadow DOM Setup for UI Isolation
 */
const host = document.createElement('div')
host.id = 'll-extension-host'
Object.assign(host.style, { position: 'absolute', top: 0, left: 0, width: 0, height: 0, zIndex: 2147483647, pointerEvents: 'none' })
document.body.appendChild(host)

const root = ReactDOM.createRoot(host.attachShadow({ mode: 'open' }))
root.render(<><Overlay /><SelectionPopup /></>)

/**
 * State & Scanning Logic
 */
let tabEnabled = false
let isScanning = false

const runScan = async (forceClear = false) => {
  if (isScanning || !tabEnabled) {
    if (!tabEnabled) clearHighlights()
    return
  }
  isScanning = true

  try {
    const [settings, vocabList] = await Promise.all([getSettings(), getVocabulary()])
    const vocabSet = new Set(vocabList.map(v => v.word.toLowerCase()))
    const vocabMap = Object.fromEntries(vocabList.map(v => [v.word.toLowerCase(), v]))

    await scanAndHighlight(
      document.body, settings.proficiency, vocabSet, vocabMap, 
      settings.pronunciation, batchLookupWords, forceClear, settings.showIPA
    )
  } finally {
    isScanning = false
  }
}

/**
 * Mutation Observer for Dynamic Content
 */
const setupObserver = () => {
  let timeout: any = null
  const observer = new MutationObserver((mutations) => {
    // Check if the change was made by us (adding/removing word containers)
    const isOurMutation = mutations.some(m => {
      const isOurNode = (n: Node) => 
        (n instanceof HTMLElement && (n.classList.contains('ll-word-container') || n.id === 'll-extension-host')) || 
        n.parentElement?.classList.contains('ll-word-container')
      
      return Array.from(m.addedNodes).some(isOurNode) || Array.from(m.removedNodes).some(isOurNode)
    })

    if (isOurMutation) return
    
    if (timeout) clearTimeout(timeout)
    // Reduced debounce time from 1000ms to 500ms for better responsiveness
    timeout = setTimeout(() => {
      if (tabEnabled) runScan(false)
    }, 500)
  })
  
  observer.observe(document.body, { childList: true, subtree: true })
}

/**
 * Initialization
 */
const init = async () => {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_TAB_STATE' })
    tabEnabled = !!res?.enabled
  } catch {
    tabEnabled = false
  }

  await initDictionaryService()
  await runScan(true)
  setupObserver()
}

chrome.runtime.onMessage.addListener((req) => {
  if (req.type === 'TOGGLE_TAB_ENABLED') {
    tabEnabled = req.enabled
    tabEnabled ? runScan(true) : clearHighlights()
  }
})

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.settings) {
    const { oldValue: oldS, newValue: newS } = changes.settings
    const needsRescan = !oldS || !newS || oldS.proficiency !== newS.proficiency || 
                        oldS.pronunciation !== newS.pronunciation || oldS.showIPA !== newS.showIPA
    if (needsRescan && tabEnabled) runScan(true)
  } else if (area === 'local' && changes.vocabulary && tabEnabled) {
    runScan(true)
  }
})

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
