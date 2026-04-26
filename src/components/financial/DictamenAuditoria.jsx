import React from 'react';

const DictamenAuditoria = ({ movimientos, t, usuarioActual, dictamenGeneral }) => {
  return (
    <div className="bg-[#1e293b] border border-blue-900/30 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">📋 {t?.dictamen || 'Dictamen de Auditoría'}</h2>
      <div className="bg-[#0f172a] rounded-xl p-4 h-64 overflow-y-auto whitespace-pre-wrap font-mono text-sm text-gray-300">
        {!movimientos || movimientos.length === 0 
          ? 'Esperando datos para generar análisis...' 
          : dictamenGeneral || `📊 Análisis basado en ${movimientos?.length || 0} transacciones registradas.`}
      </div>
    </div>
  );
};

export default DictamenAuditoria;

