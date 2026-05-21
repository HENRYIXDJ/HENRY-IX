'use client';

import React, { useRef, useEffect, createContext, useContext, useMemo } from 'react';
import { playClick, playLockoutBlip } from '@/lib/audioUtils';
import { trackWaveforms } from '@/app/trackWaveforms';
import { useAudioStore, generateStaticPeaks } from '@/store/audioStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatTime = (secs: number) => {
  if (isNaN(secs) || secs === undefined) return '00:00';
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

// ---------------------------------------------------------------------------
// Context (for non-reactive data: refs, functions, analyserNode getter)
// ---------------------------------------------------------------------------

export const AudioContext = createContext<any>(null);
export const useAudio = () => useContext(AudioContext);

// ---------------------------------------------------------------------------
// AudioProvider
// ---------------------------------------------------------------------------

export function AudioProvider({ children }: { children: React.ReactNode }) {
  // ── Read/write Zustand store ────────────────────────────────────────────
  const {
    decks,
    setDeck,
    setDecks,
    crossfader,
    leftActiveDeck,
    rightActiveDeck,
    setLeftActiveDeck,
    setRightActiveDeck,
    isMuted,
    setIsMuted,
    setPreloaderComplete,
    setAudioDSPInitialized,
  } = useAudioStore();

  // ── Body scroll lock while preloader active ─────────────────────────────
  const { preloaderComplete } = useAudioStore();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!preloaderComplete) {
      document.body.style.overflow = 'hidden';
      window.scrollTo(0, 0);
    } else {
      document.body.style.overflow = '';
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [preloaderComplete]);

  // ── Web Audio persistent DSP routing nodes ──────────────────────────────
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
  const loadedUrlsRef = useRef<Record<number, string>>({});

  // ── SoundCloud: only mount iframes when a deck uses SC mode ────────────
  const iframeRefs = useRef<Record<number, HTMLIFrameElement | null>>({ 1: null, 2: null, 3: null, 4: null });
  const widgetRefs = useRef<Record<number, any>>({});
  const mountedIframeIds = useRef<Set<number>>(new Set());

  // Track which decks need an SC iframe (mount lazily)
  const [mountedDecks, setMountedDecks] = React.useState<number[]>([]);

  // Analysis Web Worker ref
  const analysisWorkerRef = useRef<Worker | null>(null);
  const workerCallbacksRef = useRef<Record<string, (result: any) => void>>({});

  // ── DSP Init ───────────────────────────────────────────────────────────
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
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const masterAnalyser = ctx.createAnalyser();
      masterAnalyser.fftSize = 256;
      masterAnalyserRef.current = masterAnalyser;
      masterAnalyser.connect(ctx.destination);

      [1, 2, 3, 4].forEach(deckId => {
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

        deckNodesRef.current[deckId] = { lowShelf, midPeak, highShelf, filterNode, gainNode };

        if (typeof window !== 'undefined') {
          const audio = new Audio();
          audio.crossOrigin = 'anonymous';
          audio.loop = true;
          audio.preload = 'auto';

          const defaultUrls: Record<number, string> = {
            1: '/Knight Club Session 1 - Mastered High Quality.wav',
            2: '/Knight Club Session 2 - Mastered.wav',
            3: '/Knight Club-Session 3.wav',
            4: '/Knight Club Session 4 - Remastered.wav',
          };
          const absoluteUrl = new URL(defaultUrls[deckId], window.location.origin).href;
          loadedUrlsRef.current[deckId] = defaultUrls[deckId];
          audio.src = absoluteUrl;
          audio.load();

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
          }

          audioElementsRef.current[deckId] = audio;

          const source = ctx.createMediaElementSource(audio);
          source.connect(lowShelf);
          mediaSourcesRef.current[deckId] = source;

          audio.addEventListener('loadedmetadata', () => {
            setDeck(deckId, { duration: audio.duration, isReady: true });
          });
        }
      });

      return ctx;
    } catch (e) {
      console.error('Failed to initialize Web Audio DSP:', e);
      return null;
    }
  };

  // ── Expose isMuted to non-React code (audioUtils) ──────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).isMuted = isMuted;
    }
  }, [isMuted]);

  // ── Lazy SoundCloud widget initialisation ───────────────────────────────
  const initSCWidget = (deckId: number) => {
    const iframeEl = iframeRefs.current[deckId];
    if (!iframeEl) return;
    if (widgetRefs.current[deckId]) return; // already bound

    const SC = (window as any).SC;
    if (!SC) return;

    const widget = SC.Widget(iframeEl);
    widgetRefs.current[deckId] = widget;

    widget.bind(SC.Widget.Events.READY, () => {
      widget.getDuration((durationMs: number) => {
        setDeck(deckId, { isReady: true, scMode: true, duration: durationMs / 1000 });
      });
    });
    widget.bind(SC.Widget.Events.PLAY, () => {
      setDeck(deckId, { isPlaying: true, scMode: true });
    });
    widget.bind(SC.Widget.Events.PAUSE, () => {
      setDeck(deckId, { isPlaying: false });
    });
    widget.bind(SC.Widget.Events.FINISH, () => {
      setDeck(deckId, { isPlaying: false });
    });
    widget.bind(SC.Widget.Events.PLAY_PROGRESS, (data: any) => {
      const currentDur = useAudioStore.getState().decks[deckId]?.duration ?? 0;
      const computedDur = data.relativePosition > 0
        ? data.currentPosition / data.relativePosition / 1000
        : currentDur;
      setDeck(deckId, {
        progress: data.currentPosition / 1000,
        duration: currentDur || computedDur || 0,
        scMode: true,
      });
    });
  };

  // Load SC widget API once on mount, then init any already-mounted iframes
  useEffect(() => {
    const loadAndInit = () => {
      if ((window as any).SC) {
        mountedDecks.forEach(id => initSCWidget(id));
      } else if (!document.querySelector('script[src="https://w.soundcloud.com/player/api.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://w.soundcloud.com/player/api.js';
        script.onload = () => mountedDecks.forEach(id => initSCWidget(id));
        document.body.appendChild(script);
      } else {
        setTimeout(loadAndInit, 100);
      }
    };
    loadAndInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountedDecks]);

  // ── DOM-only LCD time display (avoids React state for 60fps counter) ────
  useEffect(() => {
    let frameId: number;
    let lastUpdate = 0;
    const tick = () => {
      const now = performance.now();
      if (now - lastUpdate >= 100) {
        lastUpdate = now;
        [1, 2, 3, 4].forEach(deckId => {
          const audio = audioElementsRef.current[deckId];
          if (audio && audio.src) {
            const timeStr = formatTime(audio.currentTime);
            const lcdEl = document.getElementById(`lcd-time-${deckId}`);
            if (lcdEl && lcdEl.innerText !== timeStr) lcdEl.innerText = timeStr;
          }
        });
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // ── HTML5 audio sync effect ─────────────────────────────────────────────
  useEffect(() => {
    [1, 2, 3, 4].forEach(deckId => {
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
          if (ctx && ctx.state === 'suspended') ctx.resume();
          if (audio.paused && audio.src && !playPendingRef.current[deckId] && !scratchingRef.current[deckId]) {
            playPendingRef.current[deckId] = true;
            audio.play()
              .then(() => { playPendingRef.current[deckId] = false; })
              .catch(err => {
                playPendingRef.current[deckId] = false;
                console.warn('HTML5 audio playback failed:', err);
              });
          }
        } else {
          if (!audio.paused) audio.pause();
        }

        const targetRate = 1 + (deck.pitch || 0) / 100;
        if (Math.abs(audio.playbackRate - targetRate) > 0.005) {
          audio.playbackRate = targetRate;
        }
      } else if (deck.scMode && audio) {
        if (!audio.paused) audio.pause();
      }
    });
  }, [decks]);

  // ── EQ / Filter / Gain DSP sync ─────────────────────────────────────────
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    [1, 2, 3, 4].forEach(deckId => {
      const deck = decks[deckId];
      const nodes = deckNodesRef.current[deckId];
      if (!deck || !nodes) return;

      const eqLow = deck.eqLow ?? 50;
      const lowGain = eqLow < 50 ? -32 * (1 - eqLow / 50) : 12 * ((eqLow - 50) / 50);
      nodes.lowShelf.gain.setTargetAtTime(lowGain, ctx.currentTime, 0.015);

      const eqMid = deck.eqMid ?? 50;
      const midGain = eqMid < 50 ? -32 * (1 - eqMid / 50) : 10 * ((eqMid - 50) / 50);
      nodes.midPeak.gain.setTargetAtTime(midGain, ctx.currentTime, 0.015);

      const eqHi = deck.eqHi ?? 50;
      const hiGain = eqHi < 50 ? -32 * (1 - eqHi / 50) : 10 * ((eqHi - 50) / 50);
      nodes.highShelf.gain.setTargetAtTime(hiGain, ctx.currentTime, 0.015);

      const filter = deck.filter ?? 50;
      if (filter < 50) {
        nodes.filterNode.type = 'lowpass';
        const pct = filter / 50;
        nodes.filterNode.frequency.setTargetAtTime(80 + 19920 * Math.pow(pct, 2.5), ctx.currentTime, 0.015);
      } else if (filter > 50) {
        nodes.filterNode.type = 'highpass';
        const pct = (filter - 50) / 50;
        nodes.filterNode.frequency.setTargetAtTime(15 + 5985 * Math.pow(pct, 2.5), ctx.currentTime, 0.015);
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
        try { widget.setVolume(Math.round(deck.volume * assignMult)); } catch (e) {}
      }
    });
  }, [decks, crossfader, isMuted]);

  // ── Global togglePlayGlobal (window binding for MediaSession) ───────────
  useEffect(() => {
    (window as any).togglePlayGlobal = (deckIdInput?: number) => {
      const { decks: d, leftActiveDeck: lad } = useAudioStore.getState();
      const activeDeck = [1, 2, 3, 4].map(id => d[id]).find(dk => dk.isPlaying) || d[lad] || d[1];
      const deckId = deckIdInput !== undefined ? deckIdInput : ([1, 2, 3, 4].find(id => d[id].id === activeDeck.id) || 1);
      const deckObj = d[deckId];
      if (!deckObj) return;
      const targetPlaying = !deckObj.isPlaying;

      const widget = widgetRefs.current[deckId];
      if (deckObj.scMode && widget && deckObj.isReady) {
        try { targetPlaying ? widget.play() : widget.pause(); } catch (e) {
          setDeck(deckId, { isPlaying: targetPlaying });
        }
      } else {
        const audio = audioElementsRef.current[deckId];
        if (audio) {
          if (!audio.src) {
            const defaultUrls: Record<number, string> = {
              1: '/Knight Club Session 1 - Mastered High Quality.wav',
              2: '/Knight Club Session 2 - Mastered.wav',
              3: '/Knight Club-Session 3.wav',
              4: '/Knight Club Session 4 - Remastered.wav',
            };
            audio.src = new URL(defaultUrls[deckId], window.location.origin).href;
            audio.load();
          }
          if (targetPlaying) {
            playPendingRef.current[deckId] = true;
            audio.play()
              .then(() => { playPendingRef.current[deckId] = false; })
              .catch(err => {
                playPendingRef.current[deckId] = false;
                if (err.name !== 'AbortError') setDeck(deckId, { isPlaying: false });
              });
          } else {
            audio.pause();
          }
        }
        setDeck(deckId, { isPlaying: targetPlaying });
      }
    };
    return () => { delete (window as any).togglePlayGlobal; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── MediaSession API ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    const activeDeckId = [1, 2, 3, 4].find(id => decks[id]?.isPlaying);
    const activeDeck = activeDeckId ? decks[activeDeckId] : null;
    if (activeDeck) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeDeck.title, artist: 'Henry IX', album: 'DJ Mix Archive',
        artwork: [{ src: getSessionImage(activeDeck.title), sizes: '512x512', type: 'image/jpeg' }],
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
        const { decks: d, leftActiveDeck: lad } = useAudioStore.getState();
        const playingId = [1, 2, 3, 4].find(id => d[id]?.isPlaying) || lad || 1;
        (window as any).togglePlayGlobal?.(playingId);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        const { decks: d, leftActiveDeck: lad } = useAudioStore.getState();
        const playingId = [1, 2, 3, 4].find(id => d[id]?.isPlaying) || lad || 1;
        (window as any).togglePlayGlobal?.(playingId);
      });
    } catch (e) { console.warn('MediaSession action handler error:', e); }
  }, []);

  // ── togglePlayGlobal (React-accessible version) ─────────────────────────
  const togglePlayGlobal = (deckId: number) => {
    const deck = decks[deckId];
    if (!deck) return;
    playClick(1000, 'sine', 0.03);
    const targetPlaying = !deck.isPlaying;
    const ctx = initAudioDSP();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    const widget = widgetRefs.current[deckId];
    if (deck.scMode && widget) {
      try { targetPlaying ? widget.play() : widget.pause(); } catch (e) {
        setDeck(deckId, { isPlaying: targetPlaying });
      }
    } else {
      setDeck(deckId, { isPlaying: targetPlaying });
    }
  };

  const togglePlay = () => {
    const { decks: d, leftActiveDeck: lad } = useAudioStore.getState();
    const activeDeck = [1, 2, 3, 4].map(id => d[id]).find(dk => dk.isPlaying) || d[lad] || d[1];
    const deckId = [1, 2, 3, 4].find(id => d[id].id === activeDeck.id) || 1;
    togglePlayGlobal(deckId);
  };

  // ── playTrack ─────────────────────────────────────────────────────────
  const playTrack = (track: any, targetDeckId?: number) => {
    let deckId: 1 | 2 | 3 | 4 = 1;
    if (targetDeckId && [1, 2, 3, 4].includes(targetDeckId)) {
      deckId = targetDeckId as 1 | 2 | 3 | 4;
    } else {
      if (track.id === 'kc-1') deckId = 1;
      else if (track.id === 'kc-2') deckId = 2;
      else if (track.id === 'kc-3') deckId = 3;
      else if (track.id === 'kc-4') deckId = 4;
      else if (track.id.startsWith('rc-')) deckId = 2;
      else if (track.id.startsWith('cnc-')) deckId = 3;
    }

    if (deckId === 1 || deckId === 2) setLeftActiveDeck(deckId as 1 | 2);
    else setRightActiveDeck(deckId as 3 | 4);

    playClick(1000, 'sine', 0.04);
    const ctx = initAudioDSP();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});

    const deck = decks[deckId];
    const widget = widgetRefs.current[deckId];
    const isLocal = !!track.isLocalFile || (track.url && track.url.startsWith('/'));

    // Toggle if same track
    if (deck.id === track.id) {
      const targetPlaying = !deck.isPlaying;
      if (deck.scMode && widget) {
        try { targetPlaying ? widget.play() : widget.pause(); } catch (e) {
          setDeck(deckId, { isPlaying: targetPlaying });
        }
      } else {
        const audio = audioElementsRef.current[deckId];
        if (audio) {
          if (targetPlaying) {
            playPendingRef.current[deckId] = true;
            audio.play()
              .then(() => { playPendingRef.current[deckId] = false; })
              .catch(err => {
                playPendingRef.current[deckId] = false;
                if (err.name !== 'AbortError') setDeck(deckId, { isPlaying: false });
              });
          } else {
            audio.pause();
          }
        }
        setDeck(deckId, { isPlaying: targetPlaying });
      }
      return;
    }

    // Switch to new track
    const audio = audioElementsRef.current[deckId];
    if (audio) audio.pause();
    if (widget) { try { widget.pause(); } catch (e) {} }

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
          .catch(err => {
            playPendingRef.current[deckId] = false;
            if (err.name !== 'AbortError') setDeck(deckId, { isPlaying: false });
          });
      }
      setDeck(deckId, {
        id: track.id, title: track.title, url: track.url, link: track.link,
        bpm: track.bpm, isPlaying: true, progress: 0, scMode: false, isReady: false,
        waveformPeaks: trackWaveforms[track.id] || generateStaticPeaks(500),
      });
    } else {
      // SoundCloud mode — lazily mount iframe if not yet done
      if (!mountedIframeIds.current.has(deckId)) {
        mountedIframeIds.current.add(deckId);
        setMountedDecks(prev => [...prev, deckId]);
      }
      setDeck(deckId, {
        id: track.id, title: track.title, url: track.url, link: track.link,
        bpm: track.bpm, isPlaying: true, progress: 0, scMode: true, isReady: false,
        waveformPeaks: trackWaveforms[track.id] || generateStaticPeaks(500),
      });
      if (widget) {
        try {
          widget.load(track.url, {
            auto_play: true, hide_related: true, show_comments: false,
            show_user: false, show_reposts: false, visual: false,
          });
        } catch (e) {}
      }
    }
  };

  // ── loadLocalFile (via Web Worker) ─────────────────────────────────────
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

    // Show loading state immediately with placeholder peaks
    setDeck(deckId, {
      title: file.name.substring(0, 30), url: objectUrl,
      isReady: false, isPlaying: false, scMode: false,
      progress: 0, duration: 0, bpm: 128,
      waveformPeaks: generateStaticPeaks(500),
    });

    // Check IndexedDB cache first
    try {
      const cached = await getCachedWaveform(fileKey);
      if (cached) {
        setDeck(deckId, { bpm: cached.bpm, waveformPeaks: cached.peaks });
        playClick(1100, 'sine', 0.1);
        return;
      }
    } catch (e) { console.warn('Cache read error:', e); }

    // Spin up Web Worker for analysis (non-blocking)
    try {
      if (!analysisWorkerRef.current) {
        analysisWorkerRef.current = new Worker('/workers/audioAnalysis.worker.js');
        analysisWorkerRef.current.onmessage = (e: MessageEvent) => {
          const { bpm, peaks, fileKey: fk, error } = e.data;
          const cb = workerCallbacksRef.current[fk];
          if (cb) { cb({ bpm, peaks, error }); delete workerCallbacksRef.current[fk]; }
        };
      }

      const slicedBuffer = await file.slice(0, 4 * 1024 * 1024).arrayBuffer();

      workerCallbacksRef.current[fileKey] = async ({ bpm, peaks, error }: any) => {
        if (error) { console.error('Analysis worker error:', error); return; }
        setDeck(deckId, { bpm, waveformPeaks: peaks });
        await cacheWaveform(fileKey, { bpm, peaks });
      };

      // Transfer the ArrayBuffer to the worker (zero-copy)
      analysisWorkerRef.current.postMessage({ buffer: slicedBuffer, fileKey, numPeaks: 500 }, [slicedBuffer]);
    } catch (err) {
      console.error('Failed to spawn analysis worker:', err);
    }

    playClick(1100, 'sine', 0.1);
  };

  // ── seekLocalBuffer ───────────────────────────────────────────────────
  const seekLocalBuffer = (deckId: number, seekTime: number) => {
    const audio = audioElementsRef.current[deckId];
    if (audio) {
      audio.currentTime = seekTime;
      setDeck(deckId, { progress: seekTime });
    }
  };

  // ── estimateBPM (kept for backward compat, runs on main thread) ────────
  const estimateBPM = (buffer: AudioBuffer): number => {
    try {
      const data = buffer.getChannelData(0);
      const step = Math.floor(buffer.sampleRate / 10);
      let peaks = 0;
      for (let i = 0; i < data.length; i += step) {
        if (Math.abs(data[i]) > 0.6) peaks++;
      }
      const bpm = Math.round(peaks / (buffer.duration / 60));
      return bpm >= 80 && bpm <= 160 ? bpm : 128;
    } catch (e) { return 128; }
  };

  // ── activeDeckInfo (derived — always fresh from store) ─────────────────
  const activeDeckInfo = (() => {
    const activeDeckId = [1, 2, 3, 4].find(id => decks[id]?.isPlaying);
    const activeDeck = activeDeckId ? decks[activeDeckId] : decks[leftActiveDeck] ?? decks[1];
    return {
      id: activeDeck.id, title: activeDeck.title, isPlaying: activeDeck.isPlaying,
      isReady: activeDeck.isReady, bpm: activeDeck.bpm,
      progress: activeDeck.progress, duration: activeDeck.duration,
    };
  })();

  // ── Context value — useMemo so non-reactive data doesn't cascade ────────
  const contextValue = useMemo(() => ({
    // Stable refs — never cause re-renders
    audioElementsRef, playPendingRef, scratchingRef, widgetRefs,
    // Stable functions
    initAudioDSP, loadLocalFile, seekLocalBuffer,
    togglePlayGlobal, togglePlay, playTrack, playLockoutBlip, estimateBPM,
    // Lightweight UI state (rarely changes)
    isMuted, setIsMuted,
    preloaderComplete, setPreloaderComplete,
    // Deck state — now read from Zustand directly by consumers,
    // but exposed here for legacy compatibility
    decks, setDecks,
    crossfader,
    setCrossfader: useAudioStore.getState().setCrossfader,
    leftActiveDeck, setLeftActiveDeck,
    rightActiveDeck, setRightActiveDeck,
    activeDeckInfo,
    // AnalyserNode getter
    get analyserNode() { return masterAnalyserRef.current; },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isMuted, preloaderComplete]);
  // NOTE: deck/crossfader/activeDeck state is intentionally excluded from memo deps —
  // components that need reactive deck updates should subscribe via useAudioStore() directly.

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
      <FloatingPlayer />
      {/* Lazy SoundCloud iframes — only mounted when deck enters SC mode */}
      {[1, 2, 3, 4].map(deckId =>
        mountedDecks.includes(deckId) ? (
          <iframe
            key={deckId}
            ref={el => { iframeRefs.current[deckId] = el; }}
            className="hidden"
            src={`https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/2129822499&auto_play=false`}
            allow="autoplay"
          />
        ) : null
      )}
    </AudioContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// IndexedDB helpers (moved here from provider, keeping them co-located)
// ---------------------------------------------------------------------------

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('window is undefined')); return; }
    const request = indexedDB.open('HenryIX_Waveforms', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('waveforms')) {
        request.result.createObjectStore('waveforms', { keyPath: 'fileKey' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getCachedWaveform = async (fileKey: string): Promise<{ bpm: number; peaks: number[] } | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction('waveforms', 'readonly').objectStore('waveforms').get(fileKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { console.warn('IndexedDB read error:', e); return null; }
};

const cacheWaveform = async (fileKey: string, data: { bpm: number; peaks: number[] }) => {
  try {
    const db = await openDB();
    db.transaction('waveforms', 'readwrite').objectStore('waveforms').put({ fileKey, ...data });
  } catch (e) { console.warn('IndexedDB write error:', e); }
};

// ---------------------------------------------------------------------------
// FloatingPlayer
// ---------------------------------------------------------------------------

export function FloatingPlayer() {
  const decks = useAudioStore(s => s.decks);
  const { togglePlayGlobal, playTrack } = useAudio() ?? {};

  const activeDecks = [1, 2, 3, 4].filter(id => decks[id]?.isPlaying);
  const loadedDecks = [1, 2, 3, 4].filter(id => decks[id]?.isReady);
  const displayDecks = activeDecks.length > 0 ? activeDecks : loadedDecks.length > 0 ? [loadedDecks[0]] : [];

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
              <span className="text-xs font-bold tracking-wide text-zinc-300 truncate">{deck.title}</span>
            </div>
            <button
              onClick={() => togglePlayGlobal ? togglePlayGlobal(deckId) : playTrack?.(deck, deckId)}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${
                deck.isPlaying ? 'bg-primary shadow-[0_0_8px_rgba(216,22,63,0.3)]' : 'bg-zinc-800 hover:bg-zinc-700'
              }`}
            >
              {deck.isPlaying ? (
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              ) : (
                <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
