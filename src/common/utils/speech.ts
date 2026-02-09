/**
 * Play text-to-speech for a given word or phrase
 */

let cachedVoice: SpeechSynthesisVoice | null = null;

// Pre-warm the TTS engine
const warmUpTTS = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    // Prefer local voices to reduce network latency
    cachedVoice = voices.find(v => (v.lang === 'en-US' || v.lang === 'en_US') && v.localService) || 
                  voices.find(v => v.lang.startsWith('en') && v.localService) ||
                  voices.find(v => v.lang.startsWith('en')) || 
                  voices[0];
  }
};

if (typeof window !== 'undefined' && window.speechSynthesis) {
  warmUpTTS();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = warmUpTTS;
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

  // Try to find a specific voice for the requested language if cached one doesn't match
  if (cachedVoice && cachedVoice.lang.startsWith(lang.split('-')[0])) {
    utterance.voice = cachedVoice;
  } else {
    const voices = synth.getVoices();
    const foundVoice = voices.find(v => v.lang === lang && v.localService) || 
                       voices.find(v => v.lang.startsWith(lang.split('-')[0]) && v.localService) ||
                       voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (foundVoice) utterance.voice = foundVoice;
  }

  // Use a small timeout to let the cancel action propagate, avoiding "stuck" engine
  setTimeout(() => {
    synth.speak(utterance);
  }, 10);

  // Keep-alive only for long text
  if (text.length > 100) {
    const keepAlive = setInterval(() => {
      if (!synth.speaking) {
        clearInterval(keepAlive);
      } else {
        synth.resume();
      }
    }, 5000);
  }
}