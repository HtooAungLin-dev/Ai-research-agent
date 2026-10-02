import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  FastForward,
  Sparkles,
  Headphones,
  Check,
} from 'lucide-react';
import { ResearchJob } from '../types/research';

interface AudioBriefingPlayerProps {
  job: ResearchJob;
}

export const AudioBriefingPlayer: React.FC<AudioBriefingPlayerProps> = ({ job }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [currentSentence, setCurrentSentence] = useState<string>('');
  const [progressPct, setProgressPct] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textSentencesRef = useRef<string[]>([]);
  const currentSentenceIdxRef = useRef<number>(0);

  // Prepare briefing text (extract Executive Summary or top sections without markdown symbols)
  const prepareBriefingText = (): string => {
    const raw = job.finalMarkdown || job.currentAction || '';
    // Remove markdown symbols, headers, links
    return raw
      .replace(/#+\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[\d+\]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/`{1,3}.*?`{1,3}/g, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .slice(0, 3500); // Focused 2-3 minute executive summary
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const handleStartBriefing = () => {
    if (!synthRef.current) return;

    if (isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    synthRef.current.cancel();

    const fullText = prepareBriefingText();
    // Split into sentences for progress tracking
    const sentences = fullText
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    textSentencesRef.current = sentences;
    currentSentenceIdxRef.current = 0;

    if (sentences.length === 0) return;

    speakSentence(0);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const speakSentence = (index: number) => {
    if (!synthRef.current || index >= textSentencesRef.current.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setProgressPct(100);
      setCurrentSentence('Briefing concluded.');
      return;
    }

    currentSentenceIdxRef.current = index;
    const sentence = textSentencesRef.current[index];
    setCurrentSentence(sentence);
    setProgressPct(Math.round(((index + 1) / textSentencesRef.current.length) * 100));

    const utterance = new SpeechSynthesisUtterance(sentence);
    utteranceRef.current = utterance;
    utterance.rate = playbackRate;
    utterance.volume = isMuted ? 0 : 1;

    // Pick a natural English voice if available
    const voices = synthRef.current.getVoices();
    const naturalVoice =
      voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))) ||
      voices.find((v) => v.lang.startsWith('en'));
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => {
      speakSentence(index + 1);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    synthRef.current.speak(utterance);
  };

  const handlePause = () => {
    if (synthRef.current && isPlaying) {
      synthRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSentence('');
      setProgressPct(0);
      currentSentenceIdxRef.current = 0;
    }
  };

  const handleRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
    if (isPlaying) {
      // Re-trigger current sentence with updated rate
      if (synthRef.current) {
        synthRef.current.cancel();
        speakSentence(currentSentenceIdxRef.current);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    if (utteranceRef.current) {
      utteranceRef.current.volume = isMuted ? 1 : 0;
    }
  };

  return (
    <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/30 via-slate-900/90 to-indigo-950/30 border border-purple-500/30 shadow-lg">
      <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Headphones className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Executive Audio Briefing
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Zero-Cost TTS
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Listen to the autonomous research summary & synthesis in real-time
            </p>
          </div>
        </div>

        {/* Playback Speed Toggles */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-[10px]">
          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => handleRateChange(rate)}
              className={`px-2 py-0.5 rounded-md font-mono transition-colors ${
                playbackRate === rate
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Spoken sentence & Animated soundbars */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 mb-2.5 min-h-[46px]">
        {/* Animated wave bars */}
        <div className="flex items-center gap-0.5 h-4 shrink-0">
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              className={`w-1 rounded-full bg-purple-400 transition-all duration-300 ${
                isPlaying
                  ? 'animate-pulse'
                  : 'h-1 opacity-40'
              }`}
              style={{
                height: isPlaying ? `${Math.sin(bar * 1.5) * 10 + 12}px` : '4px',
                animationDelay: `${bar * 120}ms`,
              }}
            />
          ))}
        </div>

        <p className="text-[11px] text-slate-300 leading-snug line-clamp-2 italic flex-1">
          {currentSentence || 'Press Play to hear the synthesized executive intelligence summary.'}
        </p>
      </div>

      {/* Progress bar and audio controls */}
      <div className="flex items-center justify-between gap-3">
        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
            {progressPct}%
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-purple-300" />}
          </button>

          {isPlaying ? (
            <button
              onClick={handlePause}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={handleStartBriefing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/40 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isPaused ? 'Resume' : 'Play Audio'}</span>
            </button>
          )}

          {(isPlaying || isPaused) && (
            <button
              onClick={handleStop}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 hover:text-rose-400 text-slate-400 border border-slate-700/80 transition-colors"
              title="Stop Audio"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
