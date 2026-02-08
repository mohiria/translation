/**
 * Play text-to-speech for a given word or phrase
 * Improved with engine wake-up and fallback logic.
 */
export const speak = (text: string, lang: string = 'en-US') => {
  const synth = window.speechSynthesis;
  if (!synth) {
    console.error('Speech synthesis not supported in this browser.');
    return;
  }

  // 1. Important: Chrome sometimes needs a cancel() to wake up the engine
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // 2. Set language and basic properties
  utterance.lang = lang;
  utterance.rate = 0.85; // Slightly slower for clarity
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // 3. Robust Voice Selection
  // Sometimes en-US isn't the first one, we try to find any English voice
  const voices = synth.getVoices();
  if (voices.length > 0) {
    const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    utterance.voice = englishVoice;
  }

  // 4. Debugging events
  utterance.onstart = () => console.log(`TTS: Started speaking "${text}"`);
  utterance.onerror = (event) => console.error('TTS: SpeechSynthesisUtterance error', event);
  
  // 5. Speak
  synth.speak(utterance);

  // 6. Bug fix for Chrome: if speech is long, it might stop halfway. 
  // We keep the engine "alive" by checking the speaking state.
  const keepAlive = setInterval(() => {
    if (!synth.speaking) {
      clearInterval(keepAlive);
    } else {
      synth.resume(); // Periodically resume to prevent timeout
    }
  }, 5000);
}