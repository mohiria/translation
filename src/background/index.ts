import { fetchFromLLM } from './llm'
import { UserSettings } from '../common/types'
import { getSettings } from '../common/storage/settings'
import * as TranslationService from './services/translation'

/**
 * State Management (Persist across refreshes using session storage)
 */
const getTabState = async (tabId: number): Promise<boolean> => {
  const data = await chrome.storage.session.get(`tabState_${tabId}`)
  return !!data[`tabState_${tabId}`]
}

const setTabState = async (tabId: number, enabled: boolean) => {
  await chrome.storage.session.set({ [`tabState_${tabId}`]: enabled })
}

/**
 * Badge & Icon Management
 */
const updateTabUI = (tabId: number, enabled: boolean) => {
  chrome.action.setBadgeText({ tabId, text: '' })
  
  const iconPrefix = enabled ? 'icon-active' : 'icon'
  const iconPath = (size: string) => `/src/assets/${iconPrefix}-${size}.png`
  const fallbackPath = (size: string) => `assets/${iconPrefix}-${size}.png`

  const setIcon = (pathMap: Record<string, string>) => chrome.action.setIcon({ tabId, path: pathMap })

  setIcon({ "16": iconPath('16'), "48": iconPath('48'), "128": iconPath('128') }).catch(() => {
    setIcon({ "16": fallbackPath('16'), "48": fallbackPath('48'), "128": fallbackPath('128') })
  })
}

const toggleTabState = async (tabId: number) => {
  const currentState = await getTabState(tabId)
  const newState = !currentState
  await setTabState(tabId, newState)
  updateTabUI(tabId, newState)
  
  chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_TAB_ENABLED', enabled: newState }).catch(() => {})
  chrome.runtime.sendMessage({ type: 'TAB_STATE_CHANGED', tabId, enabled: newState }).catch(() => {})
}

/**
 * Translation Orchestration
 */
async function handleTranslationRequest(text: string, contextSentence: string, settings?: UserSettings) {
  const preferredPron = settings?.pronunciation || 'US'
  
  // 1. LLM Priority
  if (settings?.engine === 'llm' && settings.llm.apiKey) {
    try {
      return await fetchFromLLM(text, contextSentence || text, settings)
    } catch (e) {
      console.error('LLM translation failed, falling back to dictionary', e)
    }
  }

  const isSingleWord = text.trim().split(/\s+/).length === 1

  // 2. Dictionary Lookup (for single words)
  if (isSingleWord) {
    const youdao = await TranslationService.fetchFromYoudao(text, preferredPron)
    if (youdao) return { ...youdao, source: 'Youdao' }

    const iciba = await TranslationService.fetchFromIciba(text)
    if (iciba) return { ...iciba, source: 'iCIBA' }
  }

  // 3. Machine Translation Fallbacks
  try {
    return await TranslationService.fetchFromYoudaoMT(text)
  } catch {
    try {
      return await TranslationService.fetchFromIcibaMT(text)
    } catch {
      return await TranslationService.fetchFromGoogle(text)
    }
  }
}

/**
 * Event Listeners
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-translation') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) toggleTabState(tab.id)
  }
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = request.tabId || sender.tab?.id

  switch (request.type) {
    case 'GET_TAB_STATE':
      if (tabId) {
        getTabState(tabId).then(enabled => sendResponse({ enabled }))
        return true
      }
      break
    case 'TOGGLE_TAB_STATE':
      if (tabId) toggleTabState(tabId).then(() => sendResponse({ success: true }))
      break
    case 'TRANSLATE_WORD':
      handleTranslationRequest(request.text, request.context, request.settings)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }))
      return true
  }
  return true
})

chrome.tabs.onRemoved.addListener(tabId => chrome.storage.session.remove(`tabState_${tabId}`))
chrome.tabs.onUpdated.addListener(async (tabId, change, tab) => {
  if (change.status === 'complete') {
    const enabled = await getTabState(tabId)
    if (enabled) {
      updateTabUI(tabId, true)
      // Ensure the newly loaded content script knows it should be enabled
      chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_TAB_ENABLED', enabled: true }).catch(() => {})
    }
  }
})
