import React, { useState } from 'react';

export const CollapsibleCard = ({ 
  title, 
  icon, 
  children, 
  defaultOpen = false,
  badge = null,
  badgeColor = 'gray',
  onToggle = null
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onToggle) onToggle(newState);
  };

  // Colores de badge según el tipo (mejorados para auditoría)
  const badgeColors = {
    gray: 'bg-gray-600/30 text-gray-300 border-gray-500/30',
    red: 'bg-red-600/30 text-red-300 border-red-500/30',
    green: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/30',
    yellow: 'bg-yellow-600/30 text-yellow-300 border-yellow-500/30',
    cyan: 'bg-cyan-600/30 text-cyan-300 border-cyan-500/30',
    purple: 'bg-purple-600/30 text-purple-300 border-purple-500/30',
    orange: 'bg-orange-600/30 text-orange-300 border-orange-500/30'  // ✅ NUEVO: para advertencias
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-white">{title}</span>
          {badge && (
            <span className={`
              text-[10px] uppercase tracking-wider font-bold 
              px-2 py-0.5 rounded-full border 
              ${badgeColors[badgeColor] || badgeColors.gray}
            `}>
              {badge}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-xl transform transition-transform duration-200">
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <div className="p-4 pt-0 border-t border-slate-700/50 animate-fade-in-up">
          {children}
        </div>
      )}
    </div>
  );
};

