import React from 'react';

const KPICards = ({ kpis, formatearValor, t }) => {
  const { ventasTotales, utilidadEstimada, margen, saldoCaja } = kpis;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <div className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-5 shadow-lg hover:border-cyan-500/30 transition-all duration-300">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-sm font-medium">{t.ventas}</p>
            <p className="text-2xl font-bold mt-1 text-emerald-400">{formatearValor(ventasTotales)}</p>
          </div>
          <div className="bg-cyan-500/10 text-cyan-400 rounded-full w-8 h-8 flex items-center justify-center font-bold">💰</div>
        </div>
      </div>

      <div className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-5 shadow-lg hover:border-cyan-500/30 transition-all duration-300">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-sm font-medium">{t.utilidad}</p>
            <p className={`text-2xl font-bold mt-1 ${utilidadEstimada >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatearValor(utilidadEstimada)}</p>
          </div>
          <div className="bg-cyan-500/10 text-cyan-400 rounded-full w-8 h-8 flex items-center justify-center font-bold">📈</div>
        </div>
      </div>

      <div className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-5 shadow-lg hover:border-cyan-500/30 transition-all duration-300">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-sm font-medium">{t.margen}</p>
            <p className="text-2xl font-bold mt-1 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">{margen}%</p>
          </div>
          <div className="bg-cyan-500/10 text-cyan-400 rounded-full w-8 h-8 flex items-center justify-center font-bold">📊</div>
        </div>
      </div>

      <div className="bg-[#1e293b] border border-blue-900/20 rounded-xl p-5 shadow-lg hover:border-cyan-500/30 transition-all duration-300">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-sm font-medium">{t.saldo}</p>
            <p className={`text-2xl font-bold mt-1 ${saldoCaja >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatearValor(saldoCaja)}</p>
          </div>
          <div className="bg-cyan-500/10 text-cyan-400 rounded-full w-8 h-8 flex items-center justify-center font-bold">💵</div>
        </div>
      </div>
    </div>
  );
};

export default KPICards;

