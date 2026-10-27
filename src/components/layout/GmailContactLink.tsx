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
  email = 'hello@searchscope.app',
  subject = 'SearchScope Inquiry',
  className = '',
  variant = 'footer',
}) => {
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

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
    // Check if user is on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // Try Gmail app deep link with fallback to mailto
      const now = Date.now();
      window.location.href = `googlegmail://co?to=${encodeURIComponent(email)}&subject=${encodedSubject}`;
      setTimeout(() => {
        if (Date.now() - now < 1500) {
          window.location.href = mailtoUrl;
        }
      }, 500);
    } else {
      // Desktop: Open Gmail in new tab
      window.open(gmailWebUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (variant === 'pill') {
    return (
      <div className={`relative inline-flex items-center space-x-1 ${className}`}>
        <button
          onClick={handleClick}
          title="Open in Gmail"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors min-h-[44px]"
        >
          <Mail className="h-4 w-4 text-slate-600" />
          <span>Contact Us ({email})</span>
          <ExternalLink className="h-3 w-3 text-slate-400" />
        </button>
        <button
          onClick={handleCopy}
          title="Copy email address"
          className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <button
        onClick={handleClick}
        className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors py-2 px-1 min-h-[44px]"
        title="Open message in Gmail"
      >
        <Mail className="h-3.5 w-3.5 text-slate-500" />
        <span>Contact ({email})</span>
      </button>
      <button
        onClick={handleCopy}
        aria-label="Copy contact email"
        title="Copy email address"
        className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        {copied ? (
          <span className="flex items-center text-[11px] text-emerald-600 font-medium">
            <Check className="h-3.5 w-3.5 mr-1" /> Copied
          </span>
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
};
