/// <reference types="react-scripts" />

// Add type definitions for the Web Speech API
interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}