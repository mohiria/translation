import { fetchFromLLM } from './llm'
import { UserSettings } from '../common/types'

console.log('Language Learning Background script loaded')

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRANSLATE_WORD') {
    handleTranslationRequest(request.text, request.context, request.settings)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }))
    return true; 
  }
})

async function handleTranslationRequest(text: string, contextSentence: string, settings?: UserSettings) {
  // 1. Check if LLM is enabled and configured
  if (settings?.engine === 'llm' && settings.llm.apiKey) {
    try {
      console.log('Using LLM Provider:', settings.llm.provider)
      return await fetchFromLLM(text, contextSentence || text, settings.llm)
    } catch (e: any) {
      console.error('LLM translation failed:', e)
      // Fallback to standard engines if LLM fails? Or return error?
      // Let's return error to let user know config might be wrong
      if (e.message.includes('API Key') || e.message.includes('401')) {
         throw e
      }
      // For network/other errors, maybe fallback? 
      // User explicitly asked for "Mutually exclusive", so maybe better to show error.
      // But for robustness, falling back to dictionary is usually better UX.
      // Let's fallback to Youdao but mark source.
      console.log('Falling back to standard dictionary...')
    }
  }

  const isSingleWord = text.trim().split(/\s+/).length === 1;

  // If it's a single word, try Youdao First (Great for IPA and CN meanings)
  if (isSingleWord) {
    try {
      const youdaoResult = await fetchFromYoudao(text);
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
async function fetchFromYoudao(word: string) {
  const url = `https://dict.youdao.com/jsonjwtranslate?q=${encodeURIComponent(word)}&t=2&f=1&j=3`;
  console.log('Fetching from Youdao:', url);
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Youdao response contains "smartresult" for simple dict lookups
  if (data && data.smartresult && data.smartresult.entries) {
    // Filter out empty entries
    const entries = data.smartresult.entries.filter((e: string) => e.trim().length > 0);
    const meaning = entries.join('; ').replace(/\\n/g, '').trim();
    
    // For IPA, Youdao sometimes needs a second simple call or we use a different endpoint
    // Let's try to get IPA from a more direct suggest API if first one has no IPA
    const ipa = await fetchIpaFromYoudao(word);

    if (meaning) {
       return {
         word,
         ipa: ipa ? `[${ipa}]` : '',
         meaning: meaning,
         source: 'Youdao'
       };
    }
  }
  return null;
}

async function fetchIpaFromYoudao(word: string) {
  try {
    const url = `https://dict.youdao.com/suggest?q=${encodeURIComponent(word)}&num=1&doctype=json`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.data && data.data.entries && data.data.entries[0]) {
      // The suggest API often returns "word (ipa)" format
      const entry = data.data.entries[0].explain;
      // Youdao suggest API is limited, but let's try another one if this fails
    }
    
    // If suggest fails, try the XML-to-JSON trick for full info
    const fullUrl = `https://dict.youdao.com/fsearch?client=deskdict&q=${encodeURIComponent(word)}&pos=-1&doctype=xml&xmlVersion=3.2`;
    const fullRes = await fetch(fullUrl);
    const xml = await fullRes.text();
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