'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '@/components/PageShell';

interface GalleryItem {
  src: string;
  title: string;
  category: string;
  meta: string;
  details: string;
  techSpecs: {
    iso: string;
    aperture: string;
    shutter: string;
    lens: string;
  };
  gridClass: string;
}

const GALLERY_IMAGES: GalleryItem[] = [
  {
    src: '/gallery/img_0899.jpg',
    title: 'THE CROWD',
    category: 'LIVE / ROOM 1',
    meta: '2026.05.15 - 02:40 AM',
    details: 'Main room peak energy. Vibrant crowd movement captured under low-frequency bass notes and saturated crimson lighting.',
    techSpecs: { iso: '3200', aperture: 'f/1.8', shutter: '1/160s', lens: '24mm' },
    gridClass: 'col-span-1 md:col-span-2 row-span-1 aspect-square md:aspect-[2/1]',
  },
  {
    src: '/gallery/img_2255.jpg',
    title: 'DECK CONTROLS',
    category: 'TACTILE / TRANSITION',
    meta: '2026.05.15 - 01:15 AM',
    details: 'Precision fingertip control over the high-pass filter and jog wheels during a seamless 155 BPM deck transition.',
    techSpecs: { iso: '1600', aperture: 'f/2.0', shutter: '1/250s', lens: '35mm' },
    gridClass: 'col-span-1 md:col-span-1 aspect-square md:aspect-auto md:row-span-2',
  },
  {
    src: '/gallery/img_0495.jpg',
    title: 'ROYAL COURT S1',
    category: 'STAGECRAFT / ATMOSPHERE',
    meta: '2026.04.18 - 11:30 PM',
    details: 'Late night silhouettes reflecting off the warm stage monitors at the Royal Court Theatre performance.',
    techSpecs: { iso: '800', aperture: 'f/1.4', shutter: '1/125s', lens: '50mm' },
    gridClass: 'col-span-1 aspect-square md:aspect-[4/3]',
  },
  {
    src: '/gallery/img_3540.jpg',
    title: 'BOOTH MONITOR',
    category: 'INTERFACE / DYNAMIC',
    meta: '2026.04.18 - 11:45 PM',
    details: 'Close-up look at the primary CDJ terminal monitor showing real-time beat grid alignment and peak frequencies.',
    techSpecs: { iso: '1000', aperture: 'f/2.8', shutter: '1/200s', lens: '85mm' },
    gridClass: 'col-span-1 aspect-square',
  },
  {
    src: '/gallery/img_4564.jpg',
    title: 'CROWD WAVE',
    category: 'ENERGY / ARCHIVE',
    meta: '2026.05.20 - Midnight',
    details: 'The continuous rhythm of the dancefloor. A sea of hands responding to a progressive drop.',
    techSpecs: { iso: '2500', aperture: 'f/2.2', shutter: '1/160s', lens: '24mm' },
    gridClass: 'col-span-1 md:col-span-2 aspect-square md:aspect-[2/1]',
  },
  {
    src: '/Knight Club Artwork/Session 1.jpg',
    title: 'KNIGHT CLUB: SESSION 1',
    category: 'Knight Club Artwork',
    meta: '2026.05 - AUDIO ART',
    details: 'Official session artwork for the first installment of the Knight Club live-recorded studio mixes.',
    techSpecs: { iso: '100', aperture: 'N/A', shutter: 'N/A', lens: 'DIGITAL' },
    gridClass: 'col-span-1 aspect-square',
  },
  {
    src: '/Knight Club Artwork/Session 2.jpg',
    title: 'KNIGHT CLUB: SESSION 2',
    category: 'Knight Club Artwork',
    meta: '2026.05 - AUDIO ART',
    details: 'Official session artwork for Knight Club Session 2, designed to capture the high-pressure energy of industrial techno.',
    techSpecs: { iso: '100', aperture: 'N/A', shutter: 'N/A', lens: 'DIGITAL' },
    gridClass: 'col-span-1 aspect-square',
  },
  {
    src: '/Knight Club Artwork/Session 3.jpg',
    title: 'KNIGHT CLUB: SESSION 3',
    category: 'Knight Club Artwork',
    meta: '2026.05 - AUDIO ART',
    details: 'Official session artwork for Knight Club Session 3, reflecting the peak-time atmospheric rhythms of the underground scene.',
    techSpecs: { iso: '100', aperture: 'N/A', shutter: 'N/A', lens: 'DIGITAL' },
    gridClass: 'col-span-1 aspect-square',
  },
  {
    src: '/Knight Club Artwork/Session 4.jpg',
    title: 'KNIGHT CLUB: SESSION 4',
    category: 'Knight Club Artwork',
    meta: '2026.05 - AUDIO ART',
    details: 'Official session artwork for the final remastered edition of Knight Club Session 4.',
    techSpecs: { iso: '100', aperture: 'N/A', shutter: 'N/A', lens: 'DIGITAL' },
    gridClass: 'col-span-1 aspect-square',
  }
];

export default function GalleryPage() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // Handle keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeIdx === null) return;
      if (e.key === 'Escape') setActiveIdx(null);
      else if (e.key === 'ArrowRight') {
        setActiveIdx((prev) => (prev !== null ? (prev + 1) % GALLERY_IMAGES.length : null));
      } else if (e.key === 'ArrowLeft') {
        setActiveIdx((prev) => (prev !== null ? (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length : null));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIdx]);

  return (
    <PageShell>
      <main className="min-h-screen bg-black text-zinc-100 selection:bg-primary/30 selection:text-primary pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto relative overflow-hidden">
        
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-5">
          <div className="w-full h-full bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>

        {/* Section Header */}
        <div className="relative z-10 mb-12 md:mb-16 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1
              className="glitch font-sans font-black text-primary text-[clamp(3rem,8vw,6.5rem)] leading-none tracking-wider uppercase select-none"
              data-text="GALLERY"
            >
              GALLERY
            </h1>
            <p className="mt-3 font-mono text-zinc-500 text-[10px] tracking-[0.6em] uppercase">
              02 / VISUAL ARCHIVES
            </p>
          </motion.div>
        </div>

        {/* Asymmetrical Gallery Grid */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {GALLERY_IMAGES.map((item, idx) => (
            <motion.div
              key={item.src}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
              className={`group overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-900/80 flex flex-col justify-between cursor-pointer hover:border-primary/30 transition-colors duration-500 ${item.gridClass}`}
              onClick={() => setActiveIdx(idx)}
            >
              {/* Image Box */}
              <div className="relative flex-grow overflow-hidden aspect-video md:aspect-auto h-full min-h-[220px]">
                {/* CRT Scanline Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none z-10 opacity-40 group-hover:opacity-20 transition-opacity duration-500" />
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10" />

                {/* Main Image */}
                <img
                  src={item.src}
                  alt={item.title}
                  className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 contrast-125 group-hover:scale-[1.03] transition-all duration-700 ease-out"
                />

                {/* Subtle Hover Corner Accents */}
                <div className="absolute top-4 left-4 w-2 h-2 border-t border-l border-primary/0 group-hover:border-primary/60 transition-all duration-500 z-10" />
                <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-primary/0 group-hover:border-primary/60 transition-all duration-500 z-10" />
                <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-primary/0 group-hover:border-primary/60 transition-all duration-500 z-10" />
                <div className="absolute bottom-4 right-4 w-2 h-2 border-b border-r border-primary/0 group-hover:border-primary/60 transition-all duration-500 z-10" />

                {/* Hover Reveal Cover */}
                <div className="absolute inset-0 bg-black/40 opacity-100 group-hover:opacity-0 transition-opacity duration-500 z-0" />
              </div>

              {/* Text Info Bar */}
              <div className="p-4 bg-zinc-950 border-t border-zinc-900/60 flex flex-col gap-1.5 shrink-0 z-10">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-sans font-bold text-xs tracking-wider text-zinc-300 group-hover:text-primary transition-colors uppercase">
                    {item.title}
                  </h3>
                  <span className="font-mono text-[9px] text-zinc-600 tracking-widest">
                    {item.category}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 tracking-widest border-t border-zinc-900/40 pt-1.5">
                  <span>{item.meta}</span>
                  <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
                    {item.techSpecs.lens} · {item.techSpecs.aperture}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Lightbox Overlay */}
        <AnimatePresence>
          {activeIdx !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[100] flex flex-col justify-between bg-black/95 backdrop-blur-xl p-4 md:p-8 select-none"
              onClick={() => setActiveIdx(null)}
            >
              {/* Lightbox Header / Close */}
              <div className="flex justify-between items-center z-50 w-full max-w-7xl mx-auto pt-2">
                <span className="font-mono text-[9px] text-zinc-500 tracking-[0.4em] uppercase">
                  ARCHIVE {activeIdx + 1} / {GALLERY_IMAGES.length}
                </span>
                <button
                  onClick={() => setActiveIdx(null)}
                  className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 hover:border-primary/50 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors active:scale-90"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Lightbox Image Stage */}
              <div 
                className="relative flex items-center justify-center w-full max-w-5xl mx-auto flex-grow my-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Arrow Left */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIdx((prev) => (prev !== null ? (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length : null));
                  }}
                  className="absolute left-0 md:-left-16 z-50 w-12 h-12 rounded-full bg-zinc-950/80 border border-zinc-800 hover:border-primary/50 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <svg className="w-5 h-5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Active Image Wrapper */}
                <motion.div
                  key={activeIdx}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="relative max-h-[60vh] md:max-h-[70vh] flex items-center justify-center rounded-xl overflow-hidden border border-zinc-900/60 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-zinc-950"
                >
                  <img
                    src={GALLERY_IMAGES[activeIdx].src}
                    alt={GALLERY_IMAGES[activeIdx].title}
                    className="max-w-full max-h-[60vh] md:max-h-[70vh] object-contain block pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] pointer-events-none z-10 opacity-30" />
                </motion.div>

                {/* Arrow Right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIdx((prev) => (prev !== null ? (prev + 1) % GALLERY_IMAGES.length : null));
                  }}
                  className="absolute right-0 md:-right-16 z-50 w-12 h-12 rounded-full bg-zinc-950/80 border border-zinc-800 hover:border-primary/50 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Lightbox Footer Info */}
              <div 
                className="w-full max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-2 max-w-2xl">
                  <div className="flex items-baseline gap-3">
                    <h2 className="font-sans font-black text-2xl tracking-wider text-primary uppercase">
                      {GALLERY_IMAGES[activeIdx].title}
                    </h2>
                    <span className="font-mono text-[10px] text-zinc-500 tracking-[0.3em] uppercase">
                      {GALLERY_IMAGES[activeIdx].category}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-xs font-sans leading-relaxed tracking-wide">
                    {GALLERY_IMAGES[activeIdx].details}
                  </p>
                </div>

                {/* Technical Specifications Panel */}
                <div className="flex gap-4 font-mono text-[9px] text-zinc-500 tracking-widest bg-zinc-950/90 border border-zinc-900 px-4 py-3 rounded-xl min-w-[280px] justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-600 uppercase text-[8px]">EXPOSURE</span>
                    <span className="text-zinc-300 font-bold">{GALLERY_IMAGES[activeIdx].techSpecs.shutter} @ {GALLERY_IMAGES[activeIdx].techSpecs.aperture}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-l border-zinc-900 pl-4">
                    <span className="text-zinc-600 uppercase text-[8px]">SENSITIVITY</span>
                    <span className="text-zinc-300 font-bold">ISO {GALLERY_IMAGES[activeIdx].techSpecs.iso}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-l border-zinc-900 pl-4">
                    <span className="text-zinc-600 uppercase text-[8px]">FOCAL</span>
                    <span className="text-zinc-300 font-bold">{GALLERY_IMAGES[activeIdx].techSpecs.lens}</span>
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </PageShell>
  );
}
