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

  // Mock time advancement
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
      transition={{ delay: 0.3, duration: 0.4 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] w-full max-w-2xl px-4"
    >
      <div className="flex flex-col bg-surface-elevated/90 backdrop-blur-3xl border border-white/[0.1] rounded-2xl shadow-2xl p-4">
        
        {/* Scrubber Area */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (progress === 100) setProgress(0);
              setIsPlaying(!isPlaying);
            }}
            className="w-10 h-10 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] flex items-center justify-center transition-colors flex-shrink-0 group"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white/80 group-hover:text-white" />
            ) : (
              <Play className="w-4 h-4 text-white/80 group-hover:text-white ml-0.5" />
            )}
          </button>

          <div className="flex-1 relative h-8 flex items-center group cursor-pointer" onClick={(e) => {
            const bounds = e.currentTarget.getBoundingClientRect();
            const percent = ((e.clientX - bounds.left) / bounds.width) * 100;
            setProgress(Math.max(0, Math.min(100, percent)));
          }}>
            {/* Timeline track */}
            <div className="absolute left-0 right-0 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent-secondary/60 transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Thumb */}
            <div 
              className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-75 -ml-1.5 pointer-events-none group-hover:scale-125"
              style={{ left: `${progress}%` }}
            />
          </div>

          <div className="flex-shrink-0 text-right min-w-[70px]">
            <div className="text-xs font-bold text-white/90 font-mono flex items-center gap-1.5 justify-end">
              {progress === 100 ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 text-white/40" />
                  {-Math.floor((100 - progress) * 0.24)}h
                </>
              )}
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="flex justify-between mt-2 pl-14 pr-[70px] text-[9px] font-medium text-white/30 uppercase tracking-widest">
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
        </div>

      </div>
    </motion.div>
  );
}
