'use client';

import React, { useRef, useEffect } from 'react';
import { motion, useMotionTemplate } from 'framer-motion';
import { useAudio } from './AudioProvider';

export default function AudioVisualizerBackground({ 
  isDepth, 
  mouseX, 
  mouseY, 
  isPlaying 
}: { 
  isDepth: boolean; 
  mouseX: any; 
  mouseY: any; 
  isPlaying: boolean 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtx = useAudio();
  const analyser = audioCtx?.analyserNode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    // Simple reactive smoothing variables
    let bassSmooth = 0;
    let midSmooth = 0;
    let highSmooth = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      let bass = 0;
      let mid = 0;
      let high = 0;

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);

        // Group frequency bins dynamically according to actual buffer length
        // Bass: first 15 bins
        const bassEnd = Math.min(15, bufferLength);
        let bassCount = 0;
        for (let i = 0; i < bassEnd; i++) {
          bass += dataArray[i] || 0;
          bassCount++;
        }
        if (bassCount > 0) bass /= bassCount;

        // Mids: bins 16 to 80
        const midStart = Math.min(16, bufferLength);
        const midEnd = Math.min(80, bufferLength);
        let midCount = 0;
        for (let i = midStart; i < midEnd; i++) {
          mid += dataArray[i] || 0;
          midCount++;
        }
        if (midCount > 0) mid /= midCount;

        // Highs: bins 81 to 150
        const highStart = Math.min(81, bufferLength);
        const highEnd = Math.min(150, bufferLength);
        let highCount = 0;
        for (let i = highStart; i < highEnd; i++) {
          high += dataArray[i] || 0;
          highCount++;
        }
        if (highCount > 0) high /= highCount;
      } else if (isPlaying) {
        // Fallback smooth random pulsing if analyser not ready yet
        const t = performance.now() * 0.003;
        bass = 40 + Math.sin(t) * 15;
        mid = 30 + Math.cos(t * 1.3) * 10;
        high = 20 + Math.sin(t * 2.1) * 8;
      }

      // Decaying smoothing interpolation
      bassSmooth += (bass - bassSmooth) * 0.15;
      midSmooth += (mid - midSmooth) * 0.15;
      highSmooth += (high - highSmooth) * 0.15;

      // Robust NaN protection
      if (isNaN(bassSmooth) || !isFinite(bassSmooth)) bassSmooth = 0;
      if (isNaN(midSmooth) || !isFinite(midSmooth)) midSmooth = 0;
      if (isNaN(highSmooth) || !isFinite(highSmooth)) highSmooth = 0;

      let mX = mouseX && mouseX.get ? mouseX.get() : (width / 2);
      let mY = mouseY && mouseY.get ? mouseY.get() : (height / 2);
      
      if (isNaN(mX) || !isFinite(mX)) mX = width / 2;
      if (isNaN(mY) || !isFinite(mY)) mY = height / 2;

      // ── DRAW ORBITING REACTIVE GLOWS AT MOUSE COORDINATES ──
      if (isPlaying) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // Outer Magenta/Cyan frequency ring
        let outerRadius = 80 + highSmooth * 1.5;
        if (isNaN(outerRadius) || !isFinite(outerRadius) || outerRadius <= 0) {
          outerRadius = 80;
        }
        const outerGlow = ctx.createRadialGradient(mX, mY, 0, mX, mY, outerRadius);
        outerGlow.addColorStop(0, isDepth ? 'rgba(216, 22, 63, 0.06)' : 'rgba(216, 22, 63, 0.03)');
        outerGlow.addColorStop(0.5, 'rgba(6, 182, 212, 0.02)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(mX, mY, outerRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner Bass Pulse core
        let innerRadius = 30 + bassSmooth * 2.2;
        if (isNaN(innerRadius) || !isFinite(innerRadius) || innerRadius <= 0) {
          innerRadius = 30;
        }
        const innerGlow = ctx.createRadialGradient(mX, mY, 0, mX, mY, innerRadius);
        innerGlow.addColorStop(0, isDepth ? 'rgba(216, 22, 63, 0.22)' : 'rgba(216, 22, 63, 0.12)');
        innerGlow.addColorStop(0.4, 'rgba(216, 22, 63, 0.04)');
        innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(mX, mY, innerRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // ── DRAW BOTTOM AUDIO REACTIVE SPECTRUM BARS ──
      const barCount = 48;
      const barWidth = width / barCount;
      const themeColor = isDepth ? 'rgba(216, 22, 63,' : 'rgba(24, 24, 27,';

      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = isDepth ? '#ffffff' : '#000000';

      for (let i = 0; i < barCount; i++) {
        // Map bar index to frequency array (logarithmic mapping for better visual bass resolution)
        const sampleIdx = Math.max(0, Math.min(bufferLength - 1, Math.floor(Math.pow(i / barCount, 1.8) * Math.max(1, bufferLength - 10))));
        const rawVal = isPlaying && analyser ? (dataArray[sampleIdx] || 0) : 0;
        
        let barHeight = (rawVal / 255) * (height * 0.22);
        if (!isPlaying) {
          barHeight = 4; // Idle height
        } else {
          barHeight = Math.max(4, barHeight + Math.sin(i * 0.15 + performance.now() * 0.005) * 2);
        }

        // Draw glowing spectrum bars rising from the bottom
        const grad = ctx.createLinearGradient(i * barWidth, height, i * barWidth, height - barHeight);
        grad.addColorStop(0, `${themeColor} 0.8)`);
        grad.addColorStop(0.5, `${themeColor} 0.3)`);
        grad.addColorStop(1, `${themeColor} 0.0)`);
        ctx.fillStyle = grad;
        
        ctx.fillRect(
          i * barWidth + 2,
          height - barHeight,
          barWidth - 4,
          barHeight
        );
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyser, isPlaying, mouseX, mouseY, isDepth]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Background canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Static mouse fallback radial glow */}
      <motion.div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none opacity-40 z-0"
        style={{
          background: useMotionTemplate`radial-gradient(450px circle at ${mouseX}px ${mouseY}px, ${isDepth ? 'rgba(211, 15, 49, 0.08)' : 'rgba(211, 15, 49, 0.04)'}, transparent 60%)`
        }}
      />
      
      {/* Subtle retro overlay scanlines */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
    </div>
  );
}
