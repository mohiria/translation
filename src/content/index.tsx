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

let tabEnabled = false;

const runScan = async () => {
  const settings = await getSettings()
  
  if (!tabEnabled) {
    clearHighlights()
    return
  }
  
  const vocabList = await getVocabulary()
  const vocabSet = new Set(vocabList.map(v => v.word.toLowerCase()))
  
  const vocabMap: Record<string, any> = {}
  vocabList.forEach(v => { vocabMap[v.word.toLowerCase()] = v })

  console.log('Preparing scan data...')
  
  await scanAndHighlight(
    document.body, 
    settings.proficiency, 
    vocabSet, 
    vocabMap, 
    settings.pronunciation,
    batchLookupWords,
    true, // Pass a flag to indicate it should clear old ones just before drawing
    settings.showIPA
  )
}

const init = async () => {
  // 1. Get initial tab-specific state from background
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_TAB_STATE' });
    tabEnabled = !!response?.enabled;
  } catch (e) {
    tabEnabled = false;
  }

  // 2. Initialize DB and trigger update check
  await loadRemoteDictionary()
  await runScan()
}

// Listen for messages from background (tab toggle)
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'TOGGLE_TAB_ENABLED') {
    tabEnabled = request.enabled;
    console.log('Tab translation state changed:', tabEnabled);
    runScan();
  }
});

// Listen for settings changes (only for proficiency/pronunciation/etc)
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  const isSyncSettingsChange = areaName === 'sync' && changes.settings
  const isLocalVocabChange = areaName === 'local' && changes.vocabulary
  
  if (isSyncSettingsChange) {
    const oldSettings = changes.settings.oldValue
    const newSettings = changes.settings.newValue
    
    if (!oldSettings || !newSettings) {
      await runScan()
      return
    }

    // Only re-scan if highlighting-relevant settings changed
    const needsRescan = 
      oldSettings.proficiency !== newSettings.proficiency ||
      oldSettings.pronunciation !== newSettings.pronunciation ||
      oldSettings.showIPA !== newSettings.showIPA
    
    if (needsRescan) {
      console.log('Visual settings changed, refreshing highlights...')
      await runScan()
    }
  } else if (isLocalVocabChange) {
    console.log('Vocabulary changed, refreshing highlights...')
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
        if (tabEnabled) {
           await runScan()
        }
      }, 1000)
    })
    observer.observe(document.body, { childList: true, subtree: true })
  })
} else {
  init()
}
