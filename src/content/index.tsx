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
  
  if (!settings.enabled) {
    clearHighlights()
    return
  }
  
  const vocabList = await getVocabulary()
  const vocabSet = new Set(vocabList.map(v => v.word.toLowerCase()))
  
  const vocabMap: Record<string, any> = {}
  vocabList.forEach(v => { vocabMap[v.word.toLowerCase()] = v })

  console.log('Preparing scan data...')
  
  // Note: We DO NOT clearHighlights() here anymore to avoid flickering.
  // The scanner will handle clearing internally just before drawing.
  
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
  // Initialize DB and trigger update check
  await loadRemoteDictionary()
  await runScan()
}

// Listen for settings changes
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
      oldSettings.enabled !== newSettings.enabled ||
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