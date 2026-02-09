import React from 'react'
import ReactDOM from 'react-dom/client'
import { scanAndHighlight, clearHighlights } from './engine/scanner'
import { getSettings } from '../common/storage/settings'
import { getVocabulary } from '../common/storage/vocabulary'
import { loadRemoteDictionary } from '../common/storage/dictionary-loader'
import { batchLookupWords } from '../common/storage/indexed-db'
import { Overlay } from './components/Overlay'
import { SelectionPopup } from './components/SelectionPopup'

console.log('Language Learning Content script loaded')

// Create Shadow DOM host
const host = document.createElement('div')
host.id = 'll-extension-host'
host.style.position = 'absolute'
host.style.top = '0'
host.style.left = '0'
host.style.width = '0'
host.style.height = '0'
host.style.zIndex = '2147483647'
host.style.pointerEvents = 'none'
document.body.appendChild(host)

const shadow = host.attachShadow({ mode: 'open' })
const root = ReactDOM.createRoot(shadow)
root.render(
  <>
    <Overlay />
    <SelectionPopup />
  </>
)

const runScan = async () => {
  const settings = await getSettings()
  
  // Always clear first to reset the page state
  clearHighlights()
  
  if (!settings.enabled) {
    return
  }
  
  const vocabList = await getVocabulary()
  const vocabSet = new Set(vocabList.map(v => v.word.toLowerCase()))
  
  // Create a temporary map for user vocabulary
  const vocabMap: Record<string, any> = {}
  vocabList.forEach(v => { vocabMap[v.word.toLowerCase()] = v })

  console.log('Starting scan. Vocab size:', vocabSet.size)
  
  // We now pass a callback or specific lookup logic to scanner, 
  // but since we refactored scanner to take a dict object, 
  // we need to bridge the gap.
  // 
  // STRATEGY: 
  // 1. Identify words on screen first (cheap).
  // 2. Batch lookup them in IndexedDB (fast).
  // 3. Pass the result to the highlighter.
  
  await scanAndHighlight(
    document.body, 
    settings.proficiency, 
    vocabSet, 
    vocabMap, // Pass user vocab as base dict
    settings.pronunciation,
    batchLookupWords // New: Pass the async lookup function
  )
}

const init = async () => {
  // Initialize DB and trigger update check
  await loadRemoteDictionary()
  await runScan()
}

// Listen for settings changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  const isSyncChange = areaName === 'sync' && changes.settings
  const isLocalChange = areaName === 'local' && (changes.settings || changes.vocabulary)
  
  if (isSyncChange || isLocalChange) {
    console.log('Settings/Vocab changed, refreshing...')
    await runScan()
  }
})

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init()
    
    // Debounced mutation observer to avoid thrashing
    let timeout: any = null
    const observer = new MutationObserver((mutations) => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(async () => {
        const settings = await getSettings()
        if (settings.enabled) {
          // Ideally we scan only added nodes, but for simplicity/robustness with async DB:
          // We might need a more targeted approach later. For now, re-scan body is safest 
          // to ensure all new async words are caught.
           await runScan()
        }
      }, 1000)
    })
    observer.observe(document.body, { childList: true, subtree: true })
  })
} else {
  init()
}