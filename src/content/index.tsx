import React from 'react'
import ReactDOM from 'react-dom/client'
import { scanAndHighlight, clearHighlights } from './engine/scanner'
import { getSettings } from '../common/storage/settings'
import { getVocabulary } from '../common/storage/vocabulary'
import { loadRemoteDictionary, getCachedDictionary } from '../common/storage/dictionary-loader'
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

const init = async () => {
  const settings = await getSettings()
  if (settings.enabled) {
    const vocabList = await getVocabulary()
    const vocabSet = new Set(vocabList.map(v => v.word.toLowerCase()))
    
    let dynamicDict = await getCachedDictionary()
    if (Object.keys(dynamicDict).length === 0) {
      dynamicDict = await loadRemoteDictionary()
    }

    // CRITICAL: Merge vocabulary into dynamicDict so saved words (especially from AI) 
    // can be found even if they are not in the official dictionary.
    const vocabMap: Record<string, any> = {}
    vocabList.forEach(v => { vocabMap[v.word.toLowerCase()] = v })
    const combinedDict = { ...dynamicDict, ...vocabMap }

    console.log('Initial scan. Vocab:', vocabSet.size, 'Dict:', Object.keys(combinedDict).length)
    scanAndHighlight(document.body, settings.proficiency, vocabSet, combinedDict)
  }
}

// Listen for settings changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local') {
    const settings = await getSettings()
    if (changes.settings || changes.vocabulary) {
      if (!settings.enabled) {
        clearHighlights()
      } else {
        const vocabList = await getVocabulary()
        const vocabSet = new Set(vocabList.map(v => v.word.toLowerCase()))
        const dynamicDict = await getCachedDictionary()
        
        const vocabMap: Record<string, any> = {}
        vocabList.forEach(v => { vocabMap[v.word.toLowerCase()] = v })
        const combinedDict = { ...dynamicDict, ...vocabMap }
        
        clearHighlights() 
        scanAndHighlight(document.body, settings.proficiency, vocabSet, combinedDict)
      }
    }
  }
})

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init()
    const observer = new MutationObserver(async (mutations) => {
      const settings = await getSettings()
      if (!settings.enabled) return

      const vocabList = await getVocabulary()
      const vocabSet = new Set(vocabList.map(v => v.word.toLowerCase()))
      const dynamicDict = await getCachedDictionary()
      
      const vocabMap: Record<string, any> = {}
      vocabList.forEach(v => { vocabMap[v.word.toLowerCase()] = v })
      const combinedDict = { ...dynamicDict, ...vocabMap }

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scanAndHighlight(node as HTMLElement, settings.proficiency, vocabSet, combinedDict)
          }
        })
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })
  })
} else {
  init()
}