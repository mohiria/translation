import { fetchFromLLM } from './llm'
import { UserSettings } from '../common/types'
import { formatIPA } from '../common/utils/format'
import { getSettings, saveSettings } from '../common/storage/settings'

console.log('Language Learning Background script loaded')

// Map to store enabled state per tab ID
const tabStates: Record<number, boolean> = {};

chrome.runtime.onInstalled.addListener((details) => {
  // Removed automatic tab opening for shortcuts as per user request
});

// Update the badge and state when a tab is updated or activated
const updateTabUI = (tabId: number, enabled: boolean) => {
  chrome.action.setBadgeText({
    tabId,
    text: enabled ? 'ON' : ''
  });
  chrome.action.setBadgeBackgroundColor({
    tabId,
    color: '#4b8bf5'
  });
};

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-translation') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const currentState = !!tabStates[tab.id];
      const newState = !currentState;
      tabStates[tab.id] = newState;
      
      updateTabUI(tab.id, newState);
      
      // Notify the content script in the specific tab
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TAB_ENABLED', enabled: newState });
    }
  }
});

// Listen for messages from content scripts requesting their tab state
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_TAB_STATE' && sender.tab?.id) {
    sendResponse({ enabled: !!tabStates[sender.tab.id] });
  }
  
  if (request.type === 'TRANSLATE_WORD') {
    handleTranslationRequest(request.text, request.context, request.settings)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }))
    return true; 
  }
});

// Clean up state when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabStates[tabId];
});

async function handleTranslationRequest(text: string, contextSentence: string, settings?: UserSettings) {
  const preferredPron = settings?.pronunciation || 'US';
  
  // 1. Check if LLM is enabled and configured
  if (settings?.engine === 'llm' && settings.llm.apiKey) {
    try {
      console.log('Using LLM Provider:', settings.llm.provider, 'Preferred Pron:', preferredPron)
      return await fetchFromLLM(text, contextSentence || text, settings)
    } catch (e: any) {
      console.error('LLM translation failed:', e)
      console.log('Falling back to standard dictionary...')
    }
  }

  const isSingleWord = text.trim().split(/\s+/).length === 1;

  // If it's a single word, try Youdao First (Great for IPA and CN meanings)
  if (isSingleWord) {
    try {
      const youdaoResult = await fetchFromYoudao(text, preferredPron);
      if (youdaoResult) return youdaoResult;
    } catch (e) {
      console.error('Youdao failed:', e);
    }
  }

  // Fallback to Google
  return fetchFromGoogle(text);
}

/**
 * Fetch results from Youdao (Unofficial Web/Mobile API)
 * Extremely stable for single words, includes IPA.
 */
async function fetchFromYoudao(word: string, preferredPron: 'UK' | 'US') {
  const url = `https://dict.youdao.com/jsonjwtranslate?q=${encodeURIComponent(word)}&t=2&f=1&j=3`;
  console.log('Fetching from Youdao:', url);
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Youdao response contains "smartresult" for simple dict lookups
  if (data && data.smartresult && data.smartresult.entries) {
    // Filter out empty entries
    const entries = data.smartresult.entries.filter((e: string) => e.trim().length > 0);
    const meaning = entries.join('; ').replace(/\\n/g, '').trim();
    
    // Fetch both to be safe and store in vocab
    const ipa_us = await fetchIpaFromYoudao(word, 'US');
    const ipa_uk = await fetchIpaFromYoudao(word, 'UK');

    if (meaning) {
       return {
         word,
         ipa_us: formatIPA(ipa_us),
         ipa_uk: formatIPA(ipa_uk),
         ipa: formatIPA(preferredPron === 'UK' ? (ipa_uk || ipa_us) : (ipa_us || ipa_uk)),
         meaning: meaning,
         source: 'Youdao'
       };
    }
  }
  return null;
}

async function fetchIpaFromYoudao(word: string, preferredPron: 'UK' | 'US') {
  try {
    // Try the XML-to-JSON trick for full info
    const fullUrl = `https://dict.youdao.com/fsearch?client=deskdict&q=${encodeURIComponent(word)}&pos=-1&doctype=xml&xmlVersion=3.2`;
    const fullRes = await fetch(fullUrl);
    const xml = await fullRes.text();
    
    if (preferredPron === 'UK') {
      const ukPhonetic = xml.match(/<uk-phonetic><!\[CDATA\[(.*?)\]\]><\/uk-phonetic>/);
      if (ukPhonetic) return ukPhonetic[1];
    } else {
      const usPhonetic = xml.match(/<us-phonetic><!\[CDATA\[(.*?)\]\]><\/us-phonetic>/);
      if (usPhonetic) return usPhonetic[1];
    }
    
    // Fallback to general phonetic
    const phoneticMatch = xml.match(/<phonetic><!\[CDATA\[(.*?)\]\]><\/phonetic>/);
    return phoneticMatch ? phoneticMatch[1] : '';
  } catch (e) {
    return '';
  }
}

/**
 * Fetch results from Google Translate
 * Fast and reliable for phrases, but usually lacks IPA in this endpoint.
 */
async function fetchFromGoogle(text: string) {
  const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`
  const response = await fetch(googleUrl)
  const data = await response.json()
  
  if (data && data[0] && data[0][0]) {
    return {
      word: text,
      meaning: data[0][0][0],
      ipa: '', 
      source: 'Google'
    }
  }
  throw new Error('All translation engines failed');
}