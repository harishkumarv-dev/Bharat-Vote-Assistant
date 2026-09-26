/**
 * Web Speech API Voice Assistant Module (Speech-to-Text & Text-to-Speech)
 */

export class VoiceAssistant {
  constructor(onResultCallback, onStateChangeCallback) {
    this.synth = window.speechSynthesis;
    this.recognition = null;
    this.isListening = false;
    this.onResult = onResultCallback;
    this.onStateChange = onStateChangeCallback;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStateChange) this.onStateChange(true);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false);
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (this.onResult) this.onResult(transcript);
      };

      this.recognition.onerror = (err) => {
        console.warn("Speech recognition error:", err);
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false);
      };
    }
  }

  isSpeechSupported() {
    return !!this.recognition;
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn("Speech recognition start failed:", e);
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  speak(text) {
    if (!this.synth) return;
    this.synth.cancel(); // Stop any ongoing speech

    // Clean markdown tags for clear speech
    const cleanText = text
      .replace(/[*#_`~]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/⚠️|🚨|💊|📊|👩‍⚕️|📌|✅|💡/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick a natural female or male English voice if available
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen')));
    if (preferredVoice) utterance.voice = preferredVoice;

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}
