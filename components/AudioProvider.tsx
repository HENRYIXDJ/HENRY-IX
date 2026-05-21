'use client';

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { playClick, playLockoutBlip } from '@/lib/audioUtils';
import { trackWaveforms } from '@/app/trackWaveforms';

const formatTime = (secs: number) => {
  if (isNaN(secs) || secs === undefined) return "00:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getSessionImage = (title: string) => {
  if (!title) return '/knight-club-session-1.jpg';
  if (title.includes('Session 1')) return '/knight-club-session-1.jpg';
  if (title.includes('Session 2')) return '/knight-club-session-2.jpg';
  if (title.includes('Session 3')) return '/knight-club-session-3.jpg';
  if (title.includes('Session 4')) return '/knight-club-session-4.jpg';
  if (title.includes('Night 1')) return '/corner-new-cross-night-1.jpg';
  if (title.includes('Night 2')) return '/corner-new-cross-night-2.jpg';
  return '/knight-club-session-1.jpg';
};

const generateStaticPeaks = (num = 500): number[] => {
  const rawPeaks: number[] = [];
  const seed = 123;
  for (let i = 0; i < num; i++) {
    const progress = i / num;
    let envelope = 0.15;
    let transientFrequency = 8;
    let transientStrength = 0.4;
    let compressIntensity = 1.0;
    
    const introLen = 0.15;
    const breakdownStart = 0.48;
    const breakdownLen = 0.16;
    const secondDropStart = breakdownStart + breakdownLen;
    const outroStart = 0.90;
    
    if (progress < introLen) {
      envelope = 0.25;
      transientFrequency = 16;
      transientStrength = 0.65;
      compressIntensity = 0.4;
    } else if (progress < breakdownStart - 0.08) {
      envelope = 0.7;
      transientFrequency = 8;
      transientStrength = 0.35;
      compressIntensity = 1.0;
    } else if (progress < breakdownStart) {
      const buildProgress = (progress - (breakdownStart - 0.08)) / 0.08;
      envelope = 0.3 + 0.5 * buildProgress;
      transientFrequency = buildProgress > 0.75 ? 2 : buildProgress > 0.4 ? 4 : 8;
      transientStrength = 0.3 + 0.35 * buildProgress;
      compressIntensity = 0.6 + 0.4 * buildProgress;
    } else if (progress < secondDropStart - 0.08) {
      const breakProgress = (progress - breakdownStart) / (breakdownLen - 0.08);
      envelope = 0.18 + 0.12 * Math.sin(breakProgress * Math.PI);
      transientFrequency = 32;
      transientStrength = 0.15;
      compressIntensity = 0.3;
    } else if (progress < secondDropStart) {
      const buildProgress = (progress - (secondDropStart - 0.08)) / 0.08;
      envelope = 0.25 + 0.65 * buildProgress;
      transientFrequency = buildProgress > 0.8 ? 1 : buildProgress > 0.5 ? 2 : 4;
      transientStrength = 0.2 + 0.5 * buildProgress;
      compressIntensity = 0.5 + 0.5 * buildProgress;
    } else if (progress < outroStart) {
      envelope = 0.85;
      transientFrequency = 8;
      transientStrength = 0.25;
      compressIntensity = 1.2;
    } else {
      const outroProgress = (progress - outroStart) / (1 - outroStart);
      envelope = 0.4 * (1 - outroProgress) + 0.05;
      transientFrequency = 16;
      transientStrength = 0.5 * (1 - outroProgress);
      compressIntensity = 0.4 * (1 - outroProgress);
    }
    
    const t1 = Math.sin(i * 0.47 + seed) * 0.15;
    const t2 = Math.cos(i * 0.93 - seed) * 0.10;
    const t3 = Math.sin(i * 3.17) * 0.06;
    const t4 = Math.sin(i * 9.71) * 0.04;
    const spectralNoise = t1 + t2 + t3 + t4;
    
    const isKick = (i % transientFrequency === 0);
    const kickTransient = isKick ? (transientStrength + 0.08 * Math.sin(i * 1.3)) : 0.0;
    
    let value = (envelope + spectralNoise) * compressIntensity + kickTransient;
    
    const organicJitter = Math.sin(i * 0.015) * 0.05 + (Math.sin(i * 12.5) * 0.02);
    value += organicJitter;
    
    const compressed = value > 0.75 
      ? 0.75 + (value - 0.75) * 0.25 
      : value;
      
    rawPeaks.push(Math.max(0.02, Math.min(0.98, compressed)));
  }
  
  const smoothedPeaks: number[] = [];
  const windowSize = 3;
  for (let i = 0; i < num; i++) {
    let sum = 0;
    let count = 0;
    for (let w = -Math.floor(windowSize / 2); w <= Math.floor(windowSize / 2); w++) {
      const idx = i + w;
      if (idx >= 0 && idx < num) {
        sum += rawPeaks[idx];
        count++;
      }
    }
    smoothedPeaks.push(sum / count);
  }
  
  const maxVal = Math.max(...smoothedPeaks) || 1.0;
  return smoothedPeaks.map(p => p / maxVal);
};

export const AudioContext = createContext<any>(null);

export const useAudio = () => useContext(AudioContext);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [preloaderComplete, setPreloaderComplete] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioDSPInitialized, setAudioDSPInitialized] = useState(false);

  // Lock body scroll while preloader is active, and ensure we scroll/open on the Hero title
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!preloaderComplete) {
        document.body.style.overflow = 'hidden';
        window.scrollTo(0, 0);
      } else {
        document.body.style.overflow = '';
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  }, [preloaderComplete]);

  // 4-Deck state setup
  const [decks, setDecks] = useState<Record<number, any>>({
    1: {
      id: 'kc-1',
      title: 'Knight Club: Session 1',
      url: '/Knight Club Session 1 - Mastered High Quality.wav',
      link: 'https://soundcloud.com/henryixdj/knight-club-session-1',
      bpm: 145,
      isPlaying: false,
      isReady: false,
      scMode: false,
      pitch: 0,
      progress: 0,
      duration: 0,
      volume: 80,
      eqHi: 50,
      eqMid: 50,
      eqLow: 50,
      filter: 50,
      crossfaderAssign: 'L',
      waveformPeaks: trackWaveforms['kc-1']
    },
    2: {
      id: 'kc-2',
      title: 'Knight Club: Session 2',
      url: '/Knight Club Session 2 - Mastered.wav',
      link: 'https://soundcloud.com/henryixdj/knight-club-session-2',
      bpm: 152,
      isPlaying: false,
      isReady: false,
      scMode: false,
      pitch: 0,
      progress: 0,
      duration: 0,
      volume: 80,
      eqHi: 50,
      eqMid: 50,
      eqLow: 50,
      filter: 50,
      crossfaderAssign: 'L',
      waveformPeaks: trackWaveforms['kc-2']
    },
    3: {
      id: 'kc-3',
      title: 'Knight Club: Session 3',
      url: '/Knight Club-Session 3.wav',
      link: 'https://soundcloud.com/henryixdj/knight-club-session-3',
      bpm: 150,
      isPlaying: false,
      isReady: false,
      scMode: false,
      pitch: 0,
      progress: 0,
      duration: 0,
      volume: 80,
      eqHi: 50,
      eqMid: 50,
      eqLow: 50,
      filter: 50,
      crossfaderAssign: 'R',
      waveformPeaks: trackWaveforms['kc-3']
    },
    4: {
      id: 'kc-4',
      title: 'Knight Club: Session 4',
      url: '/Knight Club Session 4 - Remastered.wav',
      link: 'https://soundcloud.com/henryixdj/33baa30a-4980-40da-94c2-41085314ec43',
      bpm: 155,
      isPlaying: false,
      isReady: false,
      scMode: false,
      pitch: 0,
      progress: 0,
      duration: 0,
      volume: 80,
      eqHi: 50,
      eqMid: 50,
      eqLow: 50,
      filter: 50,
      crossfaderAssign: 'R',
      waveformPeaks: trackWaveforms['kc-4']
    }
  });

  const [crossfader, setCrossfader] = useState(50);
  const [leftActiveDeck, setLeftActiveDeck] = useState<1 | 2>(1);
  const [rightActiveDeck, setRightActiveDeck] = useState<3 | 4>(3);

  const iframeRef1 = useRef<HTMLIFrameElement>(null);
  const iframeRef2 = useRef<HTMLIFrameElement>(null);
  const iframeRef3 = useRef<HTMLIFrameElement>(null);
  const iframeRef4 = useRef<HTMLIFrameElement>(null);
  const widgetRefs = useRef<Record<number, any>>({});
  const loadedUrlsRef = useRef<Record<number, string>>({});

  // Web Audio persistent DSP routing nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterAnalyserRef = useRef<AnalyserNode | null>(null);
  const deckNodesRef = useRef<Record<number, {
    lowShelf: BiquadFilterNode;
    midPeak: BiquadFilterNode;
    highShelf: BiquadFilterNode;
    filterNode: BiquadFilterNode;
    gainNode: GainNode;
  }>>({});

  const audioElementsRef = useRef<Record<number, HTMLAudioElement | null>>({});
  const mediaSourcesRef = useRef<Record<number, MediaElementAudioSourceNode | null>>({});
  const playPendingRef = useRef<Record<number, boolean>>({ 1: false, 2: false, 3: false, 4: false });
  const scratchingRef = useRef<Record<number, boolean>>({ 1: false, 2: false, 3: false, 4: false });

  const initAudioDSP = () => {
    if (typeof window === 'undefined') return null;
    if (audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      return audioContextRef.current;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      setAudioDSPInitialized(true);
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Initialize global analyser node
      const masterAnalyser = ctx.createAnalyser();
      masterAnalyser.fftSize = 256;
      masterAnalyserRef.current = masterAnalyser;
      masterAnalyser.connect(ctx.destination);

      [1, 2, 3, 4].forEach((deckId) => {
        const lowShelf = ctx.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = 250;
        lowShelf.gain.value = 0;

        const midPeak = ctx.createBiquadFilter();
        midPeak.type = 'peaking';
        midPeak.frequency.value = 1000;
        midPeak.Q.value = 1.0;
        midPeak.gain.value = 0;

        const highShelf = ctx.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.value = 3000;
        highShelf.gain.value = 0;

        const filterNode = ctx.createBiquadFilter();
        filterNode.type = 'peaking';
        filterNode.frequency.value = 1000;
        filterNode.Q.value = 1.0;
        filterNode.gain.value = 0;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0;

        lowShelf.connect(midPeak);
        midPeak.connect(highShelf);
        highShelf.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(masterAnalyser);

        deckNodesRef.current[deckId] = {
          lowShelf,
          midPeak,
          highShelf,
          filterNode,
          gainNode
        };

        if (typeof window !== 'undefined') {
          const audio = new Audio();
          audio.crossOrigin = "anonymous";
          audio.loop = true;
          audio.preload = "auto";
          
          const defaultUrls: Record<number, string> = {
            1: '/Knight Club Session 1 - Mastered High Quality.wav',
            2: '/Knight Club Session 2 - Mastered.wav',
            3: '/Knight Club-Session 3.wav',
            4: '/Knight Club Session 4 - Remastered.wav'
          };
          const absoluteUrl = new URL(defaultUrls[deckId], window.location.origin).href;
          loadedUrlsRef.current[deckId] = defaultUrls[deckId];
          audio.src = absoluteUrl;
          audio.load();
          
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              audio.pause();
              audio.currentTime = 0;
            }).catch(() => {});
          }

          audioElementsRef.current[deckId] = audio;

          const source = ctx.createMediaElementSource(audio);
          source.connect(lowShelf);
          mediaSourcesRef.current[deckId] = source;

          audio.addEventListener('loadedmetadata', () => {
            setDecks((prev) => {
              if (!prev[deckId]) return prev;
              return {
                ...prev,
                [deckId]: {
                  ...prev[deckId],
                  duration: audio.duration,
                  isReady: true
                }
              };
            });
          });
        }
      });

      return ctx;
    } catch (e) {
      console.error("Failed to initialize Web Audio DSP:", e);
      return null;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).isMuted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    const loadSCWidgetAPI = () => {
      if (!(window as any).SC) {
        if (!document.querySelector('script[src="https://w.soundcloud.com/player/api.js"]')) {
          const script = document.createElement('script');
          script.src = 'https://w.soundcloud.com/player/api.js';
          script.onload = initPlayers;
          document.body.appendChild(script);
        } else {
          setTimeout(loadSCWidgetAPI, 100);
        }
      } else {
        initPlayers();
      }
    };

    const initPlayers = () => {
      if (!(window as any).SC) return;

      const initDeck = (deckId: number, iframeEl: HTMLIFrameElement | null) => {
        if (!iframeEl) return;
        const widget = (window as any).SC.Widget(iframeEl);
        widgetRefs.current[deckId] = widget;

        widget.bind((window as any).SC.Widget.Events.READY, () => {
          widget.getDuration((durationMs: number) => {
            setDecks((prev: any) => ({
              ...prev,
              [deckId]: { ...prev[deckId], isReady: true, scMode: true, duration: durationMs / 1000 }
            }));
          });
        });

        widget.bind((window as any).SC.Widget.Events.PLAY, () => {
          setDecks((prev: any) => ({
            ...prev,
            [deckId]: { ...prev[deckId], isPlaying: true, scMode: true }
          }));
        });

        widget.bind((window as any).SC.Widget.Events.PAUSE, () => {
          setDecks((prev: any) => ({
            ...prev,
            [deckId]: { ...prev[deckId], isPlaying: false }
          }));
        });
        
        widget.bind((window as any).SC.Widget.Events.FINISH, () => {
          setDecks((prev: any) => ({
            ...prev,
            [deckId]: { ...prev[deckId], isPlaying: false }
          }));
        });

        widget.bind((window as any).SC.Widget.Events.PLAY_PROGRESS, (data: any) => {
          setDecks((prev: any) => {
            const currentDur = prev[deckId].duration;
            const computedDur = (data.relativePosition > 0) ? (data.currentPosition / data.relativePosition / 1000) : currentDur;
            return {
              ...prev,
              [deckId]: {
                ...prev[deckId],
                progress: data.currentPosition / 1000,
                duration: currentDur || computedDur || 0,
                scMode: true
              }
            };
          });
        });
      };

      initDeck(1, iframeRef1.current);
      initDeck(2, iframeRef2.current);
      initDeck(3, iframeRef3.current);
      initDeck(4, iframeRef4.current);
    };

    loadSCWidgetAPI();
  }, []);

  useEffect(() => {
    let frameId: number;
    let lastUpdate = 0;

    const tick = () => {
      const now = performance.now();
      if (now - lastUpdate >= 100) {
        lastUpdate = now;
        
        [1, 2, 3, 4].forEach((deckId) => {
          const audio = audioElementsRef.current[deckId];
          if (audio && audio.src) {
            const timeStr = formatTime(audio.currentTime);
            const lcdEl = document.getElementById(`lcd-time-${deckId}`);
            if (lcdEl && lcdEl.innerText !== timeStr) {
               lcdEl.innerText = timeStr;
            }
          }
        });
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    [1, 2, 3, 4].forEach((deckId) => {
      const deck = decks[deckId];
      if (!deck) return;

      const audio = audioElementsRef.current[deckId];
      if (!deck.scMode && audio) {
        if (deck.url) {
          if (loadedUrlsRef.current[deckId] !== deck.url) {
            loadedUrlsRef.current[deckId] = deck.url;
            const absoluteUrl = deck.url.startsWith('blob:') || deck.url.startsWith('http')
              ? deck.url
              : new URL(deck.url, window.location.origin).href;
            
            audio.src = absoluteUrl;
            audio.load();
          }
        }

        if (deck.isPlaying) {
          const ctx = audioContextRef.current;
          if (ctx && ctx.state === 'suspended') {
            ctx.resume();
          }
          if (audio.paused && audio.src && !playPendingRef.current[deckId] && !scratchingRef.current[deckId]) {
            playPendingRef.current[deckId] = true;
            audio.play()
              .then(() => {
                playPendingRef.current[deckId] = false;
              })
              .catch((err) => {
                playPendingRef.current[deckId] = false;
                console.warn("HTML5 audio playback failed in effect:", err);
              });
          }
        } else {
          if (!audio.paused) {
            audio.pause();
          }
        }

        const targetRate = 1 + (deck.pitch || 0) / 100;
        if (Math.abs(audio.playbackRate - targetRate) > 0.005) {
          audio.playbackRate = targetRate;
        }
      } else if (deck.scMode && audio) {
        if (!audio.paused) {
          audio.pause();
        }
      }
    });
  }, [decks]);

  const estimateBPM = (buffer: AudioBuffer): number => {
    try {
      const data = buffer.getChannelData(0);
      const step = Math.floor(buffer.sampleRate / 10);
      let peaks = 0;
      let threshold = 0.6;
      for (let i = 0; i < data.length; i += step) {
        if (Math.abs(data[i]) > threshold) {
          peaks++;
        }
      }
      const durationMin = buffer.duration / 60;
      const bpm = Math.round(peaks / durationMin);
      if (bpm >= 80 && bpm <= 160) return bpm;
      return 128;
    } catch (e) {
      return 128;
    }
  };

  // --- IndexedDB Waveform Cache Helpers ---
  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error("window is undefined"));
        return;
      }
      const request = indexedDB.open('HenryIX_Waveforms', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('waveforms')) {
          db.createObjectStore('waveforms', { keyPath: 'fileKey' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const getCachedWaveform = async (fileKey: string): Promise<{ bpm: number, peaks: number[] } | null> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('waveforms', 'readonly');
        const store = transaction.objectStore('waveforms');
        const request = store.get(fileKey);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn("IndexedDB read error:", e);
      return null;
    }
  };

  const cacheWaveform = async (fileKey: string, data: { bpm: number, peaks: number[] }) => {
    try {
      const db = await openDB();
      const transaction = db.transaction('waveforms', 'readwrite');
      const store = transaction.objectStore('waveforms');
      store.put({ fileKey, ...data });
    } catch (e) {
      console.warn("IndexedDB write error:", e);
    }
  };

  const calculatePeaks = (buffer: AudioBuffer, numPeaks = 500): number[] => {
    const channelData = buffer.getChannelData(0);
    const step = Math.ceil(channelData.length / numPeaks);
    const peaks: number[] = [];
    for (let i = 0; i < numPeaks; i++) {
      const start = i * step;
      const end = Math.min(start + step, channelData.length);
      let max = 0;
      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      peaks.push(max);
    }
    const maxPeak = Math.max(...peaks) || 1.0;
    return peaks.map(p => Math.max(0.02, Math.min(0.98, p / maxPeak)));
  };

  const loadLocalFile = async (deckId: number, file: File) => {
    initAudioDSP();
    const audio = audioElementsRef.current[deckId];
    if (!audio) return;

    audio.pause();

    const objectUrl = URL.createObjectURL(file);
    loadedUrlsRef.current[deckId] = objectUrl;
    audio.src = objectUrl;
    audio.load();

    const fileKey = `${file.name}_${file.size}_${file.lastModified}`;

    // Set initial loading state with placeholder peaks
    setDecks(prev => ({
      ...prev,
      [deckId]: {
        ...prev[deckId],
        title: file.name.substring(0, 30),
        url: objectUrl,
        isReady: false,
        isPlaying: false,
        scMode: false,
        progress: 0,
        duration: 0,
        bpm: 128,
        waveformPeaks: generateStaticPeaks(500)
      }
    }));

    // Check IndexedDB cache first
    try {
      const cached = await getCachedWaveform(fileKey);
      if (cached) {
        setDecks(prev => ({
          ...prev,
          [deckId]: {
            ...prev[deckId],
            bpm: cached.bpm,
            waveformPeaks: cached.peaks
          }
        }));
        playClick(1100, 'sine', 0.1);
        return;
      }
    } catch (e) {
      console.warn("Error reading cache:", e);
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) return;
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        // 1. Calculate BPM
        const channelData = buffer.getChannelData(0);
        let bpmPeaks = [];
        let sum = 0;
        for (let i = 0; i < channelData.length; i+=100) sum += Math.abs(channelData[i]);
        const avg = sum / (channelData.length/100);
        const threshold = avg * 3.5;
        
        for (let i = 0; i < channelData.length; i++) {
          if (channelData[i] > threshold) {
            bpmPeaks.push(i);
            i += audioCtx.sampleRate / 4;
          }
        }
        
        const intervals = [];
        for (let i = 1; i < bpmPeaks.length; i++) {
          intervals.push(bpmPeaks[i] - bpmPeaks[i-1]);
        }
        
        const intervalCounts: Record<number, number> = {};
        intervals.forEach(interval => {
          const rounded = Math.round(interval / 1000) * 1000;
          intervalCounts[rounded] = (intervalCounts[rounded] || 0) + 1;
        });
        
        let maxCount = 0;
        let modeInterval = 0;
        for (const [interval, count] of Object.entries(intervalCounts)) {
          if (count > maxCount) {
            maxCount = count;
            modeInterval = Number(interval);
          }
        }
        
        let bpm = 128;
        if (modeInterval > 0) {
          bpm = Math.round(60 / (modeInterval / audioCtx.sampleRate));
          while (bpm < 90) bpm *= 2;
          while (bpm > 180) bpm /= 2;
          bpm = Math.round(bpm);
        }

        // 2. Calculate real peaks
        const peaks = calculatePeaks(buffer, 500);

        // Update deck state with calculated BPM and peaks
        setDecks(prev => ({
          ...prev,
          [deckId]: {
            ...prev[deckId],
            bpm: bpm,
            waveformPeaks: peaks
          }
        }));

        // Store inside IndexedDB for next time
        await cacheWaveform(fileKey, { bpm, peaks });

      } catch (err) {
        console.error("BPM/Waveform analysis err:", err);
      }
    };
    // Sliced load (4MB) to speed up calculation and prevent OOM on large uploads
    const fileSlice = file.slice(0, 4 * 1024 * 1024);
    reader.readAsArrayBuffer(fileSlice);
    
    playClick(1100, 'sine', 0.1);
  };

  const seekLocalBuffer = (deckId: number, seekTime: number) => {
    const audio = audioElementsRef.current[deckId];
    if (audio) {
      audio.currentTime = seekTime;
      setDecks((prev) => ({
        ...prev,
        [deckId]: {
          ...prev[deckId],
          progress: seekTime
        }
      }));
    }
  };

  useEffect(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    [1, 2, 3, 4].forEach((deckId) => {
      const deck = decks[deckId];
      const nodes = deckNodesRef.current[deckId];
      if (!deck || !nodes) return;

      const eqLow = deck.eqLow ?? 50;
      let lowGain = 0;
      if (eqLow < 50) {
        lowGain = -32 * (1 - eqLow / 50);
      } else {
        lowGain = 12 * ((eqLow - 50) / 50);
      }
      nodes.lowShelf.gain.setTargetAtTime(lowGain, ctx.currentTime, 0.015);

      const eqMid = deck.eqMid ?? 50;
      let midGain = 0;
      if (eqMid < 50) {
        midGain = -32 * (1 - eqMid / 50);
      } else {
        midGain = 10 * ((eqMid - 50) / 50);
      }
      nodes.midPeak.gain.setTargetAtTime(midGain, ctx.currentTime, 0.015);

      const eqHi = deck.eqHi ?? 50;
      let hiGain = 0;
      if (eqHi < 50) {
        hiGain = -32 * (1 - eqHi / 50);
      } else {
        hiGain = 10 * ((eqHi - 50) / 50);
      }
      nodes.highShelf.gain.setTargetAtTime(hiGain, ctx.currentTime, 0.015);

      const filter = deck.filter ?? 50;
      if (filter < 50) {
        nodes.filterNode.type = 'lowpass';
        const pct = filter / 50;
        const lpfFreq = 80 + (19920 * Math.pow(pct, 2.5));
        nodes.filterNode.frequency.setTargetAtTime(lpfFreq, ctx.currentTime, 0.015);
      } else if (filter > 50) {
        nodes.filterNode.type = 'highpass';
        const pct = (filter - 50) / 50;
        const hpfFreq = 15 + (5985 * Math.pow(pct, 2.5));
        nodes.filterNode.frequency.setTargetAtTime(hpfFreq, ctx.currentTime, 0.015);
      } else {
        nodes.filterNode.type = 'peaking';
        nodes.filterNode.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
      }

      const faderVol = deck.volume / 100;
      let assignMult = 1;
      if (deck.crossfaderAssign === 'L') {
        assignMult = crossfader <= 50 ? 1 : Math.max(0, 1 - (crossfader - 50) / 50);
      } else if (deck.crossfaderAssign === 'R') {
        assignMult = crossfader >= 50 ? 1 : Math.max(0, crossfader / 50);
      }

      const targetGain = isMuted ? 0 : faderVol * assignMult;
      nodes.gainNode.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.015);

      const widget = widgetRefs.current[deckId];
      if (widget && deck.isReady) {
        const targetVol = Math.round(deck.volume * assignMult);
        try {
          widget.setVolume(targetVol);
        } catch (e) {}
      }
    });
  }, [decks, crossfader, isMuted, audioDSPInitialized]);

  useEffect(() => {
    (window as any).togglePlayGlobal = (deckIdInput?: number) => {
      const activeDeck = [1, 2, 3, 4].map(id => decks[id]).find(d => d.isPlaying) || decks[leftActiveDeck] || decks[1];
      const deckId = deckIdInput !== undefined ? deckIdInput : ([1, 2, 3, 4].find(id => decks[id].id === activeDeck.id) || 1);
      const widget = widgetRefs.current[deckId];
      const deckObj = decks[deckId];
      if (!deckObj) return;
      const targetPlaying = !deckObj.isPlaying;

      if (deckObj.scMode && widget && deckObj.isReady) {
        try {
          targetPlaying ? widget.play() : widget.pause();
        } catch (e) {
          setDecks(prev => ({
            ...prev,
            [deckId]: { ...prev[deckId], isPlaying: targetPlaying }
          }));
        }
      } else {
        const audio = audioElementsRef.current[deckId];
        if (audio) {
          if (!audio.src) {
            const defaultUrls: Record<number, string> = {
              1: '/Knight Club Session 1 - Mastered High Quality.wav',
              2: '/Knight Club Session 2 - Mastered.wav',
              3: '/Knight Club-Session 3.wav',
              4: '/Knight Club Session 4 - Remastered.wav'
            };
            const absoluteUrl = new URL(defaultUrls[deckId], window.location.origin).href;
            audio.src = absoluteUrl;
            audio.load();
          }
          if (targetPlaying) {
            playPendingRef.current[deckId] = true;
            audio.play()
              .then(() => { playPendingRef.current[deckId] = false; })
              .catch((err) => {
                playPendingRef.current[deckId] = false;
                if (err.name !== 'AbortError') {
                  console.error("togglePlayGlobal play failed:", err);
                  setDecks(prev => ({
                    ...prev,
                    [deckId]: { ...prev[deckId], isPlaying: false }
                  }));
                }
              });
          } else {
            audio.pause();
          }
        }
        setDecks(prev => ({
          ...prev,
          [deckId]: { ...prev[deckId], isPlaying: targetPlaying }
        }));
      }
    };
    return () => {
      delete (window as any).togglePlayGlobal;
    };
  }, [decks, leftActiveDeck]);

  const playTrack = (track: any, targetDeckId?: number) => {
    let deckId: 1 | 2 | 3 | 4 = 1;
    if (targetDeckId !== undefined && (targetDeckId === 1 || targetDeckId === 2 || targetDeckId === 3 || targetDeckId === 4)) {
      deckId = targetDeckId;
    } else {
      if (track.id === 'kc-1') deckId = 1;
      else if (track.id === 'kc-2') deckId = 2;
      else if (track.id === 'kc-3') deckId = 3;
      else if (track.id === 'kc-4') deckId = 4;
      else if (track.id.startsWith('kc-')) deckId = 1;
      else if (track.id.startsWith('rc-')) deckId = 2;
      else if (track.id.startsWith('cnc-')) deckId = 3;
    }

    if (deckId === 1 || deckId === 2) {
      setLeftActiveDeck(deckId);
    } else {
      setRightActiveDeck(deckId);
    }

    const deck = decks[deckId];
    playClick(1000, 'sine', 0.04);

    const widget = widgetRefs.current[deckId];
    const isLocal = !!track.isLocalFile || (track.url && track.url.startsWith('/'));

    const ctx = initAudioDSP();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (deck.id === track.id) {
      const targetPlaying = !deck.isPlaying;
      if (deck.scMode && widget) {
        try {
          targetPlaying ? widget.play() : widget.pause();
        } catch (e) {
          setDecks(prev => ({
            ...prev,
            [deckId]: { ...prev[deckId], isPlaying: targetPlaying }
          }));
        }
      } else {
        const audio = audioElementsRef.current[deckId];
        if (audio) {
          if (!audio.src) {
            const defaultUrls: Record<number, string> = {
              1: '/Knight Club Session 1 - Mastered High Quality.wav',
              2: '/Knight Club Session 2 - Mastered.wav',
              3: '/Knight Club-Session 3.wav',
              4: '/Knight Club Session 4 - Remastered.wav'
            };
            const absoluteUrl = new URL(defaultUrls[deckId], window.location.origin).href;
            audio.src = absoluteUrl;
            audio.load();
          }
          if (targetPlaying) {
            playPendingRef.current[deckId] = true;
            audio.play()
              .then(() => { playPendingRef.current[deckId] = false; })
              .catch((err) => {
                playPendingRef.current[deckId] = false;
                if (err.name !== 'AbortError') {
                  console.error("PlayTrack play failed:", err);
                  setDecks(prev => ({
                    ...prev,
                    [deckId]: { ...prev[deckId], isPlaying: false }
                  }));
                }
              });
          } else {
            audio.pause();
          }
        }
        setDecks(prev => ({
          ...prev,
          [deckId]: { ...prev[deckId], isPlaying: targetPlaying }
        }));
      }
      return;
    }

    const audio = audioElementsRef.current[deckId];
    if (audio) {
      audio.pause();
    }
    if (widget) {
      try { widget.pause(); } catch (e) {}
    }

    if (isLocal) {
      if (audio) {
        const absoluteUrl = track.url.startsWith('blob:') || track.url.startsWith('http')
          ? track.url
          : new URL(track.url, window.location.origin).href;

        if (loadedUrlsRef.current[deckId] !== track.url) {
          loadedUrlsRef.current[deckId] = track.url;
          audio.src = absoluteUrl;
          audio.load();
        }
        
        playPendingRef.current[deckId] = true;
        audio.play()
          .then(() => { playPendingRef.current[deckId] = false; })
          .catch((err) => {
            playPendingRef.current[deckId] = false;
            if (err.name !== 'AbortError') {
              console.error("Local play failed:", err);
              setDecks(prev => ({
                ...prev,
                [deckId]: { ...prev[deckId], isPlaying: false }
              }));
            }
          });
      }

      setDecks(prev => ({
        ...prev,
        [deckId]: {
          ...prev[deckId],
          id: track.id,
          title: track.title,
          url: track.url,
          link: track.link,
          bpm: track.bpm,
          isPlaying: true,
          progress: 0,
          scMode: false,
          isReady: false,
          waveformPeaks: trackWaveforms[track.id] || generateStaticPeaks(500)
        }
      }));
    } else {
      setDecks(prev => ({
        ...prev,
        [deckId]: {
          ...prev[deckId],
          id: track.id,
          title: track.title,
          url: track.url,
          link: track.link,
          bpm: track.bpm,
          isPlaying: true,
          progress: 0,
          scMode: true,
          isReady: false,
          waveformPeaks: trackWaveforms[track.id] || generateStaticPeaks(500)
        }
      }));

      if (widget) {
        try {
          widget.load(track.url, {
            auto_play: true,
            hide_related: true,
            show_comments: false,
            show_user: false,
            show_reposts: false,
            visual: false
          });
        } catch (e) {}
      }
    }
  };

  const togglePlayGlobal = (deckId: number) => {
    const deck = decks[deckId];
    if (!deck) return;
    
    playClick(1000, 'sine', 0.03);
    const targetPlaying = !deck.isPlaying;
    
    const ctx = initAudioDSP();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    const widget = widgetRefs.current[deckId];
    if (deck.scMode && widget) {
      try {
        targetPlaying ? widget.play() : widget.pause();
      } catch (e) {
        setDecks((prev: any) => ({
          ...prev,
          [deckId]: { ...prev[deckId], isPlaying: targetPlaying }
        }));
      }
    } else {
      setDecks((prev: any) => ({
        ...prev,
        [deckId]: { ...prev[deckId], isPlaying: targetPlaying }
      }));
    }
  };

  const togglePlay = () => {
    const activeDeck = [1, 2, 3, 4].map(id => decks[id]).find(d => d.isPlaying) || decks[leftActiveDeck] || decks[1];
    const deckId = [1, 2, 3, 4].find(id => decks[id].id === activeDeck.id) || 1;
    const deck = decks[deckId];
    const widget = widgetRefs.current[deckId];
    
    playClick(1000, 'sine', 0.03);
    const targetPlaying = !deck.isPlaying;

    const ctx = initAudioDSP();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (deck.scMode && widget) {
      try {
        targetPlaying ? widget.play() : widget.pause();
      } catch (e) {
        setDecks((prev: any) => ({
          ...prev,
          [deckId]: { ...prev[deckId], isPlaying: targetPlaying }
        }));
      }
    } else {
      setDecks((prev: any) => ({
        ...prev,
        [deckId]: { ...prev[deckId], isPlaying: targetPlaying }
      }));
    }
  };

  // Synchronize OS lock screen media controls using Media Session API
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const activeDeckId = [1, 2, 3, 4].find(id => decks[id]?.isPlaying);
    const activeDeck = activeDeckId ? decks[activeDeckId] : null;

    if (activeDeck) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeDeck.title,
        artist: 'Henry IX',
        album: 'DJ Mix Archive',
        artwork: [
          {
            src: getSessionImage(activeDeck.title),
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      });

      navigator.mediaSession.playbackState = 'playing';
    } else {
      navigator.mediaSession.playbackState = 'paused';
    }
  }, [decks]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        const playingId = [1, 2, 3, 4].find(id => decks[id]?.isPlaying) || leftActiveDeck || 1;
        if ((window as any).togglePlayGlobal) {
          (window as any).togglePlayGlobal(playingId);
        }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        const playingId = [1, 2, 3, 4].find(id => decks[id]?.isPlaying) || leftActiveDeck || 1;
        if ((window as any).togglePlayGlobal) {
          (window as any).togglePlayGlobal(playingId);
        }
      });
    } catch (e) {
      console.warn("Failed to register MediaSession action handlers:", e);
    }
  }, [leftActiveDeck, decks]);

  const getActiveDeckInfo = () => {
    const activeDeck = [1, 2, 3, 4].map(id => decks[id]).find(d => d.isPlaying) || decks[leftActiveDeck] || decks[1];
    return {
      id: activeDeck.id,
      title: activeDeck.title,
      isPlaying: activeDeck.isPlaying,
      isReady: activeDeck.isReady,
      bpm: activeDeck.bpm,
      progress: activeDeck.progress,
      duration: activeDeck.duration
    };
  };

  const activeDeckInfo = getActiveDeckInfo();

  const contextValue = {
    isMuted, setIsMuted,
    preloaderComplete, setPreloaderComplete,
    audioDSPInitialized, setAudioDSPInitialized,
    decks, setDecks,
    crossfader, setCrossfader,
    leftActiveDeck, setLeftActiveDeck,
    rightActiveDeck, setRightActiveDeck,
    initAudioDSP, loadLocalFile, seekLocalBuffer,
    audioElementsRef, playPendingRef, scratchingRef, widgetRefs,
    togglePlayGlobal, togglePlay, playTrack, playLockoutBlip,
    estimateBPM, activeDeckInfo,
    get analyserNode() {
      return masterAnalyserRef.current;
    }
  };

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
      <FloatingPlayer />
      <iframe ref={iframeRef1} className="hidden" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/2129822499&auto_play=false" />
      <iframe ref={iframeRef2} className="hidden" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/2129822499&auto_play=false" />
      <iframe ref={iframeRef3} className="hidden" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/2129822499&auto_play=false" />
      <iframe ref={iframeRef4} className="hidden" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/2129822499&auto_play=false" />
    </AudioContext.Provider>
  );
}

export function FloatingPlayer() {
  const { decks, togglePlayGlobal, playTrack } = useAudio();
  const activeDecks = [1, 2, 3, 4].filter(id => decks[id] && decks[id].isPlaying);
  const loadedDecks = [1, 2, 3, 4].filter(id => decks[id] && decks[id].isReady);

  const displayDecks = activeDecks.length > 0 ? activeDecks : (loadedDecks.length > 0 ? [loadedDecks[0]] : []);

  if (displayDecks.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
      {displayDecks.map(deckId => {
        const deck = decks[deckId];
        return (
          <div key={deckId} className="flex items-center bg-zinc-950/95 backdrop-blur border border-zinc-800 p-2 rounded-full text-white shadow-lg shadow-black/50 overflow-hidden group">
            <div className="flex flex-col overflow-hidden whitespace-nowrap text-right w-[160px] pr-3">
              <span className="text-[9px] text-primary font-bold font-mono uppercase tracking-widest leading-tight">
                Deck {deckId}
              </span>
              <span className="text-xs font-bold tracking-wide text-zinc-300 truncate">
                {deck.title}
              </span>
            </div>
            <button 
              onClick={() => togglePlayGlobal ? togglePlayGlobal(deckId) : playTrack(deck, deckId)}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${deck.isPlaying ? 'bg-primary shadow-[0_0_8px_rgba(216,22,63,0.3)]' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            >
              {deck.isPlaying ? (
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
