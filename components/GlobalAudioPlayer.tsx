'use client';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function GlobalAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    const loadSCWidgetAPI = () => {
      if (!(window as any).SC) {
        if (!document.querySelector('script[src="https://w.soundcloud.com/player/api.js"]')) {
          const script = document.createElement('script');
          script.src = 'https://w.soundcloud.com/player/api.js';
          script.onload = initPlayer;
          document.body.appendChild(script);
        } else {
          // Script is loading but not ready, wait a bit
          setTimeout(loadSCWidgetAPI, 100);
        }
      } else {
        initPlayer();
      }
    };

    const initPlayer = () => {
      if (iframeRef.current && (window as any).SC) {
        const widget = (window as any).SC.Widget(iframeRef.current);
        widgetRef.current = widget;
        
        widget.bind((window as any).SC.Widget.Events.READY, () => {
          setIsReady(true);
        });

        widget.bind((window as any).SC.Widget.Events.PLAY, () => {
          setIsPlaying(true);
        });

        widget.bind((window as any).SC.Widget.Events.PAUSE, () => {
          setIsPlaying(false);
        });
        
        widget.bind((window as any).SC.Widget.Events.FINISH, () => {
          setIsPlaying(false);
        });
      }
    };

    loadSCWidgetAPI();
  }, []);

  const [isHovered, setIsHovered] = useState(false);

  const togglePlay = () => {
    if (!isReady || !widgetRef.current) return;
    
    if (isPlaying) {
      widgetRef.current.pause();
    } else {
      widgetRef.current.play();
    }
  };

  return (
    <>
      <iframe 
        ref={iframeRef}
        className="hidden"
        src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/2129822499&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=false"
        allow="autoplay"
      />
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "fixed bottom-6 right-6 z-[60] flex items-center bg-zinc-900/90 backdrop-blur border border-zinc-800 p-2 rounded-full text-white transition-colors overflow-hidden", 
          isReady ? "cursor-pointer hover:bg-zinc-800" : "opacity-50 cursor-not-allowed"
        )}
        onClick={togglePlay}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isPlaying && (
          <div className="flex gap-0.5 items-end h-4 pl-4 shrink-0 z-10">
             {[1,2,3].map(i => (
               <motion.div 
                 key={i}
                 className="w-1 bg-primary"
                 animate={{ height: ['20%', '100%', '20%'] }}
                 transition={{ duration: 0.5 + (i * 0.1), repeat: Infinity, ease: 'easeInOut' }}
               />
             ))}
          </div>
        )}

        <motion.div 
          initial={{ width: 0, opacity: 0 }}
          animate={{ 
            width: isHovered ? 140 : 0, 
            opacity: isHovered ? 1 : 0,
            marginLeft: isHovered ? (isPlaying ? 12 : 16) : 0,
            marginRight: isHovered ? 12 : 0
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex flex-col overflow-hidden whitespace-nowrap text-right"
        >
          <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest leading-tight">Now Playing</span>
          
          <div className="overflow-hidden relative w-full">
            <motion.div
              animate={isHovered ? { x: ["0%", "0%", "-50%", "-50%"] } : { x: "0%" }}
              transition={{ repeat: Infinity, duration: 6, times: [0, 0.3, 0.99, 1], ease: "linear" }}
              className="text-xs font-semibold tracking-wide flex gap-4 w-max"
            >
              <span>Knight Club: Session 1</span>
              <span>Knight Club: Session 1</span>
            </motion.div>
          </div>
        </motion.div>

        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 z-10">
          {!isReady ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 text-black" fill="currentColor" />
          ) : (
            <Play className="w-5 h-5 text-black ml-1" fill="currentColor" />
          )}
        </div>
      </motion.div>
    </>
  );
}
