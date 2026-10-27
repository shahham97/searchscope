'use client';

import React, { useState } from 'react';
import { Mail, Check, Copy, ExternalLink } from 'lucide-react';

interface GmailContactLinkProps {
  email?: string;
  subject?: string;
  className?: string;
  variant?: 'header' | 'footer' | 'pill';
}

export const GmailContactLink: React.FC<GmailContactLinkProps> = ({
  email = 'developerforhirre@gmail.com',
  subject = 'SearchScope Technical Inquiry',
  className = '',
  variant = 'footer',
}) => {
  const [copied, setCopied] = useState(false);

  const encodedSubject = encodeURIComponent(subject);
  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodedSubject}`;
  const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodedSubject}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClick = (e: React.MouseEvent) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      const now = Date.now();
      window.location.href = `googlegmail://co?to=${encodeURIComponent(email)}&subject=${encodedSubject}`;
      setTimeout(() => {
        if (Date.now() - now < 1500) {
          window.location.href = mailtoUrl;
        }
      }, 500);
    } else {
      window.open(gmailWebUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (variant === 'pill') {
    return (
      <div className={`relative inline-flex items-center space-x-1.5 ${className}`}>
        <button
          onClick={handleClick}
          title="Open compose in Gmail"
          className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-rajdhani font-bold uppercase tracking-wider text-white bg-jet-900 hover:bg-jet-850 border border-cerulean/40 hover:border-cerulean rounded-lg shadow-sm hover:shadow-glow-cerulean transition-all min-h-[44px]"
        >
          <Mail className="h-4 w-4 text-cerulean" />
          <span>Contact ({email})</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </button>
        <button
          onClick={handleCopy}
          title="Copy email address"
          className="p-2 text-slate-300 hover:text-white bg-jet-900 hover:bg-jet-850 border border-jet-700 hover:border-neon rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center hover:shadow-glow-rose"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <button
        onClick={handleClick}
        className="inline-flex items-center space-x-2 text-xs font-rajdhani font-semibold tracking-wider text-slate-300 hover:text-white hover:text-glow-cerulean transition-all py-2 px-1 min-h-[44px]"
        title="Open compose in Gmail"
      >
        <Mail className="h-4 w-4 text-cerulean" />
        <span>Contact: <strong className="text-cerulean font-mono">{email}</strong></span>
      </button>
      <button
        onClick={handleCopy}
        aria-label="Copy contact email"
        title="Copy email address"
        className="p-1.5 text-slate-400 hover:text-neon rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        {copied ? (
          <span className="flex items-center text-xs font-rajdhani font-bold text-emerald-400">
            <Check className="h-3.5 w-3.5 mr-1" /> Copied
          </span>
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};
