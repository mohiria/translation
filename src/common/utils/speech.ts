/**
 * Play text-to-speech for a given word or phrase
 */

// Cache voices per language code (e.g. 'en-US' -> VoiceObject)
const voiceCache: Record<string, SpeechSynthesisVoice> = {};

// Helper to find the best voice for a specific language code
const findVoiceForLang = (lang: string, voices: SpeechSynthesisVoice[]) => {
  const target = lang.toLowerCase().replace('_', '-'); // e.g., 'en-gb'
  const baseLang = target.split('-')[0]; // e.g., 'en'
  const region = target.split('-')[1]; // e.g., 'gb'
  
  // 1. First Pass: Look for an EXACT language match (e.g., 'en-GB')
  let filtered = voices.filter(v => v.lang.toLowerCase().replace('_', '-') === target);
  
  // 2. Second Pass: If no exact match, look for the same base language and region keywords in name
  if (filtered.length === 0) {
    const keywords = region === 'gb' ? ['uk', 'gb', 'brit', 'hazel', 'george'] : ['us', 'amer', 'zira', 'david'];
    filtered = voices.filter(v => {
      const name = v.name.toLowerCase();
      const vLang = v.lang.toLowerCase();
      return vLang.startsWith(baseLang) && (vLang.includes(region) || keywords.some(k => name.includes(k)));
    });
  }

  // 3. Third Pass: Any voice that starts with the base language
  if (filtered.length === 0) {
    filtered = voices.filter(v => v.lang.toLowerCase().startsWith(baseLang));
  }

  // Priority: Prefer Online/High Quality voices if available, otherwise Local
  return filtered.find(v => !v.localService) || filtered[0];
};

// Pre-warm the TTS engine with retries
const warmUpTTS = (retryCount = 0) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  const voices = window.speechSynthesis.getVoices();
  
  if (voices.length === 0) {
    if (retryCount < 12) { // Increased retries
      setTimeout(() => warmUpTTS(retryCount + 1), 200);
    }
    return;
  }

  // Clear and re-populate cache
  const us = findVoiceForLang('en-US', voices);
  if (us) voiceCache['en-US'] = us;
  
  const uk = findVoiceForLang('en-GB', voices);
  if (uk) voiceCache['en-GB'] = uk;
};

if (typeof window !== 'undefined' && window.speechSynthesis) {
  warmUpTTS();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => warmUpTTS();
  }
}

export const speak = (text: string, lang: string = 'en-US') => {
  const synth = window.speechSynthesis;
  if (!synth) return;

  // Interrupt previous speech
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.0; 
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // 1. Check Cache
  if (voiceCache[lang]) {
    utterance.voice = voiceCache[lang];
  } else {
    // 2. Find and Cache
    const foundVoice = findVoiceForLang(lang, synth.getVoices());
    if (foundVoice) {
      voiceCache[lang] = foundVoice;
      utterance.voice = foundVoice;
    }
  }

  // Use a small timeout to let the cancel action propagate
  setTimeout(() => {
    if (utterance.voice) {
      synth.speak(utterance);
    } else {
      // 4. LAST RESORT: Fallback to Online API
      playOnlineTTS(text, lang);
    }
  }, 50);
}

/**
 * Fallback to Youdao Dictionary's public TTS API
 */
const playOnlineTTS = (text: string, lang: string) => {
  const type = lang.toLowerCase().includes('gb') || lang.toLowerCase().includes('uk') ? 1 : 0;
  const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=${type}`);
  audio.play().catch(e => console.error('Online TTS playback failed:', e));
};
