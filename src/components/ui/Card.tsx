import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200/80 rounded-xl shadow-sm transition-all duration-150 ${className}`}
    >
      {children}
    </div>
  );
};
