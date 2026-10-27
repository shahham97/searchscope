import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  // If the passed className already has a bg- specified, use it; otherwise default to bg-jet-900
  const hasBg = className.includes('bg-');
  const hasBorder = className.includes('border-');
  const bgClass = hasBg ? '' : 'bg-jet-900';
  const borderClass = hasBorder ? '' : 'border-jet-800';

  return (
    <div
      onClick={onClick}
      className={`${bgClass} border ${borderClass} rounded-xl text-white shadow-lg transition-all duration-150 ${className}`}
    >
      {children}
    </div>
  );
};
