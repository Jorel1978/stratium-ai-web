import React from 'react';

const Header = ({ usuarioActual, movimientos, isLoading, validationMessage, error, t }) => {
  return (
    <header className="py-6 px-4 border-b border-blue-900/30 sticky top-0 bg-[#0f172a]/95 backdrop-blur-sm z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
          {t.title}
        </h1>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-sm text-gray-400 hidden sm:block">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              {usuarioActual?.email}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

