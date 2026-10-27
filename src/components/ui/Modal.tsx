import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-jet-950/80 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />
        <div
          className={`relative transform overflow-hidden rounded-2xl bg-jet-900 text-left shadow-glow-cerulean transition-all sm:my-8 w-full ${maxWidthStyles[maxWidth]} border border-cerulean/30`}
        >
          <div className="flex items-center justify-between border-b border-jet-800 px-6 py-4 bg-jet-950/60">
            <h3 className="font-orbitron text-sm font-bold tracking-wider text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cerulean animate-pulse" />
              {title}
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-jet-800 hover:text-neon transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 py-5 max-h-[75vh] overflow-y-auto custom-scrollbar">{children}</div>
        </div>
      </div>
    </div>
  );
};
