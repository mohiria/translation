import { fetchFromLLM } from './llm'
import { UserSettings } from '../common/types'
import { formatIPA } from '../common/utils/format'
import { getSettings, saveSettings } from '../common/storage/settings'

console.log('Language Learning Background script loaded')

// Map to store enabled state per tab ID
const tabStates: Record<number, boolean> = {};

// Update the badge for a specific tab
function updateTabBadge(tabId: number, enabled: boolean) {
  // Clear the badge text explicitly
  chrome.action.setBadgeText({
    tabId,
    text: ''
  });

  // Dynamically update the extension icon
  const iconPrefix = enabled ? 'icon-active' : 'icon';
  
  // CRXJS usually maps src/assets to assets/ in the build, 
  // but during dev, it might need the full path.
  chrome.action.setIcon({
    tabId,
    path: {
      "16": `/src/assets/${iconPrefix}-16.png`,
      "48": `/src/assets/${iconPrefix}-48.png`,
      "128": `/src/assets/${iconPrefix}-128.png`
    }
  }, () => {
    if (chrome.runtime.lastError) {
      // Fallback for production build if /src/assets/ fails
      chrome.action.setIcon({
        tabId,
        path: {
          "16": `assets/${iconPrefix}-16.png`,
          "48": `assets/${iconPrefix}-48.png`,
          "128": `assets/${iconPrefix}-128.png`
        }
      });
    }
  });
}

// Helper to toggle tab state and notify content script
async function toggleTabState(tabId: number) {
  const currentState = !!tabStates[tabId];
  const newState = !currentState;
  tabStates[tabId] = newState;
  
  updateTabBadge(tabId, newState);
  
  // Notify the content script in the specific tab
  chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_TAB_ENABLED', enabled: newState }).catch(() => {
    // Content script might not be ready
  });

  // Notify popup if it's open
  chrome.runtime.sendMessage({ type: 'TAB_STATE_CHANGED', tabId, enabled: newState }).catch(() => {
    // Popup might not be open
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-translation') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await toggleTabState(tab.id);
    }
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_TAB_STATE') {
    const tabId = request.tabId || sender.tab?.id;
    if (tabId) {
      sendResponse({ enabled: !!tabStates[tabId] });
    }
    return true;
  }

  if (request.type === 'TOGGLE_TAB_STATE' && request.tabId) {
    toggleTabState(request.tabId);
    sendResponse({ success: true });
    return true;
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

// Restore state when tab is refreshed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tabStates[tabId]) {
    updateTabBadge(tabId, tabStates[tabId]);
  }
});

async function handleTranslationRequest(text: string, contextSentence: string, settings?: UserSettings) {
  const preferredPron = settings?.pronunciation || 'US';
  
  // 1. Check if LLM is enabled and configured (User's explicit choice)
  if (settings?.engine === 'llm' && settings.llm.apiKey) {
    try {
      console.log('Using LLM Provider:', settings.llm.provider, 'Preferred Pron:', preferredPron)
      return await fetchFromLLM(text, contextSentence || text, settings)
    } catch (e: any) {
      console.error('LLM translation failed:', e)
    }
  }

  const isSingleWord = text.trim().split(/\s+/).length === 1;

  // 2. Dictionary priority for single words
  if (isSingleWord) {
    try {
      const youdaoResult = await fetchFromYoudao(text, preferredPron);
      if (youdaoResult) return { ...youdaoResult, source: 'Youdao' };
    } catch (e) {
      console.error('Youdao Word Lookup failed:', e);
    }

    try {
      const icibaResult = await fetchFromIciba(text, preferredPron);
      if (icibaResult) return { ...icibaResult, source: 'iCIBA' };
    } catch (e) {
      console.error('iCIBA Word Lookup failed:', e);
    }
  }

  // 3. Machine Translation (Youdao/iCIBA first, Google as fallback)
  try {
    return await fetchFromYoudaoMT(text);
  } catch (e) {
    console.warn('Youdao MT failed, trying iCIBA MT...', e);
    try {
      return await fetchFromIcibaMT(text);
    } catch (e2) {
      console.warn('iCIBA MT failed, trying Google Translate...', e2);
      try {
        return await fetchFromGoogle(text);
      } catch (e3) {
        console.error('All translation engines failed');
        throw e3;
      }
    }
  }
}

/**
 * Fetch results from Youdao (Unofficial Web/Mobile API)
 * Extremely stable for single words, includes IPA.
 */
async function fetchFromYoudao(word: string, preferredPron: 'UK' | 'US') {
  try {
    // 1. Get basic meaning from suggest API
    const suggestUrl = `https://dict.youdao.com/suggest?q=${encodeURIComponent(word)}&num=1&doctype=json`;
    const suggestRes = await fetch(suggestUrl);
    const suggestData = await suggestRes.json();
    
    let meaning = '';
    if (suggestData && suggestData.data && suggestData.data.entries && suggestData.data.entries.length > 0) {
      meaning = suggestData.data.entries[0].explain;
    }

    // 2. Get IPA from the detailed XML API
    const ipa_us = await fetchIpaFromYoudao(word, 'US');
    const ipa_uk = await fetchIpaFromYoudao(word, 'UK');

    if (meaning || ipa_us || ipa_uk) {
       return {
         word,
         ipa_us: formatIPA(ipa_us),
         ipa_uk: formatIPA(ipa_uk),
         ipa: formatIPA(preferredPron === 'UK' ? (ipa_uk || ipa_us) : (ipa_us || ipa_uk)),
         meaning: meaning || 'View details in dictionary'
       };
    }
  } catch (e) {
    console.error('Youdao fetch failed:', e);
  }
  return null;
}

/**
 * Youdao Machine Translation for Phrases/Sentences
 */
async function fetchFromYoudaoMT(text: string) {
  const url = `https://fanyi.youdao.com/translate?&doctype=json&type=AUTO&i=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data && data.translateResult && data.translateResult[0]) {
    const meaning = data.translateResult[0].map((r: any) => r.tgt).join('');
    return { word: text, meaning, source: 'Youdao MT' };
  }
  throw new Error('Youdao MT failed');
}

/**
 * Fetch results from iCIBA (Jinshan)
 */
async function fetchFromIciba(word: string, preferredPron: 'UK' | 'US') {
  try {
    const url = `https://dict-mobile.iciba.com/interface/index.php?c=word&m=getsuggest&nums=1&is_need_mean=1&word=${encodeURIComponent(word)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.message && data.message[0]) {
      const entry = data.message[0];
      
      // iCIBA suggest API sometimes returns symbols
      const ipa = entry.symbol || '';
      
      return {
        word: word,
        meaning: entry.paraphrase || '',
        ipa: formatIPA(ipa),
        source: 'iCIBA'
      };
    }
  } catch (e) {
    console.error('iCIBA fetch failed:', e);
  }
  return null;
}

/**
 * iCIBA Machine Translation
 */
async function fetchFromIcibaMT(text: string) {
  const url = `https://ifanyi.iciba.com/index.php?c=trans&m=fy&client=6&auth_user=key_web_fanyi&sign=22222&pid=21007&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `from=auto&to=zh&q=${encodeURIComponent(text)}`
  });
  const data = await response.json();
  if (data && data.content && data.content.out) {
    return { word: text, meaning: data.content.out, source: 'iCIBA MT' };
  }
  throw new Error('iCIBA MT failed');
}

async function fetchIpaFromYoudao(word: string, preferredPron: 'UK' | 'US') {
  try {
    const fullUrl = `https://dict.youdao.com/fsearch?client=deskdict&q=${encodeURIComponent(word)}&pos=-1&doctype=xml&xmlVersion=3.2`;
    const fullRes = await fetch(fullUrl);
    const xml = await fullRes.text();
    
    if (preferredPron === 'UK') {
      const ukPhonetic = xml.match(/<uk-phonetic-symbol>(.*?)<\/uk-phonetic-symbol>/) || xml.match(/<uk-phonetic><!\[CDATA\[(.*?)\]\]><\/uk-phonetic>/);
      if (ukPhonetic) return ukPhonetic[1];
    } else {
      const usPhonetic = xml.match(/<us-phonetic-symbol>(.*?)<\/us-phonetic-symbol>/) || xml.match(/<us-phonetic><!\[CDATA\[(.*?)\]\]><\/us-phonetic>/);
      if (usPhonetic) return usPhonetic[1];
    }
    
    const phoneticMatch = xml.match(/<phonetic-symbol>(.*?)<\/phonetic-symbol>/) || xml.match(/<phonetic><!\[CDATA\[(.*?)\]\]><\/phonetic>/);
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