// src/components/ExecutiveReport.jsx
import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

const ExecutiveReport = ({ 
  ventasTotales, 
  gastosTotales, 
  utilidadEstimada, 
  onUpgradeClick 
}) => {
  const { idioma } = useTranslation();
  
  // Calcular margen con decimales
  const porcentajeMargen = ventasTotales > 0 
    ? ((utilidadEstimada / ventasTotales) * 100).toFixed(1) 
    : 0;

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 mb-4 border border-blue-900/30">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        📋 {idioma === 'es' ? 'Dictamen de Auditoría' : 'Audit Report'}
      </h2>
      <div className="bg-[#0f172a] rounded-xl p-4 font-mono text-sm text-gray-300">
        <p className="text-gray-400">
          {idioma === 'es' ? '📊 REPORTE EJECUTIVO' : '📊 EXECUTIVE REPORT'}
        </p>
        <p>━━━━━━━━━━━━━━━━━━━━━</p>
        <p>📈 {idioma === 'es' ? 'Ventas' : 'Sales'}: ${ventasTotales?.toLocaleString() || 0}</p>
        <p>📉 {idioma === 'es' ? 'Gastos' : 'Expenses'}: ${gastosTotales?.toLocaleString() || 0}</p>
        <p>💰 {idioma === 'es' ? 'Utilidad Neta' : 'Net Profit'}: ${utilidadEstimada?.toLocaleString() || 0}</p>
        <p>📊 {idioma === 'es' ? 'Margen Neto' : 'Net Margin'}: {porcentajeMargen}%</p>
        <p>━━━━━━━━━━━━━━━━━━━━━</p>
        <p className="text-green-400 mt-2">
          {idioma === 'es' 
            ? '📢 Rentabilidad saludable. Busca optimizar gastos para mejorar.' 
            : '📢 Healthy profitability. Look to optimize expenses to improve.'}
        </p>
        <div className="mt-4 border-t border-slate-800 pt-2 text-xs text-gray-500">
          <p>🔓 {idioma === 'es' 
            ? '¿Quieres conocer tu Margen de Contribución, EBITDA y ROI?' 
            : 'Want to know your Contribution Margin, EBITDA and ROI?'}
          </p>
          <p 
            onClick={onUpgradeClick}
            className="text-cyan-400 font-semibold cursor-pointer mt-1 hover:text-cyan-300 transition"
          >
            💡 {idioma === 'es' 
              ? 'Actualiza al Plan Business y descubre los 6 márgenes reales de rentabilidad.' 
              : 'Upgrade to Business Plan and discover the 6 real profitability margins.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveReport;

