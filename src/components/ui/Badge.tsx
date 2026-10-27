import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'informational' | 'neutral' | 'success';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const variantStyles = {
    critical: 'bg-rose-950/60 text-neon border-neon/40 shadow-[0_0_8px_rgba(255,0,127,0.2)]',
    high: 'bg-amber-950/60 text-amber-400 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    medium: 'bg-yellow-950/50 text-yellow-300 border-yellow-500/30',
    low: 'bg-cerulean-950/60 text-cerulean border-cerulean/40 shadow-[0_0_8px_rgba(0,168,255,0.2)]',
    informational: 'bg-jet-900 text-cerulean-300 border-cerulean/20',
    neutral: 'bg-jet-900 text-slate-300 border-jet-700',
    success: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
