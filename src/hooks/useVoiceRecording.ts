import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Status } from '../types';
import { translateError } from '../lib/errorUtils';

export function useVoiceRecording(
  onTranscript: (transcript: string) => void,
  setStatus: (status: Status | null) => void
) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const noSpeechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setIsRecordingSync = (val: boolean) => {
    isRecordingRef.current = val;
    setIsRecording(val);
  };

  useEffect(() => {
    return () => {
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
      }
      recognitionRef.current?.stop();
    };
  }, []);

  const stopVoice = () => {
    isPausedRef.current = false;
    setIsPaused(false);
    setIsRecordingSync(false);
    recognitionRef.current?.stop();
    setStatus(null);
  };

  const pauseVoice = () => {
    isPausedRef.current = true;
    setIsPaused(true);
    recognitionRef.current?.stop();
    setStatus(null);
  };

  const toggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus({ type: 'error', message: translateError('Voice recognition not supported in this browser.') });
      return;
    }

    if (isPaused) {
      setIsPaused(false);
      isPausedRef.current = false;
      recognitionRef.current?.start();
      setIsRecordingSync(true);
      setStatus({ type: 'loading', message: 'Listening...' });
      return;
    }

    recognitionRef.current?.stop();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'my-MM';
    recognition.maxAlternatives = 1;

    recognition.onaudiostart = () => {
      if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (isRecordingRef.current && !isPausedRef.current) {
          stopVoice();
          setStatus({ type: 'error', message: translateError('No speech detected for 5 seconds. Auto-stopped.') });
        }
      }, 5000);
    };

    recognition.onspeechstart = () => {
      if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
    };

    recognition.onspeechend = () => {
      if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (isRecordingRef.current && !isPausedRef.current) {
          stopVoice();
          setStatus({ type: 'error', message: translateError('No speech detected for 5 seconds. Auto-stopped.') });
        }
      }, 5000);
    };

    recognition.onnomatch = () => {
      if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (isRecordingRef.current && !isPausedRef.current) {
          stopVoice();
          setStatus({ type: 'error', message: translateError('No speech detected for 5 seconds. Auto-stopped.') });
        }
      }, 5000);
    };

    recognition.onstart = () => {
      setIsRecordingSync(true);
      setStatus({ type: 'loading', message: 'Listening...' });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setStatus(null);
      if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (isRecordingRef.current && !isPausedRef.current) {
          stopVoice();
          setStatus({ type: 'error', message: translateError('No speech detected for 5 seconds. Auto-stopped.') });
        }
      }, 5000);
    };

    recognition.onerror = (event: any) => {
      if (isPausedRef.current) return;
      let msg = 'Voice recognition failed.';
      if (event.error === 'not-allowed') msg = 'Microphone access denied. Please allow microphone permission.';
      if (event.error === 'no-speech') msg = 'No speech detected. Please try again.';
      const translatedMsg = translateError(msg);
      toast.error(translatedMsg);
      setStatus({ type: 'error', message: translatedMsg });
      if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
    };

    recognition.onend = () => {
      if (!isPausedRef.current) {
        setIsRecordingSync(false);
        setIsPaused(false);
      }
      if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return { isRecording, isPaused, toggleVoice, pauseVoice, stopVoice };
}