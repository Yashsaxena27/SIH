import { HTMLAttributes, ElementType } from 'react';
import { cn } from '@/lib/utils';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  as?: ElementType;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  glass?: boolean;
}

export function GlassPanel({ 
  children, 
  className, 
  as: Component = 'div',
  padding = 'md',
  hover = false,
  glass = true,
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
        // Universal Dark Glassmorphism Effect
        "bg-white/[0.03] backdrop-blur-2xl border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_20px_rgba(0,0,0,0.5)]",
        // Hover interaction
        hover && "transition-colors duration-200 hover:border-white/[0.2] hover:bg-white/[0.06]",
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
