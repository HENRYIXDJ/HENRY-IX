/**
 * audioAnalysis.worker.js
 *
 * Runs BPM detection + waveform peak extraction in a background thread.
 * The main thread sends:   { buffer: ArrayBuffer, fileKey: string, numPeaks: number }
 * This worker posts back:  { bpm: number, peaks: number[], fileKey: string }
 *                       or { error: string, fileKey: string }
 */

/* eslint-disable no-restricted-globals */
self.onmessage = async function (e) {
  const { buffer, fileKey, numPeaks = 500 } = e.data;

  try {
    // OfflineAudioContext decodes the ArrayBuffer without a real audio device
    const offlineCtx = new OfflineAudioContext(1, 1, 44100);
    const audioBuffer = await offlineCtx.decodeAudioData(buffer);

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // ── 1. BPM DETECTION ──────────────────────────────────────────────────
    let sum = 0;
    for (let i = 0; i < channelData.length; i += 100) {
      sum += Math.abs(channelData[i]);
    }
    const avg = sum / (channelData.length / 100);
    const threshold = avg * 3.5;

    const bpmPeaks = [];
    for (let i = 0; i < channelData.length; i++) {
      if (channelData[i] > threshold) {
        bpmPeaks.push(i);
        i += Math.floor(sampleRate / 4); // skip ~250ms after each peak
      }
    }

    const intervals = [];
    for (let i = 1; i < bpmPeaks.length; i++) {
      intervals.push(bpmPeaks[i] - bpmPeaks[i - 1]);
    }

    const intervalCounts = {};
    intervals.forEach(interval => {
      const rounded = Math.round(interval / 1000) * 1000;
      intervalCounts[rounded] = (intervalCounts[rounded] || 0) + 1;
    });

    let maxCount = 0;
    let modeInterval = 0;
    for (const [interval, count] of Object.entries(intervalCounts)) {
      if (count > maxCount) {
        maxCount = /** @type {number} */ (count);
        modeInterval = Number(interval);
      }
    }

    let bpm = 128;
    if (modeInterval > 0) {
      bpm = Math.round(60 / (modeInterval / sampleRate));
      while (bpm < 90) bpm *= 2;
      while (bpm > 180) bpm /= 2;
      bpm = Math.round(bpm);
    }

    // ── 2. WAVEFORM PEAK EXTRACTION ───────────────────────────────────────
    const step = Math.ceil(channelData.length / numPeaks);
    const peaks = [];
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
    const normalisedPeaks = peaks.map(p => Math.max(0.02, Math.min(0.98, p / maxPeak)));

    self.postMessage({ bpm, peaks: normalisedPeaks, fileKey });
  } catch (err) {
    self.postMessage({ error: err.message || 'Analysis failed', fileKey });
  }
};
