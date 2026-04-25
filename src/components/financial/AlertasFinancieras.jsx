import React from 'react';

const AlertasFinancieras = ({ movimientos, inventario, t }) => {
  return (
    <div className="bg-[#1e293b] p-6 rounded-2xl border border-blue-900/20 shadow-lg">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">🚨</span> {t.alertas || 'Alertas Financieras'}
      </h3>
      <div className="text-center py-8 text-gray-500 italic">
        No hay alertas críticas. El negocio fluye según lo planeado.
      </div>
    </div>
  );
};

export default AlertasFinancieras;

