import React from 'react';

const TermometroSalud = ({ movimientos, inventario, t }) => {
  return (
    <div className="bg-[#1e293b] p-6 rounded-2xl border border-blue-900/20 shadow-lg">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">🌡️</span> {t.salud || 'Salud Financiera'}
      </h3>
      <p className="text-gray-400 text-sm">El termómetro de salud se mostrará aquí cuando tengas datos.</p>
      <div className="mt-4 text-center text-gray-500">
        {movimientos?.length === 0 ? 'Sin datos para mostrar' : `${movimientos?.length || 0} transacciones registradas`}
      </div>
    </div>
  );
};

export default TermometroSalud;

