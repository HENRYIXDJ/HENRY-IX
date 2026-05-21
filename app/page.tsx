'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useAudio } from '@/components/AudioProvider';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Link from 'next/link';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SPRING_CONFIG = { type: "spring" as const, stiffness: 300, damping: 20 };
const playClick = (freq: number, type: OscillatorType, duration: number) => {
  // simple blip for UI sounds
};

const HeroNode = React.memo(function HeroNode({ 
  isDepth,
  preloaderComplete
}: { 
  isDepth: boolean; 
  preloaderComplete: boolean;
}) {
  const { scrollY } = useScroll();
  const smoothScrollY = useSpring(scrollY, { stiffness: 100, damping: 20, mass: 0.2 });
  
  // Hardware-accelerated parallax (Improvement 3: CSS scroll-driven animations can be done via style, but framer-motion is fine here if optimized)
  const yText = useTransform(smoothScrollY, [0, 1000], [0, 400]);
  const scaleText = useTransform(smoothScrollY, [0, 800], [1, 0.8]);
  const opacityText = useTransform(smoothScrollY, [0, 600], [1, 0]);

  return (
    <section className="min-h-screen flex flex-col justify-center items-center w-full px-6 relative max-w-7xl mx-auto pt-20 overflow-hidden" style={{ scrollSnapAlign: 'start' }}>
      
      <motion.div 
        className="fixed inset-0 flex justify-center items-center z-0 pointer-events-none"
        style={{ y: yText, scale: scaleText, opacity: opacityText, willChange: "transform, opacity" }}
      >
        <motion.h1 
          className="glitch font-sans text-[clamp(2rem,15vw,15vw)] w-full font-bold tracking-wider leading-none text-center select-none text-primary whitespace-nowrap magnetic-snap"
          data-text="HENRY IX"
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={preloaderComplete ? { y: 0, opacity: 1, scale: 1 } : { y: 100, opacity: 0, scale: 0.95 }}
          style={{ willChange: "transform, opacity" }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
        >
          HENRY IX
        </motion.h1>
      </motion.div>

      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={preloaderComplete ? { opacity: 0.4, y: 0 } : { opacity: 0, y: 20 }}
         transition={{ ...SPRING_CONFIG, delay: 1.2 }}
         whileHover={{ opacity: 1, y: 5 }}
         className="absolute bottom-20 font-mono text-xs tracking-widest uppercase flex flex-col items-center gap-2 cursor-pointer z-10 magnetic-snap"
         onClick={() => {
           window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
         }}
      >
         <span>Scroll to discover</span>
         <motion.div 
           animate={{ scaleY: [1, 1.5, 1] }} 
           transition={{ duration: 2, repeat: Infinity, ease: "anticipate" }}
           className="flex justify-center items-start origin-top h-8"
         >
           <div className={cn("w-[1px] h-full", isDepth ? "bg-zinc-500" : "bg-black")} />
         </motion.div>
      </motion.div>
    </section>
  );
});

export default function LandingPage() {
  const isDepth = true;
  const { preloaderComplete } = useAudio();

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className="relative w-full bg-black text-zinc-100 min-h-[200vh] overflow-x-hidden selection:bg-primary/30 selection:text-primary font-sans"
    >
      <HeroNode isDepth={isDepth} preloaderComplete={preloaderComplete} />

      {/* ── FULLSCREEN SECTION NAVIGATOR ── */}
      <section className="min-h-screen flex flex-col items-center justify-center relative w-full overflow-hidden bg-black z-20" style={{ scrollSnapAlign: 'start' }}>
        
        {/* CDJ Teaser Background */}
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.04] pointer-events-none overflow-hidden mix-blend-screen">
            <div className="w-[120vw] h-[120vw] border-[1px] border-primary rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[spin_60s_linear_infinite]" />
            <div className="w-[100vw] h-[100vw] border-[1px] border-dashed border-primary rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[spin_40s_linear_infinite_reverse]" />
            <div className="w-[80vw] h-[80vw] border-[2px] border-primary rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 4px)',
          }}
        />

        <nav className="flex flex-col items-center gap-6 md:gap-10 w-full px-6 max-w-4xl mx-auto z-10 relative">
          {[
            { label: 'MIXES', href: '/mixes', desc: 'Enter the CDJ Portal' },
            { label: 'GALLERY', href: '/gallery', desc: 'Visual Archives' },
            { label: 'EVENTS', href: '/events', desc: 'Upcoming Shows' },
            { label: 'CONTACT', href: '/contact', desc: 'Bookings & Info' },
          ].map(({ label, href, desc }) => (
            <Link
              key={label}
              href={href}
              className="group block w-full text-center relative"
            >
              <span
                className="glitch font-sans font-bold text-primary text-[clamp(2.5rem,10vw,8rem)] leading-none tracking-wider uppercase select-none transition-all duration-300 group-hover:tracking-[0.15em] inline-block"
                data-text={label}
              >
                {label}
              </span>
              <div className="h-0 group-hover:h-6 overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 mt-2">
                <span className="font-mono text-zinc-500 text-xs tracking-[0.3em] uppercase">{desc}</span>
              </div>
            </Link>
          ))}
        </nav>
      </section>
    </motion.main>
  );
}
