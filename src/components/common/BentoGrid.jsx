import React from 'react';

// Mapeo manual de columnas para que Tailwind detecte las clases
const spanMap = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
  7: 'md:col-span-7',
  8: 'md:col-span-8',
  9: 'md:col-span-9',
  10: 'md:col-span-10',
  11: 'md:col-span-11',
  12: 'md:col-span-12'
};

export const BentoGrid = ({ children, className = '' }) => (
  <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 ${className}`}>
    {children}
  </div>
);

export const BentoCard = ({ children, colSpan = 12, className = '' }) => {
  const spanClass = spanMap[colSpan] || 'md:col-span-12';
  
  return (
    <div className={`col-span-12 ${spanClass} bg-[#1e293b] rounded-2xl border border-blue-900/30 p-6 shadow-lg hover:border-cyan-500/40 transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
};

