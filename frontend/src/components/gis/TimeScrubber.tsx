// ============================================================
// TimeScrubber — Floating bottom time replay for spatial events
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, FastForward, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TimeScrubber() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(100);

  // Time advancement simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return p + 0.5;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] w-full max-w-xl px-4 pointer-events-auto"
    >
      <div className="flex flex-col bg-[#141519]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl p-3.5">
        
        {/* Scrubber Area */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (progress >= 100) setProgress(0);
              setIsPlaying(!isPlaying);
            }}
            className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center transition-colors flex-shrink-0 group shadow-inner"
            title={isPlaying ? "Pause Stream Playback" : "Play Telemetry Replay"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-primary fill-primary ml-0.5" />
            )}
          </button>

          <div 
            className="flex-1 relative h-7 flex items-center group cursor-pointer" 
            onClick={(e) => {
              const bounds = e.currentTarget.getBoundingClientRect();
              const percent = ((e.clientX - bounds.left) / bounds.width) * 100;
              setProgress(Math.max(0, Math.min(100, percent)));
            }}
          >
            {/* Timeline track */}
            <div className="absolute left-0 right-0 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Thumb */}
            <div 
              className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all duration-75 -ml-1.5 pointer-events-none group-hover:scale-125 border border-primary/50"
              style={{ left: `${progress}%` }}
            />
          </div>

          <div className="flex-shrink-0 text-right min-w-[70px]">
            <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5 justify-end">
              {progress >= 100 ? (
                <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              ) : (
                <span className="flex items-center gap-1 text-on-surface-variant/80 text-[11px]">
                  <Clock className="w-3 h-3 text-primary" />
                  {-Math.floor((100 - progress) * 0.24)}h
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Hour Markers */}
        <div className="flex justify-between mt-1.5 pl-12 pr-[74px] text-[9px] font-mono text-on-surface-variant/50 uppercase tracking-widest">
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
        </div>

      </div>
    </motion.div>
  );
}
