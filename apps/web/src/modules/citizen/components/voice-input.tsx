'use client';

import { Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** Dictation for people who find typing hard. Renders nothing where the browser cannot listen. */
export function VoiceInput({
  locale,
  onText,
  labels,
}: {
  locale: string;
  onText: (text: string) => void;
  labels: { start: string; stop: string; hint: string };
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(recognitionConstructor() !== null);
    return () => recognition.current?.stop();
  }, []);

  if (!supported) return null;

  function start() {
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    const instance = new Constructor();
    instance.lang = locale === 'hi' ? 'hi-IN' : 'en-IN';
    instance.interimResults = false;
    instance.continuous = true;
    instance.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last?.[0]?.transcript.trim();
      if (text) onText(text);
    };
    instance.onend = () => setListening(false);
    instance.onerror = () => setListening(false);
    recognition.current = instance;
    instance.start();
    setListening(true);
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-pressed={listening}
        onClick={() => (listening ? recognition.current?.stop() : start())}
      >
        {listening ? (
          <MicOff aria-hidden className="h-4 w-4" />
        ) : (
          <Mic aria-hidden className="h-4 w-4" />
        )}
        {listening ? labels.stop : labels.start}
      </Button>
      <span className="text-subtle text-xs">{labels.hint}</span>
    </div>
  );
}
