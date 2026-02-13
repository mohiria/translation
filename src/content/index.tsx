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
let isScanning = false;

const runScan = async (forceClear = false) => {
  if (isScanning) return;
  isScanning = true;

  try {
    const settings = await getSettings()
    
    if (!tabEnabled) {
      clearHighlights()
      return
    }
    
    const vocabList = await getVocabulary()
    const vocabSet = new Set(vocabList.map(v => v.word.toLowerCase()))
    
    const vocabMap: Record<string, any> = {}
    vocabList.forEach(v => { vocabMap[v.word.toLowerCase()] = v })

    await scanAndHighlight(
      document.body, 
      settings.proficiency, 
      vocabSet, 
      vocabMap, 
      settings.pronunciation,
      batchLookupWords,
      forceClear, 
      settings.showIPA
    )
  } finally {
    isScanning = false;
  }
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
  await runScan(true)
}

// Listen for messages from background (tab toggle)
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'TOGGLE_TAB_ENABLED') {
    tabEnabled = request.enabled;
    console.log('Tab translation state changed:', tabEnabled);
    if (tabEnabled) {
      runScan(true);
    } else {
      clearHighlights();
    }
  }
});

// Listen for settings changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'sync' && changes.settings) {
    const oldSettings = changes.settings.oldValue
    const newSettings = changes.settings.newValue
    
    if (!oldSettings || !newSettings) {
      await runScan(true)
      return
    }

    const needsRescan = 
      oldSettings.proficiency !== newSettings.proficiency ||
      oldSettings.pronunciation !== newSettings.pronunciation ||
      oldSettings.showIPA !== newSettings.showIPA
    
    if (needsRescan && tabEnabled) {
      await runScan(true)
    }
  } else if (areaName === 'local' && changes.vocabulary) {
    if (tabEnabled) {
      await runScan(true)
    }
  }
})

const setupObserver = () => {
  let timeout: any = null
  const observer = new MutationObserver((mutations) => {
    // Better detection of our own changes to prevent loops
    const isOurMutation = mutations.some(m => {
      const checkNode = (node: Node) => {
        if (node instanceof HTMLElement) {
          return node.classList.contains('ll-word-container') || node.id === 'll-extension-host';
        }
        return node.parentElement?.classList.contains('ll-word-container') || false;
      };

      return (
        Array.from(m.addedNodes).some(checkNode) ||
        Array.from(m.removedNodes).some(checkNode)
      );
    });

    if (isOurMutation) return;

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(async () => {
      if (tabEnabled) {
         // Incremental scan: don't clear existing highlights
         await runScan(false)
      }
    }, 1000)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init()
    setupObserver()
  })
} else {
  init()
  setupObserver()
}
