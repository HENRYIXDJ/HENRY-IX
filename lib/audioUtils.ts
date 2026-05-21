// --- ANALOG SYNTHESIZER UTILITIES (Web Audio API) ---

export const playClick = (freq = 800, type = 'sine', duration = 0.03) => {
  if (typeof window === 'undefined' || (window as any).isMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type as OscillatorType;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.012, ctx.currentTime); // Quiet satisfying blip
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

export const playTick = () => {
  if (typeof window === 'undefined' || (window as any).isMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const bufferSize = ctx.sampleRate * 0.004; // 4ms burst
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.002, ctx.currentTime); // extremely quiet tick
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.004);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch (e) {}
};

export const playDegauss = () => {
  if (typeof window === 'undefined' || (window as any).isMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Sub-bass thump
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, ctx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.45);
    subGain.gain.setValueAtTime(0.18, ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.45);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start();
    subOsc.stop(ctx.currentTime + 0.45);

    // High frequency sweep / degauss crackle
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepOsc.type = 'triangle';
    sweepOsc.frequency.setValueAtTime(1600, ctx.currentTime);
    sweepOsc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.65);
    sweepGain.gain.setValueAtTime(0.04, ctx.currentTime);
    sweepGain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.65);
    sweepOsc.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweepOsc.start();
    sweepOsc.stop(ctx.currentTime + 0.65);
  } catch (e) {}
};

export const playLockoutBlip = () => {
  if (typeof window === 'undefined' || (window as any).isMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110, ctx.currentTime);
    
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(112, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.2);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, ctx.currentTime);
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.2);
  } catch (e) {}
};
