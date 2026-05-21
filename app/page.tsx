'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useMotionTemplate, useScroll, useTransform, useSpring } from 'framer-motion';
import {
  Navigation, Play, Pause, SkipForward, SkipBack, CircleDot,
  Calendar, MapPin, Instagram, Music2, Disc, ArrowRight, X, Menu, AudioLines,
  Facebook, Cloud, Headphones, Youtube
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- VENTURE OS CONSTANTS ---
const SPRING_CONFIG = { type: "spring" as const, stiffness: 300, damping: 20 };
const HOVER_SPRING = { type: "spring" as const, stiffness: 400, damping: 15 };

function NavigationBar({ isDepth }: { isDepth: boolean }) {
  const [navHovered, setNavHovered] = useState(false);

  const navClasses = cn(
    "fixed top-4 md:top-8 z-50 rounded-lg border backdrop-blur-md overflow-hidden transition-colors duration-300",
    isDepth ? "border-zinc-800 bg-zinc-950/80 text-zinc-100" : "border-black/10 bg-white/40 text-zinc-900"
  );

  return (
    <>
      <motion.nav 
        layout
        className={cn(navClasses, "left-4 md:left-8 flex flex-col items-start p-1.5 whitespace-nowrap")}
        animate={{ 
          height: navHovered ? "auto" : 48, 
          width: navHovered ? "auto" : 48 
        }}
        transition={SPRING_CONFIG}
        onHoverStart={() => setNavHovered(true)}
        onHoverEnd={() => setNavHovered(false)}
      >
        <motion.div layout className="flex h-9 w-9 shrink-0 items-center justify-center">
          <Menu className="w-5 h-5" />
        </motion.div>
        <AnimatePresence>
          {navHovered && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 flex flex-col gap-2 w-full px-3 pb-3"
            >
              {[
                { name: 'MIX ARCHIVE', icon: AudioLines, href: '#vault' },
                { name: 'EVENTS', icon: Calendar, href: '#schedule' },
                { name: 'CONTACT ME', icon: Disc, href: '#booking' }
              ].map((link, i) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  className={cn(
                     "flex items-center gap-3 px-3 py-2 rounded text-sm font-mono tracking-widest transition-colors",
                     isDepth ? "hover:bg-zinc-900 hover:text-primary" : "hover:bg-black/5"
                  )}
                  whileHover={{ scale: 1.02, x: 5 }}
                  transition={HOVER_SPRING}
                >
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </motion.a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}

function HeroNode({ isDepth }: { isDepth: boolean }) {
  const { scrollY } = useScroll();

  // Instantly reactive transforms with no state overhead (runs 60fps on animation thread)
  const yText = useTransform(scrollY, (v) => {
    const wh = typeof window !== "undefined" ? window.innerHeight : 1000;
    const target = 56 - (wh / 2);
    const progress = Math.min(Math.max(v / 500, 0), 1);
    return progress * target;
  });

  const scaleText = useTransform(scrollY, (v) => {
    const progress = Math.min(Math.max(v / 500, 0), 1);
    return 1 - (progress * 0.75); // 1 down to 0.25
  });

  const headerOpacity = useTransform(scrollY, (v) => {
    const progress = Math.min(Math.max((v - 200) / 250, 0), 1); // 200 to 450
    return progress;
  });

  return (
    <section className="min-h-screen flex flex-col justify-center items-center w-full px-6 relative max-w-7xl mx-auto pt-20">
      
      {/* Opaque Header Background */}
      <motion.div 
        className={cn(
          "fixed top-0 left-0 w-full h-24 z-40 transition-colors",
          isDepth ? "bg-black border-b border-zinc-800/50" : "bg-white border-b border-black/10"
        )}
        style={{ opacity: headerOpacity }}
      />

      <motion.div 
        className="fixed inset-0 pointer-events-none flex justify-center items-center z-50"
        style={{ y: yText, scale: scaleText }}
      >
        <motion.h1 
          className="font-sans text-[15vw] w-full font-bold tracking-wider leading-none text-center select-none text-primary whitespace-nowrap"
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
        >
          HENRY IX
        </motion.h1>
      </motion.div>

      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 0.4, y: 0 }}
         transition={{ ...SPRING_CONFIG, delay: 1.5 }}
         whileHover={{ opacity: 1, y: 5 }}
         className="absolute bottom-12 font-mono text-xs tracking-widest uppercase flex flex-col items-center gap-2 cursor-pointer z-10"
         onClick={() => {
           const vault = document.getElementById('vault');
           if (vault) vault.scrollIntoView({ behavior: 'smooth' });
         }}
      >
        <span>Scroll to site</span>
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
}

function AudioVisualizerBackground({ isDepth, mouseX, mouseY, isPlaying }: { isDepth: boolean; mouseX: any; mouseY: any; isPlaying: boolean }) {
  const [bars, setBars] = useState<{height: number, duration: number, delay: number}[]>([]);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBars(Array.from({ length: 32 }).map(() => ({
      height: 10 + Math.random() * 90,
      duration: 0.5 + Math.random() * 1.5,
      delay: Math.random() * 2
    })));
  }, []);
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: useMotionTemplate`radial-gradient(500px circle at ${mouseX}px ${mouseY}px, ${isDepth ? 'rgba(211, 15, 49, 0.15)' : 'rgba(211, 15, 49, 0.08)'}, transparent 60%)`
        }}
      />
      
      <div className="absolute inset-0 opacity-5"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
           
      <div className="absolute bottom-0 left-0 right-0 h-48 flex items-end justify-between px-2 opacity-[0.08] mix-blend-overlay">
        {bars.map((bar, i) => (
          <motion.div
            key={i}
            className={cn("w-full mx-[2px] rounded-t-sm", isDepth ? "bg-white" : "bg-black")}
            animate={{ 
              height: isPlaying ? ["5%", `${bar.height}%`, "5%"] : "5%"
            }}
            transition={{
              duration: isPlaying ? bar.duration : 1,
              repeat: isPlaying ? Infinity : 0,
              ease: "easeInOut",
              delay: isPlaying ? bar.delay : 0
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MixArchive({ isDepth }: { isDepth: boolean }) {
  const archiveRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isPlaying, setIsPlaying] = useState(false);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }
  
  const mixGroups = [
    {
      title: "The Knight Club Mixes",
      mixes: [
        { id: 'kc-1', title: 'Knight Club: Session 1', url: 'https://api.soundcloud.com/tracks/2129822499', link: 'https://soundcloud.com/henryixdj/knight-club-session-1' },
        { id: 'kc-2', title: 'Knight Club: Session 2', url: 'https://api.soundcloud.com/tracks/2156724957', link: 'https://soundcloud.com/henryixdj/knight-club-session-2' },
        { id: 'kc-3', title: 'Knight Club: Session 3', url: 'https://api.soundcloud.com/tracks/2211693032', link: 'https://soundcloud.com/henryixdj/knight-club-session-3' },
        { id: 'kc-4', title: 'Knight Club: Session 4', url: 'https://api.soundcloud.com/tracks/2253706952', link: 'https://soundcloud.com/henryixdj/33baa30a-4980-40da-94c2-41085314ec43' }
      ]
    },
    {
      title: "The Royal Court Mixes",
      mixes: [
        { id: 'rc-1', title: 'Royal Court: Session 1', url: 'https://api.soundcloud.com/tracks/1624591284', link: 'https://soundcloud.com/henryixdj/session-1' },
        { id: 'rc-2', title: 'Royal Court: Session 2', url: 'https://api.soundcloud.com/tracks/1722048180', link: 'https://soundcloud.com/henryixdj/01-best-yet' }
      ]
    },
    {
      title: "Corner New Cross Mixes",
      mixes: [
        { id: 'cnc-1', title: 'Corner New Cross: Night 1', url: 'https://api.soundcloud.com/tracks/2221197950', link: 'https://soundcloud.com/henryixdj/corner-new-cross-night-1' },
        { id: 'cnc-2', title: 'Corner New Cross: Night 2', url: 'https://api.soundcloud.com/tracks/2221198457', link: 'https://soundcloud.com/henryixdj/corner-new-cross-night-2' }
      ]
    }
  ];

  const [activeMix, setActiveMix] = useState(mixGroups[0].mixes[0]);

  useEffect(() => {
    setIsPlaying(false);
    
    const loadSCWidgetAPI = () => {
      if (!(window as any).SC) {
        const script = document.createElement('script');
        script.src = 'https://w.soundcloud.com/player/api.js';
        script.onload = initPlayer;
        document.body.appendChild(script);
      } else {
        initPlayer();
      }
    };

    const initPlayer = () => {
      if (iframeRef.current && (window as any).SC) {
        const widget = (window as any).SC.Widget(iframeRef.current);
        
        // Ensure events are only bound once by unbinding existing ones
        widget.unbind((window as any).SC.Widget.Events.PLAY);
        widget.unbind((window as any).SC.Widget.Events.PAUSE);
        widget.unbind((window as any).SC.Widget.Events.FINISH);

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
  }, [activeMix.id]);

  return (
    <section id="vault" className="w-full relative py-32 px-6 max-w-7xl mx-auto overflow-hidden scroll-mt-24">
      <div className="mb-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h2 className="font-mono text-lg md:text-xl tracking-[0.2em] font-semibold uppercase">Mix Archive</h2>
        <div className={cn("h-[1px] flex-grow w-full md:w-auto md:ml-8", isDepth ? "bg-zinc-800" : "bg-black/20")} />
      </div>

      <div 
        ref={archiveRef} 
        onMouseMove={handleMouseMove}
        className={cn(
          "relative w-full rounded-xl border border-dashed overflow-hidden flex flex-col lg:flex-row justify-center items-start gap-8 p-4 md:p-8",
          isDepth ? "border-zinc-800 bg-zinc-950/40" : "border-black/20"
        )}
      >
        <AudioVisualizerBackground isDepth={isDepth} mouseX={mouseX} mouseY={mouseY} isPlaying={isPlaying} />

        {/* Mix Selector */}
        <div className="w-full lg:w-1/3 z-10 flex flex-col gap-6 max-h-[450px] overflow-y-auto pr-2 pb-2 pl-2 -ml-2 scrollbar-hide">
          {mixGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="flex flex-col gap-3">
              <div className="font-mono text-xs opacity-50 tracking-widest uppercase mb-1 pl-2">{group.title}</div>
              {group.mixes.map((mix) => (
                <motion.div
                  key={mix.id}
                  onClick={() => setActiveMix(mix)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveMix(mix);
                    }
                  }}
                  animate={
                    activeMix.id === mix.id
                      ? isPlaying 
                        ? { borderColor: isDepth ? "rgba(211,15,49,1)" : "rgba(211,15,49,1)" }
                        : { borderColor: isDepth ? "rgba(211,15,49,0.5)" : "rgba(211,15,49,0.5)" }
                      : { borderColor: "rgba(211,15,49,0)" }
                  }
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
                  style={{
                    backgroundColor: activeMix.id === mix.id 
                      ? (isDepth ? "rgba(211,15,49,0.15)" : "rgba(211,15,49,0.1)") 
                      : undefined
                  }}
                  className={cn(
                    "text-left p-4 rounded-lg flex items-center justify-between transition-colors border font-mono text-sm tracking-wider cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 relative overflow-hidden group",
                    activeMix.id === mix.id 
                      ? "text-[#d30f31]"
                      : (isDepth ? "border-transparent text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100 hover:border-[#d30f31]/30 hover:shadow-[0_0_10px_rgba(211,15,49,0.1)]" : "border-transparent text-zinc-600 hover:bg-black/5 hover:text-black hover:border-black/10")
                  )}
                >
                  <div className="flex-1 min-w-0 pr-4 z-10 pointer-events-none">
                    <span className="truncate block">{mix.title}</span>
                  </div>
                  {activeMix.id === mix.id ? (
                    <AudioLines className="w-4 h-4 text-[#d30f31] flex-shrink-0 z-10 animate-pulse" />
                  ) : (
                    <Play className="w-4 h-4 opacity-50 flex-shrink-0 z-10 pointer-events-none" />
                  )}
                </motion.div>
              ))}
            </div>
          ))}
        </div>

        {/* SoundCloud Player */}
        <div className="w-full lg:w-2/3 rounded-xl overflow-hidden relative z-10 shadow-2xl bg-black border border-zinc-800/50 min-h-[450px]">
           <iframe 
            ref={iframeRef}
            width="100%" 
            height="450" 
            scrolling="no" 
            frameBorder="0" 
            allow="autoplay; encrypted-media" 
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(activeMix.url)}&color=%23d30f31&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`}
          />
          <div style={{ fontSize: "10px", color: "#cccccc", lineBreak: "anywhere", wordBreak: "normal", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontFamily: "Interstate,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Garuda,Verdana,Tahoma,sans-serif", fontWeight: 100, backgroundColor: "#000", padding: "4px" }}>
            <a href="https://soundcloud.com/henryixdj" title="Henry IX" target="_blank" rel="noreferrer" style={{ color: "#cccccc", textDecoration: "none" }}>Henry IX</a> · <a href={activeMix.link} title={activeMix.title} target="_blank" rel="noreferrer" style={{ color: "#cccccc", textDecoration: "none" }}>{activeMix.title}</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Schedule({ isDepth }: { isDepth: boolean }) {
  const gigs: any[] = []; // Empty array simulates no upcoming events

  return (
    <section id="schedule" className="w-full relative py-32 px-6 max-w-7xl mx-auto scroll-mt-24">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ ...SPRING_CONFIG }}
        className="mb-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <h2 className="font-mono text-lg md:text-xl tracking-[0.2em] font-semibold uppercase">02 / Events</h2>
        <div className={cn("h-[1px] flex-grow w-full md:w-auto md:ml-8", isDepth ? "bg-zinc-800" : "bg-black/20")} />
      </motion.div>

      <div className="space-y-4">
        {(!gigs || gigs.length === 0) ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ ...SPRING_CONFIG, delay: 0.1 }}
            className="w-full flex justify-center py-12 border-b border-dashed transition-colors border-zinc-800/50"
          >
             <span className="font-mono text-sm tracking-widest opacity-50 uppercase">No upcoming shows</span>
          </motion.div>
        ) : (
          gigs.map((gig, i) => (
           <motion.div 
             key={i}
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ ...SPRING_CONFIG, delay: i * 0.1 }}
             whileHover={{ scale: 1.01, x: 10 }}
             className={cn(
               "w-full flex md:flex-row flex-col justify-between items-start md:items-center p-6 border-b transition-colors group",
               isDepth ? "border-zinc-800 hover:bg-zinc-900/40" : "border-black/10 hover:bg-black/5"
             )}
           >
              <div className="flex flex-col md:flex-row gap-4 md:gap-16 w-full">
                <div className="font-mono text-sm tracking-widest opacity-60 w-32">{gig.date}</div>
                <div className="flex-1">
                  <h3 className="font-sans text-2xl font-bold tracking-tighter mb-2">{gig.venue}</h3>
                  <div className="flex items-center gap-2 font-mono text-[10px] opacity-60">
                    <MapPin className="w-3 h-3" /> {gig.location}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 md:mt-0">
                <span className={cn(
                  "font-mono text-[8px] px-2 py-1 border tracking-[0.1em] font-bold",
                  gig.status === 'SOLD OUT' ? (isDepth ? "border-zinc-800 text-zinc-500" : "border-black/20 text-zinc-500") :
                  gig.status === 'LIVE' ? "border-primary/50 text-primary" :
                  isDepth ? "border-zinc-800 text-zinc-500" : "border-black/20 text-black"
                )}>
                  {gig.status}
                </span>
              </div>
           </motion.div>
          ))
        )}
      </div>
    </section>
  );
}

function ContactForm({ isDepth }: { isDepth: boolean }) {
  const [formData, setFormData] = useState({ name: '', agency: '', email: '', details: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      setStatus('success');
      setFormData({ name: '', agency: '', email: '', details: '' });
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong');
    }
  };

  return (
    <section id="booking" className="w-full relative py-32 px-6 max-w-7xl mx-auto flex flex-col items-center scroll-mt-24">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ ...SPRING_CONFIG }}
        className="w-full mb-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <h2 className="font-mono text-lg md:text-xl tracking-[0.2em] font-semibold uppercase">Contact Me</h2>
        <div className={cn("h-[1px] flex-grow w-full md:w-auto md:ml-8", isDepth ? "bg-zinc-800" : "bg-black/20")} />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ ...SPRING_CONFIG, delay: 0.1 }}
        className="w-full max-w-2xl"
      >
        <form className="space-y-8 block" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="font-mono text-xs tracking-widest opacity-60">REPRESENTATIVE NAME</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="NAME"
                className={cn(
                   "w-full bg-transparent border-b py-2 font-mono text-xs focus:outline-none transition-colors",
                   isDepth ? "border-zinc-800 focus:border-primary" : "border-black/20 focus:border-primary"
                )}
              />
            </div>
            <div className="space-y-3">
              <label className="font-mono text-xs tracking-widest opacity-60">AGENCY / ENTITY</label>
              <input 
                type="text" 
                value={formData.agency}
                onChange={e => setFormData({ ...formData, agency: e.target.value })}
                placeholder="AGENCY / LLC"
                className={cn(
                   "w-full bg-transparent border-b py-2 font-mono text-xs focus:outline-none transition-colors",
                   isDepth ? "border-zinc-800 focus:border-primary" : "border-black/20 focus:border-primary"
                )}
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="font-mono text-xs tracking-widest opacity-60">EMAIL ADDRESS</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="EMAIL_ADDRESS"
              className={cn(
                 "w-full bg-transparent border-b py-2 font-mono text-xs focus:outline-none transition-colors",
                 isDepth ? "border-zinc-800 focus:border-primary" : "border-black/20 focus:border-primary"
              )}
            />
          </div>

          <div className="space-y-3">
            <label className="font-mono text-xs tracking-widest opacity-60">MESSAGE</label>
            <textarea 
              rows={1}
              required
              value={formData.details}
              onChange={e => setFormData({ ...formData, details: e.target.value })}
              placeholder="EVENT_SPECIFICATIONS"
              className={cn(
                 "w-full bg-transparent border-b py-2 font-mono text-xs focus:outline-none transition-colors resize-y",
                 isDepth ? "border-zinc-800 focus:border-primary" : "border-black/20 focus:border-primary"
              )}
            />
          </div>

          {status === 'success' && (
            <div className="text-green-500 font-mono text-xs tracking-widest">
              MESSAGE TRANSMITTED SUCCESSFULLY.
            </div>
          )}
          {status === 'error' && (
            <div className="text-red-500 font-mono text-xs tracking-widest">
              ERROR: {errorMessage}
            </div>
          )}

          <motion.button 
            type="submit"
            disabled={status === 'loading'}
            whileHover={{ scale: status === 'loading' ? 1 : 1.02 }}
            whileTap={{ scale: status === 'loading' ? 1 : 0.98 }}
            className={cn(
              "w-full py-4 px-8 mt-4 font-mono text-[10px] tracking-[0.2em] uppercase font-bold flex items-center justify-center gap-3 transition-colors",
              isDepth ? "bg-zinc-100 text-black hover:bg-primary hover:text-white disabled:opacity-50" : "bg-black text-white hover:bg-primary disabled:opacity-50"
            )}
          >
            {status === 'loading' ? 'Transmitting...' : 'Send Message'} 
            {status !== 'loading' && <ArrowRight className="w-4 h-4" />}
          </motion.button>
        </form>
      </motion.div>
    </section>
  );
}

function MagneticIcon({ Icon, href, isDepth, name }: { Icon: any, href: string, isDepth: boolean, name?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const x = clientX - (left + width / 2);
    const y = clientY - (top + height / 2);
    setPosition({ x: x * 0.4, y: y * 0.4 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={name}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      whileHover={{ scale: 1.15 }}
      transition={{ type: "spring", stiffness: 350, damping: 15, mass: 0.5 }}
      className={cn(
        "p-3 rounded-full transition-colors cursor-pointer border border-transparent flex items-center justify-center",
        isDepth ? "hover:border-zinc-800 hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-100" : "hover:bg-black/5 text-zinc-600 hover:text-black hover:border-black/10"
      )}
    >
      <Icon className="w-5 h-5" />
    </motion.a>
  );
}

function SocialDock({ isDepth }: { isDepth: boolean }) {
  const socialLinks = [
    { name: "Facebook", Icon: Facebook, href: "https://www.facebook.com/HenryIXDJ/" },
    { name: "Instagram", Icon: Instagram, href: "https://www.instagram.com/henryixdj/" },
    { name: "SoundCloud", Icon: Cloud, href: "https://soundcloud.com/henryixdj" },
    { name: "Mixcloud", Icon: Headphones, href: "https://www.mixcloud.com/HenryIXDJ/" },
    { name: "TikTok", Icon: Music2, href: "https://www.tiktok.com/@henryixdj" },
    { name: "YouTube", Icon: Youtube, href: "https://www.youtube.com/@HenryIXDJ" }
  ];

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0, x: "-50%" }}
      animate={{ y: 0, opacity: 1, x: "-50%" }}
      transition={{ ...SPRING_CONFIG, delay: 0.5 }}
      className={cn(
        "fixed bottom-6 left-1/2 flex items-center gap-1 md:gap-2 p-2 border backdrop-blur-md z-40 overflow-x-auto max-w-[95vw] md:max-w-none scrollbar-hide rounded-full",
        isDepth ? "border-zinc-800 bg-zinc-950/80" : "border-black/10 bg-white/40"
      )}
    >
      {socialLinks.map((link, i) => (
        <MagneticIcon key={i} Icon={link.Icon} href={link.href} name={link.name} isDepth={isDepth} />
      ))}
    </motion.div>
  );
}

function Preloader() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center pointer-events-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.8,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "reverse"
            }}
            className="font-sans text-6xl md:text-8xl text-primary font-bold tracking-widest"
          >
            IX
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function DJPortal() {
  const isDepth = true;

  return (
    <motion.main
      initial={false}
      animate={{ 
        backgroundColor: '#000000', 
        color: '#FFFFFF' 
      }}
      transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      className="min-h-screen w-full relative overflow-x-hidden selection:bg-primary/30"
    >
      <Preloader />
      <NavigationBar isDepth={isDepth} />
      
      <HeroNode isDepth={isDepth} />
      <MixArchive isDepth={isDepth} />
      <Schedule isDepth={isDepth} />
      <ContactForm isDepth={isDepth} />
      
      <SocialDock isDepth={isDepth} />

      <div className="pb-32 w-full text-center font-mono text-[10px] tracking-widest opacity-40">
        HENRY IX
      </div>
    </motion.main>
  );
}
