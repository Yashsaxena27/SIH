// ============================================================
// GlassPanel / Surface Component
// Audited: Reduced glassmorphism. Defaults to solid surfaces for grounding.
// Glass is reserved for floating elements (drawers, modals).
// ============================================================

import { HTMLAttributes, ElementType } from 'react';
import { cn } from '@/lib/utils';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  as?: ElementType;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  glass?: boolean; // explicitly request glass
}

export function GlassPanel({ 
  children, 
  className, 
  as: Component = 'div',
  padding = 'md',
  hover = false,
  glass = false,
  ...props 
}: GlassPanelProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-8'
  };

  return (
    <Component
      className={cn(
        "rounded-xl border",
        // Solid vs Glass logic
        glass 
          ? "bg-white/[0.03] backdrop-blur-2xl border-white/[0.1] shadow-xl" 
          : "bg-[#0f0f12] border-white/[0.06] shadow-sm",
        // Hover interaction
        hover && "transition-colors duration-200 hover:border-white/[0.1] hover:bg-[#141419]",
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
