import React from 'react';

const ModalUpgrade = ({ isOpen, onClose, funcionNombre, t }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-md w-full border border-blue-900/30" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🔒</div>
          <h3 className="text-xl font-bold text-white">{t.upgradeTitle || 'Función no disponible'}</h3>
          <p className="text-gray-400 text-sm mt-2">
            {funcionNombre} {t.upgradeDescription || 'es exclusiva de los planes de pago'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all"
        >
          {t.upgradeButton || 'Ver Planes y Precios'}
        </button>
      </div>
    </div>
  );
};

export default ModalUpgrade;

